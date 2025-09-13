#!/bin/bash
#
# KPanel Low Memory Installation Script  
# Prioritizes Docker installation for systems with limited memory
# 
# Usage: bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-install.sh)
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

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "========================================="
    echo "  KPanel Docker Installation v$KPANEL_VERSION"
    echo "  Optimized for Low Memory Systems"
    echo "========================================="
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

# Detect system information
detect_system() {
    print_status "Detecting system information..."
    
    # Detect OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS_TYPE="$ID"
        OS_VERSION="$VERSION_ID"
        echo -e "${GREEN}[INFO]${NC} OS: $PRETTY_NAME"
    else
        print_error "Cannot detect operating system"
        exit 1
    fi
    
    # Detect architecture
    ARCH=$(uname -m)
    echo -e "${GREEN}[INFO]${NC} Architecture: $ARCH"
    
    # Check memory
    MEMORY_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEMORY_MB=$((MEMORY_KB / 1024))
    echo -e "${GREEN}[INFO]${NC} Available Memory: ${MEMORY_MB}MB"
    
    if [ "$MEMORY_MB" -lt 512 ]; then
        print_error "System has less than 512MB RAM. KPanel requires at least 512MB."
        print_error "Please upgrade your server or use a larger VPS."
        exit 1
    elif [ "$MEMORY_MB" -lt 1024 ]; then
        print_warning "System has limited memory (${MEMORY_MB}MB). Docker installation recommended."
    fi
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."
    
    if command -v docker >/dev/null 2>&1; then
        print_status "Docker is already installed"
    else
        # Install Docker using official script
        curl -fsSL https://get.docker.com | sh
        
        # Add current user to docker group if not root
        if [ "$USER" != "root" ]; then
            usermod -aG docker "$USER"
            print_warning "You may need to log out and back in for Docker permissions to take effect"
        fi
        
        # Start and enable Docker
        systemctl start docker
        systemctl enable docker
        
        print_status "Docker installed successfully"
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_status "Installing Docker Compose..."
        
        # Download latest Docker Compose
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
        curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        
        print_status "Docker Compose installed successfully"
    else
        print_status "Docker Compose is already installed"
    fi
}

# Setup KPanel with Docker
setup_kpanel_docker() {
    print_status "Setting up KPanel with Docker..."
    
    # Create KPanel directory
    KPANEL_DIR="/opt/kpanel"
    mkdir -p "$KPANEL_DIR"
    cd "$KPANEL_DIR"
    
    # Create a simple Dockerfile that uses pre-built client
    print_status "Creating optimized Docker setup..."
    
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git curl unzip

# Clone and setup KPanel
RUN git clone https://github.com/herfaaljihad/kpanel.git . && \
    npm install --production --omit=dev

# Download pre-built client (NO BUILD - memory safe)
RUN cd client && \
    echo "Downloading pre-built client..." && \
    (curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/client-dist.zip -o client-dist.zip && \
     unzip -o client-dist.zip && \
     rm client-dist.zip && \
     echo "Pre-built client installed successfully") || \
    (echo "Pre-built client unavailable, creating minimal fallback..." && \
     mkdir -p dist && \
     echo '<!DOCTYPE html><html><head><title>KPanel</title></head><body><h1>KPanel Loading...</h1><script>setTimeout(function(){window.location.reload();},3000);</script></body></html>' > dist/index.html) && \
    cd ..

# Create database directory
RUN mkdir -p database logs conf

EXPOSE 2222

# Start the application with HTTP-only server
CMD ["node", "docker-http-server.js"]
EOF

    # Create optimized docker-compose file
    cat > docker-compose.yml << 'EOF'
version: "3.8"

services:
  kpanel:
    build: .
    container_name: kpanel
    restart: unless-stopped
    ports:
      - "2222:2222"
    volumes:
      - kpanel_data:/app/database
      - kpanel_logs:/app/logs
      - kpanel_conf:/app/conf
    environment:
      - NODE_ENV=production
      - PORT=2222
      - DATABASE_PATH=/app/database/kpanel.db
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - SESSION_SECRET=${SESSION_SECRET}
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:2222 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s

volumes:
  kpanel_data:
  kpanel_logs:
  kpanel_conf:
EOF

    # Create environment file
    print_status "Generating configuration..."
    JWT_SECRET=$(openssl rand -hex 32)
    SESSION_SECRET=$(openssl rand -hex 32)
    ADMIN_PASSWORD=$(openssl rand -base64 12)
    
    cat > .env << EOF
# KPanel Configuration
NODE_ENV=production
PORT=2222
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DATABASE_PATH=/app/database/kpanel.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD

# Docker Configuration
COMPOSE_PROJECT_NAME=kpanel
EOF
    
    print_status "Building and starting KPanel services..."
    export DOCKER_BUILDKIT=1
    docker-compose build --no-cache
    docker-compose up -d
    
    # Wait for services to start
    print_status "Waiting for services to initialize..."
    sleep 20
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_status "KPanel started successfully!"
    else
        print_error "Failed to start KPanel services"
        docker-compose logs
        exit 1
    fi
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        ufw allow $KPANEL_PORT/tcp
        print_status "Firewall configured for port $KPANEL_PORT"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --permanent --add-port=$KPANEL_PORT/tcp
        firewall-cmd --reload
        print_status "Firewall configured for port $KPANEL_PORT"
    else
        print_warning "No firewall detected. Ensure port $KPANEL_PORT is accessible."
    fi
}

# Display final information
show_completion() {
    echo -e "${GREEN}"
    echo "========================================="
    echo "   KPanel Installation Complete!"
    echo "========================================="
    echo -e "${NC}"
    echo -e "${GREEN}✓${NC} KPanel is running with Docker"
    echo -e "${GREEN}✓${NC} Memory-efficient installation"
    echo -e "${GREEN}✓${NC} Automatic service management"
    echo ""
    echo -e "${BLUE}Access Information:${NC}"
    echo "URL: http://$(curl -s ifconfig.me 2>/dev/null || echo 'your-server-ip'):$KPANEL_PORT"
    echo "Username: admin"
    echo "Password: $(grep ADMIN_PASSWORD /opt/kpanel/.env | cut -d'=' -f2)"
    echo ""
    echo -e "${BLUE}Service Management:${NC}"
    echo "Start:   cd /opt/kpanel && docker-compose up -d"
    echo "Stop:    cd /opt/kpanel && docker-compose down"
    echo "Logs:    cd /opt/kpanel && docker-compose logs -f"
    echo "Update:  cd /opt/kpanel && docker-compose pull && docker-compose up -d"
    echo ""
    echo -e "${YELLOW}Note:${NC} Configuration saved in /opt/kpanel/.env"
    echo -e "${YELLOW}Note:${NC} This Docker installation uses minimal memory"
}

# Main installation process
main() {
    print_header
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        print_error "Please run: sudo bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-install.sh)"
        exit 1
    fi
    
    detect_system
    install_docker
    setup_kpanel_docker
    configure_firewall
    show_completion
    
    print_status "Installation completed successfully!"
}

# Run main function
main "$@"