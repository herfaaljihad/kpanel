#!/bin/bash

#!/bin/bash
#
# KPanel Quick Setup - DirectAdmin Style Installation
# Usage: curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/quick-install.sh | bash
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    clear
    echo -e "${BLUE}"
    cat << 'EOF'
 _   ___  ____   _   _   _   _____ _     
| | / / ||  _ \ / / | \ | | | ____| |    
| |/ /| || |_) / /  |  \| | |  _| | |    
|   < | ||  __/ /   | |\  | | |___| |___ 
|_|\_\|_||_|  /_/    |_| \_| |_____|_____|
                                         
 Control Panel - DirectAdmin Alternative
EOF
    echo -e "${NC}"
    echo "======================================"
    echo "  Quick Installation Script v2.0.0"
    echo "======================================"
    echo ""
}

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Memory detection and installer recommendation
detect_memory_and_recommend() {
    print_status "Detecting system resources..."
    
    # Check memory
    MEMORY_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEMORY_MB=$((MEMORY_KB / 1024))
    
    print_status "Available Memory: ${MEMORY_MB}MB"
    
    if [ "$MEMORY_MB" -lt 600 ]; then
        print_warning "Low memory system detected (${MEMORY_MB}MB)"
        print_warning "Recommending Docker installation for optimal performance..."
        echo ""
        echo -e "${BLUE}For your system, we recommend:${NC}"
        echo "1. Docker installation (memory-efficient, recommended)"
        echo "2. Standard installation (may require more time/memory)"
        echo ""
        read -p "Choose installation method (1=Docker, 2=Standard): " choice
        
        case $choice in
            1)
                print_status "Using Docker installation..."
                bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-install.sh)
                exit 0
                ;;
            2)
                print_warning "Proceeding with standard installation on low memory system..."
                ;;
            *)
                print_error "Invalid choice. Defaulting to Docker installation..."
                bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-install.sh)
                exit 0
                ;;
        esac
    elif [ "$MEMORY_MB" -lt 1024 ]; then
        print_warning "Limited memory system (${MEMORY_MB}MB). Installation may take longer."
    else
        print_status "Sufficient memory available (${MEMORY_MB}MB)"
    fi
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

log_info "🚀 Starting KPanel Quick Installation..."
log_info "📊 System: $(lsb_release -d | cut -f2)"
log_info "💾 RAM: $(free -h | awk '/^Mem:/ {print $2}')"
log_info "💿 Disk: $(df -h / | awk 'NR==2 {print $4}') available"

# Detect memory and recommend installation method
detect_memory_and_recommend

# Update system packages
log_info "📦 Updating system packages..."
apt-get update -qq > /dev/null 2>&1

# Install Node.js 18.x (LTS)
log_info "🔧 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
apt-get install -y nodejs > /dev/null 2>&1

# Install essential packages
log_info "📦 Installing essential packages..."
apt-get install -y git curl wget unzip sqlite3 nginx > /dev/null 2>&1

# Verify Node.js installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log_success "✅ Node.js ${NODE_VERSION} and npm ${NPM_VERSION} installed"

# Clone KPanel repository (if not already in kpanel directory)
if [[ ! -f "package.json" ]]; then
    log_info "📥 Cloning KPanel repository..."
    git clone https://github.com/herfaaljihad/kpanel.git
    cd kpanel
else
    log_info "📂 Using existing KPanel directory"
fi

# Install npm dependencies
log_info "📦 Installing KPanel dependencies..."
npm install --production > /dev/null 2>&1

# Setup database and admin user
log_info "🗄️ Setting up database and admin user..."
npm run setup > /dev/null 2>&1

# Install PM2 for process management
log_info "⚙️ Installing PM2 process manager..."
npm install -g pm2 > /dev/null 2>&1

# Create production configuration
log_info "⚙️ Creating production configuration..."

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'kpanel-backend',
    script: 'production-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      JWT_SECRET: 'kpanel-production-jwt-secret-CHANGE-THIS',
      DB_PATH: './data/kpanel.db'
    }
  }]
};
EOF

# Create Nginx configuration
log_info "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/kpanel << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Frontend files
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Enable Nginx site
ln -sf /etc/nginx/sites-available/kpanel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Build frontend
log_info "🏗️ Building frontend..."
cd client
npm install > /dev/null 2>&1
npm run build > /dev/null 2>&1

# Copy build files to Nginx
log_info "📁 Deploying frontend files..."
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/
chown -R www-data:www-data /var/www/html

# Go back to main directory
cd ..

# Start services
log_info "🚀 Starting services..."

# Start backend with PM2
pm2 start ecosystem.config.js > /dev/null 2>&1
pm2 save > /dev/null 2>&1
pm2 startup > /dev/null 2>&1

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Configure firewall
log_info "🔒 Configuring firewall..."
ufw allow 22/tcp > /dev/null 2>&1  # SSH
ufw allow 80/tcp > /dev/null 2>&1  # HTTP
ufw allow 443/tcp > /dev/null 2>&1 # HTTPS
ufw --force enable > /dev/null 2>&1

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

# Installation complete
echo ""
log_success "🎉 KPanel installation completed successfully!"
echo ""
log_info "📊 Installation Summary:"
log_info "   • Node.js: ${NODE_VERSION}"
log_info "   • npm: ${NPM_VERSION}"
log_info "   • Backend: Running on port 3002 (PM2)"
log_info "   • Frontend: Served by Nginx on port 80"
log_info "   • Database: SQLite (initialized)"
log_info "   • Admin User: admin@kpanel.com / admin123"
echo ""
log_info "🌐 Access your KPanel:"
log_info "   • URL: http://${SERVER_IP}"
log_info "   • API: http://${SERVER_IP}/api"
echo ""
log_info "🔧 Useful Commands:"
log_info "   • Check status: pm2 status"
log_info "   • View logs: pm2 logs kpanel-backend"
log_info "   • Restart: pm2 restart kpanel-backend"
log_info "   • Nginx status: systemctl status nginx"
echo ""
log_warning "⚠️ Important: Change default admin password after first login!"
echo ""
log_success "✅ Ready for production use!"
