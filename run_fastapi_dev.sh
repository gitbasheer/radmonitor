#!/bin/bash
#
# Run the FastAPI development server for RAD Monitor
#

# Set script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

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
./cleanup-ports.sh 2>/dev/null || true

# Run the FastAPI dev server
echo "🚀 Starting FastAPI development server..."
python3 dev_server_fastapi.py
