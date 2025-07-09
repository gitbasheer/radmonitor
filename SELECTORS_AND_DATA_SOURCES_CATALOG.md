# RAD Monitor - Selectors and Data Sources Catalog

## 1. Elasticsearch Fields Used

### Primary Query Fields (from traffic_query.json)
- **`@timestamp`** - Event timestamp for time-based filtering
- **`detail.event.data.traffic.eid.keyword`** - Event ID (primary identifier)
- **`detail.global.page.host`** - Page host filter (e.g., "dashboard.godaddy.com")

### Aggregation Structure
- **events** - Terms aggregation on event IDs
- **baseline** - Filter aggregation for baseline period
- **current** - Filter aggregation for current time period

### Query Template Variables
- `{{BASELINE_START}}` - Baseline period start time
- `{{BASELINE_END}}` - Baseline period end time
- `{{CURRENT_TIME_START}}` - Current time range start

## 2. DOM Element Selectors

### Summary Cards (index.html)
- `#criticalCount` - Critical events count display
- `#warningCount` - Warning events count display
- `#normalCount` - Normal events count display
- `#increasedCount` - Increased traffic events count

### Status Indicators
- `#connectionStatus` - Main connection status panel
- `#apiStatus` - API connection status
- `#websocketStatus` - WebSocket connection status (optional)
- `#dataStatus` - Data loading status
- `#refreshStatus` - Refresh/authentication status
- `#corsProxyStatus` - CORS proxy status (local dev)
- `#envStatus` - Environment indicator
- `#cookieStatus` - Cookie authentication status

### UI Controls
- `#searchInput` - Event search input field
- `#radTypeButtons` - RAD type filter button container
- `#formulaEditor` - Formula editor component
- `#formulaValidation` - Formula validation messages
- `#formulaStatus` - Formula builder status
- `#testFormulaBtn` - Formula test button
- `#formulaResults` - Formula results preview
- `#formulaResultsContent` - Formula results content area

### Data Display
- `table tbody` - Main data table body
- `.filter-btn` - Status filter buttons
- `.rad-filter-btn` - RAD type filter buttons
- `.timestamp` - Last update timestamp display
- `#lastUpdate` - Specific timestamp span
- `#loadingIndicator` - Loading spinner/message
- `#resultsInfo` - Search/filter results info

### Configuration Display
- `#quickTimeRange` - Active time range display
- `#quickBaseline` - Active baseline configuration
- `#quickEnvironment` - Current environment display
- `#elasticCookie` - Hidden cookie input field

### Main App Structure
- `#mainAppContent` - Main application container
- `.control-panel` - Sidebar control panel
- `.main-content` - Main content area
- `.container` - Content container
- `.header` - Page header

## 3. Data Attributes

### Table Row Attributes
- `data-rad-type` - RAD type identifier on table rows
- `data-filter` - Filter type on filter buttons
- `data-rad-type` - RAD type on badge elements

### Authentication State
- `data-auth-required` - Authentication required flag
- `data-auth-error-time` - Authentication error timestamp

## 4. API Endpoints

### Core API (port 8000)
- **GET** `/api/v1/config/settings` - Get configuration
- **POST** `/api/v1/config/settings` - Update configuration
- **POST** `/api/v1/config/validate` - Validate configuration
- **GET** `/api/v1/config/export` - Export configuration
- **GET** `/api/v1/config/environment` - Get environment info

### Dashboard Data
- **POST** `/api/v1/dashboard/query` - Execute dashboard query
- **GET** `/api/v1/dashboard/data` - Get dashboard data
- **GET** `/api/v1/dashboard/stats` - Get dashboard statistics
- **GET** `/api/v1/metrics` - Get system metrics

### Health & Status
- **GET** `/health` - Health check endpoint
- **GET** `/api/health` - Detailed health status
- **GET** `/api/v1/status` - System status

### WebSocket
- **WS** `/ws` - Real-time data updates (local dev only)

### Kibana Proxy
- **POST** `/api/console/proxy?path=traffic-*/_search&method=POST` - Elasticsearch query proxy

### Formula Builder
- **POST** `/api/v1/formulas/validate` - Validate formula
- **POST** `/api/v1/formulas/execute` - Execute formula
- **GET** `/api/v1/formulas/functions` - Get available functions

## 5. Configuration Sources

### Environment Variables
- `SERVER_PORT` - Server port (default: 8000)
- `SERVER_HOST` - Server host (default: 0.0.0.0)
- `ENVIRONMENT` - Environment mode (development/production)
- `ELASTICSEARCH_URL` - Elasticsearch cluster URL
- `KIBANA_URL` - Kibana instance URL

### Configuration Files
- `/config/settings.json` - Main configuration file
- `/config/production.json` - Production-specific settings
- `/config/queries/traffic_query.json` - Elasticsearch query template

### Configuration Keys (settings.json)
- `app_name` - Application name
- `debug` - Debug mode flag
- `log_level` - Logging level
- `elasticsearch.*` - Elasticsearch connection settings
- `kibana.*` - Kibana connection settings
- `processing.*` - Data processing thresholds
- `rad_types.*` - RAD type definitions
- `dashboard.*` - Dashboard UI settings
- `cors_proxy.*` - CORS proxy settings
- `proxy.*` - Production proxy settings

## 6. State Management Keys

### DataService State
- `data` - Array of processed events
- `stats` - Event statistics object
  - `critical` - Critical event count
  - `warning` - Warning event count
  - `normal` - Normal event count
  - `increased` - Increased traffic count
  - `total` - Total event count
- `filters` - Server-side filters
- `clientFilters` - Client-side filters
  - `status` - Status filter (all/critical/warning/normal/increased)
  - `search` - Search term
  - `radTypes` - Active RAD type filters
- `timeRange` - Active time range
- `loading` - Loading state
- `error` - Error message
- `lastUpdate` - Last data update timestamp

### LocalStorage Keys
- `elasticCookie` - Stored authentication cookie
- `radMonitorState` - Persisted dashboard state
- `formulaHistory` - Formula editor history
- `dashboardConfig` - Dashboard configuration cache

### AppState Metrics
- `requests_total` - Total API requests
- `requests_success` - Successful requests
- `requests_failed` - Failed requests
- `websocket_connections` - Active WebSocket connections
- `cache_hits` - Cache hit count
- `cache_misses` - Cache miss count
- `avg_response_time_ms` - Average response time

## 7. CSS Classes for Styling/Selection

### Status Classes
- `.critical` - Critical status styling
- `.warning` - Warning status styling
- `.normal` - Normal status styling
- `.increased` - Increased traffic styling

### Component Classes
- `.connection-status-panel` - Connection status container
- `.status-dot` - Status indicator dot
- `.status-text` - Status text display
- `.badge` - Status badge element
- `.event-link` - Kibana event link
- `.rad-type-badge` - RAD type indicator badge
- `.formula-status` - Formula validation status

### Layout Classes
- `.control-panel` - Sidebar panel
- `.control-section` - Control panel section
- `.main-content` - Main content area
- `.summary` - Summary cards container
- `.filters` - Filter controls container
- `.rad-filters` - RAD type filters container

## 8. Event Types and Patterns

### RAD Type Patterns
- `pandc.vnext.recommendations.feed.feed*` - Venture Feed
- `pandc.vnext.recommendations.metricsevolved*` - Venture Metrics
- `pandc.vnext.recommendations.cart*` - Cart Recommendations
- `pandc.vnext.recommendations.product*` - Product Recommendations

### WebSocket Message Types
- `update` - Data update message
- `stats` - Statistics update
- `error` - Error notification
- `connection` - Connection status change

## 9. Cookie and Authentication

### Cookie Format
- `sid=xxxxx` - Session ID cookie from Kibana
- Stored as JSON in localStorage with expiry time
- 24-hour default expiration

### Authentication Flow
1. Check localStorage for saved cookie
2. Check window.ELASTIC_COOKIE
3. Prompt user if needed
4. Validate with test query
5. Store validated cookie

## 10. Data Flow Summary

1. **Configuration** loaded from settings.json/environment
2. **Authentication** via Kibana cookie
3. **Query** built from template with time ranges
4. **API Request** to server endpoint
5. **Elasticsearch Query** via Kibana proxy
6. **Data Processing** on server (scoring, classification)
7. **UI Update** via DOM selectors
8. **State Persistence** to localStorage
9. **Real-time Updates** via WebSocket (optional)
10. **User Filters** applied client-side for performance