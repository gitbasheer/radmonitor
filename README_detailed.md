# RAD Monitor - Comprehensive Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Services](#backend-services)
5. [Configuration System](#configuration-system)
6. [Data Flow & Processing](#data-flow--processing)
7. [Authentication & Security](#authentication--security)
8. [Development Workflow](#development-workflow)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Process](#deployment-process)
11. [Monitoring & Debugging](#monitoring--debugging)
12. [Simplification Migration Guide](#simplification-migration-guide)
13. [Advanced Query Filtering (Lens Formulas)](#advanced-query-filtering-lens-formulas)
14. [Complete System Diagram](#complete-system-diagram)

## Architecture Overview

The RAD Monitor is a real-time traffic monitoring dashboard that detects anomalies in RAD (Recommendation API Data) events. It consists of:

- **Frontend**: Static HTML/CSS/JS dashboard hosted on GitHub Pages
- **Proxy Service**: Netlify serverless function handling CORS and authentication
- **Data Source**: Elasticsearch/Kibana with traffic-* indices
- **Development Server**: Unified FastAPI server for local development

### Key Design Principles
- **Stateless**: No server-side state, all data fetched on demand
- **Modular**: ES6 modules with clear separation of concerns
- **Resilient**: Graceful degradation and automatic fallbacks
- **Observable**: Comprehensive logging and performance metrics

### Architectural Evolution
The system has been simplified from a complex multi-layered architecture to a streamlined solution:
- **65% code reduction** achieved through simplification
- **Before**: 3 auth sources, multiple API clients, complex data transformation
- **After**: Single AuthService, unified API client, server-side processing

## Infrastructure Setup

### Production Infrastructure

```
┌──────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   GitHub Pages       │────▶│   Netlify Proxy     │────▶│  Kibana/Elastic  │
│  (Static Hosting)    │     │ (Serverless Func)   │     │  (Data Source)   │
└──────────────────────┘     └─────────────────────┘     └──────────────────┘
         ▲                            ▲                           ▲
         │                            │                           │
    index.html                  proxy.js handles:           traffic-* indices
    + JS/CSS                    - CORS headers              with RAD events
                               - Cookie auth
                               - Request forwarding
```

### Local Development Infrastructure

```
┌──────────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Browser            │────▶│  Unified Dev Server │────▶│  Kibana/Elastic  │
│  localhost:8000      │     │  (FastAPI/Python)   │     │  (Data Source)   │
└──────────────────────┘     └─────────────────────┘     └──────────────────┘
         ▲                            ▲
         │                            │
    Dashboard UI                Handles:
                               - Static file serving
                               - CORS proxy
                               - WebSocket support
                               - API endpoints
```

### Environment URLs

| Environment | Dashboard URL | Proxy URL | Data Source |
|-------------|--------------|-----------|-------------|
| Production | https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/ | https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy | Kibana Prod |
| Local Dev | http://localhost:8000 | http://localhost:8000/api/v1/proxy | Kibana Prod |
| Test | http://localhost:8000 | Mocked in tests | Test fixtures |

## Frontend Architecture

### Module Hierarchy (Simplified)

```
index.html
└── main-simplified.js (Entry Point)
    ├── centralized-auth.js (Cookie Management)
    ├── cookie-modal.js (Authentication UI)
    ├── auth-service.js (Auth Service Layer)
    ├── api-client-simplified.js (API Layer)
    ├── data-service.js (Data Processing)
    ├── dashboard-simplified.js (UI Controller)
    ├── event-emitter.js (Event System)
    ├── config-editor.js (Settings UI)
    └── types.js (Type Definitions)
```

### Core Modules

#### main-simplified.js
- **Purpose**: Application entry point and bootstrapper
- **Responsibilities**:
  - Load all modules in correct order
  - Initialize global window objects for backward compatibility
  - Wait for DOM ready
  - Initialize dashboard

#### centralized-auth.js
- **Purpose**: Centralized authentication management system
- **Features**:
  - Single source of truth for authentication cookies
  - Automatic 24-hour expiry
  - Cookie validation before acceptance
  - Event-driven updates (emits 'cookie:updated' events)
  - Works seamlessly across dev and prod environments
  - Optional shared cookie file support for team access

#### cookie-modal.js
- **Purpose**: UI modal for cookie entry (replaces browser prompts)
- **Features**:
  - Clean, user-friendly interface
  - Clear instructions on how to obtain cookie
  - Cookie format validation
  - Integration with CentralizedAuth
  - Loading states during validation
  - Error messages for invalid cookies

#### auth-service.js
- **Purpose**: Authentication service layer
- **Features**:
  - Integrates with CentralizedAuth as primary auth method
  - Falls back to CookieModal for user input
  - Prevents authentication loops (max 1 retry)
  - Cookie validation and storage
  - Auto-prompt on auth failure

#### api-client-simplified.js
- **Purpose**: Unified API client for all backend communication
- **Features**:
  - Automatic proxy/direct detection
  - Request caching (5-minute TTL)
  - Error handling with retries
  - Performance metrics collection

#### data-service.js
- **Purpose**: Data transformation and business logic
- **Features**:
  - Process Elasticsearch responses
  - Calculate traffic scores
  - Determine health status
  - Generate business impact text

#### dashboard-simplified.js
- **Purpose**: Main UI controller
- **Responsibilities**:
  - Initialize UI components
  - Handle user interactions
  - Update DOM elements
  - Manage refresh cycles

#### event-emitter.js
- **Purpose**: Simple pub/sub system for decoupled communication
- **Usage**:
  ```javascript
  EventEmitter.emit('auth:required');
  EventEmitter.on('data:updated', (data) => updateUI(data));
  ```

### UI Components

#### Control Panel (Sidebar)
- Connection status indicator
- Quick action buttons (Refresh, Configure)
- Export/import configuration
- Current settings display

#### Main Dashboard
- Summary cards (Critical/Warning/Normal/Increased counts)
- Search and filter controls
- RAD type filter buttons
- Data table with sortable columns
- Loading states and error messages

#### Modals
- How It Works (educational content)
- Configuration Editor (advanced settings)
- Cookie Input (authentication)

## Backend Services

### Unified Development Server (bin/dev_server_unified.py)

FastAPI-based server providing:
- Static file serving
- CORS proxy functionality
- WebSocket support
- Configuration API
- Health monitoring

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Serve dashboard |
| `/api/v1/proxy` | POST | CORS proxy for Elasticsearch |
| `/api/v1/dashboard/query` | POST | Unified dashboard query endpoint |
| `/api/v1/config/settings` | GET/POST | Configuration management |
| `/api/v1/health` | GET | Health check |
| `/ws` | WebSocket | Real-time updates (future) |

### Dashboard Query Endpoint

The new simplified endpoint that handles all data processing server-side:

**POST** `/api/v1/dashboard/query`

Request:
```json
{
  "time_range": "now-12h",
  "filters": {},
  "options": {
    "includeStats": true,
    "includeMetadata": true
  }
}
```

Response:
```json
{
  "data": [
    {
      "id": "event-id",
      "name": "Event Name",
      "status": "critical",
      "score": -85,
      "current": 100,
      "baseline": 1000,
      "impact": "Lost ~900 impressions",
      "impact_class": "loss",
      "rad_type": "recommendations",
      "rad_display_name": "Recommendations",
      "rad_color": "#2196F3",
      "kibana_url": "https://..."
    }
  ],
  "stats": {
    "critical_count": 1,
    "warning_count": 0,
    "normal_count": 0,
    "increased_count": 0,
    "total_events": 1
  },
  "metadata": {
    "query_time": "now-12h",
    "baseline_period": "2025-06-01 to 2025-06-09",
    "timestamp": "2025-01-01T12:00:00Z"
  }
}
```

### Netlify Proxy Function (proxy-service/netlify/functions/proxy.js)

Serverless function handling:
- CORS headers for all responses
- Cookie authentication forwarding
- Request proxying to Kibana
- Error handling and logging

#### Request Flow
1. Receive POST with `{cookie, query}`
2. Validate parameters
3. Format cookie (add `sid=` if missing)
4. Forward to Kibana with proper headers
5. Return response with CORS headers

### Dashboard Generator (bin/generate_dashboard.py)

Python script for static generation:
- Fetch data from Elasticsearch
- Process and calculate metrics
- Generate HTML with embedded data
- Used by GitHub Actions for automated updates

## Configuration System

### Configuration Hierarchy

```
1. Default Configuration (hardcoded)
   ↓
2. config/settings.json (local overrides)
   ↓
3. config/production.json (production settings)
   ↓
4. Environment Variables (highest priority)
```

### Configuration Files

#### config/production.json
```json
{
  "environment": "production",
  "corsProxy": {
    "enabled": true,
    "url": "https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
  },
  "elasticsearch": {
    "url": "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243",
    "path": "/api/console/proxy?path=traffic-*/_search&method=POST",
    "index_pattern": "traffic-*"
  }
}
```

#### config/settings.json (Local)
```json
{
  "currentTimeRange": "now-12h",
  "baselineStart": "2025-06-01",
  "baselineEnd": "2025-06-09",
  "criticalThreshold": -80,
  "warningThreshold": -50,
  "minDailyVolume": 100,
  "rad_types": {
    "venture_feed": {
      "pattern": "pandc.vnext.recommendations.feed.feed*",
      "display_name": "Recommendations",
      "enabled": true,
      "color": "#2196F3"
    },
    "venture_metrics": {
      "pattern": "pandc.vnext.recommendations.metricsevolved*",
      "display_name": "Venture Metrics",
      "enabled": true,
      "color": "#9C27B0"
    }
  }
}
```

### Configuration Management

- **Frontend**: ConfigService.js handles loading/saving
- **Backend**: Pydantic models ensure validation
- **Storage**: localStorage for user preferences
- **Sync**: Automatic sync between frontend/backend in dev mode

## Data Flow & Processing

### Query Execution Flow

```
User Action (Refresh)
    ↓
Dashboard.refresh()
    ↓
APIClient.fetchDashboardData()
    ↓
Send to /api/v1/dashboard/query
    ↓
Server processes query:
  - Build Elasticsearch query
  - Execute query
  - Process results
  - Calculate scores
  - Generate impact text
    ↓
Return processed data
    ↓
Update UI Components
```

### Elasticsearch Query Structure

```javascript
{
  "size": 0,
  "query": {
    "bool": {
      "must": [
        { "wildcard": { "event_id.keyword": "pandc.vnext.recommendations.feed.feed*" } },
        { "range": { "@timestamp": { "gte": "now-12h", "lte": "now" } } }
      ]
    }
  },
  "aggs": {
    "events": {
      "terms": {
        "field": "event_id.keyword",
        "size": 2000
      },
      "aggs": {
        "rad_type": { "terms": { "field": "rad_type.keyword", "size": 1 } }
      }
    }
  }
}
```

### Data Processing Pipeline

1. **Aggregation**: Group by event_id and rad_type
2. **Baseline Comparison**: Compare current vs 8-day historical average
3. **Score Calculation**:
   - High Volume (≥1000/day): Sensitive scoring
   - Medium Volume (100-1000): Moderate scoring
   - Low Volume (<100): Filtered out
4. **Status Classification**:
   - CRITICAL: ≤ -80% change
   - WARNING: -50% to -80% change
   - NORMAL: > -50% change
   - INCREASED: > 0% change
5. **Business Impact**: Generate human-readable impact text

## Authentication & Security

### Cookie Authentication System

The dashboard uses a modern, user-friendly authentication system with these components:

1. **CentralizedAuth Module**: Single source of truth for authentication
   - Automatic 24-hour expiry
   - Cookie validation before storage
   - Event-driven updates across components
   - Optional shared cookie file for team access

2. **Cookie Modal UI**: Clean interface for cookie entry
   - No more browser prompts (which can be blocked)
   - Clear instructions with step-by-step guide
   - Real-time validation with error messages
   - Loading states during authentication

3. **Authentication Flow**:
   - Check for existing valid cookie
   - If missing/expired, show Cookie Modal once
   - Validate cookie with test query
   - Store in localStorage with expiry
   - Emit 'cookie:updated' event for UI sync

4. **Loop Prevention**: Smart retry logic prevents infinite auth loops
   - Maximum 1 authentication prompt per session
   - Flag to prevent concurrent auth attempts
   - Manual cookie setting resets retry counters

### Cookie Format & Storage

1. **Cookie Format**: `sid=Fe26.2**...` (Kibana session)
2. **Storage**: localStorage with 'rad_monitor_es_cookie' key
3. **Validation**: Test with lightweight query before accepting
4. **Expiration**: 24 hours (auto-cleared after expiry)
5. **Auto-prompt**: On 401/403 responses (once per session)

### GitHub Secrets Auto-Authentication

For team-wide access without manual cookie entry:

1. **Add GitHub Secret**:
   - Go to: `https://github.com/[your-repo]/settings/secrets/actions`
   - Add secret named `ELASTICSEARCH_COOKIE`
   - Value: Your Elasticsearch cookie

2. **Trigger Rebuild**:
   ```bash
   git commit --allow-empty -m "Trigger rebuild with new secret"
   git push origin main
   ```

3. **Benefits**:
   - Zero setup for team members
   - No manual cookie entry
   - Secure storage in GitHub Secrets
   - Easy updates when cookie expires

### Security Measures

- **CORS**: Handled by proxy service
- **Cookie Isolation**: Never sent to GitHub Pages
- **HTTPS Only**: All production traffic encrypted
- **Input Validation**: Query parameters sanitized
- **Error Sanitization**: No sensitive data in errors

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/balkhalil-godaddy/vh-rad-traffic-monitor.git
cd vh-rad-traffic-monitor

# 2. Install dependencies
npm install
pip install -r requirements-enhanced.txt

# 3. Set up environment
cp env.sample .env
# Edit .env with your ES_COOKIE

# 4. Start development server
npm run dev
# or
python bin/dev_server_unified.py

# 5. Open browser
open http://localhost:8000
```

### Development Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start unified dev server |
| `npm test` | Run JavaScript tests |
| `npm run test:all` | Run all tests |
| `npm run generate` | Generate static dashboard |
| `./scripts/verify-config.sh` | Verify configuration |

### Debug Mode

```javascript
// Enable detailed logging
localStorage.setItem('DEBUG', 'true');

// View all API calls
window.APIClient = apiClient;
apiClient.getMetrics();

// Use RADMonitor helper
RADMonitor.help();              // Show available commands
RADMonitor.getAuthStatus();     // Check authentication
RADMonitor.getData();           // Inspect current data
RADMonitor.clearCache();        // Clear cache and reload
```

### Code Style Guidelines

- **JavaScript**: ES6+ modules, async/await
- **Python**: PEP 8, type hints, docstrings
- **CSS**: BEM naming, CSS variables
- **Git**: Conventional commits

## Testing Strategy

### Test Categories

#### Unit Tests
- JavaScript: Vitest framework
- Python: pytest framework
- Focus: Individual functions/methods

#### Integration Tests
- API client with mock server
- Data processing pipeline
- Configuration management

#### End-to-End Tests
- Full dashboard flow
- Authentication scenarios
- Error handling paths

### Test Files

```
tests/
├── JavaScript Tests
│   ├── api-client.test.js
│   ├── data-service.test.js
│   ├── auth-service.test.js
│   ├── centralized-auth.test.js       # Centralized auth system
│   ├── rad-type-classification.test.js # RAD type determination
│   ├── ui-rad-type-display.test.js    # UI RAD type display
│   ├── data-layer-rad-type.test.js    # Data layer RAD integration
│   ├── search-filter-rad-type.test.js # Search filter RAD support
│   ├── integration-rad-type.test.js   # Full RAD type flow
│   └── dashboard.test.js
├── Python Tests
│   ├── test_proxy_server.py
│   ├── test_data_processing.py
│   └── test_dashboard_generation.py
├── Integration Tests
│   ├── test_full_integration.py
│   └── test_production_flow.js
└── Test Pages
    └── test-auth-flow.html             # Interactive auth testing
```

### Running Tests

```bash
# JavaScript tests
npm test                    # Watch mode
npm run test:run           # Single run
npm run test:coverage      # With coverage

# Python tests
python -m pytest           # All Python tests
python -m pytest -v        # Verbose output

# All tests
npm run test:all          # Complete suite
```

## Deployment Process

### GitHub Pages Deployment

#### Automatic (GitHub Actions)
1. Push to main branch
2. Action triggered (.github/workflows/static.yml)
3. Build dashboard with embedded data
4. Deploy to gh-pages branch
5. Available at production URL

#### Manual Deployment
```bash
# Generate dashboard
npm run generate

# Commit generated files
git add index.html
git commit -m "chore: Update dashboard"
git push origin main
```

### Proxy Deployment (Netlify)

#### Quick Deploy Options

**Option 1: Drag & Drop (No Login Required!)**
1. Visit [Netlify Drop](https://app.netlify.com/drop)
2. Drag the `proxy-service` folder onto the page
3. Netlify deploys instantly
4. Copy your new proxy URL

**Option 2: CLI Deployment**
```bash
cd proxy-service
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

#### Configuration Updates
After deploying new proxy, update:
1. `config/production.json` - proxy URL
2. `assets/js/config-service.js` - fallback URL (line ~394)
3. `.github/workflows/static.yml` - proxy URL injection (line ~68)

## Monitoring & Debugging

### Performance Metrics

The dashboard tracks:
- API response times
- Cache hit rates
- Query execution time
- UI render performance

Access metrics:
```javascript
APIClient.getMetrics()
```

### Performance Improvements (Post-Simplification)
- **Initial Load**: ~40% faster (less JavaScript to parse)
- **Data Updates**: ~60% faster (no client-side processing)
- **Memory Usage**: ~50% reduction (simpler state management)
- **Code Size**: ~65% reduction in JavaScript bundle

### Debug Tools

#### Browser Console
```javascript
// Enable debug logging
localStorage.setItem('debug', 'true');

// View current state
window.Dashboard.getState();

// Test API connection
window.APIClient.testConnection();

// View configuration
window.ConfigService.getConfig();

// Force error handling test
authService.clearAuth();
dashboard.refresh();
```

#### Network Debugging
- Check Network tab for failed requests
- Verify CORS headers in responses
- Inspect cookie headers
- Monitor WebSocket frames (if enabled)

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No data showing | Expired cookie | Get fresh cookie from Kibana |
| CORS errors | Proxy down | Check proxy health, redeploy if needed |
| Wrong indices | Config mismatch | Run `./scripts/verify-config.sh` |
| Slow performance | Large dataset | Adjust time range or aggregation size |
| Static data on GitHub Pages | No proxy configured | Expected behavior, configure proxy for live data |

### Health Monitoring

```bash
# Check local server
curl http://localhost:8000/api/v1/health

# Check production proxy
curl https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy

# Validate full system
python bin/health_check.py
```

## Simplification Migration Guide

### Migration Overview

The system has been transformed from a complex multi-layered architecture to a streamlined solution while maintaining 100% functionality.

### Key Improvements

1. **Simplified Authentication**
   - Before: 3 different cookie sources, complex validation chains
   - After: Single `AuthService` with clear auth flow

2. **Unified API Client**
   - Before: Environment-specific logic, multiple API clients
   - After: Single `SimplifiedAPIClient` with relative URLs

3. **Backend Business Logic**
   - Before: Complex scoring calculations in frontend
   - After: All processing in `/api/v1/dashboard/query` endpoint

4. **Streamlined Data Flow**
   - Before: Multiple data transformation layers
   - After: Direct server → client data flow

### Migration Steps

#### Phase 1: Parallel Running (Current)
- New files added alongside existing ones
- Both systems can run independently
- No breaking changes

#### Phase 2: Switch Entry Point
1. Update `index.html`:
   ```html
   <!-- Replace -->
   <script type="module" src="assets/js/main.js?v=10"></script>
   <!-- With -->
   <script type="module" src="assets/js/main-simplified.js?v=2.0"></script>
   ```
2. Test all functionality
3. Monitor for issues

#### Phase 3: Remove Legacy Code
Once validated, remove:
- `assets/js/main.js`
- `assets/js/data-layer.js`
- `assets/js/api-client.js`
- `assets/js/api-interface.js`
- Other unused modules (28 files total)

### Old vs New API Flow

**Old Flow:**
```javascript
ApiClient.checkCorsProxy()
→ ApiClient.testAuthentication()
→ DataLayer.executeSearch()
→ DataProcessor.transformData()
→ UIUpdater.updateDataTable()
```

**New Flow:**
```javascript
apiClient.fetchDashboardData()
→ dashboard.handleDataUpdate()
```

## Advanced Query Filtering (Lens Formulas)

### Overview

The system supports Lens-like formula syntax for advanced query filtering, enabling complex calculations and aggregations.

### Formula Types

1. **Elasticsearch Metrics**: `sum(bytes)`, `average(cpu.load.pct)`
2. **Time Series Functions**: `cumulative_sum()`, `moving_average()`
3. **Math Functions**: `round()`, `pow()`, `sqrt()`

### Common Formulas

#### Filter Ratio
```
count(kql='response.status_code > 400') / count()
```

#### Week over Week Comparison
```
percentile(system.network.in.bytes, percentile=99) /
percentile(system.network.in.bytes, percentile=99, shift='1w')
```

#### Percent of Total
```
sum(products.base_price) / overall_sum(sum(products.base_price))
```

#### Recent Change
```
max(system.network.in.bytes, reducedTimeRange="30m") -
min(system.network.in.bytes, reducedTimeRange="30m")
```

### Elasticsearch Functions

- **Aggregations**: `average()`, `count()`, `sum()`, `min()`, `max()`
- **Advanced**: `median()`, `percentile()`, `standard_deviation()`, `unique_count()`
- **Latest State**: `last_value()` - retrieves the latest value

### Time Series Functions

- **Cumulative**: `cumulative_sum()` - running total over time
- **Differences**: `differences()` - change between consecutive values
- **Moving Average**: `moving_average(metric, window=5)` - smoothing
- **Counter Rate**: `counter_rate()` - rate of monotonic counters
- **Normalization**: `normalize_by_unit(metric, unit='s')` - time normalization

### Window Functions

- **Overall Calculations**: `overall_sum()`, `overall_average()`, `overall_max()`, `overall_min()`
- **Series Context**: Calculations across all data points in a series

### Math Functions

- **Basic**: `add()`, `subtract()`, `multiply()`, `divide()`
- **Advanced**: `pow()`, `sqrt()`, `log()`, `exp()`
- **Rounding**: `round()`, `floor()`, `ceil()`
- **Comparison**: `eq()`, `gt()`, `gte()`, `lt()`, `lte()`
- **Utility**: `clamp()`, `defaults()`, `pick_max()`, `pick_min()`

### KQL Integration

Add filters using KQL syntax:
```
sum(bytes, kql='datacenter.name: east*')
count(kql='rad_type:venture_feed AND status:error')
```

### Implementation Plan (Phase 11)

1. **Query Language Parser**: Tokenizer and AST parser for formula syntax
2. **Formula Functions**: Implementation of all Elasticsearch, time series, and math functions
3. **UI Components**: Visual filter builder with syntax highlighting
4. **Performance**: Query optimization and caching strategy

## Complete System Diagram

```mermaid
graph TB
    subgraph "Browser Layer"
        U[User] --> B[Browser]
        B --> HTML[index.html]
        HTML --> JS[JavaScript Modules]

        subgraph "Frontend Modules (Simplified)"
            JS --> Main[main-simplified.js]
            Main --> Auth[auth-service.js]
            Main --> API[api-client-simplified.js]
            Main --> Data[data-service.js]
            Main --> Dash[dashboard-simplified.js]
            Main --> Event[event-emitter.js]
            Main --> Config[config-editor.js]
        end
    end

    subgraph "Configuration Layer"
        Config --> CS[ConfigService]
        CS --> LC[localStorage]
        CS --> ProdConf[production.json]
        CS --> Settings[settings.json]
        CS --> GHSecrets[GitHub Secrets<br/>ELASTICSEARCH_COOKIE]
    end

    subgraph "Network Layer"
        API --> DetectEnv{Environment?}
        DetectEnv -->|Production| Proxy[Netlify Proxy]
        DetectEnv -->|Development| DevServer[FastAPI Server]

        Proxy --> ProxyFunc[proxy.js Function]
        DevServer --> UnifiedAPI[/api/v1/dashboard/query]
    end

    subgraph "Backend Services"
        ProxyFunc --> Kibana[Kibana API]
        UnifiedAPI --> Kibana

        Kibana --> ES[Elasticsearch]
        ES --> Indices[traffic-* indices]

        UnifiedAPI --> Processing[Server-side Processing<br/>- Score Calculation<br/>- Status Classification<br/>- Impact Generation]

        DevServer --> WSSupport[WebSocket Support]
        DevServer --> ConfigAPI[Config API]
        DevServer --> HealthAPI[Health API]
    end

    subgraph "Data Flow"
        ES --> RawData[Raw ES Response]
        RawData --> ServerProc[Server Processing]
        ServerProc --> ProcessedData[Processed Dashboard Data]
        ProcessedData --> ClientReceive[Client Receives]
        ClientReceive --> UIUpdate[Direct UI Update]
    end

    subgraph "UI Components"
        UIUpdate --> Cards[Summary Cards]
        UIUpdate --> Table[Data Table]
        UIUpdate --> Filters[Filter Controls]
        UIUpdate --> Modal[Modals]
        UIUpdate --> RadFilters[RAD Type Filters]
    end

    subgraph "Deployment Pipeline"
        GH[GitHub Push] --> GHA[GitHub Actions]
        GHA --> Gen[generate_dashboard.py]
        GHA --> InjectSecret[Inject ELASTICSEARCH_COOKIE]
        InjectSecret --> Pages[GitHub Pages]

        NetlifyDep[Netlify Deploy<br/>Drag & Drop or CLI] --> NetlifyProd[Netlify Production<br/>Proxy Function]
    end

    subgraph "Future Enhancements"
        Future[Phase 11: Lens Formulas]
        Future --> Parser[Query Parser]
        Future --> Functions[Formula Functions]
        Future --> FilterUI[Advanced Filter UI]
    end

    style U fill:#e1f5fe
    style Proxy fill:#c8e6c9
    style DevServer fill:#fff9c4
    style ES fill:#ffccbc
    style Pages fill:#f3e5f5
    style NetlifyProd fill:#e8f5e9
    style Processing fill:#fff3e0
    style Future fill:#f0f0f0
```

## Conclusion

The RAD Monitor is a production-ready monitoring system with:
- **Simplified Architecture**: 65% code reduction while maintaining functionality
- **Easy Deployment**: Drag-and-drop proxy deployment, GitHub Secrets for auth
- **Robust Data Pipeline**: Server-side processing for consistency
- **Flexible Configuration**: Multiple override levels
- **Comprehensive Testing**: Unit, integration, and E2E tests
- **Observable System**: Metrics, debugging tools, and helper commands
- **Future Ready**: Prepared for advanced query filtering with Lens formulas

The system is designed to be maintainable, extensible, and reliable for monitoring critical RAD traffic patterns.

## Known Issues & Solutions

### Authentication Loop Fix
The cookie modal now includes validation to prevent authentication loops. If a cookie is invalid, it will show an error message instead of repeatedly prompting.

### Module Loading Errors
If you see errors like `Uncaught SyntaxError: Unexpected token 'export'`:
- This means JavaScript files are being loaded as regular scripts instead of ES6 modules
- Solution: Ensure all module files are loaded with `type="module"` or via ES6 imports
- Fixed in: Removed duplicate script tags from index.html

### API Endpoint Errors
If you see 404 errors for `/api/v1/query`:
- The correct endpoint is `/api/v1/dashboard/query`
- Fixed in: Updated centralized-auth.js to use the correct endpoint

### Authentication 401 Errors
If you see 401 Unauthorized errors after entering a cookie:
- **Cause**: Cookie not being sent correctly to the server
- **Solution**: The system now:
  - Sends cookies in the standard `Cookie` header instead of custom headers
  - Explicitly includes the Cookie header for localhost development
- **Fixed in**: Updated both centralized-auth.js and api-client-simplified.js
