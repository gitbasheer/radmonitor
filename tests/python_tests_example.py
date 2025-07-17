#!/usr/bin/env python3
"""
Example Python tests for cors_proxy.py
This is NOT part of the Vitest test suite - it's a reference for testing Python components

To run these tests:
1. Install pytest: pip install pytest pytest-mock
2. Run: pytest tests/python_tests_example.py
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from http.server import HTTPServer
from urllib.error import HTTPError, URLError

# Import the handler from cors_proxy
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cors_proxy import CORSProxyHandler


class TestCORSProxy:
    """Test cases for the CORS proxy server"""
    
    def setup_method(self):
        """Set up test handler"""
        self.handler = CORSProxyHandler(Mock(), ('localhost', 8889), Mock())
        self.handler.wfile = Mock()
        self.handler.rfile = Mock()
        
    def test_health_endpoint(self):
        """Test the health check endpoint"""
        self.handler.path = '/health'
        self.handler.send_response = Mock()
        self.handler.send_header = Mock()
        self.handler.end_headers = Mock()
        
        self.handler.do_GET()
        
        self.handler.send_response.assert_called_with(200)
        self.handler.send_header.assert_any_call('Content-Type', 'application/json')
        
        # Check response content
        response_data = self.handler.wfile.write.call_args[0][0]
        response = json.loads(response_data.decode())
        
        assert response['status'] == 'healthy'
        assert response['service'] == 'RAD Monitor CORS Proxy'
        assert response['port'] == 8889
        
    def test_options_preflight(self):
        """Test CORS preflight request handling"""
        self.handler.send_response = Mock()
        self.handler.send_header = Mock()
        self.handler.end_headers = Mock()
        
        self.handler.do_OPTIONS()
        
        self.handler.send_response.assert_called_with(200)
        self.handler.send_header.assert_any_call('Access-Control-Allow-Origin', '*')
        self.handler.send_header.assert_any_call('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        
    def test_proxy_request_missing_cookie(self):
        """Test proxy request without authentication cookie"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {}
        self.handler.send_response = Mock()
        self.handler.send_header = Mock()
        self.handler.end_headers = Mock()
        
        self.handler.do_POST()
        
        self.handler.send_response.assert_called_with(400)
        
    @patch('urllib.request.urlopen')
    def test_proxy_request_success(self, mock_urlopen):
        """Test successful proxy request"""
        # Mock request data
        request_data = {'query': {'match_all': {}}}
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': str(len(json.dumps(request_data))),
            'X-Elastic-Cookie': 'test_cookie_123'
        }
        self.handler.rfile.read.return_value = json.dumps(request_data).encode()
        
        # Mock response
        mock_response = MagicMock()
        mock_response.read.return_value = b'{"hits": {"total": 10}}'
        mock_urlopen.return_value.__enter__.return_value = mock_response
        
        # Mock handler methods
        self.handler.send_response = Mock()
        self.handler.send_header = Mock()
        self.handler.end_headers = Mock()
        
        self.handler.do_POST()
        
        # Verify proxy was called
        mock_urlopen.assert_called_once()
        
        # Verify response
        self.handler.send_response.assert_called_with(200)
        self.handler.wfile.write.assert_called_with(b'{"hits": {"total": 10}}')
        
    @patch('urllib.request.urlopen')
    def test_proxy_request_http_error(self, mock_urlopen):
        """Test proxy request with HTTP error from Kibana"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        
        # Mock HTTP error
        mock_urlopen.side_effect = HTTPError(None, 401, 'Unauthorized', {}, None)
        
        self.handler.send_response = Mock()
        self.handler.send_header = Mock()
        self.handler.end_headers = Mock()
        
        self.handler.do_POST()
        
        self.handler.send_response.assert_called_with(401)
        
    @patch('urllib.request.urlopen')
    def test_proxy_request_network_error(self, mock_urlopen):
        """Test proxy request with network error"""
        self.handler.path = '/kibana-proxy'
        self.handler.headers = {
            'Content-Length': '2',
            'X-Elastic-Cookie': 'test_cookie'
        }
        self.handler.rfile.read.return_value = b'{}'
        
        # Mock network error
        mock_urlopen.side_effect = URLError('Connection refused')
        
        self.handler.send_response = Mock()
        self.handler.send_header = Mock()
        self.handler.end_headers = Mock()
        
        self.handler.do_POST()
        
        self.handler.send_response.assert_called_with(502)
        
    def test_cors_headers(self):
        """Test that CORS headers are properly set"""
        self.handler.send_header = Mock()
        
        self.handler.send_cors_headers()
        
        expected_headers = [
            ('Access-Control-Allow-Origin', '*'),
            ('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'),
            ('Access-Control-Allow-Headers', 'Content-Type, X-Elastic-Cookie, kbn-xsrf'),
            ('Access-Control-Max-Age', '86400')
        ]
        
        for header, value in expected_headers:
            self.handler.send_header.assert_any_call(header, value)
            
    def test_404_for_unknown_endpoint(self):
        """Test 404 response for unknown endpoints"""
        self.handler.path = '/unknown'
        self.handler.send_error = Mock()
        
        self.handler.do_GET()
        
        self.handler.send_error.assert_called_with(404, "Endpoint not found")


if __name__ == '__main__':
    pytest.main([__file__, '-v']) 