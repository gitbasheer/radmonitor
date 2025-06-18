#!/bin/bash
# run_with_cors.sh - Start dashboard with CORS proxy for full real-time functionality

echo "🚀 RAD Monitor - Full Real-Time Setup"
echo "====================================="

# Make sure scripts are executable
chmod +x scripts/generate_dashboard.sh
chmod +x cors_proxy.py

# Stop any existing servers
echo "🔪 Stopping any existing servers..."
pkill -f "python3 -m http.server 8888" 2>/dev/null || true
pkill -f "python3 cors_proxy.py" 2>/dev/null || true

# Kill processes on both ports
if command -v lsof > /dev/null; then
    for port in 8888 8889; do
        PID=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$PID" ]; then
            echo "   Killing process $PID on port $port..."
            kill -9 $PID 2>/dev/null || true
        fi
    done
    sleep 1
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
echo "🚀 Starting CORS Proxy Server (port 8889)..."
# Start CORS proxy in background
python3 cors_proxy.py &
CORS_PID=$!

echo "🌐 Starting Dashboard Server (port 8888)..."
# Start dashboard server in background  
python3 -m http.server 8888 &
DASH_PID=$!

# Wait for servers to start
sleep 3

# Check if both servers are running
CORS_RUNNING=false
DASH_RUNNING=false

if ps -p $CORS_PID > /dev/null 2>&1; then
    CORS_RUNNING=true
fi

if ps -p $DASH_PID > /dev/null 2>&1; then
    DASH_RUNNING=true
fi

echo ""
echo "📊 Server Status:"
echo "================================="
echo "CORS Proxy (8889): $([ "$CORS_RUNNING" = true ] && echo "✅ Running" || echo "❌ Failed")"
echo "Dashboard (8888):  $([ "$DASH_RUNNING" = true ] && echo "✅ Running" || echo "❌ Failed")"
echo ""

if [ "$CORS_RUNNING" = true ] && [ "$DASH_RUNNING" = true ]; then
    echo "🎉 SUCCESS! Both servers are running!"
    echo ""
    echo "📱 Dashboard URL: http://localhost:8888"
    echo "🔧 CORS Proxy:   http://localhost:8889/health"
    echo ""
    echo "🔑 SETUP STEPS:"
    echo "1. Open http://localhost:8888 in your browser"
    echo "2. Click the ⚙️ gear icon (sidebar)"  
    echo "3. Click 'SET COOKIE FOR REAL-TIME'"
    echo "4. Paste your Elastic cookie (sid=...)"
    echo "5. Click 'REFRESH NOW' - should work instantly!"
    echo ""
    echo "✨ REAL-TIME FEATURES:"
    echo "• Configuration changes apply immediately"
    echo "• No page reloads needed"
    echo "• Timestamp updates automatically"
    echo "• Live data from Kibana"
    echo ""
else
    echo "❌ STARTUP FAILED!"
    if [ "$CORS_RUNNING" = false ]; then
        echo "• CORS Proxy failed to start on port 8889"
    fi
    if [ "$DASH_RUNNING" = false ]; then
        echo "• Dashboard server failed to start on port 8888"
    fi
    echo ""
    echo "Try running individual servers:"
    echo "• python3 cors_proxy.py"
    echo "• python3 -m http.server 8888"
fi

# Open browser automatically on macOS
if [ "$CORS_RUNNING" = true ] && [ "$DASH_RUNNING" = true ]; then
    sleep 2
    if command -v open > /dev/null; then
        echo "🌐 Opening dashboard in browser..."
        open http://localhost:8888
    elif command -v xdg-open > /dev/null; then
        echo "🌐 Opening dashboard in browser..."
        xdg-open http://localhost:8888
    fi
fi

echo ""
echo "Press Ctrl+C to stop both servers"
echo "================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    if [ ! -z "$CORS_PID" ]; then
        kill $CORS_PID 2>/dev/null || true
    fi
    if [ ! -z "$DASH_PID" ]; then
        kill $DASH_PID 2>/dev/null || true
    fi
    
    # Force kill any remaining processes
    pkill -f "python3 cors_proxy.py" 2>/dev/null || true
    pkill -f "python3 -m http.server 8888" 2>/dev/null || true
    
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 