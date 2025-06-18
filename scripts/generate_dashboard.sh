#!/bin/bash
# generate_dashboard.sh - GitHub Actions compatible version

# Configuration
KIBANA_URL="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
# ELASTIC_COOKIE is set as environment variable in GitHub Actions

# Check if we have the cookie
if [ -z "$ELASTIC_COOKIE" ]; then
    echo "Warning: ELASTIC_COOKIE environment variable not set"
    # For local testing only - extract from local script
    if [ -f "$HOME/scripts/traffic_monitor.sh" ]; then
        echo "Attempting to extract cookie from local script..."
        ELASTIC_COOKIE=$(grep 'ELASTIC_COOKIE="' "$HOME/scripts/traffic_monitor.sh" | cut -d'"' -f2)
        if [ -n "$ELASTIC_COOKIE" ]; then
            echo "✓ Found cookie in local script"
        else
            echo "Error: Could not extract cookie from local script"
            exit 1
        fi
    else
        echo "Error: No cookie found and local script not available"
        exit 1
    fi
fi

echo "=== Generating RAD Traffic Dashboard ==="
echo "Timestamp: $(date)"

# Query matching your Kibana request
QUERY='{
  "aggs": {
    "events": {
      "terms": {
        "field": "detail.event.data.traffic.eid.keyword",
        "order": {"_key": "asc"},
        "size": 500
      },
      "aggs": {
        "baseline": {
          "filter": {
            "range": {
              "@timestamp": {
                "gte": "2025-06-01",
                "lt": "2025-06-09"
              }
            }
          }
        },
        "current": {
          "filter": {
            "range": {
              "@timestamp": {
                "gte": "now-12h"
              }
            }
          }
        }
      }
    }
  },
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
        },
        {
          "match_phrase": {
            "detail.global.page.host": "dashboard.godaddy.com"
          }
        },
        {
          "range": {
            "@timestamp": {
              "gte": "2025-05-19T04:00:00.000Z",
              "lte": "now"
            }
          }
        }
      ]
    }
  }
}'

echo "Fetching traffic data..."

# Use console proxy with correct index pattern
RESPONSE=$(curl -s -X POST "${KIBANA_URL}/api/console/proxy?path=traffic-*/_search&method=POST" \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "Cookie: sid=${ELASTIC_COOKIE}" \
  -d "$QUERY")

# Save raw response for debugging
mkdir -p data
echo "$RESPONSE" > data/raw_response.json

# Process the response
echo "Processing data..."

python3 - << 'PYTHON_END' > index.html
import json
import sys
from datetime import datetime

try:
    # Read the response
    with open('data/raw_response.json', 'r') as f:
        response = json.load(f)
    
    # Check for errors
    if 'error' in response:
        print(f"<h1>Error from Elasticsearch</h1><pre>{response['error']}</pre>")
        sys.exit(1)
    
    # Extract data and generate HTML (same as before)
    results = []
    
    if 'aggregations' in response and 'events' in response['aggregations']:
        buckets = response['aggregations']['events']['buckets']
        
        for bucket in buckets:
            event_id = bucket['key']
            baseline_count = bucket.get('baseline', {}).get('doc_count', 0)
            current_count = bucket.get('current', {}).get('doc_count', 0)
            
            # Calculate metrics (same logic as before)
            baseline_12h = (baseline_count / 8 / 24 * 12) if baseline_count > 0 else 0
            if baseline_12h == 0:
                continue
                
            daily_avg = baseline_count / 8
            if daily_avg < 100:
                continue
                
            # Calculate score
            if daily_avg >= 1000:
                if baseline_12h > 0 and current_count / baseline_12h < 0.5:
                    score = round((1 - current_count / baseline_12h) * -100)
                else:
                    score = round((current_count / baseline_12h - 1) * 100) if baseline_12h > 0 else 0
            else:
                if baseline_12h > 0 and current_count / baseline_12h < 0.3:
                    score = round((1 - current_count / baseline_12h) * -100)
                else:
                    score = round((current_count / baseline_12h - 1) * 100) if baseline_12h > 0 else 0
            
            # Determine status
            if score <= -80:
                status = "CRITICAL"
            elif score <= -50:
                status = "WARNING"
            elif score > 0:
                status = "INCREASED"
            else:
                status = "NORMAL"
            
            display_name = event_id.replace('pandc.vnext.recommendations.feed.', '')
            
            results.append({
                'event_id': event_id,
                'display_name': display_name,
                'current': current_count,
                'baseline_12h': round(baseline_12h),
                'score': score,
                'status': status,
                'daily_avg': round(daily_avg)
            })
    
    # Sort by score
    results.sort(key=lambda x: x['score'])
    
    # Count statuses
    critical = sum(1 for r in results if r['status'] == 'CRITICAL')
    warning = sum(1 for r in results if r['status'] == 'WARNING')
    normal = sum(1 for r in results if r['status'] == 'NORMAL')
    increased = sum(1 for r in results if r['status'] == 'INCREASED')
    
    # Generate complete HTML
    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>RAD Traffic Health Monitor</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="300">
    <style>
        body {{ 
            font-family: Arial, sans-serif; 
            margin: 0; 
            padding: 0;
            background: #f5f5f5;
            display: flex;
        }}
        
        /* Sidebar Control Panel - Always Visible */
        .control-panel {{
            width: 280px;
            background: #ffffff;
            border-right: 2px solid #ddd;
            height: 100vh;
            overflow-y: auto;
            position: fixed;
            left: 0;
            top: 0;
            box-shadow: 2px 0 5px rgba(0,0,0,0.1);
        }}
        
        .control-header {{
            padding: 15px;
            border-bottom: 2px solid #eee;
            font-weight: bold;
            color: #333;
            background: #f8f8f8;
            font-size: 14px;
        }}
        
        .control-content {{
            padding: 15px;
        }}
        
        .control-section {{
            margin-bottom: 20px;
            border-bottom: 1px solid #eee;
            padding-bottom: 15px;
        }}
        
        .control-section:last-child {{
            border-bottom: none;
            margin-bottom: 0;
        }}
        
        .control-label {{
            display: block;
            font-size: 12px;
            font-weight: bold;
            color: #555;
            margin-bottom: 5px;
            text-transform: uppercase;
        }}
        
        .control-input {{
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ccc;
            font-size: 12px;
            font-family: monospace;
            box-sizing: border-box;
        }}
        
        .control-input:focus {{
            outline: none;
            border-color: #666;
        }}
        
        .control-button {{
            width: 100%;
            padding: 8px 12px;
            background: #333;
            color: white;
            border: none;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 5px;
            text-transform: uppercase;
        }}
        
        .control-button:hover {{
            background: #555;
        }}
        
        .control-button.secondary {{
            background: #666;
        }}
        
        .control-button.secondary:hover {{
            background: #777;
        }}
        
        .refresh-status {{
            font-size: 11px;
            color: #666;
            text-align: center;
            margin-top: 5px;
            line-height: 1.3;
        }}
        
        .config-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }}
        
        .preset-buttons {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-top: 5px;
        }}
        
        .preset-button {{
            padding: 4px 8px;
            background: #f0f0f0;
            border: 1px solid #ccc;
            font-size: 11px;
            cursor: pointer;
        }}
        
        .preset-button:hover {{
            background: #e0e0e0;
        }}
        
        /* Main Content Area */
        .main-content {{
            margin-left: 280px;
            padding: 20px;
            flex: 1;
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1200px;
            margin: 0;
            background: white;
            border: 2px solid #ddd;
        }}
        
        .header {{
            padding: 15px 20px;
            border-bottom: 2px solid #ddd;
            background: #f8f8f8;
        }}
        
        h1 {{ 
            font-size: 24px;
            margin: 0;
            color: #333;
            font-weight: bold;
        }}
        
        .timestamp {{ 
            color: #666;
            font-size: 12px;
            margin-top: 5px;
            font-family: monospace;
        }}
        
        .content {{
            padding: 20px;
        }}
        
        /* Summary Cards */
        .summary {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }}
        
        .card {{
            padding: 15px;
            text-align: center;
            background: #f9f9f9;
            border: 2px solid #ddd;
        }}
        
        .card.critical {{
            background: #ffe6e6;
            border-color: #ffcccc;
        }}
        
        .card.warning {{
            background: #fff8e1;
            border-color: #ffe082;
        }}
        
        .card.normal {{
            background: #e8f5e8;
            border-color: #c8e6c9;
        }}
        
        .card.increased {{
            background: #e3f2fd;
            border-color: #90caf9;
        }}
        
        .card-number {{
            font-size: 32px;
            font-weight: bold;
            margin: 5px 0;
            line-height: 1;
        }}
        
        .card-label {{
            font-size: 11px;
            color: #666;
            text-transform: uppercase;
            font-weight: bold;
        }}
        
        /* Table */
        table {{ 
            width: 100%; 
            border-collapse: collapse;
            font-size: 12px;
            border: 2px solid #ddd;
        }}
        
        thead {{
            background: #f0f0f0;
        }}
        
        th {{ 
            padding: 10px 8px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #ddd;
            border-right: 1px solid #ddd;
            font-size: 11px;
            text-transform: uppercase;
        }}
        
        th:last-child {{
            border-right: none;
        }}
        
        td {{ 
            padding: 8px;
            border-bottom: 1px solid #eee;
            border-right: 1px solid #eee;
        }}
        
        td:last-child {{
            border-right: none;
        }}
        
        tbody tr:nth-child(even) {{ 
            background: #f9f9f9;
        }}
        
        tbody tr:hover {{ 
            background: #f0f0f0;
        }}
        
        /* Event links */
        .event-link {{
            text-decoration: none;
            color: inherit;
            display: block;
        }}
        
        .event-link:hover {{
            text-decoration: underline;
        }}
        
        .event-name {{
            font-family: monospace;
            font-size: 11px;
            color: #333;
        }}
        
        /* Status badges */
        .badge {{
            display: inline-block;
            padding: 3px 6px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            color: white;
        }}
        
        .badge.critical {{
            background: #d32f2f;
        }}
        
        .badge.warning {{
            background: #f57c00;
        }}
        
        .badge.normal {{
            background: #388e3c;
        }}
        
        .badge.increased {{
            background: #1976d2;
        }}
        
        /* Score */
        .score {{
            font-family: monospace;
            font-size: 12px;
            font-weight: bold;
        }}
        
        .score.negative {{
            color: #d32f2f;
        }}
        
        .score.positive {{
            color: #388e3c;
        }}
        
        /* Numbers */
        .number {{
            text-align: right;
            font-family: monospace;
            font-size: 11px;
        }}
        
        /* Impact */
        .impact {{
            font-size: 11px;
            color: #666;
        }}
        
        .impact.loss {{
            color: #d32f2f;
        }}
        
        .impact.gain {{
            color: #388e3c;
        }}
        
        /* Footer */
        .footer {{
            margin-top: 25px;
            padding-top: 15px;
            border-top: 2px solid #ddd;
            text-align: center;
        }}
        
        .footer a {{
            color: #333;
            text-decoration: none;
            margin: 0 10px;
            font-size: 12px;
            font-weight: bold;
        }}
        
        .footer a:hover {{
            text-decoration: underline;
        }}
    </style>
    <script>
        // Configuration and API functions
        const KIBANA_URL = 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
        
        async function updateDashboardRealtime(config) {{
            try {{
                // Build dynamic query based on configuration
                const query = {{
                    "aggs": {{
                        "events": {{
                            "terms": {{
                                "field": "detail.event.data.traffic.eid.keyword",
                                "order": {{"_key": "asc"}},
                                "size": 500
                            }},
                            "aggs": {{
                                "baseline": {{
                                    "filter": {{
                                        "range": {{
                                            "@timestamp": {{
                                                "gte": config.baselineStart,
                                                "lt": config.baselineEnd
                                            }}
                                        }}
                                    }}
                                }},
                                "current": {{
                                    "filter": {{
                                        "range": {{
                                            "@timestamp": {{
                                                "gte": config.currentTimeRange
                                            }}
                                        }}
                                    }}
                                }}
                            }}
                        }}
                    }},
                    "size": 0,
                    "query": {{
                        "bool": {{
                            "filter": [
                                {{
                                    "wildcard": {{
                                        "detail.event.data.traffic.eid.keyword": {{
                                            "value": "pandc.vnext.recommendations.feed.feed*"
                                        }}
                                    }}
                                }},
                                {{
                                    "match_phrase": {{
                                        "detail.global.page.host": "dashboard.godaddy.com"
                                    }}
                                }},
                                {{
                                    "range": {{
                                        "@timestamp": {{
                                            "gte": "2025-05-19T04:00:00.000Z",
                                            "lte": "now"
                                        }}
                                    }}
                                }}
                            ]
                        }}
                    }}
                }};
                
                // Get authentication
                const auth = await getAuthenticationDetails();
                if (!auth.valid) {{
                    console.log('Authentication not available or invalid');
                    return false;
                }}
                
                console.log(`Making API call via: ${{auth.method}}`);
                
                // Choose API endpoint based on environment and proxy availability
                let apiUrl, headers;
                
                if (auth.method === 'proxy') {{
                    // Use local CORS proxy
                    apiUrl = 'http://localhost:8889/kibana-proxy';
                    headers = {{
                        'Content-Type': 'application/json',
                        'X-Elastic-Cookie': auth.cookie
                    }};
                }} else if (auth.method === 'direct') {{
                    // Direct to Kibana (works on GitHub Pages)
                    apiUrl = `${{KIBANA_URL}}/api/console/proxy?path=traffic-*/_search&method=POST`;
                    headers = {{
                        'Content-Type': 'application/json',
                        'kbn-xsrf': 'true',
                        'Cookie': `sid=${{auth.cookie}}`
                    }};
                }} else {{
                    throw new Error('No valid API method available');
                }}
                
                // Make API call
                const response = await fetch(apiUrl, {{
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(query),
                    credentials: auth.method === 'direct' ? 'include' : 'omit'
                }});
                
                if (!response.ok) {{
                    throw new Error(`HTTP ${{response.status}}: ${{response.statusText}}`);
                }}
                
                const data = await response.json();
                
                // Check for Elasticsearch errors
                if (data.error) {{
                    throw new Error(`Elasticsearch error: ${{data.error.reason || data.error.type}}`);
                }}
                
                // Process and update dashboard
                updateDashboardUI(data, config);
                
                console.log(`✓ Real-time update successful via ${{auth.method}} method`);
                return true;
                
            }} catch (error) {{
                console.log('Real-time update failed:', error);
                
                const status = document.getElementById('refreshStatus');
                
                if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {{
                    if (window.location.hostname === 'localhost') {{
                        status.textContent = 'API failed - try starting CORS proxy (see instructions)';
                    }} else {{
                        status.textContent = 'API call failed - check authentication';
                    }}
                }} else if (error.message.includes('proxy_error')) {{
                    status.textContent = 'CORS proxy error - check proxy logs';
                }} else if (error.message.includes('Elasticsearch error')) {{
                    status.textContent = `Kibana error: ${{error.message}}`;
                }} else {{
                    status.textContent = `API error: ${{error.message}}`;
                }}
                
                return false;
            }}
        }}
        
        async function getAuthenticationDetails() {{
            const isLocalhost = window.location.hostname === 'localhost';
            
            // Check if CORS proxy is available (localhost only)
            if (isLocalhost) {{
                const proxyAvailable = await checkCorsProxy();
                if (proxyAvailable) {{
                    const cookie = await getElasticCookie(true);
                    if (cookie) {{
                        return {{ valid: true, method: 'proxy', cookie: cookie }};
                    }}
                }}
            }}
            
            // Try direct method (works on GitHub Pages)
            const cookie = await getElasticCookie(false);
            if (cookie) {{
                return {{ valid: true, method: 'direct', cookie: cookie }};
            }}
            
            // No valid authentication
            return {{ valid: false, method: null, cookie: null }};
        }}
        
        async function checkCorsProxy() {{
            try {{
                const response = await fetch('http://localhost:8889/health', {{
                    method: 'GET',
                    signal: AbortSignal.timeout(1000)
                }});
                return response.ok;
            }} catch {{
                return false;
            }}
        }}
        
        async function getElasticCookie(forProxy = false) {{
            // Method 1: Try localStorage
            const storedCookie = localStorage.getItem('elasticCookie');
            if (storedCookie && storedCookie.trim()) {{
                return storedCookie.trim();
            }}
            
            // Method 2: Try environment/server-side
            const cookieInput = document.getElementById('elasticCookie');
            if (cookieInput && cookieInput.value) {{
                return cookieInput.value;
            }}
            
            // Method 3: Prompt user with detailed instructions
            const cookieSource = forProxy ? 'CORS proxy' : 'real-time API calls';
            return await promptForCookie(cookieSource);
        }}
        
        async function promptForCookie(purpose) {{
            const instructions = `
AUTHENTICATION NEEDED

To enable ${{purpose}}, you need your Elastic cookie:

HOW TO GET YOUR COOKIE:
1. Open Kibana in a new tab
2. Open DevTools (F12)
3. Go to Application/Storage → Cookies
4. Find 'sid' cookie
5. Copy the FULL VALUE (starts with Fe26.2**)

ALTERNATIVE:
1. In Kibana, open DevTools Network tab
2. Refresh the page
3. Click any request to Kibana
4. In Request Headers, find 'Cookie: sid=...'
5. Copy just the sid value

Your cookie (paste here):`;

            const cookie = prompt(instructions);
            if (cookie && cookie.trim()) {{
                // Validate cookie format
                if (cookie.includes('Fe26.2**') || cookie.length > 100) {{
                    localStorage.setItem('elasticCookie', cookie.trim());
                    return cookie.trim();
                }} else {{
                    alert('Cookie format looks invalid. Please make sure you copied the full sid value.');
                    return null;
                }}
            }}
            return null;
        }}
        
        function showApiSetupInstructions() {{
            const isLocalhost = window.location.hostname === 'localhost';
            
            if (isLocalhost) {{
                alert(`REAL-TIME API SETUP FOR LOCALHOST

OPTION 1: Use CORS Proxy (Recommended)
1. Open a new terminal
2. Run: python3 cors_proxy.py
3. Leave it running (port 8889)
4. Refresh this dashboard
5. Set your Elastic cookie when prompted

OPTION 2: Browser CORS Bypass
• Chrome: Start with --disable-web-security --user-data-dir=/tmp/chrome_dev
• Firefox: Set security.tls.insecure_fallback_hosts in about:config
⚠️  Only for development - never for regular browsing!

OPTION 3: Direct Access (Production)
• Deploy to GitHub Pages - no CORS issues
• Real-time API calls work normally

Current Setup:
• CORS Proxy: ${{document.getElementById('corsProxyStatus').textContent}}
• Cookie: ${{localStorage.getItem('elasticCookie') ? 'Set' : 'Not set'}}`);
            }} else {{
                alert(`REAL-TIME API SETUP FOR GITHUB PAGES

You're running on GitHub Pages - real-time should work!

SETUP STEPS:
1. Click "SET COOKIE FOR REAL-TIME"
2. Enter your Elastic cookie (sid=...)
3. Click "REFRESH NOW" to test

If still not working:
• Check if cookie expired
• Verify Kibana access permissions
• Check browser console for errors

Current Status:
• Environment: Production (GitHub Pages)
• Cookie: ${{localStorage.getItem('elasticCookie') ? 'Set' : 'Not set'}}`);
            }}
        }}
        
        async function testApiConnection() {{
            const status = document.getElementById('refreshStatus');
            const testBtn = document.getElementById('testApiBtn');
            
            if (testBtn) {{
                testBtn.disabled = true;
                testBtn.textContent = 'TESTING...';
            }}
            
            status.textContent = 'Testing API connection...';
            
            try {{
                const auth = await getAuthenticationDetails();
                
                if (!auth.valid) {{
                    status.textContent = 'Test failed: No authentication available';
                    return;
                }}
                
                // Simple test query
                const testQuery = {{
                    "size": 0,
                    "query": {{
                        "bool": {{
                            "filter": [
                                {{
                                    "range": {{
                                        "@timestamp": {{ "gte": "now-1h" }}
                                    }}
                                }}
                            ]
                        }}
                    }}
                }};
                
                let apiUrl, headers;
                if (auth.method === 'proxy') {{
                    apiUrl = 'http://localhost:8889/kibana-proxy';
                    headers = {{
                        'Content-Type': 'application/json',
                        'X-Elastic-Cookie': auth.cookie
                    }};
                }} else {{
                    apiUrl = `${{KIBANA_URL}}/api/console/proxy?path=traffic-*/_search&method=POST`;
                    headers = {{
                        'Content-Type': 'application/json',
                        'kbn-xsrf': 'true',
                        'Cookie': `sid=${{auth.cookie}}`
                    }};
                }}
                
                const response = await fetch(apiUrl, {{
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(testQuery),
                    credentials: auth.method === 'direct' ? 'include' : 'omit'
                }});
                
                if (response.ok) {{
                    const data = await response.json();
                    if (data.error) {{
                        status.textContent = `Test failed: ${{data.error.reason || 'Elasticsearch error'}}`;
                    }} else {{
                        status.textContent = `✓ API test successful via ${{auth.method}} method!`;
                    }}
                }} else {{
                    status.textContent = `Test failed: HTTP ${{response.status}} ${{response.statusText}}`;
                }}
                
            }} catch (error) {{
                status.textContent = `Test failed: ${{error.message}}`;
            }} finally {{
                if (testBtn) {{
                    testBtn.disabled = false;
                    testBtn.textContent = 'TEST API CONNECTION';
                }}
            }}
        }}
        
        // Enhanced cookie management
        function setCookieForRealtime() {{
            promptForCookie('real-time updates').then(cookie => {{
                if (cookie) {{
                    document.getElementById('refreshStatus').textContent = 'Cookie saved! Click refresh to test real-time.';
                }}
            }});
        }}
        
        // Update status checking
        async function updateApiStatus() {{
            const isLocalhost = window.location.hostname === 'localhost';
            const statusEl = document.getElementById('refreshStatus');
            const corsStatusEl = document.getElementById('corsProxyStatus');
            const envStatusEl = document.getElementById('envStatus');
            const cookieStatusEl = document.getElementById('cookieStatus');
            
            // Update environment status
            if (envStatusEl) {{
                envStatusEl.textContent = isLocalhost ? 'Local Dev' : 'GitHub Pages';
            }}
            
            // Update cookie status
            const hasCookie = localStorage.getItem('elasticCookie');
            if (cookieStatusEl) {{
                cookieStatusEl.textContent = hasCookie ? 'Set' : 'Not set';
                cookieStatusEl.style.color = hasCookie ? '#388e3c' : '#d32f2f';
            }}
            
            if (isLocalhost) {{
                // Check CORS proxy status
                const proxyRunning = await checkCorsProxy();
                
                if (corsStatusEl) {{
                    corsStatusEl.textContent = proxyRunning ? 'Running' : 'Not running';
                    corsStatusEl.style.color = proxyRunning ? '#388e3c' : '#d32f2f';
                }}
                
                // Update main status message
                if (proxyRunning && hasCookie) {{
                    statusEl.innerHTML = `Ready for real-time! | <a href="#" onclick="testApiConnection()" style="color: #333;">Test API</a> | <a href="#" onclick="showApiSetupInstructions()" style="color: #333;">Setup</a>`;
                }} else if (proxyRunning) {{
                    statusEl.innerHTML = `CORS proxy ready - need cookie | <a href="#" onclick="setCookieForRealtime()" style="color: #333;">Set Cookie</a> | <a href="#" onclick="showApiSetupInstructions()" style="color: #333;">Setup</a>`;
                }} else {{
                    statusEl.innerHTML = `Start CORS proxy for real-time | <a href="#" onclick="showApiSetupInstructions()" style="color: #333;">Instructions</a>`;
                }}
            }} else {{
                // GitHub Pages - no CORS proxy needed
                if (corsStatusEl) {{
                    corsStatusEl.textContent = 'Not needed';
                    corsStatusEl.style.color = '#666';
                }}
                
                if (hasCookie) {{
                    statusEl.innerHTML = `Real-time enabled | <a href="#" onclick="testApiConnection()" style="color: #333;">Test API</a> | <a href="#" onclick="setCookieForRealtime()" style="color: #333;">Update Cookie</a>`;
                }} else {{
                    statusEl.innerHTML = `Auto-refresh: 5 minutes | <a href="#" onclick="setCookieForRealtime()" style="color: #333;">Enable Real-time</a>`;
                }}
            }}
        }}
        
        // Load configuration on page load
        window.onload = function() {{
            loadConfiguration();
            updateApiStatus();
            
            // Update status every 30 seconds
            setInterval(updateApiStatus, 30000);
        }};
        
        async function refreshDashboard() {{
            const refreshBtn = document.getElementById('refreshBtn');
            const status = document.getElementById('refreshStatus');
            
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'REFRESHING...';
            status.textContent = 'Fetching latest data...';
            
            try {{
                // Get current configuration
                const config = getCurrentConfig();
                
                // Try real-time update first
                const success = await updateDashboardRealtime(config);
                
                if (success) {{
                    status.textContent = 'Updated with real-time data!';
                    refreshBtn.textContent = 'REFRESH NOW';
                    refreshBtn.disabled = false;
                    
                    // Update timestamp immediately after successful refresh
                    updateTimestamp();
                }} else {{
                    // Fallback to static refresh (regenerate + reload)
                    status.textContent = 'Regenerating dashboard with fresh data...';
                    
                    // Save configuration before reload
                    localStorage.setItem('radMonitorConfig', JSON.stringify(config));
                    
                    // Show progress message
                    let dots = 0;
                    const progressInterval = setInterval(() => {{
                        dots = (dots + 1) % 4;
                        status.textContent = 'Regenerating dashboard with fresh data' + '.'.repeat(dots);
                    }}, 300);
                    
                    // Small delay to show the message, then reload
                    setTimeout(() => {{
                        clearInterval(progressInterval);
                        window.location.reload();
                    }}, 1500);
                }}
            }} catch (error) {{
                console.error('Refresh failed completely:', error);
                status.textContent = 'Refresh failed, reloading page...';
                setTimeout(() => window.location.reload(), 2000);
            }}
        }}
        
        function getCurrentConfig() {{
            return {{
                baselineStart: document.getElementById('baselineStart').value || '2025-06-01',
                baselineEnd: document.getElementById('baselineEnd').value || '2025-06-09',
                currentTimeRange: document.getElementById('currentTimeRange').value || 'now-12h',
                highVolumeThreshold: parseInt(document.getElementById('highVolumeThreshold').value) || 1000,
                mediumVolumeThreshold: parseInt(document.getElementById('mediumVolumeThreshold').value) || 100
            }};
        }}
        
        function updateDashboardUI(data, config) {{
            if (!data.aggregations || !data.aggregations.events) {{
                throw new Error('Invalid data structure received');
            }}
            
            const buckets = data.aggregations.events.buckets;
            const results = [];
            
            // Calculate baseline days
            const baselineStart = new Date(config.baselineStart);
            const baselineEnd = new Date(config.baselineEnd);
            const baselineDays = Math.ceil((baselineEnd - baselineStart) / (1000 * 60 * 60 * 24));
            
            // Extract current time range hours
            const timeRangeMatch = config.currentTimeRange.match(/now-(\d+)([hd])/);
            let currentHours = 12; // default
            if (timeRangeMatch) {{
                const value = parseInt(timeRangeMatch[1]);
                const unit = timeRangeMatch[2];
                currentHours = unit === 'h' ? value : value * 24;
            }}
            
            for (const bucket of buckets) {{
                const event_id = bucket.key;
                const baseline_count = bucket.baseline?.doc_count || 0;
                const current_count = bucket.current?.doc_count || 0;
                
                // Calculate metrics using configuration
                const baseline_period = (baseline_count / baselineDays / 24 * currentHours);
                if (baseline_period === 0) continue;
                
                const daily_avg = baseline_count / baselineDays;
                if (daily_avg < config.mediumVolumeThreshold) continue;
                
                // Calculate score using configurable thresholds
                let score;
                if (daily_avg >= config.highVolumeThreshold) {{
                    if (baseline_period > 0 && current_count / baseline_period < 0.5) {{
                        score = Math.round((1 - current_count / baseline_period) * -100);
                    }} else {{
                        score = Math.round((current_count / baseline_period - 1) * 100);
                    }}
                }} else {{
                    if (baseline_period > 0 && current_count / baseline_period < 0.3) {{
                        score = Math.round((1 - current_count / baseline_period) * -100);
                    }} else {{
                        score = Math.round((current_count / baseline_period - 1) * 100);
                    }}
                }}
                
                // Determine status
                let status;
                if (score <= -80) status = "CRITICAL";
                else if (score <= -50) status = "WARNING";
                else if (score > 0) status = "INCREASED";
                else status = "NORMAL";
                
                results.push({{
                    event_id,
                    current: current_count,
                    baseline_period: Math.round(baseline_period),
                    score,
                    status,
                    daily_avg: Math.round(daily_avg)
                }});
            }}
            
            // Sort by score (worst first)
            results.sort((a, b) => a.score - b.score);
            
            // Update UI
            updateSummaryCards(results);
            updateDataTable(results);
        }}
        
        function updateSummaryCards(results) {{
            const critical = results.filter(r => r.status === 'CRITICAL').length;
            const warning = results.filter(r => r.status === 'WARNING').length;
            const normal = results.filter(r => r.status === 'NORMAL').length;
            const increased = results.filter(r => r.status === 'INCREASED').length;
            
            document.querySelector('.card.critical .card-number').textContent = critical;
            document.querySelector('.card.warning .card-number').textContent = warning;
            document.querySelector('.card.normal .card-number').textContent = normal;
            document.querySelector('.card.increased .card-number').textContent = increased;
        }}
        
        function updateDataTable(results) {{
            const tbody = document.querySelector('table tbody');
            tbody.innerHTML = '';
            
            for (const item of results) {{
                const scoreClass = item.score < 0 ? 'negative' : 'positive';
                const scoreText = `${{item.score > 0 ? '+' : ''}}${{item.score}}%`;
                
                const diff = item.current - item.baseline_period;
                let impact, impactClass;
                if (diff < -50) {{
                    impact = `Lost ~${{Math.abs(diff).toLocaleString()}} impressions`;
                    impactClass = 'loss';
                }} else if (diff > 50) {{
                    impact = `Gained ~${{diff.toLocaleString()}} impressions`;
                    impactClass = 'gain';
                }} else {{
                    impact = 'Normal variance';
                    impactClass = '';
                }}
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><a href="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'2025-05-28T16:50:47.243Z',to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:detail.event.data.traffic.eid.keyword,negate:!f,params:(query:'${{item.event_id}}'),type:phrase),query:(match_phrase:(detail.event.data.traffic.eid.keyword:'${{item.event_id}}')))),grid:(columns:(detail.event.data.traffic.eid.keyword:(width:400))),hideChart:!f,index:'traffic-*',interval:auto,query:(language:kuery,query:''),sort:!())" target="_blank" class="event-link">
                        <span class="event-name">${{item.event_id}}</span>
                    </a></td>
                    <td><span class="badge ${{item.status.toLowerCase()}}">${{item.status}}</span></td>
                    <td class="number"><span class="score ${{scoreClass}}">${{scoreText}}</span></td>
                    <td class="number">${{item.current.toLocaleString()}}</td>
                    <td class="number">${{item.baseline_period.toLocaleString()}}</td>
                    <td class="number">${{item.daily_avg.toLocaleString()}}</td>
                    <td><span class="impact ${{impactClass}}">${{impact}}</span></td>
                `;
                tbody.appendChild(row);
            }}
        }}
        
        function updateTimestamp() {{
            const now = new Date();
            const utcString = now.toUTCString();
            const timestamp = document.querySelector('.timestamp');
            timestamp.textContent = `Last Updated: ${{utcString}} | Auto-refresh: 5 minutes`;
        }}
        
        function setPresetTimeRange(preset) {{
            const currentInput = document.getElementById('currentTimeRange');
            switch(preset) {{
                case '6h':
                    currentInput.value = 'now-6h';
                    break;
                case '12h':
                    currentInput.value = 'now-12h';
                    break;
                case '24h':
                    currentInput.value = 'now-24h';
                    break;
                case '3d':
                    currentInput.value = 'now-3d';
                    break;
            }}
        }}
        
        function applyConfiguration() {{
            const config = getCurrentConfig();
            localStorage.setItem('radMonitorConfig', JSON.stringify(config));
            
            // Show immediate feedback
            const status = document.getElementById('refreshStatus');
            status.textContent = 'Configuration saved! Click refresh to apply.';
            
            // Optional: Auto-refresh with new configuration
            setTimeout(() => {{
                refreshDashboard();
            }}, 1000);
        }}
        
        function loadConfiguration() {{
            const saved = localStorage.getItem('radMonitorConfig');
            if (saved) {{
                const config = JSON.parse(saved);
                document.getElementById('baselineStart').value = config.baselineStart || '2025-06-01';
                document.getElementById('baselineEnd').value = config.baselineEnd || '2025-06-09';
                document.getElementById('currentTimeRange').value = config.currentTimeRange || 'now-12h';
                document.getElementById('highVolumeThreshold').value = config.highVolumeThreshold || '1000';
                document.getElementById('mediumVolumeThreshold').value = config.mediumVolumeThreshold || '100';
            }}
        }}
        
        function exportConfiguration() {{
            const config = getCurrentConfig();
            config.timestamp = new Date().toISOString();
            
            const dataStr = JSON.stringify(config, null, 2);
            const dataBlob = new Blob([dataStr], {{type: 'application/json'}});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'rad-monitor-config.json';
            link.click();
            URL.revokeObjectURL(url);
        }}
    </script>
</head>
<body>
    <!-- Hidden input for server-side cookie (optional) -->
    <input type="hidden" id="elasticCookie" value="">
    
    <!-- Sidebar Control Panel - Always Visible -->
    <div class="control-panel">
        <div class="control-header">
            DASHBOARD CONTROLS
        </div>
        <div class="control-content">
            <div class="control-section">
                <button class="control-button" id="refreshBtn" onclick="refreshDashboard()">
                    REFRESH NOW
                </button>
                <div class="refresh-status" id="refreshStatus">Auto-refresh: 5 minutes</div>
            </div>
            
            <div class="control-section">
                <label class="control-label">Baseline Period</label>
                <div class="config-grid">
                    <input type="date" class="control-input" id="baselineStart" value="2025-06-01">
                    <input type="date" class="control-input" id="baselineEnd" value="2025-06-09">
                </div>
            </div>
            
            <div class="control-section">
                <label class="control-label">Current Time Window</label>
                <input type="text" class="control-input" id="currentTimeRange" value="now-12h" placeholder="e.g., now-12h, now-24h">
                <div class="preset-buttons">
                    <button class="preset-button" onclick="setPresetTimeRange('6h')">6h</button>
                    <button class="preset-button" onclick="setPresetTimeRange('12h')">12h</button>
                    <button class="preset-button" onclick="setPresetTimeRange('24h')">24h</button>
                    <button class="preset-button" onclick="setPresetTimeRange('3d')">3d</button>
                </div>
            </div>
            
            <div class="control-section">
                <label class="control-label">Volume Thresholds</label>
                <div class="config-grid">
                    <div>
                        <label style="font-size: 10px; color: #666;">High Volume (≥)</label>
                        <input type="number" class="control-input" id="highVolumeThreshold" value="1000" min="1">
                    </div>
                    <div>
                        <label style="font-size: 10px; color: #666;">Min Volume (≥)</label>
                        <input type="number" class="control-input" id="mediumVolumeThreshold" value="100" min="1">
                    </div>
                </div>
            </div>
            
            <div class="control-section">
                <button class="control-button" onclick="applyConfiguration()">
                    APPLY CONFIGURATION
                </button>
                <button class="control-button secondary" onclick="exportConfiguration()">
                    EXPORT CONFIG
                </button>
            </div>
            
            <div class="control-section">
                <button class="control-button secondary" onclick="setCookieForRealtime()">
                    SET COOKIE FOR REAL-TIME
                </button>
                <button class="control-button secondary" id="testApiBtn" onclick="testApiConnection()">
                    TEST API CONNECTION
                </button>
            </div>
            
            <div class="control-section">
                <label class="control-label">API Status</label>
                <div style="font-size: 11px; color: #666; line-height: 1.4;">
                    <strong>CORS Proxy:</strong> <span id="corsProxyStatus" style="font-family: monospace;">Checking...</span><br>
                    <strong>Environment:</strong> <span style="font-family: monospace;" id="envStatus">Loading...</span><br>
                    <strong>Cookie:</strong> <span style="font-family: monospace;" id="cookieStatus">Not set</span>
                </div>
            </div>
            
            <div class="control-section" style="font-size: 10px; color: #666; line-height: 1.4;">
                <strong>QUICK START:</strong><br>
                1. Run: python3 cors_proxy.py<br>
                2. Set your Elastic cookie<br>
                3. Click "REFRESH NOW"<br>
                4. Enjoy real-time updates!<br><br>
                
                <strong>NO CORS PROXY?</strong><br>
                • Still works with static refresh<br>
                • Auto-updates every 10 min via GitHub<br>
                • Perfect for production use
            </div>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="main-content">
        <div class="container">
            <div class="header">
                <h1>RAD Traffic Health Monitor</h1>
                <div class="timestamp">
                    Last Updated: {datetime.now().strftime('%a %b %d %H:%M:%S UTC %Y')} | Auto-refresh: 5 minutes
                </div>
            </div>
            
            <div class="content">
                <div class="summary">
                    <div class="card critical">
                        <div class="card-label">Critical</div>
                        <div class="card-number" style="color: #d32f2f;">{critical}</div>
                        <div class="card-label">Traffic drops &gt; 80%</div>
                    </div>
                    <div class="card warning">
                        <div class="card-label">Warning</div>
                        <div class="card-number" style="color: #f57c00;">{warning}</div>
                        <div class="card-label">Traffic drops 50-80%</div>
                    </div>
                    <div class="card normal">
                        <div class="card-label">Normal</div>
                        <div class="card-number" style="color: #388e3c;">{normal}</div>
                        <div class="card-label">Operating normally</div>
                    </div>
                    <div class="card increased">
                        <div class="card-label">Increased</div>
                        <div class="card-number" style="color: #1976d2;">{increased}</div>
                        <div class="card-label">Traffic increased</div>
                    </div>
                </div>
                
                <h2 style="font-size: 16px; margin: 25px 0 15px 0; color: #333; font-weight: bold; text-transform: uppercase;">Detailed Analysis</h2>
                
                <table>
                    <thead>
                        <tr>
                            <th>detail.event.data.traffic.eid</th>
                            <th>Status</th>
                            <th style="text-align: right;">Score</th>
                            <th style="text-align: right;">Current (12h)</th>
                            <th style="text-align: right;">Expected (12h)</th>
                            <th style="text-align: right;">Daily Avg</th>
                            <th>Impact</th>
                        </tr>
                    </thead>
                    <tbody>"""
    
    for item in results:
        score_class = 'negative' if item['score'] < 0 else 'positive'
        score_text = f"{item['score']:+d}%"
        
        diff = item['current'] - item['baseline_12h']
        if diff < -50:
            impact = f'Lost ~{abs(diff):,.0f} impressions'
            impact_class = 'loss'
        elif diff > 50:
            impact = f'Gained ~{diff:,.0f} impressions'
            impact_class = 'gain'
        else:
            impact = 'Normal variance'
            impact_class = ''
        
        html += f"""
                        <tr>
                            <td><a href="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'2025-05-28T16:50:47.243Z',to:now))&_a=(columns:!(),filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,key:detail.event.data.traffic.eid.keyword,negate:!f,params:(query:'{item['event_id']}'),type:phrase),query:(match_phrase:(detail.event.data.traffic.eid.keyword:'{item['event_id']}')))),grid:(columns:(detail.event.data.traffic.eid.keyword:(width:400))),hideChart:!f,index:'traffic-*',interval:auto,query:(language:kuery,query:''),sort:!())" target="_blank" class="event-link">
                                <span class="event-name">{item['event_id']}</span>
                            </a></td>
                            <td><span class="badge {item['status'].lower()}">{item['status']}</span></td>
                            <td class="number"><span class="score {score_class}">{score_text}</span></td>
                            <td class="number">{item['current']:,}</td>
                            <td class="number">{item['baseline_12h']:,}</td>
                            <td class="number">{item['daily_avg']:,}</td>
                            <td><span class="impact {impact_class}">{impact}</span></td>
                        </tr>"""
    
    html += f"""
                    </tbody>
                </table>
                
                <div class="footer">
                    <a href="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/app/lens#/edit/3b33f66b-740a-4068-9a38-a04f9021a7df" target="_blank">
                        VIEW KIBANA DASHBOARD
                    </a>
                    <a href="https://godaddy.slack.com/archives/C06SEETB2BC/p1750094818119089" target="_blank">
                        SLACK THREAD
                    </a>
                    <a href="data/raw_response.json" target="_blank">
                        RAW DATA
                    </a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>"""
    
    print(html)
    
except Exception as e:
    print(f"<h1>Error</h1><pre>Error processing data: {str(e)}</pre>")
    sys.exit(1)
PYTHON_END

echo "Dashboard generated successfully!"