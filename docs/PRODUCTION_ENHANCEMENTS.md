# Production Enhancements Guide

This document describes the production-ready enhancements implemented for the RAD Monitor system.

## Overview

The following high-impact, low-effort improvements have been implemented to make the system production-ready:

1. **Exponential Backoff with Jitter** - WebSocket reconnection strategy
2. **Rate Limiting** - Prevents DoS attacks  
3. **Circuit Breaker** - Prevents cascade failures
4. **Structured Logging** - Enables debugging at scale

## 1. Exponential Backoff for WebSocket Reconnection

### Implementation

Located in `assets/js/fastapi-integration.js`:

```javascript
class ExponentialBackoffReconnect {
    constructor(baseDelay = 1000, maxDelay = 30000, factor = 1.5) {
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
        this.factor = factor;
        this.attempt = 0;
    }
    
    nextDelay() {
        const exponentialDelay = Math.min(
            this.baseDelay * Math.pow(this.factor, this.attempt++),
            this.maxDelay
        );
        // Add jitter (±20%) to prevent thundering herd
        const jitter = exponentialDelay * 0.2 * Math.random();
        return Math.round(exponentialDelay + jitter);
    }
    
    reset() {
        this.attempt = 0;
    }
}
```

### Benefits

- Prevents thundering herd problem when multiple clients reconnect
- Reduces server load during outages
- Automatically adapts retry delays based on failure count
- Maximum delay capped at 30 seconds

### Usage

The WebSocket client automatically uses exponential backoff when reconnecting:

```
🔄 Retrying WebSocket connection (1/10) in 1200ms...
🔄 Retrying WebSocket connection (2/10) in 1875ms...
🔄 Retrying WebSocket connection (3/10) in 2943ms...
```

## 2. Rate Limiting with SlowAPI

### Implementation

Rate limiting is configured in `bin/dev_server_fastapi.py`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per minute", "1000 per hour"]
)

# Applied to endpoints:
@app.post("/api/fetch-kibana-data")
@limiter.limit("10 per minute")  # Expensive operation
async def fetch_kibana_data(...):
    ...

@app.post("/api/config")
@limiter.limit("30 per minute")
async def update_config(...):
    ...

@app.post("/api/refresh")
@limiter.limit("20 per minute")
async def refresh_dashboard(...):
    ...
```

### Rate Limits

| Endpoint | Rate Limit | Reason |
|----------|------------|---------|
| `/api/fetch-kibana-data` | 10/min | Expensive Elasticsearch queries |
| `/api/config` | 30/min | Configuration updates |
| `/api/refresh` | 20/min | Dashboard refresh operations |
| Default (all other) | 200/min, 1000/hour | General protection |

### Error Response

When rate limit is exceeded:
```json
{
    "error": "Rate limit exceeded: 10 per 1 minute",
    "detail": "Too many requests"
}
```

## 3. Circuit Breaker for Elasticsearch

### Implementation

Using `pybreaker` to protect Elasticsearch calls:

```python
from pybreaker import CircuitBreaker

es_circuit_breaker = CircuitBreaker(
    fail_max=5,              # Trip after 5 failures
    reset_timeout=60,        # Try again after 60 seconds
    name='ElasticsearchBreaker'
)

@es_circuit_breaker
async def execute_es_query():
    async with httpx.AsyncClient(...) as client:
        return await client.post(...)
```

### Circuit States

1. **CLOSED** - Normal operation, requests pass through
2. **OPEN** - After 5 failures, all requests fail immediately for 60 seconds
3. **HALF_OPEN** - After timeout, one request is allowed to test recovery

### Benefits

- Prevents cascade failures when Elasticsearch is down
- Gives Elasticsearch time to recover
- Fast failure response when circuit is open
- Automatic recovery detection

### Error Response

When circuit is open:
```json
{
    "detail": "Service temporarily unavailable due to circuit breaker",
    "status_code": 503
}
```

## 4. Structured Logging

### Implementation

Using `structlog` for JSON-formatted logs:

```python
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()
```

### Log Examples

Query execution:
```json
{
    "event": "query_execute_start",
    "query_id": "kibana_a1b2c3d4_1234567890",
    "cache_key": "a1b2c3d4e5f6",
    "query_size": 1024,
    "client_ip": "192.168.1.100",
    "timestamp": "2024-01-15T10:30:45.123Z",
    "level": "info"
}
```

Performance warning:
```json
{
    "event": "performance_critical",
    "query_id": "kibana_a1b2c3d4_1234567890",
    "duration_ms": 5234,
    "threshold_ms": 5000,
    "severity": "critical",
    "timestamp": "2024-01-15T10:30:50.357Z",
    "level": "warning"
}
```

Circuit breaker:
```json
{
    "event": "circuit_breaker_open",
    "query_id": "kibana_a1b2c3d4_1234567890",
    "error": "Connection timeout",
    "breaker_state": "open",
    "timestamp": "2024-01-15T10:31:00.000Z",
    "level": "error"
}
```

### Log Events

| Event | Level | Description |
|-------|-------|-------------|
| `query_execute_start` | info | Query execution started |
| `query_cache_hit` | info | Query served from cache |
| `query_execute_success` | info | Query completed successfully |
| `query_execute_error` | error | Query failed with HTTP error |
| `elasticsearch_error` | error | Elasticsearch returned error |
| `circuit_breaker_open` | error | Circuit breaker tripped |
| `performance_slow` | warning | Query took >3 seconds |
| `performance_critical` | warning | Query took >5 seconds |
| `cors_proxy_started` | info | CORS proxy process started |
| `shutdown_signal_received` | info | Shutdown initiated |

## Configuration

### Requirements

Add to `requirements-enhanced.txt`:
```
slowapi>=0.1.9
pybreaker>=1.0.1
python-json-logger>=2.0.7
structlog>=24.1.0
```

### Environment Variables

No additional environment variables required. All configurations use sensible defaults.

## Monitoring & Observability

### Metrics to Track

1. **Rate Limiting**
   - Requests per minute by endpoint
   - Rate limit violations
   - Client IPs hitting limits

2. **Circuit Breaker**
   - Circuit state changes
   - Failure count
   - Recovery success rate

3. **Performance**
   - Query execution times
   - Cache hit rates
   - Slow query frequency

4. **WebSocket**
   - Reconnection attempts
   - Connection duration
   - Backoff delay distribution

### Log Aggregation

Structured JSON logs are ideal for:
- **Elasticsearch/Kibana** - Native JSON support
- **CloudWatch Logs Insights** - JSON query syntax
- **Datadog** - Automatic parsing
- **Splunk** - Field extraction

Example query for slow queries:
```
event="performance_*" AND duration_ms > 3000
| stats count by severity
```

## Testing

### Manual Testing

1. **Rate Limiting**
   
   **Quick Test:**
   ```bash
   # Test the dedicated rate limit endpoint (5 req/min limit)
   python3 tests/debug_rate_limit.py
   ```
   
   **Full Test Suite:**
   ```bash
   # Test all endpoints with different limits
   python3 tests/test_rate_limit_fixed.py
   ```
   
   **Manual curl test:**
   ```bash
   # Make 10 rapid requests to test endpoint
   for i in {1..10}; do
     curl -X GET http://localhost:8000/api/test-rate-limit
     echo
   done
   ```

2. **Circuit Breaker**
   - Shut down Elasticsearch/Kibana
   - Make 6 requests to trigger circuit
   - Verify immediate failures
   - Wait 60 seconds for recovery

3. **WebSocket Backoff**
   - Kill FastAPI server while connected
   - Observe exponential delays in console
   - Restart server to verify reconnection

### Load Testing

Using Apache Bench:
```bash
# Test rate limiting effectiveness
ab -n 1000 -c 10 -p query.json \
   -H "Content-Type: application/json" \
   http://localhost:8000/api/fetch-kibana-data
```

## Production Deployment

### Recommendations

1. **Rate Limits** - Adjust based on actual usage patterns
2. **Circuit Breaker** - Tune fail_max and reset_timeout 
3. **Logging** - Ship logs to centralized system
4. **Monitoring** - Set up alerts for circuit trips and rate limit violations

### Security Considerations

1. Use HTTPS in production (not HTTP)
2. Implement proper authentication (JWT tokens)
3. Use WSS for WebSocket (not WS)
4. Consider IP-based rate limiting for stricter control

## Summary

These production enhancements provide:

- **Resilience** - Circuit breaker prevents cascade failures
- **Security** - Rate limiting prevents abuse
- **Reliability** - Exponential backoff handles network issues
- **Observability** - Structured logging enables debugging

The system is now ready for production deployment with proper safeguards against common failure modes. 