# 🚀 KPanel Quick Deployment Guide

## Installation di VPS

### Method 1: Quick Install (Recommended)

```bash
# Install dengan satu command
curl -fsSL https://raw.githubusercontent.com/herfaaljihad/kpanel/main/install.sh | bash
```

### Method 2: Manual Install

```bash
# 1. Clone repository
git clone https://github.com/herfaaljihad/kpanel.git
cd kpanel

# 2. Run installer
chmod +x install.sh
./install.sh
```

### Method 3: Build Fix (Jika Build Hang)

```bash
# Jika build hang di MUI icons
chmod +x fix-build-immediate.sh
./fix-build-immediate.sh
```

## Akses Panel

Setelah instalasi selesai:

- **URL**: `http://IP_VPS:3002`
- **Health Check**: `http://IP_VPS:3002/api/health`

## Management Commands

```bash
# Status
pm2 status

# Logs
pm2 logs kpanel-server

# Restart
pm2 restart kpanel-server

# Stop
pm2 stop kpanel-server
```

## Spek VPS Yang Direkomendasikan

### Minimum (Yang Anda Gunakan)

- ✅ **RAM**: 1GB (dengan swap)
- ✅ **CPU**: 2 vCPU
- ✅ **Disk**: 30GB ESSD
- ✅ **OS**: Ubuntu 24.04

### Optimal

- **RAM**: 2GB+
- **CPU**: 2+ vCPU
- **Disk**: 50GB+

## Optimasi untuk VPS 1GB

Script installer sudah include:

- ✅ Automatic swap creation (1GB)
- ✅ Memory-optimized build
- ✅ Frontend chunking
- ✅ Fallback frontend
- ✅ PM2 dengan memory limits

## Troubleshooting

### Build Hang

```bash
# Jalankan fix script
./fix-build-immediate.sh
```

### Memory Issues

```bash
# Check memory
free -h
# Check swap
swapon --show
```

### Port Issues

```bash
# Check port 3002
sudo netstat -tulpn | grep :3002
```

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
