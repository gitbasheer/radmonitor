#!/usr/bin/env python3
"""
Unified Development Server for RAD Monitor
Launches the consolidated server that includes all functionality
"""
import subprocess
import sys
import os
from pathlib import Path


def main():
    """Launch the unified server"""
    # Clean up ports first
    cleanup_script = Path("scripts/setup/cleanup-ports.sh")
    if cleanup_script.exists():
        print("🧹 Cleaning up ports...")
        subprocess.run([str(cleanup_script)], capture_output=True)
    
    # Clear screen and show header
    os.system('clear' if os.name != 'nt' else 'cls')
    print("═" * 60)
    print("🎯 RAD Monitor - Unified Development Server")
    print("═" * 60)
    print("")
    print("Starting unified server with all features:")
    print("  ✅ Dashboard serving")
    print("  ✅ API endpoints with /api/v1 prefix")
    print("  ✅ WebSocket support")
    print("  ✅ Built-in CORS handling")
    print("  ✅ Configuration management")
    print("  ✅ Utilities and metrics")
    print("")
    print("No separate CORS proxy needed!")
    print("")
    
    # Run the unified server
    server_path = Path("bin/server.py")
    if not server_path.exists():
        print(f"❌ Error: {server_path} not found!")
        sys.exit(1)
    
    try:
        # Run the server
        subprocess.run([sys.executable, str(server_path)])
    except KeyboardInterrupt:
        print("\n\n✋ Server stopped by user")
    except Exception as e:
        print(f"\n❌ Error running server: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
