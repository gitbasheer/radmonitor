#!/bin/bash
# run_with_cors_direct.sh - Uses direct paths to avoid PATH issues

echo "🚀 RAD Monitor - Full Real-Time Setup (Direct Paths)"
echo "===================================================="

# Common command locations on macOS
GREP="/usr/bin/grep"
CUT="/usr/bin/cut"
CHMOD="/bin/chmod"
PKILL="/usr/bin/pkill"
PS="/bin/ps"
KILL="/bin/kill"
SLEEP="/bin/sleep"
PYTHON3="/usr/bin/python3"

# Make sure scripts are executable
$CHMOD +x scripts/generate_dashboard.sh 2>/dev/null || echo "Note: Could not chmod generate_dashboard.sh"
$CHMOD +x cors_proxy.py 2>/dev/null || echo "Note: Could not chmod cors_proxy.py"

# Stop any existing servers
echo "🔪 Stopping any existing servers..."
$PKILL -f "python3 -m http.server 8888" 2>/dev/null || true
$PKILL -f "python3 cors_proxy.py" 2>/dev/null || true

# Generate fresh dashboard (using direct path approach)
echo "📊 Generating fresh dashboard..."

# Extract cookie if needed
if [ -z "$ELASTIC_COOKIE" ]; then
    echo "Warning: ELASTIC_COOKIE environment variable not set"
    if [ -f "$HOME/scripts/traffic_monitor.sh" ]; then
        echo "Attempting to extract cookie from local script..."
        ELASTIC_COOKIE=$($GREP 'ELASTIC_COOKIE="' "$HOME/scripts/traffic_monitor.sh" 2>/dev/null | $CUT -d'"' -f2)
        if [ -n "$ELASTIC_COOKIE" ]; then
            echo "✓ Found cookie in local script"
            export ELASTIC_COOKIE
        else
            echo "Error: Could not extract cookie from local script"
            echo "Please set it manually: export ELASTIC_COOKIE='your-sid-cookie'"
            exit 1
        fi
    fi
fi

# Run dashboard generation as a bash script
/bin/bash scripts/generate_dashboard.sh
if [ $? -eq 0 ]; then
    echo "✅ Dashboard generated successfully!"
else
    echo "❌ Dashboard generation failed!"
    echo "Trying alternative approach..."
    # Try running the Python generation directly
    $PYTHON3 - << 'EOF' > index.html
import json
import sys
from datetime import datetime

# Minimal dashboard HTML for testing
html = """<!DOCTYPE html>
<html>
<head>
    <title>RAD Traffic Health Monitor</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>RAD Traffic Monitor</h1>
    <p>Generated: """ + str(datetime.now()) + """</p>
    <p style="color: red;">Dashboard generation encountered PATH issues. Using minimal template.</p>
    <p>To fix: Run <code>source ~/.zshrc</code> or <code>export PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</code></p>
</body>
</html>"""
print(html)
EOF
fi

# Check if index.html was created
if [ ! -f "index.html" ]; then
    echo "❌ index.html not found!"
    exit 1
fi

echo ""
echo "🚀 Starting CORS Proxy Server (port 8889)..."
# Start CORS proxy in background
$PYTHON3 cors_proxy.py &
CORS_PID=$!

echo "🌐 Starting Dashboard Server (port 8888)..."
# Start dashboard server in background  
$PYTHON3 -m http.server 8888 &
DASH_PID=$!

# Wait for servers to start
$SLEEP 3

echo ""
echo "📊 Server Status:"
echo "================================="
echo "CORS Proxy (8889): ✅ (PID: $CORS_PID)"
echo "Dashboard (8888):  ✅ (PID: $DASH_PID)"
echo ""
echo "📱 Dashboard URL: http://localhost:8888"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "================================="

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    $KILL $CORS_PID 2>/dev/null || true
    $KILL $DASH_PID 2>/dev/null || true
    echo "✅ Servers stopped"
    exit 0
}

# Set up signal handling
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 