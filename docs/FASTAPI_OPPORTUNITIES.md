# FastAPI & Pydantic v2 Implementation Opportunities

This document outlines opportunities to enhance the RAD Monitor codebase with FastAPI and Pydantic v2 for better type safety, validation, and API design.

## 1. Development Server Enhancement (High Priority)

### Current State
- `dev_server.py` uses basic Python HTTP server
- No request validation or type safety
- Manual HTML template processing

### Proposed Enhancement
Convert `dev_server.py` to a FastAPI application:

```python
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional
import uvicorn

class DashboardConfig(BaseModel):
    """Dashboard configuration model"""
    baseline_start: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    baseline_end: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    time_range: str = "now-12h"
    critical_threshold: int = Field(default=-80, le=0)
    warning_threshold: int = Field(default=-50, le=0)

app = FastAPI(title="RAD Monitor Dev Server")

# Mount static files
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """Serve the dashboard with real-time data"""
    # Process template with validated config
    pass

@app.post("/api/config", response_model=DashboardConfig)
async def update_config(config: DashboardConfig):
    """Update dashboard configuration with validation"""
    pass
```

### Benefits
- Auto-generated API documentation at `/docs`
- Request/response validation
- Better error handling
- WebSocket support for real-time updates

## 2. Data Processing Pipeline (High Priority)

### Current State
- `src/data/process_data.py` uses dictionaries without validation
- Configuration passed as environment variables
- No type hints for complex data structures

### Proposed Enhancement
Create Pydantic models for the entire data pipeline:

```python
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import List, Dict, Any

class ProcessingConfig(BaseModel):
    """Configuration for data processing"""
    baseline_start: datetime
    baseline_end: datetime
    current_time_range: str = "now-12h"
    high_volume_threshold: int = Field(gt=0)
    medium_volume_threshold: int = Field(gt=0)
    critical_threshold: int = Field(le=0)
    warning_threshold: int = Field(le=0)

    @validator('current_time_range')
    def validate_time_range(cls, v):
        # Validate time range format
        pass

class TrafficEvent(BaseModel):
    """Model for a traffic event"""
    event_id: str
    display_name: str
    current_count: int = Field(ge=0)
    baseline_count: int = Field(ge=0)
    baseline_period: float = Field(ge=0)
    daily_avg: float = Field(ge=0)
    score: int
    status: str = Field(..., pattern='^(CRITICAL|WARNING|NORMAL|INCREASED)$')

class ProcessingResult(BaseModel):
    """Result of data processing"""
    events: List[TrafficEvent]
    stats: Dict[str, int]
    timestamp: datetime
    metadata: Dict[str, Any] = {}
```

### Benefits
- Type safety throughout the pipeline
- Automatic validation of all data
- Better error messages
- Easier testing with model factories

## 3. Bash-to-Python Migration (Medium Priority)

### Current State
- Complex bash scripts for data fetching and processing
- Limited error handling and validation
- Difficult to test and maintain

### ✅ Completed: Kibana Data Endpoint
The `fetch_kibana_data.sh` script has been successfully migrated to FastAPI:

**New Endpoint:** `POST /api/fetch-kibana-data`

**Implemented Features:**
- ✅ Pydantic models for request/response validation
- ✅ Built-in caching with MD5-based keys (5-minute TTL)
- ✅ Performance tracking with WebSocket broadcasts
- ✅ Comprehensive error handling (auth, timeouts, ES errors)
- ✅ Automatic performance warnings (>3s warning, >5s critical)
- ✅ Full test coverage in `tests/test_kibana_endpoint.py`

**Usage:**
```python
@app.post("/api/fetch-kibana-data", response_model=KibanaResponse)
async def fetch_kibana_data(
    request: KibanaQueryRequest,
    x_elastic_cookie: str = Header(None, alias="X-Elastic-Cookie")
):
    """
    Fetch data from Kibana/Elasticsearch with typed validation.
    Includes caching, performance tracking, and error handling.
    """
    # Full implementation in dev_server_fastapi.py
```

**JavaScript Client:**
```javascript
const response = await FastAPIClient.fetchKibanaData(query, forceRefresh);
```

### Remaining Scripts to Migrate:
- ✅ `scripts/generate_dashboard_refactored.sh` - **MIGRATED to Python**
  - Now `generate_dashboard.py` with full backward compatibility
  - Wrapper script maintains all existing references
  - See `BASH_TO_PYTHON_MIGRATION.md` for details

### ✅ COMPLETED High Priority Migrations:
- ✅ `cleanup-ports.sh` → `cleanup_ports.py` - **MIGRATED**
  - Cross-platform port cleanup with proper process management
  - Available as CLI tool and API endpoint
  - Maintains backward compatibility via wrapper

- ✅ `validate_connections.sh` → `validate_connections.py` - **MIGRATED**
  - Direct Python imports for validation
  - JSON output for CI/CD integration
  - Available as CLI tool and API endpoint

- ✅ **Centralized API** (`centralized_api.py`) - **IMPLEMENTED**
  - Combines CORS proxy, utilities, and typed endpoints
  - Full FastAPI with automatic documentation
  - All utilities available as REST endpoints
  - See `UTILITIES_MIGRATION_COMPLETE.md` for details

### Medium Priority (Still TODO):
- `setup_and_run.sh` - Setup and configuration (74 lines)
  - Configuration management would be cleaner in Python
  - Could provide interactive setup wizard

### Keep as Bash (Low Priority):
- Runner scripts (`run_*.sh`) - Process orchestration works well in bash
- `run_all_tests.sh` - Test orchestration
- Library scripts in `scripts/lib/` - Functionality already migrated, keep for compatibility

See `BASH_SCRIPTS_ANALYSIS.md` for detailed analysis and migration recommendations.

## 4. Configuration Management API (Medium Priority)

### Current State
- Configuration scattered across files
- Environment variables and JSON files
- No centralized validation

### Proposed Enhancement
Create a configuration service:

```python
from fastapi import APIRouter
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings with validation"""
    elastic_cookie: str = Field(..., min_length=10)
    kibana_url: str = Field(default="https://...")
    baseline_days: int = Field(default=8, ge=1, le=30)

    class Config:
        env_file = ".env"

router = APIRouter(prefix="/api/config")

@router.get("/settings", response_model=Settings)
async def get_settings():
    """Get current settings"""
    pass

@router.put("/settings")
async def update_settings(settings: Settings):
    """Update and validate settings"""
    pass
```

## 5. GitHub Actions Data Processing (Low Priority)

### Current State
- Shell scripts process JSON data
- Limited validation of workflow inputs

### Proposed Enhancement
Create a Python CLI with Pydantic:

```python
from pydantic import BaseModel
import typer
from typing import Optional

class WorkflowConfig(BaseModel):
    """GitHub Actions workflow configuration"""
    schedule_cron: str = Field(..., pattern=r'^(\*|[0-9,\-/]+)\s+(\*|[0-9,\-/]+)...')
    elastic_cookie: str
    deploy_branch: str = "main"

app = typer.Typer()

@app.command()
def update_dashboard(
    config_file: Optional[str] = typer.Option(None),
    validate_only: bool = typer.Option(False)
):
    """Update dashboard with validation"""
    config = WorkflowConfig.parse_file(config_file)
    # Process with full validation
```

## 6. Test Data Generation (Low Priority)

### Current State
- Test data created manually in tests
- No consistency across test files

### Proposed Enhancement
Create Pydantic factories for test data:

```python
from pydantic_factories import ModelFactory

class TrafficEventFactory(ModelFactory[TrafficEvent]):
    """Factory for creating test traffic events"""
    __model__ = TrafficEvent

    @classmethod
    def baseline_count(cls) -> int:
        return random.randint(1000, 10000)

# In tests
def test_processing():
    events = TrafficEventFactory.build_batch(10)
    # All events are validated automatically
```

## Implementation Roadmap

### Phase 1: Enhanced Proxy (Completed ✅)
- Created `cors_proxy_enhanced.py` with FastAPI
- Added typed endpoints for common queries
- Maintained backward compatibility

### Phase 2: Data Pipeline (Next Priority)
1. Create Pydantic models for all data structures
2. Update `process_data.py` to use models
3. Add validation to all processors
4. Update tests to use model factories

### Phase 3: Dev Server
1. Convert `dev_server.py` to FastAPI
2. Add configuration API endpoints
3. Implement WebSocket for live updates
4. Create development dashboard at `/dev`

### Phase 4: Tooling
1. Create Python CLI to replace bash scripts
2. Add deployment validation tools
3. Create test data generators

## Benefits Summary

1. **Type Safety**: Catch errors at development time
2. **Validation**: Automatic validation of all inputs/outputs
3. **Documentation**: Auto-generated API docs
4. **Testing**: Easier to test with model factories
5. **Maintenance**: Cleaner, more maintainable code
6. **Performance**: Better error handling and optimization opportunities
7. **Developer Experience**: IntelliSense and better tooling support

## Example Migration

Before (dict-based):
```python
def process_event(event):
    if event.get('baseline_count', 0) > 0:
        score = calculate_score(
            event['current'],
            event['baseline_count']
        )
    # Manual validation, error-prone
```

After (Pydantic-based):
```python
def process_event(event: TrafficEvent) -> ScoredEvent:
    # Type hints, automatic validation
    score = calculate_score(
        event.current_count,
        event.baseline_count
    )
    return ScoredEvent(
        **event.dict(),
        score=score,
        status=determine_status(score)
    )
```

## Next Steps

1. Review and prioritize implementation phases
2. Create Pydantic models for Phase 2
3. Set up development environment for FastAPI
4. Begin incremental migration
5. Update documentation as we progress

## FastAPI Integration TODOs (Based on Test Failures)

### Not Fully Integrated Components

#### 1. WebSocket Connection Management ✅ FIXED
- **Issue**: WebSocket mock in tests expects `onopen`, `onerror`, `onmessage`, `onclose` to be functions, but implementation assigns them as properties
- **FIXED**: Updated to use `addEventListener` instead of property assignment
- **Location**: `assets/js/api-client-fastapi.js` lines 30-60

#### 2. WebSocket Message Handling ✅ FIXED
- **Issue**: Tests expect ping/pong messages to be sent properly, but mock doesn't handle this correctly
- **FIXED**: Implemented proper ping/pong heartbeat mechanism
- **FIXED**: Fixed message sending to handle both string and object inputs
- **Location**: `assets/js/api-client-fastapi.js` lines 72-77, 131-133

#### 3. Configuration Validation
- **Issue**: Validation error messages don't match expected format
- **TODO**: Align validation error messages between client and server
- **Expected**: `baseline_end must be after baseline_start`
- **Actual**: Missing this validation in client-side validator
- **Location**: `assets/js/api-client-fastapi.js` lines 339-369

#### 4. Initialize Method
- **Issue**: Initialize method expects WebSocket callbacks to be functions but they're assigned as properties
- **TODO**: Refactor WebSocket initialization to use addEventListener pattern
- **Location**: `assets/js/api-client-fastapi.js` lines 383-404

#### 5. Missing Dashboard Integration
- **Issue**: FastAPI client is not integrated with main dashboard code
- **TODO**: Add initialization code in `dashboard-main.js` to optionally use FastAPI client
- **TODO**: Add feature flag to enable/disable FastAPI mode
- **TODO**: Create adapter layer to translate between existing API and FastAPI client

#### 6. Real-time Updates Integration
- **Issue**: WebSocket real-time updates not connected to UI
- **TODO**: Connect WebSocket message handlers to UIUpdater
- **TODO**: Implement automatic dashboard refresh on config/stats messages
- **TODO**: Add connection status indicator to UI

#### 7. Error Handling Integration
- **Issue**: FastAPI error responses not properly handled in UI
- **TODO**: Map FastAPI validation errors to user-friendly messages
- **TODO**: Show connection errors in UI status bar
- **TODO**: Implement retry logic with exponential backoff

#### 8. Performance Metrics Integration
- **Issue**: Performance metrics WebSocket messages not connected to DataLayer
- **TODO**: Route performance_metrics messages to DataLayer.logAction
- **TODO**: Update performance widget to show FastAPI server metrics
- **TODO**: Add server-side metrics to performance dashboard

#### 9. Cookie Management Integration
- **Issue**: `getElasticCookie` method doesn't align with main app's cookie handling
- **TODO**: Use existing cookie management functions from dashboard.js
- **TODO**: Sync cookie storage between FastAPI client and main app
- **Location**: `assets/js/api-client-fastapi.js` lines 254-272

#### 10. Environment Detection
- **Issue**: No automatic detection of FastAPI server availability
- **TODO**: Add health check on app startup to detect if FastAPI server is running
- **TODO**: Automatically fall back to existing implementation if FastAPI not available
- **TODO**: Add console message indicating which mode is active

### Implementation Priority

1. **High Priority** (Blocking tests):
   - Fix WebSocket event handler assignment (items 1, 4)
   - Fix message handling and JSON serialization (item 2)
   - Align validation messages (item 3)

2. **Medium Priority** (Feature completeness):
   - Dashboard integration (item 5)
   - Real-time updates (item 6)
   - Cookie management alignment (item 9)

3. **Low Priority** (Enhancements):
   - Error handling improvements (item 7)
   - Performance metrics (item 8)
   - Environment detection (item 10)

### Testing Improvements Needed

1. **Mock Alignment**: Update test mocks to better match actual WebSocket API
2. **Integration Tests**: Add tests that verify FastAPI client works with main dashboard
3. **Feature Flag Tests**: Test both FastAPI and legacy modes
4. **Error Scenario Tests**: Add more comprehensive error handling tests

### Migration Strategy

1. Fix the immediate test failures without changing core functionality
2. Add feature flag to enable FastAPI mode: `window.USE_FASTAPI_SERVER = false`
3. Create adapter layer that implements existing API interface using FastAPI client
4. Gradually migrate features behind the feature flag
5. Once stable, make FastAPI the default with legacy as fallback
