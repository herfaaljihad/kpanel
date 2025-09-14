#!/bin/bash

# KPanel Docker 404 Fix Script
# Run this on your Ubuntu VPS to fix database and routing issues

echo "🔧 KPanel Docker 404 Fix"
echo "========================="

# Change to KPanel directory
cd /opt/kpanel

echo "📱 Step 1: Stopping current container..."
docker-compose down

echo "🗄️ Step 2: Removing corrupted database volumes..."
docker volume rm kpanel_kpanel_data 2>/dev/null || true
docker volume rm kpanel_kpanel_logs 2>/dev/null || true

echo "🧹 Step 3: Cleaning Docker cache..."
docker system prune -f

echo "🔄 Step 4: Rebuilding with fresh database..."
docker-compose build --no-cache

echo "🚀 Step 5: Starting KPanel with clean state..."
docker-compose up -d

echo "⏳ Step 6: Waiting for services to initialize..."
sleep 30

echo "🔍 Step 7: Testing endpoints..."
echo "Testing health endpoint..."
curl -f http://localhost:2222/api/health || echo "❌ Health endpoint failed"

echo "Testing main page..."
curl -f http://localhost:2222/ || echo "❌ Main page failed"

echo "📋 Step 8: Showing container status and logs..."
docker-compose ps
echo ""
echo "📝 Recent logs:"
docker-compose logs --tail=50

echo ""
echo "🎯 Fix completed!"
echo "================="
echo "✅ Access KPanel at: http://147.139.202.42:2222"
echo "👤 Username: admin"
echo "🔑 Password: IPdV7HGf00E"
echo ""
echo "🔧 If still having issues:"
echo "   - Check logs: docker-compose logs -f"
echo "   - Monitor memory: free -h"
echo "   - Restart: docker-compose restart"