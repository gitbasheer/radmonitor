#!/bin/bash
#
# Run the Main Development Server for RAD Monitor
# Uses the fully-featured server.py with WebSocket support
#

# Set script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "(✗) Python 3 is required but not installed."
    exit 1
fi

# Install requirements if needed
if [ -f "requirements.txt" ]; then
    echo "📦 Installing dependencies..."
    pip install -q -r requirements.txt
fi

# Clear any existing processes on ports
echo "🧹 Cleaning up ports..."
python3 bin/cleanup_ports.py 8000 2>/dev/null || true

# Validate connections
echo "🔍 Validating setup..."
if python3 bin/validate_connections.py; then
    echo "(✓)All checks passed"
else
    echo "⚠️  Some checks failed, but continuing..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Starting RAD Monitor Development Server..."
echo ""
echo "🌐 Dashboard URL: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs (if enabled)"
echo "⚙️  Health Check: http://localhost:8000/health"
echo "🔌 WebSocket: ws://localhost:8000/ws"
echo ""
echo "💡 This is the full-featured development server with:"
echo "   - WebSocket support for real-time updates"
echo "   - Complete API endpoints"
echo "   - Static file serving"
echo "   - CORS support"
echo ""
echo "Use Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the main server
exec python3 bin/server.py
