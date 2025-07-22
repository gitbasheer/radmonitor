import os
import subprocess
import time
import sys

# Configuration
WEB_SERVER_COMMAND = [sys.executable, "-m", "http.server", "8000"]
PROXY_SERVER_COMMAND = ["node", "server/elasticsearch-proxy.mjs"]
PID_DIR = ".pids"
WEB_PID_FILE = os.path.join(PID_DIR, "web.pid")
PROXY_PID_FILE = os.path.join(PID_DIR, "proxy.pid")
PROXY_LOG_FILE = "proxy.log"

# Colors for output
GREEN = '\033[0;32m'
YELLOW = '\033[1;33m'
RED = '\033[0;31m'
NC = '\033[0m' # No Color

def start_services():
    """Starts the web and proxy servers."""
    print("🚀 Starting WAM Monitoring System...")

    # Create PID directory if it doesn't exist
    if not os.path.exists(PID_DIR):
        os.makedirs(PID_DIR)

    # Clean up any existing processes
    stop_services()

    # Start web server
    print("🌐 Starting web server on port 8000...")
    with open(os.devnull, 'w') as devnull:
        web_process = subprocess.Popen(WEB_SERVER_COMMAND, stdout=devnull, stderr=devnull)
    with open(WEB_PID_FILE, "w") as f:
        f.write(str(web_process.pid))

    # Start proxy server
    print("🔗 Starting Elasticsearch proxy on port 8001...")
    with open(PROXY_LOG_FILE, "w") as log_file:
        proxy_process = subprocess.Popen(PROXY_SERVER_COMMAND, stdout=log_file, stderr=log_file)
    with open(PROXY_PID_FILE, "w") as f:
        f.write(str(proxy_process.pid))

    # Wait for servers to start
    time.sleep(3)

    # Check if servers are running
    if os.path.exists(PROXY_PID_FILE):
        with open(PROXY_PID_FILE, "r") as f:
            proxy_pid = int(f.read())
        try:
            os.kill(proxy_pid, 0)
            print(f"{GREEN}✅ All services started successfully!{NC}")
            print("")
            print("╔═══════════════════════════════════════════════════════════╗")
            print("║              WAM Monitoring System Ready                  ║")
            print("╠═══════════════════════════════════════════════════════════╣")
            print("║                                                           ║")
            print(f"║  📊 Dashboard:    http://localhost:8000                  ║")
            print(f"║  🔧 WAM Test:     http://localhost:8000/wam_test_guided.html ║")
            print(f"║  🔗 Proxy:        http://localhost:8001                  ║")
            print(f"║  ❤️  Health Check: http://localhost:8001/health          ║")
            print("║                                                           ║")
            print(f"║  📝 Logs:         tail -f {PROXY_LOG_FILE}                      ║")
            print(f"║  🛑 Stop:         python bin/app_manager.py stop         ║")
            print("║                                                           ║")
            print("╚═══════════════════════════════════════════════════════════╝")
            print("")
            print(f"{YELLOW}Next steps:{NC}")
            print("1. Get your Kibana cookie from browser DevTools")
            print("2. Open http://localhost:8000/wam_test_guided.html")
            print("3. Follow the guided setup")
        except OSError:
            print(f"{RED}❌ Failed to start services{NC}")
            sys.exit(1)

def stop_services():
    """Stops the web and proxy servers."""
    print("🛑 Stopping WAM Monitoring System...")

    # Stop web server
    if os.path.exists(WEB_PID_FILE):
        with open(WEB_PID_FILE, "r") as f:
            pid = int(f.read())
        try:
            os.kill(pid, 9)
            print(f"✅ Stopped web server (PID: {pid})")
        except OSError:
            pass
        os.remove(WEB_PID_FILE)

    # Stop proxy server
    if os.path.exists(PROXY_PID_FILE):
        with open(PROXY_PID_FILE, "r") as f:
            pid = int(f.read())
        try:
            os.kill(pid, 9)
            print(f"✅ Stopped proxy server (PID: {pid})")
        except OSError:
            pass
        os.remove(PROXY_PID_FILE)

    # Backup kill by name
    subprocess.run(["pkill", "-f", "python.*http.server"], capture_output=True)
    subprocess.run(["pkill", "-f", "node.*elasticsearch-proxy"], capture_output=True)
    subprocess.run(["pkill", "-f", "node.*local-proxy-server"], capture_output=True)

    print(f"{GREEN}✅ All services stopped{NC}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "start":
            start_services()
        elif sys.argv[1] == "stop":
            stop_services()
        else:
            print(f"Usage: {sys.argv[0]} [start|stop]")
    else:
        start_services()
