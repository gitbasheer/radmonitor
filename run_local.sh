#!/bin/bash
# run_local.sh - One command to generate and serve the dashboard

echo "🚀 RAD Monitor - Quick Local Setup"
echo "=================================="

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
echo "📱 Dashboard will be available at: http://localhost:8888"
echo ""
echo "🔧 To test real-time features:"
echo "   1. Click the ⚙️ gear icon"
echo "   2. Click '🔑 Set Cookie for Real-time'"
echo "   3. Paste your Elastic cookie"
echo "   4. Try changing settings and refreshing!"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================="

# Start server in current directory
python3 -m http.server 8888 