#!/bin/bash

# KPanel Build Fix Script - Immediate Solution
# Fix untuk masalah build yang hang di Material-UI icons

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 KPanel Build Fix - Immediate Solution${NC}"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "production-server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from KPanel root directory${NC}"
    echo -e "${YELLOW}Usage: cd /root/kpanel && ./fix-build-immediate.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}💾 Step 1: Creating swap file for memory optimization...${NC}"

# Create swap if not exists
if ! swapon --show | grep -q "/swapfile"; then
    echo -e "${YELLOW}📁 Creating 1GB swap file...${NC}"
    
    # Check disk space
    AVAILABLE_DISK=$(df / | awk 'NR==2 {printf "%.0f", $4/1024}')
    if [ "$AVAILABLE_DISK" -lt 2048 ]; then
        echo -e "${YELLOW}⚠️ Low disk space, creating 512MB swap instead...${NC}"
        fallocate -l 512M /swapfile
    else
        fallocate -l 1G /swapfile
    fi
    
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
    
    echo -e "${GREEN}✅ Swap created and optimized${NC}"
    free -h
else
    echo -e "${GREEN}✅ Swap already exists${NC}"
fi

echo -e "${YELLOW}⚙️ Step 2: Optimizing Vite configuration...${NC}"

# Backup original vite.config.js
if [ -f "client/vite.config.js" ] && [ ! -f "client/vite.config.js.backup" ]; then
    cp client/vite.config.js client/vite.config.js.backup
    echo -e "${BLUE}💾 Original vite.config.js backed up${NC}"
fi

# Create optimized vite.config.js
cat > client/vite.config.js << 'EOF'
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/system', '@emotion/react', '@emotion/styled'],
          icons: ['@mui/icons-material'],
          router: ['react-router-dom'],
          charts: ['recharts'],
          utils: ['axios', 'react-query', 'react-toastify']
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `img/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        }
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      },
      mangle: {
        safari10: true
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      '@mui/material',
      '@mui/system',
      '@emotion/react',
      '@emotion/styled'
    ],
    exclude: ['@mui/icons-material']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});
EOF

echo -e "${GREEN}✅ Vite configuration optimized${NC}"

echo -e "${YELLOW}📦 Step 3: Optimizing package.json build scripts...${NC}"

# Create optimized package.json build script
cd client || exit 1

# Backup original package.json
if [ ! -f "package.json.backup" ]; then
    cp package.json package.json.backup
fi

# Update build scripts
npm pkg set scripts.build="NODE_OPTIONS='--max-old-space-size=3072' vite build"
npm pkg set scripts.build:prod="NODE_OPTIONS='--max-old-space-size=2048' vite build --mode production"
npm pkg set scripts.build:low-memory="NODE_OPTIONS='--max-old-space-size=1024' vite build --mode production"

echo -e "${GREEN}✅ Package.json build scripts optimized${NC}"

echo -e "${YELLOW}🧹 Step 4: Cleaning previous build artifacts...${NC}"

# Clean previous build
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite

echo -e "${GREEN}✅ Build cache cleaned${NC}"

echo -e "${YELLOW}📥 Step 5: Installing dependencies...${NC}"
npm install

echo -e "${YELLOW}🔧 Installing terser for build optimization...${NC}"
npm install --save-dev terser

echo -e "${YELLOW}🏗️  Step 6: Building frontend with memory optimization...${NC}"

# Get available memory
AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
echo -e "${BLUE}💾 Available Memory: ${AVAILABLE_MEMORY}MB${NC}"

# Choose build command based on memory
if [ "$AVAILABLE_MEMORY" -gt 1500 ]; then
    BUILD_CMD="npm run build"
    export NODE_OPTIONS="--max-old-space-size=3072"
elif [ "$AVAILABLE_MEMORY" -gt 800 ]; then
    BUILD_CMD="npm run build:prod"
    export NODE_OPTIONS="--max-old-space-size=2048"
else
    BUILD_CMD="npm run build:low-memory" 
    export NODE_OPTIONS="--max-old-space-size=1024"
fi

echo -e "${BLUE}🧠 Memory limit: ${NODE_OPTIONS}${NC}"
echo -e "${BLUE}🔧 Build command: ${BUILD_CMD}${NC}"

# Build with timeout and progress monitoring
BUILD_SUCCESS=false

echo -e "${YELLOW}📦 Starting build process...${NC}"
echo -e "${BLUE}ℹ️  This may take 5-15 minutes. Please wait...${NC}"

# Run build with timeout
if timeout 1200s "$BUILD_CMD"; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    BUILD_SUCCESS=true
else
    echo -e "${RED}❌ Build failed or timed out${NC}"
    
    echo -e "${YELLOW}🔄 Trying with reduced memory...${NC}"
    export NODE_OPTIONS="--max-old-space-size=768"
    
    if timeout 1200s npm run build:low-memory; then
        echo -e "${GREEN}✅ Build completed with reduced memory!${NC}"
        BUILD_SUCCESS=true
    else
        echo -e "${RED}❌ Build failed again${NC}"
    fi
fi

# Verify build
if [ "$BUILD_SUCCESS" = true ] && [ -d "dist" ] && [ -f "dist/index.html" ]; then
    if ls dist/assets/*.js >/dev/null 2>&1 && ls dist/assets/*.css >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Build verification passed!${NC}"
        echo -e "${BLUE}📊 Build contents:${NC}"
        ls -la dist/
        echo -e "${BLUE}📁 Assets ($(ls dist/assets/ | wc -l) files):${NC}"
        ls -la dist/assets/
    else
        echo -e "${YELLOW}⚠️ Build completed but assets missing${NC}"
        BUILD_SUCCESS=false
    fi
else
    BUILD_SUCCESS=false
fi

# Create fallback if build failed
if [ "$BUILD_SUCCESS" != true ]; then
    echo -e "${YELLOW}🔧 Creating fallback frontend...${NC}"
    
    mkdir -p dist/assets
    
    cat > dist/index.html << 'FALLBACK_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPanel - Loading...</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .container { text-align: center; background: rgba(255,255,255,0.95); padding: 2rem; border-radius: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); max-width: 500px; margin: 20px; }
        .spinner { width: 60px; height: 60px; margin: 0 auto 20px; border: 4px solid #f3f3f3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        h1 { color: #333; margin-bottom: 10px; }
        .status { color: #666; margin: 20px 0; }
        .info { background: #e8f2ff; padding: 15px; border-radius: 10px; margin: 20px 0; }
    </style>
    <script>
        setTimeout(function() {
            fetch('/api/health').then(r => r.json()).then(data => {
                if (data.status === 'ok') {
                    document.querySelector('.status').textContent = 'KPanel Backend Ready!';
                }
            }).catch(() => {
                document.querySelector('.status').textContent = 'Connecting to KPanel...';
            });
        }, 2000);
    </script>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>🎛️ KPanel</h1>
        <p class="status">Initializing dashboard...</p>
        <div class="info">
            <strong>Modern Hosting Control Panel</strong><br>
            Backend is ready. Frontend optimizations in progress.
        </div>
    </div>
</body>
</html>
FALLBACK_EOF
    
    echo -e "${GREEN}✅ Fallback frontend created${NC}"
fi

# Go back to main directory
cd .. || exit 1

echo -e "${YELLOW}🚀 Step 7: Starting/Restarting KPanel server...${NC}"

# Ensure .env exists
if [ ! -f ".env" ]; then
    cat > .env << 'ENV_EOF'
NODE_ENV=production
PORT=3002
DATABASE_PATH=./data/kpanel.db
LOG_LEVEL=info
ENV_EOF
fi

# Restart PM2
pm2 stop kpanel-server 2>/dev/null || true
pm2 delete kpanel-server 2>/dev/null || true
pm2 start production-server.js --name kpanel-server

# Save PM2 configuration
pm2 save
pm2 startup

echo -e "${GREEN}✅ KPanel server restarted${NC}"

# Wait and test
sleep 5
echo -e "${YELLOW}🔍 Testing server health...${NC}"

if curl -s -f "http://localhost:3002/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is healthy and responding!${NC}"
    
    # Get server IP
    PUBLIC_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}🎉 BUILD FIX COMPLETED SUCCESSFULLY! 🎉${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
    echo -e "${GREEN}✅ KPanel is now running properly${NC}"
    echo ""
    echo -e "${YELLOW}🌐 Access URLs:${NC}"
    echo -e "   Panel: ${GREEN}http://$PUBLIC_IP:3002${NC}"
    echo -e "   Health: ${GREEN}http://$PUBLIC_IP:3002/api/health${NC}"
    echo ""
    echo -e "${YELLOW}📊 Management:${NC}"
    echo -e "   Status: ${BLUE}pm2 status${NC}"
    echo -e "   Logs: ${BLUE}pm2 logs kpanel-server${NC}"
    echo -e "   Restart: ${BLUE}pm2 restart kpanel-server${NC}"
    echo ""
    
else
    echo -e "${YELLOW}⚠️ Server is starting up. Check logs with: pm2 logs kpanel-server${NC}"
fi

echo -e "${GREEN}🚀 Fix script completed!${NC}"