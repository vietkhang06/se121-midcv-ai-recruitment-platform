param([switch]$Apply,[switch]$Dependencies)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$paths=@('backend/target','backend/bin','backend/out','frontend/.next','frontend/out','frontend/test-results','frontend/playwright-report','frontend/tsconfig.tsbuildinfo','ai-worker/.pytest_cache')
if($Dependencies){$paths+=@('frontend/node_modules')}
Write-Output 'Stop backend/frontend/worker processes before applying cleanup. Uploads, .env, databases, fixtures and evidence are excluded.'
foreach($relative in $paths){
 $target=Join-Path $root $relative
 if(-not(Test-Path -LiteralPath $target)){continue}
 $item=Get-Item -LiteralPath $target -Force
 if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){throw "Refusing linked path: $relative"}
 if($Apply){Remove-Item -LiteralPath $target -Recurse -Force;Write-Output "Removed: $relative"}else{Write-Output "Would remove: $relative"}
}
if(-not $Apply){Write-Output 'Dry run only. Use -Apply for the listed generated output; -Dependencies also removes reinstallable frontend/node_modules.'}
