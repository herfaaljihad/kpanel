#!/bin/bash

# KPanel Installation Script for Ubuntu/Debian
# Usage: curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-ubuntu.sh | sudo bash

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                     KPanel Installer                        ║"
echo "║                    Ubuntu/Debian                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Check root
if [[ $EUID -ne 0 ]]; then
   echo "ERROR: This script must be run as root"
   exit 1
fi

echo "[1/8] Updating system..."
apt-get update -y

echo "[2/8] Installing dependencies..."
apt-get install -y curl wget git build-essential python3 sqlite3 nginx ufw

echo "[3/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "[4/8] Creating kpanel user..."
useradd -r -m -s /bin/bash kpanel || true

echo "[5/8] Downloading KPanel..."
mkdir -p /opt/kpanel
cd /opt/kpanel
git clone https://github.com/herfaaljihad/kpanel.git .
chown -R kpanel:kpanel /opt/kpanel

echo "[6/8] Installing KPanel..."
sudo -u kpanel npm install --production

echo "[7/8] Configuring system..."
# Environment
cp .env.example .env
JWT_SECRET=$(openssl rand -hex 32)
sed -i "s/your-super-secure-64-character-jwt-secret-key-here-change-this/$JWT_SECRET/g" .env
chown kpanel:kpanel .env
chmod 600 .env

# SystemD service
cat > /etc/systemd/system/kpanel.service << 'EOF'
[Unit]
Description=KPanel Control Panel
After=network.target

[Service]
Type=simple
Restart=always
User=kpanel
ExecStart=/usr/bin/node /opt/kpanel/production-server.js
WorkingDirectory=/opt/kpanel
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable kpanel

# Nginx proxy
cat > /etc/nginx/sites-available/kpanel << 'EOF'
server {
    listen 80;
    server_name _;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/kpanel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl restart nginx
systemctl enable nginx

# Firewall
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp

echo "[8/8] Starting KPanel..."
systemctl start kpanel

# Get server IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "your-server-ip")

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                 KPanel Installation Complete!               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "🌐 Access KPanel: http://$SERVER_IP"
echo ""
echo "📋 Service Management:"
echo "   systemctl start kpanel"
echo "   systemctl stop kpanel" 
echo "   systemctl restart kpanel"
echo "   systemctl status kpanel"
echo ""
echo "📂 Files:"
echo "   Config: /opt/kpanel/.env"
echo "   Logs:   journalctl -u kpanel -f"
echo ""
echo "✅ KPanel is ready to use!"