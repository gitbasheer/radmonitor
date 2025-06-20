#!/usr/bin/env python3
"""
CORS proxy for the RAD monitor dashboard
Just forwards requests to Kibana and adds CORS headers so the browser stops complaining
"""

import json
import os
import sys
import ssl
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

# Skip SSL verification - we know what we're doing
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

class CORSProxyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Browser preflight check"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """Health check endpoint"""
        if self.path == '/health':
            self.send_response(200)
            self.send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            health_response = {
                "status": "running",
                "service": "RAD Monitor CORS Proxy",
                "port": 8889,
                "endpoints": ["/health", "/kibana-proxy"]
            }
            self.wfile.write(json.dumps(health_response).encode())
        else:
            self.send_error(404, "Try /health or /kibana-proxy")
    
    def do_POST(self):
        """Proxy requests to Kibana"""
        if not self.path.startswith('/kibana-proxy'):
            self.send_error(404, "Use /kibana-proxy endpoint")
            return
            
        try:
            # Read the request
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            # Get the cookie from headers
            elastic_cookie = self.headers.get('X-Elastic-Cookie')
            
            if not elastic_cookie:
                self.send_error_response(400, "Need X-Elastic-Cookie header")
                return
            
            # Build the Kibana URL
            kibana_url = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/api/console/proxy?path=traffic-*/_search&method=POST"
            
            # Forward to Kibana
            req = Request(kibana_url, data=post_data)
            req.add_header('Content-Type', 'application/json')
            req.add_header('kbn-xsrf', 'true')
            req.add_header('Cookie', f'sid={elastic_cookie}')
            
            print(f"Sending request to Kibana...")
            
            # Make the request
            with urlopen(req, timeout=30, context=ssl_context) as response:
                response_data = response.read()
                
                # Send back with CORS headers
                self.send_response(200)
                self.send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(response_data)
                
                print(f"Got response from Kibana")
                
        except HTTPError as e:
            print(f"Kibana said no: {e.code} - {e.reason}")
            self.send_error_response(e.code, f"Kibana error: {e.reason}")
            
        except URLError as e:
            print(f"Can't reach Kibana: {e.reason}")
            self.send_error_response(502, f"Connection failed: {e.reason}")
            
        except Exception as e:
            print(f"Something broke: {str(e)}")
            self.send_error_response(500, f"Proxy error: {str(e)}")
    
    def send_cors_headers(self):
        """Add CORS headers so browsers are happy"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Elastic-Cookie, kbn-xsrf')
        self.send_header('Access-Control-Max-Age', '86400')
    
    def send_error_response(self, code, message):
        """Send error with CORS headers"""
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
        """Only log important stuff"""
        # Skip the noise from successful requests
        if len(args) > 0 and isinstance(args[0], str):
            message = args[0] if args else ''
            # Skip 200/204/304 unless there's an error
            if not any(code in str(message) for code in ['200', '204', '304']) or 'ERROR' in str(message):
                super().log_message(format, *args)
        else:
            super().log_message(format, *args)

def main():
    port = 8889
    server_address = ('localhost', port)
    
    print(f"Starting CORS Proxy Server on http://localhost:{port}")
    print(f"Will proxy requests to Kibana with CORS headers")
    print(f"RAD Monitor can now make real-time API calls!")
    print(f"")
    print(f"Stop with Ctrl+C")
    print(f"=" * 40)
    
    try:
        httpd = HTTPServer(server_address, CORSProxyHandler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f"\nCORS Proxy stopped")
        httpd.shutdown()

if __name__ == '__main__':
    main() 