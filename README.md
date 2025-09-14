# KPanel - Web Server Control Panel

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20Windows-lightgrey.svg" alt="Platform">
</p>

KPanel is a lightweight, modern web-based control panel for server management. It provides an intuitive interface for managing files, databases, users, and system monitoring with real-time statistics.

## ✨ Features

- **Real-time System Monitoring** - CPU, Memory, Disk usage with live charts
- **File Management** - Built-in file browser with upload/download capabilities
- **Database Management** - MySQL/SQLite database administration
- **User Management** - Multi-user system with role-based access
- **System Updates** - Automated system update management
- **Responsive Design** - Modern React-based interface
- **Security** - JWT authentication with secure session management

## 📋 System Requirements

### Minimum Requirements

- **OS**: Ubuntu 18.04+, CentOS 7+, or Windows 10+
- **RAM**: 1GB minimum, 2GB recommended
- **Storage**: 500MB free space
- **CPU**: 1 core minimum

### Software Dependencies

- Node.js 18.0 or higher
- MySQL 8.0+ or SQLite 3.x
- Git (for installation)

## 🚀 Installation

### Automated Installation (Recommended)

#### Ubuntu/Debian

```bash
wget https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-ubuntu.sh -O kpanel-install.sh
chmod +x kpanel-install.sh
sudo ./kpanel-install.sh
```

#### CentOS/RHEL/Rocky Linux

```bash
curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-centos.sh -o kpanel-install.sh
chmod +x kpanel-install.sh
sudo ./kpanel-install.sh
```

#### Windows

```powershell
# Run as Administrator
irm https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install-windows.ps1 | iex
```

### Manual Installation

#### 1. Clone Repository

```bash
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel
```

#### 2. Install Dependencies

```bash
npm install --production
```

#### 3. Database Setup

```bash
# For MySQL
mysql -u root -p < database/schema.sql

# For SQLite (default)
# Database will be created automatically
```

#### 4. Configuration

```bash
cp .env.example .env
nano .env  # Edit configuration as needed
```

#### 5. Start KPanel

```bash
# Using PM2 (recommended)
npm run start:prod

# Or direct start
npm start
```

## 🔧 Configuration

### Environment Variables

Edit `.env` file with your specific settings:

```env
# Application Settings
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Security
JWT_SECRET=your-super-secure-64-character-jwt-secret-key-here-change-this
SESSION_SECRET=your-session-secret-key

# Database Configuration (MySQL)
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=kpanel
DB_USER=kpanel_user
DB_PASSWORD=your-secure-password

# Database Configuration (SQLite - Default)
DB_TYPE=sqlite
DB_PATH=./database/kpanel.db

# File Upload
MAX_FILE_SIZE=100MB
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/kpanel.log
```

### SSL Configuration

For production use with HTTPS:

```env
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

## 🌐 Access KPanel

After installation, KPanel will be available at:

- **Web Interface**: `http://your-server-ip:3001`
- **HTTPS** (if configured): `https://your-server-ip:3001`

### First Time Setup

1. **Create Admin User**:

   ```bash
   # Using the setup script
   npm run create-admin

   # Or navigate to the web interface for initial setup
   ```

2. **Default Access**:
   - Navigate to your KPanel URL
   - Complete the initial setup wizard
   - Create your admin account

## � Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt password encryption
- **Input Validation** - Comprehensive input sanitization
- **SQL Injection Protection** - Parameterized queries
- **CORS Protection** - Cross-origin request security
- **Security Headers** - Helmet.js security middleware
- **Rate Limiting** - API request throttling
- **Session Management** - Secure session handling

### Firewall Configuration

```bash
# Ubuntu/Debian
sudo ufw allow 3001/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## � System Management

### Service Control

```bash
# Using PM2 (Recommended)
pm2 start ecosystem.config.js
pm2 stop kpanel
pm2 restart kpanel
pm2 logs kpanel

# Using Systemd
sudo systemctl start kpanel
sudo systemctl stop kpanel
sudo systemctl restart kpanel
sudo systemctl status kpanel
```

### Backup & Restore

```bash
# Database backup
npm run backup:db

# Full system backup
npm run backup:full

# Restore from backup
npm run restore:db backup-file.sql
```

## 📁 Project Structure

```
kpanel/
├── production-server.js    # Main production server
├── client/dist/           # Built React frontend
├── server/               # Backend API modules
│   ├── config/          # Database & app configuration
│   ├── middleware/      # Express middleware
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic services
│   └── utils/          # Helper utilities
├── database/           # Database schemas & migrations
├── start.sh           # Linux/macOS start script
├── start.bat          # Windows start script
├── ecosystem.config.js # PM2 configuration
├── package.json       # Dependencies & scripts
└── .env.example      # Environment template
```

## � Updates & Maintenance

### Automatic Updates

KPanel includes built-in update management:

1. Navigate to **System → Updates** in web interface
2. Click **Check for Updates**
3. Follow upgrade prompts

### Manual Updates

```bash
cd /path/to/kpanel
git pull origin main
npm install --production
pm2 restart kpanel
```

### Database Migrations

```bash
# Run pending migrations
npm run migrate

# Rollback migration
npm run migrate:rollback
```

## 🛠️ Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3001
sudo netstat -tulnp | grep :3001
sudo lsof -i :3001

# Kill process if needed
sudo kill -9 <PID>
```

#### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/kpanel
sudo chmod -R 755 /path/to/kpanel
```

#### Database Connection Issues

```bash
# Test database connection
npm run test:db

# Check database service
sudo systemctl status mysql  # or mariadb
```

### Performance Optimization

#### High Traffic Configuration

```env
# Enable clustering in .env
CLUSTER_MODE=true
WORKER_PROCESSES=auto

# PM2 cluster mode
pm2 start ecosystem.config.js --env production
```

#### Memory Usage Optimization

- **Base Usage**: ~200MB RAM
- **With Monitoring**: ~350MB RAM
- **High Load**: ~500MB RAM

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel
npm install
cp .env.example .env
npm run dev
```

### Contribution Guidelines

- Fork the repository
- Create feature branch (`git checkout -b feature/amazing-feature`)
- Commit changes (`git commit -m 'Add amazing feature'`)
- Push to branch (`git push origin feature/amazing-feature`)
- Open a Pull Request

## 📞 Support & Community

- **📚 Documentation**: [GitHub Wiki](https://github.com/herfaaljihad/kpanel/wiki)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/herfaaljihad/kpanel/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/herfaaljihad/kpanel/discussions)
- **🚀 Feature Requests**: [GitHub Issues](https://github.com/herfaaljihad/kpanel/issues/new?template=feature_request.md)

## � System Requirements

| Component   | Minimum                                 | Recommended      |
| ----------- | --------------------------------------- | ---------------- |
| **OS**      | Ubuntu 18.04+ / CentOS 7+ / Windows 10+ | Ubuntu 22.04 LTS |
| **RAM**     | 1GB                                     | 2GB+             |
| **Storage** | 500MB                                   | 2GB+             |
| **CPU**     | 1 core                                  | 2+ cores         |
| **Node.js** | 18.0+                                   | 20.0+ LTS        |

## 📄 License

KPanel is released under the [MIT License](LICENSE).

```
Copyright (c) 2024 Kreasiana Kgemilang

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

## 🙏 Acknowledgments

- **Built with**: Node.js, Express.js, React, MySQL/SQLite
- **UI Framework**: Modern React with responsive design
- **Security**: Industry-standard security practices
- **Monitoring**: Real-time system statistics
- **Inspiration**: Modern control panel solutions

---

<p align="center">
  <strong>🚀 KPanel - Simple, Powerful, Secure Server Management</strong><br>
  <em>Built with ❤️ by <a href="https://github.com/herfaaljihad">Herf Al Jihad</a></em>
</p>

<p align="center">
  <img src="https://img.shields.io/github/stars/herfaaljihad/kpanel?style=social" alt="GitHub stars">
  <img src="https://img.shields.io/github/forks/herfaaljihad/kpanel?style=social" alt="GitHub forks">
  <img src="https://img.shields.io/github/issues/herfaaljihad/kpanel" alt="GitHub issues">
</p>
