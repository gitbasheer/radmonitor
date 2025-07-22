# Codebase Cleanup & Streamlining Checklist

## Critical Production Blockers (from sprint_work.md)

### Memory Leaks (30+ identified)
- [ ] Fix unbounded caches in `data-layer.js`, `api-client-unified.js`, `config-service.js`
- [ ] Fix unbounded Maps in formula builder components
- [ ] Clean up event listeners in `dashboard-simplified.js`, `connection-status-manager.js`, `search-filter.js`, `ui-updater.js`
- [ ] Clear all timers/intervals on cleanup (wsReconnectInterval, syntaxHighlightTimer, etc.)
- [ ] Remove global references (window.Dashboard, DashboardIntegration subscriptions)
- [ ] Implement ResourceManager pattern for centralized cleanup
- [ ] Fix DOM references retained after removal
- [ ] Clean up Web Workers properly
- [ ] Fix LocalStorage accumulation issues

### Cookie Security (Only 2 files use encryption: centralized-auth.js and api-client-unified.js updated by Agent 3)
- [ ] Update `config-editor.js` to use encrypted storage (line 323)
- [ ] Update `auth-service.js` to use encryption (lines 54, 120, 207, 222)
- [ ] Update `config-service.js` to use encryption (lines 236, 243)
- [ ] Update `assets/js/stores/app-store.js` to use encrypted storage
- [ ] Update `direct-elasticsearch-client.js` to use decryption
- [ ] Update `api-client-simplified.js` to use encryption (line 340)
- [ ] Standardize all storage to use 'rad_monitor_auth' key (not 'elasticCookie' or 'elastic_cookie')
- [ ] Create migration logic for old cookie formats
- [ ] Add automated test to prevent cookie logging

### Hardcoded URLs (11 files need fixes)
- [ ] Fix `config-service.js` (lines 48, 51) - Remove hardcoded localhost:8000
- [ ] Fix `ui-updater.js` (line 94) - Remove hardcoded Kibana URL
- [ ] Fix `api-client-unified.js` (lines 35, 49, 422) - localhost, WebSocket, ES URLs
- [ ] Fix `centralized-auth.js` (lines 150, 158) - auth endpoints and Netlify proxy
- [ ] Fix `fastapi-integration.js` (lines 38-39) - API and WebSocket URLs
- [ ] Fix `cors-direct-override.js` (line 48) - ES URL
- [ ] Fix `direct-elasticsearch-client.js` (line 8) - ES URL
- [ ] Fix `api-client-simplified.js` (line 340)
- [ ] Fix Chrome extension files (background.js, popup.js)
- [ ] Fix `bin/server.py` (lines 82, 84, 140, 363)
- [ ] Fix `bin/generate_dashboard.py` (lines 90, 92, 587)

### Formula Builder (Core feature broken)
- [ ] Fix import paths for `enhanced-ast-parser.js` and `enhanced-validator.js` (files exist but imports are broken)
- [ ] Resolve circular dependencies if present
- [ ] Ensure all exports match what importing files expect
- [ ] Implement missing API endpoints in `server_production.py`:
  - `POST /api/formulas/validate`
  - `POST /api/formulas/execute`
  - `GET /api/formulas/functions`
  - `GET /api/formulas/fields`
  - `POST /api/formulas/save`
  - `GET /api/formulas/history`
- [ ] Create OpenAPI/Swagger documentation for all endpoints
- [ ] Implement core formula functions (SUM, AVG, MIN, MAX, COUNT, IF, AND, OR, etc.)
- [ ] Add syntax highlighting and autocomplete in editor
- [ ] Add formula validation and execution tests

## File & Code Organization

### Remove Unnecessary Files (60+ files)
- [ ] Delete temporary/analysis documentation:
  - All `*_AUDIT_RESULTS.md`, `*_SUMMARY.md`, `*_STATUS.md` files
  - `POST_MORTEM_*.md` files (3 files)
  - `CLEANUP_PROGRESS_SUMMARY.md`, `CLEANUP_SUMMARY.md`
  - `CODE_REVIEW_FINDINGS.md`, `OUTSTANDING_CODE_REVIEW_ISSUES.md`
  - `COHERENCE_*.md` files (2 files)
  - `GODADDY_*.md` files except essential guides
  - `MIGRATION_STATUS.md`, `UX_MIGRATION_STATUS.md`
  - `agent_collab.md`, `checklist.md`, `sprint_work.md`
- [ ] Delete radar/AI experiment files:
  - All `radar_*.py` files (7 files)
  - All `connect_radar_*.py` files (3 files)
  - All `radar_*.json` files (4 files)
  - `radar_*.md` files (3 files)
  - `letter_to_radar.md`
  - `radar_quick_reconnect.sh`
- [ ] Delete test/demo files from root:
  - All `test-*.html` files (8 files) - move to tests/
  - `demo-antares-features.html`, `enhanced-formula-builder-demo.html`
  - `formula-builder-demo.html`, `formula-editor-demo.html`
  - `kibana-cookie-sync.html`, `kibana-cookie-sync.js`
- [ ] Delete temporary files:
  - `distributed_ai_backup_*.tar.gz`
  - All `*-test-results.json` files (3 files)
  - `test_results.json`, `test-dataprocessing-results.json`
  - All `*.pre-antares` files
- [ ] Delete Chrome extension directory (unless specifically required)

### Consolidate Duplicate Code
- [ ] API Clients: Keep `api-client-unified.js`, remove `api-client-simplified.js`
- [ ] Server files: Keep `server_production.py`, remove:
  - `server.py` (unless needed for dev)
  - `server_enhanced.py`
  - `simple-server.py`
- [ ] Validation scripts: Keep `validate_connections_production.py`, remove:
  - `validate_connections.py`
  - `validate_connections_enhanced.py`
  - `validate_connections_simple.py`
- [ ] Dashboard files: Determine primary implementation and remove others:
  - `dashboard.js` vs `dashboard-simplified.js` vs `dashboard-ux-migration.js`
- [ ] Entry points: Determine main entry point and remove:
  - `main-clean.js` (if not primary)
  - `test-simplified-system.js`
- [ ] CSS themes: Consolidate overlapping styles:
  - Keep core `dashboard.css` and `formula-builder.css`
  - Evaluate need for multiple theme files (antares, rad, godaddy, uxcore)

### Refactor Monolithic Files
- [ ] Split `api-client-unified.js` (751 lines) into modules
- [ ] Split `config-service.js` (843 lines) into modules
- [ ] Split `data-layer.js` (1365 lines) into modules

## Documentation
- [ ] Update README.md to reference only existing/essential documentation
- [ ] Document all environment variables in `.env.production.example`
- [ ] Keep only essential documentation:
  - `README.md`, `README_detailed.md`
  - `FORMULA_BUILDER_GUIDE.md`, `FORMULA_BUILDER_TECHNICAL_REFERENCE.md`
  - `ARCHITECTURE.md`, `PROD_ARCHITECTURE.md`
  - Essential guides in `docs/` directory
- [ ] Archive or delete 30+ temporary documentation files (see file removal section)

## Environment Variables
- [ ] Environment validation already implemented in `env_validator.py` - verify it covers all variables
- [ ] Ensure `ALLOWED_ORIGINS` validation prevents wildcards and malformed domains
- [ ] Add any missing URL variables from hardcoded URL fixes to validator

## Testing
- [ ] Fix all broken tests listed in `tests/BROKEN_TESTS_TODO.md`
- [ ] Move test HTML files from root to tests directory
- [ ] Add security tests for:
  - Cookie encryption/decryption
  - XSS vulnerability fixes
  - Input validation
  - Error message sanitization
  - Pre-configured cookie blocking
- [ ] Add memory leak tests using Chrome DevTools Memory Profiler
- [ ] Achieve 80%+ code coverage on critical paths
- [ ] Add integration tests for formula builder with fixed imports

## Configuration Consistency
- [ ] Fix all 11 hardcoded URLs listed in "Hardcoded URLs" section above
- [ ] Ensure WebSocket URLs use environment configuration
- [ ] Update all URL references to use `ConfigService.getApiUrl()` or similar methods

## Security
- [ ] Fix XSS vulnerabilities - Replace innerHTML with safe DOM manipulation:
  - `ui-updater.js` - Multiple instances
  - `formula-builder/ui/enhanced-visual-builder.js` - Component rendering
  - `components/auth-overlay.js` - Modal content
- [ ] Remove pre-configured cookie support in production (config-service.js lines 137-140, 226-246)
- [ ] Search for and remove any API keys or secrets from client-side code
- [ ] Apply input validation to all user inputs (formula expressions, search filters, API parameters)
- [ ] Implement CSRF protection for state-changing operations
- [ ] Implement proper session timeout (30 min default)
- [ ] Add rate limiting per IP address
- [ ] Implement Content Security Policy headers
- [ ] Sanitize error messages before sending to client

## Deployment & Operations
- [ ] `deploy-production.sh` already exists - verify it checks all environment variables
- [ ] Add deployment summary/log output
- [ ] Make Redis and Prometheus optional (currently required by server_production.py)
- [ ] Document Redis/Prometheus configuration in README
- [ ] Create pre-deployment security checklist
- [ ] Implement blue-green deployment support
- [ ] Add automatic rollback on health check failures

## Error Handling & Monitoring
- [ ] Verify consistent error handling across all endpoints
- [ ] Ensure Prometheus metrics don't expose sensitive data
- [ ] Create Grafana dashboard templates for existing metrics:
  - `rad_monitor_requests_total`
  - `rad_monitor_request_duration_seconds`
  - `rad_monitor_active_connections`
  - `rad_monitor_cache_hits/misses_total`
- [ ] Set up alerting rules (error rate >1%, memory >80%, response time >2s)
- [ ] Implement distributed tracing with OpenTelemetry

## Performance
- [ ] Fix specific performance issues identified in memory leak analysis:
  - Debounce regex tokenization in formula editor (runs on every keystroke)
  - Fix O(n²) nested loops in `data-layer.js` (lines 850-863)
  - Use DocumentFragment for DOM updates in `ui-updater.js`
  - Process large datasets in chunks to avoid blocking
- [ ] Infrastructure optimizations:
  - Implement Redis cluster for caching
  - Configure CDN for static assets
  - Optimize Docker images
  - Configure connection pooling
  - Implement request compression

---

**Instructions:**
- Check off each item as it is completed.
- For any item that is not applicable, add a note explaining why.
- Update this checklist as new issues or requirements are discovered.
