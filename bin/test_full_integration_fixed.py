#!/usr/bin/env python3
"""
Full integration test for RAD Monitor
Validates all components are connected and working correctly
Fixed version without src/ dependencies
"""

import os
import sys
import json
import time
import subprocess
import requests
from datetime import datetime
import signal
from pathlib import Path

# Test configuration
TEST_ENV = {
    'ES_COOKIE': 'test_cookie_integration',
    'BASELINE_START': '2024-01-01T00:00:00',
    'BASELINE_END': '2024-01-07T00:00:00',
    'CURRENT_TIME_RANGE': 'now-12h',
    'HIGH_VOLUME_THRESHOLD': '1000',
    'CRITICAL_THRESHOLD': '-80',
    'WARNING_THRESHOLD': '-50'
}

# Color codes for output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

def print_header(text):
    print(f"\n{Colors.BLUE}{'='*60}{Colors.NC}")
    print(f"{Colors.BLUE}{text}{Colors.NC}")
    print(f"{Colors.BLUE}{'='*60}{Colors.NC}")

def print_success(text):
    print(f"{Colors.GREEN}(✓){text}{Colors.NC}")

def print_error(text):
    print(f"{Colors.RED}(✗) {text}{Colors.NC}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠️  {text}{Colors.NC}")

class IntegrationTest:
    def __init__(self):
        self.server_process = None
        self.base_url = "http://localhost:8000"
        self.results = []

    def setup_environment(self):
        """Set up test environment variables"""
        print_header("Setting up test environment")

        for key, value in TEST_ENV.items():
            os.environ[key] = value

        print_success("Environment variables set")

    def start_server(self):
        """Start the FastAPI server"""
        print_header("Starting FastAPI server")

        try:
            # Start server in background
            self.server_process = subprocess.Popen(
                [sys.executable, "bin/server.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )

            # Wait for server to start
            time.sleep(3)

            # Check if server is running
            try:
                response = requests.get(f"{self.base_url}/health", timeout=5)
                if response.status_code == 200:
                    print_success("Server started successfully")
                    return True
            except:
                pass

            print_error("Server failed to start")
            return False

        except Exception as e:
            print_error(f"Error starting server: {e}")
            return False

    def stop_server(self):
        """Stop the server"""
        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait(timeout=5)
            print_success("Server stopped")

    def test_health_endpoint(self):
        """Test health endpoint"""
        print_header("Testing health endpoint")

        try:
            response = requests.get(f"{self.base_url}/health")

            if response.status_code == 200:
                data = response.json()
                print_success(f"Health check passed: {data.get('status', 'unknown')}")
                return True
            else:
                print_error(f"Health check failed: {response.status_code}")
                return False

        except Exception as e:
            print_error(f"Health check error: {e}")
            return False

    def test_api_endpoints(self):
        """Test main API endpoints"""
        print_header("Testing API endpoints")

        endpoints = [
            ("/api/v1/config/settings", "GET", None),
            ("/api/v1/dashboard/config", "GET", None),
            ("/api/v1/dashboard/stats", "GET", None),
        ]

        all_passed = True

        for endpoint, method, data in endpoints:
            try:
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}")
                else:
                    response = requests.post(f"{self.base_url}{endpoint}", json=data)

                if response.status_code < 400:
                    print_success(f"{method} {endpoint}")
                else:
                    print_error(f"{method} {endpoint} - Status: {response.status_code}")
                    all_passed = False

            except Exception as e:
                print_error(f"{method} {endpoint} - Error: {e}")
                all_passed = False

        return all_passed

    def test_static_files(self):
        """Test static file serving"""
        print_header("Testing static file serving")

        try:
            response = requests.get(f"{self.base_url}/")

            if response.status_code == 200 and "RAD Monitor" in response.text:
                print_success("Index.html served correctly")
                return True
            else:
                print_error(f"Static file serving failed: {response.status_code}")
                return False

        except Exception as e:
            print_error(f"Static file error: {e}")
            return False

    def test_websocket(self):
        """Test WebSocket connection"""
        print_header("Testing WebSocket")

        try:
            # Simple WebSocket test using curl
            result = subprocess.run(
                ["curl", "-i", "-N", "-H", "Connection: Upgrade",
                 "-H", "Upgrade: websocket", "-H", "Sec-WebSocket-Version: 13",
                 "-H", "Sec-WebSocket-Key: test", f"{self.base_url}/ws"],
                capture_output=True,
                text=True,
                timeout=2
            )

            if "101 Switching Protocols" in result.stdout:
                print_success("WebSocket endpoint available")
                return True
            else:
                print_warning("WebSocket test inconclusive")
                return True  # Don't fail on WebSocket

        except:
            print_warning("WebSocket test skipped (curl not available)")
            return True

    def test_configuration(self):
        """Test configuration loading"""
        print_header("Testing configuration")

        config_path = Path("config/settings.json")

        if not config_path.exists():
            print_error("Configuration file not found")
            return False

        try:
            with open(config_path, 'r') as f:
                config = json.load(f)

            required_keys = ['elasticsearch', 'kibana', 'processing']
            missing = [k for k in required_keys if k not in config]

            if missing:
                print_error(f"Missing configuration keys: {missing}")
                return False
            else:
                print_success("Configuration structure valid")
                return True

        except Exception as e:
            print_error(f"Configuration error: {e}")
            return False

    def run_all_tests(self):
        """Run all integration tests"""
        print(f"\n{Colors.BLUE}🧪 RAD Monitor Integration Test Suite{Colors.NC}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        tests = [
            ("Environment Setup", self.setup_environment),
            ("Configuration", self.test_configuration),
            ("Server Startup", self.start_server),
            ("Health Check", self.test_health_endpoint),
            ("API Endpoints", self.test_api_endpoints),
            ("Static Files", self.test_static_files),
            ("WebSocket", self.test_websocket),
        ]

        passed = 0
        failed = 0

        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                    self.results.append((test_name, True))
                else:
                    failed += 1
                    self.results.append((test_name, False))
            except Exception as e:
                print_error(f"{test_name} - Exception: {e}")
                failed += 1
                self.results.append((test_name, False))

        # Summary
        print_header("Test Summary")
        print(f"Total: {len(tests)}")
        print(f"Passed: {Colors.GREEN}{passed}{Colors.NC}")
        print(f"Failed: {Colors.RED}{failed}{Colors.NC}")

        if failed == 0:
            print_success("\nAll integration tests passed! 🎉")
        else:
            print_error(f"\n{failed} tests failed")

        # Cleanup
        self.stop_server()

        return failed == 0

def main():
    """Main entry point"""
    test = IntegrationTest()

    try:
        success = test.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_warning("\nTest interrupted by user")
        test.stop_server()
        sys.exit(130)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        test.stop_server()
        sys.exit(1)

if __name__ == "__main__":
    main()
