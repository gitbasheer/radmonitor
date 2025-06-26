# Bash Scripts Analysis and Migration Recommendations

## Overview

The RAD Monitor project contains 18 bash scripts. After the successful migration of `generate_dashboard_refactored.sh` to Python, here's an analysis of the remaining scripts and recommendations for migration.

## Scripts by Category

### 1. **Runner/Launcher Scripts** (Low Priority for Migration)

These scripts primarily start services and coordinate multiple processes:

- **`run_with_cors.sh`** - Starts CORS proxy and HTTP server
- **`run_enhanced_cors.sh`** - Starts enhanced CORS proxy with FastAPI
- **`run_fastapi_dev.sh`** - Starts FastAPI development server
- **`test_locally.sh`** - Runs local tests
- **`run_all_tests.sh`** - Comprehensive test runner

**Recommendation**: Keep as bash. These are simple process orchestrators that work well as shell scripts.

### 2. **Utility Scripts** (Good Candidates for Migration)

#### **`cleanup-ports.sh`** ⭐ HIGH PRIORITY
- **Purpose**: Kills processes on ports 8889 and 8000
- **Lines**: 25
- **Why migrate**: Simple logic, would benefit from better error handling
- **Python benefits**: Cross-platform compatibility, better process management

#### **`validate_connections.sh`** ⭐ HIGH PRIORITY
- **Purpose**: Validates project structure, imports, and configuration
- **Lines**: 233
- **Why migrate**: Complex validation logic, lots of Python checks
- **Python benefits**: Direct Python imports, better error reporting, unit testable

#### **`setup_and_run.sh`** ⭐ MEDIUM PRIORITY
- **Purpose**: Creates .env file and runs validation before starting
- **Lines**: 74
- **Why migrate**: Configuration management would be cleaner in Python
- **Python benefits**: Better config validation, template handling

### 3. **Configuration Files** (Not Scripts)

- **`config/dashboard.config.sh`** - Environment variables only
  - Already replaced by Python's DashboardConfig class
  - Keep for backward compatibility

### 4. **Library Scripts** (Already Migrated Functionality)

- **`scripts/lib/cookie_handler.sh`** - Cookie validation
  - Functionality already in `generate_dashboard.py`
- **`scripts/lib/error_handler.sh`** - Logging and error handling
  - Functionality already in `generate_dashboard.py`

**Recommendation**: Keep for backward compatibility but mark as deprecated

### 5. **Migration/Test Scripts** (One-time Use)

- **`migrate_to_refactored.sh`** - One-time migration script
- **`test_refactored.sh`** - Test script for refactored code
- **`ensure_correct_dashboard.sh`** - Dashboard verification

**Recommendation**: Keep as-is, these are temporary/migration scripts

### 6. **Legacy Scripts** (Deprecated)

Located in `scripts/legacy/`:
- `run_local.sh`
- `run_local_auto.sh`
- `run_with_cors_direct.sh`

**Recommendation**: These are already deprecated, no migration needed

## Migration Priority

### 🔴 High Priority (Migrate Soon)

1. **`cleanup-ports.py`** - Port cleanup utility
   ```python
   # Example implementation
   import psutil
   import sys

   def cleanup_ports(ports=[8889, 8000]):
       for port in ports:
           for conn in psutil.net_connections():
               if conn.laddr.port == port:
                   psutil.Process(conn.pid).terminate()
   ```

2. **`validate_connections.py`** - Project validation
   - Direct Python imports instead of subprocess
   - Structured validation results
   - Better error messages

### 🟡 Medium Priority (Consider Migration)

3. **`setup_and_run.py`** - Setup and configuration
   - Better .env file handling
   - Interactive configuration wizard
   - Validation before running

### 🟢 Low Priority (Keep as Bash)

- All runner scripts (`run_*.sh`)
- Test orchestration (`run_all_tests.sh`)
- Legacy and migration scripts

## Benefits of Migration

### For `cleanup-ports.py`:
- Cross-platform (works on Windows too)
- Better process management
- Can be imported and used programmatically
- Proper error handling and logging

### For `validate_connections.py`:
- Direct Python module imports
- Structured validation results (JSON output)
- Can be used in CI/CD pipelines
- Unit testable
- Better performance (no subprocess overhead)

### For `setup_and_run.py`:
- Interactive configuration wizard
- Better validation of configuration values
- Template management with Jinja2
- Can integrate with FastAPI config endpoints

## Implementation Plan

### Phase 1: Migrate High Priority Scripts
1. Create `cleanup_ports.py` with psutil
2. Create `validate_connections.py` with structured output
3. Update documentation

### Phase 2: Create Wrappers
Like with `generate_dashboard_refactored.sh`, create bash wrappers:
```bash
#!/bin/bash
# cleanup-ports.sh - Wrapper for backward compatibility
exec python3 cleanup_ports.py "$@"
```

### Phase 3: Update Integration
- Update runner scripts to use Python versions
- Add new Python scripts to test suite
- Update CI/CD workflows

## Summary

**Total Scripts**: 18
- **Already Migrated**: 1 (generate_dashboard_refactored.sh)
- **High Priority to Migrate**: 2
- **Medium Priority**: 1
- **Keep as Bash**: 8
- **Deprecated/Legacy**: 6

The most valuable migrations would be:
1. `cleanup-ports.sh` → `cleanup_ports.py` (better cross-platform support)
2. `validate_connections.sh` → `validate_connections.py` (better Python integration)

These migrations would improve maintainability, testability, and cross-platform compatibility while maintaining backward compatibility through wrapper scripts.
