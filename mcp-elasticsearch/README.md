# VH RAD Elasticsearch MCP

> **⚠️ DEPRECATION NOTICE**: This MCP has been split into more focused modules for better separation of concerns:
> - **RAD Monitor MCP** (`mcp-rad-monitor`) - For real-time monitoring and alerting
> - **RAD Analytics MCP** (`mcp-rad-analytics`) - For analysis and insights
> - **Query Engine MCP** (`mcp-query-engine`) - For direct Elasticsearch queries
>
> Please use the new MCPs for new implementations. This MCP is maintained for backward compatibility only.

A Model Context Protocol server for Elasticsearch operations tailored to the VH RAD Traffic Monitor system. This MCP provides high-level tools for querying traffic indices, monitoring RAD events, and analyzing traffic patterns.

## Features

- **Query Execution** - Execute Elasticsearch queries with built-in index patterns
- **RAD Traffic Monitoring** - Monitor traffic drops and alert on thresholds
- **Traffic Analysis** - Analyze drops and identify root causes
- **Index Health** - Check cluster and index health
- **Formula Integration** - Convert formulas to Elasticsearch queries
- **Event Search** - Search RAD events with multiple filters
- **Connection Testing** - Validate Kibana proxy connectivity

## Installation

```bash
cd mcp-elasticsearch
npm install
```

## Usage with Cursor

### 1. Add to Cursor Settings

Open Cursor settings and add:

```json
{
  "mcpServers": {
    "vh-rad-elasticsearch": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-elasticsearch/index.js"]
    }
  }
}
```

### 2. Available Commands

Once configured, you can ask Cursor:

#### Monitor Traffic
- **"Check if RAD traffic has dropped"**
  - Compares current traffic to baseline
  - Returns status: CRITICAL, WARNING, NORMAL, or INCREASED

- **"Analyze the traffic drop in the last hour"**
  - Provides detailed analysis with possible causes
  - Shows error rates and affected users

#### Execute Queries
- **"Search for feed recommendation events"**
  - Returns RAD events matching patterns
  - Includes faceted results

- **"Show me traffic aggregated by hour"**
  - Executes time-based aggregations
  - Returns bucketed results

#### Health Checks
- **"Check Elasticsearch index health"**
  - Shows index statistics and cluster status
  - Identifies any issues

- **"Test Kibana connection"**
  - Validates proxy connectivity
  - Checks authentication status

## Tool Reference

### `monitorRADTraffic`
Monitor RAD traffic and detect drops.

```javascript
{
  radType: "checkout_flow",      // Optional: specific RAD type
  compareWith: "1d",             // Compare period (1h, 1d, 1w)
  threshold: 0.8                 // Alert if drops below 80%
}
```

### `analyzeTrafficDrop`
Analyze traffic drops to find root causes.

```javascript
{
  timeWindow: "1h",              // Analysis window
  granularity: "5m"              // Time bucket size
}
```

### `executeQuery`
Execute custom Elasticsearch queries.

```javascript
{
  query: "event_id:*feed*",      // Query string or DSL
  indexPattern: "traffic-*",      // Index pattern
  timeRange: {                   // Time range
    from: "now-1h",
    to: "now"
  },
  size: 10,                      // Results to return
  aggs: { ... }                  // Aggregations
}
```

### `buildFormulaQuery`
Convert formulas to Elasticsearch queries.

```javascript
{
  formula: "count() / count(shift='1d')",
  radType: "api_gateway",
  timeRange: { from: "now-24h", to: "now" }
}
```

### `searchRADEvents`
Search for specific events with filters.

```javascript
{
  eventPattern: "*feed.click",
  userID: "user123",
  statusCode: 200,
  errorType: null,
  limit: 20
}
```

### `getIndexHealth`
Check index and cluster health.

```javascript
{
  indexPattern: "traffic-*"      // Defaults to traffic-*
}
```

### `testKibanaConnection`
Test Kibana/Elasticsearch connectivity.

```javascript
{
  proxyUrl: "https://proxy.url",
  cookie: "sid=Fe26.2**..."      // Optional Kibana cookie
}
```

## Examples

### Basic Monitoring

```javascript
// Monitor for traffic drops
const result = await monitorRADTraffic({
  compareWith: "1d",
  threshold: 0.5  // Alert if 50% drop
});

// Output:
{
  "status": "CRITICAL",
  "dropPercentage": "65.23",
  "recommendation": "Immediate investigation required"
}
```

### Traffic Analysis

```javascript
// Analyze recent drop
const analysis = await analyzeTrafficDrop({
  timeWindow: "2h",
  granularity: "10m"
});

// Output:
{
  "dropDetected": true,
  "severity": "HIGH",
  "possibleCauses": [
    {
      "cause": "Upstream service failure",
      "confidence": 0.85
    }
  ]
}
```

### Custom Queries

```javascript
// Time-based aggregation
const query = await executeQuery({
  query: "event_id:*recommendations*",
  aggs: {
    over_time: {
      date_histogram: {
        field: "@timestamp",
        interval: "1h"
      }
    }
  }
});
```

## Integration with RAD Monitor

This MCP is specifically designed for the RAD Traffic Monitor system:

1. **Index Pattern**: Uses `traffic-*` indices by default
2. **Event Pattern**: Monitors `pandc.vnext.recommendations.feed.feed*` events
3. **Proxy Integration**: Works with the Netlify proxy function
4. **Formula Support**: Integrates with the Formula Builder MCP

## Best Practices

1. **Use Natural Language**
   - "Has traffic dropped today?" instead of complex queries
   - "Show me errors in the last hour" for quick searches

2. **Combine with Other MCPs**
   - Use Formula Builder MCP to generate formulas
   - Use this MCP to execute the resulting queries

3. **Monitor Regularly**
   - Set up regular traffic checks
   - Analyze drops immediately when detected

4. **Leverage Analysis Tools**
   - Use `analyzeTrafficDrop` for root cause analysis
   - Check index health when queries are slow

## Troubleshooting

### No results returned
- Check time range is appropriate
- Verify index pattern matches your data
- Ensure authentication is valid

### Connection errors
- Test with `testKibanaConnection`
- Verify proxy URL is correct
- Check Kibana cookie is fresh

### Query errors
- Validate query syntax
- Check field names exist in indices
- Use `executeQuery` with small size first

## Configuration

The MCP uses these defaults aligned with your setup:

```javascript
{
  indexPattern: 'traffic-*',
  kibanaProxyPath: '/api/console/proxy',
  radEventPattern: 'pandc.vnext.recommendations.feed.feed*',
  defaultTimeRange: { from: 'now-12h', to: 'now' }
}
```

## Contributing

To extend this MCP:

1. Add new tools in `index.js`
2. Follow the existing pattern
3. Update tool registration
4. Add examples to this README
5. Test with real queries

## License

Part of the VH RAD Traffic Monitor project.
