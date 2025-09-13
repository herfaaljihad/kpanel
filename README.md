# KPanel - Modern Hosting Control Panel# 🎛️ KPanel - Modern Hosting Control Panel



<div align="center">[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/herfaaljihad/kpanel)

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)

![KPanel Logo](https://via.placeholder.com/200x80/667eea/FFFFFF?text=KPanel)[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[![Platform](https://img.shields.io/badge/platform-Linux-orange.svg)](https://github.com/herfaaljihad/kpanel)

**Modern, lightweight hosting control panel optimized for low-resource VPS**

> **Production-ready hosting control panel optimized for VPS 1GB RAM**  

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/herfaaljihad/kpanel)> Modern alternative to DirectAdmin/cPanel with superior performance and zero licensing costs.

[![Node.js](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org)

[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)---



</div>## 🚀 **Quick Start**



## 🚀 Features```bash

# Clone repository

- **🎛️ Modern Dashboard** - Clean, responsive interface built with React & MUIgit clone https://github.com/herfaaljihad/kpanel.git

- **📊 Real-time Monitoring** - System stats, resource usage, and performance metricscd kpanel

- **🔧 System Management** - Process control, service management, file operations

- **📱 Mobile Responsive** - Full functionality on all devices# Install dependencies

- **🔒 Secure Authentication** - JWT-based auth with role managementnpm install

- **⚡ Low Resource Usage** - Optimized for 1GB RAM VPS

- **🐋 Docker Ready** - Container support with docker-compose# Run setup (creates database & admin user)

- **📦 Easy Installation** - One-command setup scriptnpm run setup



## 🖥️ System Requirements# Start development server

npm run dev

### Minimum Requirements

- **OS**: Ubuntu 18.04+ / CentOS 7+ / Debian 9+# Access web interface

- **RAM**: 1GB (with swap recommended)open http://localhost:3001

- **CPU**: 1 vCPU```

- **Disk**: 2GB free space

- **Node.js**: 16.0.0+---



### Recommended## ✨ **Features**

- **RAM**: 2GB+ 

- **CPU**: 2+ vCPU### 🎯 **Core Features**

- **Disk**: 5GB+ free space

- ✅ **Domain Management** - Virtual hosts with SSL support

## 🔧 Quick Installation- ✅ **Web Server Control** - Nginx/Apache configuration

- ✅ **PHP Management** - Multiple PHP versions (7.4-8.3)

### Automatic Installation (Recommended)- ✅ **SSL Certificates** - Let's Encrypt automation + custom certs

- ✅ **Database Management** - MySQL/MariaDB + SQLite

```bash- ✅ **File Manager** - Web-based file operations

# Download and run installer- ✅ **System Monitoring** - Real-time resource tracking

curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install.sh | bash- ✅ **User Management** - Multi-tenant with role-based access

- ✅ **Backup System** - Automated backups with retention

# Or clone and install- ✅ **Email Management** - SMTP configuration & accounts

git clone https://github.com/herfaaljihad/kpanel.git

cd kpanel### 🎛️ **Advanced Features**

chmod +x install.sh

./install.sh- ✅ **REST API** - Complete programmatic access

```- ✅ **Real-time Monitoring** - WebSocket-based live updates

- ✅ **Auto-optimization** - Memory & CPU usage tuning for 1GB VPS

### Manual Installation- ✅ **Security Hardening** - Built-in firewall & access controls

- ✅ **Logging System** - Comprehensive activity & error logs

```bash- ✅ **Cron Job Management** - Scheduled task automation

# 1. Clone repository- ✅ **FTP/SFTP Management** - File transfer account control

git clone https://github.com/herfaaljihad/kpanel.git- ✅ **DNS Management** - Zone file editing (future)

cd kpanel

---

# 2. Install dependencies

npm run install:all## 📊 **Performance Comparison**



# 3. Build frontend| Feature               | KPanel          | DirectAdmin | cPanel     |

cd client && npm run build && cd ..| --------------------- | --------------- | ----------- | ---------- |

| **Memory Usage**      | 150-200MB       | 200-300MB   | 400-600MB  |

# 4. Start with PM2| **Installation Time** | 10-15 min       | 30-45 min   | 60+ min    |

npm install -g pm2| **License Cost**      | **FREE**        | $89/month   | $200/month |

pm2 start production-server.js --name kpanel-server| **API Quality**       | Modern REST     | Limited     | Legacy     |

pm2 save && pm2 startup| **VPS 1GB Support**   | **Optimized**   | Basic       | Poor       |

```| **Technology Stack**  | Node.js + React | C++ + PHP   | Perl + PHP |



## 🐋 Docker Installation---



```bash## 🛠️ **Installation**

# Clone repository

git clone https://github.com/herfaaljihad/kpanel.git### **System Requirements**

cd kpanel

- **OS:** Ubuntu 20.04+ / Debian 11+ / CentOS 8+

# Start with Docker Compose- **RAM:** 1GB minimum (2GB recommended)

docker-compose up -d- **Storage:** 10GB available space

- **Node.js:** 16.0.0 or higher

# Access panel- **Web Server:** Nginx 1.18+ or Apache 2.4+

http://your-server-ip:3002- **Database:** MySQL 8.0+ / MariaDB 10.5+ / SQLite 3.35+

```

### **Automated Installation**

## 🌐 Access Panel

#### **🚀 One-Line Production Installation (Ubuntu/Debian)**

After installation, access your KPanel at:

- **URL**: `http://your-server-ip:3002````bash

- **Default Login**: Will be created during setup# Download and run installer

curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install.sh | sudo bash

## 📖 Usage Guide```



### Dashboard Overview#### **📋 Manual Production Installation**

- **System Stats**: CPU, RAM, disk usage in real-time

- **Process Monitor**: Running processes with control options```bash

- **Service Manager**: Start/stop/restart system services# Clone repository

- **File Manager**: Browse and manage server filesgit clone https://github.com/herfaaljihad/kpanel.git

- **Log Viewer**: View system and application logscd kpanel



### System Management# Install dependencies

- **Updates**: Install system updates and security patchesnpm install

- **Backups**: Create and restore system backups

- **Users**: Manage system users and permissions# Setup database and admin user

- **Network**: Configure firewall and network settingsnpm run setup



### Application Management# Start in production mode

- **Websites**: Deploy and manage web applicationsnpm start

- **Databases**: Create and manage databases```

- **SSL**: Install and manage SSL certificates

- **Domains**: Configure virtual hosts and domains#### **🔧 If Frontend Build Fails**



## 🛠️ TroubleshootingIf you see only a minimal loading page, the frontend build may have failed. Run:



### Build Issues on Low Memory VPS```bash

# Navigate to KPanel directory

If installation hangs during frontend build:cd /path/to/kpanel



```bash# Run the fix script

# Run the build fix scriptchmod +x fix-ubuntu-vps.sh

chmod +x fix-build-immediate.shsudo ./fix-ubuntu-vps.sh

./fix-build-immediate.sh```

```

Or manually build the frontend:

### Common Issues

```bash

**Frontend build fails**cd client

```bashrm -rf node_modules dist

# Increase swap memorynpm install

sudo fallocate -l 1G /swapfileNODE_OPTIONS="--max-old-space-size=2048" npm run build

sudo chmod 600 /swapfilecd ..

sudo mkswap /swapfilepm2 restart kpanel-server

sudo swapon /swapfile```

```

#### **🔧 Quick Fix Commands**

**Permission denied errors**

```bash```bash

# Fix file permissions# Check PM2 status

sudo chown -R $USER:$USER /path/to/kpanelpm2 status

chmod +x *.sh

```# Restart server

pm2 restart kpanel-server

**Port already in use**

```bash# View logs

# Check what's using port 3002pm2 logs kpanel-server

sudo netstat -tulpn | grep :3002

# Kill process or change port in .env# Build frontend only

```cd client && npm run build && cd ..



## 🔧 Configuration# Full rebuild

./build-frontend.sh

### Environment Variables```



Create `.env` file in root directory:### **Docker Installation**



```env```bash

NODE_ENV=production# Using Docker Compose

PORT=3002docker-compose up -d

DATABASE_PATH=./data/kpanel.db

JWT_SECRET=your-super-secret-key# Or Docker run

LOG_LEVEL=infodocker run -d \

MAX_UPLOAD_SIZE=100MB  --name kpanel \

SESSION_TIMEOUT=24h  -p 3001:3001 \

```  -v kpanel_data:/app/data \

  herfaaljihad/kpanel:latest

### Performance Tuning```



For better performance on low-resource VPS:---



```bash## ⚙️ **Configuration**

# Optimize Node.js memory

export NODE_OPTIONS="--max-old-space-size=1024"### **Environment Variables**



# Enable swap```bash

echo 'vm.swappiness=10' >> /etc/sysctl.conf# Copy environment template

cp .env.example .env

# PM2 with cluster mode (for 2+ CPU)

pm2 start production-server.js -i max --name kpanel-cluster# Edit configuration

```nano .env

```

## 🔄 Updates

### **Key Configuration Options**

```bash

# Pull latest changes```env

git pull origin main# Application

NODE_ENV=production

# Rebuild frontend if neededPORT=3001

cd client && npm run build && cd ..

# Security

# Restart servicesJWT_SECRET=your-super-secret-key

pm2 restart kpanel-serverENABLE_TWO_FACTOR=true

```

# Web Server

## 🧪 DevelopmentWEBSERVER_TYPE=nginx

MAX_DOMAINS_PER_USER=50

### Development Setup

# SSL

```bashENABLE_SSL_AUTO_RENEW=true

# Clone repositorySSL_CERT_PATH=/etc/ssl/certs

git clone https://github.com/herfaaljihad/kpanel.git

cd kpanel# Email (SMTP)

SMTP_HOST=smtp.gmail.com

# Install dependenciesSMTP_PORT=587

npm run install:allSMTP_USER=your-email@gmail.com

SMTP_PASS=your-app-password

# Start development servers```

npm run dev  # Backend on :5000

cd client && npm run dev  # Frontend on :3000---

```

## 📚 **API Documentation**

### Project Structure

### **Authentication**

```

kpanel/```bash

├── client/           # React frontend# Login

├── server/           # Node.js backendcurl -X POST http://localhost:3001/api/auth/login \

├── database/         # Database schemas  -H "Content-Type: application/json" \

├── nginx/            # Nginx configs  -d '{"email":"admin@kpanel.local","password":"your-password"}'

├── docker-compose.yml```

├── production-server.js

└── install.sh### **Domain Management**

```

```bash

## 🤝 Contributing# Create domain

curl -X POST http://localhost:3001/api/domains \

1. Fork the repository  -H "Authorization: Bearer YOUR_TOKEN" \

2. Create feature branch (`git checkout -b feature/amazing-feature`)  -H "Content-Type: application/json" \

3. Commit changes (`git commit -m 'Add amazing feature'`)  -d '{"domain":"example.com","phpVersion":"8.1"}'

4. Push to branch (`git push origin feature/amazing-feature`)

5. Open Pull Request# List domains

curl -X GET http://localhost:3001/api/domains \

## 📄 License  -H "Authorization: Bearer YOUR_TOKEN"

```

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### **SSL Management**

## 🆘 Support

```bash

- **Issues**: [GitHub Issues](https://github.com/herfaaljihad/kpanel/issues)# Generate Let's Encrypt SSL

- **Discussions**: [GitHub Discussions](https://github.com/herfaaljihad/kpanel/discussions)curl -X POST http://localhost:3001/api/ssl/letsencrypt \

- **Wiki**: [Project Wiki](https://github.com/herfaaljihad/kpanel/wiki)  -H "Authorization: Bearer YOUR_TOKEN" \

  -H "Content-Type: application/json" \

## 🎯 Roadmap  -d '{"domain":"example.com","email":"admin@example.com"}'

```

- [ ] Multi-server management

- [ ] Advanced monitoring with alerts### **System Monitoring**

- [ ] Plugin system

- [ ] REST API documentation```bash

- [ ] Mobile app# Get system stats

- [ ] Auto-scaling featurescurl -X GET http://localhost:3001/api/system/stats \

  -H "Authorization: Bearer YOUR_TOKEN"

---

# Get real-time metrics

<div align="center">curl -X GET http://localhost:3001/api/system/metrics \

  -H "Authorization: Bearer YOUR_TOKEN"

**Made with ❤️ for the hosting community**```



[Website](https://kpanel.dev) • [Demo](https://demo.kpanel.dev) • [Docs](https://docs.kpanel.dev)---



</div>## 🔧 **Usage Examples**

### **1. Setting Up Your First Domain**

```javascript
// Using KPanel API
const response = await fetch("/api/domains", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    domain: "mysite.com",
    phpVersion: "8.1",
    sslEnabled: true,
    redirectWww: true,
  }),
});
```

### **2. Enabling SSL Certificate**

```javascript
// Auto-generate Let's Encrypt SSL
const ssl = await fetch("/api/ssl/letsencrypt", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    domain: "mysite.com",
    email: "admin@mysite.com",
  }),
});
```

### **3. System Monitoring**

```javascript
// Get real-time system stats
const stats = await fetch("/api/system/stats", {
  headers: { Authorization: `Bearer ${token}` },
});

console.log(await stats.json());
// Output: { cpu: 25.5, memory: 65.2, disk: 45.8, ... }
```

---

## 🎨 **Web Interface**

### **Dashboard Features**

- 📊 **Real-time Monitoring** - CPU, Memory, Disk usage
- 🌐 **Domain Overview** - Quick access to all domains
- 🔐 **SSL Status** - Certificate expiration tracking
- 📈 **Performance Metrics** - Historical data & trends
- 🛠️ **Quick Actions** - One-click common operations

### **Screenshots**

![Dashboard](docs/images/dashboard.png)
_Modern dashboard with real-time monitoring_

![Domain Management](docs/images/domains.png)
_Intuitive domain management interface_

![SSL Management](docs/images/ssl.png)
_Automated SSL certificate management_

---

## 🏗️ **Architecture**

```
KPanel Architecture
├── Frontend (React + TypeScript)
│   ├── Dashboard & Analytics
│   ├── Domain Management UI
│   ├── File Manager Interface
│   └── Real-time Monitoring
├── Backend (Node.js + Express)
│   ├── REST API Layer
│   ├── Authentication & Security
│   ├── WebSocket for Real-time
│   └── Service Layer
├── Services
│   ├── Web Server Service (Nginx/Apache)
│   ├── SSL Service (Let's Encrypt)
│   ├── Database Service (SQLite/MySQL)
│   ├── System Monitor Service
│   └── Backup Service
├── Database
│   ├── Users & Permissions
│   ├── Domains & Configuration
│   ├── SSL Certificates
│   └── System Logs
└── System Integration
    ├── Linux System Commands
    ├── Web Server Configuration
    ├── SSL Certificate Management
    └── File System Operations
```

---

## 🔒 **Security**

### **Built-in Security Features**

- 🛡️ **JWT Authentication** - Secure token-based auth
- 🔐 **Two-Factor Authentication** - TOTP support
- 🚫 **Rate Limiting** - API & login attempt protection
- 🔒 **Role-based Access** - Admin/Reseller/Customer roles
- 📝 **Audit Logging** - Complete action tracking
- 🛠️ **Security Headers** - Helmet.js integration
- 🚪 **Session Management** - Secure session handling

### **Security Best Practices**

```bash
# Change default credentials immediately
npm run setup

# Enable SSL for admin panel
certbot certonly --standalone -d admin.yourdomain.com

# Configure firewall
ufw allow 3001/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Regular updates
npm update
```

---

## 🚀 **Production Deployment**

### **Systemd Service**

```bash
# Install as system service
sudo npm run setup
sudo systemctl enable kpanel
sudo systemctl start kpanel
```

### **Nginx Reverse Proxy**

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **SSL Setup**

```bash
# Generate SSL for admin panel
certbot --nginx -d admin.yourdomain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

---

## 🧪 **Testing**

```bash
# Run test suite
npm test

# Run integration tests
npm run test:integration

# Performance testing
npm run test:performance

# Security audit
npm audit
```

---

## 📈 **Monitoring & Analytics**

### **Built-in Metrics**

- 📊 **System Resources** - CPU, Memory, Disk I/O
- 🌐 **Web Server Stats** - Requests, Response times
- 🔐 **SSL Certificate Status** - Expiration tracking
- 📧 **Email Queue Status** - SMTP delivery metrics
- 💾 **Database Performance** - Query times, Connections

### **External Integration**

```bash
# Grafana dashboard
curl -X POST http://localhost:3001/api/metrics/prometheus

# Custom webhooks
curl -X POST http://localhost:3001/api/webhooks \
  -d '{"url":"https://your-monitoring.com/webhook","events":["ssl_expiry"]}'
```

---

## 🤝 **Contributing**

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### **Development Setup**

```bash
# Clone repository
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel

# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test
```

### **Code Standards**

- ESLint configuration included
- Prettier code formatting
- Jest testing framework
- TypeScript for frontend
- Node.js best practices

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **DirectAdmin** - Inspiration for control panel design
- **cPanel** - Reference for hosting management features
- **Nginx** - High-performance web server
- **Let's Encrypt** - Free SSL certificates
- **Node.js Community** - Amazing ecosystem

---

## 📞 **Support**

- 📧 **Email:** support@kpanel.dev
- 💬 **Discord:** [Join our community](https://discord.gg/kpanel)
- 🐛 **Issues:** [GitHub Issues](https://github.com/herfaaljihad/kpanel/issues)
- 📖 **Documentation:** [Wiki](https://github.com/herfaaljihad/kpanel/wiki)
- 💝 **Sponsor:** [GitHub Sponsors](https://github.com/sponsors/herfaaljihad)

---

## 🎯 **Roadmap**

### **Phase 2 (Q2 2024)**

- [ ] Email server management (Postfix/Dovecot)
- [ ] DNS zone management
- [ ] Advanced backup strategies
- [ ] Multi-server management
- [ ] Docker container support

### **Phase 3 (Q3 2024)**

- [ ] Marketplace for plugins
- [ ] Advanced analytics dashboard
- [ ] Mobile app (iOS/Android)
- [ ] Multi-language support
- [ ] Cloud integration (AWS/DigitalOcean)

---

<div align="center">

**⭐ Star this project if it helps you! ⭐**

Made with ❤️ for the hosting community

[![GitHub stars](https://img.shields.io/github/stars/herfaaljihad/kpanel?style=social)](https://github.com/herfaaljihad/kpanel/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/herfaaljihad/kpanel?style=social)](https://github.com/herfaaljihad/kpanel/network)

</div>
