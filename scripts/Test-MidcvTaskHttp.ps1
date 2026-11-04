param(
    [Parameter(Mandatory=$true)][string]$ContainerName,
    [ValidateRange(1024,65535)][int]$Port=55439
)
$ErrorActionPreference='Stop'
$names=@('DATABASE_URL','DATABASE_USERNAME','DATABASE_PASSWORD','MIDCV_TASK_HTTP','WORKER_ENABLED')
$previous=@{}
foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$secure=$null
$pointer=[IntPtr]::Zero
$database='midcv_task_'+[Guid]::NewGuid().ToString('N')
try {
    $running=docker container inspect --format '{{.State.Running}}' $ContainerName 2>$null
    if($LASTEXITCODE -ne 0 -or $running -ne 'true'){throw 'Start a disposable database with Start-MidcvDisposableDb.ps1 first.'}
    $secure=Read-Host 'Disposable PostgreSQL password (input hidden)' -AsSecureString
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    $null=docker exec $ContainerName createdb -U midcv_test $database
    if($LASTEXITCODE -ne 0){throw 'Could not create a NEW test database. No existing database was modified.'}
    $env:DATABASE_URL="jdbc:postgresql://127.0.0.1:$Port/$database"
    $env:DATABASE_USERNAME='midcv_test'
    $env:DATABASE_PASSWORD=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $env:MIDCV_TASK_HTTP='true'
    $env:WORKER_ENABLED='false'
    Write-Output "Running real HTTP/PostgreSQL acceptance in NEW database: $database"
    Write-Output 'Mail is explicitly MOCK in this suite. SMTP/OAuth/browser restart acceptance is separate.'
    Push-Location (Join-Path $PSScriptRoot '..\backend')
    try {
        mvn '-Dtest=TaskHttpAcceptanceTest' test
        if($LASTEXITCODE -ne 0){throw "HTTP acceptance failed: exit=$LASTEXITCODE. Read target/surefire-reports; do not mark tasks accepted."}
    } finally {Pop-Location}
    Write-Output "HTTP acceptance passed. Database preserved for inspection: $database"
} finally {
    foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
    if($pointer -ne [IntPtr]::Zero){[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)}
    if($secure){$secure.Dispose()}
}
