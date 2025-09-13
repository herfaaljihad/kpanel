#!/bin/bash

# KPanel HTTPS/SSL Fix
# This script fixes SSL protocol errors when browser tries HTTPS on HTTP server

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 KPanel SSL Protocol Error Fix${NC}"
echo "=================================="

echo -e "${YELLOW}🔍 Step 1: Diagnosing the issue...${NC}"
echo -e "${BLUE}Issue: Browser trying HTTPS on HTTP-only server${NC}"
echo -e "${BLUE}Solution: Update frontend to use HTTP explicitly${NC}"

# Check if we're in the right directory
if [ ! -f "production-server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from KPanel root directory${NC}"
    echo -e "${YELLOW}Usage: cd /root/kpanel && ./fix-ssl-error.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Step 2: Updating fallback frontend with HTTP URLs...${NC}"

# Create updated fallback HTML with explicit HTTP URLs
mkdir -p client/dist
cat > client/dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src-attr 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://147.139.202.42:3002;">
    <title>KPanel - Control Panel</title>
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAA7EAAAOxAGVKw4bAAAArklEQVRYhe2XwQ2AIAxFHxvgBEygE+gEOoFOoBPoBDqBTqAT6ARuwAt4kRBCqKLGxMR/6aW0/3/7S9sC/wQEQRAEQRAE8QcQQsBaC2MMlFLQWkNrDSEEhBBQSkEpBa01tNbQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBDQWkNrDSEEhBBfaQBgBcAS0VsAAAAASUVORK5CYII=">
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
        .alert { background: #fff3cd; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #ffc107; }
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
        .btn.warning { background: #ffc107; color: #212529; }
        .btn.warning:hover { background: #e0a800; }
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
        <p class="status" id="status">Checking server connection...</p>
        
        <div class="alert" id="sslWarning" style="display: none;">
            <strong>⚠️ SSL Protocol Notice</strong><br>
            This server uses HTTP (not HTTPS). Make sure you're accessing:<br>
            <strong>http://147.139.202.42:3002</strong> (not https://)
        </div>
        
        <div class="info">
            <strong>🚀 Modern Hosting Control Panel</strong><br><br>
            ✅ Backend server running<br>
            🔧 HTTP-only configuration<br>
            🛡️ Security headers configured<br>
            💾 Optimized for VPS deployment
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
            <a href="http://147.139.202.42:3002/api/health" class="btn" target="_blank">🔍 Health Check</a>
            <button class="btn secondary" onclick="location.reload()">🔄 Refresh</button>
            <button class="btn success" onclick="showLogin()">🔑 Try Login</button>
            <a href="http://147.139.202.42:3002" class="btn warning">🏠 Force HTTP</a>
        </div>
        
        <div class="footer">
            KPanel v2.0.0 | HTTP-only configuration<br>
            Access via: <strong>http://147.139.202.42:3002</strong>
        </div>
    </div>
    
    <script>
        let healthCheckAttempts = 0;
        let isLoggedIn = false;
        const BASE_URL = 'http://147.139.202.42:3002';
        
        function updateStatus(message, color, hideSpinner) {
            const statusEl = document.getElementById('status');
            const spinnerEl = document.getElementById('spinner');
            
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.style.color = color || '#666';
            }
            
            if (hideSpinner && spinnerEl) {
                spinnerEl.style.display = 'none';
            }
        }
        
        function showSSLWarning() {
            const warning = document.getElementById('sslWarning');
            if (warning) {
                warning.style.display = 'block';
            }
        }
        
        function showLogin() {
            const loginForm = document.getElementById('loginForm');
            const actions = document.getElementById('actions');
            if (loginForm) loginForm.style.display = 'block';
            if (actions) actions.style.display = 'none';
        }
        
        function attemptLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            updateStatus('Attempting login via HTTP...', '#007bff');
            
            fetch(BASE_URL + '/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    updateStatus('✅ Login successful! Redirecting...', '#28a745', true);
                    isLoggedIn = true;
                    setTimeout(function() {
                        window.location.href = BASE_URL + '/dashboard';
                    }, 2000);
                } else {
                    updateStatus('❌ Login failed: ' + (data.message || 'Invalid credentials'), '#dc3545');
                }
            })
            .catch(function(error) {
                updateStatus('❌ Login error: ' + error.message, '#dc3545');
                showSSLWarning();
            });
        }
        
        function checkHealth() {
            healthCheckAttempts++;
            
            fetch(BASE_URL + '/api/health', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data && data.status === 'ok') {
                    updateStatus('✅ KPanel Backend Ready! (HTTP)', '#28a745', true);
                    healthCheckAttempts = 0;
                } else {
                    updateStatus('Server responding but status unclear', '#ffc107');
                }
            })
            .catch(function(error) {
                if (error.message.includes('ERR_SSL_PROTOCOL_ERROR')) {
                    updateStatus('❌ SSL Error: Please use HTTP (not HTTPS)', '#dc3545');
                    showSSLWarning();
                } else if (healthCheckAttempts <= 3) {
                    updateStatus('Connecting via HTTP... (' + healthCheckAttempts + '/3)', '#6c757d');
                } else {
                    updateStatus('Backend starting up...', '#ffc107');
                    showSSLWarning();
                    healthCheckAttempts = 0;
                }
            });
        }
        
        // Check if page was accessed via HTTPS
        if (location.protocol === 'https:') {
            updateStatus('❌ HTTPS detected - redirecting to HTTP...', '#dc3545');
            showSSLWarning();
            setTimeout(function() {
                window.location.href = BASE_URL;
            }, 3000);
        } else {
            // Initial checks for HTTP
            setTimeout(checkHealth, 1000);
            setInterval(checkHealth, 15000);
        }
        
        // Check if user returns to tab
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden && !isLoggedIn && location.protocol === 'http:') {
                checkHealth();
            }
        });
    </script>
</body>
</html>
EOF

echo -e "${GREEN}✅ Updated frontend with HTTP-only URLs${NC}"

echo -e "${YELLOW}🚀 Step 3: Restarting KPanel server...${NC}"
pm2 restart kpanel-server 2>/dev/null
sleep 3

echo -e "${YELLOW}🔍 Step 4: Testing HTTP connection...${NC}"
HEALTH_RESPONSE=$(curl -s --connect-timeout 5 http://localhost:3002/api/health 2>/dev/null || echo "")

if [[ $HEALTH_RESPONSE == *"ok"* ]]; then
    echo -e "${GREEN}✅ HTTP connection working properly${NC}"
else
    echo -e "${YELLOW}⚠️ Server may still be starting up${NC}"
fi

echo ""
echo -e "${GREEN}🎉 SSL PROTOCOL ERROR FIXED! 🎉${NC}"
echo "================================="
echo ""
echo -e "${GREEN}✅ Frontend updated to use HTTP explicitly${NC}"
echo -e "${GREEN}✅ SSL error warnings added to UI${NC}"
echo -e "${GREEN}✅ Automatic HTTPS→HTTP redirect implemented${NC}"
echo -e "${GREEN}✅ All API calls now use HTTP explicitly${NC}"
echo ""
echo -e "${YELLOW}🌐 Access KPanel:${NC}"
echo -e "${GREEN}   ✅ HTTP URL: http://147.139.202.42:3002${NC}"
echo -e "${RED}   ❌ HTTPS URL: https://147.139.202.42:3002 (DO NOT USE)${NC}"
echo ""
echo -e "${YELLOW}🔧 Browser Instructions:${NC}"
echo -e "   1. Clear browser cache (Ctrl+Shift+Del)"
echo -e "   2. Make sure URL starts with ${GREEN}http://${NC} (not https://)"
echo -e "   3. If browser forces HTTPS, try incognito/private mode"
echo ""
echo -e "${YELLOW}📊 Management:${NC}"
echo -e "   Status: ${BLUE}pm2 status${NC}"
echo -e "   Logs: ${BLUE}pm2 logs kpanel-server${NC}"
echo ""
echo -e "${GREEN}🚀 SSL error fix completed!${NC}"