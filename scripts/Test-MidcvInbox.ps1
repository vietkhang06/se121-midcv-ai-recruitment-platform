param([ValidateRange(1024,65535)][int]$Port=55443,[switch]$KeepRunning)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$container='midcv-inbox-test-'+[Guid]::NewGuid().ToString('N').Substring(0,12)
$names=@('POSTGRES_PASSWORD','MIDCV_INBOX_TEST_URL','MIDCV_INBOX_TEST_USER','MIDCV_INBOX_TEST_PASSWORD')
$previous=@{};foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
$created=$false
try {
 $version=(& mvn -version 2>&1|Out-String)
 if($LASTEXITCODE -ne 0 -or $version -notmatch 'Java version:\s*21\.') {throw 'Maven must use JDK 21. Set JAVA_HOME and PATH first.'}
 $null=docker version --format '{{.Server.Version}}' 2>$null
 if($LASTEXITCODE -ne 0){throw 'Docker Desktop is not available in this terminal.'}
 $listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$Port)
 try {$listener.Start()}finally{$listener.Stop()}
 $bytes=New-Object byte[] 32;$rng=[System.Security.Cryptography.RandomNumberGenerator]::Create()
 try{$rng.GetBytes($bytes)}finally{$rng.Dispose()}
 $env:POSTGRES_PASSWORD=[Convert]::ToBase64String($bytes)
 $null=docker run --name $container --env POSTGRES_PASSWORD --env POSTGRES_USER=postgres --env POSTGRES_DB=midcv_inbox_test --publish "127.0.0.1:${Port}:5432" --detach pgvector/pgvector:pg16
 if($LASTEXITCODE -ne 0){throw 'Cannot create disposable PostgreSQL.'}
 $created=$true;$ready=$false
 for($i=0;$i -lt 60;$i++){$null=docker exec $container pg_isready -q -U postgres -d midcv_inbox_test 2>$null;if($LASTEXITCODE -eq 0){$ready=$true;break};Start-Sleep -Seconds 1}
 if(-not $ready){throw 'Disposable database readiness timed out.'}
 $env:MIDCV_INBOX_TEST_URL="jdbc:postgresql://127.0.0.1:${Port}/midcv_inbox_test"
 $env:MIDCV_INBOX_TEST_USER='postgres';$env:MIDCV_INBOX_TEST_PASSWORD=$env:POSTGRES_PASSWORD
 Write-Host "Test container: $container; database: midcv_inbox_test; port: $Port"
 Push-Location (Join-Path $projectRoot 'backend')
 try{& mvn '-Dtest=InboxIntegrationTest' test;if($LASTEXITCODE -ne 0){throw 'Inbox tests failed. See backend/target/surefire-reports.'}}finally{Pop-Location}
 Write-Host 'Inbox integration tests passed. No application database was used.'
}finally{
 if($created -and -not $KeepRunning){$null=docker stop $container 2>$null}
 if($created){Write-Host "Container preserved for inspection: $container"}
 foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
}
