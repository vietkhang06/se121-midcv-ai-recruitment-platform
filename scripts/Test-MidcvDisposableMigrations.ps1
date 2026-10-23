param(
    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string]$ContainerName,

    [ValidateRange(1024, 65535)]
    [int]$Port = 55439
)

$ErrorActionPreference = 'Stop'
$envNames = @('DATABASE_URL', 'DATABASE_USERNAME', 'DATABASE_PASSWORD', 'MIDCV_MIGRATION_TEST_MODE', 'WORKER_ENABLED')
$previous = @{}
foreach ($name in $envNames) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$securePassword = $null
$passwordPointer = [IntPtr]::Zero
$plainPassword = $null
$databaseSuffix = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$freshDatabase = "midcv_fresh_$databaseSuffix"
$upgradeDatabase = "midcv_upgrade_$databaseSuffix"
$backend = Join-Path $PSScriptRoot '..\backend'

try {
    $containerIsRunning = docker container inspect --format '{{.State.Running}}' $ContainerName 2>$null
    if ($LASTEXITCODE -ne 0 -or $containerIsRunning -ne 'true') {
        throw "The named disposable container is not running: $ContainerName"
    }

    $securePassword = Read-Host 'Disposable PostgreSQL password (input hidden)' -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

    foreach ($database in @($freshDatabase, $upgradeDatabase)) {
        $null = docker exec $ContainerName createdb -U midcv_test $database
        if ($LASTEXITCODE -ne 0) { throw "Could not create disposable database $database; no existing database was modified." }
    }

    [Environment]::SetEnvironmentVariable('DATABASE_USERNAME', 'midcv_test', 'Process')
    [Environment]::SetEnvironmentVariable('DATABASE_PASSWORD', $plainPassword, 'Process')
    [Environment]::SetEnvironmentVariable('WORKER_ENABLED', 'false', 'Process')

    Push-Location $backend
    try {
        foreach ($case in @(
            @{ Mode = 'FRESH'; Database = $freshDatabase },
            @{ Mode = 'UPGRADE'; Database = $upgradeDatabase }
        )) {
            [Environment]::SetEnvironmentVariable('DATABASE_URL', "jdbc:postgresql://127.0.0.1:$Port/$($case.Database)", 'Process')
            [Environment]::SetEnvironmentVariable('MIDCV_MIGRATION_TEST_MODE', $case.Mode, 'Process')
            Write-Output "Running disposable PostgreSQL migration case: $($case.Mode) ($($case.Database))"
            mvn -o '-Dtest=DisposableMigrationValidationTest' test
            if ($LASTEXITCODE -ne 0) { throw "Migration validation failed for $($case.Mode) with exit code $LASTEXITCODE." }
        }
    }
    finally {
        Pop-Location
    }

    Write-Output 'Both disposable migration cases passed: fresh V1-V27 and upgrade V20-V27 with Hibernate validate enabled.'
    Write-Output "Disposable database names: $freshDatabase, $upgradeDatabase"
    Write-Output 'The databases and container are preserved for follow-up runtime acceptance; no volumes or existing databases were changed.'
}
finally {
    foreach ($name in $envNames) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($securePassword) { $securePassword.Dispose() }
    $plainPassword = $null
    $previous = $null
}
