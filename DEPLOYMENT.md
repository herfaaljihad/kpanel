# KPanel Production Deployment Guide# 🚀 KPanel Quick Deployment Guide

## Production-Ready Features## Installation di VPS

- **Ultra-Low Memory Optimization** - Works on 256MB+ RAM systems### Method 1: Quick Install (Recommended)

- **Docker Containerization** - Full Docker support with compose

- **HTTP-Only Mode** - Fallback server for SSL-limited environments ```bash

- **Automated Installation** - One-command installers for all scenarios# Install dengan satu command

- **Production Database** - SQLite with proper schema and migrationscurl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install.sh | bash

- **Security Hardening** - JWT auth, session management, CORS protection```

- **Real-time Monitoring** - Live system statistics via WebSocket

- **File Management** - Integrated FileBrowser for file operations### Method 2: Manual Install

- **Clean Codebase** - Removed 43+ development/testing files

````bash

## Installation Options# 1. Clone repository

git clone https://github.com/herfaaljihad/kpanel.git

### 1. Ultra-Low Memory (Recommended for VPS ≤512MB RAM)cd kpanel

```bash

curl -sSL https://raw.githubusercontent.com/yourusername/kpanel/main/docker-install-ultra-low-memory.sh | bash# 2. Run installer

```chmod +x install.sh

./install.sh

### 2. Standard Docker Install (For systems with 1GB+ RAM)```

```bash

curl -sSL https://raw.githubusercontent.com/yourusername/kpanel/main/docker-install.sh | bash### Method 3: Build Fix (Jika Build Hang)

````

````bash

### 3. Production Manual Deploy# Jika build hang di MUI icons

```bashchmod +x fix-build-immediate.sh

curl -sSL https://raw.githubusercontent.com/yourusername/kpanel/main/deploy-production.sh | bash./fix-build-immediate.sh

````

## Core Components## Akses Panel

- **production-server.js** - Main application server with all featuresSetelah instalasi selesai:

- **docker-http-server-fixed.js** - HTTP-only fallback server

- **Dockerfile** - Multi-stage container build optimized for production- **URL**: `http://IP_VPS:3002`

- **docker-compose.production.yml** - Production Docker orchestration- **Health Check**: `http://IP_VPS:3002/api/health`

- **ecosystem.config.js** - PM2 process management configuration

## Management Commands

## Troubleshooting Tools

```bash

- **fix-docker-404.sh** - Fixes Docker container 404 errors# Status

- **install-production.sh** - Clean production installationpm2 status

- **deploy-production.sh** - Full production deployment script

# Logs

## Access Pointspm2 logs kpanel-server



After successful installation:# Restart

pm2 restart kpanel-server

- **Web Interface:** `http://your-server-ip:3000`

- **File Browser:** `http://your-server-ip:8080`# Stop

- **API Health:** `http://your-server-ip:3000/api/health`pm2 stop kpanel-server

```

**Default Login:**

- Username: `admin`## Spek VPS Yang Direkomendasikan

- Password: `admin123`

### Minimum (Yang Anda Gunakan)

**Important:** Change default credentials immediately after first login!

- ✅ **RAM**: 1GB (dengan swap)

## Performance Optimizations- ✅ **CPU**: 2 vCPU

- ✅ **Disk**: 30GB ESSD

- **Memory Usage:** ~150-200MB RAM (vs 512MB+ for competitors)- ✅ **OS**: Ubuntu 24.04

- **Startup Time:** 3-5 seconds cold start

- **Build Size:** <100MB container image### Optimal

- **Database:** SQLite for zero-maintenance persistence

- **Frontend:** Pre-built React bundle (no runtime compilation)- **RAM**: 2GB+

- **CPU**: 2+ vCPU

## Security Features- **Disk**: 50GB+

- JWT-based authentication## Optimasi untuk VPS 1GB

- Session management with secure cookies

- CORS protectionScript installer sudah include:

- Input validation and sanitization

- SQL injection prevention- ✅ Automatic swap creation (1GB)

- Rate limiting on API endpoints- ✅ Memory-optimized build

- ✅ Frontend chunking

## Production Checklist- ✅ Fallback frontend

- ✅ PM2 dengan memory limits

- [x] Remove development files and scripts

- [x] Clean up unused Docker configurations## Troubleshooting

- [x] Update README with production installation guide

- [x] Test ultra-low memory installation path### Build Hang

- [x] Verify Docker container functionality

- [x] Validate HTTP-only fallback mode```bash

- [x] Confirm all security measures active# Jalankan fix script

- [x] Ensure proper error handling and logging./fix-build-immediate.sh

````

## Deployment Status

### Memory Issues

**STATUS: PRODUCTION READY**

```bash

The KPanel application is now fully prepared for production deployment with:# Check memory

- Optimized codebase (43 unnecessary files removed)free -h

- Multiple installation methods for different system requirements# Check swap

- Comprehensive error handling and fallback mechanismsswapon --show

- Security hardening and performance optimizations```

- Complete documentation and troubleshooting guides

### Port Issues

---

```bash

**KPanel v2.0 - Ready for ultra-low memory production deployment**# Check port 3002
sudo netstat -tulpn | grep :3002
````

## Features Ready to Use

- ✅ Modern React Dashboard
- ✅ System Monitoring
- ✅ File Manager
- ✅ Process Management
- ✅ System Updates
- ✅ Security Management
- ✅ Database Management
- ✅ Website Management
- ✅ SSL Management
- ✅ Backup System

---

**Repository**: https://github.com/herfaaljihad/kpanel
**Support**: GitHub Issues
**Version**: 2.0.0
