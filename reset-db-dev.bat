@echo off
setlocal enabledelayedexpansion
title AI Recruitment Platform - Reset Database
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\reset-db-dev.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Press any key to exit...
    pause >nul
)
