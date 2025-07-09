#!/bin/bash

# Verify RAD Monitor Configuration Consistency
# This script checks that all configuration files have the correct settings

echo "🔍 Verifying RAD Monitor Configuration..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Expected values
EXPECTED_PROXY_URL="https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
EXPECTED_KIBANA_URL="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
EXPECTED_INDEX_PATTERN="traffic-*"

# Function to check a value
check_value() {
    local file=$1
    local pattern=$2
    local expected=$3
    local description=$4

    if grep -q "$pattern.*$expected" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $description in $file"
        return 0
    else
        echo -e "${RED}✗${NC} $description in $file"
        echo "  Expected: $expected"
        echo "  Found: $(grep "$pattern" "$file" 2>/dev/null || echo "Not found")"
        return 1
    fi
}

# Track errors
errors=0

echo ""
echo "Checking proxy URL configuration..."
check_value "config/production.json" "regal-youtiao-09c777" "regal-youtiao-09c777" "Proxy URL" || ((errors++))
check_value "config/settings.json" "regal-youtiao-09c777" "regal-youtiao-09c777" "Proxy URL" || ((errors++))
check_value "config/api-endpoints.json" "regal-youtiao-09c777" "regal-youtiao-09c777" "Proxy URL" || ((errors++))

echo ""
echo "Checking index pattern configuration..."
check_value "config/production.json" 'traffic-\*' "$EXPECTED_INDEX_PATTERN" "Index pattern" || ((errors++))
check_value "config/settings.json" '"index_pattern"' "$EXPECTED_INDEX_PATTERN" "Index pattern" || ((errors++))

echo ""
echo "Checking for obsolete configurations..."
# Check for old proxy URL
if grep -r "warm-sunshine-d0b061" . --include="*.js" --include="*.json" --include="*.yml" 2>/dev/null | grep -v node_modules; then
    echo -e "${RED}✗${NC} Found references to old proxy URL"
    ((errors++))
else
    echo -e "${GREEN}✓${NC} No references to old proxy URL found"
fi

# Check for old index pattern
if grep -r "usi\*/_search" . --include="*.js" --include="*.json" --include="*.yml" 2>/dev/null | grep -v node_modules | grep -v "traffic-"; then
    echo -e "${YELLOW}⚠${NC} Found references to old index pattern (usi*) - these may need updating"
fi

echo ""
echo "Checking critical files exist..."
critical_files=(
    "proxy-service/netlify/functions/proxy.js"
    "config/production.json"
    "config/settings.json"
    "config/api-endpoints.json"
    "assets/js/api-client-unified.js"
    "assets/js/config-service.js"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
    else
        echo -e "${RED}✗${NC} $file is missing!"
        ((errors++))
    fi
done

echo ""
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}(✓)All configurations are consistent!${NC}"
    exit 0
else
    echo -e "${RED}(✗) Found $errors configuration issues${NC}"
    exit 1
fi
