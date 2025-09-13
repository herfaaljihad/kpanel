@echo off
REM KPanel Windows Installation Script
REM Similar to DirectAdmin installation process

setlocal EnableDelayedExpansion

REM Configuration
set KPANEL_VERSION=2.0.0
set KPANEL_PORT=2222
set KPANEL_DIR=C:\KPanel
set KPANEL_SERVICE=KPanel
set INSTALL_DIR=%~dp0

REM Colors (for Windows)
set ESC=
set RED=%ESC%[91m
set GREEN=%ESC%[92m
set YELLOW=%ESC%[93m
set BLUE=%ESC%[94m
set NC=%ESC%[0m

echo.
echo ======================================
echo   KPanel Installation Script v%KPANEL_VERSION%
echo   Windows Edition
echo ======================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script must be run as Administrator
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo [INFO] Administrator privileges confirmed

REM Check system requirements
echo [INFO] Checking system requirements...

REM Check Windows version
for /f "tokens=4-5 delims=. " %%i in ('ver') do set VERSION=%%i.%%j
echo [INFO] Windows version: %VERSION%

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARN] Node.js not found. Please install Node.js 18.x or higher
    echo [INFO] Download from: https://nodejs.org/
    echo [INFO] After installing Node.js, please run this script again
    pause
    exit /b 1
)

REM Get Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [INFO] Node.js version: %NODE_VERSION%

REM Check if npm is available
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] NPM not found
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [INFO] NPM version: %NPM_VERSION%

REM Get system information
echo [INFO] Detecting system information...
for /f "skip=1 tokens=*" %%i in ('wmic computersystem get TotalPhysicalMemory /value') do (
    for /f "tokens=2 delims==" %%j in ("%%i") do set TOTAL_MEMORY=%%j
)

REM Convert bytes to GB
set /a MEMORY_GB=%TOTAL_MEMORY%/1024/1024/1024
echo [INFO] Total Memory: %MEMORY_GB% GB

if %MEMORY_GB% LSS 2 (
    echo [WARN] System has less than 2GB RAM. KPanel may run slowly.
)

REM Create KPanel directory
echo [INFO] Creating KPanel directories...
if not exist "%KPANEL_DIR%" mkdir "%KPANEL_DIR%"
if not exist "%KPANEL_DIR%\conf" mkdir "%KPANEL_DIR%\conf"
if not exist "%KPANEL_DIR%\logs" mkdir "%KPANEL_DIR%\logs"
if not exist "%KPANEL_DIR%\database" mkdir "%KPANEL_DIR%\database"

REM Copy KPanel files
echo [INFO] Installing KPanel files...
xcopy /E /I /Y "%INSTALL_DIR%*" "%KPANEL_DIR%\"

REM Install dependencies
echo [INFO] Installing Node.js dependencies...
cd /d "%KPANEL_DIR%"
call npm install --production

REM Build client
echo [INFO] Building client application...
cd /d "%KPANEL_DIR%\client"
call npm install
call npm run build

REM Generate configuration
echo [INFO] Generating KPanel configuration...
cd /d "%KPANEL_DIR%"

REM Generate random secrets (Windows version)
powershell -Command "
$JWT_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach {[char]$_})
$SESSION_SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach {[char]$_})
$ADMIN_PASSWORD = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 12 | ForEach {[char]$_})

@"
# KPanel Environment Variables
# Auto-generated on $(Get-Date)

NODE_ENV=production
PORT=%KPANEL_PORT%
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DB_PATH=%KPANEL_DIR%\database\kpanel.db
ADMIN_EMAIL=admin@kpanel.local
ADMIN_PASSWORD=$ADMIN_PASSWORD
"@ | Out-File -FilePath '%KPANEL_DIR%\.env' -Encoding UTF8

@"
KPanel Administrator Account Information
=======================================
Generated: $(Get-Date)

Username: admin@kpanel.local
Password: $ADMIN_PASSWORD

Access URLs:
- Control Panel: http://localhost:%KPANEL_PORT%
- Network Access: http://$(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'Ethernet*','Wi-Fi*' | Select-Object -First 1).IPAddress:%KPANEL_PORT%

Configuration Directory: %KPANEL_DIR%\conf
Database Directory: %KPANEL_DIR%\database  
Log Directory: %KPANEL_DIR%\logs

IMPORTANT: Save this information in a secure location!
"@ | Out-File -FilePath '%KPANEL_DIR%\conf\setup.txt' -Encoding UTF8
"

REM Initialize database
echo [INFO] Initializing database...
node -e "
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Simple database initialization
const dbDir = path.join(process.cwd(), 'database');
const dbPath = path.join(dbDir, 'kpanel.db');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

console.log('Database directory created:', dbDir);
console.log('Database will be created at:', dbPath);
"

REM Create Windows service using NSSM (if available)
echo [INFO] Setting up Windows service...
where nssm >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] NSSM found, creating Windows service...
    nssm install %KPANEL_SERVICE% "%KPANEL_DIR%\kpanel-service.bat"
    nssm set %KPANEL_SERVICE% DisplayName "KPanel Control Panel"
    nssm set %KPANEL_SERVICE% Description "KPanel Web-based Control Panel"
    nssm set %KPANEL_SERVICE% Start SERVICE_AUTO_START
) else (
    echo [WARN] NSSM not found. Creating startup script instead...
    echo [INFO] Download NSSM from: https://nssm.cc/download
)

REM Create startup script
echo [INFO] Creating startup script...
echo @echo off > "%KPANEL_DIR%\kpanel-service.bat"
echo cd /d "%KPANEL_DIR%" >> "%KPANEL_DIR%\kpanel-service.bat"
echo node production-server.js >> "%KPANEL_DIR%\kpanel-service.bat"

echo @echo off > "%KPANEL_DIR%\start-kpanel.bat"
echo echo Starting KPanel Control Panel... >> "%KPANEL_DIR%\start-kpanel.bat"
echo cd /d "%KPANEL_DIR%" >> "%KPANEL_DIR%\start-kpanel.bat"
echo start "KPanel" /min node production-server.js >> "%KPANEL_DIR%\start-kpanel.bat"
echo echo KPanel started! Access at http://localhost:%KPANEL_PORT% >> "%KPANEL_DIR%\start-kpanel.bat"
echo pause >> "%KPANEL_DIR%\start-kpanel.bat"

REM Create desktop shortcut
echo [INFO] Creating desktop shortcut...
powershell -Command "
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\KPanel.lnk')
$Shortcut.TargetPath = '%KPANEL_DIR%\start-kpanel.bat'
$Shortcut.WorkingDirectory = '%KPANEL_DIR%'
$Shortcut.IconLocation = '%KPANEL_DIR%\client\public\favicon.ico'
$Shortcut.Description = 'KPanel Control Panel'
$Shortcut.Save()
"

REM Configure Windows Firewall
echo [INFO] Configuring Windows Firewall...
netsh advfirewall firewall add rule name="KPanel Control Panel" dir=in action=allow protocol=TCP localport=%KPANEL_PORT% >nul 2>&1
if %errorLevel% equ 0 (
    echo [INFO] Firewall rule added for port %KPANEL_PORT%
) else (
    echo [WARN] Failed to add firewall rule. Please manually allow port %KPANEL_PORT%
)

REM Start KPanel
echo [INFO] Starting KPanel...
cd /d "%KPANEL_DIR%"

REM Try to start as service first, then fallback to manual start
where nssm >nul 2>&1
if %errorLevel% equ 0 (
    net start %KPANEL_SERVICE% >nul 2>&1
    if %errorLevel% equ 0 (
        echo [INFO] KPanel service started successfully
        set SERVICE_STARTED=1
    )
)

if not defined SERVICE_STARTED (
    echo [INFO] Starting KPanel manually...
    start "KPanel Server" /min node production-server.js
    timeout /t 3 >nul
)

REM Get network IP for access URLs
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%i
    set IP=!IP: =!
    goto :got_ip
)
:got_ip

echo.
echo ======================================
echo   KPanel Installation Completed!
echo ======================================
echo.

echo Access Information:
echo Control Panel: http://localhost:%KPANEL_PORT%
if defined IP echo Network Access: http://!IP!:%KPANEL_PORT%
echo.

REM Read admin credentials
if exist "%KPANEL_DIR%\conf\setup.txt" (
    echo Administrator Login:
    findstr /C:"Username:" "%KPANEL_DIR%\conf\setup.txt"
    findstr /C:"Password:" "%KPANEL_DIR%\conf\setup.txt"
    echo.
    
    echo Direct Login URL:
    echo http://localhost:%KPANEL_PORT%/?auto_login=true
    echo.
)

echo Service Management:
echo Start:   net start %KPANEL_SERVICE% ^(or run start-kpanel.bat^)
echo Stop:    net stop %KPANEL_SERVICE%
echo Manual:  Double-click start-kpanel.bat
echo.

echo Configuration Files:
echo Setup Info:  %KPANEL_DIR%\conf\setup.txt
echo Environment: %KPANEL_DIR%\.env
echo.

echo Installation completed successfully!
echo Please save the administrator credentials in a secure location.
echo.
echo For support and documentation, visit:
echo https://github.com/herfaaljihad/kpanel
echo.

REM Open browser to KPanel
echo Opening KPanel in your default browser...
timeout /t 2 >nul
start http://localhost:%KPANEL_PORT%

pause