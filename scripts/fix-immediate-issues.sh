#!/bin/bash
# Quick fix script for immediate configuration issues

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Fixing immediate configuration issues...${NC}"

# 1. Create missing directories
echo -e "${YELLOW}Creating missing directories...${NC}"
mkdir -p config/environments
mkdir -p config/backups

# 2. Create default environment configs if they don't exist
echo -e "${YELLOW}Creating default environment configurations...${NC}"

# Check if Python and config_cli exist
if [ -f "bin/config_cli.py" ]; then
    python bin/config_cli.py env create development 2>/dev/null || echo "Development config already exists"
    python bin/config_cli.py env create staging 2>/dev/null || echo "Staging config already exists"
    python bin/config_cli.py env create production 2>/dev/null || echo "Production config already exists"
else
    echo -e "${RED}Warning: config_cli.py not found${NC}"
fi

# 3. Check for hardcoded URLs
echo -e "${YELLOW}Checking for hardcoded URLs...${NC}"
HARDCODED_COUNT=$(grep -r "localhost:8000\|localhost:8889" assets/js/ --exclude-dir=node_modules --exclude="*.test.js" 2>/dev/null | wc -l | tr -d ' ')
if [ "$HARDCODED_COUNT" -gt 0 ]; then
    echo -e "${RED}Found $HARDCODED_COUNT hardcoded URLs in JavaScript files${NC}"
    echo "Run this to see them: grep -r 'localhost:8000\|localhost:8889' assets/js/ --exclude-dir=node_modules"
else
    echo -e "${GREEN}No hardcoded URLs found${NC}"
fi

# 4. Test configuration loading
echo -e "${YELLOW}Testing configuration system...${NC}"
if python -c "from config import get_config; config = get_config(); print('✅ Config loaded successfully')" 2>/dev/null; then
    echo -e "${GREEN}Configuration system is working${NC}"
else
    echo -e "${RED}Configuration system has errors${NC}"
fi

# 5. Validate configuration
echo -e "${YELLOW}Validating configuration...${NC}"
if [ -f "bin/config_cli.py" ]; then
    python bin/config_cli.py validate || echo -e "${RED}Configuration validation failed${NC}"
fi

echo -e "${GREEN}✅ Immediate fixes completed${NC}"
echo
echo "Next steps:"
echo "1. Update JavaScript files to use ConfigService URL methods"
echo "2. Update server_production.py to use new config system"
echo "3. Run integration tests"
