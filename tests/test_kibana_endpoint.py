#!/usr/bin/env python3
"""
Tests for the Kibana FastAPI endpoint
"""
import pytest
import json
import time
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
import httpx

# Import the FastAPI app
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dev_server_fastapi import app, ElasticsearchQuery, KibanaResponse

client = TestClient(app)

# Sample test data
VALID_QUERY = {
    "size": 0,
    "query": {
        "bool": {
            "filter": [
                {
                    "wildcard": {
                        "detail.event.data.traffic.eid.keyword": {
                            "value": "pandc.vnext.recommendations.feed.feed*"
                        }
                    }
                }
            ]
        }
    },
    "aggs": {
        "events": {
            "terms": {
                "field": "detail.event.data.traffic.eid.keyword",
                "size": 500
            }
        }
    }
}

KIBANA_RESPONSE = {
    "took": 42,
    "timed_out": False,
    "aggregations": {
        "events": {
            "buckets": [
                {
                    "key": "pandc.vnext.recommendations.feed.feed.click",
                    "doc_count": 100
                }
            ]
        }
    }
}

ERROR_RESPONSE = {
    "error": {
        "type": "search_phase_execution_exception",
        "reason": "all shards failed"
    }
}


class TestKibanaEndpoint:
    """Test suite for the Kibana endpoint"""

    def test_endpoint_exists(self):
        """Test that the endpoint is registered"""
        # This should return 401 without auth, not 404
        response = client.post("/api/fetch-kibana-data", json={})
        assert response.status_code != 404

    def test_missing_cookie_returns_401(self):
        """Test that missing cookie returns 401"""
        response = client.post(
            "/api/fetch-kibana-data",
            json={
                "query": VALID_QUERY,
                "force_refresh": False
            }
        )
        assert response.status_code == 401
        assert "X-Elastic-Cookie header is required" in response.json()["detail"]

    def test_invalid_query_returns_422(self):
        """Test that invalid query structure returns validation error"""
        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": {
                    "size": 0,
                    "query": {},
                    # Missing required 'aggs' field
                }
            }
        )
        assert response.status_code == 422

    def test_missing_events_aggregation_returns_422(self):
        """Test that query without events aggregation fails validation"""
        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": {
                    "size": 0,
                    "query": {"match_all": {}},
                    "aggs": {
                        "other_agg": {
                            "terms": {"field": "some_field"}
                        }
                    }
                }
            }
        )
        assert response.status_code == 422
        assert "events" in str(response.json()["detail"])

    @patch('httpx.AsyncClient.post')
    async def test_successful_query(self, mock_post):
        """Test successful query execution"""
        # Mock the httpx response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = KIBANA_RESPONSE
        mock_post.return_value = mock_response

        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": False
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["took"] == 42
        assert data["timed_out"] is False
        assert "aggregations" in data

    @patch('httpx.AsyncClient.post')
    async def test_cache_behavior(self, mock_post):
        """Test that cache works correctly"""
        # Mock the httpx response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = KIBANA_RESPONSE
        mock_post.return_value = mock_response

        # First request - should hit Kibana
        response1 = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": False
            }
        )
        assert response1.status_code == 200

        # Second request - should hit cache
        response2 = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": False
            }
        )
        assert response2.status_code == 200

        # Mock should only be called once due to cache
        assert mock_post.call_count == 1

        # Force refresh should bypass cache
        response3 = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": True
            }
        )
        assert response3.status_code == 200
        assert mock_post.call_count == 2

    @patch('httpx.AsyncClient.post')
    async def test_elasticsearch_error_handling(self, mock_post):
        """Test handling of Elasticsearch errors"""
        # Mock error response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = ERROR_RESPONSE
        mock_post.return_value = mock_response

        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": True
            }
        )

        assert response.status_code == 400
        assert "Elasticsearch error" in response.json()["detail"]

    @patch('httpx.AsyncClient.post')
    async def test_http_error_handling(self, mock_post):
        """Test handling of HTTP errors from Kibana"""
        # Mock 403 response
        mock_response = Mock()
        mock_response.status_code = 403
        mock_response.json.return_value = {"error": {"reason": "Forbidden"}}
        mock_post.return_value = mock_response

        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": True
            }
        )

        assert response.status_code == 403
        assert "Kibana error" in response.json()["detail"]

    @patch('httpx.AsyncClient.post')
    async def test_connection_error_handling(self, mock_post):
        """Test handling of connection errors"""
        # Mock connection error
        mock_post.side_effect = httpx.ConnectError("Connection refused")

        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": True
            }
        )

        assert response.status_code == 502
        assert "Connection to Kibana failed" in response.json()["detail"]

    @patch('httpx.AsyncClient.post')
    async def test_timeout_handling(self, mock_post):
        """Test handling of timeout errors"""
        # Mock timeout
        mock_post.side_effect = httpx.TimeoutException("Request timed out")

        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": True
            }
        )

        assert response.status_code == 502
        assert "Connection to Kibana failed" in response.json()["detail"]

    def test_query_with_all_fields(self):
        """Test query with all optional fields populated"""
        full_query = {
            "size": 10,
            "query": {
                "bool": {
                    "must": [{"term": {"status": "active"}}],
                    "filter": [{"range": {"@timestamp": {"gte": "now-1h"}}}]
                }
            },
            "aggs": {
                "events": {
                    "terms": {"field": "event_id"},
                    "aggs": {
                        "by_time": {
                            "date_histogram": {
                                "field": "@timestamp",
                                "interval": "1m"
                            }
                        }
                    }
                }
            }
        }

        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": full_query,
                "force_refresh": True
            }
        )

        # Should at least pass validation
        assert response.status_code != 422


class TestPerformanceMetrics:
    """Test performance tracking functionality"""

    @patch('httpx.AsyncClient.post')
    async def test_performance_metrics_structure(self, mock_post):
        """Test that performance metrics are properly structured"""
        # Mock slow response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {**KIBANA_RESPONSE, "took": 3500}

        async def slow_post(*args, **kwargs):
            await asyncio.sleep(0.1)  # Simulate some delay
            return mock_response

        mock_post.side_effect = slow_post

        # We can't easily test WebSocket broadcasts in sync tests,
        # but we can verify the endpoint completes successfully
        response = client.post(
            "/api/fetch-kibana-data",
            headers={"X-Elastic-Cookie": "test-cookie"},
            json={
                "query": VALID_QUERY,
                "force_refresh": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["took"] == 3500


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
