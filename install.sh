#!/bin/bash#!/bin/bash#!/bin/bash#!/bin/bash#!/bin/bash#!/bin/bash



# KPanel Auto Installer

# Usage: curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install.sh | sudo bash

# KPanel Installation Script

set -e

# Usage: curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install.sh | sudo bash

echo "╔══════════════════════════════════════════════════════════════╗"

echo "║                     KPanel Installer                        ║"# KPanel Installation Script for Ubuntu/Debian

echo "║              Web-based Server Control Panel                 ║"

echo "╚══════════════════════════════════════════════════════════════╝"set -e

echo ""

# Usage: curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install.sh | sudo bash

# Check root

if [[ $EUID -ne 0 ]]; then# Colors

   echo "ERROR: This script must be run as root (use sudo)"

   exit 1RED='\033[0;31m'# KPanel Installation Script for Ubuntu/Debian

fi

GREEN='\033[0;32m'

# Detect OS

if [ -f /etc/os-release ]; thenYELLOW='\033[1;33m'set -e

    . /etc/os-release

    OS=$NAMEBLUE='\033[0;34m'

    VER=$VERSION_ID

elseNC='\033[0m'# Similar to HestiaCP installation approach

    echo "ERROR: Cannot detect operating system"

    exit 1

fi

# Configuration# Configuration

echo "Detected OS: $OS $VER"

echo ""KPANEL_USER="kpanel"



# Route to appropriate installerKPANEL_DIR="/opt/kpanel"KPANEL_USER="kpanel"# Usage: curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install.sh | sudo bash# KPanel Installation Script for Ubuntu/Debian# KPanel Ubuntu Installer with Automatic IP Detection

case $OS in

    "Ubuntu"|"Debian GNU/Linux")KPANEL_PORT="3001"

        echo "Using Ubuntu/Debian installer..."

        curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install-ubuntu.sh | bashNODE_VERSION="20"KPANEL_DIR="/opt/kpanel"

        ;;

    "CentOS Linux"|"Rocky Linux"|"AlmaLinux"|"Red Hat Enterprise Linux")

        echo "Using CentOS/RHEL installer..."

        curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install-centos.sh | bashprint_status() {KPANEL_PORT="3001"

        ;;

    *)    echo -e "${GREEN}[INFO]${NC} $1"

        echo "WARNING: Unsupported OS detected. Trying Ubuntu installer..."

        curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install-ubuntu.sh | bash}NODE_VERSION="20"

        ;;

esac

print_error() {set -e# Similar to HestiaCP installation approach# This script installs KPanel on Ubuntu and automatically detects the server's public IP

    echo -e "${RED}[ERROR]${NC} $1"

    exit 1# Colors

}

RED='\033[0;31m'

print_header() {

    echo -e "${BLUE}"GREEN='\033[0;32m'

    echo "╔══════════════════════════════════════════════════════════════╗"

    echo "║                     KPanel Installer                        ║"YELLOW='\033[1;33m'# Colors for output# Usage: curl -fsSL https://raw.githubusercontent.com/kreasianakgemilang/kpanel/main/install.sh | sudo bash

    echo "║              Web-based Server Control Panel                 ║"

    echo "╚══════════════════════════════════════════════════════════════╝"BLUE='\033[0;34m'

    echo -e "${NC}"

}NC='\033[0m'RED='\033[0;31m'



# Check if running as root

check_root() {

    if [[ $EUID -ne 0 ]]; thenprint_header() {GREEN='\033[0;32m'set -e

        print_error "This script must be run as root (use sudo)"

    fi    echo -e "${BLUE}"

}

    echo "╔══════════════════════════════════════════════════════════════╗"YELLOW='\033[1;33m'

# Install system dependencies

install_dependencies() {    echo "║                     KPanel Installer                        ║"

    print_status "Installing system dependencies..."

        echo "║              Web-based Server Control Panel                 ║"BLUE='\033[0;34m'set -e

    apt-get update -y

    apt-get install -y curl wget git build-essential python3 sqlite3 nginx ufw    echo "╚══════════════════════════════════════════════════════════════╝"

    

    print_status "System dependencies installed"    echo -e "${NC}"NC='\033[0m' # No Color

}

}

# Install Node.js

install_nodejs() {# Color codes for output

    print_status "Installing Node.js ${NODE_VERSION}..."

    print_status() {

    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -

    apt-get install -y nodejs    echo -e "${GREEN}[INFO]${NC} $1"# Configuration

    

    NODE_VER=$(node --version)}

    print_status "Node.js ${NODE_VER} installed"

}KPANEL_USER="kpanel"# Colors for outputRED='\033[0;31m'



# Create kpanel userprint_warning() {

create_user() {

    print_status "Creating kpanel user..."    echo -e "${YELLOW}[WARNING]${NC} $1"KPANEL_DIR="/opt/kpanel"

    

    if ! id "$KPANEL_USER" >/dev/null 2>&1; then}

        useradd -r -m -s /bin/bash "$KPANEL_USER"

        print_status "User $KPANEL_USER created"KPANEL_PORT="3001"RED='\033[0;31m'GREEN='\033[0;32m'

    else

        print_status "User $KPANEL_USER already exists"print_error() {

    fi

}    echo -e "${RED}[ERROR]${NC} $1"NODE_VERSION="20"



# Download and install KPanel    exit 1

install_kpanel() {

    print_status "Downloading KPanel..."}GREEN='\033[0;32m'YELLOW='\033[1;33m'

    

    mkdir -p "$KPANEL_DIR"

    cd "$KPANEL_DIR"

    check_root() {# Functions

    git clone https://github.com/kreasianakgemilang/kpanel.git .

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR"    if [[ $EUID -ne 0 ]]; then

    

    print_status "Installing KPanel dependencies..."        print_error "This script must be run as root (use sudo)"print_header() {YELLOW='\033[1;33m'BLUE='\033[0;34m'

    sudo -u "$KPANEL_USER" npm install --production

}    fi



# Configure KPanel}    echo -e "${BLUE}"

configure_kpanel() {

    print_status "Configuring KPanel..."

    

    cd "$KPANEL_DIR"detect_os() {    echo "╔══════════════════════════════════════════════════════════════╗"BLUE='\033[0;34m'NC='\033[0m' # No Color

    

    if [[ ! -f .env ]]; then    print_status "Detecting operating system..."

        cp .env.example .env

                echo "║                     KPanel Installer                        ║"

        # Generate JWT secret

        JWT_SECRET=$(openssl rand -hex 32)    if [[ -f /etc/os-release ]]; then

        sed -i "s/your-super-secure-64-character-jwt-secret-key-here-change-this/$JWT_SECRET/g" .env

                . /etc/os-release    echo "║              Web-based Server Control Panel                 ║"NC='\033[0m' # No Color

        chown "$KPANEL_USER:$KPANEL_USER" .env

        chmod 600 .env        OS=$NAME

    fi

            VER=$VERSION_ID    echo "╚══════════════════════════════════════════════════════════════╝"

    mkdir -p "$KPANEL_DIR/database" "$KPANEL_DIR/logs"

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR/database" "$KPANEL_DIR/logs"        print_status "Detected: $OS $VER"

}

    else    echo -e "${NC}"echo -e "${GREEN}🚀 KPanel Ubuntu Installer${NC}"

# Setup systemd service

setup_service() {        print_error "Cannot detect operating system"

    print_status "Setting up systemd service..."

        fi}

    cat > /etc/systemd/system/kpanel.service << 'EOF'

[Unit]}

Description=KPanel Control Panel

After=network.target# Configurationecho -e "${BLUE}=================================${NC}"



[Service]check_requirements() {

Type=simple

Restart=always    print_status "Checking system requirements..."print_status() {

User=kpanel

ExecStart=/usr/bin/node /opt/kpanel/production-server.js    

WorkingDirectory=/opt/kpanel

Environment=NODE_ENV=production    # Memory check    echo -e "${GREEN}[INFO]${NC} $1"KPANEL_USER="kpanel"



[Install]    MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')

WantedBy=multi-user.target

EOF    if [[ $MEMORY -lt 1 ]]; then}



    systemctl daemon-reload        print_error "Minimum 1GB RAM required. Current: ${MEMORY}GB"

    systemctl enable kpanel

}    fiKPANEL_DIR="/opt/kpanel"# Function to detect public IP



# Setup Nginx reverse proxy    print_status "Memory: ${MEMORY}GB (OK)"

setup_nginx() {

    print_status "Configuring Nginx..."    print_warning() {

    

    cat > /etc/nginx/sites-available/kpanel << 'EOF'    # Disk space check  

server {

    listen 80;    DISK=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')    echo -e "${YELLOW}[WARNING]${NC} $1"KPANEL_PORT="3001"detect_public_ip() {

    server_name _;

        if [[ $DISK -lt 2 ]]; then

    location / {

        proxy_pass http://127.0.0.1:3001;        print_error "Minimum 2GB free disk space required. Available: ${DISK}GB"}

        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;    fi

        proxy_set_header Connection 'upgrade';

        proxy_set_header Host $host;    print_status "Disk space: ${DISK}GB available (OK)"NODE_VERSION="20"    local public_ip="localhost"

        proxy_set_header X-Real-IP $remote_addr;

        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;}

        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;print_error() {

    }

}install_nodejs() {

EOF

    print_status "Installing Node.js $NODE_VERSION..."    echo -e "${RED}[ERROR]${NC} $1"    

    ln -sf /etc/nginx/sites-available/kpanel /etc/nginx/sites-enabled/

    rm -f /etc/nginx/sites-enabled/default    

    

    nginx -t    # Remove existing Node.js    exit 1

    systemctl restart nginx

    systemctl enable nginx    apt-get remove -y nodejs npm 2>/dev/null || true

}

    }# Functions    # Try multiple methods to get public IP (silently)

# Setup firewall

setup_firewall() {    # Install NodeSource repository

    print_status "Configuring firewall..."

        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -

    ufw --force enable

    ufw allow ssh    apt-get install -y nodejs

    ufw allow 80/tcp

    ufw allow 443/tcp    check_root() {print_header() {    if command -v curl &> /dev/null; then

}

    # Verify

# Start KPanel service

start_kpanel() {    NODE_VER=$(node --version)    if [[ $EUID -ne 0 ]]; then

    print_status "Starting KPanel..."

        NPM_VER=$(npm --version)

    systemctl start kpanel

    sleep 5    print_status "Node.js $NODE_VER and npm $NPM_VER installed"        print_error "This script must be run as root (use sudo)"    echo -e "${BLUE}"        # Try ifconfig.me first

    

    if systemctl is-active --quiet kpanel; then}

        print_status "KPanel started successfully"

    else    fi

        print_error "Failed to start KPanel"

    fiinstall_dependencies() {

}

    print_status "Installing system dependencies..."}    echo "╔══════════════════════════════════════════════════════════════╗"        public_ip=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || echo "")

# Show completion message

show_completion() {    

    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

        apt-get update

    echo -e "${GREEN}"

    echo "╔══════════════════════════════════════════════════════════════╗"    apt-get install -y curl wget git unzip build-essential python3 sqlite3 nginx ufw

    echo "║                 KPanel Installation Complete!               ║"

    echo "╚══════════════════════════════════════════════════════════════╝"    detect_os() {    echo "║                     KPanel Installer                        ║"        

    echo -e "${NC}"

    echo ""    print_status "System dependencies installed"

    echo -e "${BLUE}🌐 Access KPanel:${NC}"

    echo "   Web Interface: http://$SERVER_IP"}    print_status "Detecting operating system..."

    echo ""

    echo -e "${BLUE}📋 Service Management:${NC}"

    echo "   systemctl start kpanel"

    echo "   systemctl stop kpanel"create_user() {        echo "║              Web-based Server Control Panel                 ║"        # Try ipinfo.io as fallback

    echo "   systemctl restart kpanel"

    echo "   systemctl status kpanel"    print_status "Creating KPanel user..."

    echo ""

    echo -e "${BLUE}📂 Configuration:${NC}"        if [[ -f /etc/os-release ]]; then

    echo "   Directory: $KPANEL_DIR"

    echo "   Config:    $KPANEL_DIR/.env"    if ! id "$KPANEL_USER" &>/dev/null; then

    echo "   Logs:      journalctl -u kpanel -f"

    echo ""        useradd -r -m -s /bin/bash "$KPANEL_USER"        . /etc/os-release    echo "╚══════════════════════════════════════════════════════════════╝"        if [ -z "$public_ip" ]; then

    echo -e "${GREEN}✅ KPanel is ready to use!${NC}"

}        print_status "User $KPANEL_USER created"



# Main installation process    else        OS=$NAME

main() {

    print_header        print_status "User $KPANEL_USER already exists"

    check_root

    install_dependencies    fi        VER=$VERSION_ID    echo -e "${NC}"            public_ip=$(curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null || echo "")

    install_nodejs

    create_user}

    install_kpanel

    configure_kpanel        print_status "Detected: $OS $VER"

    setup_service

    setup_nginxdownload_kpanel() {

    setup_firewall

    start_kpanel    print_status "Downloading KPanel..."    else}        fi

    show_completion

}    



# Run installation    mkdir -p "$KPANEL_DIR"        print_error "Cannot detect operating system"

main "$@"
    cd "$KPANEL_DIR"

        fi        

    git clone https://github.com/kreasianakgemilang/kpanel.git .

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR"    

    

    print_status "KPanel downloaded to $KPANEL_DIR"    # Check if supportedprint_status() {        # Try icanhazip.com as another fallback

}

    case $OS in

install_kpanel() {

    print_status "Installing KPanel dependencies..."        "Ubuntu"|"Debian GNU/Linux"|"CentOS Linux"|"Rocky Linux"|"AlmaLinux")    echo -e "${GREEN}[INFO]${NC} $1"        if [ -z "$public_ip" ]; then

    

    cd "$KPANEL_DIR"            print_status "Operating system is supported"

    sudo -u "$KPANEL_USER" npm install --production

                ;;}            public_ip=$(curl -s --connect-timeout 5 icanhazip.com 2>/dev/null || echo "")

    if [[ -d "client" ]]; then

        sudo -u "$KPANEL_USER" npm run build 2>/dev/null || true        *)

    fi

                print_warning "Operating system may not be fully supported"        fi

    print_status "KPanel dependencies installed"

}            ;;



configure_kpanel() {    esacprint_warning() {    fi

    print_status "Configuring KPanel..."

    }

    cd "$KPANEL_DIR"

        echo -e "${YELLOW}[WARNING]${NC} $1"    

    if [[ ! -f .env ]]; then

        cp .env.example .envcheck_system_requirements() {

        

        # Generate JWT secret    print_status "Checking system requirements..."}    # If external IP detection fails, try to get local network IP

        JWT_SECRET=$(openssl rand -hex 32)

        sed -i "s/your-super-secure-64-character-jwt-secret-key-here-change-this/$JWT_SECRET/g" .env    

        sed -i "s/PORT=3001/PORT=$KPANEL_PORT/g" .env

        sed -i "s/NODE_ENV=development/NODE_ENV=production/g" .env    # Check memory    if [ -z "$public_ip" ] || [ "$public_ip" = "" ]; then

        

        chown "$KPANEL_USER:$KPANEL_USER" .env    MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')

        chmod 600 .env

    fi    if [[ $MEMORY -lt 1 ]]; thenprint_error() {        if command -v ip &> /dev/null; then

    

    mkdir -p "$KPANEL_DIR/database" "$KPANEL_DIR/logs"        print_error "Minimum 1GB RAM required. Current: ${MEMORY}GB"

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR/database" "$KPANEL_DIR/logs"

        fi    echo -e "${RED}[ERROR]${NC} $1"            public_ip=$(ip route get 8.8.8.8 | awk '{print $7}' | head -n1 2>/dev/null || echo "localhost")

    print_status "KPanel configuration completed"

}    print_status "Memory: ${MEMORY}GB (OK)"



setup_systemd() {        exit 1        elif command -v hostname &> /dev/null; then

    print_status "Setting up systemd service..."

        # Check disk space

    cat > /etc/systemd/system/kpanel.service << EOF

[Unit]    DISK=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')}            public_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

Description=KPanel Web Control Panel

After=network.target    if [[ $DISK -lt 2 ]]; then



[Service]        print_error "Minimum 2GB free disk space required. Available: ${DISK}GB"        else

Type=simple

Restart=always    fi

RestartSec=1

User=$KPANEL_USER    print_status "Disk space: ${DISK}GB available (OK)"check_root() {            public_ip="localhost"

ExecStart=/usr/bin/node $KPANEL_DIR/production-server.js

WorkingDirectory=$KPANEL_DIR}

Environment=NODE_ENV=production

    if [[ $EUID -ne 0 ]]; then        fi

[Install]

WantedBy=multi-user.targetinstall_nodejs() {

EOF

    print_status "Installing Node.js $NODE_VERSION..."        print_error "This script must be run as root (use sudo)"    fi

    systemctl daemon-reload

    systemctl enable kpanel    

    

    print_status "Systemd service configured"    # Remove existing Node.js    fi    

}

    apt-get remove -y nodejs npm 2>/dev/null || true

setup_nginx() {

    print_status "Configuring Nginx..."    }    echo "$public_ip"

    

    cat > /etc/nginx/sites-available/kpanel << EOF    # Install NodeSource repository

server {

    listen 80;    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -}

    server_name _;

        apt-get install -y nodejs

    location / {

        proxy_pass http://127.0.0.1:$KPANEL_PORT;    detect_os() {

        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;    # Verify installation

        proxy_set_header Connection 'upgrade';

        proxy_set_header Host \$host;    NODE_VER=$(node --version)    print_status "Detecting operating system..."# Create swap file if needed (for low memory VPS)

        proxy_set_header X-Real-IP \$remote_addr;

        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;    NPM_VER=$(npm --version)

        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_cache_bypass \$http_upgrade;    print_status "Node.js $NODE_VER and npm $NPM_VER installed"    create_swap_if_needed() {

    }

}}

EOF

    if [[ -f /etc/os-release ]]; then    echo -e "${YELLOW}💾 Checking swap configuration...${NC}"

    ln -sf /etc/nginx/sites-available/kpanel /etc/nginx/sites-enabled/

    rm -f /etc/nginx/sites-enabled/defaultinstall_dependencies() {

    

    nginx -t    print_status "Installing system dependencies..."        . /etc/os-release    

    systemctl restart nginx

    systemctl enable nginx    

    

    print_status "Nginx configured"    # Update package list        OS=$NAME    # Check if swap already exists

}

    apt-get update

setup_firewall() {

    print_status "Configuring firewall..."            VER=$VERSION_ID    local swap_status

    

    ufw --force enable    # Install required packages

    ufw allow ssh

    ufw allow 80/tcp    apt-get install -y \        print_status "Detected: $OS $VER"    swap_status=$(swapon --show 2>/dev/null | wc -l)

    ufw allow 443/tcp

    ufw allow "$KPANEL_PORT/tcp"        curl \

    

    print_status "Firewall configured"        wget \    else    

}

        git \

start_kpanel() {

    print_status "Starting KPanel..."        unzip \        print_error "Cannot detect operating system"    if [ "$swap_status" -gt 0 ]; then

    

    systemctl start kpanel        build-essential \

    sleep 5

            python3 \    fi        echo -e "${GREEN}✅ Swap already configured${NC}"

    if systemctl is-active --quiet kpanel; then

        print_status "KPanel service started successfully"        python3-pip \

    else

        print_error "Failed to start KPanel service"        sqlite3 \            swapon --show

    fi

}        nginx \



print_completion() {        ufw \    # Check if supported        return 0

    IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

            supervisor \

    echo -e "${GREEN}"

    echo "╔══════════════════════════════════════════════════════════════╗"        logrotate    case $OS in    fi

    echo "║                 KPanel Installation Complete!               ║"

    echo "╚══════════════════════════════════════════════════════════════╝"        

    echo -e "${NC}"

    echo ""    print_status "System dependencies installed"        "Ubuntu"|"Debian GNU/Linux"|"CentOS Linux"|"Rocky Linux"|"AlmaLinux")    

    echo -e "${BLUE}Access KPanel:${NC}"

    echo "  Web Interface: http://$IP"}

    echo "  Direct Access: http://$IP:$KPANEL_PORT"

    echo ""            print_status "Operating system is supported"    # Check available disk space

    echo -e "${BLUE}Service Management:${NC}"

    echo "  Start:   systemctl start kpanel"create_user() {

    echo "  Stop:    systemctl stop kpanel"

    echo "  Restart: systemctl restart kpanel"    print_status "Creating KPanel user..."            ;;    local available_disk

    echo "  Status:  systemctl status kpanel"

    echo ""    

    echo -e "${BLUE}Configuration:${NC}"

    echo "  Directory: $KPANEL_DIR"    if ! id "$KPANEL_USER" &>/dev/null; then        *)    available_disk=$(df / | awk 'NR==2 {printf "%.0f", $4/1024}')

    echo "  Config:    $KPANEL_DIR/.env"

    echo "  Logs:      journalctl -u kpanel -f"        useradd -r -m -s /bin/bash "$KPANEL_USER"

    echo ""

    echo -e "${YELLOW}Next Steps:${NC}"        print_status "User $KPANEL_USER created"            print_warning "Operating system may not be fully supported"    

    echo "1. Navigate to the web interface"

    echo "2. Complete the initial setup wizard"      else

    echo "3. Create your admin account"

    echo "4. Configure SSL certificate (recommended)"        print_status "User $KPANEL_USER already exists"            ;;    if [ "$available_disk" -lt 2048 ]; then

    echo ""

    echo -e "${GREEN}Installation completed successfully!${NC}"    fi

}

}    esac        echo -e "${YELLOW}⚠️ Insufficient disk space for swap file${NC}"

# Main installation

main() {

    print_header

    check_rootdownload_kpanel() {}        return 1

    detect_os

    check_requirements    print_status "Downloading KPanel..."

    install_dependencies

    install_nodejs        fi

    create_user

    download_kpanel    # Create directory

    install_kpanel

    configure_kpanel    mkdir -p "$KPANEL_DIR"check_system_requirements() {    

    setup_systemd

    setup_nginx    cd "$KPANEL_DIR"

    setup_firewall

    start_kpanel        print_status "Checking system requirements..."    echo -e "${YELLOW}📁 Creating 1GB swap file...${NC}"

    print_completion

}    # Clone repository



main "$@"    git clone https://github.com/kreasianakgemilang/kpanel.git .        

    

    # Set ownership    # Check memory    # Create swap file

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR"

        MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $2/1024}')    if fallocate -l 1G /swapfile; then

    print_status "KPanel downloaded to $KPANEL_DIR"

}    if [[ $MEMORY -lt 1 ]]; then        chmod 600 /swapfile



install_kpanel() {        print_error "Minimum 1GB RAM required. Current: ${MEMORY}GB"        mkswap /swapfile

    print_status "Installing KPanel dependencies..."

        fi        swapon /swapfile

    cd "$KPANEL_DIR"

        print_status "Memory: ${MEMORY}GB (OK)"        

    # Install npm dependencies as kpanel user

    sudo -u "$KPANEL_USER" npm install --production            # Make permanent

    

    # Build frontend if needed    # Check disk space        if ! grep -q "/swapfile" /etc/fstab; then

    if [[ -d "client" ]]; then

        sudo -u "$KPANEL_USER" npm run build 2>/dev/null || true    DISK=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')            echo '/swapfile none swap sw 0 0' >> /etc/fstab

    fi

        if [[ $DISK -lt 2 ]]; then        fi

    print_status "KPanel dependencies installed"

}        print_error "Minimum 2GB free disk space required. Available: ${DISK}GB"        



configure_kpanel() {    fi        # Optimize for low memory

    print_status "Configuring KPanel..."

        print_status "Disk space: ${DISK}GB available (OK)"        echo 'vm.swappiness=10' >> /etc/sysctl.conf

    cd "$KPANEL_DIR"

    }        sysctl vm.swappiness=10

    # Create .env from example

    if [[ ! -f .env ]]; then        

        cp .env.example .env

        install_nodejs() {        echo -e "${GREEN}✅ Swap file created and configured${NC}"

        # Generate JWT secret

        JWT_SECRET=$(openssl rand -hex 32)    print_status "Installing Node.js $NODE_VERSION..."        free -h

        sed -i "s/your-super-secure-64-character-jwt-secret-key-here-change-this/$JWT_SECRET/g" .env

                else

        # Set port

        sed -i "s/PORT=3001/PORT=$KPANEL_PORT/g" .env    # Remove existing Node.js        echo -e "${RED}❌ Failed to create swap file${NC}"

        

        # Set production environment    apt-get remove -y nodejs npm 2>/dev/null || true        return 1

        sed -i "s/NODE_ENV=development/NODE_ENV=production/g" .env

                fi

        chown "$KPANEL_USER:$KPANEL_USER" .env

        chmod 600 .env    # Install NodeSource repository}

    fi

        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -

    # Create database directory

    mkdir -p "$KPANEL_DIR/database"    apt-get install -y nodejs# Create fallback frontend if build fails

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR/database"

        create_fallback_frontend() {

    # Create logs directory

    mkdir -p "$KPANEL_DIR/logs"    # Verify installation    echo -e "${YELLOW}🔧 Creating minimal frontend fallback...${NC}"

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR/logs"

        NODE_VER=$(node --version)    

    print_status "KPanel configuration completed"

}    NPM_VER=$(npm --version)    mkdir -p dist/assets



setup_systemd() {    print_status "Node.js $NODE_VER and npm $NPM_VER installed"    

    print_status "Setting up systemd service..."

    }    # Create minimal index.html

    cat > /etc/systemd/system/kpanel.service << EOF

[Unit]    cat > dist/index.html << 'EOF'

Description=KPanel Web Control Panel

After=network.targetinstall_dependencies() {<!DOCTYPE html>

StartLimitIntervalSec=0

    print_status "Installing system dependencies..."<html lang="en">

[Service]

Type=simple    <head>

Restart=always

RestartSec=1    # Update package list    <meta charset="UTF-8">

User=$KPANEL_USER

ExecStart=/usr/bin/node $KPANEL_DIR/production-server.js    apt-get update    <meta name="viewport" content="width=device-width, initial-scale=1.0">

WorkingDirectory=$KPANEL_DIR

Environment=NODE_ENV=production        <title>KPanel - Loading...</title>



[Install]    # Install required packages    <style>

WantedBy=multi-user.target

EOF    apt-get install -y \        body { 



    # Reload systemd and enable service        curl \            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

    systemctl daemon-reload

    systemctl enable kpanel        wget \            margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

    

    print_status "Systemd service configured"        git \            display: flex; justify-content: center; align-items: center; min-height: 100vh;

}

        unzip \        }

setup_nginx() {

    print_status "Configuring Nginx reverse proxy..."        build-essential \        .container { 

    

    cat > /etc/nginx/sites-available/kpanel << EOF        python3 \            text-align: center; background: rgba(255,255,255,0.95); 

server {

    listen 80;        python3-pip \            padding: 2rem; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);

    server_name _;

            sqlite3 \            max-width: 500px; margin: 20px;

    location / {

        proxy_pass http://127.0.0.1:$KPANEL_PORT;        nginx \        }

        proxy_http_version 1.1;

        proxy_set_header Upgrade \$http_upgrade;        ufw \        .spinner { 

        proxy_set_header Connection 'upgrade';

        proxy_set_header Host \$host;        supervisor \            width: 60px; height: 60px; margin: 0 auto 20px; 

        proxy_set_header X-Real-IP \$remote_addr;

        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;        logrotate            border: 4px solid #f3f3f3; border-top: 4px solid #667eea;

        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_cache_bypass \$http_upgrade;                    border-radius: 50%; animation: spin 1s linear infinite;

    }

}    print_status "System dependencies installed"        }

EOF

}        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

    # Enable site

    ln -sf /etc/nginx/sites-available/kpanel /etc/nginx/sites-enabled/        h1 { color: #333; margin-bottom: 10px; }

    rm -f /etc/nginx/sites-enabled/default

    create_user() {        .status { color: #666; margin: 20px 0; }

    # Test and reload nginx

    nginx -t    print_status "Creating KPanel user..."        .progress { width: 100%; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }

    systemctl restart nginx

    systemctl enable nginx            .progress-bar { width: 0; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); animation: progress 3s ease-in-out infinite; }

    

    print_status "Nginx configured"    if ! id "$KPANEL_USER" &>/dev/null; then        @keyframes progress { 0% { width: 0; } 50% { width: 70%; } 100% { width: 100%; } }

}

        useradd -r -m -s /bin/bash "$KPANEL_USER"        .info { background: #e8f2ff; padding: 15px; border-radius: 10px; margin: 20px 0; }

setup_firewall() {

    print_status "Configuring firewall..."        print_status "User $KPANEL_USER created"    </style>

    

    # Enable UFW    else    <script>

    ufw --force enable

            print_status "User $KPANEL_USER already exists"        setTimeout(function() {

    # Allow SSH

    ufw allow ssh    fi            fetch('/api/health').then(r => r.json()).then(data => {

    

    # Allow HTTP/HTTPS}                if (data.status === 'ok') {

    ufw allow 80/tcp

    ufw allow 443/tcp                    document.querySelector('.status').textContent = 'KPanel Backend Ready - Initializing Dashboard...';

    

    # Allow KPanel port (if not using nginx)download_kpanel() {                    setTimeout(() => window.location.reload(), 2000);

    ufw allow "$KPANEL_PORT/tcp"

        print_status "Downloading KPanel..."                }

    print_status "Firewall configured"

}                }).catch(() => {



start_kpanel() {    # Create directory                document.querySelector('.status').textContent = 'Connecting to KPanel Server...';

    print_status "Starting KPanel..."

        mkdir -p "$KPANEL_DIR"                setTimeout(() => window.location.reload(), 5000);

    # Start KPanel service

    systemctl start kpanel    cd "$KPANEL_DIR"            });

    

    # Wait for service to start            }, 2000);

    sleep 5

        # Clone repository    </script>

    # Check if service is running

    if systemctl is-active --quiet kpanel; then    git clone https://github.com/kreasianakgemilang/kpanel.git .</head>

        print_status "KPanel service started successfully"

    else    <body>

        print_error "Failed to start KPanel service"

    fi    # Set ownership    <div class="container">

}

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR"        <div class="spinner"></div>

print_completion() {

    IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")            <h1>🎛️ KPanel</h1>

    

    echo -e "${GREEN}"    print_status "KPanel downloaded to $KPANEL_DIR"        <p class="status">Building dashboard components...</p>

    echo "╔══════════════════════════════════════════════════════════════╗"

    echo "║                 KPanel Installation Complete!               ║"}        <div class="progress"><div class="progress-bar"></div></div>

    echo "╚══════════════════════════════════════════════════════════════╝"

    echo -e "${NC}"        <div class="info">

    echo ""

    echo -e "${BLUE}Access KPanel:${NC}"install_kpanel() {            <strong>🚀 Modern Hosting Control Panel</strong><br>

    echo "  Web Interface: http://$IP"

    echo "  Direct Access: http://$IP:$KPANEL_PORT"    print_status "Installing KPanel dependencies..."            Your dashboard is being prepared for optimal performance.

    echo ""

    echo -e "${BLUE}Service Management:${NC}"            </div>

    echo "  Start:   systemctl start kpanel"

    echo "  Stop:    systemctl stop kpanel"    cd "$KPANEL_DIR"        <p style="color: #888; font-size: 0.9rem; margin-top: 20px;">

    echo "  Restart: systemctl restart kpanel"

    echo "  Status:  systemctl status kpanel"                Version 2.0.0 | Optimized for VPS deployment

    echo ""

    echo -e "${BLUE}Configuration:${NC}"    # Install npm dependencies as kpanel user        </p>

    echo "  Directory: $KPANEL_DIR"

    echo "  Config:    $KPANEL_DIR/.env"    sudo -u "$KPANEL_USER" npm install --production    </div>

    echo "  Logs:      journalctl -u kpanel -f"

    echo ""    </body>

    echo -e "${YELLOW}Next Steps:${NC}"

    echo "1. Navigate to the web interface"    # Build frontend if needed</html>

    echo "2. Complete the initial setup wizard"

    echo "3. Create your admin account"    if [[ -d "client" ]]; thenEOF

    echo "4. Configure SSL certificate (recommended)"

    echo ""        sudo -u "$KPANEL_USER" npm run build 2>/dev/null || true    

    echo -e "${GREEN}Installation completed successfully!${NC}"

}    fi    echo -e "${GREEN}✅ Fallback frontend created${NC}"



# Main installation process    }

main() {

    print_header    print_status "KPanel dependencies installed"

    check_root

    detect_os}# Update system

    check_system_requirements

    install_dependenciesecho -e "${YELLOW}📦 Updating system packages...${NC}"

    install_nodejs

    create_userconfigure_kpanel() {apt update -y

    download_kpanel

    install_kpanel    print_status "Configuring KPanel..."

    configure_kpanel

    setup_systemd    # Install required packages

    setup_nginx

    setup_firewall    cd "$KPANEL_DIR"echo -e "${YELLOW}📦 Installing required packages...${NC}"

    start_kpanel

    print_completion    apt install -y curl git build-essential

}

    # Create .env from example

# Run main function

main "$@"    if [[ ! -f .env ]]; then# Install Node.js via NodeSource

        cp .env.example .envecho -e "${YELLOW}📦 Installing Node.js 18...${NC}"

        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

        # Generate JWT secretapt install -y nodejs

        JWT_SECRET=$(openssl rand -hex 32)

        sed -i "s/your-super-secure-64-character-jwt-secret-key-here-change-this/$JWT_SECRET/g" .env# Verify Node.js installation

        echo -e "${YELLOW}✅ Verifying Node.js installation...${NC}"

        # Set portnode_version=$(node --version)

        sed -i "s/PORT=3001/PORT=$KPANEL_PORT/g" .envnpm_version=$(npm --version)

        echo -e "${GREEN}Node.js: $node_version${NC}"

        # Set production environmentecho -e "${GREEN}NPM: $npm_version${NC}"

        sed -i "s/NODE_ENV=development/NODE_ENV=production/g" .env

        # Install PM2 globally

        chown "$KPANEL_USER:$KPANEL_USER" .envecho -e "${YELLOW}📦 Installing PM2 process manager...${NC}"

        chmod 600 .envnpm install -g pm2

    fi

    # Clone KPanel repository

    # Create database directoryecho -e "${YELLOW}📦 Cloning KPanel repository...${NC}"

    mkdir -p "$KPANEL_DIR/database"if [ -d "kpanel" ]; then

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR/database"    echo -e "${YELLOW}⚠️  KPanel directory exists, updating...${NC}"

        cd kpanel

    # Create logs directory    git pull origin main

    mkdir -p "$KPANEL_DIR/logs"else

    chown -R "$KPANEL_USER:$KPANEL_USER" "$KPANEL_DIR/logs"    git clone https://github.com/herfaaljihad/kpanel.git

        cd kpanel

    print_status "KPanel configuration completed"fi

}

# Install dependencies

setup_systemd() {echo -e "${YELLOW}📦 Installing KPanel dependencies...${NC}"

    print_status "Setting up systemd service..."npm install

    

    cat > /etc/systemd/system/kpanel.service << EOF# Setup database

[Unit]echo -e "${YELLOW}🗄️  Setting up KPanel database...${NC}"

Description=KPanel Web Control Panelnpm run setup

After=network.target

StartLimitIntervalSec=0# Build frontend with optimizations for low memory VPS

build_frontend() {

[Service]    echo -e "${YELLOW}🏗️  Building frontend with VPS optimization...${NC}"

Type=simple    

Restart=always    cd client || {

RestartSec=1        echo -e "${RED}❌ Failed to enter client directory${NC}"

User=$KPANEL_USER        return 1

ExecStart=/usr/bin/node $KPANEL_DIR/production-server.js    }

WorkingDirectory=$KPANEL_DIR    

Environment=NODE_ENV=production    # Check available memory

    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')

[Install]    echo -e "${BLUE}💾 Available Memory: ${available_memory}MB${NC}"

WantedBy=multi-user.target    

EOF    # Create swap if memory is low

    if [ "$available_memory" -lt 500 ]; then

    # Reload systemd and enable service        echo -e "${YELLOW}⚠️ Low memory detected, creating temporary swap...${NC}"

    systemctl daemon-reload        cd ..

    systemctl enable kpanel        create_swap_if_needed

            cd client || return 1

    print_status "Systemd service configured"    fi

}    

    # Set memory limits based on available memory

setup_nginx() {    if [ "$available_memory" -gt 1500 ]; then

    print_status "Configuring Nginx reverse proxy..."        export NODE_OPTIONS="--max-old-space-size=3072"

            BUILD_CMD="npm run build"

    cat > /etc/nginx/sites-available/kpanel << EOF    elif [ "$available_memory" -gt 800 ]; then

server {        export NODE_OPTIONS="--max-old-space-size=2048" 

    listen 80;        BUILD_CMD="npm run build:prod"

    server_name _;    else

            export NODE_OPTIONS="--max-old-space-size=1024"

    location / {        BUILD_CMD="npm run build:low-memory"

        proxy_pass http://127.0.0.1:$KPANEL_PORT;    fi

        proxy_http_version 1.1;    

        proxy_set_header Upgrade \$http_upgrade;    echo -e "${BLUE}🧠 Memory limit: ${NODE_OPTIONS}${NC}"

        proxy_set_header Connection 'upgrade';    echo -e "${BLUE}🔧 Build command: ${BUILD_CMD}${NC}"

        proxy_set_header Host \$host;    

        proxy_set_header X-Real-IP \$remote_addr;    # Try building with retries

        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;    BUILD_SUCCESS=false

        proxy_set_header X-Forwarded-Proto \$scheme;    for attempt in {1..3}; do

        proxy_cache_bypass \$http_upgrade;        echo -e "${YELLOW}📦 Build attempt $attempt/3...${NC}"

    }        

}        # Clear previous build

EOF        rm -rf dist

        

    # Enable site        if timeout 900s "$BUILD_CMD"; then

    ln -sf /etc/nginx/sites-available/kpanel /etc/nginx/sites-enabled/            echo -e "${GREEN}✅ Build completed successfully!${NC}"

    rm -f /etc/nginx/sites-enabled/default            BUILD_SUCCESS=true

                break

    # Test and reload nginx        else

    nginx -t            echo -e "${RED}❌ Build attempt $attempt failed${NC}"

    systemctl restart nginx            

    systemctl enable nginx            if [ "$attempt" -eq 1 ]; then

                    echo -e "${YELLOW}🔄 Trying with reduced memory...${NC}"

    print_status "Nginx configured"                export NODE_OPTIONS="--max-old-space-size=1024"

}                BUILD_CMD="npm run build:low-memory"

            elif [ "$attempt" -eq 2 ]; then

setup_firewall() {                echo -e "${YELLOW}🔄 Final attempt with minimal memory...${NC}"

    print_status "Configuring firewall..."                export NODE_OPTIONS="--max-old-space-size=768"

                    BUILD_CMD="npm run build:low-memory"

    # Enable UFW            fi

    ufw --force enable            

                if [ "$attempt" -lt 3 ]; then

    # Allow SSH                echo -e "${YELLOW}⏱️ Waiting 10 seconds before retry...${NC}"

    ufw allow ssh                sleep 10

                fi

    # Allow HTTP/HTTPS        fi

    ufw allow 80/tcp    done

    ufw allow 443/tcp    

        # Verify build output

    # Allow KPanel port (if not using nginx)    if [ "$BUILD_SUCCESS" = true ] && [ -d "dist" ] && [ -f "dist/index.html" ]; then

    ufw allow "$KPANEL_PORT/tcp"        # Check if we have proper assets

            if ls dist/assets/*.js >/dev/null 2>&1 && ls dist/assets/*.css >/dev/null 2>&1; then

    print_status "Firewall configured"            echo -e "${GREEN}✅ Frontend assets verified successfully!${NC}"

}            echo -e "${BLUE}📊 Build contents:${NC}"

            ls -la dist/

start_kpanel() {            ls -la dist/assets/ 2>/dev/null || echo "No assets directory"

    print_status "Starting KPanel..."        else

                echo -e "${YELLOW}⚠️ Build completed but assets missing, trying fallback...${NC}"

    # Start KPanel service            create_fallback_frontend

    systemctl start kpanel        fi

        else

    # Wait for service to start        echo -e "${RED}❌ All build attempts failed${NC}"

    sleep 5        echo -e "${YELLOW}🔧 Creating fallback frontend...${NC}"

            create_fallback_frontend

    # Check if service is running    fi

    if systemctl is-active --quiet kpanel; then    

        print_status "KPanel service started successfully"    cd .. || return 1

    else}

        print_error "Failed to start KPanel service"

    fi# Fallback only if all attempts failed

}if [ "$BUILD_SUCCESS" = false ]; then

    echo -e "${RED}❌ All build attempts failed, creating minimal frontend...${NC}"

print_completion() {    mkdir -p dist

    IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")    cat > dist/index.html << EOF

    <!DOCTYPE html>

    echo -e "${GREEN}"<html lang="en">

    echo "╔══════════════════════════════════════════════════════════════╗"<head>

    echo "║                 KPanel Installation Complete!               ║"    <meta charset="UTF-8">

    echo "╚══════════════════════════════════════════════════════════════╝"    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    echo -e "${NC}"    <title>KPanel - Build Failed</title>

    echo ""    <style>

    echo -e "${BLUE}Access KPanel:${NC}"        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f5f5f5; }

    echo "  Web Interface: http://$IP"        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }

    echo "  Direct Access: http://$IP:$KPANEL_PORT"        .warning { color: #dc3545; }

    echo ""        .info { color: #17a2b8; }

    echo -e "${BLUE}Service Management:${NC}"        .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }

    echo "  Start:   systemctl start kpanel"    </style>

    echo "  Stop:    systemctl stop kpanel"</head>

    echo "  Restart: systemctl restart kpanel"<body>

    echo "  Status:  systemctl status kpanel"    <div class="container">

    echo ""        <h1>⚠️ KPanel Installation Partial</h1>

    echo -e "${BLUE}Configuration:${NC}"        <p class="warning">Frontend build failed. Server is running but UI needs manual build.</p>

    echo "  Directory: $KPANEL_DIR"        <p class="info">To complete installation, run:</p>

    echo "  Config:    $KPANEL_DIR/.env"        <div class="code">

    echo "  Logs:      journalctl -u kpanel -f"            cd /root/kpanel/client<br>

    echo ""            npm install<br>

    echo -e "${YELLOW}Next Steps:${NC}"            npm run build<br>

    echo "1. Navigate to the web interface"            pm2 restart kpanel-server

    echo "2. Complete the initial setup wizard"        </div>

    echo "3. Create your admin account"        <p>Then refresh this page.</p>

    echo "4. Configure SSL certificate (recommended)"    </div>

    echo ""</body>

    echo -e "${GREEN}Installation completed successfully!${NC}"</html>

}EOF

    echo -e "${YELLOW}📝 Created fallback frontend with manual build instructions${NC}"

# Main installation processfi

main() {

    print_headercd ..

    check_root

    detect_os# Create environment file

    check_system_requirementsecho -e "${YELLOW}⚙️  Configuring environment...${NC}"

    install_dependenciescat > .env << EOF

    install_nodejsNODE_ENV=production

    create_userPORT=3002

    download_kpanelDATABASE_PATH=./data/kpanel.db

    install_kpanelLOG_LEVEL=info

    configure_kpanelEOF

    setup_systemd

    setup_nginx# Start with PM2

    setup_firewallecho -e "${YELLOW}🚀 Starting KPanel with PM2...${NC}"

    start_kpanelpm2 stop kpanel-server 2>/dev/null || true

    print_completionpm2 delete kpanel-server 2>/dev/null || true

}pm2 start production-server.js --name kpanel-server



# Run main function# Save PM2 configuration and enable startup

main "$@"pm2 save
pm2 startup

echo -e "${YELLOW}💾 PM2 configuration saved${NC}"

# Detect server IP
echo -e "${YELLOW}🔍 Detecting server IP address...${NC}"
PUBLIC_IP=$(detect_public_ip)

# Display completion message
echo ""
echo -e "${GREEN}🎉 KPANEL INSTALLATION COMPLETE! 🎉${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""
echo -e "${GREEN}✅ KPanel is now running on your server${NC}"
echo ""
echo -e "${YELLOW}🌐 Access Information:${NC}"
echo -e "   Panel URL: ${GREEN}http://$PUBLIC_IP:3002${NC}"
echo -e "   Admin Login: ${GREEN}admin@kpanel.com${NC}"
echo -e "   Password: ${GREEN}admin123${NC}"
echo ""
echo -e "${YELLOW}📊 Management Commands:${NC}"
echo -e "   Status: ${BLUE}pm2 status${NC}"
echo -e "   Logs: ${BLUE}pm2 logs kpanel-server${NC}"
echo -e "   Restart: ${BLUE}pm2 restart kpanel-server${NC}"
echo -e "   Stop: ${BLUE}pm2 stop kpanel-server${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo -e "   1. Change the admin password immediately after login"
echo -e "   2. Configure firewall to allow port 3002"
echo -e "   3. Consider setting up SSL/TLS for production use"
echo ""

# Test server health
sleep 3
echo -e "${YELLOW}🔍 Testing server health...${NC}"
if curl -s -f "http://localhost:3002/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is healthy and responding!${NC}"
else
    echo -e "${YELLOW}⚠️  Server is starting up, check logs: pm2 logs kpanel-server${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Installation completed successfully!${NC}"
echo -e "${BLUE}Visit http://$PUBLIC_IP:3002 to access your KPanel${NC}"