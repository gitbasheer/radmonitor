# VH Query Engine MCP

A Model Context Protocol server for direct Elasticsearch query execution and search operations. This MCP provides low-level access to Elasticsearch for advanced queries, event searches, and formula-based queries.

## Features

- **Direct Query Execution** - Execute raw Elasticsearch queries
- **RAD Event Search** - Search events with multiple filter options
- **Formula Query Building** - Convert formulas to Elasticsearch queries
- **Connection Testing** - Validate Elasticsearch/Kibana connectivity

## Installation

```bash
cd mcp-query-engine
npm install
```

## Usage with Cursor

### 1. Add to Cursor Settings

Open Cursor settings and add:

```json
{
  "mcpServers": {
    "vh-query-engine": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-query-engine/index.js"]
    }
  }
}
```

### 2. Available Commands

Once configured, you can ask Cursor:

#### Query Execution
- **"Execute a query for feed events in the last hour"**
  - Runs Elasticsearch queries directly
  - Returns raw results with aggregations

- **"Show me traffic aggregated by hour"**
  - Time-based aggregations
  - Customizable bucket sizes

#### Event Search
- **"Search for all checkout_flow errors"**
  - Multi-filter event searches
  - Faceted results included

- **"Find events from user123 with status 500"**
  - User-specific searches
  - Error investigation

#### Formula Queries
- **"Build a query for the formula: count() / count(shift='1d')"**
  - Formula to query conversion
  - Ready-to-execute queries

- **"Convert traffic drop formula to Elasticsearch"**
  - Complex formula support
  - Optimized query generation

#### Connection Testing
- **"Test the Elasticsearch connection"**
  - Connectivity validation
  - Authentication status
  - Cluster health check

## Tool Reference

### `executeQuery`
Execute raw Elasticsearch queries.

```javascript
{
  query: "event_id:*feed*",        // Query string or DSL
  indexPattern: "traffic-*",       // Index pattern
  timeRange: {                     // Time bounds
    from: "now-1h",
    to: "now"
  },
  size: 10,                        // Results count
  aggs: { ... },                   // Aggregations
  radType: "checkout_flow"         // RAD type filter
}
```

**Response includes:**
- Query execution time
- Total hits count
- Document results
- Aggregation results
- Query summary

### `searchRADEvents`
Search for specific events with filters.

```javascript
{
  eventPattern: "*feed.click",     // Event pattern
  userID: "user123",               // User filter
  statusCode: 200,                 // Status filter
  errorType: null,                 // Error type
  timeRange: {                     // Time bounds
    from: "now-24h",
    to: "now"
  },
  limit: 20,                       // Max results
  includeAggregations: true        // Facets
}
```

**Response includes:**
- Matching events
- Total count
- Event type breakdown
- Status code distribution
- Unique user count
- Timeline aggregation

### `buildFormulaQuery`
Convert formulas to Elasticsearch queries.

```javascript
{
  formula: "count() / count(shift='1d')",
  radType: "api_gateway",          // Optional filter
  timeRange: {                     // Optional bounds
    from: "now-24h",
    to: "now"
  }
}
```

**Response includes:**
- Generated query
- Query explanation
- Formula components
- Example results
- Usage instructions

### `testConnection`
Test Elasticsearch/Kibana connectivity.

```javascript
{
  proxyUrl: "https://proxy.url",   // Proxy endpoint
  cookie: "sid=Fe26.2**...",       // Auth cookie
  testIndex: "traffic-*"           // Test pattern
}
```

**Response includes:**
- Authentication status
- Connection health
- Latency measurement
- Elasticsearch version
- Kibana capabilities
- Index statistics

## Examples

### Basic Query Execution

```javascript
// Time-based aggregation
const result = await executeQuery({
  query: "event_id:*recommendations*",
  aggs: {
    over_time: {
      date_histogram: {
        field: "@timestamp",
        interval: "1h"
      }
    }
  },
  size: 0  // Aggregations only
});

// Output:
{
  "query": { ... },
  "response": {
    "aggregations": {
      "over_time": {
        "buckets": [
          { "key_as_string": "2025-01-13T10:00:00Z", "doc_count": 1234 },
          { "key_as_string": "2025-01-13T11:00:00Z", "doc_count": 1456 }
        ]
      }
    }
  }
}
```

### Event Search

```javascript
// Search with multiple filters
const events = await searchRADEvents({
  eventPattern: "*checkout*",
  statusCode: 500,
  timeRange: { from: "now-6h", to: "now" },
  includeAggregations: true
});

// Output:
{
  "hits": [
    {
      "@timestamp": "2025-01-13T12:34:56Z",
      "event_id": "pandc.vnext.recommendations.checkout.error",
      "response.status_code": 500,
      "error.message": "Payment processing failed"
    }
  ],
  "aggregations": {
    "eventTypes": {
      "checkout.error": 45,
      "checkout.timeout": 12
    }
  }
}
```

### Formula Query Building

```javascript
// Build drop detection query
const query = await buildFormulaQuery({
  formula: "ifelse(count() < count(shift='1d') * 0.5, 'ALERT', 'OK')",
  radType: "checkout_flow"
});

// Output:
{
  "elasticsearchQuery": {
    "size": 0,
    "query": { ... },
    "aggs": {
      "current_count": { "value_count": { "field": "_id" } },
      "baseline_count": { ... },
      "formula_result": { "bucket_script": { ... } }
    }
  },
  "explanation": "This query implements the formula..."
}
```

## Query DSL Support

The MCP supports both query strings and full Query DSL:

### Query String
```javascript
{
  query: "status:404 AND user.id:user*"
}
```

### Query DSL
```javascript
{
  query: {
    bool: {
      must: [
        { match: { status: 404 } },
        { wildcard: { "user.id": "user*" } }
      ]
    }
  }
}
```

## Best Practices

1. **Optimize Queries**
   - Use filters for better performance
   - Limit result size when possible
   - Use aggregations for summaries

2. **Time Ranges**
   - Be specific with time bounds
   - Use relative times (now-1h)
   - Consider data retention

3. **Error Handling**
   - Check connection first
   - Handle query errors gracefully
   - Validate syntax before execution

4. **Performance**
   - Use size: 0 for aggregation-only queries
   - Limit aggregation cardinality
   - Cache frequent queries

## Integration with Other MCPs

### Complete Workflow Example

```javascript
// 1. Test connection first
const connection = await queryEngine.testConnection({
  cookie: "your-kibana-cookie"
});

// 2. Build formula query
const formulaQuery = await queryEngine.buildFormulaQuery({
  formula: "count() / count(shift='1d')"
});

// 3. Execute the query
const results = await queryEngine.executeQuery({
  query: formulaQuery.elasticsearchQuery.query,
  aggs: formulaQuery.elasticsearchQuery.aggs
});

// 4. Search for specific events if needed
if (results.response.aggregations.formula_result.value < 0.5) {
  const errors = await queryEngine.searchRADEvents({
    statusCode: 500,
    timeRange: { from: "now-1h", to: "now" }
  });
}
```

## Configuration

Default settings:
```javascript
{
  indexPattern: 'traffic-*',
  radEventPattern: 'pandc.vnext.recommendations.feed.feed*',
  defaultTimeRange: { from: 'now-12h', to: 'now' },
  kibanaProxyPath: '/api/console/proxy',
  maxResults: 10000
}
```

## Troubleshooting

### Query syntax errors
- Validate JSON structure
- Check field names exist
- Use query string for simple queries

### No results returned
- Verify time range
- Check index pattern
- Ensure authentication is valid

### Slow queries
- Reduce result size
- Simplify aggregations
- Use filters instead of queries

### Connection issues
- Test with `testConnection` first
- Verify proxy URL
- Check cookie freshness

## Advanced Features

### Complex Aggregations
```javascript
{
  aggs: {
    by_rad_type: {
      terms: { field: "rad_type" },
      aggs: {
        over_time: {
          date_histogram: {
            field: "@timestamp",
            interval: "1h"
          }
        }
      }
    }
  }
}
```

### Multi-index Queries
```javascript
{
  indexPattern: "traffic-*,errors-*,metrics-*"
}
```

### Script Fields
```javascript
{
  script_fields: {
    hour_of_day: {
      script: {
        source: "doc['@timestamp'].value.hour"
      }
    }
  }
}
```

## License

Part of the VH RAD Traffic Monitor project.
