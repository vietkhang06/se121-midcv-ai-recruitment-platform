[CmdletBinding()]
param(
    [string]$EnvFile = ".env.production",
    [string]$ComposeFile = "docker-compose.production.yml",
    [switch]$AllowProduction
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root
$logDir = Join-Path $root ("diagnostics/deploy-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "deployment.log"
$stateFile = Join-Path $logDir "deployment-state.json"

$envPath = (Resolve-Path $EnvFile).Path
$composePath = (Resolve-Path $ComposeFile).Path
$baseArgs = @("compose", "--env-file", $envPath, "-f", $composePath)
$oldImageEnv = @{
    BACKEND_IMAGE = $env:BACKEND_IMAGE
    FRONTEND_IMAGE = $env:FRONTEND_IMAGE
    WORKER_IMAGE = $env:WORKER_IMAGE
}
$rollback = @{}
$deploySucceeded = $false

function Invoke-DockerCompose {
    param([string[]]$Arguments)
    $allArgs = @($baseArgs) + @($Arguments)
    $output = & docker @allArgs 2>&1
    $exitCode = $LASTEXITCODE
    $output | Tee-Object -FilePath $logFile -Append
    if ($exitCode -ne 0) {
        throw "docker compose $($Arguments -join ' ') failed with exit code $exitCode"
    }
}


function Read-EnvFile {
    param([string]$Path)
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $value = $Matches[2].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $values[$Matches[1]] = $value
        }
    }
    return $values
}

function Assert-ProductionEnvironment {
    param([string]$Path)
    $values = Read-EnvFile -Path $Path
    $required = @(
        'PUBLIC_DOMAIN', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD',
        'POSTGRES_VOLUME_NAME', 'UPLOADS_VOLUME_NAME', 'JWT_SECRET',
        'LLM_PRIMARY_API_KEY', 'LLM_PRIMARY_MODEL', 'SMTP_HOST', 'MAIL_FROM'
    )
    foreach ($name in $required) {
        $value = [string]$values[$name]
        if ([string]::IsNullOrWhiteSpace($value) -or $value -match '(?i)replace_with|change_me|changeme|<.+>' -or $value -match '(?i)example\.(com|net|org)$') {
            throw "Production environment value '$name' is empty or still a template placeholder. Update $Path before deploying."
        }
    }
    $domain = [string]$values['PUBLIC_DOMAIN']
    if ($domain -eq 'midcv.example.com' -or $domain.Length -gt 253 -or $domain -notmatch '^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$') {
        throw 'PUBLIC_DOMAIN must be the real DNS hostname configured for this deployment.'
    }
    foreach ($identifier in @('POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_VOLUME_NAME', 'UPLOADS_VOLUME_NAME')) {
        if ([string]$values[$identifier] -notmatch '^[A-Za-z_][A-Za-z0-9_]{0,62}$') {
            throw "$identifier must use only ASCII letters, digits and underscores and begin with a letter or underscore."
        }
    }
    if ($values['SMTP_AUTH'] -ne 'false') {
        foreach ($name in @('SMTP_USERNAME', 'SMTP_PASSWORD')) {
            $value = [string]$values[$name]
            if ([string]::IsNullOrWhiteSpace($value) -or $value -match '(?i)replace_with|change_me|changeme|<.+>') {
                throw "SMTP authentication is enabled but '$name' is empty or still a placeholder."
            }
        }
    }
    $jwtSecret = [string]$values['JWT_SECRET']
    $postgresPassword = [string]$values['POSTGRES_PASSWORD']
    if ($jwtSecret.Length -lt 64) {
        throw 'JWT_SECRET must contain at least 64 characters; generate a random secret rather than reusing the example.'
    }
    if ($postgresPassword.Length -lt 20) {
        throw 'POSTGRES_PASSWORD must contain at least 20 characters.'
    }
    if ($values['EMAIL_MODE'] -and $values['EMAIL_MODE'] -ne 'SMTP') {
        throw 'EMAIL_MODE must be SMTP for production acceptance; MOCK is not allowed.'
    }
    if ($values['ADMIN_INITIAL_PASSWORD'] -and $values['ADMIN_INITIAL_PASSWORD'] -match '(?i)replace_with|change_me|changeme') {
        throw 'ADMIN_INITIAL_PASSWORD is still a placeholder.'
    }
}

function Save-PreviousImage {
    param([string]$Service, [string]$RollbackTag)
    $composeArgs = @($baseArgs) + @("ps", "-q", $Service)
    $idOutput = & docker @composeArgs 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $idOutput) { return $null }
    $containerId = ([string]$idOutput).Trim()
    $imageId = (& docker inspect --format "{{.Image}}" $containerId 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not $imageId) { return $null }
    $imageId = ([string]$imageId).Trim()
    & docker image tag $imageId $RollbackTag
    if ($LASTEXITCODE -ne 0) { throw "Cannot preserve previous image for service $Service" }
    return [ordered]@{ containerId = $containerId; imageId = $imageId; rollbackTag = $RollbackTag }
}

try {
    if (-not $AllowProduction) {
        throw "This command changes the production Compose stack. Re-run with -AllowProduction after confirming the target host and .env.production."
    }
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw "Docker CLI is required." }

    "[$(Get-Date -Format o)] Validate production environment and Compose configuration" | Tee-Object -FilePath $logFile
    Assert-ProductionEnvironment -Path $envPath
    Invoke-DockerCompose -Arguments @("config", "--quiet")

    # Start only PostgreSQL first, then create and verify a recovery point BEFORE
    # any new application image is deployed or any Flyway migration can run.
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        throw "Python 3 is required to create and verify the pre-deployment PostgreSQL/uploads backup."
    }
    Invoke-DockerCompose -Arguments @("up", "-d", "--wait", "db")
    $backupOutput = & python "scripts/midcv_backup.py" --env-file $envPath --compose-file $composePath backup 2>&1
    $backupExitCode = $LASTEXITCODE
    $backupOutput | Tee-Object -FilePath $logFile -Append
    if ($backupExitCode -ne 0) {
        throw "Pre-deployment backup failed with exit code $backupExitCode. Deployment was stopped before application images were changed."
    }
    $backupLine = @($backupOutput | Where-Object { [string]$_ -match '^\[4/4\] Backup created:' } | Select-Object -Last 1)
    if ($backupLine.Count -eq 0) {
        throw "Backup command did not report a verifiable backup directory. Deployment was stopped."
    }
    $backupPath = ([string]$backupLine[0] -replace '^\[4/4\] Backup created:\s*', '').Trim()
    if (-not (Test-Path -LiteralPath $backupPath -PathType Container)) {
        throw "Reported backup directory does not exist: $backupPath"
    }
    $backupRelativePath = [System.IO.Path]::GetRelativePath($root, $backupPath)
    $verifyOutput = & python "scripts/midcv_backup.py" --env-file $envPath --compose-file $composePath verify --backup-dir $backupRelativePath 2>&1
    $verifyExitCode = $LASTEXITCODE
    $verifyOutput | Tee-Object -FilePath $logFile -Append
    if ($verifyExitCode -ne 0) {
        throw "Pre-deployment backup verification failed with exit code $verifyExitCode. Deployment was stopped."
    }

    # Preserve the currently running image IDs before the build replaces release tags.
    foreach ($service in @("backend", "frontend", "ai-worker")) {
        $tag = "midcv-${service}:rollback-$(Get-Date -Format 'yyyyMMddHHmmss')"
        $previous = Save-PreviousImage -Service $service -RollbackTag $tag
        if ($previous) { $rollback[$service] = $previous }
    }

    Invoke-DockerCompose -Arguments @("build", "backend", "frontend", "ai-worker")
    Invoke-DockerCompose -Arguments @("up", "-d", "--wait", "--wait-timeout", "300")
    Invoke-DockerCompose -Arguments @("ps")
    $deploySucceeded = $true

    $state = [ordered]@{
        deployedAt = (Get-Date).ToString("o")
        composeFile = $ComposeFile
        verifiedPreDeploymentBackup = $backupPath
        rollbackImages = $rollback
        result = "HEALTHY"
    }
    $state | ConvertTo-Json -Depth 8 | Set-Content -Path $stateFile -Encoding UTF8
    Write-Host "Deployment is healthy. Log: $logFile"
    Write-Host "Previous image tags were retained for manual recovery: $stateFile"
}
catch {
    $failure = $_.Exception.Message
    "[$(Get-Date -Format o)] DEPLOYMENT FAILED: $failure" | Tee-Object -FilePath $logFile -Append
    try {
        Invoke-DockerCompose -Arguments @("logs", "--no-color", "--tail", "200", "backend", "frontend", "ai-worker")
    } catch { "Could not collect service logs: $($_.Exception.Message)" | Add-Content $logFile }

    if ($rollback.Count -gt 0) {
        Write-Warning "Deployment failed. Attempting rollback to the preserved image IDs."
        foreach ($entry in $rollback.GetEnumerator()) {
            $variable = switch ($entry.Key) {
                "backend" { "BACKEND_IMAGE" }
                "frontend" { "FRONTEND_IMAGE" }
                "ai-worker" { "WORKER_IMAGE" }
            }
            Set-Item -Path "Env:$variable" -Value $entry.Value.rollbackTag
        }
        try {
            Invoke-DockerCompose -Arguments @("up", "-d", "--no-build", "--wait", "--wait-timeout", "300")
            "[$(Get-Date -Format o)] Rollback completed using previous image tags." | Add-Content $logFile
        }
        catch {
            "[$(Get-Date -Format o)] ROLLBACK ALSO FAILED: $($_.Exception.Message)" | Add-Content $logFile
            Write-Error "Deployment and rollback both failed. Preserve containers, volumes and logs for investigation."
        }
    }
    else {
        Write-Warning "No previously running application image was found; this appears to be a first deployment, so automatic rollback is unavailable."
    }
    throw $failure
}
finally {
    foreach ($key in $oldImageEnv.Keys) {
        if ($null -eq $oldImageEnv[$key]) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }
        else { Set-Item -Path "Env:$key" -Value $oldImageEnv[$key] }
    }
    Pop-Location
}
