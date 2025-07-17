# Performance Monitoring & CORS Proxy Health Check Guide

## Overview

The RAD Monitor dashboard now includes comprehensive performance monitoring and CORS proxy health checking capabilities. These features help you:

- Monitor query performance in real-time
- Track cache efficiency
- Detect slow queries automatically
- Monitor CORS proxy availability
- View detailed performance statistics
- Adapt system behavior based on performance

## Features

### 1. CORS Proxy Health Monitoring

The dashboard automatically checks CORS proxy status every 60 seconds when running on localhost.

**Visual Indicators:**
- **Green dot** (🟢) - CORS proxy is running
- **Red dot** (🔴) - CORS proxy is not running
- **Warning banner** - Appears when proxy is down

**How it works:**
- Health checks run automatically every 60 seconds
- Status is logged using DataLayer state management
- Visual indicators update in real-time

### 2. Query Performance Tracking

Every query is automatically tracked for:
- Query duration (in milliseconds)
- Success/failure status
- Cache hit/miss
- Query type
- Response size
- Authentication method used

**Performance Warnings:**
- API queries exceeding 3 seconds trigger `API_PERFORMANCE_WARNING`
- DataLayer queries exceeding 5 seconds trigger `PERFORMANCE_WARNING`
- Data processing exceeding 100ms triggers `DATA_PROCESSING_PERFORMANCE_WARNING`
- Slowest query in the last hour is tracked

### 3. Performance Dashboard

Access detailed performance statistics from the browser console:

```javascript
Dashboard.showPerformanceStats()
```

This displays:
- Average query duration (last 10 queries)
- Slowest query in the last hour
- Cache hit rate percentage
- Failed query count
- CORS proxy status
- Recent query details table

### 4. UI Performance Widget

A performance widget is displayed on the dashboard showing:
- Average query time (color-coded)
- Cache hit rate (with health indicator)
- Failed queries count
- Overall reliability percentage
- Link to view detailed stats

### 5. Auto-Refresh Intelligence

The auto-refresh mechanism now considers performance:
- Skips refresh if average query time exceeds 10 seconds
- Skips refresh if too many failures and low cache rate
- Logs reasons for skipping with performance context

### 6. Configuration Impact Tracking

When configuration changes are made:
- Performance metrics before change are captured
- After refresh, performance impact is measured
- Changes in query duration, cache rate, and failures are logged
- Configuration exports include performance snapshots

### 7. Console Visualization Enhancement

The ASCII console visualization now includes:
- Performance metrics section
- Query time with color coding
- Cache hit rate display
- Reliability percentage
- CORS proxy status (localhost only)

## Usage

### Viewing Performance Stats

1. Open browser developer console (F12)
2. Run: `Dashboard.showPerformanceStats()`
3. View comprehensive performance metrics

### Monitoring in Real-Time

Performance metrics are logged automatically using the DataLayer state management system. Look for these action types in the console:

**Query Tracking:**
- `API_QUERY_START` - API query begins
- `API_QUERY_SUCCESS` - API query completes
- `API_QUERY_ERROR` - API query fails
- `API_PERFORMANCE_WARNING` - API exceeds 3 seconds
- `QUERY_EXECUTE_START` - DataLayer query begins
- `QUERY_EXECUTE_SUCCESS` - DataLayer query completes
- `QUERY_EXECUTE_ERROR` - DataLayer query fails
- `QUERY_CACHE_HIT` - Data served from cache
- `PERFORMANCE_WARNING` - Query exceeds 5 seconds

**Data Processing:**
- `DATA_PROCESSING_START` - Processing begins
- `DATA_PROCESSING_COMPLETE` - Processing complete with metrics
- `DATA_PROCESSING_PERFORMANCE_WARNING` - Processing exceeds 100ms

**System Events:**
- `CORS_PROXY_HEALTH_CHECK` - Proxy status update
- `CORS_PROXY_CHECK` - Individual proxy check
- `CONFIG_CHANGE_APPLIED` - Configuration changed
- `CONFIG_CHANGE_IMPACT` - Performance impact measured
- `TIME_RANGE_PRESET_SELECTED` - Time range changed
- `AUTO_REFRESH_SKIPPED` - Auto-refresh skipped with reason
- `AUTO_REFRESH_EXECUTING` - Auto-refresh running

**Authentication:**
- `AUTH_METHOD_RESOLVED` - Authentication successful
- `AUTH_METHOD_FAILED` - Authentication failed
- `AUTH_FAILURE` - Query failed due to auth

### Accessing Raw Metrics

For programmatic access to performance data:

```javascript
const metrics = DataLayer.getPerformanceMetrics();
console.log(metrics);
```

Returns:
```javascript
{
  averageQueryDuration: 245,        // ms
  slowestQueryLastHour: {...},      // query details
  cacheHitRate: 75,                 // percentage
  cacheHits: 15,
  cacheMisses: 5,
  failedQueries: 2,
  recentQueries: [...],             // last 10 queries
  corsProxyStatus: 'running',
  lastCorsHealthCheck: 1234567890   // timestamp
}
```

### Resetting Metrics

To clear all performance metrics:

```javascript
DataLayer.resetPerformanceMetrics();
```

## Integration Points

### 1. API Client
- Tracks all API calls with detailed metrics
- Logs authentication resolution time
- Monitors CORS proxy checks
- Measures fetch duration separately

### 2. Data Processor
- Tracks processing time for each data set
- Counts skipped items (low volume, no baseline)
- Calculates processing rate (buckets/second)
- Logs efficiency metrics

### 3. Configuration Manager
- Captures performance before config changes
- Measures impact after changes apply
- Logs time range preset selections
- Includes performance in config exports

### 4. Dashboard Controller
- Auto-refresh considers performance metrics
- Updates performance widget on data refresh
- Provides console command for stats
- Integrates CORS health monitoring

### 5. UI Updater
- Displays performance widget
- Shows CORS proxy status indicator
- Updates metrics after each refresh
- Color-codes metrics by health

### 6. Console Visualizer
- Shows performance metrics in ASCII view
- Color-codes metrics by thresholds
- Displays reliability percentage
- Shows CORS proxy status

## Performance Thresholds

- **Query warning threshold**: 5000ms (DataLayer), 3000ms (API)
- **Processing warning threshold**: 100ms
- **Health check interval**: 60 seconds
- **Query history limit**: 100 queries
- **Rolling average window**: 10 most recent queries
- **Auto-refresh skip**: >10s avg or >5 failures
- **Good cache hit rate**: >70%
- **Good reliability**: >90%

## Troubleshooting

### CORS Proxy Not Detected

1. Ensure proxy is running: `python3 cors_proxy.py`
2. Check port 8889 is not blocked
3. Verify proxy health endpoint: http://localhost:8889/health
4. Check console for `CORS_PROXY_CHECK` logs

### Performance Metrics Not Updating

1. Check if queries are being executed
2. Verify DataLayer is loaded: `typeof DataLayer !== 'undefined'`
3. Check console for error logs
4. Look for `QUERY_EXECUTE_START` logs

### Visual Indicators Not Showing

1. Refresh the page after proxy starts
2. Check browser console for errors
3. Ensure JavaScript is enabled
4. Look for performance widget element

### High Query Times

1. Check `Dashboard.showPerformanceStats()` for patterns
2. Look for `PERFORMANCE_WARNING` logs
3. Check cache hit rate (should be >70%)
4. Consider reducing refresh frequency

## Best Practices

1. **Monitor regularly**: Check performance stats periodically
2. **Watch for patterns**: Identify consistently slow queries
3. **Optimize cache usage**: Aim for >70% cache hit rate
4. **Keep proxy running**: For localhost development
5. **Clear old metrics**: Reset periodically for accurate averages
6. **Review auto-refresh logs**: Check why refreshes are skipped
7. **Track config impacts**: Monitor performance after changes
8. **Use console visualization**: Quick health check in console
