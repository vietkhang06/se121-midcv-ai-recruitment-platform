# ============================================================
# AI RECRUITMENT PLATFORM - LOCAL STATUS CHECK SCRIPT
# scripts/status-dev.ps1
# ============================================================

$ErrorActionPreference = "Continue"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

$envFile = Join-Path $ProjectRoot '.env'
if (Test-Path -LiteralPath $envFile) {
    . (Join-Path $ProjectRoot 'scripts\Import-MidcvEnv.ps1') -EnvFile $envFile -PreserveExistingEnvironment
}
$databaseHost = 'localhost'
$databasePort = 5432
$databaseConfigured = $false
try {
    if ($env:DATABASE_URL -match '^jdbc:postgresql://') {
        $databaseUri = [Uri]$env:DATABASE_URL.Substring('jdbc:'.Length)
        $databaseHost = $databaseUri.Host
        $databasePort = if ($databaseUri.IsDefaultPort) { 5432 } else { $databaseUri.Port }
        $databaseConfigured = -not [string]::IsNullOrWhiteSpace($databaseHost)
    }
} catch {}

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " LOCAL DEVELOPMENT STATUS CHECK" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Helper function to check TCP Port
function Test-PortOccupied([int]$port, [string]$hostName = 'localhost') {
    try {
        $conn = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $conn.BeginConnect($hostName, $port, $null, $null)
        $success = $asyncResult.AsyncWaitHandle.WaitOne(500, $false)
        if ($success) {
            $conn.EndConnect($asyncResult)
            $conn.Close()
            return $true
        }
    } catch {}
    return $false
}

# Helper function to test HTTP URL
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
            if ($code -ge 200 -and $code -lt 400) {
                return "READY"
            }
        }
        return "NOT_READY"
    } catch {
        return "NOT_READY"
    }
}

# 1. Check Docker & PostgreSQL
$dockerStatus = "NOT RUNNING"
$pgStatus = "NOT RUNNING"

try {
    $null = docker info 2>&1
    if ($LASTEXITCODE -eq 0) { $dockerStatus = "READY" }
} catch {
    $dockerStatus = "NOT RUNNING"
    $pgStatus = "NOT RUNNING"
}

if (-not $databaseConfigured) {
    $pgStatus = 'NOT CONFIGURED'
} elseif (Test-PortOccupied $databasePort $databaseHost) {
    $pgStatus = 'REACHABLE (TCP)'
}

# AI Worker process status (provider details via /internal/ai/health)
$workerStatus = Test-HttpUrl "http://127.0.0.1:8000/internal/ai/health"

# 3. Check Backend (8080)
$backendStatus = "NOT RUNNING"
if ((Test-HttpUrl "http://127.0.0.1:8080/api/v1/jobs") -eq "READY") {
    $backendStatus = "READY"
} elseif (Test-PortOccupied 8080) {
    $backendStatus = "STARTING / NOT READY"
}

# 4. Check Frontend (3000)
$frontendStatus = "NOT RUNNING"
if ((Test-HttpUrl "http://127.0.0.1:3000") -eq "READY") {
    $frontendStatus = "READY"
} elseif (Test-PortOccupied 3000) {
    $frontendStatus = "STARTING / NOT READY"
}

# Display Status Summary
Write-Host " Docker Desktop : $dockerStatus" -ForegroundColor $(if ($dockerStatus -eq "READY") { "Green" } else { "Red" })
Write-Host " PostgreSQL DB  : $pgStatus (${databaseHost}:$databasePort)" -ForegroundColor $(if ($pgStatus.StartsWith('REACHABLE')) { "Green" } else { "Yellow" })
Write-Host " AI Worker      : $workerStatus (Port 8000)" -ForegroundColor Cyan
Write-Host " Backend        : $backendStatus (Port 8080)" -ForegroundColor $(if ($backendStatus -eq "READY") { "Green" } else { "Yellow" })
Write-Host " Frontend       : $frontendStatus (Port 3000)" -ForegroundColor $(if ($frontendStatus -eq "READY") { "Green" } else { "Yellow" })

Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host " URLs:" -ForegroundColor Yellow
Write-Host "   Frontend    : http://localhost:3000" -ForegroundColor White
Write-Host "   AI Settings : http://localhost:3000/admin/ai-settings" -ForegroundColor White
Write-Host "   Backend API : http://localhost:8080" -ForegroundColor White
Write-Host "==========================================`n" -ForegroundColor Cyan
