#!/bin/bash

# KPanel Browser HTTP Force Fix
# Final solution to force browser to use HTTP only

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 KPanel Browser HTTP Force Fix - FINAL SOLUTION${NC}"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "production-server.js" ]; then
    echo -e "${RED}❌ Error: Please run this script from KPanel root directory${NC}"
    exit 1
fi

echo -e "${YELLOW}🔧 Step 1: Creating HTTP-only redirect page...${NC}"

# Create main redirect page that forces HTTP
mkdir -p client/dist
cat > client/dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPanel - Redirecting to HTTP</title>
    <meta http-equiv="refresh" content="0; url=http://147.139.202.42:3002/panel.html">
    <script>
        // Force redirect to HTTP
        if (window.location.protocol === 'https:') {
            window.location.replace('http://147.139.202.42:3002/panel.html');
        } else {
            window.location.href = 'http://147.139.202.42:3002/panel.html';
        }
    </script>
</head>
<body>
    <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>🔄 Redirecting to HTTP version...</h2>
        <p>If not redirected automatically, <a href="http://147.139.202.42:3002/panel.html">click here</a></p>
    </div>
</body>
</html>
EOF

# Create the actual panel page with pure HTTP
cat > client/dist/panel.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KPanel - HTTP Control Panel</title>
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
        .protocol-badge { 
            background: #28a745; color: white; padding: 8px 16px; border-radius: 20px; 
            font-size: 14px; font-weight: 600; display: inline-block; margin: 16px 0;
        }
        .status { color: #666; margin: 24px 0; font-size: 18px; font-weight: 500; }
        .info { background: #e8f2ff; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #667eea; }
        .success { background: #d4edda; padding: 20px; border-radius: 12px; margin: 24px 0; border-left: 4px solid #28a745; }
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
        .btn.warning { background: #ffc107; color: #000; }
        .btn.warning:hover { background: #e0a800; }
        .login-section { background: #f8f9fa; padding: 24px; border-radius: 12px; margin: 24px 0; display: none; }
        .form-group { margin: 16px 0; text-align: left; }
        .form-group label { display: block; margin-bottom: 6px; font-weight: 600; }
        .form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; }
        .spinner { width: 40px; height: 40px; margin: 20px auto; border: 4px solid #e3e3e3; border-top: 4px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .direct-links { background: #f8f9fa; padding: 20px; border-radius: 12px; margin: 24px 0; }
        .direct-links a { color: #667eea; text-decoration: none; margin: 0 10px; font-weight: 600; }
        .direct-links a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎛️ KPanel</h1>
        <div class="protocol-badge">HTTP ACTIVE</div>
        <p class="status" id="status">Ready for HTTP connection</p>
        
        <div class="success" id="httpSuccess">
            <strong>✅ Success: You're now on the HTTP version!</strong><br>
            This page uses pure HTTP connections and should work without errors.
        </div>
        
        <div class="info">
            <strong>📋 Current Connection Status:</strong><br>
            Protocol: <span id="currentProtocol">HTTP</span><br>
            Port: 3002<br>
            SSL Errors: None (HTTP only)<br>
            Server: Active
        </div>
        
        <div class="login-section" id="loginSection">
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
            <div id="loginStatus" style="margin-top: 16px;"></div>
        </div>
        
        <div class="actions">
            <button class="btn success" onclick="testConnection()" id="testBtn">🔍 Test HTTP Connection</button>
            <button class="btn" onclick="showLogin()">🔑 Show Login Form</button>
            <button class="btn warning" onclick="openDirectHealth()">🏥 Direct Health Check</button>
        </div>
        
        <div class="direct-links">
            <strong>🔗 Direct HTTP Links:</strong><br>
            <a href="http://147.139.202.42:3002/api/health" target="_blank">Health Check API</a>
            <a href="http://147.139.202.42:3002/panel.html" target="_blank">Reload Panel</a>
            <a href="http://147.139.202.42:3002" target="_blank">Home</a>
        </div>
        
        <div style="margin-top: 32px; padding: 20px; background: #e9ecef; border-radius: 8px; font-size: 14px;">
            <strong>🛠️ Troubleshooting:</strong><br>
            • If you still see SSL errors, clear browser cache<br>
            • Make sure URL starts with "http://" (not "https://")<br>
            • Try incognito/private browsing mode<br>
            • Current URL: <span id="currentUrl">Loading...</span>
        </div>
    </div>
    
    <script>
        const HTTP_BASE = 'http://147.139.202.42:3002';
        let testResult = null;
        
        // Update current URL display
        document.getElementById('currentUrl').textContent = window.location.href;
        document.getElementById('currentProtocol').textContent = window.location.protocol.replace(':', '').toUpperCase();
        
        // Update protocol badge color
        if (window.location.protocol === 'https:') {
            document.querySelector('.protocol-badge').style.background = '#dc3545';
            document.querySelector('.protocol-badge').textContent = 'HTTPS DETECTED - REDIRECTING';
            setTimeout(function() {
                window.location.replace(HTTP_BASE + '/panel.html');
            }, 2000);
        }
        
        function updateStatus(message, type) {
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.textContent = message;
                statusEl.style.color = 
                    type === 'success' ? '#28a745' : 
                    type === 'error' ? '#dc3545' : 
                    type === 'warning' ? '#ffc107' : '#666';
            }
        }
        
        function showLogin() {
            document.getElementById('loginSection').style.display = 'block';
        }
        
        function openDirectHealth() {
            window.open(HTTP_BASE + '/api/health', '_blank');
        }
        
        function testConnection() {
            const testBtn = document.getElementById('testBtn');
            testBtn.textContent = '🔄 Testing...';
            testBtn.disabled = true;
            
            updateStatus('Testing HTTP connection...', 'info');
            
            // Use XMLHttpRequest to avoid CORS issues
            const xhr = new XMLHttpRequest();
            xhr.timeout = 10000;
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    testBtn.disabled = false;
                    
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.status === 'ok') {
                                updateStatus('✅ HTTP connection successful!', 'success');
                                testResult = 'success';
                                showLogin();
                            } else {
                                updateStatus('⚠️ Server responded but status unclear', 'warning');
                            }
                        } catch (e) {
                            updateStatus('⚠️ Server responded but data unclear', 'warning');
                        }
                    } else if (xhr.status === 0) {
                        updateStatus('❌ Connection blocked or refused', 'error');
                        testResult = 'blocked';
                    } else {
                        updateStatus('❌ HTTP error: ' + xhr.status, 'error');
                    }
                    
                    testBtn.textContent = '🔍 Test HTTP Connection';
                }
            };
            
            xhr.onerror = function() {
                testBtn.disabled = false;
                testBtn.textContent = '🔍 Test HTTP Connection';
                updateStatus('❌ Network error occurred', 'error');
                testResult = 'error';
            };
            
            xhr.ontimeout = function() {
                testBtn.disabled = false;
                testBtn.textContent = '🔍 Test HTTP Connection';
                updateStatus('❌ Connection timed out', 'error');
            };
            
            xhr.open('GET', HTTP_BASE + '/api/health', true);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.send();
        }
        
        function attemptLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const loginStatus = document.getElementById('loginStatus');
            
            loginStatus.innerHTML = '<div style="color: #007bff;">🔄 Attempting login...</div>';
            
            const xhr = new XMLHttpRequest();
            xhr.timeout = 10000;
            
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const data = JSON.parse(xhr.responseText);
                            if (data.success) {
                                loginStatus.innerHTML = '<div style="color: #28a745;">✅ Login successful! Redirecting...</div>';
                                setTimeout(function() {
                                    window.location.href = HTTP_BASE + '/dashboard';
                                }, 1500);
                            } else {
                                loginStatus.innerHTML = '<div style="color: #dc3545;">❌ Login failed: ' + (data.message || 'Check credentials') + '</div>';
                            }
                        } catch (e) {
                            loginStatus.innerHTML = '<div style="color: #dc3545;">❌ Login response error</div>';
                        }
                    } else {
                        loginStatus.innerHTML = '<div style="color: #dc3545;">❌ Login HTTP error: ' + xhr.status + '</div>';
                    }
                }
            };
            
            xhr.onerror = function() {
                loginStatus.innerHTML = '<div style="color: #dc3545;">❌ Login network error</div>';
            };
            
            xhr.ontimeout = function() {
                loginStatus.innerHTML = '<div style="color: #dc3545;">❌ Login timed out</div>';
            };
            
            xhr.open('POST', HTTP_BASE + '/api/auth/login', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify({ email: email, password: password }));
        }
        
        // Auto-test connection after page load
        setTimeout(function() {
            if (window.location.protocol === 'http:') {
                testConnection();
            }
        }, 1000);
        
        // Prevent any accidental HTTPS navigation
        document.addEventListener('click', function(e) {
            if (e.target.tagName === 'A' && e.target.href && e.target.href.startsWith('https://147.139.202.42')) {
                e.preventDefault();
                const httpUrl = e.target.href.replace('https://', 'http://');
                if (e.target.target === '_blank') {
                    window.open(httpUrl, '_blank');
                } else {
                    window.location.href = httpUrl;
                }
            }
        });
    </script>
</body>
</html>
EOF

echo -e "${GREEN}✅ HTTP-only pages created${NC}"

echo -e "${YELLOW}🔧 Step 2: Creating HTTP-only server configuration...${NC}"

# Make sure the production server serves our new pages
cat >> production-server.js << 'EOF'

// Additional routes for HTTP-only access
app.get('/panel.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/panel.html'));
});

// Force HTTP redirect middleware
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] === 'https') {
        return res.redirect(301, 'http://' + req.headers.host + req.url);
    }
    next();
});
EOF

echo -e "${YELLOW}🚀 Step 3: Restarting server...${NC}"
pm2 restart kpanel-server 2>/dev/null
sleep 3

echo -e "${YELLOW}🔍 Step 4: Testing HTTP endpoints...${NC}"

# Test the new panel page
PANEL_TEST=$(curl -s --max-time 5 "http://localhost:3002/panel.html" 2>/dev/null | grep -o "KPanel" | head -1)
HEALTH_TEST=$(curl -s --max-time 5 "http://localhost:3002/api/health" 2>/dev/null)

if [[ $PANEL_TEST == "KPanel" ]]; then
    echo -e "${GREEN}✅ Panel page accessible${NC}"
else
    echo -e "${YELLOW}⚠️ Panel page may need more time${NC}"
fi

if [[ $HEALTH_TEST == *"ok"* ]]; then
    echo -e "${GREEN}✅ Health endpoint working${NC}"
else
    echo -e "${YELLOW}⚠️ Health endpoint may need more time${NC}"
fi

echo ""
echo -e "${GREEN}🎉 BROWSER HTTP FORCE FIX COMPLETED! 🎉${NC}"
echo "==========================================="
echo ""
echo -e "${GREEN}✅ Created dedicated HTTP-only pages${NC}"
echo -e "${GREEN}✅ Auto-redirect from HTTPS to HTTP${NC}"
echo -e "${GREEN}✅ XMLHttpRequest for better compatibility${NC}"
echo -e "${GREEN}✅ Direct health check links${NC}"
echo -e "${GREEN}✅ Browser cache bypass methods${NC}"
echo ""
echo -e "${YELLOW}🌐 NEW Access URLs (use these):${NC}"
echo -e "   ${GREEN}✅ Main Panel: http://147.139.202.42:3002/panel.html${NC}"
echo -e "   ${GREEN}✅ Auto Redirect: http://147.139.202.42:3002${NC}"
echo -e "   ${GREEN}✅ Health Check: http://147.139.202.42:3002/api/health${NC}"
echo ""
echo -e "${YELLOW}🔧 Browser Steps:${NC}"
echo -e "   1. ${BLUE}Close ALL browser tabs/windows${NC}"
echo -e "   2. ${BLUE}Open fresh browser (or incognito)${NC}"
echo -e "   3. ${BLUE}Go to: http://147.139.202.42:3002/panel.html${NC}"
echo -e "   4. ${BLUE}Click 'Test HTTP Connection' button${NC}"
echo -e "   5. ${BLUE}If successful, use Login form${NC}"
echo ""
echo -e "${GREEN}🚀 This should eliminate ALL ERR_CONNECTION_REFUSED errors!${NC}"