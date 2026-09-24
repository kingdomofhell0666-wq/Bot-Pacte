@echo off
title Kingdom of Hell - Cerberus Pact
cd /d "%~dp0"

echo.
echo ==========================================
echo   KINGDOM OF HELL - CERBERUS PACT
echo ==========================================
echo.

if not exist node_modules (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [INFO] Starting Cerberus...
echo.
call npm start

echo.
echo [INFO] Cerberus stopped.
pause
