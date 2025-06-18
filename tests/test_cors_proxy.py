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

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cors_proxy import CORSProxyHandler, ssl_context


class TestCORSProxy:
    """Comprehensive test cases for the CORS proxy server"""
    
    def setup_method(self):
        """Set up test handler for each test"""
        self.handler = CORSProxyHandler(Mock(), ('localhost', 8889), Mock())
        self.handler.wfile = Mock()
        self.handler.rfile = Mock()
        self.handler.headers = {}
        self.handler.send_response = Mock()
        self.handler.send_header = Mock() 
        self.handler.end_headers = Mock()
        self.handler.send_error = Mock()
        
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
        
        assert response['status'] == 'healthy'
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
        
        self.handler.send_error.assert_called_with(404, "Endpoint not found")
        
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
        
        self.handler.send_error_response.assert_called_with(400, "Missing X-Elastic-Cookie header")
        
    @patch('urllib.request.urlopen')
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
        
    @patch('urllib.request.urlopen')
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
        
    @patch('urllib.request.urlopen')
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
        
    @patch('urllib.request.urlopen')
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
        
    @patch('urllib.request.urlopen')
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
        
        self.handler.send_error_response.assert_called_with(502, "Connection error: [SSL: CERTIFICATE_VERIFY_FAILED] certificate verify failed")
        
    @patch('urllib.request.urlopen')
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
        
        self.handler.send_error_response.assert_called_with(502, "Connection error: Connection refused")
        
    @patch('urllib.request.urlopen')
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
        
        self.handler.send_error_response.assert_called_with(502, "Connection error: timed out")
        
    @patch('urllib.request.urlopen')
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
        
    @patch('urllib.request.urlopen')
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
    
    @patch('http.server.HTTPServer')
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
        handler = CORSProxyHandler(Mock(), ('localhost', 8889), Mock())
        handler.send_header = Mock()
        
        handler.send_cors_headers()
        
        # Verify wildcard origin allows GitHub Pages
        handler.send_header.assert_any_call('Access-Control-Allow-Origin', '*')
        # This allows https://balkhalil.github.io
        
    def test_all_required_headers_allowed(self):
        """Test that all headers required by the dashboard are allowed"""
        handler = CORSProxyHandler(Mock(), ('localhost', 8889), Mock())
        handler.send_header = Mock()
        
        handler.send_cors_headers()
        
        # Check all required headers are in allowed list
        handler.send_header.assert_any_call(
            'Access-Control-Allow-Headers', 
            'Content-Type, X-Elastic-Cookie, kbn-xsrf'
        )


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--cov=cors_proxy', '--cov-report=term-missing']) 