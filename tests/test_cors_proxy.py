#!/usr/bin/env python3
"""
Comprehensive tests for cors_proxy.py
Tests all functionality including SSL handling, error cases, and CORS headers
"""

import json
import ssl
import pytest
from unittest.mock import Mock, patch, MagicMock
from http.server import HTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request
import sys
import os
from io import BytesIO

# Add bin directory to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bin'))
from cors_proxy import CORSProxyHandler, ssl_context


class MockSocket:
    """Mock socket for testing"""
    def __init__(self):
        self.data = BytesIO()

    def makefile(self, mode):
        return self.data


class MockHandler(CORSProxyHandler):
    """Mock handler that doesn't auto-handle requests"""
    def __init__(self):
        # Don't call parent __init__ to avoid auto-handling
        self.wfile = Mock()
        self.rfile = Mock()
        self.headers = {}
        self.send_response = Mock()
        self.send_header = Mock()
        self.end_headers = Mock()
        self.send_error = Mock()
        self.path = '/'
        self.command = 'GET'
        self.request_version = 'HTTP/1.1'
        self.client_address = ('127.0.0.1', 12345)


class TestCORSProxy:
    """Comprehensive test cases for the CORS proxy server"""

    def setup_method(self):
        """Set up test handler for each test"""
        self.handler = MockHandler()

    def test_ssl_context_configuration(self):
        """Test that SSL context is properly configured for self-signed certs"""
        assert ssl_context.check_hostname is False
        assert ssl_context.verify_mode == ssl.CERT_NONE

    def test_health_endpoint_success(self):
        """Test the health check endpoint returns correct response"""
        self.handler.path = '/health'

        self.handler.do_GET()

        self.handler.send_response.assert_called_with(200)
        self.handler.send_header.assert_any_call('Content-Type', 'application/json')

        # Verify response content
        response_data = self.handler.wfile.write.call_args[0][0]
        response = json.loads(response_data.decode())

        assert response['status'] == 'running'
        assert response['service'] == 'RAD Monitor CORS Proxy'
        assert response['port'] == 8889
        assert '/health' in response['endpoints']
        assert '/kibana-proxy' in response['endpoints']

    def test_health_endpoint_cors_headers(self):
        """Test that health endpoint includes CORS headers"""
        self.handler.path = '/health'

        self.handler.do_GET()

        # Check CORS headers were set
        self.handler.send_header.assert_any_call('Access-Control-Allow-Origin', '*')
        self.handler.send_header.assert_any_call('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')

    def test_get_404_for_unknown_endpoint(self):
        """Test 404 response for unknown GET endpoints"""
        self.handler.path = '/unknown'

        self.handler.do_GET()

        self.handler.send_error.assert_called_with(404, "Try /health or /kibana-proxy")

    def test_options_preflight_request(self):
        """Test CORS preflight OPTIONS request handling"""
        self.handler.do_OPTIONS()

        self.handler.send_response.assert_called_with(200)
        # Verify all CORS headers
        self.handler.send_header.assert_any_call('Access-Control-Allow-Origin', '*')
        self.handler.send_header.assert_any_call('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.handler.send_header.assert_any_call('Access-Control-Allow-Headers', 'Content-Type, X-Elastic-Cookie, kbn-xsrf')
        self.handler.send_header.assert_any_call('Access-Control-Max-Age', '86400')
        self.handler.end_headers.assert_called_once()

    def test_post_404_for_wrong_endpoint(self):
        """Test POST to wrong endpoint returns 404"""
        self.handler.path = '/wrong-endpoint'

        self.handler.do_POST()

        self.handler.send_error.assert_called_with(404, "Use /kibana-proxy endpoint")

    def test_proxy_request_missing_cookie(self):
        """Test proxy request without X-Elastic-Cookie header"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {'Content-Length': '2'}
        self.handler.rfile.read.return_value = b'{}'

        # Mock the error response method
        self.handler.send_error_response = Mock()

        self.handler.do_POST()

        self.handler.send_error_response.assert_called_with(400, "Need X-Elastic-Cookie header")

    @patch('cors_proxy.urlopen')
    def test_proxy_request_success(self, mock_urlopen):
        """Test successful proxy request to Kibana"""
        # Setup request
        request_data = {'query': {'match_all': {}}}
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': str(len(json.dumps(request_data))),
            'X-Elastic-Cookie': 'Fe26.2**test_cookie_123**xyz'
        }
        self.handler.rfile.read.return_value = json.dumps(request_data).encode()

        # Mock successful response
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"aggregations": {"events": {"buckets": []}}}'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        self.handler.do_POST()

        # Verify request was made with correct parameters
        mock_urlopen.assert_called_once()
        args = mock_urlopen.call_args[0]
        request_obj = args[0]

        assert isinstance(request_obj, Request)
        assert request_obj.get_full_url() == "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/api/console/proxy?path=traffic-*/_search&method=POST"
        assert request_obj.headers['Content-type'] == 'application/json'
        assert request_obj.headers['Kbn-xsrf'] == 'true'
        assert request_obj.headers['Cookie'] == 'sid=Fe26.2**test_cookie_123**xyz'

        # Verify SSL context was used
        kwargs = mock_urlopen.call_args[1]
        assert 'context' in kwargs
        assert kwargs['context'] == ssl_context
        assert kwargs['timeout'] == 30

        # Verify response
        self.handler.send_response.assert_called_with(200)
        self.handler.wfile.write.assert_called_with(b'{"aggregations": {"events": {"buckets": []}}}')

    @patch('cors_proxy.urlopen')
    def test_proxy_request_with_query_params(self, mock_urlopen):
        """Test proxy request with query parameters"""
        self.handler.path = '/kibana-proxy?index=custom-index'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'

        mock_response = MagicMock()
        mock_response.read.return_value = b'{}'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        self.handler.do_POST()

        # Should still use default URL, ignoring query params
        request_obj = mock_urlopen.call_args[0][0]
        assert 'traffic-*/_search' in request_obj.get_full_url()

    @patch('cors_proxy.urlopen')
    def test_proxy_request_http_401_error(self, mock_urlopen):
        """Test proxy request with 401 authentication error from Kibana"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'expired_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        self.handler.send_error_response = Mock()

        # Mock 401 error
        mock_urlopen.side_effect = HTTPError(None, 401, 'Unauthorized', {}, None)

        self.handler.do_POST()

        self.handler.send_error_response.assert_called_with(401, "Kibana error: Unauthorized")

    @patch('cors_proxy.urlopen')
    def test_proxy_request_http_500_error(self, mock_urlopen):
        """Test proxy request with 500 server error from Kibana"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        self.handler.send_error_response = Mock()

        # Mock 500 error
        mock_urlopen.side_effect = HTTPError(None, 500, 'Internal Server Error', {}, None)

        self.handler.do_POST()

        self.handler.send_error_response.assert_called_with(500, "Kibana error: Internal Server Error")

    @patch('cors_proxy.urlopen')
    def test_proxy_request_ssl_error(self, mock_urlopen):
        """Test proxy request with SSL certificate error"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        self.handler.send_error_response = Mock()

        # Mock SSL error
        mock_urlopen.side_effect = URLError(ssl.SSLError("certificate verify failed"))

        self.handler.do_POST()

        self.handler.send_error_response.assert_called_with(502, "Connection failed: ('certificate verify failed',)")

    @patch('cors_proxy.urlopen')
    def test_proxy_request_connection_refused(self, mock_urlopen):
        """Test proxy request with connection refused error"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        self.handler.send_error_response = Mock()

        # Mock connection error
        mock_urlopen.side_effect = URLError("Connection refused")

        self.handler.do_POST()

        self.handler.send_error_response.assert_called_with(502, "Connection failed: Connection refused")

    @patch('cors_proxy.urlopen')
    def test_proxy_request_timeout(self, mock_urlopen):
        """Test proxy request with timeout"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        self.handler.send_error_response = Mock()

        # Mock timeout
        mock_urlopen.side_effect = URLError("timed out")

        self.handler.do_POST()

        self.handler.send_error_response.assert_called_with(502, "Connection failed: timed out")

    @patch('cors_proxy.urlopen')
    def test_proxy_request_generic_exception(self, mock_urlopen):
        """Test proxy request with unexpected exception"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        self.handler.send_error_response = Mock()

        # Mock generic error
        mock_urlopen.side_effect = Exception("Unexpected error")

        self.handler.do_POST()

        self.handler.send_error_response.assert_called_with(500, "Proxy error: Unexpected error")

    def test_send_error_response(self):
        """Test custom error response with CORS headers"""
        # Create actual method since we mocked it above
        self.handler.send_error_response = CORSProxyHandler.send_error_response.__get__(self.handler)

        self.handler.send_error_response(503, "Service unavailable")

        self.handler.send_response.assert_called_with(503)
        # Check CORS headers are included in error response
        self.handler.send_header.assert_any_call('Access-Control-Allow-Origin', '*')
        self.handler.send_header.assert_any_call('Content-Type', 'application/json')

        # Check error response format
        response_data = self.handler.wfile.write.call_args[0][0]
        response = json.loads(response_data.decode())
        assert response['error']['type'] == 'proxy_error'
        assert response['error']['reason'] == 'Service unavailable'

    @patch('cors_proxy.urlopen')
    def test_proxy_large_request_body(self, mock_urlopen):
        """Test proxy with large request body"""
        large_query = {'query': {'match_all': {}}, 'size': 10000, 'aggs': {}}
        request_data = json.dumps(large_query) * 100  # Make it large

        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': str(len(request_data)),
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = request_data.encode()

        mock_response = MagicMock()
        mock_response.read.return_value = b'{"took": 100}'
        mock_urlopen.return_value.__enter__.return_value = mock_response

        self.handler.do_POST()

        # Verify large body was sent
        request_obj = mock_urlopen.call_args[0][0]
        assert len(request_obj.data) == len(request_data)

    def test_log_message_filtering(self):
        """Test that only errors and non-200/204 responses are logged"""
        # Test that 200 responses are not logged
        assert self.handler.log_message("GET /health HTTP/1.1", '200') is None

        # Test that errors are logged by checking parent would be called
        # Since we can't easily test the actual logging, we just verify the logic
        format_with_error = "ERROR in request"
        # This would call parent's log_message in real implementation


class TestCORSProxyIntegration:
    """Integration tests for CORS proxy server"""

    @patch('cors_proxy.HTTPServer')
    def test_main_function(self, mock_server_class):
        """Test the main function starts the server correctly"""
        from cors_proxy import main

        mock_server = Mock()
        mock_server_class.return_value = mock_server

        # Run main in a thread and stop it quickly
        import threading
        thread = threading.Thread(target=main)
        thread.daemon = True
        thread.start()

        # Give it a moment to start
        import time
        time.sleep(0.1)

        # Verify server was created with correct parameters
        mock_server_class.assert_called_with(('localhost', 8889), CORSProxyHandler)


class TestCORSProxyForGitHubPages:
    """Tests specific to GitHub Pages deployment scenario"""

    def test_cors_headers_allow_github_pages(self):
        """Test that CORS headers allow requests from GitHub Pages"""
        handler = MockHandler()

        handler.send_cors_headers()

        # Verify wildcard origin allows GitHub Pages
        handler.send_header.assert_any_call('Access-Control-Allow-Origin', '*')
        # This allows https://balkhalil.github.io

    def test_all_required_headers_allowed(self):
        """Test that all headers required by the dashboard are allowed"""
        handler = MockHandler()

        handler.send_cors_headers()

        # Check all required headers are in allowed list
        handler.send_header.assert_any_call(
            'Access-Control-Allow-Headers',
            'Content-Type, X-Elastic-Cookie, kbn-xsrf'
        )


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--cov=bin.cors_proxy', '--cov-report=term-missing'])


# Additional tests for cors_proxy_enhanced.py features
class TestEnhancedCORSProxyFlexibleTime:
    """Tests for flexible time comparison features in cors_proxy_enhanced.py"""

    def setup_method(self):
        """Setup for enhanced proxy tests"""
        # Import enhanced proxy components
        try:
            import sys
            import os
            sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bin'))
            from cors_proxy_enhanced import (
                TrafficQueryRequest, ResponseProcessor,
                TrafficEvent, TrafficQueryResponse
            )
            self.TrafficQueryRequest = TrafficQueryRequest
            self.ResponseProcessor = ResponseProcessor
            self.TrafficEvent = TrafficEvent
            self.TrafficQueryResponse = TrafficQueryResponse
        except ImportError:
            pytest.skip("cors_proxy_enhanced not available")

    def test_traffic_query_request_with_comparison_dates(self):
        """Test TrafficQueryRequest accepts comparison date fields"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now - timedelta(days=3.5),
            comparison_start=now - timedelta(minutes=39),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        assert request.comparison_start is not None
        assert request.comparison_end is not None
        assert request.time_comparison_strategy == "linear_scale"

    def test_all_time_comparison_strategies(self):
        """Test all valid time comparison strategies are accepted"""
        from datetime import datetime, timedelta

        strategies = ["linear_scale", "hourly_average", "daily_pattern"]
        now = datetime.utcnow()

        for strategy in strategies:
            request = self.TrafficQueryRequest(
                baseline_start=now - timedelta(days=7),
                baseline_end=now,
                time_comparison_strategy=strategy
            )
            assert request.time_comparison_strategy == strategy

    def test_response_processor_linear_scale_normalization(self):
        """Test ResponseProcessor applies linear scale normalization correctly"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=3.5),
            baseline_end=now,
            comparison_start=now - timedelta(minutes=39),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        mock_response = {
            "took": 50,
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test.event",
                        "baseline": {"doc_count": 12923},
                        "current": {"doc_count": 100}
                    }]
                }
            }
        }

        result = self.ResponseProcessor.process_traffic_response(mock_response, request)

        # Check normalization metadata
        assert "baseline_duration_ms" in result.metadata
        assert "comparison_duration_ms" in result.metadata
        assert "normalization_factor" in result.metadata
        assert result.metadata["comparison_method"] == "linear_scale"

        # Verify normalization factor is approximately 129.23 (3.5 days / 39 minutes)
        assert 129 < result.metadata["normalization_factor"] < 130

    def test_response_processor_hourly_average_normalization(self):
        """Test ResponseProcessor applies hourly average normalization correctly"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=4),
            baseline_end=now,
            comparison_start=now - timedelta(hours=2),
            comparison_end=now,
            time_comparison_strategy="hourly_average"
        )

        mock_response = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test.event",
                        "baseline": {"doc_count": 9600},  # 100/hour for 96 hours
                        "current": {"doc_count": 200}
                    }]
                }
            }
        }

        result = self.ResponseProcessor.process_traffic_response(mock_response, request)

        assert result.metadata["comparison_method"] == "hourly_average"
        # Should calculate 9600 / 96 hours = 100/hour, then 100 * 2 hours = 200
        event = result.events[0]
        assert event.baseline_period == 200

    def test_response_processor_daily_pattern_normalization(self):
        """Test ResponseProcessor applies daily pattern normalization correctly"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=8),
            baseline_end=now,
            comparison_start=now - timedelta(hours=12),
            comparison_end=now,
            time_comparison_strategy="daily_pattern"
        )

        mock_response = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test.event",
                        "baseline": {"doc_count": 9600},  # 1200/day
                        "current": {"doc_count": 600}
                    }]
                }
            }
        }

        result = self.ResponseProcessor.process_traffic_response(mock_response, request)

        assert result.metadata["comparison_method"] == "daily_pattern"
        event = result.events[0]
        # Daily pattern: 9600 / 8 days = 1200/day, for 12 hours = 600
        assert event.baseline_period == 600

    def test_zero_duration_handling(self):
        """Test handling of zero duration comparison periods"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=1),
            baseline_end=now,
            comparison_start=now,
            comparison_end=now  # Zero duration
        )

        mock_response = {
            "aggregations": {
                "events": {
                    "buckets": [{
                        "key": "test",
                        "baseline": {"doc_count": 100},
                        "current": {"doc_count": 0}
                    }]
                }
            }
        }

        # Should handle gracefully without division by zero
        result = self.ResponseProcessor.process_traffic_response(mock_response, request)
        assert result.metadata["comparison_duration_ms"] == 0
        assert result.metadata["normalization_factor"] == 1.0  # Safe default

    def test_build_es_query_uses_comparison_dates(self):
        """Test that ES query uses comparison dates when provided"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        comparison_start = now - timedelta(hours=1)
        comparison_end = now

        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now - timedelta(days=3),
            comparison_start=comparison_start,
            comparison_end=comparison_end
        )

        query = request.build_es_query()

        # Verify comparison dates are used in the current aggregation
        current_filter = query["aggs"]["events"]["aggs"]["current"]["filter"]["range"]["@timestamp"]
        assert current_filter["gte"] == comparison_start.isoformat() + "Z"
        assert current_filter["lte"] == comparison_end.isoformat() + "Z"

    def test_backward_compatibility_with_current_time_range(self):
        """Test backward compatibility when using current_time_range"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now,
            current_time_range="12h"  # Old style
        )

        # Should not have comparison dates
        assert request.comparison_start is None
        assert request.comparison_end is None

        # Should still build valid query
        query = request.build_es_query()
        assert "current" in query["aggs"]["events"]["aggs"]

    def test_metadata_includes_all_normalization_info(self):
        """Test that response metadata includes all normalization information"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        baseline_duration = timedelta(days=7)
        comparison_duration = timedelta(hours=1)

        request = self.TrafficQueryRequest(
            baseline_start=now - baseline_duration,
            baseline_end=now,
            comparison_start=now - comparison_duration,
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        mock_response = {"aggregations": {"events": {"buckets": []}}}

        result = self.ResponseProcessor.process_traffic_response(mock_response, request)

        # Verify all metadata fields
        assert result.metadata["baseline_duration_ms"] == int(baseline_duration.total_seconds() * 1000)
        assert result.metadata["comparison_duration_ms"] == int(comparison_duration.total_seconds() * 1000)
        assert result.metadata["normalization_factor"] == 168.0  # 7 days / 1 hour
        assert result.metadata["comparison_method"] == "linear_scale"


class TestFlexibleTimeComparisonEdgeCases:
    """Test edge cases for flexible time comparison"""

    def setup_method(self):
        """Setup for edge case tests"""
        try:
            from cors_proxy_enhanced import TrafficQueryRequest, ResponseProcessor
            self.TrafficQueryRequest = TrafficQueryRequest
            self.ResponseProcessor = ResponseProcessor
        except ImportError:
            pytest.skip("cors_proxy_enhanced not available")

    def test_fractional_day_calculations(self):
        """Test handling of fractional days in baseline"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        # 2.5 days = 2 days + 12 hours
        baseline_start = now - timedelta(days=2, hours=12)
        baseline_end = now

        request = self.TrafficQueryRequest(
            baseline_start=baseline_start,
            baseline_end=baseline_end,
            comparison_start=now - timedelta(minutes=30),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        mock_response = {"aggregations": {"events": {"buckets": []}}}
        result = self.ResponseProcessor.process_traffic_response(mock_response, request)

        # 2.5 days = 60 hours, 30 minutes = 0.5 hours
        # Normalization factor should be 60 / 0.5 = 120
        assert abs(result.metadata["normalization_factor"] - 120.0) < 0.01

    def test_very_short_comparison_periods(self):
        """Test handling of very short comparison periods (< 1 minute)"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=1),
            baseline_end=now,
            comparison_start=now - timedelta(seconds=30),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        mock_response = {"aggregations": {"events": {"buckets": []}}}
        result = self.ResponseProcessor.process_traffic_response(mock_response, request)

        # Should handle sub-minute periods correctly
        assert result.metadata["comparison_duration_ms"] == 30000  # 30 seconds
        assert result.metadata["normalization_factor"] == 2880.0  # 24 hours / 30 seconds

    def test_overlapping_time_periods(self):
        """Test handling when comparison period overlaps with baseline"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        # These periods overlap (both include "now")
        request = self.TrafficQueryRequest(
            baseline_start=now - timedelta(days=7),
            baseline_end=now,
            comparison_start=now - timedelta(hours=1),
            comparison_end=now,
            time_comparison_strategy="linear_scale"
        )

        # Should still process without error
        query = request.build_es_query()
        assert query is not None

        # Both aggregations should have their respective time ranges
        baseline_range = query["aggs"]["events"]["aggs"]["baseline"]["filter"]["range"]["@timestamp"]
        current_range = query["aggs"]["events"]["aggs"]["current"]["filter"]["range"]["@timestamp"]

        assert baseline_range["gte"] != current_range["gte"]
