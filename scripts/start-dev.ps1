# ============================================================
# AI RECRUITMENT PLATFORM - LOCAL DEVELOPMENT LAUNCHER
# scripts/start-dev.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# Resolve project root relative to script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " AI RECRUITMENT PLATFORM LOCAL DEV STARTUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# ------------------------------------------------------------
# STEP 1: Environment & Tooling Validation
# ------------------------------------------------------------
Write-Host "`n[1/6] Validating Developer Environment..." -ForegroundColor Yellow

# Check Docker Desktop
try {
    $null = docker info 2>&1
} catch {
    Write-Host "ERROR: Docker Desktop is not running." -ForegroundColor Red
    Write-Host "Please start Docker Desktop first and re-run start-dev.bat" -ForegroundColor Red
    exit 1
}

# Check Java 21 via PATH or Get-Command
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
    $whereJava = where.exe java 2>$null
    if (-not $whereJava) {
        Write-Host "ERROR: Java executable (java.exe) not found in PATH." -ForegroundColor Red
        Write-Host "Please install Java 21 LTS and ensure java.exe is in your PATH." -ForegroundColor Red
        exit 1
    }
}

try {
    # Execute java --version and java -version safely without triggering $ErrorActionPreference exception
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $javaVerOutput = (cmd.exe /c "java --version 2>&1") -join " "
    if (-not $javaVerOutput -or $javaVerOutput -notmatch '21') {
        $javaVerOutput += " " + ((cmd.exe /c "java -version 2>&1") -join " ")
    }
    $ErrorActionPreference = $prevEAP
    
    # Check for Java 21 (e.g. openjdk 21.0.11, java 21, version "21.x")
    $isJava21 = $false
    $detectedVer = "Unknown"

    if ($javaVerOutput -match '(?i)(?:openjdk|java|version)\D*?(21(?:\.\d+)*)') {
        $detectedVer = $matches[1]
        $isJava21 = $true
    } elseif ($javaVerOutput -match '\b21\.\d+') {
        $detectedVer = $matches[0]
        $isJava21 = $true
    }

    if (-not $isJava21) {
        Write-Host "ERROR: Java 21 is required by this project." -ForegroundColor Red
        Write-Host "Detected version output:`n$javaVerOutput" -ForegroundColor Red
        exit 1
    }

    # Validate optional JAVA_HOME if set
    if ($env:JAVA_HOME) {
        if (-not (Test-Path $env:JAVA_HOME)) {
            Write-Host "  -> WARNING: JAVA_HOME is set to '$env:JAVA_HOME' but path does not exist. Using java.exe from PATH ($detectedVer)." -ForegroundColor Yellow
        } else {
            Write-Host "  -> JAVA_HOME validated: $env:JAVA_HOME" -ForegroundColor Gray
        }
    } else {
        Write-Host "  -> JAVA_HOME is not set (Optional). Using Java 21 from PATH ($detectedVer)." -ForegroundColor Gray
    }
} catch {
    Write-Host "ERROR: Failed to query Java runtime version." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Check Maven, Python, Node
try { $null = mvn -v 2>&1 } catch { Write-Host "ERROR: Maven (mvn) is not installed or not in PATH." -ForegroundColor Red; exit 1 }
try { $null = python --version 2>&1 } catch { Write-Host "ERROR: Python is not installed or not in PATH." -ForegroundColor Red; exit 1 }
try { $null = node -v 2>&1 } catch { Write-Host "ERROR: Node.js is not installed or not in PATH." -ForegroundColor Red; exit 1 }

# Check .env file
$EnvFile = Join-Path $ProjectRoot ".env"
$EnvExampleFile = Join-Path $ProjectRoot ".env.example"
if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExampleFile) {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Gray
        Copy-Item $EnvExampleFile $EnvFile
    } else {
        Write-Host "WARNING: .env file not found." -ForegroundColor Yellow
    }
}

Write-Host "  -> Docker, Java 21, Maven, Python, Node environment valid." -ForegroundColor Green

# Helper function to test TCP Port using 127.0.0.1 IPv4
function Test-PortOccupied([int]$port) {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $conn.BeginConnect("127.0.0.1", $port, $null, $null)
        $success = $asyncResult.AsyncWaitHandle.WaitOne(500, $false)
        if ($success) {
            $conn.EndConnect($asyncResult)
            $conn.Close()
            return $true
        }
    } catch {}
    return $false
}

# Helper function to test HTTP URL and return detailed status
function Test-HttpUrl([string]$url) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Timeout = 2000
        $res = $req.GetResponse()
        $code = [int]$res.StatusCode
        $res.Close()
        if ($code -ge 200 -and $code -lt 400) {
            return "READY"
        }
        return "NOT_READY"
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $resp = [System.Net.HttpWebResponse]$_.Exception.Response
            $code = [int]$resp.StatusCode
            if ($code -eq 404) {
                return "CONFIG_ERROR_404"
            }
            if ($code -ge 200 -and $code -lt 400) {
                return "READY"
            }
            return "NOT_READY"
        }
        return "NOT_READY"
    } catch {
        return "NOT_READY"
    }
}

# ------------------------------------------------------------
# STEP 2: Docker PostgreSQL + Pgvector Container
# ------------------------------------------------------------
Write-Host "`n[2/6] Starting PostgreSQL + Pgvector Database..." -ForegroundColor Yellow

$pgContainer = "airecruit-postgres-pgvector"
$pgStatus = docker inspect --format='{{json .State.Status}}' $pgContainer 2>$null

if ($pgStatus -ne '"running"') {
    Write-Host "  -> Launching docker compose up -d..." -ForegroundColor Gray
    docker compose up -d
} else {
    Write-Host "  -> PostgreSQL container is already running." -ForegroundColor Gray
}

Write-Host "  -> Polling PostgreSQL health status..." -ForegroundColor Gray
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

if (-not $healthy) {
    Write-Host "ERROR: PostgreSQL did not become healthy within $maxWait seconds." -ForegroundColor Red
    Write-Host "Check container logs: docker logs $pgContainer" -ForegroundColor Red
    exit 1
}

Write-Host "  -> PostgreSQL database is READY on 127.0.0.1:5432." -ForegroundColor Green

# ------------------------------------------------------------
# STEP 3: Spring Boot Backend Service (Port 8080)
# ------------------------------------------------------------
Write-Host "`n[3/6] Starting Spring Boot Backend..." -ForegroundColor Yellow

$backendUrl = "http://127.0.0.1:8080/api/v1/jobs"
$backendRunning = Test-PortOccupied 8080

if (-not $backendRunning) {
    Write-Host "  -> Launching Backend terminal (mvn spring-boot:run)..." -ForegroundColor Gray
    $backendCmd = "Set-Location '$ProjectRoot\backend'; [System.Console]::Title = 'AI Recruitment - Backend'; mvn spring-boot:run"
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $backendCmd

    Write-Host "  -> Waiting for Backend readiness on port 8080..." -ForegroundColor Gray
    $elapsed = 0
    $backendReady = $false
    while ($elapsed -lt 90) {
        $status = Test-HttpUrl $backendUrl
        if ($status -eq "READY") {
            $backendReady = $true
            break
        }
        Start-Sleep -Seconds 2
        $elapsed += 2
    }

    if (-not $backendReady) {
        Write-Host "ERROR: Backend failed to start. Check Backend terminal window." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  -> Backend is already running on port 8080." -ForegroundColor Green
}

Write-Host "  -> Backend Service is READY on http://127.0.0.1:8080." -ForegroundColor Green

# ------------------------------------------------------------
# STEP 4: Python AI Worker Service (Port 8000)
# ------------------------------------------------------------
Write-Host "`n[4/6] Starting Python AI Worker..." -ForegroundColor Yellow

# Actual health route configured in FastAPI: /internal/ai/health
$aiWorkerUrl = "http://127.0.0.1:8000/internal/ai/health"
$aiWorkerRunning = Test-PortOccupied 8000

if (-not $aiWorkerRunning) {
    Write-Host "  -> Launching AI Worker terminal..." -ForegroundColor Gray
    $aiWorkerScript = "Set-Location '$ProjectRoot\ai-worker'; [System.Console]::Title = 'AI Recruitment - AI Worker'; if (Test-Path 'venv\Scripts\activate.ps1') { . venv\Scripts\activate.ps1 }; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $aiWorkerScript

    Write-Host "  -> Waiting for AI Worker readiness on $aiWorkerUrl..." -ForegroundColor Gray
    $elapsed = 0
    $aiReady = $false
    while ($elapsed -lt 30) {
        $status = Test-HttpUrl $aiWorkerUrl
        if ($status -eq "READY") {
            $aiReady = $true
            break
        } elseif ($status -eq "CONFIG_ERROR_404") {
            Write-Host "ERROR: AI Worker health endpoint returned 404 Not Found at $aiWorkerUrl" -ForegroundColor Red
            exit 1
        }
        Start-Sleep -Seconds 1
        $elapsed += 1
    }

    if (-not $aiReady) {
        Write-Host "ERROR: AI Worker failed to start. Check AI Worker terminal window." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  -> AI Worker is already running on port 8000." -ForegroundColor Green
}

Write-Host "  -> AI Worker Service is READY on http://127.0.0.1:8000." -ForegroundColor Green

# ------------------------------------------------------------
# STEP 5: Next.js Frontend Web App (Port 3000)
# ------------------------------------------------------------
Write-Host "`n[5/6] Starting Next.js Frontend..." -ForegroundColor Yellow

$frontendUrl = "http://127.0.0.1:3000"
$frontendRunning = Test-PortOccupied 3000

if (-not $frontendRunning) {
    Write-Host "  -> Launching Frontend terminal (npm run dev)..." -ForegroundColor Gray
    $frontendCmd = "Set-Location '$ProjectRoot\frontend'; [System.Console]::Title = 'AI Recruitment - Frontend'; npm run dev"
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $frontendCmd

    Write-Host "  -> Waiting for Frontend readiness on port 3000..." -ForegroundColor Gray
    $elapsed = 0
    $frontendReady = $false
    while ($elapsed -lt 45) {
        $status = Test-HttpUrl $frontendUrl
        if ($status -eq "READY") {
            $frontendReady = $true
            break
        }
        Start-Sleep -Seconds 1
        $elapsed += 1
    }

    if (-not $frontendReady) {
        Write-Host "ERROR: Frontend failed to start. Check Frontend terminal window." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "  -> Frontend is already running on port 3000." -ForegroundColor Green
}

Write-Host "  -> Frontend Web App is READY on http://127.0.0.1:3000." -ForegroundColor Green

# ------------------------------------------------------------
# STEP 6: Final Status Summary & Browser Open
# ------------------------------------------------------------
Write-Host "`n[6/6] Opening Browser..." -ForegroundColor Yellow
try {
    Start-Process "http://localhost:3000"
} catch {}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host " AI RECRUITMENT PLATFORM LOCAL STATUS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " PostgreSQL  : READY  (Port 5432)" -ForegroundColor Green
Write-Host " Backend     : READY  (Port 8080)" -ForegroundColor Green
Write-Host " AI Worker   : READY  (Port 8000)" -ForegroundColor Green
Write-Host " Frontend    : READY  (Port 3000)" -ForegroundColor Green
Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host " URLs:" -ForegroundColor Yellow
Write-Host "   Frontend  : http://localhost:3000" -ForegroundColor White
Write-Host "   Backend   : http://localhost:8080" -ForegroundColor White
Write-Host "   AI Worker : http://localhost:8000/internal/ai/health" -ForegroundColor White
Write-Host "==========================================`n" -ForegroundColor Cyan
