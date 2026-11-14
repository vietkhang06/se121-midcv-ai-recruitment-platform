@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Start-MidcvProductUpgrade.ps1" %*
exit /b %ERRORLEVEL%
