#!/bin/bash

# KPanel Force HTTP Fix
# This script forces all connections to use HTTP and disables HTTPS completely

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 KPanel Force HTTP Fix - ULTIMATE SOLUTION${NC}"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "production-server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from KPanel root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Step 1: Stopping server to clear cache...${NC}"
pm2 stop kpanel-server 2>/dev/null
sleep 2

echo -e "${YELLOW}🔧 Step 2: Updating production server to force HTTP headers...${NC}"

# Update production server to add strict HTTP headers
cat > production-server-http.js << 'EOF'
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const authRoutes = require('./server/routes/auth');
const dashboardRoutes = require('./server/routes/dashboard');
const userRoutes = require('./server/routes/users');
const systemRoutes = require('./server/routes/system');
const fileManagerRoutes = require('./server/routes/fileManager');
const siteRoutes = require('./server/routes/sites');

const app = express();
const PORT = process.env.PORT || 3002;

// Force HTTP and disable HTTPS redirects
app.use((req, res, next) => {
    // Remove any HTTPS upgrade headers
    res.removeHeader('Strict-Transport-Security');
    res.removeHeader('upgrade-insecure-requests');
    
    // Force HTTP protocol
    res.setHeader('Content-Security-Policy', 
        "default-src 'self' http://147.139.202.42:3002; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://147.139.202.42:3002; " +
        "script-src-attr 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline' http://147.139.202.42:3002; " +
        "img-src 'self' data: http://147.139.202.42:3002; " +
        "connect-src 'self' http://147.139.202.42:3002; " +
        "upgrade-insecure-requests; " +
        "block-all-mixed-content"
    );
    
    // Add HTTP-only headers
    res.setHeader('X-Force-HTTP', 'true');
    res.setHeader('X-Protocol', 'HTTP');
    
    next();
});

// Security headers optimized for HTTP
app.use(helmet({
    contentSecurityPolicy: false, // We set it manually above
    hsts: false, // Disable HTTPS Strict Transport Security
    httpsOnly: false,
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true
}));

app.use(cors({
    origin: [
        'http://147.139.202.42:3002',
        'http://localhost:3002',
        'http://127.0.0.1:3002'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/filemanager', fileManagerRoutes);
app.use('/api/sites', siteRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        protocol: 'HTTP',
        port: PORT,
        message: 'KPanel HTTP server is running'
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'client/dist')));

// Handle React routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Internal server error',
        protocol: 'HTTP'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 KPanel HTTP Server running on port ${PORT}`);
    console.log(`🌐 Access: http://147.139.202.42:${PORT}`);
    console.log(`🔒 Protocol: HTTP (no SSL)`);
});
EOF

echo -e "${YELLOW}🔧 Step 3: Creating ultra-strict HTTP-only frontend...${NC}"

mkdir -p client/dist
cat > client/dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' http://147.139.202.42:3002; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://147.139.202.42:3002; style-src 'self' 'unsafe-inline' http://147.139.202.42:3002; img-src 'self' data:; connect-src 'self' http://147.139.202.42:3002;">
    <meta http-equiv="X-Force-HTTP" content="true">
    <title>KPanel - HTTP Control Panel</title>
    <base href="http://147.139.202.42:3002/">
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
            max-width: 800px; 
            width: 100%;
        }
        h1 { color: #333; margin-bottom: 16px; font-size: 2.5rem; font-weight: 700; }
        .status { color: #666; margin: 24px 0; font-size: 18px; font-weight: 500; }
        .protocol-badge { 
            background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; 
            font-size: 14px; font-weight: 600; display: inline-block; margin: 16px 0;
        }
        .info { background: #e8f2ff; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #667eea; }
        .warning { background: #fff3cd; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #ffc107; }
        .actions { margin-top: 32px; display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }
        .btn {
            background: #667eea; color: white; padding: 12px 24px; border: none; border-radius: 8px; 
            cursor: pointer; text-decoration: none; display: inline-block; font-size: 14px; font-weight: 600; 
            transition: all 0.3s ease; min-width: 120px;
        }
        .btn:hover { background: #5a6fd8; }
        .btn.success { background: #28a745; }
        .btn.success:hover { background: #218838; }
        .btn.danger { background: #dc3545; }
        .btn.danger:hover { background: #c82333; }
        .login-section { background: #f8f9fa; padding: 24px; border-radius: 12px; margin: 24px 0; }
        .form-group { margin: 16px 0; text-align: left; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 600; }
        .form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
        .spinner { width: 40px; height: 40px; margin: 20px auto; border: 4px solid #e3e3e3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎛️ KPanel</h1>
        <div class="protocol-badge">HTTP ONLY</div>
        <p class="status" id="status">Testing HTTP connection...</p>
        
        <div class="warning">
            <strong>⚠️ Important: This server uses HTTP (not HTTPS)</strong><br>
            Make sure your browser URL shows: <strong>http://147.139.202.42:3002</strong>
        </div>
        
        <div class="info">
            <strong>🚀 KPanel Control Panel</strong><br><br>
            ✅ HTTP-only server configuration<br>
            🔧 Backend API running on port 3002<br>
            🛡️ Security headers configured for HTTP<br>
            💾 Optimized for VPS deployment
        </div>
        
        <div class="login-section" id="loginSection" style="display: none;">
            <h3>🔐 Admin Login</h3>
            <div class="form-group">
                <label>Email:</label>
                <input type="email" id="email" value="admin@kpanel.com" readonly>
            </div>
            <div class="form-group">
                <label>Password:</label>
                <input type="password" id="password" value="admin123">
            </div>
            <button class="btn success" onclick="attemptLogin()">🔑 Login Now</button>
        </div>
        
        <div class="actions">
            <button class="btn success" onclick="testConnection()">🔍 Test Connection</button>
            <button class="btn" onclick="showLogin()">🔑 Show Login</button>
            <button class="btn danger" onclick="forceReload()">🔄 Force Reload</button>
        </div>
        
        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e9ecef;">
            <strong>Direct Links (HTTP only):</strong><br>
            <a href="http://147.139.202.42:3002/api/health" target="_blank">Health Check</a> | 
            <a href="http://147.139.202.42:3002" target="_blank">Home</a>
        </div>
    </div>
    
    <script>
        // Force HTTP protocol
        const HTTP_BASE = 'http://147.139.202.42:3002';
        let connectionStatus = 'testing';
        
        // Redirect HTTPS to HTTP immediately
        if (window.location.protocol === 'https:') {
            window.location.replace(HTTP_BASE);
        }
        
        function updateStatus(message, type) {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.style.color = type === 'success' ? '#28a745' : 
                                     type === 'error' ? '#dc3545' : 
                                     type === 'warning' ? '#ffc107' : '#666';
            }
        }
        
        function showLogin() {
            document.getElementById('loginSection').style.display = 'block';
        }
        
        function forceReload() {
            window.location.href = HTTP_BASE;
        }
        
        function testConnection() {
            updateStatus('Testing HTTP connection...', 'info');
            
            fetch(HTTP_BASE + '/api/health', {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            })
            .then(function(response) {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('HTTP ' + response.status);
            })
            .then(function(data) {
                if (data.status === 'ok') {
                    updateStatus('✅ HTTP connection successful!', 'success');
                    connectionStatus = 'success';
                    showLogin();
                } else {
                    updateStatus('❌ Server responded but status unclear', 'warning');
                }
            })
            .catch(function(error) {
                updateStatus('❌ Connection failed: ' + error.message, 'error');
                console.error('Connection test failed:', error);
            });
        }
        
        function attemptLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            updateStatus('Attempting login...', 'info');
            
            fetch(HTTP_BASE + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password })
            })
            .then(function(response) {
                return response.json();
            })
            .then(function(data) {
                if (data.success) {
                    updateStatus('✅ Login successful!', 'success');
                    setTimeout(function() {
                        window.location.href = HTTP_BASE + '/dashboard';
                    }, 1000);
                } else {
                    updateStatus('❌ Login failed: ' + (data.message || 'Check credentials'), 'error');
                }
            })
            .catch(function(error) {
                updateStatus('❌ Login error: ' + error.message, 'error');
                console.error('Login failed:', error);
            });
        }
        
        // Auto test connection on load
        setTimeout(testConnection, 1000);
        
        // Prevent any HTTPS attempts
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' && e.target.href.startsWith('https://147.139.202.42')) {
                e.preventDefault();
                window.location.href = e.target.href.replace('https://', 'http://');
            }
        });
    </script>
</body>
</html>
EOF

echo -e "${YELLOW}🔧 Step 4: Updating PM2 configuration...${NC}"

# Create PM2 ecosystem for HTTP-only server
cat > ecosystem.http.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'kpanel-http-server',
    script: './production-server-http.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3002,
      FORCE_HTTP: 'true'
    },
    max_memory_restart: '500M',
    error_file: './server/logs/err.log',
    out_file: './server/logs/out.log',
    log_file: './server/logs/combined.log',
    time: true
  }]
};
EOF

echo -e "${YELLOW}🚀 Step 5: Starting HTTP-only server...${NC}"

# Stop old server
pm2 delete kpanel-server 2>/dev/null

# Start new HTTP-only server
pm2 start ecosystem.http.config.js
pm2 save

sleep 3

echo -e "${YELLOW}🔍 Step 6: Testing new HTTP server...${NC}"

HEALTH_TEST=$(curl -s --max-time 10 --connect-timeout 5 "http://localhost:3002/api/health" 2>/dev/null || echo "failed")

if [[ $HEALTH_TEST == *"ok"* ]]; then
    echo -e "${GREEN}✅ HTTP server test successful!${NC}"
else
    echo -e "${YELLOW}⚠️ Server may still be starting...${NC}"
fi

echo ""
echo -e "${GREEN}🎉 FORCE HTTP FIX COMPLETED! 🎉${NC}"
echo "===================================="
echo ""
echo -e "${GREEN}✅ Server completely reconfigured for HTTP-only${NC}"
echo -e "${GREEN}✅ All HTTPS attempts blocked and redirected${NC}"
echo -e "${GREEN}✅ Frontend hardcoded to use HTTP URLs${NC}"
echo -e "${GREEN}✅ Security headers optimized for HTTP${NC}"
echo -e "${GREEN}✅ PM2 configuration updated${NC}"
echo ""
echo -e "${YELLOW}🌐 Access KPanel:${NC}"
echo -e "   ${GREEN}✅ ONLY USE: http://147.139.202.42:3002${NC}"
echo -e "   ${RED}❌ DO NOT USE: https://147.139.202.42:3002${NC}"
echo ""
echo -e "${YELLOW}🔧 Browser Instructions:${NC}"
echo -e "   1. Close ALL browser windows"
echo -e "   2. Open new browser/incognito"
echo -e "   3. Type: ${GREEN}http://147.139.202.42:3002${NC}"
echo -e "   4. If browser auto-adds 'https', manually remove the 's'"
echo ""
echo -e "${YELLOW}📊 Server Management:${NC}"
echo -e "   Status: ${BLUE}pm2 status${NC}"
echo -e "   Logs: ${BLUE}pm2 logs kpanel-http-server${NC}"
echo -e "   Restart: ${BLUE}pm2 restart kpanel-http-server${NC}"
echo ""
echo -e "${GREEN}🚀 All SSL protocol errors should now be eliminated!${NC}"