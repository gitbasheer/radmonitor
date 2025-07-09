# VH RAD Traffic Monitor - Production Architecture

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Technology Stack](#technology-stack)
6. [API Endpoints](#api-endpoints)
7. [Security Architecture](#security-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Monitoring & Observability](#monitoring--observability)
10. [Configuration Management](#configuration-management)
11. [Performance & Scaling](#performance--scaling)
12. [Disaster Recovery](#disaster-recovery)

## System Overview

The VH RAD Traffic Monitor is a production-grade web application designed to monitor and analyze traffic health for Recommendation and Discovery (RAD) events. It provides real-time monitoring, alerting, and analysis capabilities for venture feed traffic patterns.

### Key Features
- **Real-time Traffic Monitoring**: Live updates via WebSocket connections
- **Venture Feed Validation**: Automated validation of traffic patterns against baselines
- **RADSets Monitoring**: Track multiple RAD types with configurable thresholds
- **Formula Builder**: Natural language formula creation for custom metrics
- **Experiment Health Tracking**: Monitor A/B test impacts on traffic
- **Business Impact Analysis**: Calculate and display traffic loss/gain in business terms

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Production Environment                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐     ┌──────────────────┐     ┌────────────────────────┐  │
│  │                 │     │                  │     │                        │  │
│  │  Static Assets  │────▶│   CDN/GitHub    │────▶│   Browser Client      │  │
│  │  (HTML/CSS/JS)  │     │     Pages       │     │   (index.html)        │  │
│  │                 │     │                  │     │                        │  │
│  └─────────────────┘     └──────────────────┘     └───────────┬────────────┘  │
│                                                                │                │
│                                                                │ HTTPS/WSS      │
│                                                                ▼                │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                          FastAPI Production Server                       │  │
│  │                         (bin/server_production.py)                      │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │              │  │              │  │              │  │            │ │  │
│  │  │  API Layer   │  │  WebSocket   │  │   Formula    │  │  Metrics   │ │  │
│  │  │  /api/v1/*   │  │   Handler    │  │   Engine     │  │ Prometheus │ │  │
│  │  │              │  │    /ws       │  │ /formulas/*  │  │ /metrics   │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └────┬───────┘ │  │
│  │         │                  │                  │               │         │  │
│  │  ┌──────▼──────────────────▼──────────────────▼───────────────▼──────┐ │  │
│  │  │                     Core Services Layer                            │ │  │
│  │  ├────────────────────────────────────────────────────────────────────┤ │  │
│  │  │ • Authentication  • Rate Limiting  • Circuit Breakers  • Caching   │ │  │
│  │  │ • CORS Handler   • Request Logger • Error Handler    • Validation  │ │  │
│  │  └────────────────────────┬───────────────────────────────────────────┘ │  │
│  │                           │                                             │  │
│  └───────────────────────────┼─────────────────────────────────────────────┘  │
│                              │                                                 │
│  ┌───────────────────────────▼─────────────────────────────────────────────┐  │
│  │                          External Services                               │  │
│  ├─────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │              │  │              │  │              │  │            │ │  │
│  │  │ Elasticsearch│  │    Kibana    │  │    Redis     │  │   Slack    │ │  │
│  │  │   Cluster    │  │    Proxy     │  │    Cache     │  │    API     │ │  │
│  │  │              │  │              │  │              │  │            │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  │                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Frontend Layer

#### Static Assets
- **Location**: `index.html`, `assets/`
- **Hosting**: GitHub Pages / CDN
- **Key Files**:
  - `index.html`: Main application entry point
  - `assets/js/main-clean.js`: Application bootstrapper
  - `assets/css/dashboard-antares.css`: GoDaddy UXCore styling
  - `assets/css/uxcore-bundle.css`: Complete UXCore design system

#### JavaScript Modules
```
assets/js/
├── Core Modules
│   ├── main-clean.js           # Application entry point
│   ├── dashboard.js            # Main dashboard controller
│   ├── api-client-unified.js   # Unified API client
│   └── data-layer.js           # Data management layer
├── Configuration
│   ├── config-service.js       # Configuration management
│   ├── config-editor.js        # Configuration UI
│   └── config-manager.js       # Config import/export
├── UI Components
│   ├── ui-updater.js           # DOM update manager
│   ├── search-filter.js        # Search and filtering
│   └── connection-status-manager.js # Status indicators
├── Authentication
│   ├── auth-service.js         # Authentication logic
│   ├── centralized-auth.js     # Auth coordination
│   └── cookie-modal.js         # Cookie management UI
├── Formula Builder
│   ├── formula-builder/        # Formula builder modules
│   │   ├── core/              # Parser, validator, functions
│   │   ├── ui/                # Editor components
│   │   └── ai/                # AI assistance
│   └── visual-formula-builder-integration.js
└── Production
    ├── production-helper.js    # Production utilities
    └── fastapi-integration.js  # FastAPI client
```

### 2. Backend Layer

#### FastAPI Production Server
- **File**: `bin/server_production.py`
- **Port**: 8000 (configurable via SERVER_PORT)
- **Features**:
  - Async request handling with uvicorn
  - WebSocket support for real-time updates
  - Redis caching for performance
  - Prometheus metrics endpoint
  - Health checks (liveness/readiness)
  - Structured logging with structlog
  - Circuit breakers for external services
  - Rate limiting per IP address
  - CORS with configurable origins
  - JWT authentication support

#### Development Server
- **File**: `bin/server.py`
- **Purpose**: Simplified server for local development
- **Features**: Basic proxy, CORS handling, hot reload

### 3. Data Layer

#### Elasticsearch Integration
- **URL**: Configured via ELASTICSEARCH_URL
- **Index Pattern**: `traffic-*`
- **Query Types**:
  - Time-based aggregations
  - Event counting by RAD type
  - Baseline comparisons
  - Custom formula queries

#### Redis Cache
- **URL**: Configured via REDIS_URL
- **TTL**: 5 minutes (configurable)
- **Usage**:
  - Query result caching
  - Session management
  - Rate limit tracking
  - WebSocket state

### 4. Configuration System

#### Configuration Files
```
config/
├── settings.json         # Base configuration
├── production.json       # Production overrides
├── rad_mappings.json     # RAD type definitions
└── local.settings.json   # Local dev settings (gitignored)
```

#### Environment Variables
```bash
# Core Settings
API_URL=https://api.example.com
ELASTICSEARCH_URL=https://es.example.com
KIBANA_URL=https://kb.example.com
REDIS_URL=redis://localhost:6379

# Security
SECRET_KEY=<secure-random-key>
API_TOKENS=token1,token2
ALLOWED_ORIGINS=https://example.com
ALLOWED_HOSTS=example.com

# Features
ENABLE_WEBSOCKET=true
ENABLE_FORMULA_BUILDER=true
DISABLE_AUTH=false

# Performance
WORKERS=4
CACHE_TTL=300
REQUEST_TIMEOUT=30
```

## Data Flow

### 1. Initial Page Load
```
Browser → GitHub Pages → index.html → main-clean.js
    ↓
ConfigService.init() → Load configuration
    ↓
AuthService.init() → Check authentication
    ↓
Dashboard.init() → Initialize UI components
    ↓
DataLayer.refreshData() → Fetch initial data
```

### 2. Data Query Flow
```
User Action → Dashboard.refresh()
    ↓
DataProcessor.buildQuery() → Construct Elasticsearch query
    ↓
APIClient.queryDashboard() → POST /api/v1/dashboard/query
    ↓
FastAPI → Check cache → Execute query → Cache result
    ↓
DataProcessor.processResults() → Calculate scores
    ↓
UIUpdater.updateDataTable() → Update DOM
```

### 3. Real-time Updates (WebSocket)
```
Browser → Connect to wss://api.example.com/ws
    ↓
Server → Authenticate token → Accept connection
    ↓
Subscribe to channels → Receive updates
    ↓
Update UI without full refresh
```

### 4. Formula Execution
```
User enters formula → FormulaParser.parse()
    ↓
FormulaValidator.validate() → Check syntax
    ↓
POST /api/v1/formulas/execute → Server validation
    ↓
ElasticsearchQuery → Transform to ES query
    ↓
Execute → Return results → Update visualization
```

## Technology Stack

### Frontend
- **Framework**: Vanilla JavaScript (ES6+)
- **UI Library**: GoDaddy UXCore Design System
- **Build**: None (served as static files)
- **CSS**: Custom CSS with CSS variables
- **Testing**: Vitest + Jest

### Backend
- **Language**: Python 3.8+
- **Framework**: FastAPI 0.104+
- **Server**: Uvicorn with uvloop
- **Cache**: Redis with aioredis
- **Monitoring**: Prometheus metrics
- **Logging**: structlog (JSON format)

### Infrastructure
- **Hosting**: 
  - Frontend: GitHub Pages / CDN
  - Backend: Cloud VM / Kubernetes
- **Load Balancer**: nginx / cloud LB
- **SSL**: Let's Encrypt / cloud provider
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK stack / cloud logging

## API Endpoints

### Authentication
```
POST   /api/v1/auth/validate     # Validate auth cookie
GET    /api/v1/auth/status       # Check auth status
POST   /api/v1/auth/logout       # Logout (clear session)
```

### Dashboard
```
GET    /api/v1/dashboard/config  # Get dashboard configuration
POST   /api/v1/dashboard/config  # Update configuration
GET    /api/v1/dashboard/stats   # Get current statistics
POST   /api/v1/dashboard/query   # Execute dashboard query
```

### Configuration
```
GET    /api/v1/config/settings   # Get all settings
POST   /api/v1/config/settings   # Update settings
GET    /api/v1/config/health     # Check config health
```

### Formula Builder
```
POST   /api/v1/formulas/validate # Validate formula syntax
POST   /api/v1/formulas/execute  # Execute formula query
GET    /api/v1/formulas/functions # List available functions
GET    /api/v1/formulas/examples  # Get example formulas
```

### Monitoring
```
GET    /health/live              # Kubernetes liveness probe
GET    /health/ready             # Kubernetes readiness probe
GET    /metrics                  # Prometheus metrics
GET    /api/v1/metrics           # Application metrics
```

### WebSocket
```
WS     /ws                       # WebSocket connection
```

### Utilities
```
POST   /api/v1/kibana/proxy      # Kibana proxy (legacy)
POST   /api/v1/utils/cleanup-ports # Port cleanup utility
POST   /api/v1/utils/validate    # Validate connections
```

## Security Architecture

### 1. Authentication
- **Method**: Cookie-based with Kibana session
- **Token Support**: Bearer tokens via API_TOKENS
- **Session Management**: Redis-backed sessions
- **CORS**: Configurable allowed origins

### 2. Authorization
- **Roles**: Currently binary (authenticated/not)
- **Future**: Role-based access control (RBAC)
- **API Protection**: All endpoints require auth (except health)

### 3. Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

### 4. Input Validation
- **Pydantic Models**: Type validation for all inputs
- **Query Validation**: Prevent script injection
- **Path Validation**: Prevent directory traversal
- **Rate Limiting**: 10-30 requests/minute per endpoint

### 5. Secrets Management
- **Environment Variables**: All secrets in .env
- **No Hardcoding**: Configuration via environment
- **Rotation**: Support for key rotation
- **Encryption**: Redis data encrypted at rest

## Deployment Architecture

### 1. Container Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "bin/server_production.py"]
```

### 2. Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rad-monitor
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: rad-monitor
        image: rad-monitor:latest
        ports:
        - containerPort: 8000
        livenessProbe:
          httpGet:
            path: /health/live
        readinessProbe:
          httpGet:
            path: /health/ready
```

### 3. Deployment Script
```bash
#!/bin/bash
# deploy-production.sh

# 1. Validate environment
./bin/env_validator.py

# 2. Run tests
npm test && python -m pytest

# 3. Build and deploy
docker build -t rad-monitor:latest .
docker push registry/rad-monitor:latest

# 4. Update deployment
kubectl apply -f k8s/
```

## Monitoring & Observability

### 1. Metrics (Prometheus)
- **Request Metrics**: Count, duration, status
- **Cache Metrics**: Hit rate, miss rate
- **WebSocket Metrics**: Active connections
- **Business Metrics**: Query volumes, error rates

### 2. Logging (Structured)
```json
{
  "timestamp": "2025-01-07T10:30:45.123Z",
  "level": "INFO",
  "request_id": "uuid",
  "method": "POST",
  "path": "/api/v1/dashboard/query",
  "duration_ms": 145,
  "status": 200
}
```

### 3. Tracing (OpenTelemetry Ready)
- Request tracing with correlation IDs
- Distributed tracing support
- Performance profiling hooks

### 4. Alerting Rules
- **Critical**: API down, ES unreachable
- **Warning**: High error rate, slow queries
- **Info**: Deployment events, config changes

## Configuration Management

### 1. Configuration Hierarchy
```
1. Default values (code)
2. settings.json (base config)
3. production.json (environment)
4. Environment variables (override)
5. Runtime updates (temporary)
```

### 2. Dynamic Configuration
- **Hot Reload**: Config changes without restart
- **Validation**: Schema validation on load
- **Audit Trail**: Config change history
- **Rollback**: Previous config restoration

### 3. Feature Flags
```json
{
  "features": {
    "fastapi": true,
    "websocket": true,
    "formulaBuilder": true,
    "authentication": true,
    "aiAssistance": false
  }
}
```

## Performance & Scaling

### 1. Caching Strategy
- **Redis Cache**: 5-minute TTL for queries
- **Local Cache**: In-memory fallback
- **CDN Cache**: Static assets cached globally
- **Browser Cache**: Aggressive caching headers

### 2. Connection Pooling
- **HTTP**: 100 connections, 20 keepalive
- **Redis**: Connection pool with retry
- **Database**: Future connection pooling

### 3. Horizontal Scaling
- **Stateless Design**: Any instance can handle requests
- **Shared Cache**: Redis for distributed state
- **Load Balancing**: Round-robin or least-conn
- **Auto-scaling**: Based on CPU/memory metrics

### 4. Performance Targets
- **Response Time**: <500ms p95
- **Throughput**: 1000 req/sec
- **Availability**: 99.9% uptime
- **Error Rate**: <0.1%

## Disaster Recovery

### 1. Backup Strategy
- **Configuration**: Git versioned
- **Cache**: Ephemeral (can rebuild)
- **Logs**: Retained 30 days
- **Metrics**: Retained 90 days

### 2. Failure Modes
- **Elasticsearch Down**: Cached data served
- **Redis Down**: Fallback to local cache
- **API Down**: Static data displayed
- **Network Issues**: Retry with backoff

### 3. Recovery Procedures
1. **Service Restart**: Automatic via orchestrator
2. **Cache Rebuild**: Automatic on startup
3. **Config Restore**: From git repository
4. **Data Recovery**: From Elasticsearch snapshots

### 4. RTO/RPO Targets
- **RTO**: 5 minutes (service restoration)
- **RPO**: 0 (no data loss - read-only)
- **MTTR**: <30 minutes
- **MTBF**: >30 days

## Future Enhancements

### 1. Planned Features
- **Multi-tenancy**: Workspace isolation
- **RBAC**: Fine-grained permissions
- **API Gateway**: Rate limiting, auth
- **GraphQL**: Alternative API
- **Data Pipeline**: Real-time processing

### 2. Scalability Improvements
- **Database**: Add PostgreSQL for state
- **Message Queue**: Add Kafka/RabbitMQ
- **Service Mesh**: Istio integration
- **Edge Computing**: CDN compute

### 3. Advanced Monitoring
- **ML Anomaly Detection**: Auto alerts
- **Predictive Scaling**: Proactive scaling
- **Custom Dashboards**: Grafana templates
- **SLO Tracking**: Service level objectives

## Conclusion

The VH RAD Traffic Monitor production architecture is designed for:
- **High Availability**: Multiple failure handling mechanisms
- **Performance**: Caching and optimization at every layer
- **Security**: Defense in depth approach
- **Scalability**: Horizontal scaling ready
- **Maintainability**: Clear separation of concerns
- **Observability**: Comprehensive monitoring and logging

This architecture supports the critical business function of monitoring RAD traffic health while providing a foundation for future enhancements and scaling requirements.