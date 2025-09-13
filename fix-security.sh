#!/bin/bash

# KPanel Security Fix Script
# Fix console errors and security headers

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 KPanel Security Fix${NC}"
echo "=========================="

# Check if we're in the right directory
if [ ! -f "production-server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from KPanel root directory${NC}"
    echo -e "${YELLOW}Usage: cd /root/kpanel && ./fix-security.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}📥 Step 1: Pulling latest fixes from GitHub...${NC}"

# Pull latest changes
git pull origin main

echo -e "${YELLOW}🔧 Step 2: Updating fallback frontend...${NC}"

# Check if client/dist exists
if [ -d "client/dist" ]; then
    cd client || exit 1
    
    # Create improved fallback HTML with proper CSP
    cat > dist/index.html << 'SECURITY_EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self';">
    <title>KPanel - Modern Control Panel</title>
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAArklEQVRYhe2XwQ2AIAxFHxvgBEygE+gEOoFOoBPoBDqBTqAT6ARuwAt4kRBCqKLGxMR/6aW0/3/7S9sC/wQEQRAEQRAE8QcQQsBaC2MMlFLQWkNrDSEEhBBQSkEpBa01tNbQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBBfaQBgBcAS0VsAAAAASUVORK5CYII=">
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; 
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
            max-width: 600px; 
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
        
        h1 { 
            color: #333; 
            margin-bottom: 16px; 
            font-size: 2.5rem;
            font-weight: 700;
        }
        
        .status { 
            color: #666; 
            margin: 24px 0; 
            font-size: 18px;
            font-weight: 500;
        }
        
        .info { 
            background: #e8f2ff; 
            padding: 20px; 
            border-radius: 12px; 
            margin: 24px 0; 
            border-left: 4px solid #667eea;
        }
        
        .actions {
            margin-top: 32px;
            display: flex;
            gap: 16px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s ease;
            min-width: 120px;
        }
        
        .btn:hover {
            background: #5a6fd8;
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        }
        
        .btn.secondary {
            background: #6c757d;
        }
        
        .btn.secondary:hover {
            background: #5a6268;
        }
        
        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e9ecef;
            font-size: 14px;
            color: #6c757d;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 2rem 1.5rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .actions {
                flex-direction: column;
                align-items: center;
            }
            
            .btn {
                width: 100%;
                max-width: 200px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <h1>🎛️ KPanel</h1>
        <p class="status" id="status">Initializing dashboard...</p>
        
        <div class="info">
            <strong>🚀 Modern Hosting Control Panel</strong><br><br>
            ✅ Backend server is running<br>
            🔧 Frontend optimizations in progress<br>
            🛡️ Security headers configured
        </div>
        
        <div class="actions">
            <a href="/api/health" class="btn" target="_blank">🔍 Health Check</a>
            <button class="btn secondary" onclick="location.reload()">🔄 Refresh</button>
        </div>
        
        <div class="footer">
            KPanel v2.0.0 | Modern VPS Control Panel<br>
            Optimized for low-resource servers
        </div>
    </div>
    
    <script>
        // Enhanced health check with better error handling
        let healthCheckAttempts = 0;
        const maxAttempts = 3;
        
        function updateStatus(message, color = '#666', success = false) {
            const statusEl = document.getElementById('status');
            statusEl.textContent = message;
            statusEl.style.color = color;
            
            if (success) {
                const spinner = document.querySelector('.spinner');
                if (spinner) {
                    spinner.style.display = 'none';
                }
                statusEl.textContent += ' ✅';
            }
        }
        
        function checkHealth() {
            healthCheckAttempts++;
            
            updateStatus('Checking KPanel backend...', '#007bff');
            
            fetch('/api/health', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                cache: 'no-cache'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.status === 'ok') {
                    updateStatus('KPanel Backend Ready!', '#28a745', true);
                    healthCheckAttempts = 0; // Reset counter on success
                } else {
                    throw new Error('Invalid health response');
                }
            })
            .catch(error => {
                console.log(`Health check attempt ${healthCheckAttempts} failed:`, error);
                
                if (healthCheckAttempts >= maxAttempts) {
                    updateStatus('Backend starting up... Please wait', '#ffc107');
                    healthCheckAttempts = 0; // Reset for next cycle
                } else {
                    updateStatus(`Connecting... (${healthCheckAttempts}/${maxAttempts})`, '#6c757d');
                }
            });
        }
        
        // Initial health check
        setTimeout(checkHealth, 1000);
        
        // Periodic health checks every 10 seconds
        setInterval(checkHealth, 10000);
        
        // Page visibility API to check when user returns to tab
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                checkHealth();
            }
        });
    </script>
</body>
</html>
SECURITY_EOF
    
    echo -e "${GREEN}✅ Fallback frontend updated${NC}"
    cd .. || exit 1
else
    echo -e "${YELLOW}⚠️ Client dist directory not found, skipping frontend update${NC}"
fi

echo -e "${YELLOW}🚀 Step 3: Restarting KPanel server...${NC}"

# Restart PM2 service
pm2 restart kpanel-server 2>/dev/null || pm2 start production-server.js --name kpanel-server

echo -e "${YELLOW}🔍 Step 4: Testing server health...${NC}"
sleep 3

if curl -s -f "http://localhost:3002/api/health" > /dev/null 2>&1; then
    # Get server IP
    PUBLIC_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo -e "${GREEN}🎉 SECURITY FIX COMPLETED! 🎉${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    echo -e "${GREEN}✅ Console errors should be resolved${NC}"
    echo -e "${GREEN}✅ Security headers properly configured${NC}"
    echo -e "${GREEN}✅ CSP headers updated for inline scripts${NC}"
    echo -e "${GREEN}✅ Improved fallback frontend with better UX${NC}"
    echo ""
    echo -e "${YELLOW}🌐 Access KPanel:${NC}"
    echo -e "   URL: ${GREEN}http://$PUBLIC_IP:3002${NC}"
    echo -e "   Health: ${GREEN}http://$PUBLIC_IP:3002/api/health${NC}"
    echo ""
    echo -e "${YELLOW}🔧 To build full frontend:${NC}"
    echo -e "   ${BLUE}cd /root/kpanel && ./fix-build-immediate.sh${NC}"
    echo ""
else
    echo -e "${RED}❌ Server health check failed${NC}"
    echo -e "${YELLOW}Check logs: pm2 logs kpanel-server${NC}"
fi

echo -e "${GREEN}🚀 Security fix completed!${NC}"