@echo off
setlocal enabledelayedexpansion
title AI Recruitment Platform - Local Dev Launcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-dev.ps1" %*
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
    echo.
    echo Press any key to exit...
    pause >nul
)
exit /b %EXIT_CODE%
