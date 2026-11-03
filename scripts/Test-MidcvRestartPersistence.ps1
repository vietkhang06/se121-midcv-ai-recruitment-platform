[CmdletBinding()]
param(
    [string]$EnvFile = ".env.production",
    [string]$ComposeFile = "docker-compose.production.yml",
    [switch]$AllowRestart
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $root

try {
    if (-not $AllowRestart) { throw "This test restarts the backend container. Re-run with -AllowRestart only on the intended test/production window." }
    $required = @("MIDCV_E2E_API_URL", "MIDCV_E2E_PARTICIPANT_EMAIL", "MIDCV_E2E_PARTICIPANT_PASSWORD", "MIDCV_E2E_CONVERSATION_ID", "MIDCV_E2E_PERSISTENCE_MESSAGE_ID")
    foreach ($name in $required) {
        if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($name))) { throw "Missing required environment variable: $name" }
    }
    $envPath = (Resolve-Path $EnvFile).Path
    $composePath = (Resolve-Path $ComposeFile).Path
    $api = $env:MIDCV_E2E_API_URL.TrimEnd('/')
    $compose = @("compose", "--env-file", $envPath, "-f", $composePath)

    $loginBody = @{
        email = $env:MIDCV_E2E_PARTICIPANT_EMAIL
        password = $env:MIDCV_E2E_PARTICIPANT_PASSWORD
    } | ConvertTo-Json -Compress
    $login = Invoke-RestMethod -Method Post -Uri "$api/api/v1/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 20
    $accessToken = $login.data.accessToken
    if ([string]::IsNullOrWhiteSpace($accessToken)) { throw "Login did not return an access token." }
    $headers = @{ Authorization = "Bearer $accessToken" }
    $messagesUri = "$api/api/v1/inbox/conversations/$($env:MIDCV_E2E_CONVERSATION_ID)/messages"
    $expectedId = $env:MIDCV_E2E_PERSISTENCE_MESSAGE_ID

    function Assert-MessageExists {
        param([string]$Stage)
        $result = Invoke-RestMethod -Method Get -Uri $messagesUri -Headers $headers -TimeoutSec 30
        $raw = $result | ConvertTo-Json -Depth 30 -Compress
        if (-not $raw.Contains($expectedId)) { throw "Message $expectedId was not present $Stage the backend restart." }
        Write-Host "PASS: existing conversation message remains readable $Stage backend restart."
    }

    Assert-MessageExists -Stage "before"
    $containerId = & docker @compose ps -q backend
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace(($containerId -join '').Trim())) { throw "Could not resolve the backend container." }
    $containerId = ($containerId | Select-Object -First 1).Trim()
    Write-Host "Restarting backend container $containerId ..."
    & docker @compose restart backend
    if ($LASTEXITCODE -ne 0) { throw "docker compose restart backend failed." }

    $deadline = (Get-Date).AddMinutes(3)
    $healthy = $false
    do {
        Start-Sleep -Seconds 3
        $status = & docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}" $containerId 2>$null
        if ($LASTEXITCODE -eq 0 -and ([string]$status).Trim() -eq "healthy") { $healthy = $true; break }
    } while ((Get-Date) -lt $deadline)
    if (-not $healthy) { throw "Backend did not return to healthy state within 3 minutes. Inspect docker compose logs backend." }

    # Re-authenticate because restarting may invalidate in-memory sessions in future implementations.
    $login = Invoke-RestMethod -Method Post -Uri "$api/api/v1/auth/login" -ContentType "application/json" -Body $loginBody -TimeoutSec 20
    $headers.Authorization = "Bearer $($login.data.accessToken)"
    Assert-MessageExists -Stage "after"
    Write-Host "PASS: backend restarted and the same DB-backed conversation message survived."
}
finally {
    Pop-Location
}
