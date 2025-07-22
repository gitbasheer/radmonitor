# EMIL ES|QL Integration Guide

## Overview

EMIL Phase 2 introduces ES|QL (Elasticsearch Query Language) integration, enabling intent-driven, template-based querying directly against Elasticsearch. This transforms EID selection into actionable, real-time monitoring and health insights.

## Architecture

### Components

1. **Query Templates** (`esql/query-templates.ts`)
   - Pre-built ES|QL templates for common monitoring tasks
   - Categories: health, baseline, analytics, performance
   - Parameterized for flexibility

2. **Query Builder** (`query-engine/query-builder.ts`)
   - Translates user intent to ES|QL queries
   - Parameter validation and type checking
   - Template rendering with variable substitution

3. **ES|QL Executor** (`services/esql-executor.ts`)
   - Handles query execution against Elasticsearch
   - Built-in caching and retry logic
   - Mock mode for testing without backend

4. **UI Components**
   - **Query Panel**: Quick action buttons for common queries
   - **Results Viewer**: Display query results in tables/charts
   - Integration with EID Selector

## Usage

### Basic Query Execution

```typescript
import { ESQLExecutor, QueryIntent } from './assets/js/emil/index.js';

// Initialize executor
const executor = new ESQLExecutor({
  esqlEndpoint: '/api/v1/esql/query',
  mockMode: false // Use true for testing
});

// Execute query from intent
const intent: QueryIntent = {
  action: 'health-check',
  eids: ['pandc.vnext.recommendations.view'],
  parameters: {
    time_window: '1h',
    error_threshold: 0.05
  }
};

const result = await executor.executeIntent(intent);
console.log('Health status:', result.data);
```

### Using Templates Directly

```typescript
import { ESQLQueryBuilder } from './assets/js/emil/index.js';

// Build query from template
const query = ESQLQueryBuilder.buildFromTemplate('healthCheck', {
  eids: ['pandc.vnext.recommendations.view', 'pandc.vnext.discovery.search'],
  time_window: '6h',
  critical_error_threshold: 0.1,
  warning_error_threshold: 0.05
});

console.log('Generated ES|QL:', query);
// Execute with executor
const result = await executor.executeQuery(query);
```

### Integration with EID Selector

```typescript
import { initializeEMIL, ESQLExecutor, QueryPanel } from './assets/js/emil/index.js';

// Initialize EMIL with ES|QL support
const { registry, selector } = await initializeEMIL({
  container: document.getElementById('eid-selector'),
  mockData: false
});

// Create executor
const executor = new ESQLExecutor({ mockMode: false });

// Create query panel
const queryPanel = new QueryPanel({
  container: document.getElementById('query-panel'),
  executor
});

// Wire up selection
selector.onSelectionChange = (eids) => {
  queryPanel.updateEIDs(eids);
};
```

## Available Templates

### 1. Health Check
Checks current health status of selected EIDs.

**Parameters:**
- `time_window`: Analysis window (default: '1h')
- `critical_error_threshold`: Error rate for critical status (default: 0.1)
- `warning_error_threshold`: Error rate for warning (default: 0.05)
- `low_traffic_threshold`: Minimum events (default: 100)
- `latency_threshold`: Max latency in ms (default: 1000)

**Returns:** Health status, score, metrics per EID

### 2. Baseline Comparison
Compares current traffic against historical baseline.

**Parameters:**
- `baseline_start/end`: Baseline period dates
- `current_window`: Current comparison window (default: '1h')
- `traffic_drop_threshold`: % drop to alert (default: 50)
- `traffic_spike_threshold`: % increase to alert (default: 200)

**Returns:** Traffic changes, status alerts

### 3. Trend Analysis
Analyzes traffic trends over time buckets.

**Parameters:**
- `time_range`: Total range to analyze (default: '24h')
- `bucket_size`: Aggregation bucket (default: '1h')

**Returns:** Time series data for visualization

### 4. Performance Metrics
Detailed performance analysis.

**Parameters:**
- `time_window`: Analysis window (default: '1h')
- `timeout_threshold`: Timeout latency (default: 5000ms)
- `critical_latency`: Critical threshold (default: 3000ms)

**Returns:** Latency percentiles, error rates, scores

## Creating Custom Templates

```typescript
import { QueryTemplate } from './assets/js/emil/esql/template-types.js';

const customTemplate: QueryTemplate = {
  id: 'custom-analysis',
  name: 'Custom EID Analysis',
  description: 'My custom analysis template',
  category: 'custom',
  template: `
FROM logs-{{index}}
| WHERE eid IN [{{eids}}]
  AND @timestamp > NOW() - INTERVAL {{time_window}}
| STATS
    total = COUNT(*),
    unique_users = COUNT_DISTINCT(user_id)
  BY eid
| SORT total DESC`,
  parameters: [
    {
      name: 'index',
      type: 'string',
      required: false,
      default: 'traffic-*'
    },
    {
      name: 'eids',
      type: 'array',
      required: true
    },
    {
      name: 'time_window',
      type: 'interval',
      required: false,
      default: '1h'
    }
  ],
  resultType: 'table',
  cacheable: true,
  cacheSeconds: 300
};

// Add to templates
queryTemplates['customAnalysis'] = customTemplate;
```

## Backend Integration

### Real Backend Mode

```typescript
const executor = new ESQLExecutor({
  esqlEndpoint: '/api/v1/esql/query',
  apiKey: 'your-api-key', // Optional
  timeout: 30000,
  maxRetries: 3,
  mockMode: false
});
```

### Mock Mode (Testing)

```typescript
const executor = new ESQLExecutor({
  mockMode: true // Returns realistic mock data
});
```

### Expected Backend Endpoint

The backend should accept POST requests:

```typescript
POST /api/v1/esql/query
Content-Type: application/json

{
  "query": "FROM logs-* | WHERE eid == \"pandc.vnext.recommendations.view\" | STATS COUNT(*)"
}

// Response
{
  "rows": [...],
  "total": { "value": 1234 },
  "took": 125,
  "timed_out": false
}
```

## Performance Considerations

### Caching
- Results cached based on query hash
- Default cache TTL: 60-300 seconds per template
- Manual cache clearing: `executor.clearCache()`

### Query Optimization
- Use appropriate time windows
- Limit EID selections for faster queries
- Leverage template caching

### Monitoring
```typescript
// Get cache statistics
const stats = executor.getCacheStats();
console.log(`Cache size: ${stats.size}, Active requests: ${stats.requests}`);
```

## Error Handling

```typescript
try {
  const result = await executor.executeIntent(intent);
  
  if (result.error) {
    console.error('Query error:', result.error);
    // Handle error
  } else {
    // Process results
  }
} catch (error) {
  console.error('Execution failed:', error);
}
```

## Demo Pages

1. **Basic Demo**: `/emil-demo.html` - EID selection and registry
2. **ES|QL Demo**: `/emil-esql-demo.html` - Full query flow demonstration

## Next Steps

1. **Production Backend Integration**
   - Implement ES|QL endpoint in your backend
   - Add authentication/authorization
   - Configure CORS if needed

2. **Custom Templates**
   - Create domain-specific templates
   - Add visualization hints to templates
   - Build template library

3. **Advanced Features**
   - Query history and favorites
   - Scheduled queries/alerts
   - Export to Grafana dashboards

## Troubleshooting

### Query Fails
- Check EID format and existence
- Verify time ranges are valid
- Ensure backend is accessible
- Check browser console for errors

### No Results
- Verify data exists for time range
- Check EID spelling/format
- Try broader time window
- Use mock mode to test

### Performance Issues
- Reduce number of EIDs
- Use shorter time windows
- Enable caching
- Check network latency