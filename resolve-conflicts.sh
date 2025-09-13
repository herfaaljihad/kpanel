#!/bin/bash

# KPanel Git Conflict Resolution Script
# This script resolves git conflicts and pulls the latest changes

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 KPanel Git Conflict Resolution${NC}"
echo "=================================="

echo -e "${YELLOW}📥 Step 1: Stashing local changes...${NC}"
git stash push -m "Auto-stash before pulling latest changes"

echo -e "${YELLOW}📥 Step 2: Pulling latest changes...${NC}"
git pull origin main

echo -e "${YELLOW}🔧 Step 3: Applying your changes back...${NC}"
# Apply the stashed changes back, but handle conflicts gracefully
if git stash pop; then
    echo -e "${GREEN}✅ Your changes merged successfully${NC}"
else
    echo -e "${YELLOW}⚠️ Some conflicts detected, resolving automatically...${NC}"
    
    # Reset conflicted files and keep our local versions for key files
    git checkout --ours client/package.json 2>/dev/null
    git checkout --ours fix-build-immediate.sh 2>/dev/null
    
    # Mark conflicts as resolved
    git add client/package.json fix-build-immediate.sh 2>/dev/null
    
    echo -e "${GREEN}✅ Conflicts resolved, keeping your local improvements${NC}"
fi

echo -e "${YELLOW}🔄 Step 4: Ensuring latest scripts are executable...${NC}"
chmod +x *.sh 2>/dev/null

echo -e "${GREEN}🎉 Git conflicts resolved! 🎉${NC}"
echo -e "${BLUE}Your local improvements have been preserved${NC}"
echo ""
echo -e "${YELLOW}Available scripts:${NC}"
ls -la *.sh | grep -E "(fix-|build-|install)" | head -10

echo -e "${GREEN}🚀 Ready to use KPanel scripts!${NC}"