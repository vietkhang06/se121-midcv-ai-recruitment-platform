param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 55439
)

$ErrorActionPreference = 'Stop'
$passwordVariable = 'POSTGRES_PASSWORD'
$existingPassword = [Environment]::GetEnvironmentVariable($passwordVariable, 'Process')
$securePassword = $null
$passwordPointer = [IntPtr]::Zero
$plainPassword = $null
$containerName = "midcv-pgvector-test-$([DateTime]::UtcNow.ToString('yyyyMMddHHmmss'))-$([Guid]::NewGuid().ToString('N').Substring(0,6))"

try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $dockerVersion) {
        throw 'Docker Desktop daemon is not available in this PowerShell session. Run this helper in your authorized Docker terminal.'
    }

    $null = docker container inspect $containerName 2>$null
    if ($LASTEXITCODE -eq 0) { throw "Container name is already in use: $containerName" }

    $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    try {
        $listener.Start()
    }
    catch {
        throw "Host port $Port is already occupied on 127.0.0.1. Choose another unused port with -Port."
    }
    finally {
        $listener.Stop()
    }

    $securePassword = Read-Host 'Disposable PostgreSQL password (input hidden)' -AsSecureString
    if ($securePassword.Length -lt 16) { throw 'Use a password with at least 16 characters.' }
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    [Environment]::SetEnvironmentVariable($passwordVariable, $plainPassword, 'Process')

    $null = docker run --name $containerName `
        --env POSTGRES_USER=midcv_test `
        --env POSTGRES_PASSWORD `
        --env POSTGRES_DB=midcv_test `
        --publish "127.0.0.1:${Port}:5432" `
        --detach pgvector/pgvector:pg17
    if ($LASTEXITCODE -ne 0) { throw 'Docker failed to create the disposable PostgreSQL container.' }

    $ready = $false
    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        $null = docker exec $containerName pg_isready -q -U midcv_test -d midcv_test 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw "PostgreSQL did not become ready within 60 seconds. Container $containerName is preserved for inspection."
    }

    Write-Output 'Disposable PostgreSQL with pgvector is ready.'
    Write-Output "Container: $containerName"
    Write-Output "Connection: jdbc:postgresql://127.0.0.1:$Port/midcv_test"
    Write-Output 'Username: midcv_test'
    Write-Output 'No password was written to a file or printed.'
    Write-Output 'Stop/start preserves this container data. Removing the container deletes its database; this helper creates no volume.'
}
finally {
    [Environment]::SetEnvironmentVariable($passwordVariable, $existingPassword, 'Process')
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($securePassword) { $securePassword.Dispose() }
    $plainPassword = $null
    $existingPassword = $null
}
