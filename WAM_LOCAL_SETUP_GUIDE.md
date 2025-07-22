# WAM General ET Monitoring - Local Setup Guide

## 🚀 Quick Start

```bash
# Start everything
./start-wam.sh

# Stop everything
./stop-wam.sh
```

## 📋 What You Get

After running `./start-wam.sh`, you'll have:

1. **Web Server** (port 8000) - Serves the dashboard and test pages
2. **Elasticsearch Proxy** (port 8001) - Handles authenticated requests to Kibana/ES
3. **Health Check** - http://localhost:8001/health

## 🔧 Testing WAM Monitoring

### Option 1: Guided Test Page (Recommended)
1. Open http://localhost:8000/wam_test_guided.html
2. Follow the step-by-step instructions
3. Get your Kibana cookie from browser DevTools
4. Test connection, then run analysis

### Option 2: Main Dashboard
1. Open http://localhost:8000
2. Scroll down to the orange "WAM General ET Monitoring" section
3. Configure time windows and run analysis

## 🔑 Authentication

The system requires a valid Kibana session cookie:

1. **Get Cookie**:
   - Open Kibana in browser
   - Press F12 → Network tab → Refresh
   - Find any request → Headers → Cookie
   - Copy the `sid=Fe26.2**...` value

2. **Cookie Validation**:
   - Format: Must start with `Fe26.2**`
   - Expiry: Typically 24 hours
   - Storage: Saved in localStorage for convenience

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser       │────▶│  Local Proxy     │────▶│ Elasticsearch   │
│  localhost:8000 │     │  localhost:8001  │     │    (Kibana)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         │                       ├── Auth validation
         ├── WAM UI              ├── CSRF protection
         ├── HLL++ display       ├── Error handling
         └── Test pages          └── Logging
```

## 📁 Project Structure

```
rad-monitor/
├── server/
│   └── elasticsearch-proxy.mjs   # Production proxy server
├── tests/
│   └── proxy-auth.test.js       # Auth validation tests
├── start-wam.sh                 # Start all services
├── stop-wam.sh                  # Stop all services
├── wam_test_guided.html         # Guided test interface
└── index.html                   # Main dashboard with WAM section
```

## 🔍 Key Features

### HyperLogLog++ Cardinality
- **Memory**: 160KB for unlimited unique visitors
- **Accuracy**: 99.5% (±0.5% standard error)
- **Performance**: O(1) complexity
- **Precision**: 40,000 threshold

### Query Performance
- Parallel baseline/recent queries
- Sub-2 second response time
- Automatic query cancellation
- Memory-efficient aggregations

### Security
- Cookie validation
- CSRF protection (kbn-xsrf header)
- CORS support
- No external dependencies

## 🐛 Troubleshooting

### "Authentication failed - cookie may have expired"
- Get a fresh cookie from Kibana
- Ensure cookie format is correct: `sid=Fe26.2**...`

### "Request must contain a kbn-xsrf header"
- The proxy automatically adds this header
- If seeing this error, ensure using the local proxy

### Connection refused on port 8001
- Run `./start-wam.sh` to start the proxy
- Check `proxy.log` for errors

### No data showing
- Verify time ranges (6 days ago vs last hour)
- Check EID pattern matches your data
- Ensure `traffic-*` indices exist

##  Understanding Results

### Status Levels
- 🔴 **CRITICAL**: Traffic drop >80%
- 🟡 **WARNING**: Traffic drop 50-80%
- 🟢 **NORMAL**: Traffic within expected range
- 🔵 **INCREASED**: Traffic up >20%

### Metrics Shown
- **Event Count**: Total events in time window
- **Unique Visitors**: HLL++ estimated unique users
- **Change %**: Percentage difference from baseline
- **Top EIDs**: Most active event identifiers

## 🔧 Configuration

### Environment Variables
```bash
# Proxy configuration
export PROXY_PORT=8001
export ES_HOST=your-es-host.com
export CORS_ORIGIN=http://localhost:8000
export LOG_LEVEL=debug  # info, debug, error
```

### Custom EID Patterns
Edit `wam_test_guided.html` or use the main dashboard to change:
- Default: `pandc.vnext.recommendations.metricsevolved*`
- Custom: Any wildcard pattern your data uses

## 📝 Logs

```bash
# View proxy logs
tail -f proxy.log

# Enable debug logging
LOG_LEVEL=debug ./start-wam.sh
```

## 🧪 Running Tests

```bash
# Run auth validation tests
npm test -- tests/proxy-auth.test.js
```

---

**Note**: This is a local development setup. For production, use proper authentication, HTTPS, and deploy the proxy behind a secure gateway.