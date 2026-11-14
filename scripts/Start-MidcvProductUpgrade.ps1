param([switch]$BackendOnly, [switch]$SkipLlmPreflight)
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Set-Location $project
$envFile = Join-Path $project '.env'
if (-not (Test-Path $envFile)) { Copy-Item (Join-Path $project '.env.example') $envFile }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop is required to start Mailpit. Start Docker Desktop and rerun this command.' }

function Get-ConfiguredPort([string]$Text, [string]$Key, [int]$Default) {
    $match = [Regex]::Match($Text, '(?m)^\s*' + [Regex]::Escape($Key) + '\s*=\s*(\d+)\s*$')
    if ($match.Success) {
        $value = 0
        if ([int]::TryParse($match.Groups[1].Value, [ref]$value) -and $value -ge 1 -and $value -le 65535) { return $value }
    }
    return $Default
}

function Test-TcpPortFree([int]$Port) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
    try { $listener.Start(); return $true }
    catch { return $false }
    finally { try { $listener.Stop() } catch {} }
}

function Find-FreePort([int]$Preferred) {
    for ($port = $Preferred; $port -le [Math]::Min(65535, $Preferred + 100); $port++) {
        if (Test-TcpPortFree $port) { return $port }
    }
    throw "No free local TCP port found from $Preferred to $($Preferred + 100)."
}

# Preserve database, provider and OAuth settings. Only local email delivery changes.
$content = [IO.File]::ReadAllText($envFile)
$preferredSmtpPort = Get-ConfiguredPort $content 'MAILPIT_SMTP_PORT' 1025
$preferredUiPort = Get-ConfiguredPort $content 'MAILPIT_UI_PORT' 8025
$smtpPort = Find-FreePort $preferredSmtpPort
$uiPort = Find-FreePort $preferredUiPort
if ($smtpPort -ne $preferredSmtpPort) { Write-Warning "Port $preferredSmtpPort is occupied; Mailpit SMTP will use $smtpPort." }
if ($uiPort -ne $preferredUiPort) { Write-Warning "Port $preferredUiPort is occupied; Mailpit UI will use $uiPort." }
$backup = Join-Path $project ('.env.before-product-upgrade-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
Copy-Item $envFile $backup
$changes = @{
    EMAIL_MODE='SMTP'; SMTP_HOST='localhost'; SMTP_PORT=[string]$smtpPort
    SMTP_AUTH='false'; SMTP_STARTTLS='false'
    MAILPIT_SMTP_PORT=[string]$smtpPort; MAILPIT_UI_PORT=[string]$uiPort
}
foreach ($key in $changes.Keys) {
    $pattern = '(?m)^\s*' + [Regex]::Escape($key) + '\s*=.*$'
    $line = $key + '=' + $changes[$key]
    if ([Regex]::IsMatch($content, $pattern)) { $content = [Regex]::Replace($content, $pattern, $line) }
    else { $content += [Environment]::NewLine + $line }
    [Environment]::SetEnvironmentVariable($key, $changes[$key], 'Process')
}
[IO.File]::WriteAllText($envFile, $content, [Text.UTF8Encoding]::new($false))
& docker compose -f (Join-Path $project 'docker-compose.yml') up -d mailpit
if ($LASTEXITCODE -ne 0) { throw 'Mailpit failed to start. No database volume was removed.' }
Write-Host "Mailpit inbox: http://localhost:$uiPort ; real SMTP: localhost:$smtpPort" -ForegroundColor Green
Write-Host 'Existing database, LLM and OAuth settings were preserved.' -ForegroundColor Gray
$arguments = @{}
if ($BackendOnly) { $arguments.BackendOnly = $true }
if ($SkipLlmPreflight) { $arguments.SkipLlmPreflight = $true }
& (Join-Path $PSScriptRoot 'start-dev.ps1') @arguments
