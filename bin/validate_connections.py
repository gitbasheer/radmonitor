#!/usr/bin/env python3
"""
RAD Monitor Connection Validation
Validates all components are properly connected
100% functional replacement for validate_connections.sh

Fixed version without src/ directory dependencies

NOTE: This script now uses the enhanced version with comprehensive error handling.
For the original simple version, see validate_connections_simple.py
For production security/performance checks, see validate_connections_production.py
"""

# Use the enhanced version with proper error handling
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from validate_connections_enhanced import main

if __name__ == '__main__':
    main()
