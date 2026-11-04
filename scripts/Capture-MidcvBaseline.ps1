param([string]$OutputDirectory)
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if(-not $OutputDirectory){$OutputDirectory=Join-Path $root ('diagnostics/baseline-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))}
$null=New-Item -ItemType Directory -Path $OutputDirectory -Force
Push-Location $root
try {
 $head=git rev-parse HEAD
 if($LASTEXITCODE -ne 0){throw 'Run in the actual Git checkout. A source ZIP does not prove branch or HEAD.'}
 $branch=git branch --show-current
 $status=@(git status --porcelain=v1)
 $files=@(git ls-files)
 if($LASTEXITCODE -ne 0){throw 'Could not read tracked source inventory.'}
 $inventory=foreach($file in $files){if(Test-Path -LiteralPath $file -PathType Leaf){[ordered]@{path=$file;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash.ToLowerInvariant()}}}
 [ordered]@{captured_at=(Get-Date -Format o);head=$head;branch=$branch;status=$status;tracked_files=$inventory}|ConvertTo-Json -Depth 6|Set-Content -LiteralPath (Join-Path $OutputDirectory 'baseline.json') -Encoding UTF8
 Write-Output "Recorded actual Git HEAD, branch, changes and tracked file hashes in $OutputDirectory"
}finally{Pop-Location}
