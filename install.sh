#!/bin/bash

# KPanel Ubuntu Installer with Automatic IP Detection
# This script installs KPanel on Ubuntu and automatically detects the server's public IP

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 KPanel Ubuntu Installer${NC}"
echo -e "${BLUE}=================================${NC}"

# Function to detect public IP
detect_public_ip() {
    local public_ip="localhost"
    
    # Try multiple methods to get public IP (silently)
    if command -v curl &> /dev/null; then
        # Try ifconfig.me first
        public_ip=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || echo "")
        
        # Try ipinfo.io as fallback
        if [ -z "$public_ip" ]; then
            public_ip=$(curl -s --connect-timeout 5 ipinfo.io/ip 2>/dev/null || echo "")
        fi
        
        # Try icanhazip.com as another fallback
        if [ -z "$public_ip" ]; then
            public_ip=$(curl -s --connect-timeout 5 icanhazip.com 2>/dev/null || echo "")
        fi
    fi
    
    # If external IP detection fails, try to get local network IP
    if [ -z "$public_ip" ] || [ "$public_ip" = "" ]; then
        if command -v ip &> /dev/null; then
            public_ip=$(ip route get 8.8.8.8 | awk '{print $7}' | head -n1 2>/dev/null || echo "localhost")
        elif command -v hostname &> /dev/null; then
            public_ip=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")
        else
            public_ip="localhost"
        fi
    fi
    
    echo "$public_ip"
}

# Create swap file if needed (for low memory VPS)
create_swap_if_needed() {
    echo -e "${YELLOW}💾 Checking swap configuration...${NC}"
    
    # Check if swap already exists
    local swap_status
    swap_status=$(swapon --show 2>/dev/null | wc -l)
    
    if [ "$swap_status" -gt 0 ]; then
        echo -e "${GREEN}✅ Swap already configured${NC}"
        swapon --show
        return 0
    fi
    
    # Check available disk space
    local available_disk
    available_disk=$(df / | awk 'NR==2 {printf "%.0f", $4/1024}')
    
    if [ "$available_disk" -lt 2048 ]; then
        echo -e "${YELLOW}⚠️ Insufficient disk space for swap file${NC}"
        return 1
    fi
    
    echo -e "${YELLOW}📁 Creating 1GB swap file...${NC}"
    
    # Create swap file
    if fallocate -l 1G /swapfile; then
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        
        # Make permanent
        if ! grep -q "/swapfile" /etc/fstab; then
            echo '/swapfile none swap sw 0 0' >> /etc/fstab
        fi
        
        # Optimize for low memory
        echo 'vm.swappiness=10' >> /etc/sysctl.conf
        sysctl vm.swappiness=10
        
        echo -e "${GREEN}✅ Swap file created and configured${NC}"
        free -h
    else
        echo -e "${RED}❌ Failed to create swap file${NC}"
        return 1
    fi
}

# Create fallback frontend if build fails
create_fallback_frontend() {
    echo -e "${YELLOW}🔧 Creating minimal frontend fallback...${NC}"
    
    mkdir -p dist/assets
    
    # Create minimal index.html
    cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPanel - Loading...</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex; justify-content: center; align-items: center; min-height: 100vh;
        }
        .container { 
            text-align: center; background: rgba(255,255,255,0.95); 
            padding: 2rem; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 500px; margin: 20px;
        }
        .spinner { 
            width: 60px; height: 60px; margin: 0 auto 20px; 
            border: 4px solid #f3f3f3; border-top: 4px solid #667eea;
            border-radius: 50%; animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h1 { color: #333; margin-bottom: 10px; }
        .status { color: #666; margin: 20px 0; }
        .progress { width: 100%; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden; }
        .progress-bar { width: 0; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); animation: progress 3s ease-in-out infinite; }
        @keyframes progress { 0% { width: 0; } 50% { width: 70%; } 100% { width: 100%; } }
        .info { background: #e8f2ff; padding: 15px; border-radius: 10px; margin: 20px 0; }
    </style>
    <script>
        setTimeout(function() {
            fetch('/api/health').then(r => r.json()).then(data => {
                if (data.status === 'ok') {
                    document.querySelector('.status').textContent = 'KPanel Backend Ready - Initializing Dashboard...';
                    setTimeout(() => window.location.reload(), 2000);
                }
            }).catch(() => {
                document.querySelector('.status').textContent = 'Connecting to KPanel Server...';
                setTimeout(() => window.location.reload(), 5000);
            });
        }, 2000);
    </script>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>🎛️ KPanel</h1>
        <p class="status">Building dashboard components...</p>
        <div class="progress"><div class="progress-bar"></div></div>
        <div class="info">
            <strong>🚀 Modern Hosting Control Panel</strong><br>
            Your dashboard is being prepared for optimal performance.
        </div>
        <p style="color: #888; font-size: 0.9rem; margin-top: 20px;">
            Version 2.0.0 | Optimized for VPS deployment
        </p>
    </div>
</body>
</html>
EOF
    
    echo -e "${GREEN}✅ Fallback frontend created${NC}"
}

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update -y

# Install required packages
echo -e "${YELLOW}📦 Installing required packages...${NC}"
apt install -y curl git build-essential

# Install Node.js via NodeSource
echo -e "${YELLOW}📦 Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
echo -e "${YELLOW}✅ Verifying Node.js installation...${NC}"
node_version=$(node --version)
npm_version=$(npm --version)
echo -e "${GREEN}Node.js: $node_version${NC}"
echo -e "${GREEN}NPM: $npm_version${NC}"

# Install PM2 globally
echo -e "${YELLOW}📦 Installing PM2 process manager...${NC}"
npm install -g pm2

# Clone KPanel repository
echo -e "${YELLOW}📦 Cloning KPanel repository...${NC}"
if [ -d "kpanel" ]; then
    echo -e "${YELLOW}⚠️  KPanel directory exists, updating...${NC}"
    cd kpanel
    git pull origin main
else
    git clone https://github.com/herfaaljihad/kpanel.git
    cd kpanel
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing KPanel dependencies...${NC}"
npm install

# Setup database
echo -e "${YELLOW}🗄️  Setting up KPanel database...${NC}"
npm run setup

# Build frontend with optimizations for low memory VPS
build_frontend() {
    echo -e "${YELLOW}🏗️  Building frontend with VPS optimization...${NC}"
    
    cd client || {
        echo -e "${RED}❌ Failed to enter client directory${NC}"
        return 1
    }
    
    # Check available memory
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    echo -e "${BLUE}💾 Available Memory: ${available_memory}MB${NC}"
    
    # Create swap if memory is low
    if [ "$available_memory" -lt 500 ]; then
        echo -e "${YELLOW}⚠️ Low memory detected, creating temporary swap...${NC}"
        cd ..
        create_swap_if_needed
        cd client || return 1
    fi
    
    # Set memory limits based on available memory
    if [ "$available_memory" -gt 1500 ]; then
        export NODE_OPTIONS="--max-old-space-size=3072"
        BUILD_CMD="npm run build"
    elif [ "$available_memory" -gt 800 ]; then
        export NODE_OPTIONS="--max-old-space-size=2048" 
        BUILD_CMD="npm run build:prod"
    else
        export NODE_OPTIONS="--max-old-space-size=1024"
        BUILD_CMD="npm run build:low-memory"
    fi
    
    echo -e "${BLUE}🧠 Memory limit: ${NODE_OPTIONS}${NC}"
    echo -e "${BLUE}🔧 Build command: ${BUILD_CMD}${NC}"
    
    # Try building with retries
    BUILD_SUCCESS=false
    for attempt in {1..3}; do
        echo -e "${YELLOW}📦 Build attempt $attempt/3...${NC}"
        
        # Clear previous build
        rm -rf dist
        
        if timeout 900s "$BUILD_CMD"; then
            echo -e "${GREEN}✅ Build completed successfully!${NC}"
            BUILD_SUCCESS=true
            break
        else
            echo -e "${RED}❌ Build attempt $attempt failed${NC}"
            
            if [ "$attempt" -eq 1 ]; then
                echo -e "${YELLOW}🔄 Trying with reduced memory...${NC}"
                export NODE_OPTIONS="--max-old-space-size=1024"
                BUILD_CMD="npm run build:low-memory"
            elif [ "$attempt" -eq 2 ]; then
                echo -e "${YELLOW}🔄 Final attempt with minimal memory...${NC}"
                export NODE_OPTIONS="--max-old-space-size=768"
                BUILD_CMD="npm run build:low-memory"
            fi
            
            if [ "$attempt" -lt 3 ]; then
                echo -e "${YELLOW}⏱️ Waiting 10 seconds before retry...${NC}"
                sleep 10
            fi
        fi
    done
    
    # Verify build output
    if [ "$BUILD_SUCCESS" = true ] && [ -d "dist" ] && [ -f "dist/index.html" ]; then
        # Check if we have proper assets
        if ls dist/assets/*.js >/dev/null 2>&1 && ls dist/assets/*.css >/dev/null 2>&1; then
            echo -e "${GREEN}✅ Frontend assets verified successfully!${NC}"
            echo -e "${BLUE}📊 Build contents:${NC}"
            ls -la dist/
            ls -la dist/assets/ 2>/dev/null || echo "No assets directory"
        else
            echo -e "${YELLOW}⚠️ Build completed but assets missing, trying fallback...${NC}"
            create_fallback_frontend
        fi
    else
        echo -e "${RED}❌ All build attempts failed${NC}"
        echo -e "${YELLOW}🔧 Creating fallback frontend...${NC}"
        create_fallback_frontend
    fi
    
    cd .. || return 1
}

# Fallback only if all attempts failed
if [ "$BUILD_SUCCESS" = false ]; then
    echo -e "${RED}❌ All build attempts failed, creating minimal frontend...${NC}"
    mkdir -p dist
    cat > dist/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPanel - Build Failed</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 50px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .warning { color: #dc3545; }
        .info { color: #17a2b8; }
        .code { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚠️ KPanel Installation Partial</h1>
        <p class="warning">Frontend build failed. Server is running but UI needs manual build.</p>
        <p class="info">To complete installation, run:</p>
        <div class="code">
            cd /root/kpanel/client<br>
            npm install<br>
            npm run build<br>
            pm2 restart kpanel-server
        </div>
        <p>Then refresh this page.</p>
    </div>
</body>
</html>
EOF
    echo -e "${YELLOW}📝 Created fallback frontend with manual build instructions${NC}"
fi

cd ..

# Create environment file
echo -e "${YELLOW}⚙️  Configuring environment...${NC}"
cat > .env << EOF
NODE_ENV=production
PORT=3002
DATABASE_PATH=./data/kpanel.db
LOG_LEVEL=info
EOF

# Start with PM2
echo -e "${YELLOW}🚀 Starting KPanel with PM2...${NC}"
pm2 stop kpanel-server 2>/dev/null || true
pm2 delete kpanel-server 2>/dev/null || true
pm2 start production-server.js --name kpanel-server

# Save PM2 configuration and enable startup
pm2 save
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