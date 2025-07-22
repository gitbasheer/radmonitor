#!/bin/bash
#
# Run the Simple Development Server for RAD Monitor
# Uses the working simple-server.py instead of the broken complex server
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

# Install basic requirements if needed
if [ -f "requirements.txt" ]; then
    echo "📦 Installing basic dependencies..."
    pip install -q -r requirements.txt
fi

# Clear any existing processes on ports
echo "🧹 Cleaning up ports..."
python3 bin/cleanup_ports.py 8000 2>/dev/null || true

# Generate dashboard if script exists
if [ -f "bin/generate_dashboard.py" ]; then
    echo " Generating fresh dashboard..."
    if python3 bin/generate_dashboard.py --dry-run; then
        echo "(✓)Dashboard generation ready"
    else
        echo "⚠️  Dashboard generation not configured (missing cookie)"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Starting RAD Monitor Simple Development Server..."
echo ""
echo "🌐 Dashboard URL: http://localhost:8000"
echo "📚 API Health: http://localhost:8000/health"
echo "⚙️  Config API: http://localhost:8000/api/v1/config/settings"
echo ""
echo "💡 This is a lightweight development server with mock data"
echo "   For production deployment, use: python3 bin/generate_dashboard.py"
echo ""
echo "Use Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the simple server
python3 bin/simple-server.py
