# KPanel Installation Script for Windows PowerShell
# Similar to HestiaCP installation approach
# Usage: irm https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-windows.ps1 | iex

param(
    [string]$InstallPath = "C:\kpanel",
    [int]$Port = 3001,
    [switch]$SkipFirewall
)

# Colors for output
$Colors = @{
    Red = [System.ConsoleColor]::Red
    Green = [System.ConsoleColor]::Green
    Yellow = [System.ConsoleColor]::Yellow
    Blue = [System.ConsoleColor]::Blue
    White = [System.ConsoleColor]::White
}

function Write-Header {
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Colors.Blue
    Write-Host "║                     KPanel Installer                        ║" -ForegroundColor $Colors.Blue
    Write-Host "║              Web-based Server Control Panel                 ║" -ForegroundColor $Colors.Blue
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Colors.Blue
    Write-Host ""
}

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
    exit 1
}

function Test-Administrator {
    $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    return $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-SystemRequirements {
    Write-Status "Checking system requirements..."
    
    # Check Windows version
    $osVersion = [System.Environment]::OSVersion.Version
    if ($osVersion.Major -lt 10) {
        Write-Error "Windows 10 or later is required. Current version: $($osVersion.Major).$($osVersion.Minor)"
    }
    Write-Status "Operating system: Windows $($osVersion.Major).$($osVersion.Minor) (OK)"
    
    # Check memory
    $memory = [math]::Round((Get-CimInstance Win32_PhysicalMemory | Measure-Object -Property capacity -Sum).sum /1gb, 2)
    if ($memory -lt 1) {
        Write-Error "Minimum 1GB RAM required. Current: ${memory}GB"
    }
    Write-Status "Memory: ${memory}GB (OK)"
    
    # Check disk space
    $disk = [math]::Round((Get-PSDrive C).Free / 1GB, 2)
    if ($disk -lt 2) {
        Write-Error "Minimum 2GB free disk space required. Available: ${disk}GB"
    }
    Write-Status "Disk space: ${disk}GB available (OK)"
}

function Install-NodeJS {
    Write-Status "Installing Node.js..."
    
    # Check if Node.js is already installed
    try {
        $nodeVersion = node --version
        $npmVersion = npm --version
        Write-Status "Node.js $nodeVersion and npm $npmVersion already installed"
        return
    }
    catch {
        Write-Status "Node.js not found, installing..."
    }
    
    # Download and install Node.js LTS
    $nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"
    $nodeInstaller = "$env:TEMP\nodejs-installer.msi"
    
    Write-Status "Downloading Node.js installer..."
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
    
    Write-Status "Installing Node.js (this may take a few minutes)..."
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i `"$nodeInstaller`" /quiet /norestart" -Wait
    
    # Add Node.js to PATH
    $nodePath = "${env:ProgramFiles}\nodejs"
    if (Test-Path $nodePath) {
        $env:PATH += ";$nodePath"
    }
    
    # Verify installation
    try {
        $nodeVersion = & "$nodePath\node.exe" --version
        $npmVersion = & "$nodePath\npm.cmd" --version
        Write-Status "Node.js $nodeVersion and npm $npmVersion installed successfully"
    }
    catch {
        Write-Error "Failed to verify Node.js installation"
    }
    
    # Cleanup
    Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
}

function Install-Git {
    Write-Status "Installing Git..."
    
    # Check if Git is already installed
    try {
        $gitVersion = git --version
        Write-Status "Git already installed: $gitVersion"
        return
    }
    catch {
        Write-Status "Git not found, installing..."
    }
    
    # Install Git using winget
    try {
        winget install --id Git.Git -e --source winget --silent --accept-package-agreements --accept-source-agreements
        Write-Status "Git installed successfully"
    }
    catch {
        Write-Warning "Failed to install Git via winget. Please install Git manually from https://git-scm.com/"
    }
}

function Download-KPanel {
    Write-Status "Downloading KPanel..."
    
    # Create installation directory
    if (Test-Path $InstallPath) {
        Write-Status "Installation directory exists, removing old installation..."
        Remove-Item $InstallPath -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    
    # Clone repository
    Set-Location $InstallPath
    git clone https://github.com/herfaaljihad/kpanel.git .
    
    if (-not (Test-Path "$InstallPath\package.json")) {
        Write-Error "Failed to download KPanel. Please check your internet connection and try again."
    }
    
    Write-Status "KPanel downloaded to $InstallPath"
}

function Install-KPanelDependencies {
    Write-Status "Installing KPanel dependencies..."
    
    Set-Location $InstallPath
    
    # Install npm dependencies
    npm install --production
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install KPanel dependencies"
    }
    
    # Build frontend if needed
    if (Test-Path "$InstallPath\client") {
        npm run build 2>$null
    }
    
    Write-Status "KPanel dependencies installed"
}

function Configure-KPanel {
    Write-Status "Configuring KPanel..."
    
    Set-Location $InstallPath
    
    # Create .env from example
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        
        # Generate JWT secret
        $jwtSecret = [System.Web.Security.Membership]::GeneratePassword(64, 10)
        (Get-Content ".env") | ForEach-Object { 
            $_ -replace "your-super-secure-64-character-jwt-secret-key-here-change-this", $jwtSecret
        } | Set-Content ".env"
        
        # Set port
        (Get-Content ".env") | ForEach-Object { 
            $_ -replace "PORT=3001", "PORT=$Port"
        } | Set-Content ".env"
        
        # Set production environment
        (Get-Content ".env") | ForEach-Object { 
            $_ -replace "NODE_ENV=development", "NODE_ENV=production"
        } | Set-Content ".env"
    }
    
    # Create database directory
    New-Item -ItemType Directory -Path "$InstallPath\database" -Force | Out-Null
    
    # Create logs directory
    New-Item -ItemType Directory -Path "$InstallPath\logs" -Force | Out-Null
    
    Write-Status "KPanel configuration completed"
}

function Install-WindowsService {
    Write-Status "Installing Windows service..."
    
    # Install node-windows for service management
    Set-Location $InstallPath
    npm install node-windows
    
    # Create service installation script
    $serviceScript = @"
var Service = require('node-windows').Service;

var svc = new Service({
    name: 'KPanel',
    description: 'KPanel Web Control Panel',
    script: '$InstallPath\\production-server.js',
    nodeOptions: [
        '--harmony',
        '--max_old_space_size=4096'
    ],
    env: {
        name: 'NODE_ENV',
        value: 'production'
    }
});

svc.on('install', function(){
    console.log('KPanel service installed successfully');
    svc.start();
});

svc.on('alreadyinstalled', function(){
    console.log('KPanel service already exists');
    svc.start();
});

svc.install();
"@
    
    $serviceScript | Out-File -FilePath "$InstallPath\install-service.js" -Encoding utf8
    
    # Install and start service
    node "$InstallPath\install-service.js"
    
    Write-Status "Windows service installed"
}

function Configure-Firewall {
    if ($SkipFirewall) {
        Write-Status "Skipping firewall configuration as requested"
        return
    }
    
    Write-Status "Configuring Windows Firewall..."
    
    # Add firewall rule for KPanel port
    try {
        New-NetFirewallRule -DisplayName "KPanel HTTP" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow
        Write-Status "Firewall rule added for port $Port"
    }
    catch {
        Write-Warning "Failed to configure firewall. You may need to manually allow port $Port"
    }
    
    # Add firewall rule for HTTP (if using port 80)
    if ($Port -eq 80) {
        try {
            New-NetFirewallRule -DisplayName "KPanel HTTP 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
            Write-Status "Firewall rule added for port 80"
        }
        catch {
            Write-Warning "Failed to add firewall rule for port 80"
        }
    }
}

function Start-KPanel {
    Write-Status "Starting KPanel service..."
    
    # Start Windows service
    try {
        Start-Service -Name "KPanel"
        Write-Status "KPanel service started successfully"
    }
    catch {
        Write-Warning "Failed to start KPanel service automatically. You can start it manually from Services.msc"
    }
    
    # Wait for service to start
    Start-Sleep 10
    
    # Test if service is running
    $service = Get-Service -Name "KPanel" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Status "KPanel is running successfully"
    }
    else {
        Write-Warning "KPanel service may not be running correctly"
    }
}

function Show-CompletionMessage {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" } | Select-Object -First 1).IPAddress
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor $Colors.Green
    Write-Host "║                 KPanel Installation Complete!               ║" -ForegroundColor $Colors.Green
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor $Colors.Green
    Write-Host ""
    Write-Host "Access KPanel:" -ForegroundColor $Colors.Blue
    Write-Host "  Local:      http://localhost:$Port" -ForegroundColor $Colors.White
    Write-Host "  Network:    http://${localIP}:$Port" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Service Management:" -ForegroundColor $Colors.Blue
    Write-Host "  Start:      Start-Service -Name 'KPanel'" -ForegroundColor $Colors.White
    Write-Host "  Stop:       Stop-Service -Name 'KPanel'" -ForegroundColor $Colors.White
    Write-Host "  Restart:    Restart-Service -Name 'KPanel'" -ForegroundColor $Colors.White
    Write-Host "  Status:     Get-Service -Name 'KPanel'" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor $Colors.Blue
    Write-Host "  Directory:  $InstallPath" -ForegroundColor $Colors.White
    Write-Host "  Config:     $InstallPath\.env" -ForegroundColor $Colors.White
    Write-Host "  Logs:       $InstallPath\logs\" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor $Colors.Yellow
    Write-Host "1. Navigate to the web interface" -ForegroundColor $Colors.White
    Write-Host "2. Complete the initial setup wizard" -ForegroundColor $Colors.White
    Write-Host "3. Create your admin account" -ForegroundColor $Colors.White
    Write-Host "4. Configure SSL certificate (recommended)" -ForegroundColor $Colors.White
    Write-Host ""
    Write-Host "Installation completed successfully!" -ForegroundColor $Colors.Green
}

# Main installation process
function Start-Installation {
    Write-Header
    
    if (-not (Test-Administrator)) {
        Write-Error "This script must be run as Administrator. Please run PowerShell as Administrator and try again."
    }
    
    Test-SystemRequirements
    Install-Git
    Install-NodeJS
    Download-KPanel
    Install-KPanelDependencies
    Configure-KPanel
    Install-WindowsService
    Configure-Firewall
    Start-KPanel
    Show-CompletionMessage
}

# Run installation
Start-Installation