#!/usr/bin/env python3
"""
Development server for RAD Monitor - serves the new modular version
"""
import subprocess
import sys
import os
import time
import signal
import shutil
import http.server
import socketserver
from pathlib import Path

def signal_handler(sig, frame):
    print('\n\n✋ Stopping development servers...')
    sys.exit(0)

def setup_dev_environment():
    """Setup development environment with template"""
    print("📦 Setting up development environment...")

    # Copy index.html to a dev version
    source_path = Path("index.html")
    dev_html_path = Path("dev_index.html")

    if source_path.exists():
        # Read source file and prepare for development
        with open(source_path, 'r') as f:
            template_content = f.read()

        # Replace placeholders with development values
        dev_content = template_content.replace(
            "{{TIMESTAMP}}", "Development Mode - Real-time updates"
        ).replace(
            "{{CRITICAL_COUNT}}", "0"
        ).replace(
            "{{WARNING_COUNT}}", "0"
        ).replace(
            "{{NORMAL_COUNT}}", "0"
        ).replace(
            "{{INCREASED_COUNT}}", "0"
        ).replace(
            "{{TABLE_ROWS}}", '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">Loading... Click "REFRESH NOW" to load data</td></tr>'
        )

        # Write development version
        with open(dev_html_path, 'w') as f:
            f.write(dev_content)

        print("✅ Development version created")
    else:
        print("❌ index.html not found")

class DevHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Serve dev_index.html for root requests
        if self.path == '/' or self.path == '/index.html':
            self.path = '/dev_index.html'
        # Handle Chrome DevTools requests silently
        elif self.path.startswith('/.well-known/'):
            self.send_response(404)
            self.end_headers()
            return
        return super().do_GET()

    def log_message(self, format, *args):
        # Suppress logging for Chrome DevTools requests
        if '/.well-known/' not in args[0]:
            super().log_message(format, *args)

def main():
    signal.signal(signal.SIGINT, signal_handler)

    # Clear screen and show banner
    os.system('clear' if os.name != 'nt' else 'cls')
    print("""
╔══════════════════════════════════════════════════════════╗
║          RAD Monitor Development Server (NEW UI)         ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║     CORS Proxy:  http://localhost:8889                   ║
║     Dashboard:   http://localhost:8000  ← Open this      ║
║                                                          ║
║  🚀 Now serving the NEW modular version with controls!   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    """)

    # Setup development environment
    setup_dev_environment()

    # Start CORS proxy
    cors_process = subprocess.Popen(
        [sys.executable, 'bin/cors_proxy.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )

    # Start custom web server
    handler = DevHTTPRequestHandler
    httpd = socketserver.TCPServer(("", 8000), handler)

    print("Both servers started successfully!")
    print("🎉 You should now see the NEW dashboard with control panel!\n")

    try:
        # Start the HTTP server in a thread-like manner
        import threading
        server_thread = threading.Thread(target=httpd.serve_forever)
        server_thread.daemon = True
        server_thread.start()

        # Wait for processes
        while True:
            # Check if processes are still running
            if cors_process.poll() is not None:
                print("⚠️  CORS proxy stopped unexpectedly")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        # Clean shutdown
        print("\n" + "-" * 50)
        print("Shutting down...")
        httpd.shutdown()
        cors_process.terminate()
        cors_process.wait()

        # Cleanup dev file
        dev_file = Path("dev_index.html")
        if dev_file.exists():
            dev_file.unlink()
            print("🧹 Cleaned up development files")

        print("✅ All servers stopped cleanly.")

if __name__ == "__main__":
    main()
