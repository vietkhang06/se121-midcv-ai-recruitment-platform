@echo off
setlocal enabledelayedexpansion
title AI Recruitment Platform - Stop Local Dev
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-dev.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Press any key to exit...
    pause >nul
)
