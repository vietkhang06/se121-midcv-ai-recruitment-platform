# Executes real SQL against the PostgreSQL connection configured for psql.
# No fixtures, no local mocks, no database writes. Requires PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD.
$ErrorActionPreference = 'Stop'
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    throw 'psql not found. Install PostgreSQL client and put psql on PATH.'
}
$sql = Join-Path $PSScriptRoot 'verify_midcv_pgvector_live.sql'
if (-not (Test-Path $sql)) { throw "SQL file not found: $sql" }
Write-Host 'Checking ACTUAL PostgreSQL/Pgvector. No mock and no data mutations.'
& psql -X -v ON_ERROR_STOP=1 -f $sql
if ($LASTEXITCODE -ne 0) { throw "Live Pgvector acceptance FAILED (psql exit $LASTEXITCODE)" }
Write-Host 'PASS: real Pgvector operator executed against a scored Candidate application.'
