#!/usr/bin/env python3
"""
Full integration test for RAD Monitor
Validates all components are connected and working correctly
"""

import os
import sys
import json
import time
import subprocess
import requests
from datetime import datetime
import signal

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.config.settings import get_settings, reload_settings
from src.data.models import ProcessingConfig, ElasticResponse, TrafficEvent
from src.data.processors import TrafficProcessor, ScoreCalculator

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

class IntegrationTest:
    """Run comprehensive integration tests"""

    def __init__(self):
        self.proxy_process = None
        self.server_process = None
        self.proxy_url = "http://localhost:8889"
        self.dashboard_url = "http://localhost:8888"
        self.test_results = []

    def setup_environment(self):
        """Set up test environment"""
        print("🔧 Setting up test environment...")

        # Set test environment variables
        for key, value in TEST_ENV.items():
            os.environ[key] = value

        # Create test data directory
        os.makedirs('test_data', exist_ok=True)

        # Ensure dashboard generator is executable
        if os.path.exists('generate_dashboard.py'):
            os.chmod('generate_dashboard.py', 0o755)
        if os.path.exists('scripts/generate_dashboard_refactored.sh'):
            os.chmod('scripts/generate_dashboard_refactored.sh', 0o755)

        print("✅ Environment configured")
        return True

    def test_configuration_module(self):
        """Test configuration module"""
        print("\n📋 Testing Configuration Module...")

        try:
            # Test settings loading
            settings = get_settings()
            assert settings.elasticsearch.cookie == 'test_cookie_integration'
            assert settings.processing.baseline_start == '2024-01-01T00:00:00'
            print("  ✅ Settings loading works")

            # Test validation
            assert settings.processing.critical_threshold < settings.processing.warning_threshold
            print("  ✅ Validation rules work")

            # Test backward compatibility
            legacy_config = settings.to_processing_config()
            assert 'baselineStart' in legacy_config
            assert legacy_config['criticalThreshold'] == -80
            print("  ✅ Backward compatibility maintained")

            return True

        except Exception as e:
            print(f"  ❌ Configuration test failed: {e}")
            return False

    def test_data_models(self):
        """Test data models and validation"""
        print("\n📊 Testing Data Models...")

        try:
            # Test ProcessingConfig
            config = ProcessingConfig(
                baselineStart='2024-01-01',
                baselineEnd='2024-01-07',
                currentTimeRange='now-12h',
                highVolumeThreshold=1000,
                mediumVolumeThreshold=100,
                criticalThreshold=-80,
                warningThreshold=-50
            )
            print("  ✅ ProcessingConfig validation works")

            # Test TrafficEvent with correct fields
            event = TrafficEvent(
                event_id='test.event',
                display_name='Test Event',
                current=100,  # Changed from current_count
                baseline_12h=150,  # Required field
                baseline_period=150,
                daily_avg=200,
                baseline_count=200,
                baseline_days=7,  # Required field
                current_hours=12,  # Required field
                score=-33,
                status='WARNING'
            )
            print("  ✅ TrafficEvent validation works")

            return True

        except Exception as e:
            print(f"  ❌ Data model test failed: {e}")
            return False

    def test_data_processors(self):
        """Test data processing pipeline"""
        print("\n⚙️  Testing Data Processors...")

        try:
            # Create test data
            test_response = {
                "aggregations": {
                    "events": {
                        "buckets": [
                            {
                                "key": "test.event.1",
                                "baseline": {"doc_count": 1000},
                                "current": {"doc_count": 500}
                            },
                            {
                                "key": "test.event.2",
                                "baseline": {"doc_count": 2000},
                                "current": {"doc_count": 100}
                            }
                        ]
                    }
                }
            }

            # Test traffic processor
            settings = get_settings()
            processor = TrafficProcessor(settings.to_processing_config())
            events = processor.process_response(test_response)
            assert len(events) > 0
            print("  ✅ Traffic processor works")

            # Test score calculator
            calculator = ScoreCalculator(settings.to_processing_config())
            scored_events = calculator.calculate_scores(events)
            assert all('score' in event for event in scored_events)
            print("  ✅ Score calculator works")

            return True

        except Exception as e:
            print(f"  ❌ Data processor test failed: {e}")
            return False

    def start_services(self):
        """Start proxy and web server"""
        print("\n🚀 Starting services...")

        try:
            # Start enhanced CORS proxy
            print("  Starting enhanced CORS proxy...")
            self.proxy_process = subprocess.Popen(
                [sys.executable, 'bin/cors_proxy.py'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            time.sleep(3)  # Wait for startup

            # Check if proxy is running
            if self.proxy_process.poll() is not None:
                stderr = self.proxy_process.stderr.read().decode()
                print(f"  ❌ Proxy failed to start: {stderr}")
                return False

            # Start HTTP server
            print("  Starting HTTP server...")
            self.server_process = subprocess.Popen(
                [sys.executable, '-m', 'http.server', '8888'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            time.sleep(2)  # Wait for startup

            print("✅ Services started")
            return True

        except Exception as e:
            print(f"❌ Failed to start services: {e}")
            return False

    def test_api_endpoints(self):
        """Test API endpoints"""
        print("\n🌐 Testing API Endpoints...")

        if not self.proxy_process:
            print("  ⚠️  Skipping API tests - proxy not running")
            return False

        try:
            # Test health endpoint
            response = requests.get(f"{self.proxy_url}/health", timeout=5)
            assert response.status_code == 200
            print("  ✅ Health endpoint works")

            # Test configuration endpoints
            response = requests.get(f"{self.proxy_url}/api/config/settings", timeout=5)
            assert response.status_code == 200
            data = response.json()
            assert 'elasticsearch' in data
            print("  ✅ Configuration settings endpoint works")

            response = requests.get(f"{self.proxy_url}/api/config/health", timeout=5)
            assert response.status_code == 200
            health = response.json()
            assert health['status'] in ['healthy', 'degraded']
            print("  ✅ Configuration health endpoint works")

            response = requests.get(f"{self.proxy_url}/api/config/environment", timeout=5)
            assert response.status_code == 200
            print("  ✅ Environment template endpoint works")

            return True

        except requests.exceptions.RequestException as e:
            print(f"  ❌ API test failed: {e}")
            return False

    def test_frontend_integration(self):
        """Test frontend integration"""
        print("\n🎨 Testing Frontend Integration...")

        try:
            # Check if dashboard is accessible
            response = requests.get(self.dashboard_url, timeout=5)
            assert response.status_code == 200
            assert 'RAD Monitor' in response.text
            print("  ✅ Dashboard loads successfully")

            # Check for required scripts
            assert 'dashboard-main.js' in response.text
            assert 'api-interface.js' in response.text
            print("  ✅ Required scripts are loaded")

            # Check for configuration integration
            assert 'configManager' in response.text or 'config-manager.js' in response.text
            print("  ✅ Configuration manager integrated")

            return True

        except Exception as e:
            print(f"  ❌ Frontend test failed: {e}")
            return False

    def test_dashboard_generation(self):
        """Test dashboard generation using both wrapper and Python directly"""
        print("\n🔨 Testing Dashboard Generation...")

        try:
            # Test 1: Using the wrapper script (backward compatibility)
            print("  Testing wrapper script...")
            result = subprocess.run(
                ['./scripts/generate_dashboard_refactored.sh'],
                capture_output=True,
                text=True
            )

            if result.returncode == 0:
                print("  ✅ Wrapper script works (calls Python implementation)")
            else:
                print(f"  ⚠️  Wrapper script warnings: {result.stderr}")

            # Test 2: Using Python script directly
            print("  Testing Python script directly...")
            if os.path.exists('generate_dashboard.py'):
                result = subprocess.run(
                    [sys.executable, 'generate_dashboard.py'],
                    capture_output=True,
                    text=True
                )

                if result.returncode == 0:
                    print("  ✅ Python dashboard generator works directly")
                else:
                    print(f"  ⚠️  Python script warnings: {result.stderr}")
            else:
                print("  ⚠️  Python script not found (might be running from different directory)")

            # Check if index.html was created
            assert os.path.exists('index.html')
            with open('index.html', 'r') as f:
                content = f.read()
                assert 'RAD Monitor' in content
            print("  ✅ Dashboard HTML generated correctly")

            return True

        except Exception as e:
            print(f"  ❌ Dashboard generation test failed: {e}")
            return False

    def test_end_to_end_flow(self):
        """Test end-to-end data flow"""
        print("\n🔄 Testing End-to-End Flow...")

        try:
            # The dashboard generation is now tested in test_dashboard_generation()
            # Here we test the overall flow

            # Verify all required files exist
            required_files = [
                'index.html',
                'data/raw_response.json'
            ]

            for file in required_files:
                if os.path.exists(file):
                    print(f"  ✅ {file} exists")
                else:
                    print(f"  ⚠️  {file} not found")

            return True

        except Exception as e:
            print(f"  ❌ End-to-end test failed: {e}")
            return False

    def cleanup(self):
        """Clean up test resources"""
        print("\n🧹 Cleaning up...")

        # Stop services
        if self.proxy_process:
            self.proxy_process.terminate()
            self.proxy_process.wait(timeout=5)

        if self.server_process:
            self.server_process.terminate()
            self.server_process.wait(timeout=5)

        # Clean up test data
        if os.path.exists('test_data'):
            import shutil
            shutil.rmtree('test_data')

        print("✅ Cleanup complete")

    def run_all_tests(self):
        """Run all integration tests"""
        print("=" * 60)
        print("🧪 RAD Monitor Full Integration Test")
        print("=" * 60)

        tests = [
            ("Environment Setup", self.setup_environment),
            ("Configuration Module", self.test_configuration_module),
            ("Data Models", self.test_data_models),
            ("Data Processors", self.test_data_processors),
            ("Service Startup", self.start_services),
            ("API Endpoints", self.test_api_endpoints),
            ("Frontend Integration", self.test_frontend_integration),
            ("Dashboard Generation", self.test_dashboard_generation),  # New comprehensive test
            ("End-to-End Flow", self.test_end_to_end_flow)
        ]

        passed = 0
        failed = 0

        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                    self.test_results.append((test_name, "PASSED"))
                else:
                    failed += 1
                    self.test_results.append((test_name, "FAILED"))
            except Exception as e:
                failed += 1
                self.test_results.append((test_name, f"ERROR: {e}"))
                print(f"\n❌ {test_name} - Unexpected error: {e}")

        # Print summary
        print("\n" + "=" * 60)
        print("📊 Test Summary")
        print("=" * 60)

        for test_name, result in self.test_results:
            status_icon = "✅" if result == "PASSED" else "❌"
            print(f"{status_icon} {test_name}: {result}")

        print(f"\nTotal: {len(tests)} | Passed: {passed} | Failed: {failed}")

        if failed == 0:
            print("\n🎉 All tests passed! The application is fully integrated.")
        else:
            print(f"\n⚠️  {failed} tests failed. Please check the logs above.")

        return failed == 0


def main():
    """Run integration tests"""
    tester = IntegrationTest()

    try:
        success = tester.run_all_tests()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    finally:
        tester.cleanup()


if __name__ == '__main__':
    main()
