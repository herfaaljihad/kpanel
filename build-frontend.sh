#!/bin/bash

# KPanel Frontend Build Script
# Use this script if initial installation build failed

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 KPanel Frontend Build Script${NC}"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "production-server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from the KPanel root directory${NC}"
    echo -e "${YELLOW}Usage: cd /path/to/kpanel && ./build-frontend.sh${NC}"
    exit 1
fi

# Check if client directory exists
if [ ! -d "client" ]; then
    echo -e "${RED}❌ Error: client directory not found${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Building KPanel frontend...${NC}"

# Navigate to client directory
cd client || {
    echo -e "${RED}❌ Failed to enter client directory${NC}"
    exit 1
}

# Check Node.js version
echo -e "${BLUE}🔍 Checking Node.js version...${NC}"
node_version=$(node --version)
echo "Node.js version: $node_version"

# Install dependencies
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
npm install

# Configure Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"

# Clear previous build
echo -e "${YELLOW}🗑️  Cleaning previous build...${NC}"
rm -rf dist

# Build with verbose output
echo -e "${YELLOW}🏗️  Building frontend...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    
    # Verify build
    if [ -f "dist/index.html" ] && ls dist/assets/*.js >/dev/null 2>&1 && ls dist/assets/*.css >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Build verification passed${NC}"
        echo -e "${BLUE}📊 Build contents:${NC}"
        ls -la dist/
        echo -e "${BLUE}📁 Assets:${NC}"
        ls -la dist/assets/
        
        # Go back to root directory
        cd .. || {
            echo -e "${RED}❌ Failed to return to root directory${NC}"
            exit 1
        }
        
        # Restart PM2
        echo -e "${YELLOW}🔄 Restarting KPanel server...${NC}"
        pm2 restart kpanel-server
        
        echo -e "${GREEN}🎉 Frontend build completed successfully!${NC}"
        echo -e "${BLUE}🌐 Access your KPanel at: http://$(hostname -I | awk '{print $1}'):3002${NC}"
        
    else
        echo -e "${RED}❌ Build verification failed - assets missing${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Build failed${NC}"
    echo -e "${YELLOW}💡 Troubleshooting tips:${NC}"
    echo "1. Check if you have enough memory (recommended: 2GB+)"
    echo "2. Try: npm cache clean --force"
    echo "3. Remove node_modules: rm -rf node_modules && npm install"
    echo "4. Check Node.js version (recommended: 16+ or 18+)"
    exit 1
fi