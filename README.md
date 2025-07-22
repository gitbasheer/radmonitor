# RAD Monitor Dashboard

A real-time traffic monitoring dashboard for multiple RAD event types. Monitors venture feed, metrics, and recommendation systems with intelligent alerting for traffic anomalies.

## Live Dashboard

**Production URL**: https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/

> **Note**: Production deployment now uses FastAPI server for enhanced features including WebSocket support, formula builder, and better performance.

Just need to monitor traffic? Go to the URL above, enter your Kibana cookie when prompted, and you're good to go.

## Multi-RAD Support

The dashboard now monitors **multiple RAD event types** simultaneously:

- **🟢 Venture Feed** - `pandc.vnext.recommendations.feed.feed*` (Primary)
- **🟣 Venture Metrics** - `pandc.vnext.recommendations.metricsevolved*` (Active)
- **🔵 Cart Recommendations** - `pandc.vnext.recommendations.cart*` (Available)
- **🟠 Product Recommendations** - `pandc.vnext.recommendations.product*` (Available)

Filter by RAD type, compare performance across systems, and get unified alerts.

## How It Works

```mermaid
graph TB
    subgraph "Frontend (ES6 Modules)"
        A[Dashboard<br/>Static Site] --> B[Unified API Client]
        B --> C[Multi-RAD Processing]
        C --> D[Real-time UI Updates]
        D --> WS[WebSocket Updates]
    end

    subgraph "Backend (FastAPI Production)"
        E[FastAPI Server<br/>Production URL] --> F[ES Query Builder]
        F --> G[Multi-Pattern Search]
        E --> FM[Formula Builder API]
        E --> WSS[WebSocket Server]
        E --> CACHE[Redis Cache]
    end

    subgraph "Data Sources"
        H[Elasticsearch<br/>traffic-* indices]
        I[Multiple RAD Patterns]
    end

    B -->|HTTPS| E
    WS -->|WSS| WSS
    G --> H
    I --> H
    FM --> G

    style A fill:#e1f5fe
    style E fill:#c8e6c9
    style H fill:#fff9c4
    style C fill:#ffccbc
    style FM fill:#e1bee7
```

**Architecture**: Modern ES6 modules + Production FastAPI server + WebSocket support + Formula Builder + Redis caching.

## Getting Started

### For Monitoring (No Setup)

1. Go to https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/
2. When prompted, enter your Kibana cookie:
   - A clean modal will appear with instructions
   - Open Kibana in another tab
   - F12 → Network tab → Refresh page
   - Find any request → Copy the Cookie header value
   - Look for the `sid=Fe26.2**...` part
3. Paste cookie in the modal and click "Save Cookie"
4. Watch your traffic

### For Development

Clone and install:
```bash
git clone https://github.com/balkhalil-godaddy/vh-rad-traffic-monitor.git
cd vh-rad-traffic-monitor
npm install
```

#### First Time Setup (NEW: Simplified Configuration)

```bash
# Create and activate Python virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Quick setup with configuration wizard
python bin/config_cli.py setup

# Or use the environment setup script
./scripts/setup/setup_env.sh development
```

The new configuration system provides:
- **YAML-based configuration** with `config/config.yaml`
- **Environment variable overrides** using `SECTION__KEY` format
- **Configuration CLI** for easy management
- **Docker Compose** for containerized deployment

#### Environment Validation (NEW)

The server now validates all environment variables at startup:

✅ **Automatic validation** - Server won't start with missing configuration
✅ **Clear error messages** - Shows exactly what's missing with examples
✅ **Type safety** - Converts and validates all values
✅ **Production security** - Enforces stricter requirements in production

If configuration is missing, you'll see:
```
❌ Environment validation failed:
  - ELASTICSEARCH_URL: Required variable is not set. Elasticsearch endpoint URL
    Example: ELASTICSEARCH_URL=https://your-es-instance.aws.found.io:9243
```

See [Environment Validation Guide](docs/ENVIRONMENT_VALIDATION.md) for details.

#### Daily Development

**Option 1: Traditional Setup**
```bash
# After initial setup, just run:
npm run dev

# This starts the unified FastAPI server at http://localhost:8000
# Includes: API endpoints + WebSocket + Static files + Multi-RAD support
```

**Option 2: Docker Development (NEW)**
```bash
# Start development with Docker
./scripts/docker/start-dev.sh

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

**Quick Reference:**
- `npm run dev` = Starts unified server via `bin/server.py`
- `npm test` = Run test suite (requires ES6 migration completion)
- `npm run build` = Generate static production build
- `./scripts/docker/start-dev.sh` = Start with Docker Compose

## Key Files & URLs

| Component | Location | Purpose |
|-----------|----------|---------|
| **Production Dashboard** | https://balkhalil-godaddy.github.io/vh-rad-traffic-monitor/ | Live monitoring interface |
| **CORS Proxy** | https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy | Handles auth + CORS |
| **Unified API Server** | `bin/server.py` | FastAPI server (dev: port 8000) |
| **Configuration** | `config/production.json` | Production settings |
| **API Client** | `assets/js/api-client-unified.js` | Single API interface |
| **Multi-RAD Config** | RAD types in ConfigService | Pattern definitions |

## Current Architecture (Post-Consolidation)

```mermaid
graph TB
    subgraph "Frontend Layer (Pure ES6)"
        A[index.html] --> B[main.js]
        B --> C[api-client-unified.js]
        C --> D[dashboard-main.js]
        B --> E[config-service.js]
        D --> F[multi-RAD processing]
    end

    subgraph "Configuration"
        G[production.json] --> H[Multi-RAD patterns]
        I[ConfigService] --> H
    end

    subgraph "Backend Layer"
        J[bin/server.py<br/>Unified FastAPI] --> K[ES Query Builder]
        L[Netlify Proxy] --> M[CORS + Auth]
    end

    subgraph "Data Layer"
        N[Elasticsearch<br/>traffic-* indices]
        O[Multi-pattern queries]
    end

    C --> J
    C --> L
    K --> N
    O --> N
    E --> G

    style A fill:#e1f5fe
    style J fill:#c8e6c9
    style N fill:#fff9c4
    style F fill:#ffccbc
```

**Key Improvements:**
- ✓**Unified Backend**: Single FastAPI server replaces multiple Python services
- ✓**Pure ES6 Modules**: No more IIFE patterns or global pollution
- ✓**Single API Client**: Consolidated from 3 different clients
- ✓**Multi-RAD Support**: Monitor multiple recommendation systems
- ✓**Simplified Architecture**: Fewer moving parts, easier maintenance

## Essential Commands

```bash
# Check if everything's configured right
./scripts/verify-config.sh

# Test the proxy
curl https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy

# Test authentication flow
open test-auth-flow.html    # Test auth system independently

# Redeploy proxy (if you change proxy.js)
cd proxy-service && npx netlify deploy --prod

# Run tests
npm test              # JavaScript tests
npm run test:all      # Everything

# Generate static dashboard (for GitHub Actions)
npm run generate
```

## Test Baseline Management

The project includes a comprehensive test baseline system for managing test execution and tracking progress at both file and individual test levels:

```bash
# Create a new test baseline (runs all tests and records results)
python bin/test_baseline_manager.py create

# Check current baseline status
python bin/test_baseline_manager.py status

# Run only INDIVIDUAL tests that passed in the baseline (NEW!)
python bin/test_baseline_manager.py passed

# Run only INDIVIDUAL tests that failed in the baseline (NEW!)
python bin/test_baseline_manager.py failed

# Run only test FILES that passed in the baseline
python bin/test_baseline_manager.py passed-files

# Run only test FILES that failed in the baseline
python bin/test_baseline_manager.py failed-files

# Show detailed individual test names (verbose mode)
python bin/test_baseline_manager.py status -v
```

**Key Features:**
- **Individual Test Tracking**: Extracts specific test names from Vitest, Pytest, and BATS output
- **Granular Test Execution**: Run specific individual tests that passed/failed, not just entire files
- **Smart Test Grouping**: Groups individual tests by file and runs only necessary files
- **Dual-Level Control**: Choose between individual test level or file level execution
- **Progress Tracking**: Monitor improvement at individual test case level

**Sample Output (Individual Test Mode):**
```
🟢 Running 592 passed individual tests from baseline...

Running individual tests from 30 test files...

Running individual tests from: tests/uiUpdates.test.js
  Target tests: 11
    ✓ should update summary card counts
    ✓ should update timestamp
    ✓ should handle empty results
    ✓ should handle missing DOM elements gracefully
    ✓ should call updateTable with results
    ✓ should handle positive scores correctly
    ... (5 more passed tests)
```

**Baseline Statistics:**
```
Test Baseline Status
Total test files: 65
Total individual tests: 287

Test Files:
  ✓ Passed: 12 (18.5%)
  ✗ Failed: 53 (81.5%)

Individual Tests:
  ✓ Passed: 156 (54.4%)
  ✗ Failed: 131 (45.6%)
```

For complete documentation, see [README_test_baseline.md](README_test_baseline.md).

## Configuration

### NEW: Centralized Configuration Management

The application now uses a centralized YAML-based configuration system:

**Main configuration file**: `config/config.yaml`
```yaml
app_name: RAD Monitor
environment: development

elasticsearch:
  url: https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243/
  cookie: null  # Set via ELASTICSEARCH__COOKIE env var
  index_pattern: traffic-*

server:
  host: 0.0.0.0
  port: 8000
  workers: 1
```

**Key features:**
- Single source of truth for all settings
- Environment variable overrides using `SECTION__KEY` format
- Type validation with Pydantic
- Easy environment switching
- Configuration CLI for management

**Quick commands:**
```bash
# Show current config
python bin/config_cli.py show

# Set a value
python bin/config_cli.py set server.port 8080

# Validate configuration
python bin/config_cli.py validate

# Interactive setup
python bin/config_cli.py setup
```

See [Configuration Guide](docs/CONFIGURATION_GUIDE.md) for complete documentation.

### Legacy Configuration Files

**`config/production.json`** - Still used for GitHub Pages deployment
```json
{
  "corsProxy": {
    "url": "https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
  },
  "elasticsearch": {
    "path": "/api/console/proxy?path=traffic-*/_search&method=POST"
  }
}
```

**Don't change these**:
- The proxy URL (unless you deploy a new one)
- The index pattern (`traffic-*`)
- The Kibana proxy path format

## Production Deployment

### FastAPI Server Deployment (Enhanced)

The production system now uses a FastAPI server with improved configuration management:

#### 1. Prepare Environment (NEW: Simplified)
```bash
# Setup production configuration
./scripts/setup/setup_env.sh production

# Set required environment variables
export ELASTICSEARCH__COOKIE=your_production_cookie
export SECURITY__SECRET_KEY=$(openssl rand -hex 32)
export ALLOWED_HOSTS='["production.domain.com"]'
```

#### 2. Deploy Server

**Option A: Docker Compose (Recommended)**
```bash
# Start production with all services
./scripts/docker/start-prod.sh

# Services included:
# - Main application (with 4 workers)
# - Redis for caching
# - Nginx reverse proxy
# - Prometheus monitoring
# - Grafana dashboards

# Access:
# - Application: https://your-domain.com
# - Prometheus: http://your-domain.com:9090
# - Grafana: http://your-domain.com:3001
```

**Option B: Traditional Deployment**
```bash
# Run deployment script
./deploy-production.sh

# Options:
# For systemd service:
CREATE_SYSTEMD_SERVICE=true ./deploy-production.sh

# Manual with uvicorn:
uvicorn bin.server:app --host 0.0.0.0 --port 8000 --workers 4
```

#### 3. Management Commands

```bash
# View logs
docker-compose --profile production logs -f app

# Backup configuration
docker-compose run --rm config-cli backup

# Update configuration
docker-compose run --rm config-cli set server.workers 8

# Health check
curl https://your-domain.com/health
```

### GitHub Pages (Static Files)
Pushes to `main` automatically deploy the static files via GitHub Actions. The static site connects to your FastAPI server.

## Authentication

The dashboard needs a Kibana session cookie. The cookie:
- Expires after 24 hours (auto-cleared)
- Can be entered as `Fe26.2**...` or `sid=Fe26.2**...` (proxy handles both)
- Gets stored in localStorage with automatic expiry
- Shows a clean modal UI for entry (no browser prompts)
- Only prompts once per session (no authentication loops)

## Common Issues

**"Invalid cookie header"**
- Your cookie expired. Click "Set Cookie" button to enter a fresh one from Kibana.

**No data showing**
- Check the browser console
- Make sure you're looking at `traffic-*` indices
- Verify time range isn't too restrictive

**CORS errors**
- The proxy might be down. Test it with curl (see commands above)
- Redeploy the proxy if needed

**Wrong index pattern errors**
- Run `./scripts/verify-config.sh` to check configuration
- Make sure all configs use `traffic-*` not `usi*`

## Troubleshooting

### Common Errors

1. **Module syntax errors** (`Unexpected token 'export'`)
   - Fixed: Removed duplicate script loading in index.html

2. **API 404 errors** (`POST /api/v1/query 404`)
   - Fixed: Updated to correct endpoint `/api/v1/dashboard/query`

3. **Authentication issues**
   - The cookie modal now validates cookies before saving
   - Invalid cookies show error messages instead of loops

For more details, see [README_detailed.md](README_detailed.md#known-issues--solutions).

## What This Monitors

The dashboard tracks RAD events matching this pattern:
- `pandc.vnext.recommendations.feed.feed*`

It compares:
- Current period: Last 12 hours (configurable)
- Baseline: June 1-9, 2025 (8 days)

Status levels:
- 🔴 **CRITICAL**: Traffic dropped >80%
- 🟡 **WARNING**: Traffic dropped 50-80%
- 🟢 **NORMAL**: Traffic looks fine
- 🔵 **INCREASED**: Traffic is up

## WAM General ET Monitoring

### Overview
The WAM (Web Analytics Module) implementation provides real-time visitor tracking using HyperLogLog++ cardinality estimation. It's integrated into the dashboard for monitoring EID-level traffic patterns.

### Quick Start
```bash
# Start the local WAM visualizer
./start-wam.sh

# Open in browser
http://localhost:8000/wam-visualizer.html
```

### Features
- **Real-time EID monitoring** with configurable time ranges (1h to 30d)
- **Baseline comparison** showing historical patterns with percentile ranges
- **Smooth transitions** between time periods
- **Dark mode** with automatic theme detection
- **Configurable settings** for all parameters via UI

### Architecture
```
wam-visualizer.html          # Main interface
├── wam-visualizer/
│   ├── wam-service.js      # Data fetching & baseline calculation
│   └── wam-chart.js        # Chart.js visualization component
└── server/
    └── elasticsearch-proxy.mjs  # Local proxy with auth validation
```

### Configuration
All settings accessible via the Configure button:
- API endpoints and proxy URL
- EID patterns and field mappings
- Visualization parameters (smoothness, point size, etc.)
- Baseline calculation weeks

### Key Improvements
- Fixed calendar_interval vs fixed_interval for different time ranges
- Baseline now properly aligns with current data intervals
- Removed unique visitors line for cleaner visualization
- Production-ready proxy with comprehensive error handling

## Formula Builder

The dashboard includes a powerful formula builder for creating custom monitoring rules:

- **Visual Builder**: Drag-and-drop interface for non-technical users
- **Direct Editor**: Monaco-like editor with autocomplete for power users
- **Pre-built Templates**: Common monitoring patterns ready to use
- **AI Assistant**: Natural language formula generation with MCP integration

For documentation:
- **User Guide**: See [FORMULA_BUILDER_GUIDE.md](FORMULA_BUILDER_GUIDE.md) for how to use the formula builder
- **Technical Reference**: See [FORMULA_BUILDER_TECHNICAL_REFERENCE.md](FORMULA_BUILDER_TECHNICAL_REFERENCE.md) for API and development details

## MCP Integration (Model Context Protocol)

The project includes MCP servers for AI-powered interactions through Cursor:

### Available MCPs

1. **Formula Builder MCP** (`mcp-formula-builder/`)
   - Generate formulas from natural language
   - Validate and explain formulas
   - Convert to Elasticsearch queries

2. **Elasticsearch MCP** (`mcp-elasticsearch/`)
   - Execute queries on traffic indices
   - Monitor RAD traffic drops
   - Analyze root causes
   - Check index health

3. **Data Service MCP** (`mcp-data-service/`)
   - Fetch metrics with formulas
   - Analyze traffic patterns
   - Validate connections

### Quick Setup

```bash
# Install Formula Builder MCP
cd mcp-formula-builder
npm install

# Add to Cursor settings.json:
{
  "mcpServers": {
    "vh-rad-formula": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-formula-builder/index.js"]
    }
  }
}
```

Now you can ask Cursor:
- "Generate a formula to detect traffic drops"
- "Explain what this formula does: count() / count(shift='1d')"
- "Validate my formula syntax"

See [MCP_INTEGRATION_GUIDE.md](MCP_INTEGRATION_GUIDE.md) for complete setup and usage.

## Project Structure

```
.
├── index.html                    # The dashboard
├── assets/js/
│   ├── api-client-unified.js     # Handles API calls
│   └── config-service.js         # Loads configuration
├── config/
│   ├── production.json           # Production settings
│   ├── settings.json             # Local settings
│   └── local-dev.json            # Local WAM development
├── proxy-service/
│   └── netlify/functions/
│       └── proxy.js              # CORS proxy function
├── wam-visualizer.html           # WAM monitoring interface
├── wam-visualizer/
│   ├── wam-service.js            # Data service for WAM
│   └── wam-chart.js              # Chart visualization
├── server/
│   └── elasticsearch-proxy.mjs   # Local proxy server
├── scripts/
│   └── verify-config.sh          # Config checker
├── start-wam.sh                  # Start WAM visualizer
└── stop-wam.sh                   # Stop WAM services
```

## Need Help?

1. Check the console for errors
2. Run `./scripts/verify-config.sh`
3. Test the proxy is alive
4. Make sure your cookie is fresh

That's it. Keep it simple. Monitor your traffic. Fix issues fast.