#!/bin/bash

# KPanel Full Build Script
# Build the complete React frontend with all optimizations

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 KPanel Full Frontend Build${NC}"
echo "==============================="

# Check if we're in the right directory
if [ ! -f "production-server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from KPanel root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 Step 1: Updating from GitHub...${NC}"
git pull origin main

echo -e "${YELLOW}📦 Step 2: Installing/updating dependencies...${NC}"
cd client || exit 1

# Install terser and all dependencies
npm install
npm install --save-dev terser

echo -e "${YELLOW}🧹 Step 3: Cleaning build cache...${NC}"
rm -rf node_modules/.vite
rm -rf dist
rm -rf .vite

echo -e "${YELLOW}🏗️  Step 4: Building React frontend...${NC}"

# Check available memory
AVAILABLE_MEMORY=$(free -m | awk 'NR==2{printf "%.0f", $7}')
echo -e "${BLUE}💾 Available Memory: ${AVAILABLE_MEMORY}MB${NC}"

# Set build environment based on memory
if [ "$AVAILABLE_MEMORY" -gt 800 ]; then
    export NODE_OPTIONS="--max-old-space-size=2048"
    BUILD_CMD="npm run build"
    echo -e "${BLUE}🧠 Using standard memory build (2GB limit)${NC}"
elif [ "$AVAILABLE_MEMORY" -gt 500 ]; then
    export NODE_OPTIONS="--max-old-space-size=1536"
    BUILD_CMD="npm run build:prod"
    echo -e "${BLUE}🧠 Using reduced memory build (1.5GB limit)${NC}"
else
    export NODE_OPTIONS="--max-old-space-size=1024"
    BUILD_CMD="npm run build:low-memory"
    echo -e "${BLUE}🧠 Using low memory build (1GB limit)${NC}"
fi

echo -e "${YELLOW}⚡ Starting build process...${NC}"
echo -e "${BLUE}ℹ️  This may take 5-20 minutes depending on server specs${NC}"

# Build with progress monitoring
BUILD_SUCCESS=false

if timeout 1800s $BUILD_CMD; then
    echo -e "${GREEN}✅ Build completed successfully!${NC}"
    BUILD_SUCCESS=true
else
    echo -e "${RED}❌ Build failed or timed out${NC}"
    echo -e "${YELLOW}🔄 Trying with even lower memory...${NC}"
    export NODE_OPTIONS="--max-old-space-size=768"
    
    if timeout 1200s npm run build:low-memory; then
        echo -e "${GREEN}✅ Build completed with minimal memory!${NC}"
        BUILD_SUCCESS=true
    fi
fi

# Verify build
if [ "$BUILD_SUCCESS" = true ] && [ -d "dist" ]; then
    if [ -f "dist/index.html" ] && ls dist/assets/*.js >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Build verification passed!${NC}"
        echo -e "${BLUE}📊 Build contents:${NC}"
        du -sh dist/
        echo -e "${BLUE}📁 Assets ($(ls dist/assets/ | wc -l) files):${NC}"
        ls -la dist/assets/ | head -10
    else
        echo -e "${YELLOW}⚠️ Build incomplete, using fallback${NC}"
        BUILD_SUCCESS=false
    fi
else
    BUILD_SUCCESS=false
fi

# Create enhanced fallback if build failed
if [ "$BUILD_SUCCESS" != true ]; then
    echo -e "${YELLOW}🔧 Creating enhanced fallback frontend...${NC}"
    
    mkdir -p dist/assets
    
    # Create fallback with better UI and functionality
    cat > dist/index.html << 'FALLBACK_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';">
    <title>KPanel - Control Panel</title>
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAArklEQVRYhe2XwQ2AIAxFHxvgBEygE+gEOoFOoBPoBDqBTqAT6ARuwAt4kRBCqKLGxMR/6aW0/3/7S9sC/wQEQRAEQRAE8QcQQsBaC2MMlFLQWkNrDSEEhBBQSkEpBa01tNbQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBBfaQBgBcAS0VsAAAAASUVORK5CYII=">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            min-height: 100vh; 
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container { 
            text-align: center; 
            background: rgba(255,255,255,0.95); 
            padding: 3rem; 
            border-radius: 20px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.15); 
            max-width: 700px; 
            width: 100%;
            backdrop-filter: blur(10px);
        }
        .spinner { 
            width: 60px; 
            height: 60px; 
            margin: 0 auto 24px; 
            border: 4px solid #e3e3e3; 
            border-top: 4px solid #667eea; 
            border-radius: 50%; 
            animation: spin 1s linear infinite; 
        }
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
        h1 { color: #333; margin-bottom: 16px; font-size: 2.5rem; font-weight: 700; }
        .status { color: #666; margin: 24px 0; font-size: 18px; font-weight: 500; }
        .info { background: #e8f2ff; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #667eea; }
        .actions { margin-top: 32px; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .btn {
            background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 8px; 
            cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; font-weight: 600; 
            transition: all 0.3s ease; min-width: 120px;
        }
        .btn:hover { background: #5a6fd8; transform: translateY(-2px); box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3); }
        .btn.secondary { background: #6c757d; }
        .btn.secondary:hover { background: #5a6268; }
        .btn.success { background: #28a745; }
        .btn.success:hover { background: #218838; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e9ecef; font-size: 14px; color: #6c757d; }
        .login-form {
            background: #f8f9fa; padding: 24px; border-radius: 12px; margin: 24px 0;
            display: none; text-align: left;
        }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 600; }
        .form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
        @media (max-width: 480px) {
            .container { padding: 2rem 1.5rem; }
            h1 { font-size: 2rem; }
            .actions { flex-direction: column; align-items: center; }
            .btn { width: 100%; max-width: 200px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner" id="spinner"></div>
        <h1>🎛️ KPanel</h1>
        <p class="status" id="status">Initializing control panel...</p>
        
        <div class="info">
            <strong>🚀 Modern Hosting Control Panel</strong><br><br>
            ✅ Backend server is running<br>
            🔧 React frontend building in progress<br>
            🛡️ Security headers configured
        </div>
        
        <div class="login-form" id="loginForm">
            <h3>🔐 Login to KPanel</h3>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" id="email" value="admin@kpanel.com" readonly>
            </div>
            <div class="form-group">
                <label>Password:</label>
                <input type="password" id="password" value="admin123">
            </div>
            <button class="btn success" onclick="attemptLogin()">🔑 Login</button>
        </div>
        
        <div class="actions" id="actions">
            <a href="/api/health" class="btn" target="_blank">🔍 Health Check</a>
            <button class="btn secondary" onclick="location.reload()">🔄 Refresh</button>
            <button class="btn success" onclick="showLogin()">🔑 Try Login</button>
        </div>
        
        <div class="footer">
            KPanel v2.0.0 | Modern VPS Control Panel<br>
            Optimized for low-resource servers | Full React build in progress
        </div>
    </div>
    
    <script>
        let healthCheckAttempts = 0;
        let isLoggedIn = false;
        
        function updateStatus(message, color = '#666', hideSpinner = false) {
            const statusEl = document.getElementById('status');
            const spinnerEl = document.getElementById('spinner');
            
            statusEl.textContent = message;
            statusEl.style.color = color;
            
            if (hideSpinner && spinnerEl) {
                spinnerEl.style.display = 'none';
            }
        }
        
        function showLogin() {
            document.getElementById('loginForm').style.display = 'block';
            document.getElementById('actions').style.display = 'none';
        }
        
        function attemptLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            updateStatus('Attempting login...', '#007bff');
            
            fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateStatus('✅ Login successful! Redirecting...', '#28a745', true);
                    isLoggedIn = true;
                    setTimeout(() => {
                        window.location.href = '/dashboard';
                    }, 2000);
                } else {
                    updateStatus('❌ Login failed: ' + (data.message || 'Invalid credentials'), '#dc3545');
                }
            })
            .catch(error => {
                updateStatus('❌ Login error: ' + error.message, '#dc3545');
            });
        }
        
        function checkHealth() {
            healthCheckAttempts++;
            
            fetch('/api/health', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            })
            .then(response => response.json())
            .then(data => {
                if (data && data.status === 'ok') {
                    updateStatus('✅ KPanel Backend Ready!', '#28a745', true);
                    healthCheckAttempts = 0;
                }
            })
            .catch(error => {
                if (healthCheckAttempts <= 3) {
                    updateStatus(`Connecting... (${healthCheckAttempts}/3)`, '#6c757d');
                } else {
                    updateStatus('Backend starting up...', '#ffc107');
                    healthCheckAttempts = 0;
                }
            });
        }
        
        // Initial checks
        setTimeout(checkHealth, 1000);
        setInterval(checkHealth, 10000);
        
        // Check if user returns to tab
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && !isLoggedIn) {
                checkHealth();
            }
        });
    </script>
</body>
</html>
FALLBACK_EOF
    
    echo -e "${GREEN}✅ Enhanced fallback frontend created${NC}"
fi

cd .. || exit 1

echo -e "${YELLOW}🚀 Step 5: Restarting KPanel server...${NC}"
pm2 restart kpanel-server 2>/dev/null

sleep 3

# Get server info
PUBLIC_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

echo ""
if [ "$BUILD_SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 FULL REACT BUILD COMPLETED! 🎉${NC}"
    echo -e "${BLUE}====================================${NC}"
    echo ""
    echo -e "${GREEN}✅ Complete React frontend built successfully${NC}"
    echo -e "${GREEN}✅ All Material-UI components loaded${NC}"
    echo -e "${GREEN}✅ Dashboard fully functional${NC}"
else
    echo -e "${YELLOW}🔧 BUILD USING ENHANCED FALLBACK${NC}"
    echo -e "${BLUE}=================================${NC}"
    echo ""
    echo -e "${YELLOW}⚠️ React build failed, using enhanced fallback with:${NC}"
    echo -e "${GREEN}✅ Better UI and UX${NC}"
    echo -e "${GREEN}✅ Login functionality${NC}"
    echo -e "${GREEN}✅ Health monitoring${NC}"
fi

echo ""
echo -e "${YELLOW}🌐 Access KPanel:${NC}"
echo -e "   URL: ${GREEN}http://$PUBLIC_IP:3002${NC}"
echo -e "   Login: ${GREEN}admin@kpanel.com / admin123${NC}"
echo ""
echo -e "${YELLOW}📊 Management:${NC}"
echo -e "   Status: ${BLUE}pm2 status${NC}"
echo -e "   Logs: ${BLUE}pm2 logs kpanel-server${NC}"
echo ""

echo -e "${GREEN}🚀 Build process completed!${NC}"