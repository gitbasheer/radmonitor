# Enhanced CORS Proxy Guide

This guide explains how to use the enhanced CORS proxy with FastAPI and Pydantic v2, which provides typed endpoints alongside the existing raw proxy functionality.

## Overview

The enhanced proxy maintains 100% backward compatibility while adding:
- Typed request/response models with Pydantic v2
- Specific endpoints for common query patterns
- Automatic API documentation via FastAPI
- Better error handling and validation

## Getting Started

### 1. Install Dependencies

```bash
pip install -r requirements-enhanced.txt
```

### 2. Run the Enhanced Proxy

```bash
# Option 1: Use the convenience script
chmod +x run_enhanced_cors.sh
./run_enhanced_cors.sh

# Option 2: Run directly
python3 cors_proxy_enhanced.py
```

### 3. Access API Documentation

Visit http://localhost:8889/docs for interactive API documentation.

## Available Endpoints

### Raw Proxy (Backward Compatible)

```
POST /kibana-proxy
```

Maintains existing functionality for raw Elasticsearch queries.

### Typed Endpoints

#### Traffic Analysis
```
POST /api/traffic-analysis
```

Request:
```json
{
  "baseline_start": "2025-01-10T00:00:00Z",
  "baseline_end": "2025-01-18T00:00:00Z",
  "current_time_range": "12h",
  "event_pattern": "pandc.vnext.recommendations.feed.feed*",
  "host": "dashboard.godaddy.com"
}
```

Supported time ranges for `current_time_range`:
- Standard: `"12h"`, `"24h"`, `"48h"`, etc.
- Custom: `"-8h-24h"` (from 24h ago to 8h ago)
- Inspection: `"inspection_time"` (specific 16-hour inspection window)

Response:
```json
{
  "events": [
    {
      "event_id": "pandc.vnext.recommendations.feed.feed.load",
      "display_name": "feed.load",
      "current_count": 1234,
      "baseline_count": 10000,
      "baseline_period": 625.0,
      "daily_avg": 1250.0,
      "score": 97,
      "status": "INCREASED"
    }
  ],
  "metadata": {
    "total_events": 15,
    "query_time": 45,
    "baseline_days": 8,
    "current_hours": 12
  }
}
```

#### Time Series Analysis
```
POST /api/time-series
```

Request:
```json
{
  "time_range": {
    "start": "2025-01-18T00:00:00Z",
    "end": "2025-01-19T00:00:00Z"
  },
  "interval": "1h",
  "group_by": "detail.event.data.traffic.eid.keyword",
  "filters": {
    "detail.global.page.host": "dashboard.godaddy.com"
  }
}
```

#### Error Analysis
```
POST /api/error-analysis
```

Request:
```json
{
  "time_range": {
    "start": "2025-01-18T00:00:00Z",
    "end": "2025-01-19T00:00:00Z"
  },
  "error_types": true,
  "status_codes": true
}
```

#### Health Check
```
GET /health
```

## Frontend Usage

### Using the Enhanced API Client

```javascript
// Configure the client
EnhancedApiClient.configure({
    baseUrl: 'http://localhost:8889'
});

// Set authentication
EnhancedApiClient.setElasticCookie('your-cookie-value');

// Use typed endpoints
const result = await EnhancedApiClient.getCurrentTrafficData('12h');
if (result.success) {
    console.log('Traffic events:', result.data.events);
} else {
    console.error('Error:', result.error);
}

// Or use convenience methods
const timeSeries = await EnhancedApiClient.getTimeSeries(24, '1h');
const errors = await EnhancedApiClient.getErrorAnalysis(24);

// Raw queries still work
const rawResult = await EnhancedApiClient.executeQuery({
    size: 0,
    query: { match_all: {} },
    aggs: { /* your aggregations */ }
});
```

### TypeScript Support

Import the type definitions:

```typescript
import type {
    TrafficQueryRequest,
    TrafficQueryResponse,
    TrafficEvent,
    ApiResult
} from './assets/js/api-types';

// Type-safe API calls
const request: TrafficQueryRequest = {
    baseline_start: new Date().toISOString(),
    baseline_end: new Date().toISOString(),
    current_time_range: '12h'
};

const result: ApiResult<TrafficQueryResponse> =
    await EnhancedApiClient.trafficAnalysis(request);
```

## Migration Strategy

### Gradual Migration

1. **Phase 1**: Keep using raw queries through `/kibana-proxy`
2. **Phase 2**: Start using typed endpoints for new features
3. **Phase 3**: Gradually migrate existing queries to typed endpoints
4. **Phase 4**: Deprecate raw queries for standard use cases

### Migration Example

Before (raw query):
```javascript
const query = {
    aggs: {
        events: {
            terms: { field: "detail.event.data.traffic.eid.keyword" },
            aggs: {
                baseline: { /* complex filter */ },
                current: { /* complex filter */ }
            }
        }
    }
};
const result = await ApiClient.executeQuery(query);
```

After (typed endpoint):
```javascript
const result = await EnhancedApiClient.getCurrentTrafficData('12h');
// Simpler, type-safe, and validated
```

## Benefits

1. **Type Safety**: Catch errors at development time
2. **Validation**: Pydantic validates all requests/responses
3. **Documentation**: Auto-generated API docs
4. **Performance**: Optimized queries for specific use cases
5. **Flexibility**: Raw proxy still available when needed

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill existing process on port 8889
   lsof -ti:8889 | xargs kill -9
   ```

2. **Module Import Errors**
   ```bash
   # Ensure virtual environment is activated
   source venv/bin/activate
   pip install -r requirements-enhanced.txt
   ```

3. **CORS Issues**
   - The enhanced proxy includes CORS middleware
   - All origins are allowed by default (configure for production)

## Next Steps

1. Test the typed endpoints with your Zustand store
2. Update frontend components to use `EnhancedApiClient`
3. Monitor performance improvements
4. Add custom endpoints for your specific use cases

For questions or issues, check the API documentation at http://localhost:8889/docs
