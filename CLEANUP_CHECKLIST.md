# RAD Monitor - Cleanup & Alignment Checklist

## Current Status

The RAD Monitor is now using a simplified architecture with:
- Static frontend hosted on GitHub Pages
- Netlify proxy function for CORS handling
- Unified development server for local work
- Simplified JavaScript modules (65% code reduction achieved)

**Progress Summary:**
- Phase 1-3: ✅ COMPLETED (Immediate Cleanup, Multi-RAD Support, Backend Consolidation)
- Phase 4: ⚡ IN PROGRESS (Frontend Consolidation - API Client done, Module System next)
- Phase 5-11: Not started
- Overall Progress: ~32% Complete (3.5 of 11 phases)

## Priority Legend
- 🔴 **CRITICAL**: Blocking issues or high-impact improvements
- 🟡 **HIGH**: Important for stability and maintainability
- 🟢 **MEDIUM**: Enhances user experience or developer experience
- 🔵 **LOW**: Nice-to-have improvements

## Pre-Cleanup Verification

### 1. Verify Current Setup
```bash
# Check current branch
git status

# Verify configuration
./scripts/verify-config.sh

# Test proxy health
curl https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy

# Test local development
npm run dev
```

### 2. Backup Current State
```bash
# Create safety tag
git tag backup-$(date +%Y%m%d-%H%M%S)

# Push tag to remote
git push origin --tags
```

## Phase 3: Backend Consolidation (Minor Remaining Tasks)

### 🟡 Server Cleanup
- [ ] Fix uvicorn reload warning:
  - [ ] Update `bin/server.py` to use proper module import string
  - [ ] Currently shows: "WARNING: You must pass the application as an import string to enable 'reload' or 'workers'"
- [ ] Delete obsolete files (ready for deletion):
  - [ ] `bin/dev_server.py`
  - [ ] `bin/cors_proxy.py`
  - [ ] `bin/centralized_api.py`
  - [ ] `bin/dev_server_fastapi.py`

## Phase 4: Frontend Consolidation (In Progress)

### 🔴 API Client Migration
- [ ] Monitor unified client for 1 week in production
- [ ] Update all remaining imports from old clients to unified client:
  - [ ] `dashboard-main.js` - still imports old `api-client.js`
  - [ ] `data-layer.js` - still imports old `api-client.js`
  - [ ] `fastapi-integration.js` - dynamically imports `api-client-fastapi.js`
- [ ] Delete old API clients (after thorough testing):
  - [ ] `api-client.js`
  - [ ] `api-client-fastapi.js`

### 🟡 Module System Modernization
- [ ] Remove IIFE patterns from all JS files
- [ ] Convert to proper ES6 modules
- [ ] Remove global object pollution (`window.Dashboard`, etc.)
- [ ] Update `main.js` to not expose modules globally

### 🟢 Extract Inline JavaScript
- [ ] Move inline JS from `index.html` to separate modules
- [ ] Create `modal-handler.js` for modal functionality
- [ ] Update event handlers to use addEventListener

## Phase 5: Testing & Quality

### 🔴 Fix Test Infrastructure
- [ ] Create `tests/utils/` directory with:
  - [ ] `async-helpers.js` for async test utilities
  - [ ] `mock-data.js` for consistent test data
  - [ ] `dom-helpers.js` for DOM testing utilities
- [ ] Fix all failing tests in:
  - [ ] `integration.test.js`
  - [ ] `flexibleTimeComparison.test.js`
  - [ ] `fastapiClient.test.js`

### 🟡 Add Missing Tests
- [ ] WebSocket functionality tests
- [ ] Multi-RAD support tests (simplified architecture)
- [ ] Error boundary tests
- [ ] Performance regression tests

### 🟢 Code Quality Tools
- [ ] Add ESLint configuration
- [ ] Add Prettier configuration
- [ ] Set up pre-commit hooks
- [ ] Add Python linting (flake8/black)

## Phase 6: Security Enhancements

### 🔴 Authentication Security
- [ ] Move from localStorage to secure httpOnly cookies
- [ ] Implement CSRF protection
- [ ] Add session timeout handling
- [ ] Implement proper token refresh mechanism

### 🔴 API Security
- [ ] Restrict CORS to specific origins
- [ ] Add rate limiting to all endpoints
- [ ] Implement request size limits
- [ ] Add input sanitization for all user inputs

### 🟡 Content Security
- [ ] Add Content Security Policy headers
- [ ] Implement XSS protection
- [ ] Escape all dynamic HTML content
- [ ] Add security headers middleware

## Phase 7: Performance Optimization

### 🟡 Frontend Performance
- [ ] Implement virtual scrolling for large tables
- [ ] Add pagination (client and server-side)
- [ ] Optimize DOM updates
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

## Phase 8: Documentation & Deployment

### 🟡 Configuration Consolidation
- [ ] Merge `requirements-enhanced.txt` and `requirements-minimal.txt`
- [ ] Create `pyproject.toml` with optional dependencies
- [ ] Remove duplicate configuration keys
- [ ] Document all configuration options

### 🟡 Deployment Improvements
- [ ] Update GitHub Actions workflow:
  - [ ] Add staging deployment step
  - [ ] Add rollback capability
  - [ ] Add health checks
- [ ] Create Docker configuration
- [ ] Add environment-specific configurations

### 🟢 Developer Experience
- [ ] Create development setup script
- [ ] Add comprehensive troubleshooting guide
- [ ] Create contribution guidelines
- [ ] Add code style guide

## Phase 9: Advanced Features

### 🟢 Real-time Enhancements
- [ ] Implement WebSocket message queuing
- [ ] Add heartbeat/ping mechanism
- [ ] Create real-time notifications
- [ ] Add live chart updates

### 🟢 Analytics Features
- [ ] Add historical trend analysis
- [ ] Implement anomaly prediction
- [ ] Create custom alerting rules
- [ ] Add export functionality (CSV, PDF)

### 🔵 UI/UX Improvements
- [ ] Add dashboard customization
- [ ] Implement saved views/filters
- [ ] Add keyboard shortcuts
- [ ] Create mobile-responsive design

## Phase 10: Future Architecture (Optional)

### 🔵 Technology Upgrades
- [ ] Evaluate TypeScript migration
- [ ] Consider React/Vue for complex UI
- [ ] Investigate GraphQL
- [ ] Explore serverless deployment

### 🔵 Scaling Preparations
- [ ] Design microservices architecture
- [ ] Plan horizontal scaling
- [ ] Implement event-driven architecture
- [ ] Add message queue support

## Phase 11: Advanced Query Filtering System

### 🔴 Core Query Engine
- [ ] Create query language parser for Lens-like formulas
- [ ] Enhance QueryBuilder with advanced aggregations
- [ ] Implement formula functions (ES functions, time series, math)
- [ ] Add KQL/Lucene parser integration

### 🟡 Advanced Filtering UI
- [ ] Create visual filter builder
- [ ] Add formula editor with syntax highlighting
- [ ] Implement context-aware filter suggestions
- [ ] Add query optimization and caching

### 🟢 Query Features
- [ ] Create formula library with templates
- [ ] Add interactive query builder
- [ ] Implement query history and sharing
- [ ] Add query testing framework

## Active Development Tasks (Current Sprint)

### JavaScript Module Cleanup
- [x] Migrate to simplified modules (main-simplified.js)
- [x] Remove legacy modules (28 files removed)
- [ ] Update all imports to use simplified modules
- [ ] Remove references to old module names in comments
- [ ] Clean up unused event listeners

### Configuration Consolidation
- [x] Centralize configuration in ConfigService
- [x] Remove duplicate config loading code
- [ ] Ensure all modules use ConfigService
- [ ] Remove hardcoded URLs (use config only)
- [ ] Validate all config paths are consistent

### API Client Unification
- [x] Create unified API client (api-client-simplified.js)
- [x] Remove legacy API clients
- [ ] Update all API calls to use unified client
- [ ] Remove direct fetch() calls
- [ ] Ensure consistent error handling

### Testing Updates
- [ ] Update test files to use simplified modules
- [ ] Remove tests for deleted modules
- [ ] Add tests for new unified components
- [ ] Ensure all tests pass with new architecture
- [ ] Update test documentation

### Documentation Cleanup
- [x] Create simplified README.md
- [x] Create comprehensive README_detailed.md
- [ ] Archive old documentation files
- [ ] Update inline code comments
- [ ] Remove references to deprecated features

## Deployment Tasks

### GitHub Pages
- [x] Ensure index.html uses main-simplified.js
- [ ] Verify GitHub Actions workflow is up to date
- [ ] Test automated deployment
- [ ] Update deployment documentation

### Netlify Proxy
- [x] Deploy proxy function
- [x] Update production.json with proxy URL
- [ ] Add monitoring for proxy health
- [ ] Document proxy deployment process

## Code Quality Tasks

### Remove Dead Code
- [ ] Remove commented-out code blocks
- [ ] Delete unused CSS classes
- [ ] Remove deprecated configuration options
- [ ] Clean up unused utility functions

### Standardize Patterns
- [ ] Use consistent async/await patterns
- [ ] Standardize error handling approach
- [ ] Use consistent naming conventions
- [ ] Apply ESLint rules uniformly

### Performance Optimization
- [ ] Implement proper caching strategy
- [ ] Optimize Elasticsearch queries
- [ ] Reduce unnecessary re-renders
- [ ] Minimize bundle size

## Testing Checklist

### Manual Testing
- [ ] Test cookie authentication flow
- [ ] Verify data refresh functionality
- [ ] Test all filter options
- [ ] Verify configuration editor
- [ ] Test error scenarios
- [ ] Check responsive design

### Automated Testing
```bash
# Run all tests
npm run test:all

# Check coverage
npm run test:coverage

# Run specific test suites
npm test -- auth
npm test -- api
npm test -- dashboard
```

## Final Cleanup Steps

### 1. Remove Legacy Files
```bash
# Files to remove (already removed in simplified architecture):
assets/js/api-client.js
assets/js/api-client-fastapi.js
assets/js/api-interface.js
assets/js/dashboard-main.js
assets/js/data-layer.js
assets/js/data-processor.js
assets/js/ui-updater.js
# ... (28 files total)

# Additional obsolete backend files to remove:
bin/dev_server.py
bin/cors_proxy.py
bin/centralized_api.py
bin/dev_server_fastapi.py
```

### 2. Update Dependencies
```bash
# Update package.json
npm update
npm audit fix

# Update Python dependencies
pip install -r requirements-enhanced.txt --upgrade
```

### 3. Final Verification
```bash
# Build and test production
npm run generate

# Verify all features work
npm run dev

# Run full test suite
npm run test:all
```

## Existing Mismatches & Misalignments

### Critical Issues to Address First

#### 1. Index Pattern Inconsistencies
- **Issue**: Some files still reference old `usi*` pattern instead of `traffic-*`
- **Files affected**:
  - `assets/js/api-client.js` (lines 239, 453) - if not already removed
  - Need to grep entire codebase for `usi\*` references
- **Fix**: Update all references to use `traffic-*` consistently

#### 2. Module Loading Confusion
- **Issue**: `index.html` needs to consistently use either `main.js` or `main-simplified.js`
- **Current**: Mixed references in documentation
- **Fix**: Ensure index.html uses `main-simplified.js` everywhere

#### 3. Configuration URL Mismatches
- **Issue**: Hardcoded URLs in multiple places instead of using config
- **Locations**:
  - `assets/js/config-service.js` - line 394 (hardcoded proxy URL)
  - `assets/js/ui-updater.js` - line 92 (hardcoded Kibana URL)
  - Various test files with hardcoded URLs
- **Fix**: All URLs should come from configuration files

#### 4. Authentication Flow Inconsistencies
- **Issue**: Multiple authentication mechanisms still referenced
- **Current**: Both `centralized-auth.js` and `auth-service.js` exist
- **Fix**: Use only `auth-service.js` from simplified architecture

#### 5. Duplicate Functionality
- **Issue**: Similar functionality in multiple files
- **Examples**:
  - Cookie handling in both auth modules
  - Config loading in multiple places
  - API calls scattered across modules
- **Fix**: Consolidate into single responsibility modules

#### 6. Environment Detection Logic
- **Issue**: Complex environment detection scattered across files
- **Current**: Different detection methods in different modules
- **Fix**: Centralize in ConfigService with single source of truth

#### 7. Test File Misalignments
- **Issue**: Test files importing non-existent modules
- **Current**: Tests may reference old module structure
- **Fix**: Update all test imports to use simplified modules

#### 8. Documentation References
- **Issue**: Documentation references to old file structure
- **Examples**:
  - API endpoint documentation
  - Module dependency graphs
  - Setup instructions
- **Fix**: Update all docs to reflect simplified architecture

#### 9. GitHub Actions Configuration
- **Issue**: `.github/workflows/static.yml` may have outdated references
- **Check**: Line 68 for proxy URL injection
- **Fix**: Ensure workflow uses current configuration approach

#### 10. Development vs Production Confusion
- **Issue**: Unclear when to use which configuration
- **Current**: Multiple config files with overlapping settings
- **Fix**: Clear documentation on config hierarchy and usage

### Priority Order for Fixes

1. **High Priority** (Breaks functionality):
   - Index pattern inconsistencies
   - Module loading issues
   - Authentication flow problems

2. **Medium Priority** (Causes confusion):
   - Configuration URL mismatches
   - Duplicate functionality
   - Environment detection logic

3. **Low Priority** (Clean-up tasks):
   - Test file updates
   - Documentation updates
   - Code style standardization

### Verification Commands

```bash
# Check for old index patterns
grep -r "usi\*" . --include="*.js" --include="*.json" --exclude-dir=node_modules

# Find hardcoded URLs
grep -rE "https://.*kb.*aws\.found\.io" . --include="*.js" --exclude-dir=node_modules

# Check module imports
grep -r "import.*from.*dashboard-main" . --include="*.js"

# Find duplicate auth code
grep -r "localStorage.*cookie" . --include="*.js" --exclude-dir=node_modules
```

## Success Criteria

- [ ] All tests pass (`npm run test:all`)
- [ ] No console errors in browser
- [ ] Configuration verification passes (`./scripts/verify-config.sh`)
- [ ] Production deployment works
- [ ] Documentation is accurate and complete
- [ ] No references to old module structure
- [ ] Consistent index pattern usage (`traffic-*`)
- [ ] Single source of truth for each functionality
- [ ] Code coverage > 85%
- [ ] Performance targets met:
  - Page load < 2s
  - Data processing < 100ms
  - Memory usage < 50MB
- [ ] Code quality targets:
  - Files reduced by ~33%
  - Lines of code reduced by ~33%
  - Code duplication < 10%
  - Zero ESLint/flake8 errors

## Post-Cleanup

Once all items are complete:

1. **Create Release**
   ```bash
   git tag v2.0.0-simplified
   git push origin v2.0.0-simplified
   ```

2. **Update Production**
   - Merge to main branch
   - Verify GitHub Pages deployment
   - Monitor for any issues

3. **Archive Old Code**
   - Move legacy files to archive branch
   - Update documentation wiki
   - Close related issues

4. **Celebrate!**
   - 65% code reduction achieved
   - Cleaner, more maintainable architecture
   - Better performance and reliability

## Core Functionality
- [x] RAD type classification working (venture-feed shows correctly)
- [x] Full event IDs displayed (no truncation)
- [x] Search filtering works with RAD types
- [x] UI properly displays RAD type badges with colors
- [x] New venture-metrics RAD type added and tested

## Authentication & Security
- [x] Cookie validation implemented
- [x] 24-hour auto-expiry working
- [x] Authentication prompts only once (no loops)
- [x] Clean UI modal for cookie entry
- [x] Centralized cookie management
- [ ] Backend authentication endpoint (future)
- [ ] Proxy authentication (if needed)

## Code Quality
- [x] No duplicate imports in main-simplified.js
- [x] Consistent module exports
- [x] Error handling in place
- [x] Performance metrics tracking
- [ ] Remove unused legacy files
- [ ] Clean up test files

## Testing
- [x] RAD type classification tests
- [x] Search filter tests
- [x] UI display tests
- [x] Integration tests
- [x] Authentication tests
- [ ] End-to-end testing

## Documentation
- [x] CHANGES_SUMMARY.md created
- [x] Centralized auth setup guide
- [ ] Update main README
- [ ] API documentation
- [ ] Deployment guide

## UI/UX
- [x] Cookie modal with clear instructions
- [x] Connection status indicator
- [x] RAD type color coding
- [x] Search functionality
- [ ] Loading states
- [ ] Error messages

## Deployment
- [ ] Environment variables configured
- [ ] Production build tested
- [ ] GitHub Pages deployment
- [ ] Monitoring setup

## Recent Fixes (January 2025)

### 🔧 Module Loading and API Endpoint Fixes
- **Fixed**: ES6 module syntax errors by removing duplicate script tags in index.html
- **Fixed**: API endpoint mismatch in centralized-auth.js (changed from `/api/v1/query` to `/api/v1/dashboard/query`)
- **Fixed**: Cookie header issues causing 401 errors:
  - Browsers don't allow JavaScript to set the `Cookie` header directly (it's a forbidden header)
  - Solution: Use `X-Elastic-Cookie` header for both validation and API requests
  - Updated server to accept cookies from both `Cookie` and `X-Elastic-Cookie` headers
  - Improved error messaging to be more accurate about connection/validation issues
- **Fixed**: Cookie validation 400 Bad Request errors:
  - Validation was sending wrong request format to dashboard/query endpoint
  - Solution: Use simpler `/api/v1/auth/status` endpoint for validation
  - Consolidated all cookie validation logic in one place
- **Fixed**: Dashboard query 400 Bad Request errors:
  - Client was sending complex filter objects with status/search/radTypes fields
  - Server doesn't process these client-side filter fields
  - Solution: Separated server filters (empty) from clientFilters (for UI filtering)
- **Status**: ✅ Complete
