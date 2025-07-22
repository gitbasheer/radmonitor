# Broken Tests - TODO

These test files have imports from the deleted `src/` directory and need to be updated or removed.

## Affected Files

### 1. `test_centralized_config.py`
- **Issue**: Imports from `src.config.centralized_config`
- **Status**: Module no longer exists
- **Action**: Remove or rewrite to test `config-service.js` functionality

### 2. `test_config_api.py`
- **Issue**: Imports from `src.api.config_api`
- **Status**: Functionality moved to `bin/server.py`
- **Action**: Update to test the `/api/v1/config/*` endpoints directly

### 3. `test_data_models.py`
- **Issue**: Imports from `src.data.models`
- **Status**: Models are now inline in `bin/server.py`
- **Action**: Either remove or create new models test

### 4. `test_multi_rad_support.py`
- **Issue**: Imports from `src.data.processors.multi_rad`
- **Status**: Functionality is in JavaScript now
- **Action**: Convert to JavaScript tests or remove

## Recommendation

Since the `src/` directory was removed and functionality was either:
1. Moved to `bin/server.py` (backend)
2. Moved to JavaScript modules (frontend)

These Python tests are no longer relevant in their current form. They should be:
- Removed if the functionality is fully tested elsewhere
- Rewritten as API integration tests if testing backend
- Converted to JavaScript tests if testing frontend

## Temporary Fix

For now, these files should be excluded from test runs to prevent failures.