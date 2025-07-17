# Old Code to Retire

This document lists the old code that has been successfully replaced and can be safely retired.

## Successfully Replaced Code

### 1. Bash Script for Kibana Data Fetching
- **File**: `src/data/fetch_kibana_data.sh`
- **Replaced by**: FastAPI endpoint `POST /api/fetch-kibana-data` in `dev_server_fastapi.py`
- **Status**: ✅ Fully tested and working
- **Benefits of new implementation**:
  - Type-safe request/response validation
  - Built-in caching with 5-minute TTL
  - Performance tracking via WebSocket
  - Comprehensive error handling
  - Full test coverage

### 2. Incomplete Config Management
- **File**: `src/config/settings.py`
- **Status**: ✅ Can be removed - incomplete implementation requiring pydantic_settings
- **Current approach**: Using environment variables in `process_data.py`
- **Future**: Can be reimplemented properly when needed

### 3. Old Script Libraries (Partially)
- **Files**: Parts of scripts in `scripts/lib/` that are only used by `fetch_kibana_data.sh`
- **Status**: ⚠️ Need to verify dependencies before removing

## Code to Keep

### Still in Use:
1. `cors_proxy.py` - Still needed for local development
2. `src/data/processors/` - All Python processors are working and tested
3. `src/data/models.py` - Data models are in use
4. `src/data/process_data.py` - Main data processing script (with settings.py import removed)
5. ✅ `scripts/generate_dashboard_refactored.sh` - **MIGRATED** to `generate_dashboard.py` (wrapper remains for compatibility)
6. All JavaScript files in `assets/js/` - Frontend still uses these

### Enhanced Versions (Keep Both):
1. `cors_proxy_enhanced.py` - Enhanced version with FastAPI
2. `dev_server_fastapi.py` - FastAPI development server
3. `assets/js/api-client-fastapi.js` - FastAPI client

## Migration Status

| Component | Old Version | New Version | Status | Can Retire? |
|-----------|-------------|-------------|---------|--------------|
| Kibana Data Fetching | `fetch_kibana_data.sh` | FastAPI endpoint | ✅ Complete | Yes |
| Config Management | `settings.py` | Environment vars | ✅ Reverted | Yes |
| CORS Proxy | `cors_proxy.py` | `cors_proxy_enhanced.py` | ✅ Both work | No (keep both) |
| Dev Server | `dev_server.py` | `dev_server_fastapi.py` | ✅ Both work | No (keep both) |

## Retirement Plan

### Phase 1: Immediate Retirement
1. Remove `src/data/fetch_kibana_data.sh`
2. Remove `src/config/settings.py`
3. Update any scripts that reference the removed files

### Phase 2: Documentation Updates
1. Update README to remove references to retired scripts
2. Update FASTAPI_OPPORTUNITIES.md to mark migrations complete
3. Create migration guide for users

### Phase 3: Future Improvements
1. Migrate remaining bash scripts to Python/FastAPI
2. Implement proper configuration management with pydantic_settings
3. Consolidate duplicate functionality
