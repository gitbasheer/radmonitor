#!/bin/bash
# cleanup-ports.sh - Wrapper for Python implementation
# This wrapper maintains backward compatibility

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON_SCRIPT="$SCRIPT_DIR/cleanup_ports.py"

# Check if Python3 is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not found in PATH" >&2
    echo "Please install Python 3 or ensure it's in your PATH" >&2
    exit 1
fi

# Check if the Python script exists
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "Error: Python script not found: $PYTHON_SCRIPT" >&2
    echo "Please ensure cleanup_ports.py exists in the same directory" >&2
    exit 1
fi

# Call the Python version with all arguments
exec python3 "$PYTHON_SCRIPT" "$@"
