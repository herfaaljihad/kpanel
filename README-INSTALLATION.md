# KPanel - DirectAdmin Alternative Control Panel

🚀 **Enterprise-ready web control panel with DirectAdmin-style installation**

## Quick Installation (Like DirectAdmin)

### One-Line Installation (Recommended)

```bash
# Linux/Unix - Auto-detection and installation
bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-kpanel.sh)

# Docker Installation (Fastest)
bash <(curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/quick-install.sh)
```

### Windows Installation

```cmd
# Download and run Windows installer
powershell -Command "Invoke-WebRequest https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-kpanel.bat -OutFile install-kpanel.bat; ./install-kpanel.bat"
```

## Installation Methods

### 🐳 Docker Installation (Fastest - 2 minutes)

**Requirements:** Docker and Docker Compose

```bash
# Quick Docker setup
mkdir /opt/kpanel && cd /opt/kpanel
curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/docker-compose.production.yml -o docker-compose.yml
docker-compose up -d

# Access: http://your-server-ip:2222
```

### 🖥️ Native Installation (Full Control)

**Supported OS:** Ubuntu 20.04+, Debian 11+, CentOS 8+, Rocky Linux 8+

```bash
# Full system installation
curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-kpanel.sh | bash

# Access: http://your-server-ip:2222
# Admin credentials saved in: /usr/local/kpanel/conf/setup.txt
```

### 🪟 Windows Installation

**Requirements:** Windows 10+, Node.js 18+

```batch
# Download repository
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel

# Run Windows installer (as Administrator)
install-kpanel.bat

# Access: http://localhost:2222
```

## Features

- ✅ **DirectAdmin-style Installation**: One command setup
- ✅ **Auto-Configuration**: Database, users, and services auto-created
- ✅ **Multi-Platform**: Linux, Windows, Docker support
- ✅ **Enterprise Security**: JWT authentication, CORS protection
- ✅ **Service Integration**: Systemd, PM2, Windows Service support
- ✅ **Production Ready**: Logging, monitoring, auto-restart
- ✅ **Web Interface**: Modern React-based control panel

## Default Access

After installation, KPanel is accessible at:

- **URL:** `http://your-server-ip:2222`
- **Username:** `admin@kpanel.local`
- **Password:** (Auto-generated, saved in setup.txt)

## Service Management

### Linux (SystemD)
```bash
systemctl start kpanel    # Start service
systemctl stop kpanel     # Stop service  
systemctl restart kpanel  # Restart service
systemctl status kpanel   # Check status
journalctl -u kpanel -f   # View logs
```

### Linux (PM2)
```bash
pm2 start ecosystem.config.json --env production
pm2 stop kpanel
pm2 restart kpanel
pm2 logs kpanel
```

### Docker
```bash
docker-compose up -d      # Start services
docker-compose down       # Stop services
docker-compose logs -f    # View logs
docker-compose pull && docker-compose up -d  # Update
```

### Windows
```batch
# Service (if NSSM installed)
net start KPanel
net stop KPanel

# Manual
start-kpanel.bat
```

## Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `kpanel.conf` | `/usr/local/kpanel/conf/` | Main configuration |
| `setup.txt` | `/usr/local/kpanel/conf/` | Admin credentials |
| `.env` | `/usr/local/kpanel/` | Environment variables |
| Database | `/usr/local/kpanel/database/` | SQLite database |
| Logs | `/var/log/kpanel/` | Application logs |

## System Requirements

### Minimum
- **Memory:** 1GB RAM
- **Storage:** 5GB free space
- **OS:** Ubuntu 20.04+, Debian 11+, CentOS 8+, Windows 10+

### Recommended
- **Memory:** 2GB+ RAM
- **Storage:** 20GB+ free space
- **Network:** Public IP for remote access
- **SSL:** Valid SSL certificate for HTTPS

## Security Features

- 🔐 **JWT Authentication** with auto-generated secrets
- 🛡️ **CORS Protection** with dynamic origin detection
- 🔒 **Helmet Security** headers and CSP policies
- 📊 **Request Logging** and activity monitoring
- 🚫 **Rate Limiting** for API endpoints
- 🔑 **Secure Sessions** with encrypted storage

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Client  │    │  Express API    │    │  SQLite DB      │
│   (Port 3000)   │◄──►│  (Port 2222)    │◄──►│  (Database)     │
│   Vite Dev      │    │  Production     │    │  Users/Sessions │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/login` | POST | User authentication |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/profile` | GET | User profile |
| `/api/system/info` | GET | System information |

## Development

### Local Development Setup
```bash
# Clone repository
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel

# Install dependencies
npm install
cd client && npm install && cd ..

# Start development servers
npm run dev          # Backend (port 3002)
cd client && npm run dev  # Frontend (port 3000)
```

### Build for Production
```bash
# Build client
cd client && npm run build

# Start production server
node kpanel-server-enterprise.js
```

## Troubleshooting

### Installation Issues

**Permission Denied:**
```bash
sudo chmod +x install-kpanel.sh
sudo ./install-kpanel.sh
```

**Port Already in Use:**
```bash
# Change port in .env file
echo "PORT=3333" >> .env
systemctl restart kpanel
```

**Database Issues:**
```bash
# Reset database
rm -f /usr/local/kpanel/database/kpanel.db
systemctl restart kpanel
```

### Service Issues

**Service Won't Start:**
```bash
# Check logs
journalctl -u kpanel -n 50

# Check ports
netstat -tlnp | grep 2222

# Check permissions
ls -la /usr/local/kpanel/
```

**Memory Issues:**
```bash
# Check memory usage
free -h
ps aux | grep node

# Restart service
systemctl restart kpanel
```

## Support

- 📚 **Documentation:** [GitHub Wiki](https://github.com/herfaaljihad/kpanel/wiki)
- 🐛 **Issues:** [GitHub Issues](https://github.com/herfaaljihad/kpanel/issues)
- 💬 **Discussions:** [GitHub Discussions](https://github.com/herfaaljihad/kpanel/discussions)

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**KPanel** - Making server management as simple as DirectAdmin, but modern and open source.