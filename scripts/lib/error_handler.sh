#!/bin/bash
# Error Handler - Common error handling utilities

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Log function with timestamp
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >&2
}

# Success message
success() {
    echo -e "${GREEN}✓ $1${NC}" >&2
}

# Warning message
warn() {
    echo -e "${YELLOW}⚠ $1${NC}" >&2
}

# Error message and exit
error() {
    echo -e "${RED}✗ $1${NC}" >&2
    exit 1
}

# Handle error with custom message
handle_error() {
    local message="$1"
    local exit_code="${2:-1}"

    error "$message"
    exit "$exit_code"
}

# Check if command exists
require_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        error "Required command '$cmd' not found. Please install it first."
    fi
}

# Ensure directory exists
ensure_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir" || error "Failed to create directory: $dir"
    fi
}
