@echo off
title Regnis Birthday Wish SMS Engine Server
color 0A

echo ========================================================
echo   REGNIS BIRTHDAY SMS SCHEDULER ENGINE (TEXT.LK)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Node.js Environment...
where node >nul 2>nul
if errorlevel 1 goto NONODE

echo [2/3] Verifying Dependencies...
if not exist node_modules\express call npm install express cors multer xlsx node-cron axios dotenv --no-audit --no-fund

echo.
echo [3/3] Launching Server on http://localhost:5000 ...
echo.

start "" "http://localhost:5000"

node server.js
goto END

:NONODE
echo ERROR: Node.js is not installed or not in PATH!
echo Please install Node.js from https://nodejs.org/
pause

:END
