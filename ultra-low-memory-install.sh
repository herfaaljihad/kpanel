#!/bin/bash

# KPanel Ultra Low Memory Docker Installer
# Specifically designed for systems with <512MB RAM
# Bypasses memory checks and uses extreme optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo -e "${BLUE}"
echo "========================================="
echo "  KPanel Ultra Low Memory Installer"
echo "  Designed for <512MB RAM Systems"
echo "========================================="
echo -e "${NC}"

# System information
print_status "System optimization for ultra low memory..."
MEMORY_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
MEMORY_MB=$((MEMORY_KB / 1024))
print_warning "Available Memory: ${MEMORY_MB}MB (Ultra Low Memory Mode)"

# Create installation directory
INSTALL_DIR="/opt/kpanel"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Install Docker if not present (minimal method)
if ! command -v docker >/dev/null 2>&1; then
    print_status "Installing Docker (minimal)..."
    curl -fsSL https://get.docker.com | sh
    systemctl start docker
    systemctl enable docker
fi

# Install Docker Compose if not present
if ! command -v docker-compose >/dev/null 2>&1; then
    print_status "Installing Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Create ultra-optimized Dockerfile
print_status "Creating ultra-optimized Dockerfile..."
cat > Dockerfile << 'EOF'
# Ultra lightweight Node.js image
FROM node:18-alpine

WORKDIR /app

# Install only production dependencies
COPY server/package.json ./
RUN npm ci --only=production --no-audit --no-fund && \
    npm cache clean --force

# Copy pre-built client and server files
COPY client-dist.zip ./
RUN unzip -q client-dist.zip && rm client-dist.zip

# Copy minimal server files
COPY docker-http-server.js ./
COPY server/config ./config/
COPY server/routes ./routes/
COPY server/middleware ./middleware/

# Create required directories
RUN mkdir -p database logs conf uploads && \
    chown -R node:node /app

USER node

EXPOSE 2222

# Use exec form for better signal handling
CMD ["node", "--max-old-space-size=128", "docker-http-server.js"]
EOF

# Create ultra-optimized docker-compose
print_status "Creating optimized Docker Compose configuration..."
cat > docker-compose.yml << 'EOF'
version: "3.8"

services:
  kpanel:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: kpanel
    restart: unless-stopped
    ports:
      - "2222:2222"
    volumes:
      - kpanel_data:/app/database
      - kpanel_logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=2222
      - DATABASE_PATH=/app/database/kpanel.db
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=${ADMIN_PASSWORD:-kpanel123}
      - FORCE_HTTP=true
      - HTTP_ONLY=true
      - PUBLIC_IP=${PUBLIC_IP:-}
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:2222/api/health || exit 1"]
      interval: 60s
      timeout: 10s
      retries: 2
      start_period: 60s

volumes:
  kpanel_data:
  kpanel_logs:
EOF

# Detect public IP
print_status "Detecting public IP address..."
PUBLIC_IP=""

for service in "https://api.ipify.org" "https://checkip.amazonaws.com" "https://icanhazip.com"; do
    PUBLIC_IP=$(curl -s --max-time 5 "$service" | tr -d '\n\r' | grep -E '^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$')
    if [ -n "$PUBLIC_IP" ]; then
        print_status "Detected public IP: $PUBLIC_IP"
        break
    fi
done

if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null || hostname -I | awk '{print $1}')
fi

if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP="localhost"
    print_warning "Could not detect IP, using localhost"
fi

# Create environment file
JWT_SECRET=$(openssl rand -hex 16)  # Smaller secret for low memory
SESSION_SECRET=$(openssl rand -hex 16)
ADMIN_PASSWORD=$(openssl rand -base64 8)  # Shorter password

cat > .env << EOF
NODE_ENV=production
PORT=2222
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
ADMIN_PASSWORD=$ADMIN_PASSWORD
PUBLIC_IP=$PUBLIC_IP
FORCE_HTTP=true
HTTP_ONLY=true
DATABASE_PATH=/app/database/kpanel.db
EOF

# Download pre-built client
if [ ! -f "client-dist.zip" ]; then
    print_status "Downloading pre-built client..."
    curl -fsSL https://github.com/herfaaljihad/kpanel/raw/main/client-dist.zip -o client-dist.zip || {
        print_error "Failed to download pre-built client"
        exit 1
    }
fi

# Copy necessary server files
print_status "Preparing server files..."
mkdir -p server

# Download essential files
curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/server/package.json -o server/package.json
curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-http-server.js -o docker-http-server.js

# Create minimal directories
mkdir -p server/{config,routes,middleware}

# Create minimal config files
cat > server/config/database.js << 'EOF'
module.exports = {
  path: process.env.DATABASE_PATH || '/app/database/kpanel.db'
};
EOF

# Memory optimization settings
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Build with memory constraints
print_status "Building container with ultra low memory optimization..."
docker build --memory=256m --memory-swap=512m --no-cache -t kpanel:ultra-low-mem . || {
    print_error "Build failed. Creating swap space..."
    
    # Create swap if build fails
    if [ ! -f /swapfile ]; then
        print_status "Creating 1GB swap file..."
        fallocate -l 1G /swapfile || dd if=/dev/zero of=/swapfile bs=1024 count=1048576
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        print_status "Swap activated"
    fi
    
    # Retry build with swap
    docker build --memory=512m --no-cache -t kpanel:ultra-low-mem .
}

# Start services
print_status "Starting KPanel services..."
docker-compose up -d

# Wait for startup
print_status "Waiting for services to initialize..."
sleep 30

# Check status
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}"
    echo "========================================="
    echo "   KPanel Ultra Low Memory Install OK!"
    echo "========================================="
    echo -e "${NC}"
    echo -e "${GREEN}✅ Success: KPanel running on ${MEMORY_MB}MB RAM${NC}"
    echo ""
    echo -e "${BLUE}🌐 Access KPanel:${NC}"
    echo "   URL: http://${PUBLIC_IP}:2222"
    echo "   Username: admin"
    echo "   Password: $ADMIN_PASSWORD"
    echo ""
    echo -e "${BLUE}📊 System Status:${NC}"
    echo "   Memory: ${MEMORY_MB}MB (Ultra Low Mode)"
    echo "   Container: $(docker stats --no-stream --format 'table {{.Container}}\t{{.MemUsage}}' kpanel | tail -n1 | awk '{print $2}')"
    echo ""
    echo -e "${GREEN}🎉 KPanel is now accessible at: http://${PUBLIC_IP}:2222${NC}"
else
    print_error "Failed to start services"
    docker-compose logs
    exit 1
fi