@echo off
echo Building KPanel React App...
cd client
call npm run build
echo âœ… Build completed!
echo.
echo Starting production server...
cd ..
node production-server.js
