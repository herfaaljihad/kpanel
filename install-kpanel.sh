#!/bin/bash
#
# KPanel Automatic Installation Script
# Similar to DirectAdmin installation process
# 
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-kpanel.sh)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
KPANEL_VERSION="2.0.0"
KPANEL_PORT="2222"
KPANEL_USER="kpanel"
KPANEL_DIR="/usr/local/kpanel"
KPANEL_SERVICE="kpanel"
KPANEL_DB_DIR="$KPANEL_DIR/database"
KPANEL_CONF_DIR="$KPANEL_DIR/conf"
KPANEL_LOG_DIR="/var/log/kpanel"

# System info
OS_TYPE=""
OS_VERSION=""
ARCH=""
PUBLIC_IP=""
LOCAL_IP=""

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "======================================"
    echo "  KPanel Installation Script v$KPANEL_VERSION"
    echo "======================================"
    echo -e "${NC}"
}

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        print_error "Please use: sudo -s"
        exit 1
    fi
}

# Detect OS and architecture
detect_system() {
    print_status "Detecting system information..."
    
    # Detect OS
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        OS_TYPE="$ID"
        OS_VERSION="$VERSION_ID"
    elif [[ -f /etc/redhat-release ]]; then
        OS_TYPE="centos"
        OS_VERSION=$(grep -oE '[0-9]+' /etc/redhat-release | head -1)
    elif [[ -f /etc/debian_version ]]; then
        OS_TYPE="debian"
        OS_VERSION=$(cat /etc/debian_version)
    else
        print_error "Unsupported operating system"
        exit 1
    fi
    
    # Detect architecture
    ARCH=$(uname -m)
    
    # Get IP addresses
    PUBLIC_IP=$(curl -s ipinfo.io/ip || curl -s ifconfig.me || curl -s icanhazip.com || echo "unknown")
    LOCAL_IP=$(ip route get 1 | awk '{print $NF;exit}' 2>/dev/null || hostname -I | awk '{print $1}')
    
    print_status "OS: $OS_TYPE $OS_VERSION"
    print_status "Architecture: $ARCH" 
    print_status "Public IP: $PUBLIC_IP"
    print_status "Local IP: $LOCAL_IP"
}

# Check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check memory (minimum 1GB)
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    
    if [[ $MEMORY_GB -lt 1 ]]; then
        print_warning "System has less than 1GB RAM. KPanel may run slowly."
    fi
    
    # Check disk space (minimum 5GB)
    DISK_FREE_GB=$(df / | awk 'NR==2 {print int($4/1024/1024)}')
    
    if [[ $DISK_FREE_GB -lt 5 ]]; then
        print_error "Insufficient disk space. At least 5GB required."
        exit 1
    fi
    
    print_status "System requirements check passed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    case $OS_TYPE in
        "ubuntu"|"debian")
            apt-get update -y
            apt-get install -y curl wget git unzip sqlite3 nginx supervisor
            
            # Install Node.js 18.x
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt-get install -y nodejs
            ;;
            
        "centos"|"rhel"|"rocky"|"almalinux")
            yum update -y
            yum install -y curl wget git unzip sqlite nginx supervisor
            
            # Install Node.js 18.x
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
            ;;
            
        *)
            print_error "Unsupported operating system: $OS_TYPE"
            exit 1
            ;;
    esac
    
    # Verify Node.js installation
    NODE_VERSION=$(node --version 2>/dev/null || echo "not installed")
    NPM_VERSION=$(npm --version 2>/dev/null || echo "not installed")
    
    print_status "Node.js version: $NODE_VERSION"
    print_status "NPM version: $NPM_VERSION"
}

# Create KPanel user
create_user() {
    print_status "Creating KPanel system user..."
    
    if ! id "$KPANEL_USER" &>/dev/null; then
        useradd --system --create-home --shell /bin/bash "$KPANEL_USER"
        print_status "Created user: $KPANEL_USER"
    else
        print_status "User $KPANEL_USER already exists"
    fi
}

# Download and install KPanel
install_kpanel() {
    print_status "Downloading KPanel..."
    
    # Create directories
    mkdir -p "$KPANEL_DIR"
    mkdir -p "$KPANEL_CONF_DIR"
    mkdir -p "$KPANEL_LOG_DIR"
    mkdir -p "$KPANEL_DB_DIR"
    
    # Download KPanel
    cd /tmp
    git clone https://github.com/herfaaljihad/kpanel.git kpanel-source
    
    # Copy files
    cp -r kpanel-source/* "$KPANEL_DIR/"
    
    # Set permissions
    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR"
    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_LOG_DIR"
    
    # Install Node.js dependencies
    print_status "Installing Node.js dependencies..."
    cd "$KPANEL_DIR"
    sudo -u "$KPANEL_USER" npm install --production
    
    # Build client
    print_status "Building client application..."
    cd "$KPANEL_DIR/client"
    sudo -u "$KPANEL_USER" npm install
    sudo -u "$KPANEL_USER" npm run build
    
    print_status "KPanel installation completed"
}

# Configure KPanel
configure_kpanel() {
    print_status "Configuring KPanel..."
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    ADMIN_PASSWORD=$(openssl rand -base64 12)
    
    # Create main configuration file
    cat > "$KPANEL_CONF_DIR/kpanel.conf" << EOF
# KPanel Configuration File
# Generated on $(date)

# Server Configuration
PORT=$KPANEL_PORT
NODE_ENV=production
PUBLIC_IP=$PUBLIC_IP
LOCAL_IP=$LOCAL_IP

# Security
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET

# Database
DB_PATH=$KPANEL_DB_DIR/kpanel.db

# Admin Account
ADMIN_EMAIL=admin@kpanel.local
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

    # Create environment file
    cat > "$KPANEL_DIR/.env" << EOF
# KPanel Environment Variables
# Auto-generated on $(date)

NODE_ENV=production
PORT=$KPANEL_PORT
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DB_PATH=$KPANEL_DB_DIR/kpanel.db
PUBLIC_IP=$PUBLIC_IP
LOCAL_IP=$LOCAL_IP
ADMIN_EMAIL=admin@kpanel.local
ADMIN_PASSWORD=$ADMIN_PASSWORD
EOF

    # Create setup.txt for admin credentials (like DirectAdmin)
    cat > "$KPANEL_CONF_DIR/setup.txt" << EOF
KPanel Administrator Account Information
=======================================
Generated: $(date)

Username: admin@kpanel.local
Password: $ADMIN_PASSWORD

Access URLs:
- Control Panel: http://$PUBLIC_IP:$KPANEL_PORT
- Local Access: http://$LOCAL_IP:$KPANEL_PORT

Configuration Directory: $KPANEL_CONF_DIR
Database Directory: $KPANEL_DB_DIR
Log Directory: $KPANEL_LOG_DIR

IMPORTANT: Save this information in a secure location!
EOF

    # Set proper permissions
    chown "$KPANEL_USER:$KPANEL_USER" "$KPANEL_CONF_DIR/kpanel.conf"
    chown "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR/.env"
    chown root:root "$KPANEL_CONF_DIR/setup.txt"
    chmod 600 "$KPANEL_CONF_DIR/setup.txt"
    chmod 600 "$KPANEL_DIR/.env"
    
    print_status "KPanel configuration completed"
}

# Setup database
setup_database() {
    print_status "Initializing KPanel database..."
    
    cd "$KPANEL_DIR"
    
    # Initialize database
    sudo -u "$KPANEL_USER" node -e "
        const Database = require('./server/config/database');
        const db = new Database();
        db.initialize().then(() => {
            console.log('Database initialized successfully');
            process.exit(0);
        }).catch(err => {
            console.error('Database initialization failed:', err);
            process.exit(1);
        });
    "
    
    print_status "Database initialization completed"
}

# Create systemd service
create_service() {
    print_status "Creating KPanel systemd service..."
    
    cat > "/etc/systemd/system/$KPANEL_SERVICE.service" << EOF
[Unit]
Description=KPanel Control Panel
Documentation=https://github.com/herfaaljihad/kpanel
After=network.target

[Service]
Type=simple
User=$KPANEL_USER
WorkingDirectory=$KPANEL_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/node production-server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=kpanel

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$KPANEL_DIR $KPANEL_LOG_DIR
ProtectHome=yes

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and enable service
    systemctl daemon-reload
    systemctl enable "$KPANEL_SERVICE"
    
    print_status "KPanel service created and enabled"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # Check if ufw is available (Ubuntu/Debian)
    if command -v ufw >/dev/null 2>&1; then
        ufw allow "$KPANEL_PORT/tcp" comment "KPanel Control Panel"
        print_status "UFW firewall rule added for port $KPANEL_PORT"
        
    # Check if firewall-cmd is available (CentOS/RHEL)
    elif command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --permanent --add-port="$KPANEL_PORT/tcp"
        firewall-cmd --reload
        print_status "Firewalld rule added for port $KPANEL_PORT"
        
    # Check if iptables is available
    elif command -v iptables >/dev/null 2>&1; then
        iptables -I INPUT -p tcp --dport "$KPANEL_PORT" -j ACCEPT
        # Try to save iptables rules
        if command -v iptables-save >/dev/null 2>&1; then
            iptables-save > /etc/iptables/rules.v4 2>/dev/null || true
        fi
        print_status "Iptables rule added for port $KPANEL_PORT"
    else
        print_warning "No firewall detected. Please manually open port $KPANEL_PORT"
    fi
}

# Start KPanel service
start_kpanel() {
    print_status "Starting KPanel service..."
    
    systemctl start "$KPANEL_SERVICE"
    
    # Wait a moment for the service to start
    sleep 3
    
    if systemctl is-active --quiet "$KPANEL_SERVICE"; then
        print_status "KPanel service started successfully"
    else
        print_error "Failed to start KPanel service"
        print_error "Check logs with: journalctl -u $KPANEL_SERVICE"
        exit 1
    fi
}

# Display installation summary
display_summary() {
    echo -e "${GREEN}"
    echo "======================================"
    echo "  KPanel Installation Completed!"
    echo "======================================"
    echo -e "${NC}"
    
    echo -e "${BLUE}Access Information:${NC}"
    echo "Control Panel: http://$PUBLIC_IP:$KPANEL_PORT"
    echo "Local Access: http://$LOCAL_IP:$KPANEL_PORT"
    echo ""
    
    # Read admin credentials from setup.txt
    if [[ -f "$KPANEL_CONF_DIR/setup.txt" ]]; then
        ADMIN_USER=$(grep "Username:" "$KPANEL_CONF_DIR/setup.txt" | cut -d' ' -f2)
        ADMIN_PASS=$(grep "Password:" "$KPANEL_CONF_DIR/setup.txt" | cut -d' ' -f2)
        
        echo -e "${BLUE}Administrator Login:${NC}"
        echo "Username: $ADMIN_USER"
        echo "Password: $ADMIN_PASS"
        echo ""
        
        echo -e "${YELLOW}Direct Login URL:${NC}"
        echo "http://$PUBLIC_IP:$KPANEL_PORT/?auto_login=true"
        echo ""
    fi
    
    echo -e "${BLUE}Service Management:${NC}"
    echo "Start:   systemctl start $KPANEL_SERVICE"
    echo "Stop:    systemctl stop $KPANEL_SERVICE"
    echo "Restart: systemctl restart $KPANEL_SERVICE"
    echo "Status:  systemctl status $KPANEL_SERVICE"
    echo "Logs:    journalctl -u $KPANEL_SERVICE -f"
    echo ""
    
    echo -e "${BLUE}Configuration Files:${NC}"
    echo "Main Config: $KPANEL_CONF_DIR/kpanel.conf"
    echo "Setup Info:  $KPANEL_CONF_DIR/setup.txt"
    echo "Environment: $KPANEL_DIR/.env"
    echo ""
    
    echo -e "${GREEN}Installation completed successfully!${NC}"
    echo -e "${YELLOW}Please save the administrator credentials in a secure location.${NC}"
    echo ""
    echo "For support and documentation, visit:"
    echo "https://github.com/herfaaljihad/kpanel"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up temporary files..."
    rm -rf /tmp/kpanel-source
}

# Main installation function
main() {
    print_header
    
    # Trap cleanup function
    trap cleanup EXIT
    
    # Installation steps
    check_root
    detect_system
    check_requirements
    install_dependencies
    create_user
    install_kpanel
    configure_kpanel
    setup_database
    create_service
    configure_firewall
    start_kpanel
    display_summary
    
    print_status "KPanel installation completed successfully!"
}

# Run main function
main "$@"