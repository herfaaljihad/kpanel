# KPanel Low Memory Installation Guide

This guide provides alternative installation methods for servers with limited memory (less than 1GB RAM).

## Memory Requirements

- **Recommended**: 2GB+ RAM for smooth installation
- **Minimum**: 512MB RAM with swap space
- **Critical**: 256MB RAM (may require pre-built client)

## Low Memory Installation Options

### Option 1: Standard Install with Memory Optimization

The installer automatically detects available memory and adjusts build settings:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-kpanel.sh)
```

### Option 2: Manual Memory Optimization

If the standard installer fails, try these manual steps:

1. **Create Swap Space First:**

```bash
# Create 1GB swap file
sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make it permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

2. **Run Installation:**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-kpanel.sh)
```

### Option 3: Docker Installation (Recommended for Low Memory)

Docker installation uses pre-built images and requires less memory:

```bash
# Install Docker if not already installed
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# Download KPanel
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel

# Start with Docker Compose
sudo docker-compose -f docker-compose.production.yml up -d
```

### Option 4: Manual Installation with Pre-built Client

If all else fails, install manually:

1. **Install Node.js and dependencies:**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx sqlite3
```

2. **Download and setup KPanel:**

```bash
sudo useradd -r -s /bin/false kpanel
sudo mkdir -p /usr/local/kpanel
cd /tmp
git clone https://github.com/herfaaljihad/kpanel.git
sudo cp -r kpanel/* /usr/local/kpanel/
sudo chown -R kpanel:kpanel /usr/local/kpanel
```

3. **Install server dependencies only:**

```bash
cd /usr/local/kpanel
sudo -u kpanel npm install --production --omit=dev
```

4. **Download pre-built client (if available):**

```bash
cd /usr/local/kpanel
curl -fsSL https://github.com/herfaaljihad/kpanel/releases/latest/download/client-dist.tar.gz | sudo -u kpanel tar -xz -C client/
```

5. **Configure and start service:**

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -hex 32)
SESSION_SECRET=$(openssl rand -hex 32)

# Create configuration
sudo mkdir -p /usr/local/kpanel/conf
sudo tee /usr/local/kpanel/conf/.env << EOF
PORT=2222
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DATABASE_PATH=/usr/local/kpanel/database/kpanel.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=$(openssl rand -base64 12)
NODE_ENV=production
EOF

# Create systemd service
sudo tee /etc/systemd/system/kpanel.service << EOF
[Unit]
Description=KPanel Control Panel
After=network.target

[Service]
Type=simple
User=kpanel
Group=kpanel
WorkingDirectory=/usr/local/kpanel
ExecStart=/usr/bin/node kpanel-server-enterprise.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Start service
sudo systemctl daemon-reload
sudo systemctl enable kpanel
sudo systemctl start kpanel
```

## Memory Optimization Tips

1. **Enable Swap:** Always have at least 1GB swap on low-memory systems
2. **Close Other Services:** Stop unnecessary services during installation
3. **Use Docker:** Pre-built containers require less memory
4. **Upgrade Server:** Consider upgrading to at least 1GB RAM for better performance

## Troubleshooting

### "JavaScript heap out of memory" Error

This indicates insufficient memory during the build process. Solutions:

1. Add swap space (see Option 2 above)
2. Use Docker installation
3. Upgrade server memory
4. Use manual installation with pre-built client

### Build Process Hangs

If the build process appears to hang:

1. Check available memory: `free -h`
2. Monitor swap usage: `swapon -s`
3. Kill hanging processes: `sudo pkill -f "vite build"`
4. Try Docker installation instead

### Service Won't Start

Check system resources:

```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check service status
sudo systemctl status kpanel

# Check logs
sudo journalctl -u kpanel -f
```

## Alternative Servers

If your current server is too limited, consider these alternatives:

- **DigitalOcean**: $6/month droplet with 1GB RAM
- **Vultr**: $6/month instance with 1GB RAM
- **Linode**: $5/month nanode with 1GB RAM
- **AWS**: t3.micro with 1GB RAM (free tier eligible)

## Support

If you continue to experience issues, please:

1. Check the main [Installation Guide](README-INSTALLATION.md)
2. Review server specifications and upgrade if needed
3. Consider using Docker installation for consistent results
4. Open an issue on GitHub with your system specs and error logs
