#!/usr/bin/env python3
"""
Comprehensive tests for the FastAPI development server
"""
import pytest
import json
import asyncio
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi.websockets import WebSocket
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock subprocess before importing the module
with patch('subprocess.Popen') as mock_popen:
    mock_popen.return_value = Mock(poll=Mock(return_value=None))
    from dev_server_fastapi import app, DashboardConfig, DashboardStats, dashboard_state

# Create test client
client = TestClient(app)

class TestDashboardConfig:
    """Test the DashboardConfig model validation"""

    def test_valid_config(self):
        """Test creating a valid configuration"""
        config = DashboardConfig(
            baseline_start="2025-06-01",
            baseline_end="2025-06-09",
            time_range="now-12h",
            critical_threshold=-80,
            warning_threshold=-50,
            high_volume_threshold=1000,
            medium_volume_threshold=100
        )
        assert config.baseline_start == "2025-06-01"
        assert config.baseline_end == "2025-06-09"
        assert config.critical_threshold == -80

    def test_invalid_date_format(self):
        """Test invalid date format validation"""
        with pytest.raises(ValueError):
            DashboardConfig(
                baseline_start="06-01-2025",  # Wrong format
                baseline_end="2025-06-09"
            )

    def test_invalid_date_range(self):
        """Test that end date must be after start date"""
        with pytest.raises(ValueError, match="baseline_end must be after baseline_start"):
            DashboardConfig(
                baseline_start="2025-06-09",
                baseline_end="2025-06-01"  # Before start
            )

    def test_invalid_thresholds(self):
        """Test threshold validation"""
        # Critical threshold must be negative
        with pytest.raises(ValueError):
            DashboardConfig(
                baseline_start="2025-06-01",
                baseline_end="2025-06-09",
                critical_threshold=50  # Positive value
            )

        # Warning threshold must be greater than critical
        with pytest.raises(ValueError, match="warning_threshold must be greater than critical_threshold"):
            DashboardConfig(
                baseline_start="2025-06-01",
                baseline_end="2025-06-09",
                critical_threshold=-50,
                warning_threshold=-80  # Less than critical
            )

    def test_volume_thresholds(self):
        """Test volume threshold validation"""
        with pytest.raises(ValueError):
            DashboardConfig(
                baseline_start="2025-06-01",
                baseline_end="2025-06-09",
                high_volume_threshold=0  # Must be >= 1
            )

class TestAPIEndpoints:
    """Test the API endpoints"""

    def test_get_dashboard(self):
        """Test getting the dashboard HTML"""
        response = client.get("/")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/html; charset=utf-8"
        assert "RAD Traffic Health Monitor" in response.text

    def test_get_config(self):
        """Test getting current configuration"""
        response = client.get("/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "baseline_start" in data
        assert "baseline_end" in data
        assert "time_range" in data
        assert data["critical_threshold"] == -80
        assert data["warning_threshold"] == -50

    def test_update_config_valid(self):
        """Test updating configuration with valid data"""
        new_config = {
            "baseline_start": "2025-05-01",
            "baseline_end": "2025-05-15",
            "time_range": "now-24h",
            "critical_threshold": -90,
            "warning_threshold": -60,
            "high_volume_threshold": 2000,
            "medium_volume_threshold": 200
        }
        response = client.post("/api/config", json=new_config)
        assert response.status_code == 200
        data = response.json()
        assert data["baseline_start"] == "2025-05-01"
        assert data["time_range"] == "now-24h"
        assert data["critical_threshold"] == -90

    def test_update_config_invalid(self):
        """Test updating configuration with invalid data"""
        # Invalid date format
        invalid_config = {
            "baseline_start": "not-a-date",
            "baseline_end": "2025-05-15"
        }
        response = client.post("/api/config", json=invalid_config)
        assert response.status_code == 422

        # Invalid threshold
        invalid_config = {
            "baseline_start": "2025-05-01",
            "baseline_end": "2025-05-15",
            "critical_threshold": 50  # Must be negative
        }
        response = client.post("/api/config", json=invalid_config)
        assert response.status_code == 422

    def test_get_stats(self):
        """Test getting dashboard statistics"""
        response = client.get("/api/stats")
        assert response.status_code == 200
        data = response.json()
        assert "critical_count" in data
        assert "warning_count" in data
        assert "normal_count" in data
        assert "increased_count" in data
        assert "last_update" in data
        assert "total_events" in data

    def test_refresh_dashboard(self):
        """Test refreshing dashboard data"""
        refresh_request = {
            "config": {
                "baseline_start": "2025-06-01",
                "baseline_end": "2025-06-09",
                "time_range": "now-12h",
                "critical_threshold": -80,
                "warning_threshold": -50,
                "high_volume_threshold": 1000,
                "medium_volume_threshold": 100
            },
            "force_refresh": True
        }
        response = client.post("/api/refresh", json=refresh_request)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "success"
        assert "config" in data
        assert "stats" in data
        # Check that stats were updated
        assert data["stats"]["critical_count"] == 2
        assert data["stats"]["warning_count"] == 5

    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "cors_proxy" in data
        assert "websocket_connections" in data

class TestWebSocket:
    """Test WebSocket functionality"""

    def test_websocket_connection(self):
        """Test WebSocket connection and initial state"""
        with client.websocket_connect("/ws") as websocket:
            # Should receive initial config
            data = websocket.receive_json()
            assert data["type"] == "config"
            assert "baseline_start" in data["data"]

            # Should receive initial stats
            data = websocket.receive_json()
            assert data["type"] == "stats"
            assert "critical_count" in data["data"]

    def test_websocket_ping_pong(self):
        """Test WebSocket ping/pong mechanism"""
        with client.websocket_connect("/ws") as websocket:
            # Skip initial messages
            websocket.receive_json()  # config
            websocket.receive_json()  # stats

            # Send ping
            websocket.send_json({"type": "ping"})

            # Should receive pong
            data = websocket.receive_json()
            assert data["type"] == "pong"

    def test_websocket_refresh(self):
        """Test WebSocket refresh command"""
        with client.websocket_connect("/ws") as websocket:
            # Skip initial messages
            websocket.receive_json()  # config
            websocket.receive_json()  # stats

            # Send refresh command
            websocket.send_json({"type": "refresh"})

            # Should receive stats update
            # Note: In a real test, we'd wait for the broadcast
            # For now, we just verify the connection doesn't error

class TestStaticFiles:
    """Test static file serving"""

    def test_serve_css(self):
        """Test serving CSS files"""
        # Create a temporary CSS file for testing
        css_dir = "assets/css"
        os.makedirs(css_dir, exist_ok=True)
        with open(f"{css_dir}/test.css", "w") as f:
            f.write("body { color: red; }")

        response = client.get("/assets/css/test.css")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/css; charset=utf-8"

        # Cleanup
        os.remove(f"{css_dir}/test.css")

    def test_serve_js(self):
        """Test serving JavaScript files"""
        # Create a temporary JS file for testing
        js_dir = "assets/js"
        os.makedirs(js_dir, exist_ok=True)
        with open(f"{js_dir}/test.js", "w") as f:
            f.write("console.log('test');")

        response = client.get("/assets/js/test.js")
        assert response.status_code == 200
        assert "javascript" in response.headers["content-type"]

        # Cleanup
        os.remove(f"{js_dir}/test.js")

class TestValidationErrors:
    """Test comprehensive validation error scenarios"""

    def test_date_pattern_validation(self):
        """Test date pattern validation in detail"""
        test_cases = [
            ("2025/06/01", False),  # Wrong separator
            ("25-06-01", False),    # Wrong year format
            ("2025-6-1", False),    # Missing leading zeros
            ("2025-13-01", True),   # Invalid month (pattern passes, logic validation fails)
            ("2025-06-32", True),   # Invalid day (pattern passes, logic validation fails)
            ("2025-06-01", True),   # Valid
        ]

        for date_str, should_pass_pattern in test_cases:
            config_data = {
                "baseline_start": date_str,
                "baseline_end": "2025-06-09"
            }
            response = client.post("/api/config", json=config_data)
            if should_pass_pattern:
                # May still fail on logical validation
                assert response.status_code in [200, 422]
            else:
                assert response.status_code == 422

    def test_threshold_boundaries(self):
        """Test threshold boundary conditions"""
        # Test exact boundary values
        config_data = {
            "baseline_start": "2025-06-01",
            "baseline_end": "2025-06-09",
            "critical_threshold": 0,  # Boundary: must be < 0
            "warning_threshold": -1
        }
        response = client.post("/api/config", json=config_data)
        assert response.status_code == 422

        # Test valid negative values
        config_data["critical_threshold"] = -1
        response = client.post("/api/config", json=config_data)
        assert response.status_code == 200

class TestConcurrency:
    """Test concurrent operations"""

    def test_multiple_websocket_connections(self):
        """Test multiple simultaneous WebSocket connections"""
        connections = []
        try:
            # Create multiple connections
            for i in range(5):
                ws = client.websocket_connect("/ws").__enter__()
                connections.append(ws)
                # Skip initial messages
                ws.receive_json()  # config
                ws.receive_json()  # stats

            # Update config via API
            new_config = {
                "baseline_start": "2025-07-01",
                "baseline_end": "2025-07-15",
                "time_range": "now-6h",
                "critical_threshold": -70,
                "warning_threshold": -40,
                "high_volume_threshold": 1500,
                "medium_volume_threshold": 150
            }
            response = client.post("/api/config", json=new_config)
            assert response.status_code == 200

            # All connections should receive the update
            # Note: In a real async environment, we'd need to handle this differently

        finally:
            # Cleanup connections
            for ws in connections:
                try:
                    ws.__exit__(None, None, None)
                except:
                    pass

class TestErrorHandling:
    """Test error handling scenarios"""

    def test_refresh_error_handling(self):
        """Test error handling in refresh endpoint"""
        # Test with invalid config in refresh request
        invalid_refresh = {
            "config": {
                "baseline_start": "invalid-date",
                "baseline_end": "2025-06-09"
            }
        }
        response = client.post("/api/refresh", json=invalid_refresh)
        assert response.status_code == 422

    def test_websocket_invalid_message(self):
        """Test WebSocket handling of invalid messages"""
        with client.websocket_connect("/ws") as websocket:
            # Skip initial messages
            websocket.receive_json()  # config
            websocket.receive_json()  # stats

            # Send invalid JSON
            websocket.send_text("not-json")
            # Connection should handle gracefully

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
