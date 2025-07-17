# Testing Production Enhancements

This directory contains test scripts to verify the production enhancements.

## Quick Test Guide

### 1. Start the FastAPI Server
```bash
python3 bin/dev_server_fastapi.py
```

You should see the structured logs output when the server starts.

### 2. Test Rate Limiting

Run the simple rate limit test:
```bash
python3 tests/test_simple_rate_limit.py
```

This makes 35 rapid requests to the `/api/config` endpoint (limit: 30/min).
You should see some requests get rate limited (429 status).

### 3. Test Structured Logging

Run the logging demo:
```bash
python3 tests/demo_structured_logs.py
```

Watch the server terminal - you'll see JSON-formatted logs like:
```json
{"event": "cors_proxy_started", "port": 8889, "pid": 12345, "timestamp": "2024-01-20T10:30:45.123Z", "level": "info"}
{"event": "query_execute_start", "query_id": "kibana_a1b2c3d4_1234567890", "cache_key": "...", "timestamp": "...", "level": "info"}
```

### 4. Test WebSocket Exponential Backoff

Open the HTML demo in a browser:
```bash
# Serve it through the FastAPI server
open http://localhost:8000/tests/demo_websocket_backoff.html
```

1. Click "Start WebSocket Connection"
2. Stop the FastAPI server (Ctrl+C)
3. Watch the browser console for exponential backoff delays:
   - 1st retry: ~1200ms
   - 2nd retry: ~1875ms
   - 3rd retry: ~2943ms
   - etc...

### 5. Test Circuit Breaker

The circuit breaker protects against Elasticsearch failures:
1. Stop Elasticsearch/Kibana (or block network access)
2. Make 6 requests to trigger the circuit
3. Subsequent requests will fail immediately with 503
4. After 60 seconds, it will try again

## Understanding the Results

### Rate Limiting
- Protects against DoS attacks
- Each endpoint has different limits
- Returns 429 (Too Many Requests) when exceeded

### Structured Logging
- All logs are JSON formatted
- Easy to parse and aggregate
- Includes context like query IDs, durations, etc.

### Exponential Backoff
- Prevents thundering herd on reconnection
- Delays increase exponentially with jitter
- Caps at 30 seconds maximum

### Circuit Breaker
- Prevents cascade failures
- "Opens" after 5 consecutive failures
- "Closes" after 60-second cooldown

## Troubleshooting

**Rate limiting not working?**
- Make sure you're hitting the same endpoint rapidly
- Check that `slowapi` is installed: `pip install slowapi`

**No JSON logs?**
- The structured logs are sent to stdout
- Uvicorn access logs remain in standard format
- Look for lines starting with `{"`

**WebSocket not reconnecting?**
- Enable FastAPI mode first: `FastAPIIntegration.enable()`
- Check browser console for errors
- Make sure the server was running initially

**Circuit breaker not tripping?**
- It only trips on network/connection errors
- 4XX errors (like 401) don't count as failures
- Must be 5 consecutive failures 