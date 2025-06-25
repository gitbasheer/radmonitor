#!/usr/bin/env python3
"""
Unified Development Server for RAD Monitor
Intelligently chooses between FastAPI and Simple modes based on availability and flags
"""
import argparse
import subprocess
import sys
import os
import shutil
from pathlib import Path


def check_fastapi_available():
    """Check if FastAPI dependencies are available"""
    try:
        import fastapi
        import uvicorn
        import pydantic
        return True
    except ImportError:
        return False


def check_venv_available():
    """Check if virtual environment exists and is activated"""
    venv_path = Path("venv")
    if not venv_path.exists():
        return False

    # Check if we're in the venv or can activate it
    if os.environ.get('VIRTUAL_ENV'):
        return True

    # Try to find activation script
    if sys.platform == "win32":
        activate_script = venv_path / "Scripts" / "activate.bat"
    else:
        activate_script = venv_path / "bin" / "activate"

    return activate_script.exists()


def setup_fastapi_environment():
    """Set up FastAPI environment if needed"""
    print("🔧 Setting up FastAPI environment...")

    venv_path = Path("venv")
    if not venv_path.exists():
        print("📦 Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)

    # Determine activation command
    if sys.platform == "win32":
        pip_cmd = ["venv/Scripts/pip"]
        python_cmd = ["venv/Scripts/python"]
    else:
        pip_cmd = ["venv/bin/pip"]
        python_cmd = ["venv/bin/python"]

    print("📦 Installing FastAPI dependencies...")
    subprocess.run([*pip_cmd, "install", "-q", "--upgrade", "pip"], check=True)
    subprocess.run([*pip_cmd, "install", "-q", "-r", "requirements-enhanced.txt"], check=True)

    return python_cmd


def run_simple_mode():
    """Run the simple development server"""
    print("🚀 Starting Simple Development Server...")
    print("   - Fast startup, basic features")
    print("   - HTTP server + CORS proxy")
    print("")

    # Import and run the simple server
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from dev_server import main as simple_main
    simple_main()


def run_fastapi_mode(python_cmd=None):
    """Run the FastAPI development server"""
    print("🚀 Starting FastAPI Development Server...")
    print("   - Full features: WebSocket, API endpoints, validation")
    print("   - Real-time updates and performance monitoring")
    print("")

    if python_cmd:
        # Run with specific Python executable (from venv)
        subprocess.run([*python_cmd, "bin/dev_server_fastapi.py"])
    else:
        # Run with current Python
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from dev_server_fastapi import app
        import uvicorn

        # Clean up ports first
        subprocess.run(["scripts/setup/cleanup-ports.sh"], capture_output=True)

        # Run FastAPI server
        uvicorn.run(
            "dev_server_fastapi:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info",
            app_dir=os.path.dirname(os.path.abspath(__file__))
        )


def auto_detect_mode():
    """Auto-detect the best mode based on environment"""
    # Check if FastAPI is available in current environment
    if check_fastapi_available():
        return "fastapi"

    # Check if we can set up FastAPI environment
    if check_venv_available() or Path("requirements-enhanced.txt").exists():
        return "fastapi-setup"

    # Fall back to simple mode
    return "simple"


def main():
    parser = argparse.ArgumentParser(
        description="Unified RAD Monitor Development Server",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Mode Selection:
  auto (default)  - Automatically choose the best available mode
  fastapi        - Use FastAPI server with full features
  simple         - Use simple HTTP server for quick testing

Examples:
  %(prog)s                    # Auto-detect best mode
  %(prog)s --mode fastapi     # Force FastAPI mode
  %(prog)s --mode simple      # Force simple mode
  %(prog)s --setup            # Set up FastAPI environment and run
        """
    )

    parser.add_argument(
        "--mode",
        choices=["auto", "fastapi", "simple"],
        default="auto",
        help="Development server mode"
    )

    parser.add_argument(
        "--setup",
        action="store_true",
        help="Set up FastAPI environment if needed"
    )

    parser.add_argument(
        "--force-simple",
        action="store_true",
        help="Force simple mode even if FastAPI is available"
    )

    args = parser.parse_args()

    # Clear screen and show header
    os.system('clear' if os.name != 'nt' else 'cls')
    print("═" * 60)
    print("🎯 RAD Monitor - Unified Development Server")
    print("═" * 60)
    print("")

    # Force simple mode if requested
    if args.force_simple:
        mode = "simple"
    elif args.mode == "auto":
        mode = auto_detect_mode()
    else:
        mode = args.mode

    # Handle setup mode
    if args.setup or mode == "fastapi-setup":
        try:
            python_cmd = setup_fastapi_environment()
            print("✅ FastAPI environment ready")
            print("")
            run_fastapi_mode(python_cmd)
            return
        except Exception as e:
            print(f"❌ FastAPI setup failed: {e}")
            print("🔄 Falling back to simple mode...")
            print("")
            mode = "simple"

    # Run the selected mode
    if mode == "fastapi":
        if not check_fastapi_available():
            print("❌ FastAPI not available in current environment")
            print("💡 Run with --setup to install dependencies")
            print("🔄 Falling back to simple mode...")
            print("")
            run_simple_mode()
        else:
            run_fastapi_mode()

    elif mode == "simple":
        run_simple_mode()

    else:
        print(f"❌ Unknown mode: {mode}")
        sys.exit(1)


if __name__ == "__main__":
    main()
