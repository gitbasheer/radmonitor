#!/bin/bash
#
# Run the FastAPI development server for RAD Monitor
#

# Set script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/upgrade requirements
echo "📦 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements-enhanced.txt

# Additional FastAPI dependencies
pip install -q fastapi uvicorn[standard] websockets httpx pytest-asyncio

# Clear any existing processes on ports
echo "🧹 Cleaning up ports..."
./scripts/setup/cleanup-ports.sh 2>/dev/null || true

# Run the unified server
echo "🚀 Starting RAD Monitor Unified Server..."
python3 bin/server.py
