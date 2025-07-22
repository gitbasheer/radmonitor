#!/bin/bash

echo "🚀 Starting WAM Visualizer (Standalone)..."

# Kill any existing servers on port 8002
lsof -ti:8002 | xargs kill -9 2>/dev/null
lsof -ti:8001 | xargs kill -9 2>/dev/null

# Start a simple HTTP server for WAM
echo " Starting WAM visualizer on http://localhost:8002/wam-visualizer.html"
python3 -m http.server 8002 &
HTTP_PID=$!

# Start the Elasticsearch proxy
echo "🔗 Starting Elasticsearch proxy on port 8001..."
cd "$(dirname "$0")"
node server/elasticsearch-proxy.mjs &
PROXY_PID=$!

sleep 2

echo ""
echo "✅ WAM Visualizer is ready!"
echo ""
echo " Open: http://localhost:8002/wam-visualizer.html"
echo "🧪 Test: http://localhost:8002/wam_test_guided.html"
echo ""
echo "Press Ctrl+C to stop"

# Handle Ctrl+C
trap "kill $HTTP_PID $PROXY_PID 2>/dev/null; exit" INT

# Wait forever
wait