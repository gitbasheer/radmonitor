#!/bin/bash
# validate_connections.sh - Wrapper for Python implementation
# This wrapper maintains backward compatibility

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Call the Python version with all arguments
exec python3 "$PROJECT_ROOT/bin/validate_connections.py" "$@"
