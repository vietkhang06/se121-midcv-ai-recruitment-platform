# ============================================================
# AI RECRUITMENT PLATFORM - LOCAL DEVELOPMENT STOP SCRIPT
# scripts/stop-dev.ps1
# ============================================================

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " STOPPING LOCAL DEVELOPMENT ENVIRONMENT" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to kill process listening on specific port safely
function Stop-ProcessOnPort([int]$port, [string]$name) {
    Write-Host "Checking $name on port $port..." -ForegroundColor Yellow
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($conn in $connections) {
                $procId = $conn.OwningProcess
                $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "  -> Terminating $name process ($($proc.ProcessName), PID $procId)..." -ForegroundColor Gray
                    Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                }
            }
            Write-Host "  -> $name stopped." -ForegroundColor Green
        } else {
            Write-Host "  -> $name is not running." -ForegroundColor Gray
        }
    } catch {
        Write-Host "  -> Could not query port $port." -ForegroundColor Gray
    }
}

# 1. Stop Frontend (3000)
Stop-ProcessOnPort -port 3000 -name "Frontend (Next.js)"

# 2. Stop AI Worker (8000)
Stop-ProcessOnPort -port 8000 -name "AI Worker (FastAPI)"

# 3. Stop Backend (8080)
Stop-ProcessOnPort -port 8080 -name "Backend (Spring Boot)"

# 4. Stop Docker PostgreSQL Container safely (No volume deletion!)
Write-Host "`nStopping PostgreSQL Docker container..." -ForegroundColor Yellow
try {
    docker compose stop
    Write-Host "  -> PostgreSQL container stopped safely (Database data preserved)." -ForegroundColor Green
} catch {
    Write-Host "  -> Docker compose stop failed or Docker is not running." -ForegroundColor Gray
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " ALL LOCAL SERVICES STOPPED SUCCESSFULLY" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan
