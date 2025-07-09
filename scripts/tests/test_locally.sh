#!/bin/bash
# test_locally.sh - Test dashboard with a local HTTP server

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PORT=8888

echo "=== RAD Monitor Local Test ==="
echo ""
echo "Starting local test environment..."
echo ""

# Check if cookie is set
if [ -z "$ELASTIC_COOKIE" ]; then
    echo -e "${YELLOW}Warning: No ELASTIC_COOKIE set${NC}"
    echo "The dashboard will show cached data only."
fi

# Generate fresh dashboard
echo "Generating dashboard..."
chmod +x scripts/generate_dashboard_refactored.sh

# Generate the dashboard
if ./scripts/generate_dashboard_refactored.sh; then
    echo -e "${GREEN}(✓) Dashboard generated successfully${NC}"
else
    echo -e "${RED}(✗)Dashboard generation failed${NC}"
    exit 1
fi

# Check if index.html exists
if [ ! -f "index.html" ]; then
    echo -e "${RED}Error: index.html not found${NC}"
    exit 1
fi

echo ""
echo "Starting local server on port $PORT..."
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "🌐 Dashboard URL: ${GREEN}http://localhost:$PORT${NC}"
echo ""
echo -e "📝 Instructions:"
echo -e "   1. Click the link above or open in your browser"
echo -e "   2. Use ${YELLOW}Ctrl+C${NC} to stop the server when done"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Start Python HTTP server
python3 -m http.server $PORT
