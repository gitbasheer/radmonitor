# FastAPI Integration - Complete Guide

## Overview

The FastAPI integration is now complete and provides a seamless way to use either the legacy API or the new FastAPI server. The system automatically detects which backend is available and switches accordingly.

## Architecture

```
Dashboard → UnifiedAPI → FastAPIIntegration → FastAPIClient → FastAPI Server
                      ↘                     ↗
                        Legacy Mode → ApiClient → CORS Proxy
```

## Quick Start

### 1. Start the FastAPI Server

```bash
# Terminal 1 - Start FastAPI server
./scripts/runners/run_fastapi_dev.sh

# Or manually:
python3 bin/dev_server_fastapi.py
```

The server will:
- Start on http://localhost:8000
- Automatically launch CORS proxy on port 8889
- Provide WebSocket support at ws://localhost:8000/ws

### 2. Open the Dashboard

Navigate to http://localhost:8000 (FastAPI serves the dashboard)

### 3. Enable FastAPI Mode

The system will auto-detect the FastAPI server. To manually control:

```javascript
// In browser console

// Check current status
FastAPIIntegration.getStatus()

// Enable FastAPI mode (persists across reloads)
FastAPIIntegration.enable()

// Disable and use legacy mode
FastAPIIntegration.disable()

// Toggle between modes
FastAPIIntegration.toggle()
```

## Features

### Automatic Mode Detection
- On startup, the system checks if FastAPI server is available
- Falls back to legacy mode if server is not running
- No code changes required

### Unified API Interface
- Same API methods work in both modes
- `unifiedAPI.fetchTrafficData(config)`
- `unifiedAPI.updateConfiguration(config)`
- `unifiedAPI.executeQuery(query)`
- `unifiedAPI.checkHealth()`

### WebSocket Real-time Updates
When in FastAPI mode:
- Configuration changes are synchronized in real-time
- Dashboard stats update automatically
- Performance metrics are tracked

### Performance Monitoring
- Query execution times tracked
- Cache hit rates monitored
- Slow query warnings

## Code Integration

### Basic Usage

```javascript
// The dashboard automatically uses the unified API
import { unifiedAPI } from './api-interface.js';

// Initialize (happens automatically in dashboard)
await unifiedAPI.initialize();

// Fetch data (works the same in both modes)
const config = {
    baselineStart: '2025-06-01',
    baselineEnd: '2025-06-09',
    currentTimeRange: 'now-12h'
};
const result = await unifiedAPI.fetchTrafficData(config);
```

### WebSocket Events

The FastAPI integration emits events for real-time updates:

```javascript
// Listen for configuration updates
window.addEventListener('fastapi:config', (event) => {
    console.log('Config updated:', event.detail);
});

// Listen for stats updates
window.addEventListener('fastapi:stats', (event) => {
    console.log('Stats updated:', event.detail);
});

// Listen for data updates
window.addEventListener('fastapi:data', (event) => {
    console.log('Data updated:', event.detail);
});
```

## Configuration

### Environment Variables

```bash
# Optional: Override default URLs
export FASTAPI_URL=http://localhost:8000
export FASTAPI_WS_URL=ws://localhost:8000/ws
```

### Feature Flags

```javascript
// Configure features
FastAPIIntegration.config.features = {
    websocket: true,          // Enable WebSocket connections
    performanceMetrics: true, // Track performance
    serverSideValidation: true, // Use server validation
    batchOperations: true     // Enable batch operations
};
```

## Testing

### Run Integration Tests

```bash
# Test FastAPI integration
npm test test_fastapi_integration.js

# Test all components
npm test
```

### Manual Testing

1. Start FastAPI server
2. Open dashboard
3. Check console for: `API Mode: fastapi`
4. Test refresh functionality
5. Monitor WebSocket messages in Network tab

## Troubleshooting

### FastAPI Not Detected

```javascript
// Check server health
const response = await fetch('http://localhost:8000/health');
console.log(await response.json());

// Force enable
localStorage.setItem('fastapi.enabled', 'true');
location.reload();
```

### WebSocket Connection Issues

```javascript
// Check WebSocket state
FastAPIIntegration.getStatus().websocketConnected

// Manually reconnect
if (window.FastAPIClient) {
    await FastAPIClient.connect();
}
```

### Authentication Issues

```javascript
// Check if cookie is set
const auth = await unifiedAPI.getAuthenticationDetails();
console.log('Auth valid:', auth.valid);

// Set cookie if needed
if (!auth.valid) {
    await ApiClient.promptForCookie();
}
```

## API Endpoints (FastAPI)

- `GET /` - Dashboard HTML
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration
- `GET /api/stats` - Get dashboard statistics
- `POST /api/refresh` - Refresh dashboard data
- `POST /api/fetch-kibana-data` - Query Elasticsearch
- `GET /health` - Health check
- `WS /ws` - WebSocket endpoint

## Benefits

1. **Zero Breaking Changes** - Existing code continues to work
2. **Automatic Failover** - Falls back to legacy if FastAPI unavailable
3. **Real-time Updates** - WebSocket support for live data
4. **Better Performance** - Caching and optimized queries
5. **Type Safety** - Pydantic models validate all data
6. **Modern Architecture** - Clean separation of concerns

## Next Steps

1. Deploy FastAPI server to production
2. Add more real-time features
3. Implement batch operations
4. Add user authentication
5. Create admin dashboard

## Production Enhancements

The system now includes production-ready enhancements:

1. **Exponential Backoff** - WebSocket reconnection with jitter
2. **Rate Limiting** - Protects against DoS attacks (10/min for queries)
3. **Circuit Breaker** - Prevents cascade failures (trips after 5 failures)
4. **Structured Logging** - JSON logs for better observability

See [PRODUCTION_ENHANCEMENTS.md](./PRODUCTION_ENHANCEMENTS.md) for details.

## Summary

The FastAPI integration provides a modern, performant backend while maintaining full compatibility with the existing system. Users can switch between modes instantly, and the dashboard works identically in both modes. With production enhancements, the system is ready for deployment at scale. 