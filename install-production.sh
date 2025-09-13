#!/bin/bash

# =============================================================================
# KPanel PRODUCTION Installation Script
# Auto-detects VPS IP and installs complete production environment
# Supports Ubuntu 20.04+ / Debian 10+ / CentOS 8+
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

# Detect OS
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    else
        OS=$(uname -s)
        VER=$(uname -r)
    fi
}

# Detect server IP automatically
detect_server_ip() {
    log_step "🌐 Detecting server IP addresses..."
    
    # Try multiple methods to get public IP
    PUBLIC_IP=""
    methods=(
        "curl -s --max-time 5 ifconfig.me"
        "curl -s --max-time 5 api.ipify.org"
        "curl -s --max-time 5 icanhazip.com"
        "curl -s --max-time 5 checkip.amazonaws.com"
        "dig +short myip.opendns.com @resolver1.opendns.com"
    )
    
    for method in "${methods[@]}"; do
        PUBLIC_IP=$(eval "$method" 2>/dev/null | tr -d '\n\r' | head -1)
        if [[ $PUBLIC_IP =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
            break
        fi
    done
    
    # Get local IP as fallback
    LOCAL_IP=$(ip route get 8.8.8.8 | awk '{print $7; exit}' 2>/dev/null || echo "127.0.0.1")
    
    if [[ -z "$PUBLIC_IP" ]]; then
        PUBLIC_IP=$LOCAL_IP
        log_warning "Could not detect public IP, using local IP: $LOCAL_IP"
    else
        log_success "✅ Public IP detected: $PUBLIC_IP"
    fi
    
    HOSTNAME=$(hostname -f 2>/dev/null || hostname)
    log_info "🏠 Local IP: $LOCAL_IP"
    log_info "💻 Hostname: $HOSTNAME"
}

# Print system information
print_system_info() {
    detect_os
    detect_server_ip
    
    echo ""
    log_info "🚀 Starting KPanel Production Installation"
    echo ""
    log_info "📊 System Information:"
    log_info "   💻 OS: $OS $VER"
    log_info "   🌐 Public IP: $PUBLIC_IP"  
    log_info "   🏠 Local IP: $LOCAL_IP"
    log_info "   💾 RAM: $(free -h | awk '/^Mem:/ {print $2}') total"
    log_info "   💿 Disk: $(df -h / | awk 'NR==2 {print $4}') available"
    log_info "   ⚡ CPU: $(nproc) cores"
    echo ""
}

# Install Node.js based on OS
install_nodejs() {
    log_step "🔧 Installing Node.js 18.x LTS..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get update && apt-get install -y nodejs
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs npm
    else
        log_error "Unsupported OS: $OS"
        exit 1
    fi
    
    # Verify installation
    NODE_VERSION=$(node --version 2>/dev/null || echo "none")
    NPM_VERSION=$(npm --version 2>/dev/null || echo "none")
    
    if [[ $NODE_VERSION != "none" ]]; then
        log_success "✅ Node.js $NODE_VERSION installed"
        log_success "✅ npm $NPM_VERSION installed"
    else
        log_error "❌ Node.js installation failed"
        exit 1
    fi
}

# Install system packages
install_packages() {
    log_step "📦 Installing system packages..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        apt-get update -qq
        apt-get install -y \
            curl wget git unzip \
            nginx sqlite3 \
            ufw fail2ban \
            htop nano vim \
            certbot python3-certbot-nginx \
            build-essential \
            software-properties-common \
            apt-transport-https
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        yum update -y
        yum install -y \
            curl wget git unzip \
            nginx sqlite \
            firewalld fail2ban \
            htop nano vim \
            certbot python3-certbot-nginx \
            gcc-c++ make
    fi
    
    log_success "✅ System packages installed"
}

# Setup KPanel application
setup_kpanel() {
    log_step "📥 Setting up KPanel application..."
    
    # Create application directory
    APP_DIR="/opt/kpanel"
    mkdir -p $APP_DIR
    cd $APP_DIR
    
    # Clone or update repository
    if [[ -d ".git" ]]; then
        log_info "📄 Updating existing repository..."
        git pull origin main
    else
        log_info "📥 Cloning KPanel repository..."
        git clone https://github.com/herfaaljihad/kpanel.git .
    fi
    
    # Install dependencies
    log_info "📦 Installing Node.js dependencies..."
    npm install --production --silent
    
    # Setup database and admin user
    log_info "🗄️ Setting up database..."
    npm run setup || {
        log_error "Database setup failed, creating manually..."
        node -e "
        const setupScript = require('./scripts/setup.js');
        setupScript().catch(console.error);
        "
    }
    
    log_success "✅ KPanel application setup complete"
}

# Install and configure PM2
setup_pm2() {
    log_step "⚙️ Installing PM2 process manager..."
    
    npm install -g pm2 --silent
    
    # Update ecosystem config with detected IP
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'kpanel-backend',
    script: 'production-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
      PUBLIC_IP: '${PUBLIC_IP}',
      JWT_SECRET: 'kpanel-production-$(openssl rand -hex 32)',
      DB_PATH: './data/kpanel.db'
    }
  }]
};
EOF
    
    # Start KPanel with PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
    
    log_success "✅ PM2 configured and started"
}

# Configure Nginx
setup_nginx() {
    log_step "🌐 Configuring Nginx web server..."
    
    # Backup default config
    if [[ -f "/etc/nginx/sites-available/default" ]]; then
        cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    fi
    
    # Create KPanel Nginx configuration
    cat > /etc/nginx/sites-available/kpanel << EOF
# KPanel Nginx Configuration
# Auto-generated for IP: ${PUBLIC_IP}

server {
    listen 80;
    server_name ${PUBLIC_IP} ${HOSTNAME} _;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Root directory for frontend files
    root /var/www/kpanel;
    index index.html index.htm;
    
    # Backend API proxy
    location /api {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }
    
    # Frontend files
    location / {
        try_files \$uri \$uri/ /index.html;
        
        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)\$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Deny access to sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~* \.(env|log|config)\$ {
        deny all;
    }
}
EOF
    
    # Enable site and disable default
    ln -sf /etc/nginx/sites-available/kpanel /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    systemctl enable nginx
    
    log_success "✅ Nginx configured and reloaded"
}

# Build and deploy frontend
build_frontend() {
    log_step "🏗️ Building and deploying frontend..."
    
    cd $APP_DIR
    
    # Build frontend if client directory exists
    if [[ -d "client" ]]; then
        cd client
        npm install --silent
        npm run build
        
        # Deploy to Nginx directory
        mkdir -p /var/www/kpanel
        rm -rf /var/www/kpanel/*
        cp -r dist/* /var/www/kpanel/
        chown -R www-data:www-data /var/www/kpanel
        
        log_success "✅ Frontend built and deployed"
        cd ..
    else
        log_warning "⚠️ Client directory not found, API-only mode"
        
        # Create simple index page
        mkdir -p /var/www/kpanel
        cat > /var/www/kpanel/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>KPanel - Loading...</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 50px; }
        .status { background: #e7f3ff; border: 1px solid #b3d9ff; border-radius: 5px; padding: 20px; margin: 20px 0; }
        .api-link { background: #f0f8f0; border: 1px solid #b3e0b3; border-radius: 5px; padding: 15px; margin: 10px 0; }
        a { color: #0066cc; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <h1>🎛️ KPanel Control Panel</h1>
    <div class="status">
        <h2>✅ Server is Running</h2>
        <p>Backend API is active and ready to handle requests.</p>
    </div>
    
    <div class="api-link">
        <h3>🔗 API Endpoints:</h3>
        <p><a href="/api/health">Health Check</a></p>
        <p><a href="/api/server/info">Server Information</a></p>
    </div>
    
    <div class="status">
        <p><strong>Frontend will be available after client build completion.</strong></p>
        <p>Check PM2 logs: <code>pm2 logs kpanel-backend</code></p>
    </div>
</body>
</html>
EOF
        chown -R www-data:www-data /var/www/kpanel
    fi
}

# Configure firewall
setup_firewall() {
    log_step "🔒 Configuring firewall..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        # Configure UFW
        ufw --force reset
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow 22/tcp comment 'SSH'
        ufw allow 80/tcp comment 'HTTP'
        ufw allow 443/tcp comment 'HTTPS'
        ufw --force enable
        
        log_success "✅ UFW firewall configured"
        
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Rocky"* ]]; then
        # Configure firewalld
        systemctl enable firewalld
        systemctl start firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
        
        log_success "✅ Firewalld configured"
    fi
}

# Configure fail2ban
setup_fail2ban() {
    log_step "🛡️ Configuring Fail2Ban..."
    
    # Create jail.local configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript] 
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 1800
EOF
    
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    log_success "✅ Fail2Ban configured"
}

# Print completion summary
print_completion_summary() {
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
    echo ""
    log_success "🎉 KPanel Production Installation COMPLETED!"
    echo ""
    log_info "📊 Installation Summary:"
    log_info "   🌐 Public IP: $PUBLIC_IP"
    log_info "   💻 OS: $OS $VER"
    log_info "   🔧 Node.js: $NODE_VERSION"
    log_info "   📦 npm: $NPM_VERSION"
    log_info "   ⚙️ PM2: $(pm2 --version 2>/dev/null || echo 'installed')"
    log_info "   🌐 Nginx: $(nginx -v 2>&1 | cut -d' ' -f3 | cut -d'/' -f2)"
    echo ""
    log_info "🔗 Access Links:"
    log_info "   🌐 Main Panel: http://$PUBLIC_IP"
    log_info "   📡 API Health: http://$PUBLIC_IP/api/health" 
    log_info "   📊 Server Info: http://$PUBLIC_IP/api/server/info"
    echo ""
    log_info "🔑 Default Login:"
    log_info "   📧 Email: admin@kpanel.com"
    log_info "   🔑 Password: admin123"
    echo ""
    log_info "🔧 Management Commands:"
    log_info "   📊 Status: pm2 status"
    log_info "   📝 Logs: pm2 logs kpanel-backend"
    log_info "   🔄 Restart: pm2 restart kpanel-backend"
    log_info "   🌐 Nginx Status: systemctl status nginx"
    log_info "   🔒 Firewall: ufw status"
    log_info "   🛡️ Fail2Ban: fail2ban-client status"
    echo ""
    log_warning "⚠️ IMPORTANT SECURITY TASKS:"
    log_warning "   1. Change default admin password immediately!"
    log_warning "   2. Update JWT_SECRET in ecosystem.config.js"
    log_warning "   3. Consider enabling SSL with Let's Encrypt"
    log_warning "   4. Review and customize firewall rules"
    echo ""
    log_success "✅ KPanel is now ready for production use!"
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
}

# Main installation process
main() {
    print_system_info
    install_nodejs
    install_packages
    setup_kpanel
    setup_pm2
    setup_nginx
    build_frontend
    setup_firewall
    setup_fail2ban
    print_completion_summary
}

# Run installation
main "$@"
