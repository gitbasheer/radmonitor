# Parallel Developer Checklist

This checklist is for Developer 2 to work on while Developer 1 handles configuration/URL fixes from IMMEDIATE_FIXES_REQUIRED.md.

## Priority 1: Security Vulnerabilities (Day 1)

### Fix XSS Vulnerabilities - 149 innerHTML instances ⚠️ CRITICAL

**Setup:**
```bash
npm install dompurify
npm install @types/dompurify --save-dev
```

**Files to fix (start with most critical):**

#### A. User Data Display Files (HIGHEST RISK):
1. `assets/js/ui-updater.js` (19 instances)
   - Lines: 33, 69, 175, 177, 182, 185, 196, 198, 201, 218, 223, 226, 237, 239, 242, 259, 419, 489, 532
   - These display user-provided data!

2. `assets/js/dashboard-simplified.js` (3 instances)
   - Lines: 335, 614, 639
   - Dashboard displays event data

3. `assets/js/main-clean.js` (1 instance)
   - Line: 188
   - Main entry point

#### B. Component Files (HIGH RISK):
4. `assets/js/components/ux-components.js` (13 instances)
   - Multiple UI components that could display user content

5. `assets/js/components/auth-overlay.js` (1 instance)
   - Authentication forms

6. `assets/js/components/loading-overlay.js` (1 instance)
   - Loading states

#### C. Formula Builder (MEDIUM RISK):
7. `assets/js/formula-builder/ui/enhanced-visual-builder.js` (8 instances)
8. `assets/js/formula-builder/ui/enhanced-formula-editor.js` (6 instances)
9. `assets/js/formula-builder/ui/formula-editor.js` (8 instances)
10. `assets/js/formula-builder/integration/dashboard-connector.js` (9 instances)

**How to fix:**
```javascript
// BAD: XSS vulnerability
element.innerHTML = userInput;
element.innerHTML = `<div>${data.name}</div>`;

// GOOD: Safe alternatives
// Option 1: Use textContent for plain text
element.textContent = userInput;

// Option 2: Use DOMPurify for HTML content
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(htmlContent);

// Option 3: Create elements programmatically
const div = document.createElement('div');
div.textContent = data.name;
element.appendChild(div);
```

**Verification:**
```bash
# Should return 0 when complete
grep -r "\.innerHTML\s*=" assets/js/ --exclude-dir=node_modules | grep -v "DOMPurify.sanitize" | wc -l
```

## Priority 2: Missing API Endpoints (Day 1-2)

### Implement Formula Builder Backend ⚠️ CORE FEATURE BROKEN

**File:** `bin/server_enhanced.py`

**Endpoints to implement:**

1. **POST /api/formulas/validate** (Lines 515-540)
   ```python
   # Replace TODO with actual validation logic:
   - Parse formula syntax
   - Check function names are valid
   - Validate field references exist
   - Return specific error messages
   ```

2. **POST /api/formulas/execute** (Lines 486-509)
   ```python
   # Replace TODO with:
   - Convert formula to Elasticsearch query
   - Execute query
   - Return aggregated results
   ```

3. **GET /api/formulas/functions** (NEW)
   ```python
   @app.get("/api/v1/formulas/functions")
   async def get_formula_functions():
       """Return available formula functions"""
       return {
           "functions": [
               {"name": "sum", "args": ["field"], "description": "Sum values"},
               {"name": "avg", "args": ["field"], "description": "Average values"},
               {"name": "count", "args": [], "description": "Count documents"},
               {"name": "min", "args": ["field"], "description": "Minimum value"},
               {"name": "max", "args": ["field"], "description": "Maximum value"},
               # Add more functions
           ]
       }
   ```

4. **GET /api/formulas/fields** (NEW)
   ```python
   @app.get("/api/v1/formulas/fields")
   async def get_formula_fields(cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")):
       """Get available fields from Elasticsearch mapping"""
       # Query ES for field mappings
       # Return field names and types
   ```

5. **POST /api/formulas/save** (NEW)
   ```python
   @app.post("/api/v1/formulas/save")
   async def save_formula(formula: FormulaRequest):
       """Save formula for later use"""
       # Store in Redis or local file
       # Return formula ID
   ```

6. **GET /api/formulas/history** (NEW)
   ```python
   @app.get("/api/v1/formulas/history")
   async def get_formula_history():
       """Get saved formulas"""
       # Return list of saved formulas
   ```

**Test endpoints:**
```bash
# Test each endpoint
curl -X POST http://localhost:8000/api/v1/formulas/validate \
  -H "Content-Type: application/json" \
  -d '{"formula": "sum(value)"}'
```

## Priority 3: Clean Up Unused Files (Day 2)

### Delete obsolete files to reduce confusion

**Commands to run:**
```bash
# 1. Remove archive directory (old backups)
rm -rf archive/

# 2. Remove old backend files
rm -f bin/dev_server.py
rm -f bin/cors_proxy.py
rm -f bin/centralized_api.py
rm -f bin/dev_server_fastapi.py

# 3. Remove old API clients (after verifying nothing uses them)
rm -f assets/js/api-client.js
rm -f assets/js/api-client-fastapi.js
rm -f assets/js/api-client-simplified.js

# 4. Remove broken test files
rm -f tests/test_centralized_config.py
rm -f tests/test_config_api.py
rm -f tests/test_data_models.py
rm -f tests/test_multi_rad_support.py

# 5. Remove test HTML files
rm -f demo-antares-features.html
rm -f enhanced-formula-builder-demo.html
rm -f formula-builder-demo.html
rm -f formula-editor-demo.html
rm -f test-*.html
rm -f kibana-cookie-sync.html

# 6. Remove phase documentation
rm -f PHASE_*.md

# 7. Remove old analysis files
rm -f *_AUDIT.md
rm -f *_STATUS.md
rm -f POST_MORTEM_*.md
```

**Verify:**
```bash
# Count files before and after
find . -type f -name "*.js" -o -name "*.py" -o -name "*.html" | wc -l
```

## Priority 4: Memory Leak Fixes (Day 2-3)

### Fix memory leaks in critical files

**Pattern to look for and fix:**

1. **Unbounded caches:**
   ```javascript
   // BAD: Cache grows forever
   const cache = {};
   function addToCache(key, value) {
     cache[key] = value;
   }

   // GOOD: Bounded cache with LRU
   const cache = new Map();
   const MAX_CACHE_SIZE = 1000;
   function addToCache(key, value) {
     if (cache.size >= MAX_CACHE_SIZE) {
       const firstKey = cache.keys().next().value;
       cache.delete(firstKey);
     }
     cache.set(key, value);
   }
   ```

2. **Event listeners not cleaned up:**
   ```javascript
   // BAD: Listener never removed
   element.addEventListener('click', handler);

   // GOOD: Store reference and clean up
   const controller = new AbortController();
   element.addEventListener('click', handler, { signal: controller.signal });
   // In cleanup:
   controller.abort();
   ```

3. **Timers not cleared:**
   ```javascript
   // BAD: Timer runs forever
   setInterval(updateData, 1000);

   // GOOD: Store and clear
   const timerId = setInterval(updateData, 1000);
   // In cleanup:
   clearInterval(timerId);
   ```

**Files to fix:**
- `assets/js/data-layer.js` - Unbounded cache
- `assets/js/api-client-unified.js` - WebSocket reconnect timer
- `assets/js/config-service.js` - Auto-sync timer
- `assets/js/dashboard-simplified.js` - Event listeners
- `assets/js/connection-status-manager.js` - Status check timer
- `assets/js/search-filter.js` - Filter event listeners
- `assets/js/ui-updater.js` - Update timers

**Add cleanup method to each module:**
```javascript
export function cleanup() {
  // Clear all timers
  if (updateTimer) clearInterval(updateTimer);

  // Remove all event listeners
  controller?.abort();

  // Clear caches
  cache.clear();

  // Remove global references
  window.MyModule = null;
}
```

## Priority 5: Fix Broken Tests (Day 3)

### Update or remove broken test files

1. **Update test imports:**
   ```javascript
   // OLD: Import from deleted src/
   import { something } from '../src/deleted-module';

   // NEW: Import from current location
   import { something } from '../assets/js/current-module.js';
   ```

2. **Create missing test utilities:**
   ```javascript
   // Create tests/utils/test-helpers.js
   export function setupTestEnvironment() {
     // Mock localStorage
     global.localStorage = {
       getItem: jest.fn(),
       setItem: jest.fn(),
       clear: jest.fn()
     };

     // Mock fetch
     global.fetch = jest.fn();
   }
   ```

3. **Run and fix tests incrementally:**
   ```bash
   # Run one test file at a time
   npm test -- tests/api-client-unified.test.js
   # Fix errors
   # Move to next file
   ```

## Verification Checklist

After completing each section, verify:

- [ ] **Security**: No innerHTML without DOMPurify
  ```bash
  grep -r "innerHTML" assets/js/ | grep -v "DOMPurify" | wc -l  # Should be 0
  ```

- [ ] **API Endpoints**: All 6 formula endpoints working
  ```bash
  curl http://localhost:8000/api/v1/formulas/functions  # Should return function list
  ```

- [ ] **File Cleanup**: Old files removed
  ```bash
  ls archive/ 2>/dev/null | wc -l  # Should error (directory doesn't exist)
  ```

- [ ] **Memory Leaks**: All modules have cleanup functions
  ```bash
  grep -r "export.*cleanup" assets/js/ | wc -l  # Should be > 10
  ```

- [ ] **Tests**: At least core tests passing
  ```bash
  npm test -- --passWithNoTests  # Should not error
  ```

## Communication

- Coordinate with Developer 1 on:
  - When ConfigService URL methods are ready (needed for some fixes)
  - When server_production.py is updated (for testing endpoints)
  - Any shared dependencies

- Update this checklist with ✅ as tasks are completed

## Estimated Timeline

- **Day 1**: Security fixes (morning), Start API endpoints (afternoon)
- **Day 2**: Finish API endpoints, File cleanup, Start memory leaks
- **Day 3**: Finish memory leaks, Fix tests
- **Total**: 3 days for critical fixes

**Note**: This addresses different issues than Developer 1, allowing true parallel work.
