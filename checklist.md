# Project Completion Checklist: vh-rad-traffic-monitor

## Overview
This checklist consolidates all tasks needed to complete the vh-rad-traffic-monitor project, including technical debt cleanup, feature enhancements, and the new multi-RAD tracking capability.

## Current Progress Summary
- **Phase 1: Immediate Cleanup** - (✓)**COMPLETED**
- **Phase 2: Multi-RAD Support** - (✓)**COMPLETED**
- **Phase 3: Backend Consolidation** - (✓)**COMPLETED** (All Python backend files removed/consolidated)
- **Phase 4: Frontend Consolidation** - ⚡ **IN PROGRESS** (API Client unified, legacy cleanup needed)
- **Phase 5-11**: Not started

**Overall Progress**: ~35% Complete (4 of 11 phases started, 3 fully completed)

## Priority Legend
- 🔴 **CRITICAL**: Blocking issues or high-impact improvements
- 🟡 **HIGH**: Important for stability and maintainability
- 🟢 **MEDIUM**: Enhances user experience or developer experience
- 🔵 **LOW**: Nice-to-have improvements

---

## Phase 1: Immediate Cleanup (1-2 days) (✓)COMPLETED

### 🔴 Delete Dead Code
- [x] Remove `assets/js/api-client-enhanced.js`
- [x] Remove `assets/css/dashboard-consolidated.css`
- [x] Remove `bin/cors_proxy_enhanced.py`
- [x] Remove `backup_templates_20250625_144246/` directory (old backups)
- [x] Clean up commented-out code in all files

### 🔴 Fix Critical Bugs
- [x] Remove `cors_proxy.py` launch from `dev_server_fastapi.py` (line where it starts subprocess)
- [x] Fix authentication error handling to prevent UI lockup
- [x] Fix test timing issues in `integration.test.js`
- [x] Fix health endpoint in `dev_server_fastapi.py` (KeyError: 'summary')
- [x] Update all CORS proxy references from port 8889 to 8000

---

## Phase 2: Multi-RAD Support Implementation (3-5 days) (✓)COMPLETED

### 🔴 Backend Changes for Multi-RAD Support

#### Configuration Updates (✓)COMPLETED
- [x] Update `config/settings.json` to support multiple RAD types:
  - [x] Added `rad_types` with venture_feed, cart_recommendations, product_recommendations
  - [x] Each type has pattern, display_name, enabled, color, and description fields

#### Data Model Updates (✓)COMPLETED
- [x] Update `src/data/models.py`:
  - [x] Add `rad_type` field to `TrafficEvent` model
  - [x] Add `RADTypeConfig` model for configuration
  - [x] Update validation to handle different RAD patterns (more flexible)

#### Query Builder Updates (✓)COMPLETED
- [x] Modify Elasticsearch query generation to support multiple patterns
  - [x] Updated `assets/js/data-layer.js` trafficAnalysis query template
  - [x] Added `multiWildcard` method to QueryBuilder for OR logic
- [x] **Update Python query generation** in `bin/generate_dashboard.py` (line 183)
  - [x] Replaced hardcoded pattern with dynamic RAD type loading

### 🔴 Frontend Changes for Multi-RAD Support

#### Configuration Service Updates (✓)COMPLETED
- [x] **Update `assets/js/config-service.js`**:
  - [x] Added `rad_types` to `getDefaultConfig()` function
  - [x] Updated `loadFromBackend()` function to include `rad_types`

#### Data Processing Updates (✓)COMPLETED
- [x] **Update `assets/js/data-processor.js`**:
  - [x] Added `determineRadType` function to identify RAD type from event ID
  - [x] Added `getDisplayName` function to handle multiple RAD type prefixes
  - [x] Updated `processData` function to add `rad_type` field to each event
  - [x] Updated display name generation to handle multiple RAD types

#### UI Components (✓)COMPLETED
- [x] **Add RAD type selector dropdown**:
  - [x] Added RAD type filter buttons to `index.html` control panel section
  - [x] Created `initializeRadTypeFilters` function in `ui-updater.js`
  - [x] Wired up event handlers to filter data
- [x] **Update summary cards** in `assets/js/ui-updater.js`:
  - [x] Cards show overall stats (no breakdown needed for simplicity)
- [x] **Update data table**:
  - [x] Added RAD type column to table headers
  - [x] Display RAD type with color badge in each row
- [x] **Create RAD type filter buttons**:
  - [x] Added toggle buttons for each RAD type
  - [x] Updated `search-filter.js` to include RAD type filtering

#### JavaScript Updates (✓)COMPLETED
- [x] Update `search-filter.js`:
  - [x] Added RAD type filtering capability
  - [x] Updated search to work across RAD types
  - [x] Added method: `applyRadTypeFilter()`

#### API Updates (✓)COMPLETED
- [x] Update `api-interface.js`:
  - [x] Already passes selected RAD types to query builder
  - [x] `multiWildcard` handles multiple patterns automatically
- [x] Update other files with hardcoded patterns:
  - [x] `assets/js/api-client.js` (line 467) - Added comment noting it's legacy
  - [x] `assets/js/flexible-time-comparison.js` (line 32) - Updated to use ConfigService
  - [x] `config/queries/traffic_query.json` - Not used in current flow

### 🟢 Testing Updates (✓)COMPLETED
- [x] Created comprehensive test script `tests/test_multi_rad_support.py`:
  - [x] Tests RAD type configuration loading
  - [x] Tests pattern matching logic
  - [x] Tests query generation with multiple patterns
  - [x] Tests multi-RAD scenario
- [x] Created demo script `scripts/enable_multi_rad_demo.py`:
  - [x] Enables all RAD types for testing
  - [x] Can reset to defaults with `--reset` flag

---

## Phase 3: Backend Consolidation (3-5 days) (✓)COMPLETED

### 🔴 Server Consolidation (✓)COMPLETED
- [x] Create new `bin/server.py` combining:
  - [x] All endpoints from `centralized_api.py`
  - [x] WebSocket support from `dev_server_fastapi.py`
  - [x] Static file serving
  - [x] Built-in CORS handling
- [x] Update `dev_server_unified.py` to only launch new server
- [ ] **Fix uvicorn reload warning** (minor):
  - [ ] Update `bin/server.py` to use proper module import string
  - [ ] Currently shows: "WARNING: You must pass the application as an import string to enable 'reload' or 'workers'"
- [x] Delete obsolete files (✓)**COMPLETED**:
  - [x] `bin/dev_server.py` - (✓)Deleted
  - [x] `bin/cors_proxy.py` - (✓)Deleted
  - [x] `bin/centralized_api.py` - (✓)Deleted
  - [x] `bin/dev_server_fastapi.py` - (✓)Deleted
  - [x] All `src/` Python files - (✓)Entire directory structure removed

### 🟡 API Endpoint Standardization (✓)COMPLETED
- [x] Standardize all endpoints under `/api/v1/` prefix
- [x] Add OpenAPI documentation for all endpoints (via FastAPI)
- [x] Implement consistent error response format
- [x] Add request/response validation (via Pydantic models)

---

## Phase 4: Frontend Consolidation (3-5 days) ⚡ IN PROGRESS

### 🔴 API Client Unification (✓)COMPLETED
- [x] Create new `assets/js/api-client-unified.js`:
  - [x] Merge functionality from all existing clients
  - [x] Single query builder implementation
  - [x] Consistent error handling
  - [x] Auto-detect environment (local vs GitHub Pages)
  - [x] WebSocket support for local development
  - [x] Caching and performance metrics
  - [x] Authentication management
- [x] Update `api-interface.js` to use new unified client
- [x] Update `main.js` to export unified client
- [ ] **Monitor unified client for 1 week in production**
- [ ] **Update main.js to remove old API client imports**:
  - [ ] `main.js` lines 15-16 - Remove `ApiClient` and `FastAPIClient` imports
  - [ ] `main.js` lines 32-34 - Remove `window.ApiClient` and `window.FastAPIClient` assignments
- [ ] **Check and fix remaining old client references** (needs verification):
  - [ ] `dashboard-main.js` - (✓)Already using unified client via api-interface.js
  - [ ] `data-layer.js` - needs verification
  - [ ] `fastapi-integration.js` - needs verification
- [ ] **Delete old API clients** (after thorough testing):
  - [ ] `api-client.js` (after migration complete)
  - [ ] `api-client-fastapi.js` (after migration complete)

### 🟡 Module System Modernization
- [ ] **High Priority IIFE Conversions** (blocking other fixes):
  - [ ] `dashboard-main.js` - Hybrid ES6/IIFE pattern (line 17: `export const Dashboard = (() => {`)
  - [ ] Files in `assets/js/` with window assignments (37 files found)
- [ ] **Remove global object pollution**:
  - [ ] `main.js` lines 27+ - Remove all `window.X = X` assignments
  - [ ] Replace with proper ES6 import/export only
- [ ] **Convert remaining IIFE patterns to pure ES6 modules**:
  - [ ] Systematic conversion of 37 files with `window.` assignments
  - [ ] Remove `(function() { ... })()` patterns
  - [ ] Update index.html to use proper module imports

### 🟢 Extract Inline JavaScript
- [ ] Move inline JS from `index.html` to separate modules
- [ ] Create `modal-handler.js` for modal functionality
- [ ] Update event handlers to use addEventListener

---

## Phase 5: Testing & Quality (7-10 hours) 🚨 **CRITICAL**

**Current Status**: All 32 test files failing due to Agent 1's ES6 migration
**Root Cause**: Import path mismatches after IIFE cleanup
**Strategy**: Emergency fixes → Stabilization → Quality gates

### 🚨 **Sub-Phase 5A: Emergency Test Fixes** (2-3 hours)
**CRITICAL**: Must start immediately after Agent 1 completes Phase C

- [ ] **Create missing `tests/utils/test-helpers.js`**:
  - [ ] `setupTestEnvironment()` function
  - [ ] `cleanupTestEnvironment()` function
  - [ ] `setupTestAuthentication()` function
  - [ ] `setupTestConfiguration()` function
- [ ] **Fix 5 highest priority test imports**:
  - [ ] `tests/integration.test.js` - Update ES6 imports
  - [ ] `tests/dataProcessing.test.js` - Fix module imports
  - [ ] `tests/authentication.test.js` - Update ConfigService imports
  - [ ] `tests/flexibleTimeComparison.test.js` - Fix API client imports
  - [ ] `tests/refactored-modules.test.js` - Update module system tests

### 🔴 **Sub-Phase 5B: Test Stabilization** (3-4 hours)
**Goal**: Achieve >50% test pass rate

- [ ] **Fix API Client Tests**:
  - [ ] Update all tests to use `api-client-unified.js`
  - [ ] Remove references to old `api-client.js` and `api-client-fastapi.js`
  - [ ] Update mocks for unified API pattern
- [ ] **Fix Configuration Tests** (depends on Agent 1's config-service.js):
  - [ ] Update ConfigService ES6 import paths
  - [ ] Mock new ConfigService exports properly
  - [ ] Test new configuration API
- [ ] **Fix Core Module Tests**:
  - [ ] Update DataLayer ES6 exports and mocks
  - [ ] Fix Dashboard ES6 import patterns
  - [ ] Update UI component test imports

### 🟡 **Sub-Phase 5C: Quality Gates** (2-3 hours)
**Goal**: Establish sustainable testing practices

- [ ] **Complete test utilities structure**:
  - [ ] `tests/utils/async-helpers.js` - Promise and timing utilities
  - [ ] `tests/utils/mock-data.js` - Standardized test data sets
  - [ ] `tests/utils/dom-helpers.js` - DOM testing utilities
- [ ] **Add test scripts to package.json**:
  - [ ] `test:unit` - Run unit tests only
  - [ ] `test:integration` - Run integration tests only
  - [ ] `test:watch` - Watch mode for development
  - [ ] `test:coverage` - Coverage reporting
- [ ] **Set realistic coverage targets**:
  - [ ] Reduce coverage thresholds from 70% to 50%
  - [ ] Focus on critical path coverage first
  - [ ] Document coverage improvement plan

### 🟢 **Code Quality Tools** (After tests stable)
- [ ] Add ESLint configuration
- [ ] Add Prettier configuration
- [ ] Set up pre-commit hooks
- [ ] Add Python linting (flake8/black)

---

## Phase 6: Security Enhancements (2-3 days) 🚨 **CRITICAL VULNERABILITIES IDENTIFIED**

**Status**: Detailed security roadmap prepared (see PHASE_6_SECURITY_ROADMAP.md)
**Critical Issues**: localStorage XSS exposure, permissive CORS, no CSRF protection

### 🚨 **Sub-Phase 6A: Authentication Security** (Day 1)
**CRITICAL**: Fix localStorage XSS vulnerability

- [ ] **Migrate to secure httpOnly cookies**:
  - [ ] Replace localStorage.setItem('elasticCookie') with secure cookie endpoint
  - [ ] Implement /api/v1/auth/login with httpOnly, secure, SameSite flags
  - [ ] Update frontend to use credentials: 'include' for cookie handling
- [ ] **Implement session management**:
  - [ ] Create SessionManager class with automatic cleanup
  - [ ] Add session validation middleware to all protected endpoints
  - [ ] Implement session timeout (24 hours) and idle timeout (4 hours)
- [ ] **Add token refresh mechanism**:
  - [ ] Implement /api/v1/auth/renew endpoint
  - [ ] Add frontend AuthenticationManager with auto-renewal
  - [ ] Show renewal warnings before expiration

### 🚨 **Sub-Phase 6B: API Security** (Day 2)
**CRITICAL**: Fix overly permissive CORS and add protection

- [ ] **Restrict CORS configuration**:
  ```python
  ALLOWED_ORIGINS = [
      "http://localhost:3000", "http://localhost:8000",
      "https://balkhalil-godaddy.github.io"
  ]
  # Remove allow_origins=["*"] - DANGEROUS
  ```
- [ ] **Implement rate limiting**:
  - [ ] Add slowapi middleware with IP-based limiting
  - [ ] Set /api/v1/query to 10 requests/minute per IP
  - [ ] Set /api/v1/auth/* to 5 requests/minute per IP
- [ ] **Add input sanitization**:
  - [ ] Create SecureQueryRequest Pydantic model with validators
  - [ ] Sanitize XSS patterns in all user inputs
  - [ ] Whitelist allowed RAD types and time ranges
- [ ] **CSRF protection**:
  - [ ] Add CSRF token to all state-changing endpoints
  - [ ] Implement SameSite=Strict cookie policy
  - [ ] Add Origin header validation

### 🟡 **Sub-Phase 6C: Content Security** (Day 3)
**MEDIUM**: Add defense-in-depth protections

- [ ] **Content Security Policy**:
  - [ ] Implement strict CSP headers blocking inline scripts
  - [ ] Allow only trusted CDNs (fonts.googleapis.com, cdn.jsdelivr.net)
  - [ ] Add frame-ancestors 'none' to prevent clickjacking
- [ ] **XSS protection implementation**:
  - [ ] Create SecureRenderer class for safe HTML generation
  - [ ] Escape all user-generated content in UI updates
  - [ ] Replace innerHTML with textContent where possible
- [ ] **Security headers middleware**:
  - [ ] Add Strict-Transport-Security header
  - [ ] Implement X-Content-Type-Options: nosniff
  - [ ] Add Permissions-Policy for privacy protection

---

## Phase 7: Performance Optimization (2-3 days)

### 🟡 Frontend Performance
- [ ] Implement virtual scrolling for large tables
- [ ] Add pagination (client and server-side)
- [ ] Optimize DOM updates:
  - [ ] Batch DOM manipulations
  - [ ] Use DocumentFragment for table updates
- [ ] Add lazy loading for non-critical resources

### 🟡 Backend Performance
- [ ] Add connection pooling for Elasticsearch
- [ ] Implement response caching with Redis
- [ ] Parallelize data processing
- [ ] Add query optimization for large datasets

### 🟢 Monitoring
- [ ] Add performance metrics collection
- [ ] Implement APM (Application Performance Monitoring)
- [ ] Add slow query logging
- [ ] Create performance dashboard

---

## Phase 8: Documentation & Deployment (2-3 days)

### 🔴 Documentation Updates
- [x] Update README.md with:
  - [x] New multi-RAD support
  - [x] Simplified setup instructions
  - [x] Architecture diagrams
- [x] Create ARCHITECTURE.md consolidating all design docs
- [ ] Archive old documentation files
- [x] Add API documentation (Swagger/OpenAPI) - Available at /docs endpoint

### 🟡 Configuration Consolidation (✓)**COMPLETED**
- [x] Merge `requirements-enhanced.txt` and `requirements-minimal.txt` into single `requirements.txt` - (✓)Already consolidated
- [x] Create `requirements-dev.txt` with optional dependencies - (✓)Exists and well-organized
- [x] Remove duplicate configuration keys across files - (✓)ConfigService handles unification
- [x] Document all configuration options - (✓)Documented in ARCHITECTURE.md

### 🟡 Deployment Improvements
- [ ] Update GitHub Actions workflow:
  - [ ] Add staging deployment step
  - [ ] Add rollback capability
  - [ ] Add health checks
- [ ] Create Docker configuration:
  - [ ] Dockerfile for the application
  - [ ] docker-compose.yml for local development
- [ ] Add environment-specific configurations

### 🟢 Developer Experience
- [ ] Create development setup script
- [ ] Add troubleshooting guide
- [ ] Create contribution guidelines
- [ ] Add code style guide

---

## Phase 9: Advanced Features (5-7 days)

### 🟢 Real-time Enhancements
- [ ] Implement WebSocket message queuing
- [ ] Add heartbeat/ping mechanism
- [ ] Create real-time notifications for critical events
- [ ] Add live chart updates

### 🟢 Analytics Features
- [ ] Add historical trend analysis
- [ ] Implement anomaly prediction
- [ ] Create custom alerting rules
- [ ] Add export functionality (CSV, PDF)

### 🔵 UI/UX Improvements
- [ ] Add dashboard customization options
- [ ] Implement saved views/filters
- [ ] Add keyboard shortcuts
- [ ] Create mobile-responsive design

---

## Phase 10: Future Architecture (Optional)

### 🔵 Technology Upgrades
- [ ] Evaluate TypeScript migration
- [ ] Consider React/Vue for complex UI
- [ ] Investigate GraphQL for flexible queries
- [ ] Explore serverless deployment options

### 🔵 Scaling Preparations
- [ ] Design microservices architecture
- [ ] Plan for horizontal scaling
- [ ] Implement event-driven architecture
- [ ] Add message queue (RabbitMQ/Kafka)

---

## Phase 11: Advanced Query Filtering System (7-10 days)

### 🔴 Core Query Engine Enhancements

#### Query Language Parser
- [ ] Create `assets/js/query-language-parser.js`:
  - [ ] Implement tokenizer for Lens-like formula syntax
  - [ ] Build AST (Abstract Syntax Tree) parser
  - [ ] Support nested expressions and parentheses
  - [ ] Validate syntax and provide meaningful error messages
  - [ ] Example: `sum(bytes, kql='status:200') / sum(bytes) * 100`

#### Query Builder Extensions
- [ ] Enhance `assets/js/data-layer.js` QueryBuilder:
  - [ ] Add support for Elasticsearch metrics (sum, avg, min, max, percentile)
  - [ ] Implement bucket selectors for complex calculations
  - [ ] Add support for pipeline aggregations
  - [ ] Support sub-aggregations with filters
  - [ ] Add metric math calculations

#### Formula Functions Implementation
- [ ] Create `assets/js/formula-functions.js`:
  - [ ] **Elasticsearch Functions**:
    - [ ] `average()`, `count()`, `sum()`, `min()`, `max()`
    - [ ] `median()`, `percentile()`, `percentile_rank()`
    - [ ] `standard_deviation()`, `unique_count()`
    - [ ] `last_value()` for latest state
  - [ ] **Time Series Functions**:
    - [ ] `cumulative_sum()`, `differences()`
    - [ ] `moving_average()`, `counter_rate()`
    - [ ] `normalize_by_unit()` for time normalization
  - [ ] **Window Functions**:
    - [ ] `overall_sum()`, `overall_average()`
    - [ ] `overall_max()`, `overall_min()`
  - [ ] **Math Functions**:
    - [ ] Basic: `add()`, `subtract()`, `multiply()`, `divide()`
    - [ ] Advanced: `pow()`, `sqrt()`, `log()`, `exp()`
    - [ ] Rounding: `round()`, `floor()`, `ceil()`
    - [ ] Comparison: `eq()`, `gt()`, `gte()`, `lt()`, `lte()`
    - [ ] Conditional: `ifelse()`, `defaults()`

### 🔴 Advanced Filtering Features

#### KQL/Lucene Integration
- [ ] Implement KQL parser in `assets/js/kql-parser.js`:
  - [ ] Parse KQL syntax within formula functions
  - [ ] Convert KQL to Elasticsearch DSL
  - [ ] Support field:value, wildcards, ranges
  - [ ] Handle escaping and special characters
  - [ ] Example: `count(kql='rad_type:venture_feed AND status:error')`

#### Dynamic Filter Builder UI
- [ ] Create `assets/js/filter-builder-ui.js`:
  - [ ] Visual filter builder with drag-and-drop
  - [ ] Formula editor with syntax highlighting
  - [ ] Real-time validation and preview
  - [ ] Save/load filter templates
  - [ ] Export filters as shareable URLs

#### Context-Aware Filtering
- [ ] Implement smart filter suggestions:
  - [ ] Auto-complete for field names
  - [ ] Value suggestions based on data
  - [ ] Common formula templates
  - [ ] Performance warnings for expensive queries

### 🟡 Integration & Performance

#### Query Optimization
- [ ] Create `assets/js/query-optimizer.js`:
  - [ ] Analyze and optimize complex queries
  - [ ] Implement query caching strategy
  - [ ] Detect and prevent expensive operations
  - [ ] Suggest more efficient alternatives
  - [ ] Add query cost estimation

#### Real-time Query Updates
- [ ] Enhance WebSocket integration:
  - [ ] Stream query results as they arrive
  - [ ] Support partial result updates
  - [ ] Handle query cancellation
  - [ ] Implement backpressure handling

#### Multi-RAD Formula Support
- [ ] Extend formula functions for RAD types:
  - [ ] `rad_type()` function to filter by type
  - [ ] `compare_rad_types()` for cross-type analysis
  - [ ] `rad_performance()` for type-specific metrics
  - [ ] Example: `sum(events, kql='rad_type:venture_feed') / sum(events)`

### 🟢 User Experience Enhancements

#### Formula Library
- [ ] Create pre-built formula templates:
  - [ ] **Performance Metrics**:
    - [ ] Error rate: `count(kql='status:error') / count() * 100`
    - [ ] Success rate: `count(kql='status:success') / count() * 100`
    - [ ] Average response time: `average(response_time)`
  - [ ] **Comparison Formulas**:
    - [ ] Week-over-week: `sum(events) / sum(events, shift='1w')`
    - [ ] Percent of total: `sum(events) / overall_sum(sum(events))`
    - [ ] Baseline comparison: `(current - baseline) / baseline * 100`
  - [ ] **RAD-Specific**:
    - [ ] RAD conversion rate by type
    - [ ] Cross-RAD performance comparison
    - [ ] Time-based RAD trends

#### Interactive Query Builder
- [ ] Visual query construction:
  - [ ] Drag fields to build formulas
  - [ ] Preview results in real-time
  - [ ] Show query explanation
  - [ ] Estimated query time/cost

#### Query History & Sharing
- [ ] Implement query management:
  - [ ] Save query history locally
  - [ ] Share queries via URL
  - [ ] Export queries as code
  - [ ] Import/export query collections

### 🟢 Developer Experience

#### Query Testing Framework
- [ ] Create `tests/query-formulas.test.js`:
  - [ ] Unit tests for formula parser
  - [ ] Integration tests for query execution
  - [ ] Performance benchmarks
  - [ ] Edge case handling

#### Documentation & Examples
- [ ] Create comprehensive docs:
  - [ ] `docs/QUERY_LANGUAGE_GUIDE.md`
  - [ ] `docs/FORMULA_REFERENCE.md`
  - [ ] Interactive formula playground
  - [ ] Video tutorials

#### API Extensions
- [ ] Enhance REST API:
  - [ ] POST `/api/v1/query/parse` - Validate formulas
  - [ ] POST `/api/v1/query/execute` - Run formulas
  - [ ] GET `/api/v1/query/suggest` - Get suggestions
  - [ ] GET `/api/v1/query/templates` - List templates

### 🔵 Advanced Features (Future)

#### Machine Learning Integration
- [ ] Smart query suggestions based on usage
- [ ] Anomaly detection in query results
- [ ] Predictive query completion
- [ ] Query performance prediction

#### Natural Language Queries
- [ ] Convert natural language to formulas
- [ ] "Show me error rate for venture feed last week"
- [ ] Context-aware query interpretation
- [ ] Multi-language support

### Implementation Order

1. **Week 1**: Query Language Parser & Basic Functions
   - Tokenizer and AST parser
   - Basic Elasticsearch functions
   - Simple math operations

2. **Week 2**: Advanced Functions & KQL Integration
   - Time series and window functions
   - KQL parser implementation
   - Complex aggregations

3. **Week 3**: UI Components & Integration
   - Filter builder UI
   - Formula editor
   - Real-time preview

4. **Week 4**: Performance & Polish
   - Query optimizer
   - Caching strategy
   - Documentation

5. **Week 5**: Testing & Release
   - Comprehensive testing
   - Performance tuning
   - User documentation

### Success Metrics

- [ ] Query execution time < 500ms for 90% of queries
- [ ] Support for 50+ formula functions
- [ ] 95% query syntax validation accuracy
- [ ] < 2% query failure rate
- [ ] User satisfaction score > 4.5/5

### Technical Considerations

1. **Parser Technology**: Consider using PEG.js or Nearley for robust parsing
2. **Performance**: Implement query result caching with Redis
3. **Security**: Validate all queries to prevent injection attacks
4. **Compatibility**: Ensure backward compatibility with existing queries
5. **Extensibility**: Design plugin system for custom functions

---

## Completion Metrics

### Success Criteria
- [x] All dead code removed (Phase 1 complete)
- [x] Single unified backend server (Phase 3 complete)
- [x] Single unified API client (Phase 4 partial)
- [x] Multi-RAD support fully functional (Phase 2 complete)
- [ ] All tests passing (>85% coverage)
- [ ] Security vulnerabilities addressed
- [ ] Performance targets met:
  - Page load < 2s
  - Data processing < 100ms
  - Memory usage < 50MB

### Code Quality Targets
- [ ] Files reduced by ~33% (from ~150 to ~100)
- [ ] Lines of code reduced by ~33% (from ~15,000 to ~10,000)
- [ ] Code duplication < 10%
- [ ] Zero ESLint/flake8 errors

### Documentation Complete
- [ ] README fully updated
- [ ] Architecture documented
- [ ] API documentation complete
- [ ] Deployment guide created

---

## Quick Start Priority Order

For fastest impact, complete in this order:

1. **Week 1**: Phase 1 (Cleanup) + Start Phase 2 (Multi-RAD)
2. **Week 2**: Complete Phase 2 + Phase 3 (Backend Consolidation)
3. **Week 3**: Phase 4 (Frontend) + Phase 5 (Testing)
4. **Week 4**: Phase 6 (Security) + Phase 7 (Performance)
5. **Week 5**: Phase 8 (Documentation) + Phase 9 (Advanced Features)
6. **Week 6-7**: Phase 11 (Advanced Query Filtering System)

---

## Notes

- Each checkbox represents a discrete task that can be assigned and tracked
- Tasks within a phase can often be parallelized among team members
- Regular code reviews should be conducted after each phase
- Consider creating feature branches for each phase
- Maintain backward compatibility during transition periods
