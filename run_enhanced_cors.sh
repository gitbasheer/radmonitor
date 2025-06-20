#!/bin/bash
# run_enhanced_cors.sh - Run dashboard with enhanced CORS proxy using FastAPI

echo "=== RAD Monitor with Enhanced CORS Proxy (FastAPI) ==="
echo ""

# Make scripts executable
chmod +x scripts/generate_dashboard_refactored.sh
chmod +x cors_proxy_enhanced.py

# Check for configuration
if [ -f ".env" ]; then
    echo "Loading configuration from .env file..."
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "No .env file found. Checking environment variables..."
fi

# Check for elastic cookie
if [ -z "$ES_COOKIE" ] && [ -z "$ELASTIC_COOKIE" ]; then
    # Try to get from local file
    if [ -f "$HOME/scripts/traffic_monitor.sh" ]; then
        export ES_COOKIE=$(grep 'ELASTIC_COOKIE="' "$HOME/scripts/traffic_monitor.sh" | cut -d'"' -f2)
        if [ -z "$ES_COOKIE" ]; then
            echo "Error: No ES_COOKIE found"
            echo "Please set: export ES_COOKIE='your-cookie-here'"
            echo "Or create a .env file from config/env.example"
            exit 1
        fi
        echo "Found ES_COOKIE from local script"
    else
        echo "Warning: No ES_COOKIE set"
        echo "Dashboard will work but real-time updates will require manual cookie entry"
    fi
else
    # Support legacy ELASTIC_COOKIE variable
    if [ -n "$ELASTIC_COOKIE" ] && [ -z "$ES_COOKIE" ]; then
        export ES_COOKIE="$ELASTIC_COOKIE"
    fi
fi

# Check for required configuration
if [ -z "$BASELINE_START" ] || [ -z "$BASELINE_END" ]; then
    echo "Warning: BASELINE_START or BASELINE_END not set"
    echo "Using defaults: 2024-01-01 to 2024-01-07"
    export BASELINE_START="${BASELINE_START:-2024-01-01T00:00:00}"
    export BASELINE_END="${BASELINE_END:-2024-01-07T00:00:00}"
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install enhanced requirements if needed
echo "Checking enhanced proxy dependencies..."
pip install -q -r requirements-enhanced.txt

# Generate fresh dashboard
echo "Generating dashboard..."
if ./scripts/generate_dashboard_refactored.sh; then
    echo "✓ Dashboard generated"
else
    echo "✗ Dashboard generation failed"
    exit 1
fi

# Function to stop both processes
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $PROXY_PID $SERVER_PID 2>/dev/null
    deactivate
    exit
}

# Set up cleanup on Ctrl+C
trap cleanup INT

# Start centralized API (includes enhanced CORS proxy + utilities)
echo ""
echo "Starting centralized API with FastAPI on port 8889..."
python3 centralized_api.py &
PROXY_PID=$!

# Give proxy time to start
sleep 3

# Check if proxy started
if ! kill -0 $PROXY_PID 2>/dev/null; then
    echo "Error: Enhanced CORS proxy failed to start"
    deactivate
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
echo "✅ RAD Monitor is running with Centralized API!"
echo ""
echo "🌐 Dashboard URL: http://localhost:8888"
echo "🔌 Centralized API: http://localhost:8889"
echo "📚 API Documentation: http://localhost:8889/docs"
echo ""
echo "🛠️  Utility endpoints:"
echo "   • POST /api/utils/cleanup-ports - Clean up ports"
echo "   • GET  /api/utils/port-status/{port} - Check port status"
echo "   • POST /api/utils/validate - Run validation checks"
echo ""
echo "🔍 Search endpoints:"
echo "   • POST /api/search/traffic - Typed traffic search with caching"
echo "   • POST /api/proxy - CORS proxy (new endpoint)"
echo "   • POST /kibana-proxy - CORS proxy (backward compatible)"
echo ""
echo "⚙️  Configuration endpoints:"
echo "   • GET  /api/config/settings - View all settings"
echo "   • GET  /api/config/health - Check configuration health"
echo "   • GET  /api/status - System status with port usage"
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
