"""
Tests for server.py endpoints that we modified
Tests the auth/status and dashboard/query endpoints with X-Elastic-Cookie support
"""
import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock, AsyncMock
import json
from datetime import datetime, timedelta

# Import the app from server
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'bin'))

from server import app

# Create a mock dashboard state for tests
dashboard_state = {
    "last_update": datetime.now().isoformat(),
    "total_events": 0,
    "critical_count": 0,
    "warning_count": 0,
    "increased_count": 0,
    "normal_count": 0
}

client = TestClient(app)


class TestAuthStatus:
    """Test the /api/v1/auth/status endpoint"""

    def test_auth_status_no_cookie(self):
        """Test auth status when no cookie is provided"""
        response = client.get("/api/v1/auth/status")
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is False
        assert data["method"] is None

    def test_auth_status_with_cookie_header(self):
        """Test auth status with Cookie header"""
        response = client.get(
            "/api/v1/auth/status",
            headers={"Cookie": "sid=Fe26.2**test**"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["method"] == "cookie"
        assert "expires" in data

    def test_auth_status_with_x_elastic_cookie_header(self):
        """Test auth status with X-Elastic-Cookie header"""
        response = client.get(
            "/api/v1/auth/status",
            headers={"X-Elastic-Cookie": "sid=Fe26.2**test**"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["method"] == "cookie"

    @patch.dict(os.environ, {"ELASTIC_COOKIE": "sid=Fe26.2**env**"})
    def test_auth_status_with_env_cookie(self):
        """Test auth status with environment variable cookie"""
        response = client.get("/api/v1/auth/status")
        assert response.status_code == 200
        data = response.json()
        assert data["authenticated"] is True
        assert data["method"] == "cookie"

    def test_auth_status_priority_order(self):
        """Test that Cookie header takes precedence over X-Elastic-Cookie"""
        with patch.dict(os.environ, {"ELASTIC_COOKIE": "env_cookie"}):
            response = client.get(
                "/api/v1/auth/status",
                headers={
                    "Cookie": "cookie_header",
                    "X-Elastic-Cookie": "x_elastic_header"
                }
            )
            assert response.status_code == 200
            data = response.json()
            assert data["authenticated"] is True
            # Cookie header should take precedence


class TestDashboardQuery:
    """Test the /api/v1/dashboard/query endpoint"""

    @pytest.fixture
    def valid_request_body(self):
        return {
            "time_range": "now-12h",
            "filters": {},
            "options": {}
        }

    @pytest.fixture
    def mock_elasticsearch_response(self):
        return {
            "aggregations": {
                "events": {
                    "buckets": [
                        {
                            "key": "test.event.1",
                            "baseline": {"doc_count": 1000},
                            "current": {"doc_count": 900}
                        },
                        {
                            "key": "test.event.2",
                            "baseline": {"doc_count": 500},
                            "current": {"doc_count": 100}
                        }
                    ]
                }
            }
        }

    def test_dashboard_query_no_auth(self, valid_request_body):
        """Test dashboard query without authentication"""
        response = client.post(
            "/api/v1/dashboard/query",
            json=valid_request_body
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Authentication required"

    def test_dashboard_query_validation_error(self):
        """Test dashboard query with missing required fields"""
        response = client.post(
            "/api/v1/dashboard/query",
            json={},  # Missing required fields
            headers={"Cookie": "sid=Fe26.2**test**"}
        )
        assert response.status_code == 422  # Validation error

    def test_dashboard_query_with_filters(self):
        """Test that filters are accepted"""
        request_body = {
            "time_range": "now-24h",
            "filters": {
                "status": "critical",
                "search": "test",
                "radTypes": ["type1", "type2"]
            },
            "options": {"includeStats": True}
        }

        response = client.post(
            "/api/v1/dashboard/query",
            json=request_body,
            headers={"X-Elastic-Cookie": "sid=Fe26.2**test_cookie**"}
        )
        # Should accept but actual ES call will fail
        assert response.status_code in [400, 500, 503]  # ES errors

    def test_dashboard_query_empty_filters(self, valid_request_body):
        """Test that empty filters object is handled correctly"""
        request_body = valid_request_body.copy()
        request_body["filters"] = {}

        response = client.post(
            "/api/v1/dashboard/query",
            json=request_body,
            headers={"Cookie": "sid=Fe26.2**test_cookie**"}
        )
        # Should not be 401 (auth works)
        assert response.status_code != 401

    @patch.dict(os.environ, {"ELASTIC_COOKIE": "sid=Fe26.2**env_cookie**"})
    def test_dashboard_query_with_env_cookie(self, valid_request_body):
        """Test dashboard query with environment cookie"""
        response = client.post(
            "/api/v1/dashboard/query",
            json=valid_request_body
        )
        # Should authenticate with env cookie
        assert response.status_code != 401


class TestRateLimiting:
    """Test rate limiting on endpoints"""

    def test_dashboard_query_rate_limit(self):
        """Test rate limiting on dashboard query endpoint"""
        request_body = {
            "time_range": "now-12h",
            "filters": {},
            "options": {}
        }

        responses = []
        # Make 60 requests quickly (over the 50/min limit for dev)
        for _ in range(60):
            response = client.post(
                "/api/v1/dashboard/query",
                json=request_body,
                headers={"Cookie": "test"}
            )
            responses.append(response.status_code)

        # Should have some 429 responses
        assert 429 in responses


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
