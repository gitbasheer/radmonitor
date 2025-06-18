#!/usr/bin/env python3
"""
CORS Proxy Server for RAD Monitor
Forwards requests to Kibana with proper CORS headers
"""

import json
import os
import sys
import ssl
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# Create SSL context that doesn't verify certificates (for self-signed certs)
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

class CORSProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle preflight CORS requests"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """Handle GET requests (health check)"""
        if self.path == '/health':
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            health_response = {
                "status": "healthy",
                "service": "RAD Monitor CORS Proxy",
                "port": 8889,
                "endpoints": ["/health", "/kibana-proxy"]
            }
            self.wfile.write(json.dumps(health_response).encode())
        else:
            self.send_error(404, "Endpoint not found")
    
    def do_POST(self):
        """Handle POST requests to Kibana"""
        if not self.path.startswith('/kibana-proxy'):
            self.send_error(404, "Use /kibana-proxy endpoint")
            return
            
        try:
            # Parse the request
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Get the elastic cookie
            elastic_cookie = self.headers.get('X-Elastic-Cookie')
            
            if not elastic_cookie:
                self.send_error_response(400, "Missing X-Elastic-Cookie header")
                return
            
            # Build Kibana URL
            kibana_url = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/api/console/proxy?path=traffic-*/_search&method=POST"
            
            # Create request to Kibana
            req = Request(kibana_url, data=post_data)
            req.add_header('Content-Type', 'application/json')
            req.add_header('kbn-xsrf', 'true')
            req.add_header('Cookie', f'sid={elastic_cookie}')
            
            print(f"Proxying request to Kibana...")
            
            # Make the request with SSL context that allows self-signed certificates
            with urlopen(req, timeout=30, context=ssl_context) as response:
                response_data = response.read()
                
                # Send successful response with CORS headers
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_data)
                
                print(f"✓ Successfully proxied request to Kibana")
                
        except HTTPError as e:
            print(f"✗ Kibana HTTP Error: {e.code} - {e.reason}")
            self.send_error_response(e.code, f"Kibana error: {e.reason}")
            
        except URLError as e:
            print(f"✗ Connection Error: {e.reason}")
            self.send_error_response(502, f"Connection error: {e.reason}")
            
        except Exception as e:
            print(f"✗ Proxy Error: {str(e)}")
            self.send_error_response(500, f"Proxy error: {str(e)}")
    
    def send_cors_headers(self):
        """Send CORS headers to allow cross-origin requests"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Elastic-Cookie, kbn-xsrf')
        self.send_header('Access-Control-Max-Age', '86400')
    
    def send_error_response(self, code, message):
        """Send error response with CORS headers"""
        self.send_response(code)
        self.send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        error_response = {
            "error": {
                "type": "proxy_error",
                "reason": message
            }
        }
        self.wfile.write(json.dumps(error_response).encode())
    
    def log_message(self, format, *args):
        """Override to control logging"""
        # Only log errors and important messages
        # Check if this looks like a standard request log
        if len(args) > 0 and isinstance(args[0], str):
            # Standard format includes status code in the message
            message = args[0] if args else ''
            # Skip successful requests unless they contain ERROR
            if not any(code in str(message) for code in ['200', '204', '304']) or 'ERROR' in str(message):
                super().log_message(format, *args)
        else:
            # Non-standard format, log it
            super().log_message(format, *args)

def main():
    port = 8889  # Different port to avoid conflicts
    server_address = ('localhost', port)
    
    print(f"🚀 Starting CORS Proxy Server on http://localhost:{port}")
    print(f"📡 Will proxy requests to Kibana with CORS headers")
    print(f"🔄 RAD Monitor can now make real-time API calls!")
    print(f"")
    print(f"To stop: Press Ctrl+C")
    print(f"=" * 50)
    
    try:
        httpd = HTTPServer(server_address, CORSProxyHandler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\n🛑 CORS Proxy Server stopped")
        httpd.shutdown()

if __name__ == '__main__':
    main() 