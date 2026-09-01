# ============================================================
# AI RECRUITMENT PLATFORM - RESET DATABASE SCRIPT
# scripts/reset-db-dev.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "`n**********************************************************" -ForegroundColor Red
Write-Host " WARNING: THIS WILL DELETE ALL LOCAL DATABASE DATA." -ForegroundColor Red
Write-Host " ALL POSTGRESQL VOLUMES & STORED RECORDS WILL BE PURGED." -ForegroundColor Red
Write-Host "**********************************************************`n" -ForegroundColor Red

$confirmation = Read-Host "Are you sure you want to reset local database? (Y/N)"

if ($confirmation -notin @("Y", "y", "YES", "yes")) {
    Write-Host "Database reset cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host "`nResetting database container & volumes..." -ForegroundColor Yellow
docker compose down -v
docker compose up -d

Write-Host "Waiting for PostgreSQL container to become healthy..." -ForegroundColor Gray
$pgContainer = "airecruit-postgres-pgvector"
$maxWait = 60
$elapsed = 0
$healthy = $false

while ($elapsed -lt $maxWait) {
    try {
        $health = docker inspect --format='{{json .State.Health.Status}}' $pgContainer 2>$null
        if ($health -eq '"healthy"' -or (docker exec $pgContainer pg_isready -U postgres -d airecruit_db 2>$null)) {
            $healthy = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 2
    $elapsed += 2
}

if ($healthy) {
    Write-Host "`nSUCCESS: Database recreated cleanly." -ForegroundColor Green
    Write-Host "Run Spring Boot backend to automatically execute Flyway migrations." -ForegroundColor Green
} else {
    Write-Host "`nERROR: Database container failed to become healthy." -ForegroundColor Red
}
