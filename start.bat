@echo off
title Hospitalist Workflow
echo ========================================
echo   Hospitalist Workflow Application
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Check if .next build exists
if not exist ".next\" (
    echo Building application...
    call npm run build
    if %errorlevel% neq 0 (
        echo ERROR: Build failed
        pause
        exit /b 1
    )
)

echo.
echo Starting server at http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
start http://localhost:3000
call npm start
