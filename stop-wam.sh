#!/bin/bash
# WAM Monitoring Stop Script

echo "🛑 Stopping WAM Monitoring System..."

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Read PIDs if saved
if [ -f .web.pid ]; then
    WEB_PID=$(cat .web.pid)
    if kill $WEB_PID 2>/dev/null; then
        echo "✅ Stopped web server (PID: $WEB_PID)"
    fi
    rm .web.pid
fi

if [ -f .proxy.pid ]; then
    PROXY_PID=$(cat .proxy.pid)
    if kill $PROXY_PID 2>/dev/null; then
        echo "✅ Stopped proxy server (PID: $PROXY_PID)"
    fi
    rm .proxy.pid
fi

# Also kill by name as backup
pkill -f "python.*http.server" 2>/dev/null
pkill -f "node.*elasticsearch-proxy" 2>/dev/null
pkill -f "node.*local-proxy-server" 2>/dev/null

echo -e "${GREEN}✅ All services stopped${NC}"