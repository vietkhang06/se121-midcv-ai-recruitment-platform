@echo off
setlocal enabledelayedexpansion
title AI Recruitment Platform - Status Check
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\status-dev.ps1"
echo.
echo Press any key to exit...
pause >nul
