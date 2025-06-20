#!/bin/bash
# Wrapper script for backward compatibility
# This now calls the Python version of the dashboard generator

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Change to project root
cd "$PROJECT_ROOT" || exit 1

# Call the Python version with all arguments
exec python3 bin/generate_dashboard.py "$@"
