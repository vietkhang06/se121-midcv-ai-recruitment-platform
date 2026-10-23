param(
    [string]$EnvFile = (Join-Path $PSScriptRoot '..\.env'),
    [switch]$PreserveExistingEnvironment
)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $EnvFile -PathType Leaf)) {
    throw "Environment file not found: $EnvFile"
}
foreach ($line in [System.IO.File]::ReadAllLines((Resolve-Path -LiteralPath $EnvFile).Path)) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    $parts = $trimmed -split '=', 2
    if ($parts.Count -ne 2 -or $parts[0].Trim() -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') {
        throw 'Invalid environment entry; expected KEY=VALUE.'
    }
    $name = $parts[0].Trim()
    if ($PreserveExistingEnvironment -and (Test-Path -LiteralPath ('Env:' + $name))) { continue }
    $value = $parts[1].Trim()
    if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    # Assignment only. Never evaluate values as PowerShell and never print credentials.
    Set-Item -LiteralPath ('Env:' + $name) -Value $value
}
Write-Host 'Environment variables imported into the current process; values are not displayed.'
