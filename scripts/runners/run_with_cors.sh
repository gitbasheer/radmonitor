#!/bin/bash
# run_with_cors.sh - Run dashboard with CORS proxy for real-time updates

echo "=== RAD Monitor with CORS Proxy ==="
echo ""

# Make scripts executable
chmod +x scripts/generate_dashboard_refactored.sh  # Wrapper for Python implementation
chmod +x bin/cors_proxy.py

# Check for elastic cookie
if [ -z "$ELASTIC_COOKIE" ]; then
    # Try to get from local file
    if [ -f "$HOME/scripts/traffic_monitor.sh" ]; then
        export ELASTIC_COOKIE=$(grep 'ELASTIC_COOKIE="' "$HOME/scripts/traffic_monitor.sh" | cut -d'"' -f2)
        if [ -z "$ELASTIC_COOKIE" ]; then
            echo "Error: No ELASTIC_COOKIE found in ~/scripts/traffic_monitor.sh"
            echo "Please set: export ELASTIC_COOKIE='your-cookie-here'"
            exit 1
        fi
        echo "Found ELASTIC_COOKIE from local script"
    else
        echo "Warning: No ELASTIC_COOKIE set"
        echo "Dashboard will work but real-time updates will require manual cookie entry"
    fi
fi

# Generate fresh dashboard
echo "Generating dashboard..."
if ./scripts/generate_dashboard_refactored.sh; then
    echo "(✓) Dashboard generated"
else
    echo "(✗)Dashboard generation failed"
    exit 1
fi

# Function to stop both processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $PROXY_PID $SERVER_PID 2>/dev/null
    exit
}

# Set up cleanup on Ctrl+C
trap cleanup INT

# Start CORS proxy
echo ""
echo "Starting CORS proxy on port 8889..."
python3 bin/cors_proxy.py &
PROXY_PID=$!

# Give proxy time to start
sleep 2

# Check if proxy started
if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "Error: CORS proxy failed to start"
    exit 1
fi

# Start HTTP server
echo "Starting HTTP server on port 8888..."
python3 -m http.server 8888 &
SERVER_PID=$!

# Give server time to start
sleep 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "(✓)RAD Monitor is running!"
echo ""
echo "🌐 Dashboard URL: http://localhost:8888"
echo "🔌 CORS Proxy: http://localhost:8889"
echo ""
echo "📝 To enable real-time updates:"
echo "   1. Open the dashboard"
echo "   2. Click 'SET COOKIE FOR REAL-TIME'"
echo "   3. Enter your Elastic cookie (sid=...)"
echo "   4. Click 'REFRESH NOW' to test"
echo ""
echo "Use Ctrl+C to stop both servers"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for user to stop
wait
