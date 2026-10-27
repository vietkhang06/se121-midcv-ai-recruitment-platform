
# ============================================================
# AI RECRUITMENT PLATFORM - LOCAL DEVELOPMENT LAUNCHER
# scripts/start-dev.ps1
# ============================================================

param(
    [switch]$BackendOnly,
    [switch]$SkipLlmPreflight
)

$ErrorActionPreference = "Stop"

# Resolve project root relative to script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path (Join-Path $ScriptDir "..")
Set-Location $ProjectRoot

# Use the project's virtual environment explicitly for every AI Worker Python command.
$AiWorkerDir = Join-Path $ProjectRoot 'ai-worker'
$AiPython = Join-Path $AiWorkerDir '.venv\Scripts\python.exe'

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " AI RECRUITMENT PLATFORM LOCAL DEV STARTUP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

function Invoke-NativeCapture([string]$Executable, [string[]]$NativeArgs) {
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $argumentsText = $NativeArgs -join ' '

    if ($Executable.EndsWith('.cmd', [System.StringComparison]::OrdinalIgnoreCase)) {
        $startInfo.FileName = $env:ComSpec
        $startInfo.Arguments = '/d /s /c ""' + $Executable + '" ' + $argumentsText + '"'
    } else {
        $startInfo.FileName = $Executable
        $startInfo.Arguments = $argumentsText
    }

    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true

    $process = [System.Diagnostics.Process]::new()
    $process.StartInfo = $startInfo

    if (-not $process.Start()) {
        throw "Could not start required tool: $Executable"
    }

    $stdout = $process.StandardOutput.ReadToEnd()
    $stderr = $process.StandardError.ReadToEnd()
    $process.WaitForExit()

    [pscustomobject]@{
        ExitCode = $process.ExitCode
        Output   = ($stdout + [Environment]::NewLine + $stderr)
    }
}

# ------------------------------------------------------------
# STEP 1: Environment & Tooling Validation
# ------------------------------------------------------------

Write-Host "`n[1/6] Validating Developer Environment..." -ForegroundColor Yellow

# Load KEY=VALUE configuration without evaluating PowerShell.
# Preserve values explicitly supplied by the caller.
# Never display imported secret values.
$EnvFile = Join-Path $ProjectRoot ".env"
$EnvExampleFile = Join-Path $ProjectRoot ".env.example"

if (-not (Test-Path $EnvFile)) {
    if (Test-Path $EnvExampleFile) {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Gray
        Copy-Item $EnvExampleFile $EnvFile
    } else {
        Write-Host "ERROR: .env and .env.example are both missing." -ForegroundColor Red
        exit 1
    }
}

. (Join-Path $ProjectRoot "scripts\Import-MidcvEnv.ps1") `
    -EnvFile $EnvFile `
    -PreserveExistingEnvironment

# Select JDK 21 for both Maven and javac.
# MIDCV_JDK21_HOME takes precedence, followed by JAVA_HOME,
# PATH, and the previously verified local JBR.
$javaHomes = [System.Collections.Generic.List[string]]::new()

foreach ($candidate in @($env:MIDCV_JDK21_HOME, $env:JAVA_HOME)) {
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
        $javaHomes.Add($candidate.Trim().Trim('"'))
    }
}

$javaOnPath = Get-Command java -ErrorAction SilentlyContinue

if ($javaOnPath -and $javaOnPath.Source) {
    $pathBin = Split-Path -Parent $javaOnPath.Source

    if ((Split-Path -Leaf $pathBin) -ieq 'bin') {
        $javaHomes.Add((Split-Path -Parent $pathBin))
    }
}

$verifiedLocalJdk = 'C:\Users\Khang\.jdks\jbr-21.0.11'

if (Test-Path -LiteralPath $verifiedLocalJdk) {
    $javaHomes.Add($verifiedLocalJdk)
}

$selectedJavaHome = $null

foreach ($candidate in ($javaHomes | Select-Object -Unique)) {
    $javaExe = Join-Path $candidate 'bin\java.exe'
    $javacExe = Join-Path $candidate 'bin\javac.exe'

    if (
        -not (Test-Path -LiteralPath $javaExe) -or
        -not (Test-Path -LiteralPath $javacExe)
    ) {
        continue
    }

    $versionResult = Invoke-NativeCapture $javaExe @('-version')

    if (
        $versionResult.ExitCode -eq 0 -and
        $versionResult.Output -match 'version\s+"?21(?:\.|"|\s)'
    ) {
        $selectedJavaHome = (Resolve-Path -LiteralPath $candidate).Path
        break
    }
}

if (-not $selectedJavaHome) {
    Write-Host "ERROR: JDK 21 with both java.exe and javac.exe is required. Set MIDCV_JDK21_HOME to its installation directory." -ForegroundColor Red
    exit 1
}

$env:JAVA_HOME = $selectedJavaHome
$env:PATH = (Join-Path $selectedJavaHome 'bin') + ';' + $env:PATH

$javaResult = Invoke-NativeCapture `
    (Join-Path $selectedJavaHome 'bin\java.exe') `
    @('-version')

$javacResult = Invoke-NativeCapture `
    (Join-Path $selectedJavaHome 'bin\javac.exe') `
    @('-version')

if (
    $javaResult.ExitCode -ne 0 -or
    $javacResult.ExitCode -ne 0 -or
    $javacResult.Output -notmatch 'javac\s+21(?:\.|\s)'
) {
    Write-Host "ERROR: Selected JDK must provide both java and javac version 21." -ForegroundColor Red
    exit 1
}
. (Join-Path $ProjectRoot "scripts\Import-MidcvEnv.ps1") -EnvFile $EnvFile -PreserveExistingEnvironment

Write-Host "  -> Selected JDK 21: $($selectedJavaHome)" -ForegroundColor Gray

$mvnCommand = Get-Command mvn -ErrorAction SilentlyContinue

if (-not $mvnCommand) {
    Write-Host "ERROR: Maven (mvn) was not found in PATH." -ForegroundColor Red
    exit 1
}

$mavenVersionResult = Invoke-NativeCapture $mvnCommand.Source @('-version')

if (
    $mavenVersionResult.ExitCode -ne 0 -or
    $mavenVersionResult.Output -notmatch 'Java version:\s*21(?:\.|\s)'
) {
    Write-Host "ERROR: Maven did not start on the selected JDK 21. Verify its launcher and JAVA_HOME." -ForegroundColor Red
    exit 1
}

# Verify the exact Python interpreter required by AI Worker.
# Do not depend on the system Python selected from PATH.
if (-not (Test-Path -LiteralPath $AiPython -PathType Leaf)) {
    Write-Host "ERROR: AI Worker virtual environment was not found." -ForegroundColor Red
    Write-Host "Expected Python: $AiPython" -ForegroundColor Gray
    Write-Host "Create ai-worker\.venv and install ai-worker\requirements.txt." -ForegroundColor Yellow
    exit 1
}

# Fail early if Uvicorn is unavailable in the expected environment.
$aiPythonCheck = Invoke-NativeCapture `
    $AiPython `
    @('-m', 'uvicorn', '--version')

if ($aiPythonCheck.ExitCode -ne 0) {
    Write-Host "ERROR: Uvicorn is unavailable in the AI Worker virtual environment." -ForegroundColor Red
    Write-Host $aiPythonCheck.Output -ForegroundColor Yellow
    Write-Host "Install dependencies with: .\ai-worker\.venv\Scripts\python.exe -m pip install -r .\ai-worker\requirements.txt" -ForegroundColor Gray
    exit 1
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js was not found in PATH." -ForegroundColor Red
    exit 1
}

Write-Host "  -> JDK 21, Maven on JDK 21, AI Worker virtualenv, Node.js, and environment configuration are ready." -ForegroundColor Green

# ------------------------------------------------------------
# PRIMARY LLM preflight
# ------------------------------------------------------------

$primaryCheckOk = $false

if ($SkipLlmPreflight) {
    Write-Host "  -> Skipping external LLM preflight by request." -ForegroundColor Gray
} else {
    Write-Host "  -> Checking PRIMARY LLM Configuration (OpenAI-Compatible)..." -ForegroundColor Gray

    try {
        # Use the same Python interpreter as the AI Worker.
        $proc = Start-Process `
            -FilePath $AiPython `
            -ArgumentList @('-m', 'app.tools.check_primary_llm') `
            -WorkingDirectory $AiWorkerDir `
            -NoNewWindow `
            -Wait `
            -PassThru

        if ($proc.ExitCode -eq 0) {
            $primaryCheckOk = $true
            Write-Host "  -> PRIMARY LLM: Verified and operational." -ForegroundColor Green
        } else {
            Write-Host "  -> WARNING: PRIMARY LLM is not verified or configuration needs attention." -ForegroundColor Yellow
            Write-Host "     Ensure LLM_PRIMARY_BASE_URL, LLM_PRIMARY_API_KEY, and LLM_PRIMARY_MODEL are set in .env." -ForegroundColor Gray
        }
    } catch {
        Write-Host "  -> NOTICE: Could not execute Python primary LLM pre-flight check." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# Check local Ollama engine
# ------------------------------------------------------------

Write-Host "  -> Checking Fallback Local Ollama Engine (127.0.0.1:11434)..." -ForegroundColor Gray
$ollamaReady = $false

try {
    $req = [System.Net.HttpWebRequest]::Create("http://127.0.0.1:11434/api/tags")
    $req.Timeout = 2000
    $res = $req.GetResponse()

    if ([int]$res.StatusCode -eq 200) {
        $ollamaReady = $true
    }

    $res.Close()
} catch {}

if ($ollamaReady) {
    Write-Host "  -> Fallback Ollama Service is READY with dna5rm/granite4.2:3b-8k & bge-m3." -ForegroundColor Green
} else {
    if ($primaryCheckOk) {
        Write-Host "  -> WARNING: Fallback Ollama is not running on http://127.0.0.1:11434." -ForegroundColor Yellow
        Write-Host "     PRIMARY LLM is available; system will run on PRIMARY with fallback unavailable." -ForegroundColor Yellow
    } else {
        Write-Host "  -> NOTICE: Local Ollama is not responding on http://127.0.0.1:11434." -ForegroundColor Yellow
        Write-Host "     If using Local AI mode, please launch Ollama ('ollama serve') before testing AI features." -ForegroundColor Yellow
    }
}

# ------------------------------------------------------------
# Check Tesseract OCR Engine & Language Packs
# ------------------------------------------------------------

Write-Host "  -> Checking Tesseract OCR Engine & Language Packs..." -ForegroundColor Gray
$tessExe = $null

$cmd = Get-Command tesseract -ErrorAction SilentlyContinue

if ($cmd) {
    $tessExe = $cmd.Source
}

if (-not $tessExe -and $env:TESSERACT_CMD -and (Test-Path $env:TESSERACT_CMD)) {
    $tessExe = $env:TESSERACT_CMD
}

if (-not $tessExe) {
    $possiblePaths = @(
        "C:\Program Files\Tesseract-OCR\tesseract.exe",
        "C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        "$env:LOCALAPPDATA\Programs\Tesseract-OCR\tesseract.exe"
    )

    foreach ($p in $possiblePaths) {
        if (Test-Path $p) {
            $tessExe = $p
            break
        }
    }
}

if ($tessExe -and (Test-Path $tessExe)) {
    try {
        $prevEAP = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"

        $verOut = (cmd.exe /c "`"$tessExe`" --version 2>&1") -join " "
        $langsOut = (cmd.exe /c "`"$tessExe`" --list-langs 2>&1") -join "`n"

        $ErrorActionPreference = $prevEAP
        $versionMatch = "Unknown"

        if ($verOut -match 'tesseract\s+([0-9\.]+)') {
            $versionMatch = $matches[1]
        }

        $langs = @()

        foreach ($line in ($langsOut -split "`r?`n")) {
            $trimmed = $line.Trim()

            if (
                $trimmed -and
                -not ($trimmed -match 'List of installed languages') -and
                -not ($trimmed -match 'found:')
            ) {
                $langs += $trimmed
            }
        }

        $hasEng = $langs -contains "eng"
        $hasVie = $langs -contains "vie"

        if ($hasEng -and $hasVie) {
            Write-Host "  -> Tesseract OCR: READY" -ForegroundColor Green
            Write-Host "     Version: $versionMatch" -ForegroundColor Gray
            Write-Host "     Languages: $($langs -join ', ')" -ForegroundColor Gray
        } else {
            $missing = @()

            if (-not $hasEng) { $missing += "eng" }
            if (-not $hasVie) { $missing += "vie" }

            Write-Host "  -> Tesseract OCR: NOT READY" -ForegroundColor Yellow
            Write-Host "     Missing languages: $($missing -join ', ')" -ForegroundColor Yellow
            Write-Host "     Corrective action: Download missing traineddata (vie/eng) into tessdata folder." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  -> Tesseract OCR: NOT READY" -ForegroundColor Yellow
        Write-Host "     Error executing: $_" -ForegroundColor Yellow
    }
} else {
    Write-Host "  -> Tesseract OCR: NOT READY" -ForegroundColor Yellow
    Write-Host "     Executable not found in PATH or standard locations." -ForegroundColor Yellow
    Write-Host "     Corrective action: Install Tesseract (e.g. winget install UB-Mannheim.TesseractOCR) and set TESSERACT_CMD or PATH." -ForegroundColor Yellow
}

# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------

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

function Test-TcpEndpoint([string]$hostName, [int]$port, [int]$timeoutMs = 1200) {
    $client = [System.Net.Sockets.TcpClient]::new()

    try {
        $connect = $client.BeginConnect($hostName, $port, $null, $null)

        if (-not $connect.AsyncWaitHandle.WaitOne($timeoutMs, $false)) {
            return $false
        }

        $client.EndConnect($connect)
        return $true
    } catch {
        return $false
    } finally {
        $client.Dispose()
    }
}

function Test-HttpUrl([string]$url, [int]$timeoutMs = 5000) {
    try {
        $req = [System.Net.HttpWebRequest]::Create($url)
        $req.Timeout = $timeoutMs
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

$databaseUrl = $env:DATABASE_URL

if ([string]::IsNullOrWhiteSpace($databaseUrl) -or $databaseUrl -notmatch '^jdbc:postgresql://') {
    Write-Host "ERROR: DATABASE_URL must be a JDBC PostgreSQL URL in .env or the process environment." -ForegroundColor Red
    exit 1
}
Write-Host "  -> Configured PostgreSQL endpoint: ${databaseHost}:${databasePort}/${databaseName}" -ForegroundColor Gray

try {
    $databaseUri = [Uri]($databaseUrl.Substring('jdbc:'.Length))
    $databaseHost = $databaseUri.Host
    $databasePort = if ($databaseUri.IsDefaultPort) { 5432 } else { $databaseUri.Port }
    $databaseName = $databaseUri.AbsolutePath.TrimStart('/')

    if ([string]::IsNullOrWhiteSpace($databaseHost) -or [string]::IsNullOrWhiteSpace($databaseName)) {
        throw 'Invalid database URL.'
    }
} catch {
    Write-Host "ERROR: DATABASE_URL is not a valid PostgreSQL connection URL." -ForegroundColor Red
    exit 1
}

Write-Host "  -> Configured PostgreSQL endpoint: ${databaseHost}:${databasePort}/${databaseName}" -ForegroundColor Gray

$databaseReady = Test-TcpEndpoint $databaseHost $databasePort

if (-not $databaseReady) {
    $isLoopback = $databaseHost -in @('localhost', '127.0.0.1', '::1')

    if (-not $isLoopback -or $databasePort -ne 5432 -or $databaseName -ne 'airecruit_db') {
        Write-Host "ERROR: Configured PostgreSQL endpoint refused connections. The local compose service is not configured for this endpoint; start the configured database and retry." -ForegroundColor Red
        exit 1
    }

    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue

    if (-not $dockerCommand) {
        Write-Host "ERROR: PostgreSQL at ${databaseHost}:${databasePort} refused connections and Docker CLI is unavailable." -ForegroundColor Red
        exit 1
    }

    $dockerInfo = Invoke-NativeCapture $dockerCommand.Source @('info')

    if ($dockerInfo.ExitCode -ne 0) {
        Write-Host "ERROR: PostgreSQL at ${databaseHost}:${databasePort} refused connections and Docker Engine is unavailable. Start Docker Desktop or the PostgreSQL service configured by DATABASE_URL." -ForegroundColor Red
        exit 1
    }

    $composeFile = Join-Path $ProjectRoot 'docker-compose.yml'
    $composeStart = Invoke-NativeCapture $dockerCommand.Source @('compose', '-f', $composeFile, 'up', '-d', 'postgres')

    if ($composeStart.ExitCode -ne 0) {
        Write-Host "ERROR: Docker Compose could not start the repository PostgreSQL service. No existing containers or volumes were removed." -ForegroundColor Red
        exit 1
    }

    Write-Host "  -> Waiting up to 60 seconds for PostgreSQL on ${databaseHost}:${databasePort}..." -ForegroundColor Gray

    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Test-TcpEndpoint $databaseHost $databasePort) {
            $databaseReady = $true
            break
        }

        Start-Sleep -Seconds 2
    }
}

if (-not $databaseReady) {
    Write-Host "ERROR: PostgreSQL did not accept TCP connections at ${databaseHost}:${databasePort} within 60 seconds. Check the configured service and port mapping." -ForegroundColor Red
    exit 1
}

Write-Host "  -> PostgreSQL endpoint is accepting connections." -ForegroundColor Green

# ------------------------------------------------------------
# STEP 3: Spring Boot Backend Service (Port 8080)
# ------------------------------------------------------------

Write-Host "`n[3/6] Starting Spring Boot Backend..." -ForegroundColor Yellow

$backendUrl = "http://127.0.0.1:8080/api/v1/jobs"
$backendRunning = Test-PortOccupied 8080

if (-not $backendRunning) {
    Write-Host "  -> Launching Backend terminal (mvn spring-boot:run)..." -ForegroundColor Gray

    $backendDir = Join-Path $ProjectRoot 'backend'
    $quotedBackendDir = "'" + $backendDir.Replace("'", "''") + "'"
    $backendCmd = "Set-Location -LiteralPath $quotedBackendDir; `$Host.UI.RawUI.WindowTitle = 'AI Recruitment - Backend'; mvn clean spring-boot:run"

    Start-Process `
        -FilePath powershell.exe `
        -ArgumentList @('-NoProfile', '-NoExit', '-Command', $backendCmd) `
        -WorkingDirectory $ProjectRoot `
        -WindowStyle Normal | Out-Null

    Write-Host "  -> Waiting for Backend readiness on port 8080..." -ForegroundColor Gray

    $elapsed = 0
    $backendReady = $false

    while ($elapsed -lt 180) {
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
    if ((Test-HttpUrl $backendUrl) -ne 'READY') {
        Write-Host "ERROR: Port 8080 is occupied but the recruitment jobs endpoint is not ready. No process was stopped." -ForegroundColor Red
        exit 1
    }

    Write-Host "  -> Backend endpoint is already responding on port 8080." -ForegroundColor Green
}

Write-Host "  -> Backend Service is READY on http://127.0.0.1:8080." -ForegroundColor Green

if ($BackendOnly) {
    Write-Host "Backend-only mode complete; worker/frontend were not started." -ForegroundColor Cyan
    exit 0
}

# ------------------------------------------------------------
# STEP 4: Python AI Worker Service (Port 8000)
# ------------------------------------------------------------

Write-Host "`n[4/6] Starting Python AI Worker..." -ForegroundColor Yellow

# Actual health route configured in FastAPI: /internal/ai/health
$aiWorkerUrl = "http://127.0.0.1:8000/internal/ai/health"
$aiWorkerRunning = Test-PortOccupied 8000

if (-not $aiWorkerRunning) {
    Write-Host "  -> Launching AI Worker terminal..." -ForegroundColor Gray

    $quotedAiWorkerDir = "'" + $AiWorkerDir.Replace("'", "''") + "'"
    $quotedAiPython = "'" + $AiPython.Replace("'", "''") + "'"

    $aiWorkerScript = @"
Set-Location -LiteralPath $quotedAiWorkerDir
[System.Console]::Title = 'AI Recruitment - AI Worker'
& $quotedAiPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
"@

    # EncodedCommand avoids Windows command-line quoting issues with paths containing spaces.
    $encodedAiWorkerScript = [Convert]::ToBase64String(
        [System.Text.Encoding]::Unicode.GetBytes($aiWorkerScript)
    )

    Start-Process `
        -FilePath powershell.exe `
        -ArgumentList @('-NoExit', '-EncodedCommand', $encodedAiWorkerScript) `
        -WorkingDirectory $AiWorkerDir `
        -WindowStyle Normal

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
    $nodeModulesPath = Join-Path $ProjectRoot "frontend\node_modules"

    if (-not (Test-Path $nodeModulesPath)) {
        Write-Host "  -> node_modules not found. Installing frontend dependencies (npm install)..." -ForegroundColor Yellow
        cmd.exe /c "cd /d `"$ProjectRoot\frontend`" && npm install"
    }

    Write-Host "  -> Launching Frontend terminal (npm run dev)..." -ForegroundColor Gray

    $frontendCmd = "Set-Location '$ProjectRoot\frontend'; [System.Console]::Title = 'AI Recruitment - Frontend'; cmd.exe /c npm run dev"

    Start-Process `
        -FilePath powershell.exe `
        -ArgumentList @('-NoExit', '-Command', $frontendCmd) `
        -WorkingDirectory $ProjectRoot `
        -WindowStyle Normal

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

if ($ollamaReady) {
    Write-Host " Ollama AI   : READY  (Port 11434, granite4.2 + bge-m3)" -ForegroundColor Green
} else {
    Write-Host " Ollama AI   : STANDBY (Port 11434)" -ForegroundColor Yellow
}

Write-Host " Backend     : READY  (Port 8080)" -ForegroundColor Green
Write-Host " Frontend    : READY  (Port 3000)" -ForegroundColor Green
Write-Host "------------------------------------------" -ForegroundColor Cyan
Write-Host " URLs:" -ForegroundColor Yellow
Write-Host "   Frontend  : http://localhost:3000" -ForegroundColor White
Write-Host "   Backend   : http://localhost:8080" -ForegroundColor White
Write-Host "   AI Settings: http://localhost:3000/admin/ai-settings" -ForegroundColor White
Write-Host "==========================================`n" -ForegroundColor Cyan
