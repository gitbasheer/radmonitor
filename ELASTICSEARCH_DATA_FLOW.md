# Elasticsearch Integration and Data Flow Documentation

## Overview
The RAD Traffic Monitor system integrates with Elasticsearch to monitor recommendation traffic events. This document provides a comprehensive analysis of how data flows from Elasticsearch to the UI.

## Elasticsearch Configuration

### Cluster Details
- **Elasticsearch URL**: `https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243/`
- **Kibana URL**: `https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/`
- **Index Pattern**: `traffic-*` (previously `usi*`)

### Authentication
- Uses cookie-based authentication (`sid=xxxxx`)
- Cookie stored in localStorage as `elasticCookie`
- Passed via `X-Elastic-Cookie` header or `Cookie` header

## Data Flow Architecture

### 1. Frontend → API Client
```javascript
// data-service.js initiates the request
dataService.loadData({
    timeRange: 'now-12h',
    filters: {...}
})
↓
// api-client-simplified.js constructs the Elasticsearch query
apiClient.fetchDashboardData(params)
```

### 2. API Client → Backend Server
The API client sends a POST request to `/api/v1/dashboard/query` with:
```json
{
    "query": {
        "size": 0,
        "query": {
            "bool": {
                "must": [
                    {
                        "range": {
                            "@timestamp": {
                                "gte": "now-12h",
                                "lte": "now"
                            }
                        }
                    },
                    {
                        "query_string": {
                            "query": "pandc.vnext.recommendations.*"
                        }
                    }
                ]
            }
        },
        "aggs": {
            "events": {
                "terms": {
                    "field": "event_id.keyword",
                    "size": 100
                },
                "aggs": {
                    "current": {
                        "filter": {
                            "range": {
                                "@timestamp": {
                                    "gte": "now-12h",
                                    "lte": "now"
                                }
                            }
                        }
                    },
                    "baseline": {
                        "filter": {
                            "range": {
                                "@timestamp": {
                                    "gte": "2025-06-01",
                                    "lte": "2025-06-09"
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    "force_refresh": false
}
```

### 3. Backend Server → Elasticsearch
The server (bin/server.py) processes the request:
1. Validates authentication cookie
2. Executes query via Kibana proxy endpoint
3. Uses httpx to make POST request to:
   ```
   https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/api/console/proxy?path=traffic-*/_search&method=POST
   ```

### 4. Elasticsearch Query Structure
The actual query sent to Elasticsearch (from config/queries/traffic_query.json):
```json
{
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
                "gte": "{{BASELINE_START}}",
                "lt": "{{BASELINE_END}}"
              }
            }
          }
        },
        "current": {
          "filter": {
            "range": {
              "@timestamp": {
                "gte": "{{CURRENT_TIME_START}}"
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
}
```

## Elasticsearch Fields Used

### Primary Fields
1. **`detail.event.data.traffic.eid.keyword`** - The main event ID field
   - Used for aggregation and filtering
   - Contains RAD event identifiers like "pandc.vnext.recommendations.feed.feed*"

2. **`@timestamp`** - Event timestamp
   - Used for time range filtering
   - Baseline period: 2025-06-01 to 2025-06-09
   - Current period: Configurable (default: now-12h)

3. **`detail.global.page.host`** - Page host filter
   - Filtered to "dashboard.godaddy.com"

### Aggregations
- **Terms aggregation** on event IDs to get unique events
- **Sub-aggregations** for baseline and current period counts
- No raw documents returned (`size: 0`)

## Data Processing Flow

### 1. Response Processing (Backend)
```python
# server.py processes the Elasticsearch response
if "aggregations" in data and "events" in data["aggregations"]:
    buckets = data["aggregations"]["events"].get("buckets", [])
    for bucket in buckets:
        processed_data.append({
            "event_id": bucket["key"],
            "count": bucket["doc_count"],
            "current": bucket.get("current", {}).get("doc_count", 0),
            "baseline": bucket.get("baseline", {}).get("doc_count", 0)
        })
```

### 2. Data Transformation (Frontend)
```javascript
// data-processor.js transforms the data
for (const bucket of buckets) {
    const event_id = bucket.key;
    const baseline_count = bucket.baseline?.doc_count || 0;
    const current_count = bucket.current?.doc_count || 0;
    
    // Calculate metrics
    const baseline_period = (baseline_count / baselineDays / 24 * currentHours);
    const score = calculateScore(current_count, baseline_period);
    const status = determineStatus(score);
    
    results.push({
        event_id,
        displayName,
        current: current_count,
        baseline12h: Math.round(baseline_period),
        score,
        status,
        dailyAvg: Math.round(daily_avg),
        rad_type: radType
    });
}
```

## RAD Type Configuration
The system supports multiple RAD types, each with specific patterns:

1. **Venture Feed**: `pandc.vnext.recommendations.feed.feed*`
2. **Venture Metrics**: `pandc.vnext.recommendations.metricsevolved*`
3. **Cart Recommendations**: `pandc.vnext.recommendations.cart*` (disabled)
4. **Product Recommendations**: `pandc.vnext.recommendations.product*` (disabled)

## Alternative Data Paths

### 1. Direct Elasticsearch Client
For CORS-enabled environments, the system can bypass the proxy:
```javascript
// direct-elasticsearch-client.js
const url = 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/elasticsearch/usi*/_search';
// Sends request directly with Cookie header
```

### 2. Formula Builder Integration
The system includes a formula builder that can construct complex queries:
```javascript
// formula-builder/translator/query-builder.js
// Converts formula AST to Elasticsearch queries
// Supports aggregations: COUNT, AVERAGE, SUM, MAX, MIN, PERCENTILE
```

## Performance Optimizations

1. **Caching**: 5-minute TTL cache for query results
2. **Aggregations Only**: No raw documents returned (`size: 0`)
3. **Circuit Breaker**: Prevents cascade failures (5 failures, 60s timeout)
4. **Rate Limiting**: 20 requests/minute for Kibana proxy

## Security Considerations

1. **Authentication**: Cookie-based auth required for all Elasticsearch queries
2. **CORS**: Handled via backend proxy or CORS extension for direct access
3. **Input Validation**: Query parameters validated using Pydantic models
4. **Rate Limiting**: Prevents abuse of proxy endpoints

## Error Handling

1. **Authentication Errors**: Returns 401, prompts for cookie
2. **Elasticsearch Errors**: Gracefully handled with fallback to cached data
3. **Network Errors**: Retry logic with exponential backoff
4. **Invalid Queries**: Validated before execution

## Data Flow Summary

```
User Interface
    ↓
DataService (data-service.js)
    ↓
API Client (api-client-simplified.js)
    ↓
FastAPI Server (bin/server.py)
    ↓
Kibana Proxy Endpoint
    ↓
Elasticsearch Cluster
    ↓
Aggregated Results
    ↓
Data Processor (data-processor.js)
    ↓
UI Updates (ui-updater.js)
```

This architecture provides a robust, scalable solution for monitoring RAD traffic events with proper authentication, caching, and error handling throughout the data flow pipeline.