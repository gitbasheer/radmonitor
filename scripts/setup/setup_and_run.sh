#!/bin/bash
# setup_and_run.sh - Setup configuration and run RAD Monitor

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 RAD Monitor Setup & Run"
echo "========================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."

    # Create .env with sensible defaults
    cat > .env << 'EOF'
# RAD Monitor Configuration
# This is a working configuration file - update with your actual values

# REQUIRED: Your Elasticsearch cookie
ES_COOKIE=your_actual_cookie_here

# REQUIRED: Baseline period (update to your actual dates)
BASELINE_START=2024-01-01T00:00:00
BASELINE_END=2024-01-08T00:00:00

# Current time range to analyze
CURRENT_TIME_RANGE=now-12h

# Thresholds
HIGH_VOLUME_THRESHOLD=1000
MEDIUM_VOLUME_THRESHOLD=100
CRITICAL_THRESHOLD=-80
WARNING_THRESHOLD=-50

# Dashboard settings
DASHBOARD_REFRESH_INTERVAL=300
DASHBOARD_MAX_EVENTS_DISPLAY=200
EOF

    echo "(✓)Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: You need to update ES_COOKIE in .env"
    echo "   1. Open .env in an editor"
    echo "   2. Replace 'your_actual_cookie_here' with your Elasticsearch cookie"
    echo "   3. Get cookie from browser: F12 > Network > Kibana request > Cookie header"
    echo ""
    read -p "Press Enter after updating .env with your cookie..."
fi

# Load configuration
echo "📋 Loading configuration..."
export $(cat .env | grep -v '^#' | xargs)

# Validate critical configuration
if [ "$ES_COOKIE" = "your_actual_cookie_here" ]; then
    echo "(✗) ERROR: You must update ES_COOKIE in .env file!"
    echo "   Edit .env and replace 'your_actual_cookie_here' with your actual cookie"
    exit 1
fi

# Run validation
echo ""
echo "🔍 Running validation..."
./validate_connections.sh

if [ $? -ne 0 ]; then
    echo ""
    echo "(✗) Validation failed. Please fix the issues above."
    exit 1
fi

# Start services
echo ""
echo "(✓)All checks passed! Starting RAD Monitor..."
echo ""
# Use the main development server
"$PROJECT_ROOT/scripts/runners/run_dev.sh"
