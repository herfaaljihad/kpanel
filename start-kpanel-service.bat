@echo off
REM KPanel Auto-Start Script for Windows
REM This script will start the KPanel API service using PM2

echo Starting KPanel Service...
cd /d "C:\var\www\kpanel"

REM Check if PM2 is running
pm2 ping >nul 2>&1
if %errorlevel% neq 0 (
    echo PM2 daemon not running, starting...
    pm2 kill
    timeout /t 2 /nobreak >nul
)

REM Start or restart the KPanel API service
echo Starting KPanel API service...
pm2 start production-server.js --name kpanel-production
pm2 save

echo KPanel service started successfully!
echo You can check status with: pm2 status
echo View logs with: pm2 logs kpanel-api
pause