#!/bin/bash
# run_local_auto.sh - Generate, serve, and open dashboard automatically

echo "🚀 RAD Monitor - Quick Setup + Auto-Open"
echo "========================================"

# Make sure scripts are executable
chmod +x scripts/generate_dashboard.sh

# More robust server cleanup
echo "🔪 Stopping any existing server on port 8888..."
# Method 1: Kill by process name
pkill -f "python3 -m http.server 8888" 2>/dev/null || true
# Method 2: Kill by port (more reliable)
if command -v lsof > /dev/null; then
    PID=$(lsof -ti:8888 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo "   Found process $PID using port 8888, killing it..."
        kill -9 $PID 2>/dev/null || true
        sleep 1
    fi
fi

# Double-check port is free
if command -v lsof > /dev/null; then
    if lsof -i:8888 >/dev/null 2>&1; then
        echo "❌ Port 8888 still in use. Please run: kill -9 \$(lsof -ti:8888)"
        echo "   Or try a different port manually: python3 -m http.server 8889"
        exit 1
    fi
fi

# Generate fresh dashboard
echo "📊 Generating fresh dashboard..."
if ./scripts/generate_dashboard.sh; then
    echo "✅ Dashboard generated successfully!"
else
    echo "❌ Dashboard generation failed!"
    exit 1
fi

# Check if index.html was created
if [ ! -f "index.html" ]; then
    echo "❌ index.html not found!"
    exit 1
fi

echo ""
echo "🌐 Starting local server..."
echo "📱 Opening http://localhost:8888 in your browser..."
echo ""
echo "🔧 Real-time testing guide:"
echo "   1. Click the ⚙️ gear icon"
echo "   2. Click '🔑 Set Cookie for Real-time'"
echo "   3. Paste your Elastic cookie"
echo "   4. Change time window from 12h to 6h"
echo "   5. Click 'Apply Configuration'"
echo "   6. Click 'Refresh Now' - should update instantly!"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"

# Start server in background
python3 -m http.server 8888 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Open browser (works on macOS, Linux, and Windows)
if command -v open > /dev/null; then
    # macOS
    open http://localhost:8888
elif command -v xdg-open > /dev/null; then
    # Linux
    xdg-open http://localhost:8888
elif command -v start > /dev/null; then
    # Windows
    start http://localhost:8888
else
    echo "Could not auto-open browser. Please visit: http://localhost:8888"
fi

# Wait for the server (keeps script running)
wait $SERVER_PID 