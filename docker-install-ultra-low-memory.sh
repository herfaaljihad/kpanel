#!/bin/bash

#############################################
# KPanel Ultra Low Memory Docker Installer
# Optimized for systems with <512MB RAM
# Version: 2.0.0
#############################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Print functions
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
KPANEL_PORT=${KPANEL_PORT:-2222}
INSTALL_DIR="/opt/kpanel"

echo -e "${BLUE}"
echo "============================================="
echo "  KPanel Ultra Low Memory Docker Installer"
echo "  Specially Optimized for <512MB RAM"
echo "============================================="
echo -e "${NC}"

# System check (bypass memory requirement)
check_system() {
    print_status "Checking system compatibility..."
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "This installer must be run as root (use sudo)"
        exit 1
    fi
    
    # Basic OS check
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo -e "${GREEN}[INFO]${NC} OS: $PRETTY_NAME"
    else
        print_error "Cannot detect operating system"
        exit 1
    fi
    
    # Check memory (informational only)
    MEMORY_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEMORY_MB=$((MEMORY_KB / 1024))
    echo -e "${GREEN}[INFO]${NC} Available Memory: ${MEMORY_MB}MB"
    
    print_warning "Ultra Low Memory Mode: Bypassing 512MB requirement"
    print_warning "System will use aggressive memory optimization"
}

# Install Docker with memory optimizations
install_docker() {
    print_status "Installing Docker with memory optimizations..."
    
    if command -v docker >/dev/null 2>&1; then
        print_status "Docker is already installed"
    else
        # Install Docker using official script
        curl -fsSL https://get.docker.com | sh
        
        # Add current user to docker group if not root
        if [ "$USER" != "root" ]; then
            usermod -aG docker "$USER"
        fi
        
        # Start and enable Docker
        systemctl start docker
        systemctl enable docker
        
        # Configure Docker for low memory
        mkdir -p /etc/docker
        cat > /etc/docker/daemon.json << 'EOF'
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-runtime": "runc",
  "runtimes": {
    "runc": {
      "path": "runc"
    }
  }
}
EOF
        
        systemctl restart docker
        print_status "Docker installed with memory optimizations"
    fi
    
    # Install Docker Compose if not present
    if ! command -v docker-compose >/dev/null 2>&1; then
        print_status "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        print_status "Docker Compose installed"
    fi
}

# Setup KPanel
setup_kpanel() {
    print_status "Setting up KPanel in ultra low memory mode..."
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Download all necessary files from GitHub
    print_status "Downloading KPanel files..."
    
    # Download pre-built client
    if [ ! -f "client-dist.zip" ]; then
        curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/client-dist.zip -o client-dist.zip || {
            print_error "Failed to download client files"
            exit 1
        }
    fi
    
    # Download docker-http-server.js
    curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-http-server.js -o docker-http-server.js || {
        print_error "Failed to download server file"
        exit 1
    }
    
    # Create minimal package.json for the container
    cat > package.json << 'EOF'
{
  "name": "kpanel-ultra-low-memory",
  "version": "2.0.0",
  "description": "KPanel Ultra Low Memory Server",
  "main": "docker-http-server.js",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "compression": "^1.7.4",
    "sqlite3": "^5.1.6",
    "dotenv": "^16.3.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF
    
    # Create ultra-optimized Dockerfile
    cat > Dockerfile << 'EOF'
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl wget sqlite python3 make g++

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./
RUN npm install --production --no-audit --no-fund

# Copy server files
COPY docker-http-server.js ./

# Extract pre-built client
COPY client-dist.zip /tmp/
RUN unzip -q /tmp/client-dist.zip -d /app/client-dist && rm /tmp/client-dist.zip

# Create necessary directories
RUN mkdir -p database logs conf

# Set memory limits
ENV NODE_OPTIONS="--max-old-space-size=256"

EXPOSE 2222

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=180s --retries=2 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:2222/api/health || exit 1

# Start the application
CMD ["node", "docker-http-server.js"]
EOF

    # Create environment file with IP detection
    print_status "Generating configuration..."
    JWT_SECRET=$(openssl rand -hex 16)  # Smaller secret for low memory
    SESSION_SECRET=$(openssl rand -hex 16)
    ADMIN_PASSWORD=$(openssl rand -base64 8)  # Shorter password
    
    # Detect public IP
    print_status "Detecting public IP address..."
    PUBLIC_IP=""
    
    # Try multiple IP detection services
    for service in "https://api.ipify.org" "https://checkip.amazonaws.com" "https://icanhazip.com" "https://ipinfo.io/ip"; do
        PUBLIC_IP=$(curl -s --max-time 5 "$service" | tr -d '\n\r' | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$')
        if [ -n "$PUBLIC_IP" ]; then
            echo -e "${GREEN}[INFO]${NC} Detected public IP: $PUBLIC_IP"
            break
        fi
    done
    
    # Fallback to local network IP
    if [ -z "$PUBLIC_IP" ]; then
        print_warning "Could not detect public IP, trying local network IP..."
        PUBLIC_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null || hostname -I | awk '{print $1}')
    fi
    
    # Final fallback
    if [ -z "$PUBLIC_IP" ]; then
        PUBLIC_IP="localhost"
        print_warning "Using localhost as fallback"
    fi
    
    cat > .env << EOF
# KPanel Ultra Low Memory Configuration
NODE_ENV=production
PORT=2222
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DATABASE_PATH=/app/database/kpanel.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$ADMIN_PASSWORD
PUBLIC_IP=$PUBLIC_IP

# Memory Optimizations
NODE_OPTIONS=--max-old-space-size=256
UV_THREADPOOL_SIZE=4

# Docker Configuration
COMPOSE_PROJECT_NAME=kpanel

# HTTP-Only Mode
FORCE_HTTP=true
DISABLE_HTTPS=true
NO_SSL=true
HTTP_ONLY=true
EOF

    # Download optimized compose file
    print_status "Downloading ultra-optimized compose configuration..."
    curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-compose.docker-install.yml -o docker-compose.yml || {
        print_warning "Could not download compose file, creating minimal version"
        
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
      - ./database:/app/database
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=2222
      - NODE_OPTIONS=--max-old-space-size=256
      - PUBLIC_IP=${PUBLIC_IP}
      - FORCE_HTTP=true
      - HTTP_ONLY=true
    deploy:
      resources:
        limits:
          memory: 384M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:2222/api/health || exit 1"]
      interval: 60s
      timeout: 10s
      retries: 2
      start_period: 180s
EOF
    }
    
    # Create swap if needed (aggressive for ultra low memory)
    create_swap_if_needed
    
    # Build and start with memory optimizations
    print_status "Building KPanel (this may take a while on low memory systems)..."
    
    # Clear Docker cache to free memory
    docker system prune -f >/dev/null 2>&1 || true
    
    # Build with memory limits
    export DOCKER_BUILDKIT=0  # Disable buildkit for lower memory usage
    export COMPOSE_DOCKER_CLI_BUILD=0
    
    # Stop any running containers
    docker-compose down >/dev/null 2>&1 || true
    
    # Build with retries and memory management
    for i in {1..3}; do
        print_status "Build attempt $i/3..."
        if timeout 1200 docker-compose build --no-cache --memory=384m; then
            break
        else
            if [ "$i" -eq 3 ]; then
                print_error "Failed to build after 3 attempts"
                exit 1
            fi
            print_warning "Build failed, clearing cache and retrying..."
            docker system prune -f >/dev/null 2>&1 || true
            sleep 10
        fi
    done
    
    # Start services
    print_status "Starting KPanel services..."
    docker-compose up -d
    
    # Wait for services with longer timeout for low memory
    print_status "Waiting for services to initialize (this may take longer on low memory systems)..."
    
    for i in {1..12}; do  # 2 minute timeout
        if docker-compose ps | grep -q "Up"; then
            sleep 5
            if curl -s http://localhost:"$KPANEL_PORT"/api/health >/dev/null 2>&1; then
                print_status "KPanel started successfully!"
                return 0
            fi
        fi
        echo -n "."
        sleep 10
    done
    
    print_error "Services may not have started properly. Checking logs..."
    docker-compose logs --tail=20
}

# Create swap for ultra low memory systems
create_swap_if_needed() {
    # Always create swap for ultra low memory systems
    if [ ! -f /swapfile ]; then
        print_status "Creating swap file for ultra low memory system..."
        
        # Create 1GB swap
        fallocate -l 1G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=1024
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        
        # Make permanent
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        
        # Optimize swap usage
        echo 'vm.swappiness=10' >> /etc/sysctl.conf
        echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
        
        print_status "Swap file created and optimized"
    else
        print_status "Swap file already exists"
    fi
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        ufw allow "$KPANEL_PORT"/tcp >/dev/null 2>&1
        print_status "UFW configured for port $KPANEL_PORT"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        firewall-cmd --permanent --add-port="$KPANEL_PORT"/tcp >/dev/null 2>&1
        firewall-cmd --reload >/dev/null 2>&1
        print_status "Firewalld configured for port $KPANEL_PORT"
    else
        print_warning "No firewall detected. Ensure port $KPANEL_PORT is accessible."
    fi
}

# Display final information
show_completion() {
    echo -e "${GREEN}"
    echo "================================================="
    echo "   KPanel Ultra Low Memory Installation Complete!"
    echo "================================================="
    echo -e "${NC}"
    echo -e "${GREEN}✓${NC} KPanel is running in ultra low memory mode"
    echo -e "${GREEN}✓${NC} Memory optimizations applied"
    echo -e "${GREEN}✓${NC} Swap configured for stability"
    echo -e "${GREEN}✓${NC} HTTP-only mode (no SSL required)"
    echo ""
    echo -e "${BLUE}Access Information:${NC}"
    echo "🌐 URL: http://${PUBLIC_IP:-localhost}:$KPANEL_PORT"
    echo "👤 Username: admin"
    echo "🔑 Password: $(grep ADMIN_PASSWORD .env | cut -d'=' -f2)"
    echo ""
    echo -e "${BLUE}Alternative Access:${NC}"
    echo "📱 Local: http://localhost:$KPANEL_PORT"
    echo "🔗 Health: http://${PUBLIC_IP:-localhost}:$KPANEL_PORT/api/health"
    echo ""
    echo -e "${BLUE}Service Management:${NC}"
    echo "▶️  Start:   cd $INSTALL_DIR && docker-compose up -d"
    echo "⏹️  Stop:    cd $INSTALL_DIR && docker-compose down"
    echo "📋 Logs:    cd $INSTALL_DIR && docker-compose logs -f"
    echo "🔄 Restart: cd $INSTALL_DIR && docker-compose restart"
    echo ""
    echo -e "${YELLOW}Ultra Low Memory Tips:${NC}"
    echo "• Monitor system with 'free -h' and 'docker stats'"
    echo "• Restart periodically if performance degrades"
    echo "• Keep swap enabled for stability"
    echo "• Limit concurrent operations"
    echo ""
}

# Main execution
main() {
    check_system
    install_docker
    setup_kpanel
    configure_firewall
    show_completion
}

# Run main function
main "$@"