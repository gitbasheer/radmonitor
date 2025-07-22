#!/bin/bash
# WAM Monitoring Startup Script

echo "🚀 Starting WAM Monitoring System..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kill any existing servers
echo "🧹 Cleaning up existing processes..."
pkill -f "python.*http.server" 2>/dev/null
pkill -f "node.*elasticsearch-proxy" 2>/dev/null
pkill -f "node.*local-proxy-server" 2>/dev/null
sleep 2

# Start web server on a different port since 8000 is used by FastAPI
echo "🌐 Starting web server on port 8002..."
python3 -m http.server 8002 > /dev/null 2>&1 &
WEB_PID=$!

# Start proxy server
echo "🔗 Starting Elasticsearch proxy on port 8001..."
node server/elasticsearch-proxy.mjs > proxy.log 2>&1 &
PROXY_PID=$!

# Wait for servers to start
sleep 3

# Check if servers are running
# Give more time for Python server
sleep 2
if kill -0 $PROXY_PID 2>/dev/null; then
    echo -e "${GREEN}✅ All services started successfully!${NC}"
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║              WAM Monitoring System Ready                  ║"
    echo "╠═══════════════════════════════════════════════════════════╣"
    echo "║                                                           ║"
    echo "║   Dashboard:    http://localhost:8002                  ║"
    echo "║  🔧 WAM Test:     http://localhost:8002/wam_test_guided.html ║"
    echo "║  🔗 Proxy:        http://localhost:8001                  ║"
    echo "║  ❤️  Health Check: http://localhost:8001/health          ║"
    echo "║                                                           ║"
    echo "║  📝 Logs:         tail -f proxy.log                      ║"
    echo "║  🛑 Stop:         ./stop-wam.sh                          ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo "1. Get your Kibana cookie from browser DevTools"
    echo "2. Open http://localhost:8002/wam_test_guided.html"
    echo "3. Follow the guided setup"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    exit 1
fi

# Save PIDs for stop script
echo "$WEB_PID" > .web.pid
echo "$PROXY_PID" > .proxy.pid

# Keep the script running
echo ""
echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
wait