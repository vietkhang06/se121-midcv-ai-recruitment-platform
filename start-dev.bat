@echo off
setlocal enabledelayedexpansion
title AI Recruitment Platform - Local Dev Launcher
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-dev.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Press any key to exit...
    pause >nul
)
