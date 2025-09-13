@echo off
REM KPanel Service Stop Script for Windows

echo Stopping KPanel Service...
pm2 stop kpanel-api
pm2 delete kpanel-api

echo KPanel service stopped successfully!
pause