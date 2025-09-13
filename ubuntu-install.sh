#!/bin/bash
# KPanel Ubuntu Installation Script

echo "🚀 KPanel Ubuntu Server Setup Script"
echo "======================================"

# Update system packages
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js and npm
echo "📦 Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs npm

# Install PM2 globally
echo "📦 Installing PM2 process manager..."
npm install -g pm2

# Remove existing directory if it exists
echo "🧹 Cleaning up existing installation..."
rm -rf /root/kpanel

# Clone the repository
echo "📥 Cloning KPanel repository..."
cd /root || exit
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel || exit

# Install dependencies
echo "📦 Installing project dependencies..."
npm install

# Build frontend
echo "🔨 Building frontend..."
cd client || exit
npm install
npm run build
cd ..

# Set up environment
echo "⚙️  Setting up environment..."
cp .env.example .env 2>/dev/null || echo "# KPanel Environment" > .env
echo "NODE_ENV=production" >> .env
echo "PORT=3002" >> .env

# Create systemd service
echo "🔧 Creating systemd service..."
cat > /etc/systemd/system/kpanel.service << EOL
[Unit]
Description=KPanel Web Control Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/kpanel
ExecStart=/usr/bin/node production-server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002

[Install]
WantedBy=multi-user.target
EOL

# Enable and start service
systemctl daemon-reload
systemctl enable kpanel
systemctl start kpanel

echo ""
echo "✅ KPanel Installation Complete!"
echo ""
echo "📊 Service Status:"
systemctl status kpanel --no-pager -l

echo ""
echo "🌐 Access URLs:"
echo "   Local:  http://localhost:3002"
echo "   Public: http://172.19.14.85:3002"
echo ""
echo "🔧 Management Commands:"
echo "   systemctl start kpanel    # Start service"
echo "   systemctl stop kpanel     # Stop service"
echo "   systemctl restart kpanel  # Restart service"
echo "   systemctl status kpanel   # Check status"
echo "   journalctl -u kpanel -f   # View logs"
echo ""
echo "🚀 KPanel is now ready for production use!"