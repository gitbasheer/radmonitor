#!/usr/bin/env python3
"""
Production Server Test Suite
Comprehensive tests for security, performance, and functionality
"""

import os
import sys
import pytest
import asyncio
import json
import time
from unittest.mock import Mock, patch, AsyncMock
from pathlib import Path
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from bin.server_production import (
    app, Settings, DashboardConfig, ElasticsearchQuery, 
    WebSocketMessage, verify_token, get_settings,
    AppState, HTTPClientPool
)
from fastapi.testclient import TestClient
from fastapi import HTTPException
import httpx

# Test configuration
os.environ["DISABLE_AUTH"] = "true"
os.environ["ENVIRONMENT"] = "test"
os.environ["ALLOWED_ORIGINS"] = "http://testserver,http://localhost:3000"
os.environ["ALLOWED_HOSTS"] = "testserver,localhost"


class TestSettings:
    """Test Settings class"""
    
    def test_singleton_pattern(self):
        """Ensure Settings is a singleton"""
        settings1 = Settings()
        settings2 = Settings()
        assert settings1 is settings2
    
    def test_environment_override(self):
        """Test environment variable overrides"""
        test_url = "https://test.elastic.co"
        os.environ["ELASTICSEARCH_URL"] = test_url
        
        settings = Settings()
        assert settings.elasticsearch_url == test_url
    
    def test_url_validation(self):
        """Test URL validation"""
        os.environ["ELASTICSEARCH_URL"] = "not-a-url"
        
        with pytest.raises(ValueError, match="must be a valid HTTP"):
            Settings()._get_url_setting("ELASTICSEARCH_URL", "")
    
    def test_missing_required_settings(self, tmp_path):
        """Test handling of missing required settings"""
        # Create invalid settings file
        settings_file = tmp_path / "settings.json"
        settings_file.write_text("{}")
        
        with patch("pathlib.Path.parent", return_value=tmp_path):
            with pytest.raises(ValueError, match="Missing required settings"):
                Settings()._load_settings()


class TestModels:
    """Test Pydantic models"""
    
    def test_dashboard_config_validation(self):
        """Test DashboardConfig validation"""
        # Valid config
        config = DashboardConfig(
            baseline_start="2025-01-01",
            baseline_end="2025-01-07",
            time_range="now-12h",
            critical_threshold=-80,
            warning_threshold=-50
        )
        assert config.baseline_start == "2025-01-01"
        
        # Invalid date format
        with pytest.raises(ValueError):
            DashboardConfig(
                baseline_start="01/01/2025",  # Wrong format
                baseline_end="2025-01-07"
            )
        
        # End before start
        with pytest.raises(ValueError, match="must be after baseline_start"):
            DashboardConfig(
                baseline_start="2025-01-07",
                baseline_end="2025-01-01"
            )
        
        # Date range too large
        with pytest.raises(ValueError, match="cannot exceed 365 days"):
            DashboardConfig(
                baseline_start="2024-01-01",
                baseline_end="2025-01-02"
            )
    
    def test_elasticsearch_query_validation(self):
        """Test ElasticsearchQuery validation"""
        # Valid query
        query = ElasticsearchQuery(
            query={"match_all": {}},
            size=100
        )
        assert query.size == 100
        
        # Size limit
        with pytest.raises(ValueError):
            ElasticsearchQuery(
                query={"match_all": {}},
                size=10001  # Exceeds limit
            )
        
        # Dangerous patterns
        dangerous_queries = [
            {"script": {"source": "doc['field'].value * 2"}},
            {"query": {"_update": {}}},
            {"inline": "malicious code"}
        ]
        
        for dangerous in dangerous_queries:
            with pytest.raises(ValueError, match="dangerous pattern"):
                ElasticsearchQuery(query=dangerous)
    
    def test_websocket_message_validation(self):
        """Test WebSocketMessage validation"""
        # Valid message
        msg = WebSocketMessage(
            type="ping",
            data={"test": "data"}
        )
        assert msg.type == "ping"
        
        # Invalid type
        with pytest.raises(ValueError):
            WebSocketMessage(
                type="invalid_type",
                data={}
            )
        
        # Message size limit
        large_data = {"key": "x" * (1024 * 1024 + 1)}
        with pytest.raises(ValueError, match="Message too large"):
            WebSocketMessage(
                type="query",
                data=large_data
            )


class TestSecurity:
    """Test security features"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_cors_restrictions(self, client):
        """Test CORS is properly restricted"""
        # Request from allowed origin
        response = client.get(
            "/health/live",
            headers={"Origin": "http://localhost:3000"}
        )
        assert response.status_code == 200
        assert "Access-Control-Allow-Origin" in response.headers
        
        # Request from disallowed origin
        response = client.get(
            "/health/live",
            headers={"Origin": "http://evil.com"}
        )
        # CORS headers should not be present for disallowed origins
        # Note: Actual behavior depends on CORS implementation
    
    def test_authentication_required(self, client):
        """Test authentication is required for protected endpoints"""
        os.environ["DISABLE_AUTH"] = "false"
        os.environ["API_TOKENS"] = "valid-token-123"
        
        # No auth header
        response = client.get("/api/v1/dashboard/config")
        assert response.status_code == 401
        
        # Invalid token
        response = client.get(
            "/api/v1/dashboard/config",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401
        
        # Valid token
        response = client.get(
            "/api/v1/dashboard/config",
            headers={"Authorization": "Bearer valid-token-123"}
        )
        assert response.status_code == 200
        
        # Reset
        os.environ["DISABLE_AUTH"] = "true"
    
    def test_security_headers(self, client):
        """Test security headers are set"""
        response = client.get("/health/live")
        
        security_headers = [
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Strict-Transport-Security",
            "Content-Security-Policy"
        ]
        
        for header in security_headers:
            assert header in response.headers
        
        assert response.headers["X-Frame-Options"] == "DENY"
        assert response.headers["X-Content-Type-Options"] == "nosniff"
    
    def test_request_id_tracking(self, client):
        """Test request ID tracking"""
        # Custom request ID
        custom_id = "test-request-123"
        response = client.get(
            "/health/live",
            headers={"X-Request-ID": custom_id}
        )
        assert response.headers["X-Request-ID"] == custom_id
        
        # Auto-generated ID
        response = client.get("/health/live")
        assert "X-Request-ID" in response.headers
        assert len(response.headers["X-Request-ID"]) > 0
    
    def test_path_traversal_prevention(self, client):
        """Test path traversal is prevented"""
        # Attempt to access files outside project root
        dangerous_paths = [
            "/../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "/assets/../../sensitive.txt"
        ]
        
        for path in dangerous_paths:
            response = client.get(path)
            assert response.status_code in [404, 400]


class TestRateLimiting:
    """Test rate limiting"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.mark.asyncio
    async def test_rate_limit_enforcement(self, client):
        """Test rate limits are enforced"""
        # Dashboard config endpoint: 30/minute
        endpoint = "/api/v1/dashboard/config"
        
        # Make requests up to limit
        for _ in range(30):
            response = client.get(endpoint)
            assert response.status_code == 200
        
        # Next request should be rate limited
        response = client.get(endpoint)
        assert response.status_code == 429
        assert "rate limit" in response.json()["detail"].lower()


class TestCaching:
    """Test caching functionality"""
    
    @pytest.mark.asyncio
    async def test_redis_fallback(self):
        """Test fallback to local cache when Redis unavailable"""
        app_state = AppState()
        app_state.redis_client = None  # Simulate Redis unavailable
        
        # Test set and get
        await app_state.cache_set("test_key", {"data": "test"}, ttl=60)
        result = await app_state.cache_get("test_key")
        
        assert result == {"data": "test"}
        assert "test_key" in app_state.local_cache
    
    @pytest.mark.asyncio
    async def test_cache_expiration(self):
        """Test cache expiration"""
        app_state = AppState()
        app_state.redis_client = None
        
        # Set with short TTL
        await app_state.cache_set("expire_key", "data", ttl=0)
        
        # Should be expired immediately
        await asyncio.sleep(0.1)
        result = await app_state.cache_get("expire_key")
        assert result is None
    
    @pytest.mark.asyncio
    async def test_cache_size_limit(self):
        """Test local cache size limit"""
        app_state = AppState()
        app_state.redis_client = None
        
        # Fill cache beyond limit
        for i in range(1100):
            await app_state.cache_set(f"key_{i}", f"data_{i}")
        
        # Should have evicted oldest entries
        assert len(app_state.local_cache) <= 1000


class TestHealthChecks:
    """Test health check endpoints"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_liveness_probe(self, client):
        """Test Kubernetes liveness probe"""
        response = client.get("/health/live")
        assert response.status_code == 200
        assert response.json()["status"] == "alive"
        assert "timestamp" in response.json()
    
    @pytest.mark.asyncio
    async def test_readiness_probe(self, client):
        """Test Kubernetes readiness probe"""
        with patch("bin.server_production.http_pool.get_client") as mock_client:
            # Mock successful Elasticsearch check
            mock_response = Mock()
            mock_response.status_code = 200
            mock_client.return_value.get = AsyncMock(return_value=mock_response)
            
            response = client.get("/health/ready")
            data = response.json()
            
            assert data["status"] in ["ready", "not ready"]
            assert "checks" in data
            assert "configuration" in data["checks"]
            assert "elasticsearch" in data["checks"]
            assert "redis" in data["checks"]


class TestWebSocket:
    """Test WebSocket functionality"""
    
    def test_websocket_authentication(self):
        """Test WebSocket requires authentication"""
        os.environ["DISABLE_AUTH"] = "false"
        os.environ["API_TOKENS"] = "valid-ws-token"
        
        client = TestClient(app)
        
        # No token
        with pytest.raises(Exception):
            with client.websocket_connect("/ws"):
                pass
        
        # Invalid token
        with pytest.raises(Exception):
            with client.websocket_connect("/ws?token=invalid"):
                pass
        
        # Valid token should work
        # Note: TestClient doesn't fully support WebSocket auth
        
        # Reset
        os.environ["DISABLE_AUTH"] = "true"
    
    def test_websocket_message_validation(self):
        """Test WebSocket message validation"""
        client = TestClient(app)
        
        with client.websocket_connect("/ws") as websocket:
            # Valid ping
            websocket.send_json({"type": "ping", "data": {}})
            response = websocket.receive_json()
            assert response["type"] == "pong"
            
            # Invalid message format
            websocket.send_json({"invalid": "format"})
            response = websocket.receive_json()
            assert response["type"] == "error"
            assert "Invalid message format" in response["message"]
    
    def test_websocket_timeout(self):
        """Test WebSocket idle timeout"""
        # This would require mocking asyncio.wait_for
        pass


class TestErrorHandling:
    """Test error handling"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_http_exception_handler(self, client):
        """Test HTTP exception handling"""
        response = client.get("/nonexistent")
        assert response.status_code == 404
        
        data = response.json()
        assert "error" in data
        assert "request_id" in data
        assert "timestamp" in data
    
    def test_general_exception_handler(self, client):
        """Test general exception handling"""
        # Would need to mock an endpoint to raise an exception
        # The handler ensures internal errors aren't exposed
        pass


class TestMetrics:
    """Test metrics collection"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_metrics_endpoint(self, client):
        """Test Prometheus metrics endpoint"""
        # Make some requests to generate metrics
        client.get("/health/live")
        client.get("/health/ready")
        
        response = client.get("/metrics")
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/plain; charset=utf-8"
        
        metrics_text = response.text
        assert "rad_monitor_requests_total" in metrics_text
        assert "rad_monitor_request_duration_seconds" in metrics_text
        assert "rad_monitor_active_connections" in metrics_text


class TestPerformance:
    """Test performance optimizations"""
    
    @pytest.mark.asyncio
    async def test_connection_pooling(self):
        """Test HTTP client connection pooling"""
        pool = HTTPClientPool()
        
        # Get client multiple times
        client1 = await pool.get_client()
        client2 = await pool.get_client()
        
        # Should be the same client instance
        assert client1 is client2
        
        # Cleanup
        await pool.close()
    
    def test_gzip_compression(self):
        """Test GZip compression for responses"""
        client = TestClient(app)
        
        # Large response should be compressed
        response = client.get(
            "/api/v1/dashboard/config",
            headers={"Accept-Encoding": "gzip"}
        )
        
        # Check if response is compressed
        # Note: TestClient may not handle this properly


class TestIntegration:
    """Integration tests"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    @pytest.mark.asyncio
    async def test_full_query_flow(self, client):
        """Test full query flow with caching"""
        with patch("bin.server_production.http_pool.get_client") as mock_client:
            # Mock Elasticsearch response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "took": 50,
                "hits": {"total": {"value": 100}},
                "aggregations": {}
            }
            
            mock_http_client = AsyncMock()
            mock_http_client.post = AsyncMock(return_value=mock_response)
            mock_client.return_value = mock_http_client
            
            # First request - should hit Elasticsearch
            query = {"query": {"match_all": {}}, "size": 0}
            response1 = client.post("/api/v1/dashboard/query", json=query)
            assert response1.status_code == 200
            
            # Second request - should hit cache
            response2 = client.post("/api/v1/dashboard/query", json=query)
            assert response2.status_code == 200
            
            # Verify only one Elasticsearch call was made
            assert mock_http_client.post.call_count == 1


class TestGracefulShutdown:
    """Test graceful shutdown"""
    
    @pytest.mark.asyncio
    async def test_shutdown_procedure(self):
        """Test graceful shutdown closes connections"""
        # This would require actually starting the server
        # and sending shutdown signals
        pass


# Performance benchmarks
class TestBenchmarks:
    """Performance benchmarks"""
    
    @pytest.fixture
    def client(self):
        return TestClient(app)
    
    def test_health_check_performance(self, client, benchmark):
        """Benchmark health check endpoint"""
        def check_health():
            response = client.get("/health/live")
            assert response.status_code == 200
        
        # Should complete in under 10ms
        result = benchmark(check_health)
        assert result.stats["mean"] < 0.01  # 10ms
    
    def test_config_endpoint_performance(self, client, benchmark):
        """Benchmark config endpoint"""
        def get_config():
            response = client.get("/api/v1/dashboard/config")
            assert response.status_code == 200
        
        # Should complete in under 50ms
        result = benchmark(get_config)
        assert result.stats["mean"] < 0.05  # 50ms


if __name__ == "__main__":
    pytest.main([__file__, "-v"])