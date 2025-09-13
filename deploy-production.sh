#!/bin/bash

echo "🚀 Starting KPanel Production Deployment Script..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons!"
   print_info "Please run as a regular user with sudo privileges"
   exit 1
fi

print_info "Checking system requirements..."

# Check Node.js version
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version | cut -d 'v' -f 2)
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d '.' -f 1)
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_status "Node.js $NODE_VERSION is installed ✓"
    else
        print_error "Node.js 18+ is required, but $NODE_VERSION is installed"
        print_info "Please install Node.js 18+ first"
        exit 1
    fi
else
    print_error "Node.js is not installed"
    print_info "Please install Node.js 18+ first"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_status "npm $NPM_VERSION is installed ✓"
else
    print_error "npm is not installed"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    print_info "Make sure you're in the KPanel project directory"
    exit 1
fi

print_info "Installing production dependencies..."
if npm install --production; then
    print_status "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Clean up extraneous packages
print_info "Cleaning up extraneous packages..."
npm prune

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    if [ -f ".env.example" ]; then
        print_info "Copying .env.example to .env..."
        cp .env.example .env
        print_warning "Please edit .env file with your production settings!"
        print_info "Important: Set JWT_SECRET, database credentials, and SMTP settings"
    else
        print_error ".env.example file not found!"
        exit 1
    fi
else
    print_status ".env file already exists"
fi

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p data uploads logs backups
chmod 755 data uploads logs backups

# Initialize database if it doesn't exist
if [ ! -f "data/kpanel.db" ]; then
    print_info "Initializing SQLite database..."
    if [ -f "database/schema.sql" ]; then
        sqlite3 data/kpanel.db < database/schema.sql
        print_status "Database initialized successfully"
    else
        print_warning "Database schema not found, database will be auto-created"
    fi
else
    print_status "Database already exists"
fi

# Set proper permissions
chmod 664 data/kpanel.db 2>/dev/null || true

# Build frontend if client directory exists
if [ -d "client" ]; then
    print_info "Building frontend..."
    cd client || exit
    if npm install; then
        if npm run build; then
            print_status "Frontend built successfully"
        else
            print_warning "Frontend build failed, but deployment continues"
        fi
    else
        print_warning "Frontend dependencies installation failed"
    fi
    cd ..
else
    print_info "No client directory found, skipping frontend build"
fi

# Install PM2 if not already installed
if ! command -v pm2 &> /dev/null; then
    print_info "Installing PM2 process manager..."
    if sudo npm install -g pm2; then
        print_status "PM2 installed successfully"
    else
        print_error "Failed to install PM2"
        exit 1
    fi
else
    print_status "PM2 is already installed"
fi

# Test application startup
print_info "Testing application startup..."
if timeout 10 node -e "const app = require('./server.js'); console.log('✓ Application loaded successfully'); process.exit(0);" 2>/dev/null; then
    print_status "Application startup test passed"
else
    print_warning "Application startup test failed, but deployment continues"
    print_info "Please check your .env configuration"
fi

# Create PM2 ecosystem file
print_info "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'kpanel',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z'
  }]
};
EOF

# Start application with PM2
print_info "Starting application with PM2..."
if pm2 start ecosystem.config.js; then
    print_status "Application started successfully"
    
    # Setup PM2 startup script
    print_info "Setting up PM2 startup script..."
    pm2 startup > startup_command.txt 2>&1
    if grep -q "sudo" startup_command.txt; then
        print_warning "Please run the following command to enable auto-start:"
        grep "sudo" startup_command.txt
        print_info "After running the command above, execute: pm2 save"
    fi
    rm -f startup_command.txt
    
    # Save PM2 configuration
    pm2 save
    
else
    print_error "Failed to start application with PM2"
    print_info "Trying to start directly..."
    if npm start; then
        print_warning "Application started directly, but PM2 is recommended for production"
    else
        print_error "Failed to start application"
        exit 1
    fi
fi

# Create backup script
print_info "Creating backup script..."
cat > backup-kpanel.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Backup database
if [ -f "data/kpanel.db" ]; then
    cp data/kpanel.db $BACKUP_DIR/kpanel_backup_$DATE.db
    echo "Database backup created: kpanel_backup_$DATE.db"
fi

# Backup uploads
if [ -d "uploads" ]; then
    tar -czf $BACKUP_DIR/uploads_backup_$DATE.tar.gz uploads/
    echo "Uploads backup created: uploads_backup_$DATE.tar.gz"
fi

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "kpanel_backup_*.db" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_backup_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x backup-kpanel.sh

# Create quick status script
print_info "Creating status check script..."
cat > status-kpanel.sh << 'EOF'
#!/bin/bash
echo "🔍 KPanel Status Check"
echo "====================="
echo

echo "📊 PM2 Status:"
pm2 status

echo
echo "🖥️  System Resources:"
echo "Memory Usage:"
free -h
echo
echo "Disk Usage:"
df -h | grep -E '^/dev'

echo
echo "📝 Recent Logs:"
pm2 logs kpanel --lines 10 --nostream

echo
echo "🌐 Application Health:"
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo "✅ Application is responding"
else
    echo "❌ Application is not responding"
fi
EOF

chmod +x status-kpanel.sh

print_info "Creating deployment summary..."

echo ""
echo "🎉 KPanel Deployment Completed Successfully!"
echo "============================================="
echo ""
print_status "✅ Dependencies installed and optimized"
print_status "✅ Database initialized"  
print_status "✅ PM2 process manager configured"
print_status "✅ Backup script created"
print_status "✅ Status monitoring script created"
echo ""
echo "📋 Next Steps:"
echo "1. Edit .env file with your production settings"
echo "2. Configure your domain and SSL certificate"
echo "3. Setup Nginx reverse proxy"
echo "4. Configure firewall rules"
echo ""
echo "🔧 Useful Commands:"
echo "• Check status: ./status-kpanel.sh"
echo "• View logs: pm2 logs kpanel"
echo "• Restart app: pm2 restart kpanel"
echo "• Backup data: ./backup-kpanel.sh"
echo ""
echo "🌐 Default Access:"
echo "• Application: http://localhost:3001"
echo "• Health check: http://localhost:3001/api/health"
echo ""
echo "📖 Read PANDUAN_DEPLOY.md for complete setup instructions"
echo ""
print_status "Happy hosting with KPanel! 🚀"
