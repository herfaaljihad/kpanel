# KPanel - Web Control Panel

A lightweight web-based control panel for server management, designed for ultra-low memory systems.

## Features

- System Monitoring - Real-time CPU, memory, disk usage
- File Management - Built-in file browser with upload/download
- Website Management - Manage multiple websites and domains
- Database Management - SQLite database interface
- Real-time Dashboard - Live system statistics
- Secure Access - User authentication and session management
- Docker Ready - Full containerization support
- Ultra-Low Memory - Optimized for systems with 512MB RAM or less

## Quick Start

### Option 1: Docker Installation (Recommended)

```bash
# Standard installation
curl -sSL https://raw.githubusercontent.com/yourusername/kpanel/main/docker-install.sh | bash

# For ultra-low memory systems (512MB RAM or less)
curl -sSL https://raw.githubusercontent.com/yourusername/kpanel/main/docker-install-ultra-low-memory.sh | bash
```

### Option 2: Direct Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/kpanel.git
cd kpanel

# Run installation script
chmod +x install.sh
./install.sh

# Or for production environment
chmod +x install-production.sh
./install-production.sh
```

## System Requirements

### Minimum Requirements
- RAM: 256MB (512MB recommended)
- Storage: 1GB free space
- OS: Ubuntu 18.04+, CentOS 7+, or any Docker-compatible system
- Network: Internet connection for installation

### Supported Systems
- Ubuntu 18.04, 20.04, 22.04
- CentOS 7, 8
- Debian 9, 10, 11
- Any Docker-compatible Linux distribution

## Access

After installation, access KPanel at:

- HTTP: `http://your-server-ip:3000`
- Default Login:
  - Username: `admin`
  - Password: `admin123`

**Security Notice:** Change the default password immediately after first login!

## Configuration

### Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database
DATABASE_PATH=/data/kpanel.db

# Security
SESSION_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# File Browser
FILEBROWSER_PORT=8080
FILEBROWSER_DATABASE=/data/filebrowser.db
```

## Development

### Prerequisites
- Node.js 18+
- npm 8+

### Setup Development Environment

```bash
# Clone repository
git clone https://github.com/yourusername/kpanel.git
cd kpanel

# Install server dependencies
npm install

# Install client dependencies
cd client
npm install
cd ..

# Start development server
npm run dev
```

## Docker

### Using Docker Compose

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f kpanel

# Update containers
docker-compose pull && docker-compose up -d
```

## Troubleshooting

### Common Issues

**Installation fails with memory error:**
```bash
# Use ultra-low memory installer
curl -sSL https://raw.githubusercontent.com/yourusername/kpanel/main/docker-install-ultra-low-memory.sh | bash
```

**Docker container returns 404:**
```bash
# Run the Docker fix script
curl -sSL https://raw.githubusercontent.com/yourusername/kpanel/main/fix-docker-404.sh | bash
```

**Cannot access web interface:**
1. Check if service is running: `docker ps`
2. Check logs: `docker logs kpanel`
3. Verify port is open: `netstat -tulpn | grep 3000`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with love for system administrators and developers