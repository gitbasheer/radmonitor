# VH RAD Metrics Service MCP

A Model Context Protocol server for high-level metrics operations and data management in the VH RAD Traffic Monitor system. This MCP provides tools for fetching metrics, analyzing traffic patterns, and managing RAD type configurations.

## Features

- **Metrics Fetching** - Get RAD metrics with optional formula application
- **RAD Type Management** - List and validate configured RAD types
- **Connection Validation** - Test API endpoint connectivity
- **Historical Data** - Retrieve and aggregate historical metrics
- **Pattern Analysis** - Analyze traffic patterns and detect anomalies

## Installation

```bash
cd mcp-metrics-service
npm install
```

## Usage with Cursor

### 1. Add to Cursor Settings

Open Cursor settings and add:

```json
{
  "mcpServers": {
    "vh-rad-metrics-service": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-metrics-service/index.js"]
    }
  }
}
```

### 2. Available Commands

Once configured, you can ask Cursor:

#### Fetch Metrics
- **"Get current metrics for checkout_flow"**
  - Returns latest metrics for specified RAD type
  - Includes counts, trends, and averages

- **"Apply drop detection formula to API gateway metrics"**
  - Fetches metrics and applies formula calculations
  - Returns computed results

#### RAD Type Operations
- **"List available RAD types"**
  - Shows all configured RAD types
  - Includes descriptions and key metrics

- **"Which RAD types are configured?"**
  - Returns: checkout_flow, api_gateway, user_auth

#### Historical Analysis
- **"Show me traffic patterns for the last week"**
  - Retrieves historical data with aggregations
  - Identifies trends and patterns

- **"Analyze traffic patterns for anomalies"**
  - Detects unusual patterns
  - Provides insights and recommendations

#### Connection Testing
- **"Test the data connection"**
  - Validates API connectivity
  - Checks authentication and permissions

## Tool Reference

### `fetchMetrics`
Get RAD metrics with optional formula application.

```javascript
{
  radType: "checkout_flow",      // RAD type to fetch
  timeRange: {                   // Time range for metrics
    from: "now-24h",
    to: "now"
  },
  formula: "count() / count(shift='1d')",  // Optional formula
  aggregation: "hourly"          // Optional: hourly, daily, weekly
}
```

### `getAvailableRadTypes`
List all configured RAD types.

```javascript
// No parameters required
// Returns array of RAD types with metadata
```

### `validateDataConnection`
Test API endpoint connectivity and configuration.

```javascript
{
  endpoint: "/api/data/metrics", // Optional: specific endpoint
  timeout: 5000                  // Optional: timeout in ms
}
```

### `getHistoricalData`
Retrieve historical metrics with aggregation options.

```javascript
{
  radType: "api_gateway",
  period: "7d",                  // 1h, 1d, 7d, 30d
  aggregation: "hourly",         // minute, hourly, daily
  includeWeekends: true          // Include weekend data
}
```

### `analyzeTrafficPattern`
Analyze patterns and detect anomalies.

```javascript
{
  radType: "user_auth",
  timeWindow: "24h",             // Analysis window
  sensitivity: "medium",         // low, medium, high
  compareWith: "baseline"        // baseline, lastWeek, lastMonth
}
```

## Examples

### Basic Metrics Fetching

```javascript
// Get current metrics
const metrics = await fetchMetrics({
  radType: "checkout_flow",
  timeRange: { from: "now-1h", to: "now" }
});

// Output:
{
  "count": 1523,
  "trend": "stable",
  "average": 127,
  "peak": 245,
  "errors": 12
}
```

### Formula Application

```javascript
// Apply drop detection formula
const result = await fetchMetrics({
  radType: "api_gateway",
  formula: "ifelse(count() < count(shift='1d') * 0.8, 'ALERT', 'OK')",
  timeRange: { from: "now-12h", to: "now" }
});

// Output:
{
  "result": "ALERT",
  "current": 890,
  "baseline": 1450,
  "dropPercentage": 38.6
}
```

### Pattern Analysis

```javascript
// Analyze for anomalies
const analysis = await analyzeTrafficPattern({
  radType: "user_auth",
  timeWindow: "24h",
  sensitivity: "high"
});

// Output:
{
  "anomalyDetected": true,
  "severity": "moderate",
  "patterns": [
    {
      "type": "sudden_drop",
      "timestamp": "2025-01-03T14:30:00Z",
      "confidence": 0.87
    }
  ],
  "recommendations": [
    "Check authentication service health",
    "Review recent deployments"
  ]
}
```

### Historical Data

```javascript
// Get weekly trends
const history = await getHistoricalData({
  radType: "checkout_flow",
  period: "7d",
  aggregation: "daily"
});

// Output:
{
  "data": [
    { "date": "2025-01-01", "count": 12450, "errors": 34 },
    { "date": "2025-01-02", "count": 13200, "errors": 28 },
    // ...
  ],
  "summary": {
    "weeklyTotal": 89340,
    "dailyAverage": 12763,
    "errorRate": 0.0028
  }
}
```

## Integration with Other MCPs

This MCP works seamlessly with other VH RAD MCPs:

1. **With Formula Builder MCP**
   - Generate formulas with Formula Builder
   - Apply them using `fetchMetrics`

2. **With Elasticsearch MCP**
   - Use Data Service for high-level operations
   - Use Elasticsearch MCP for detailed queries

Example workflow:
```javascript
// 1. Generate formula
const formula = await formulaBuilder.generateFormula({
  query: "detect traffic anomalies"
});

// 2. Apply to metrics
const result = await dataService.fetchMetrics({
  radType: "api_gateway",
  formula: formula.result
});

// 3. If anomaly detected, investigate with Elasticsearch
if (result.anomalyDetected) {
  const details = await elasticsearch.analyzeTrafficDrop({
    timeWindow: "1h"
  });
}
```

## Best Practices

1. **Use Appropriate Aggregations**
   - Hourly for real-time monitoring
   - Daily for trend analysis
   - Weekly for capacity planning

2. **Validate Connections First**
   - Always test connectivity before bulk operations
   - Handle connection errors gracefully

3. **Leverage Pattern Analysis**
   - Regular pattern analysis helps prevent issues
   - Adjust sensitivity based on your needs

4. **Combine with Other Tools**
   - Use with Formula Builder for complex calculations
   - Use with Elasticsearch for deep dives

## Configuration

The MCP uses these defaults:

```javascript
{
  defaultTimeRange: { from: 'now-24h', to: 'now' },
  defaultAggregation: 'hourly',
  radTypes: ['checkout_flow', 'api_gateway', 'user_auth'],
  apiEndpoint: '/api/data/metrics',
  connectionTimeout: 5000
}
```

## Error Handling

The MCP handles common errors:

- **Connection failures**: Returns clear error messages
- **Invalid RAD types**: Lists available types
- **Formula errors**: Provides validation feedback
- **Data unavailable**: Returns empty results with explanation

## Troubleshooting

### No data returned
- Check time range is valid
- Verify RAD type exists
- Ensure API connectivity

### Formula application fails
- Validate formula syntax first
- Check if metrics support the formula
- Try simpler formulas

### Connection issues
- Run `validateDataConnection` tool
- Check API endpoint configuration
- Verify authentication

## Testing

Test the MCP:
```bash
# Start server
node index.js

# Test tools listing
echo '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' | node index.js

# Test a tool
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "getAvailableRadTypes", "arguments": {}}, "id": 2}' | node index.js
```

## Contributing

To extend this MCP:

1. Add new tools in `index.js`
2. Follow existing patterns
3. Update tool registration
4. Add examples to this README
5. Test with real data

## License

Part of the VH RAD Traffic Monitor project.
