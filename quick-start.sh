#!/bin/bash

# KPanel Quick Launch Script
# Production Ready - Automatic IP Detection

echo "🚀 Starting KPanel Production Server..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

# Navigate to KPanel directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build frontend if needed
if [ ! -d "client/dist" ]; then
    echo "🔨 Building frontend..."
    cd client && npm install && npm run build && cd ..
fi

# Stop existing KPanel process if running
echo "🛑 Stopping existing KPanel processes..."
pm2 stop kpanel 2>/dev/null || true
pm2 delete kpanel 2>/dev/null || true

# Start KPanel with PM2
echo "🚀 Starting KPanel with PM2..."
pm2 start production-server.js --name kpanel

# Show status
echo "✅ KPanel started successfully!"
echo ""
echo "📊 Server Status:"
pm2 list

echo ""
echo "🌐 Access KPanel at: http://localhost:3002"
echo "📋 View logs: pm2 logs kpanel"
echo "🛑 Stop server: pm2 stop kpanel"
echo ""
echo "🎉 KPanel is now running in production mode!"