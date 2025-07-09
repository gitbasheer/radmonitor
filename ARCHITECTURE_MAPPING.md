# RAD Traffic Monitor - Complete Architecture Mapping

## Overview

The RAD Traffic Monitor is a real-time traffic monitoring dashboard that tracks RAD (Recommendations and Deals) events in GoDaddy's infrastructure. It compares current traffic against historical baselines to detect anomalies and traffic drops.

## Architecture Components

### 1. Entry Points

#### Production (GitHub Pages)
- **URL**: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/
- **Entry**: `index.html` (static deployment)
- **Authentication**: Cookie-based via modal UI

#### Development (Local)
- **URL**: http://localhost:8000
- **Entry**: FastAPI server (`bin/server.py`)
- **Scripts**: 
  - `npm run dev` → `bin/dev_server_unified.py` → `bin/server.py`
  - `npm run dev:direct` → `bin/server.py`

### 2. Frontend Architecture

#### HTML Entry (`index.html`)
- Main dashboard UI with sidebar control panel
- Embeds:
  - Dashboard CSS (`assets/css/dashboard.css`)
  - Main JS module (`assets/js/main-simplified.js`)
  - Formula editor components
  - Modal dialogs (How It Works, Configuration)

#### JavaScript Module Structure

```
main-simplified.js (Entry Point)
├── Core Services
│   ├── auth-service.js         - Authentication management
│   ├── config-service.js       - Configuration loading
│   ├── api-client-simplified.js - API communication
│   └── data-service.js         - Data fetching & state
│
├── UI Components
│   ├── dashboard-simplified.js  - Main dashboard logic
│   ├── cookie-modal.js         - Cookie entry UI
│   ├── config-editor.js        - Configuration UI
│   └── config-manager.js       - Config management
│
├── Formula Builder Integration
│   ├── formula-editor-integration.js
│   ├── visual-formula-builder-integration.js
│   └── ai-formula-integration.js
│
└── Testing & Development
    ├── test-simplified-system.js
    └── streamlined-test.js
```

### 3. Formula Builder Subsystem

```
assets/js/formula-builder/
├── core/                    - Core formula processing
│   ├── formula-parser.js    - Parse formula syntax
│   ├── enhanced-ast-parser.js - Enhanced AST parsing
│   ├── formula-validator.js - Validate formulas
│   ├── enhanced-validator.js - Enhanced validation
│   ├── formula-functions.js - Built-in functions
│   ├── formula-synthesizer.js - Formula generation
│   └── formula-entities.js  - Entity definitions
│
├── ui/                      - UI components
│   ├── formula-editor.js    - Basic editor
│   ├── enhanced-formula-editor.js - Advanced editor
│   ├── visual-builder.js    - Visual builder
│   └── enhanced-visual-builder.js - Enhanced visual builder
│
├── integration/             - Dashboard integration
│   ├── dashboard-connector.js - Connect to dashboard
│   └── api-adapter.js       - API integration
│
├── translator/              - Query translation
│   └── query-builder.js     - Build ES queries
│
├── ai/                      - AI integration
│   └── formula-ai-assistant.js - AI helpers
│
└── workers/                 - Web workers
    └── validation-worker.js - Background validation
```

### 4. Backend Architecture

#### FastAPI Server (`bin/server.py`)

```
Main Components:
├── Application Setup
│   ├── FastAPI app with lifespan management
│   ├── CORS middleware (allows all origins)
│   ├── Rate limiting (Slowapi)
│   └── Circuit breaker (pybreaker)
│
├── Static File Serving
│   ├── /assets → assets/
│   └── /tests → tests/
│
├── API Endpoints
│   ├── Core Dashboard
│   │   ├── GET /                    - Dashboard HTML
│   │   ├── GET /health              - Health check
│   │   └── WebSocket /ws            - Real-time updates
│   │
│   ├── Dashboard API (v1)
│   │   ├── POST /api/v1/dashboard/query - Main data query
│   │   ├── GET /api/v1/dashboard/config - Get config
│   │   └── POST /api/v1/dashboard/config - Update config
│   │
│   ├── Authentication
│   │   ├── GET /api/v1/auth/status  - Check auth
│   │   └── POST /api/v1/auth/logout - Logout
│   │
│   ├── Configuration (via router)
│   │   ├── GET /api/v1/config       - Get all config
│   │   ├── POST /api/v1/config/update - Update config
│   │   └── GET /api/v1/config/defaults - Get defaults
│   │
│   └── Utilities
│       ├── GET /api/v1/metrics      - Server metrics
│       ├── POST /api/v1/utils/cleanup-ports
│       └── POST /api/v1/utils/validate
│
└── Legacy Support
    └── POST /kibana-proxy           - Backward compatibility
```

### 5. Data Flow

```mermaid
graph LR
    subgraph "Frontend"
        A[Dashboard UI] --> B[data-service.js]
        B --> C[api-client.js]
    end
    
    subgraph "Backend Routes"
        C --> D[FastAPI Server]
        D --> E[/api/v1/dashboard/query]
    end
    
    subgraph "External Services"
        E --> F[Elasticsearch/Kibana]
        G[Netlify Proxy] --> F
    end
    
    subgraph "Authentication"
        H[Cookie Modal] --> I[auth-service.js]
        I --> J[X-Elastic-Cookie Header]
        J --> E
    end
```

### 6. External Service Integration

#### Elasticsearch/Kibana
- **Production URL**: https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243
- **Query Path**: /api/console/proxy?path=traffic-*/_search&method=POST
- **Index Pattern**: traffic-*
- **Authentication**: sid cookie (Fe26.2**)

#### Netlify Proxy (Production Only)
- **URL**: https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy
- **Purpose**: CORS proxy for GitHub Pages deployment
- **Implementation**: `proxy-service/netlify/functions/proxy.js`

### 7. Configuration System

```
config/
├── production.json      - Production settings (proxy URL)
├── settings.json        - Local development settings
├── api-endpoints.json   - API endpoint definitions
└── queries/
    └── traffic_query.json - ES query templates
```

### 8. Authentication Flow

1. **Cookie Entry**:
   - User prompted via modal (cookie-modal.js)
   - Cookie stored in localStorage with expiry
   - Centralized auth management (centralized-auth.js)

2. **Request Flow**:
   - Cookie added as X-Elastic-Cookie header
   - Backend validates and forwards to Kibana
   - 401 errors trigger re-authentication

### 9. Formula Builder Integration

1. **User Input**:
   - Direct editor with syntax highlighting
   - Visual drag-and-drop builder
   - AI-powered natural language input

2. **Processing**:
   - Parser converts to AST
   - Validator checks syntax and semantics
   - Query builder translates to Elasticsearch DSL

3. **Execution**:
   - Queries sent via dashboard API
   - Results processed and displayed
   - Real-time validation feedback

### 10. MCP (Model Context Protocol) Integration

```
MCP Servers:
├── mcp-formula-builder/     - Formula generation & validation
├── mcp-elasticsearch/       - Direct ES queries (future)
└── mcp-data-service/        - Data analysis (future)
```

### 11. Testing Infrastructure

```
tests/
├── Unit Tests (Vitest)
│   ├── formula-builder.test.js
│   ├── api-client-simplified.test.js
│   └── data-service.test.js
│
├── Integration Tests
│   ├── integration.test.js
│   └── formula-rad-integration.test.js
│
└── Python Tests
    ├── test_server_endpoints.py
    └── test_dashboard_generation.py
```

### 12. Deployment Pipeline

#### GitHub Pages (Production)
1. Push to main branch
2. GitHub Actions triggered
3. Static files deployed to gh-pages branch
4. Available at GitHub Pages URL

#### Netlify Proxy
1. Code in proxy-service/
2. Deploy with `npx netlify deploy --prod`
3. Serverless function handles CORS

### 13. Key Design Decisions

1. **Simplified Architecture**: Single FastAPI server handles everything in development
2. **Cookie-Based Auth**: No SSO integration, manual cookie entry
3. **Client-Side Processing**: Filtering and sorting done in browser for performance
4. **Formula Builder**: Modular design allows standalone usage
5. **WebSocket Support**: Real-time updates without polling
6. **Caching**: 5-minute TTL on API responses
7. **Rate Limiting**: Prevents abuse (500/min dev, 200/min prod)

### 14. Security Considerations

1. **CORS**: Permissive in development, proxy in production
2. **Authentication**: Cookie validated on each request
3. **Rate Limiting**: Per-IP limits on all endpoints
4. **Input Validation**: Pydantic models validate all inputs
5. **Circuit Breaker**: Prevents cascading failures

### 15. Performance Optimizations

1. **Client-Side Filtering**: Reduces server load
2. **Response Caching**: 5-minute cache on queries
3. **WebSocket Updates**: Efficient real-time communication
4. **Lazy Loading**: Formula builder loaded on demand
5. **Background Tasks**: Stats updates don't block responses

## Component Dependencies

### NPM Dependencies
- `@modelcontextprotocol/sdk` - MCP integration
- `express`, `cors` - Legacy server support
- `vitest`, `jsdom` - Testing framework

### Python Dependencies
- `fastapi`, `uvicorn` - Web framework
- `httpx` - Async HTTP client
- `slowapi` - Rate limiting
- `pybreaker` - Circuit breaker
- `structlog` - Structured logging
- `pydantic` - Data validation

## Future Enhancements

1. **SSO Integration**: Replace cookie auth with proper SSO
2. **Multi-RAD Support**: Expand beyond recommendations
3. **Advanced Analytics**: ML-based anomaly detection
4. **Export Features**: CSV/PDF reports
5. **Mobile Support**: Responsive design improvements