#!/bin/bash
# run_enhanced_cors.sh - Run dashboard with centralized API (includes CORS proxy)

echo "=== RAD Monitor with Centralized API ==="
echo ""

# Make scripts executable
chmod +x scripts/generate_dashboard_refactored.sh

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

# Function to stop server
cleanup() {
    echo ""
    echo "Stopping server..."
    kill $SERVER_PID 2>/dev/null
    deactivate
    exit
}

# Set up cleanup on Ctrl+C
trap cleanup INT

# Start unified server (includes everything: dashboard, API, CORS proxy, WebSocket)
echo ""
echo "Starting RAD Monitor Unified Server on port 8000..."
python3 bin/server.py &
SERVER_PID=$!

# Give server time to start
sleep 3

# Check if server started
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "Error: Unified server failed to start"
    deactivate
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ RAD Monitor Unified Server is running!"
echo ""
echo "🌐 Dashboard URL: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🔌 WebSocket: ws://localhost:8000/ws"
echo ""
echo "🛠️  API v1 endpoints:"
echo "   • POST /api/v1/utils/cleanup-ports - Clean up ports"
echo "   • POST /api/v1/utils/validate - Run validation checks"
echo "   • GET  /api/v1/metrics - View server metrics"
echo ""
echo "🔍 Dashboard endpoints:"
echo "   • GET  /api/v1/dashboard/config - Dashboard configuration"
echo "   • GET  /api/v1/dashboard/stats - Dashboard statistics"
echo "   • POST /api/v1/kibana/proxy - CORS proxy (built-in)"
echo ""
echo "⚙️  Configuration endpoints:"
echo "   • GET  /api/v1/config/settings - View all settings"
echo "   • POST /api/v1/config/update - Update configuration"
echo "   • GET  /api/v1/config/health - Check configuration health"
echo ""
echo "📝 To enable real-time updates:"
echo "   1. Open the dashboard"
echo "   2. Click 'SET COOKIE FOR REAL-TIME'"
echo "   3. Enter your Elastic cookie (sid=...)"
echo "   4. Click 'REFRESH NOW' to test"
echo ""
echo "Use Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for user to stop
wait
