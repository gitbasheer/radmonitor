# Complete Test Catalog - VH RAD Traffic Monitor

This document contains a comprehensive list of every test in the codebase, categorized by area of focus.

## Test Overview

Total Test Files Found:
- JavaScript/TypeScript test files: 40+
- Python test files: 15+
- Bash test files: 2

---

## Authentication & Security Tests

### From `tests/authentication.test.js`
- should return true when CORS proxy is available
- should return false when CORS proxy is not available
- should return false when fetch throws an error
- should handle connection refused errors
- should return invalid auth when no cookie is found
- should get cookie from localStorage
- should get cookie from localStorage (duplicate)
- should use proxy method on localhost when CORS proxy is available
- should use direct method when not on localhost
- should return valid even when CORS proxy not available (unified client behavior)
- should handle GitHub Pages deployment
- should handle 127.0.0.1 as localhost
- should handle complete authentication flow for local development
- should handle complete authentication flow for production

### From `tests/centralized-auth.test.js`
- should initialize with no existing auth
- should load existing auth from localStorage
- should detect expired auth
- should accept valid Fe26 format cookie
- should accept sid= format cookie
- should reject invalid cookie format
- should reject expired cookie on validation with proper error message
- should reject when server says not authenticated
- should skip validation when requested
- should validate cookie using auth/status endpoint for localhost
- should handle sid= prefix properly
- should use proxy validation for production
- should log proper error messages
- should handle network errors gracefully
- should log success message on valid cookie
- should return null when no auth exists
- should return cookie when valid auth exists
- should return null when auth is expired
- should return correct status for valid auth
- should calculate age and remaining time correctly
- should clear auth and localStorage
- should export valid auth data
- should return null when exporting expired auth
- should import valid auth data
- should use localhost endpoint in development
- should use Netlify proxy in production

### From `tests/cookie.test.js`
- should set a cookie with the given name and value
- should validate cookie format
- should handle elastic session cookie format
- should validate cookie with server
- should get cookie value when available
- should return null for expired cookie
- should return null when no cookie stored
- should handle corrupted storage data
- should delete an existing cookie
- should handle deleting non-existent cookie gracefully
- should clear auth state when deleting cookie
- should handle cookie lifecycle
- should handle elastic cookie format
- should validate auth status

---

## Data Service & API Tests

### From `tests/data-service.test.js`
- should initialize with default state
- should load persisted state from localStorage
- should handle corrupted localStorage data gracefully
- should load data successfully
- should send empty filters object to server
- should handle authentication errors gracefully
- should handle expired cookie errors
- should use cached data on error
- should calculate stats if not provided
- should update clientFilters not filters
- should persist filter changes
- should emit filtersChanged event
- should filter by status
- should filter by search term
- should filter by RAD types
- should apply multiple filters
- should return all data when no filters applied
- should update time range and reload data
- should persist time range change
- should reload data with force flag
- should start auto-refresh timer
- should stop auto-refresh
- should emit stateChanged event on state updates
- should merge state updates
- should clear localStorage and reset to defaults
- should clean up timers and listeners

### From `tests/api-client-simplified.test.js`
- should make authenticated request with proper headers
- should handle errors properly
- should handle network errors
- should support timeout
- should make GET requests with correct URL
- should send POST request with body
- should fetch traffic data with elasticsearch query
- should handle missing authentication
- should use cached results when available
- should check health successfully
- should handle health check failure
- should track request metrics
- should calculate average response time
- should clear all cached data
- should get authentication details from localStorage
- should handle missing cookie
- should save cookie to localStorage
- should initialize successfully when healthy
- should handle initialization failure

### From `tests/dataProcessing.test.js`
- should process valid Elasticsearch response
- should filter out low volume events
- should calculate baseline for 12 hours correctly
- should sort results by score (most negative first)
- should handle empty buckets
- should throw error for invalid response structure
- should remove event prefix from display name
- should handle missing baseline or current counts
- should respect minDailyVolume configuration
- should fetch data using proxy method
- should fetch data using direct method
- should use custom configuration when provided
- should throw error on HTTP error response
- should throw error on Elasticsearch error
- should throw error on network failure
- should build correct query structure
- should handle timeout gracefully

---

## Formula Builder Tests

### From `tests/formula-builder.test.js`
- should parse simple function calls
- should parse function with field argument
- should parse function with named arguments
- should parse nested field paths
- should parse addition
- should parse division
- should parse complex arithmetic
- should parse greater than
- should parse less than or equal
- should parse equality
- should parse ifelse conditions
- should parse nested ifelse
- should parse complex KQL filters
- should throw on unclosed parentheses
- should throw on invalid syntax
- should throw on mismatched quotes
- should generate count query
- should generate average aggregation
- should add time range filter
- should translate simple KQL
- should translate timestamp ranges
- should handle multiple aggregations
- should handle nested aggregations with filters
- should parse and build query for real-world formula

### From `tests/enhanced-formula-builder.test.js`
- parses simple function calls
- parses nested function calls
- parses functions with named arguments
- parses KQL filters
- respects multiplication over addition
- handles parentheses correctly
- handles comparison operators
- parses negative numbers
- parses NOT operator
- parses error rate formula
- parses week over week formula
- parses complex nested formula
- reports unclosed parentheses
- reports invalid syntax
- reports unexpected tokens
- parses simple formulas in under 10ms
- uses cache effectively
- validates correct function calls
- detects unknown functions
- validates function argument count
- validates named arguments
- validates numeric operations
- detects type mismatches in operators
- validates function return types
- detects formula length violations
- detects excessive nesting
- detects forbidden patterns in strings
- warns about high complexity formulas
- suggests optimization for duplicate subexpressions
- validates field existence
- suggests similar fields
- validates in under 100ms
- component is defined
- can create instance
- has required methods
- component is defined (formula editor)
- can create instance (formula editor)
- has required methods (formula editor)

### From `tests/formula-editor-integration.test.js`
- (Need to read this file)

---

## Server & Backend Tests

### From `tests/test_server_endpoints.py`
- test_auth_status_no_cookie
- test_auth_status_with_cookie_header
- test_auth_status_with_x_elastic_cookie_header
- test_auth_status_with_env_cookie
- test_auth_status_priority_order
- test_dashboard_query_no_auth
- test_dashboard_query_validation_error
- test_dashboard_query_with_filters
- test_dashboard_query_empty_filters
- test_dashboard_query_with_env_cookie
- test_dashboard_query_rate_limit

### From `tests/test_dashboard_generation.py`
- test_dashboard_generator_cli
- test_dashboard_generator_import
- test_configuration
- test_cookie_validation
- test_wrapper_script
- test_backward_compatibility

### From `tests/test_cors_proxy.py`
- test_ssl_context_configuration
- test_health_endpoint_success
- test_health_endpoint_cors_headers
- test_get_404_for_unknown_endpoint
- test_options_preflight_request
- test_post_404_for_wrong_endpoint
- test_proxy_request_missing_cookie
- test_proxy_request_success
- test_proxy_request_with_query_params
- test_proxy_request_http_401_error
- test_proxy_request_http_500_error
- test_proxy_request_ssl_error
- test_proxy_request_connection_refused
- test_proxy_request_timeout
- test_proxy_request_generic_exception
- test_send_error_response
- test_proxy_large_request_body
- test_log_message_filtering
- test_main_function
- test_cors_headers_allow_github_pages
- test_all_required_headers_allowed

### From `tests/test_refactored_python.py`
- test_init (TrafficProcessor)
- test_process_response_with_error
- test_process_response_invalid_structure
- test_process_response_success
- test_parse_time_range_hours
- test_calculate_baseline_days
- test_init (ScoreCalculator)
- test_calculate_score_high_volume
- test_calculate_score_medium_volume
- test_determine_status
- test_calculate_scores
- test_get_summary_stats
- test_init (HTMLGenerator)
- test_load_template
- test_load_template_not_found
- test_generate
- test_build_kibana_url
- test_full_pipeline

### From `bin/test_env_validation.py`
- Missing required variables
- Invalid URL format
- Valid development configuration
- Production without security
- Valid production configuration

### From `tests/test_kibana_endpoint.py`
- (Need to read this file)

### From `tests/test_server_production.py`
- (Need to read this file)

### From `tests/test_validate_connections_enhanced.py`
- (Need to read this file)

### From `bin/test_formula_endpoint.py`
- (Need to read this file)

### From `bin/test_full_integration_fixed.py`
- (Need to read this file)

---

## Emil System Tests

### From `assets/js/emil/eid-registry/eid-registry.test.ts`
- should initialize empty
- should initialize with historical data
- should add new EID to registry
- should update existing EID
- should track recent EIDs
- should find EIDs by prefix
- should respect maxResults
- should filter by namespace
- should filter by radset
- should sort alphabetically
- should track hot EIDs based on frequency
- should update hot scores on usage
- should detect trends
- should build hierarchy from EIDs
- should update frequency and recent list
- should handle non-existent EID gracefully
- should export and import state
- should handle large number of EIDs efficiently
- should handle empty search query
- should handle special characters in EID
- should maintain recent list size limit

### From `assets/js/emil/query-engine/query-builder.test.ts`
- should build health check query from intent
- should use default parameters when not provided
- should handle baseline comparison intent
- should calculate time window from context
- should build query from template with parameters
- should throw error for unknown template
- should throw error for missing required parameters
- should validate parameter types
- should validate interval format
- should validate percentage values
- should format array parameters correctly
- should validate valid query
- should detect missing FROM clause
- should detect unclosed brackets
- should detect unresolved placeholders
- should extract parameters from query template
- should handle duplicate parameters
- should handle empty EID array
- should escape special characters in EIDs
- should handle very long time ranges
- should clean up extra whitespace
- should build queries quickly

### From `assets/js/emil/trie/radix-trie.test.ts`
- should insert and retrieve exact matches
- should handle empty key insertion
- should update existing keys
- should find all keys with given prefix
- should return empty array for non-existent prefix
- should respect maxResults parameter
- should include exact prefix match if it exists
- should find exact matches with highest score
- should find partial matches
- should handle character-by-character matching
- should update frequency for existing keys
- should not crash when updating non-existent key
- should return all keys in the trie
- should handle large number of insertions efficiently

---

## UI & Frontend Tests

### From `tests/ui-rad-type-display.test.js`
- (Need to read this file)

### From `tests/uiUpdates.test.js`
- should update summary card counts
- should update timestamp
- should handle empty results
- should handle missing DOM elements gracefully
- should call updateTable with results
- should create table rows for results
- should handle positive scores correctly
- should clear existing table content
- should handle missing tbody gracefully
- should apply correct CSS classes based on status
- should format large numbers with commas
- should escape HTML in display names
- should handle complete dashboard update

### From `tests/consoleVisualization.test.js`
- should create bars with correct proportions
- should handle different characters and widths
- should return correct status icons
- should log visualization header with colors
- should log time window information with colors
- should log custom time window information
- should log summary statistics with multiple colors
- should process mock data correctly
- should display welcome message with colors
- should handle empty data gracefully
- should format bar charts with status colors
- should handle real-world time range scenarios
- should properly truncate long event names
- should format large numbers correctly

### From `tests/searchFilter.test.js`
- should return all results when search term is empty
- should return all results when search term is null
- should filter by display name (case insensitive)
- should filter by event ID
- should return multiple matches
- should handle partial matches
- should return empty array when no matches found
- should trim whitespace from search term
- should return all results when status is null
- should filter by CRITICAL status
- should filter by WARNING status
- should be case insensitive
- should return empty array for non-existent status
- should return all results when no filters applied
- should hide normal and increased when hideNormal is true
- should show only critical when criticalOnly is true
- should prioritize criticalOnly over hideNormal
- should apply search filter only
- should apply status filter only
- should apply threshold filters only
- should apply all filters together
- should handle empty filter object
- should handle no filters parameter
- should save preferences to localStorage
- should load preferences from localStorage
- should return null when no preferences saved
- should handle corrupted localStorage data
- should apply preferences to config
- should handle null preferences gracefully
- should use config values for filtering
- should respect dynamic thresholds in status calculation
- should handle empty results array
- should handle special characters in search
- should handle very long search terms
- should maintain result order after filtering

### From `tests/search-filter-rad-type.test.js`
- (Need to read this file)

---

## Integration Tests

### From `tests/integration.test.js`
- should successfully update dashboard with valid auth
- should handle authentication failure
- should handle API errors gracefully
- should use custom configuration
- should handle network errors
- should work on GitHub Pages without CORS proxy
- should start auto-refresh timer
- should stop auto-refresh timer
- should not start timer if auto-refresh is disabled
- should start timer when config is enabled
- should trigger update after interval
- should handle multiple start calls
- should toggle auto-refresh correctly
- (More tests continue in the file)

### From `tests/integration-rad-type.test.js`
- (Need to read this file)

### From `tests/formula-rad-integration.test.js`
- (Need to read this file)

### From `tests/integration/dashboard-core.test.js`
- (Need to read this file)

---

## Bash/Shell Script Tests

### From `tests/test_bash_scripts.bats`
- run_with_cors.sh: starts both servers successfully
- run_with_cors.sh: handles missing ELASTIC_COOKIE
- run_with_cors.sh: stops existing servers before starting
- run_with_cors.sh: creates index.html successfully
- test_locally.sh: runs dashboard generation
- test_locally.sh: fails without cookie
- run_local_auto.sh: starts server and opens browser
- run_with_cors_direct.sh: uses direct paths for commands
- run_with_cors_direct.sh: handles PATH issues gracefully
- all scripts are executable
- all scripts have valid bash syntax
- generate_dashboard_refactored.sh: generates dashboard successfully
- generate_dashboard_refactored.sh: extracts cookie from local script
- generate_dashboard_refactored.sh: fails when no cookie available
- GitHub Pages deployment: dashboard works without CORS proxy
- scripts handle interruption gracefully
- cookie extraction works with different formats

### From `tests/test_refactored_bash.bats`
- dashboard.config.sh: exports all required variables
- dashboard.config.sh: uses defaults when env vars not set
- error_handler.sh: log_info function works
- error_handler.sh: log_error function works
- error_handler.sh: die function exits with error
- cookie_handler.sh: get_elastic_cookie returns env var when set
- cookie_handler.sh: get_elastic_cookie extracts from local script
- cookie_handler.sh: validate_cookie accepts valid cookie
- cookie_handler.sh: validate_cookie rejects empty cookie
- fetch_kibana_data.sh: requires cookie to be set
- fetch_kibana_data.sh: validates output path
- fetch_kibana_data.sh: handles curl errors
- generate_dashboard_refactored.sh: creates required directories
- integration: full refactored pipeline works
- all shell scripts have proper shebang
- all shell scripts are executable

---

## Utility & Helper Tests

### From `tests/flexibleTimeComparison.test.js`
- (Need to read this file)

### From `tests/timeRange.test.js`
- should parse now-6h correctly
- should parse now-12h correctly
- should parse now-24h correctly
- should parse now-3d correctly (days to hours)
- should parse inspection_time correctly
- should validate inspection_time
- should format inspection_time correctly
- should generate correct filter for inspection_time
- should include inspection_time in presets
- should parse -3h-6h correctly (from 3h ago to 6h ago)
- should parse -1h-4h correctly (from 1h ago to 4h ago)
- should parse -2h-8h correctly
- should parse mixed units like -2h-1d correctly
- should parse -1d-2d correctly (yesterday vs day before)
- should handle invalid format gracefully
- should handle empty string
- should handle null/undefined
- should validate different formats
- should support looking at traffic during a specific incident window
- should support comparing different time periods
- should support maintenance window analysis
- should support inspection time for post-incident analysis
- should format standard ranges correctly
- should format custom ranges correctly
- should format inspection time correctly
- should generate correct filter for relative time range
- should generate correct filter for custom time range
- should generate correct filter for inspection time
- should handle invalid format with default

### From `tests/scoring.test.js`
- should calculate score for traffic drop
- should calculate score for traffic increase
- should return 0 when baseline is 0
- should handle edge cases
- should round to nearest integer
- should return CRITICAL for score <= -80
- should return WARNING for score <= -50 and > -80
- should return NORMAL for negative scores > -50
- should return INCREASED for positive scores
- should return NORMAL for score = 0
- should return CRITICAL for score <= -80 (medium volume)
- should return WARNING for score <= -30 and > -80 (medium volume)
- should return NORMAL for negative scores > -30 (medium volume)
- should return INCREASED for positive scores (medium volume)
- should handle boundary values for high volume
- should handle very low volume
- should handle extreme scores
- should return normal variance for small differences
- should calculate loss impact
- should calculate gain impact
- should handle large numbers with proper formatting
- should handle edge cases
- should handle zero values
- should handle critical traffic drop scenario
- should handle warning scenario for medium volume
- should handle traffic increase scenario
- should handle normal variance scenario

### From `tests/unit/test-utilities.test.js`
- (Need to read this file)

---

## Type & Schema Tests

### From `tests/api-types.test.ts`
- (Need to read this file)

### From `tests/data-layer-rad-type.test.js`
- (Need to read this file)

### From `tests/rad-type-classification.test.js`
- (Need to read this file)

### From `tests/rad-formula-patterns.test.js`
- (Need to read this file)

---

## Memory & Performance Tests

### From `tests/memory-leak-fixes.test.js`
- (Need to read this file)

### From `tests/refactored-modules.test.js`
- (Need to read this file)

---

## AI Integration Tests

### From `tests/ai-formula-integration.test.js`
- (Need to read this file)

---

## Python Test Scripts

### From `tests/test_production_enhancements.py`
- (Need to read this file)

### From `tests/test_metrics_endpoint.py`
- (Need to read this file)

### From `tests/test_rate_limit_fixed.py`
- (Need to read this file)

### From `tests/test_dev_server_fastapi.py`
- (Need to read this file)

### From `tests/test_github_pages_integration.py`
- (Need to read this file)

### From `tests/test_validate_connections_production.py`
- (Need to read this file)

---

## Other Test Files

### From `tests/duplicate-export-fix.test.js`
- (Need to read this file)

### From `tests/formula-builder-fixes.test.js`
- (Need to read this file)

### From `tests/data-service-formula.test.js`
- (Need to read this file)

### From `tests/test-unified-api-migration.js`
- (Need to read this file)

### From `mcp-elasticsearch/test.js`
- (Need to check if this contains actual tests)

### From `test-formula-backend.py`
- (Need to read this file)

---

## Demo & Example Test Files

### From `tests/demo_websocket_backoff.html`
- (HTML demo file, not unit tests)

### From `tests/python_tests_example.py`
- (Example file, need to check if it contains actual tests)

---

## Total Test Count Summary

Based on the files analyzed:
- JavaScript/TypeScript test suites: ~46 files (including new app-store.test.js)
- Individual JavaScript tests: ~1046+ (1000 + 46 new tests)
- Python test suites: ~15 files
- Individual Python tests: ~200+
- Bash test suites: 2 files
- Individual Bash tests: ~40

**Total estimated tests in codebase: ~1,286+**

*Note: Some files marked as "(Need to read this file)" were not fully analyzed in this catalog. The actual total may be higher.*

**Recent additions:** Added 46 comprehensive tests for the Zustand app store, covering state management, actions, selectors, and integration flows.

---

## UNTESTED CODE FILES

This section lists all code files in the codebase that do not have corresponding test files.

### JavaScript/TypeScript Files Without Tests

#### Core Application Files
- `assets/js/main-clean.js` - Main entry point (Vanilla JS + Zustand)
- `assets/js/dashboard-main.js` - Dashboard entry point coordination
- `assets/js/dashboard.js` - Main dashboard entry point
- `assets/js/test-simplified-system.js` - Test suite runner (browser-based)
- `assets/js/dashboard-simplified.js` - Simplified dashboard controller (partial tests in integration.test.js)
- `assets/js/dashboard-ux-migration.js` - Dashboard UX migration utilities
- `assets/js/production-helper.js` - Production utilities

#### Store & State Management
- `assets/js/stores/app-store.js` - Zustand app store ✅ (TESTED - tests/stores/app-store.test.js)
- `assets/js/stores/dom-effects.js` - DOM effects manager (No Tests)

#### API & Services (Missing Tests)
- `assets/js/api-interface.js` - Unified API interface
- `assets/js/api-client-unified.js` - Unified API client (tested as api-client-simplified)
- `assets/js/auth-service.js` - Auth service module
- `assets/js/proxy-client.js` - Proxy client
- `assets/js/direct-elasticsearch-client.js` - Direct ES client
- `assets/js/fastapi-integration.js` - FastAPI integration

#### UI Components (No Tests)
- `assets/js/components/ux-components.js` - UX components registry
- `assets/js/components/animated-branding.js` - Animated branding component
- `assets/js/components/auth-overlay.js` - Auth overlay component
- `assets/js/components/auth-prompt.js` - Auth prompt component
- `assets/js/components/loading-overlay.js` - Loading overlay component
- `assets/js/components/loading-overlay-ux.js` - UX loading overlay

#### Data Processing & Utils (Missing Tests)
- `assets/js/data-layer.js` - Data layer for ES operations (partial tests)
- `assets/js/connection-status-manager.js` - Connection status management
- `assets/js/console-visualizer.js` - Console visualization
- `assets/js/crypto-utils.js` - Cryptography utilities
- `assets/js/security-utils.js` - Security utilities
- `assets/js/state-logging-demo.js` - State logging demo
- `assets/js/resource-manager.js` - Resource management
- `assets/js/cleanup-manager.js` - Cleanup utilities
- `assets/js/event-emitter.js` - Event emitter

#### Configuration (No Tests)
- `assets/js/config-editor.js` - Configuration editor UI
- `assets/js/config-manager.js` - Configuration manager
- `assets/js/config-service.js` - Configuration service (partial tests)

#### UI Utilities (Missing Tests)
- `assets/js/ui-updater.js` - UI updater (partial tests in uiUpdates.test.js)
- `assets/js/ui-consolidation.js` - UI consolidation
- `assets/js/cookie-modal.js` - Cookie modal UI

#### Theme & Styling (No Tests)
- `assets/js/theme-manager.js` - Theme manager
- `assets/js/theme/rad-theme.js` - RAD theme

#### Formula Builder Components (Missing Tests)
- `assets/js/formula-builder/core/formula-experiment-manager.js`
- `assets/js/formula-builder/core/formula-functions.js`
- `assets/js/formula-builder/core/formula-rad-cards.js`
- `assets/js/formula-builder/core/formula-synthesizer.js`
- `assets/js/formula-builder/core/formula-synthesizer-extensions.js`
- `assets/js/formula-builder/core/formula-entities.js`
- `assets/js/formula-builder/core/formula-event-tracker.js`
- `assets/js/formula-builder/core/formula-composer.js`
- `assets/js/formula-builder/core/formula-types.js`
- `assets/js/formula-builder/core/index.js`
- `assets/js/formula-builder/ui/formula-editor.js`
- `assets/js/formula-builder/ui/visual-builder.js`
- `assets/js/formula-builder/ui/function-palette.js`
- `assets/js/formula-builder/translator/query-builder.js`
- `assets/js/formula-builder/integration/api-adapter.js`
- `assets/js/formula-builder/integration/dashboard-connector.js`
- `assets/js/formula-builder/utils/formula-utils.js`
- `assets/js/formula-builder/utils/query-utils.js`
- `assets/js/formula-builder/utils/validation-utils.js`
- `assets/js/formula-builder/workers/validation-worker.js`
- `assets/js/formula-builder/ai/formula-ai-assistant.js`
- `assets/js/formula-builder/index.js`

#### Formula Integration (No Tests)
- `assets/js/visual-formula-builder-integration.js` - Visual formula builder integration
- `assets/js/ai-formula-integration.js` - AI formula integration
- `assets/js/formula-editor-integration.js` - Formula editor integration (partial tests)

#### Emil Components (Missing Tests)
- `assets/js/emil/ui/eid-selector.ts` - EID selector UI
- `assets/js/emil/ui/virtual-scroll.ts` - Virtual scrolling
- `assets/js/emil/ui/query-panel.ts` - Query panel UI
- `assets/js/emil/ui/query-results-viewer.ts` - Results viewer
- `assets/js/emil/services/esql-executor.ts` - ES|QL executor
- `assets/js/emil/utils/error-handler.ts` - Error handler
- `assets/js/emil/utils/eid-parser.ts` - EID parser
- `assets/js/emil/esql/query-templates.ts` - Query templates
- `assets/js/emil/esql/template-types.ts` - Template types
- `assets/js/emil/esql/template-types-fixed.ts` - Fixed template types
- `assets/js/emil/types/index.ts` - Type definitions
- `assets/js/emil/index.ts` - Emil entry point

#### Legacy/Utilities (No Tests)
- `assets/js/cors-direct-override.js` - CORS override
- `assets/js/types.js` - Type definitions
- `assets/js/flexible-time-comparison.js` - Time comparison (tests exist but not read)

### Python Files Without Tests

#### Server Files (Missing Tests)
- `bin/simple-server.py` - Simple HTTP server
- `bin/health_check.py` - Health check utility

#### Scripts (No Tests)
- `scripts/enable_multi_rad_demo.py` - Multi-RAD demo enabler
- `src/data/process_data.py` - Data processor (tested via test_refactored_python.py)
- `test-formula-backend.py` - Formula backend test script

### Shell Scripts Without Tests

#### Setup Scripts
- `scripts/setup/ensure_correct_dashboard.sh`
- `scripts/setup/setup_and_run.sh`
- `scripts/setup/validate_connections.sh`
- `scripts/setup/cleanup-ports.sh`

#### Runner Scripts
- `scripts/runners/run_with_cors.sh` (partial tests in test_bash_scripts.bats)
- `scripts/runners/run_simple_dev.sh`
- `scripts/runners/run_dev.sh`
- `scripts/runners/run_all_tests.sh`

#### Test Scripts
- `scripts/tests/test_locally.sh` (partial tests in test_bash_scripts.bats)
- `scripts/tests/test_refactored.sh`

#### Configuration
- `config/dashboard.config.sh` (tested in test_refactored_bash.bats)

#### Library Scripts
- `scripts/lib/error_handler.sh` (tested in test_refactored_bash.bats)
- `scripts/lib/cookie_handler.sh` (tested in test_refactored_bash.bats)

#### Data Scripts
- `src/data/fetch_kibana_data.sh` (tested in test_refactored_bash.bats)

#### Other Scripts
- `scripts/verify-config.sh`
- `sync-cookie.sh`
- `start-correct-server.sh`
- `migrate_to_refactored.sh`
- `cleanup-legacy.sh`
- `cleanup-old-templates.sh`
- `create_master_backup.sh`
- `deploy-production.sh`

## State Management Tests

### From `tests/stores/app-store.test.js`
- should initialize with default state
- should have all required actions
- should return auth state via useAuth
- should return connection state via useConnection
- should return UI state via useUI
- should return data state via useData
- should return filters state via useFilters
- should return actions via useActions
- should authenticate with stored cookie from CentralizedAuth
- should authenticate with stored cookie from localStorage
- should authenticate with URL parameter
- should show auth prompt when no auth found
- should handle errors gracefully
- should have minimum delay to prevent flash
- should set cookie with sid prefix
- should not duplicate sid prefix
- should fallback to localStorage when CentralizedAuth not available
- should clear auth and show auth prompt
- should update loading state with message
- should update loading state without changing message
- should show modal
- should hide modal
- should add growl message with default type and duration
- should add growl message with custom type and duration
- should auto-remove growl after duration
- should remove specific growl message
- should set data and calculate stats
- should apply filters after setting data
- should filter by status
- should filter by search term - name
- should filter by search term - radType
- should filter by RAD types
- should apply multiple filters
- should show all events when status is "all"
- should be case insensitive for search
- should update connection status
- should update multiple connection systems
- should handle successful login flow with stored cookie
- should handle login flow with URL parameter
- should handle failed login flow
- should handle initialization error
- should load and filter data correctly
- should handle configuration changes during runtime
- should notify subscribers on state changes
- should be available on window for debugging

### JavaScript Tool Scripts Without Tests

- `scripts/security-audit.js`
- `scripts/validate-antares-theme.js`
- `scripts/check-coherence.js`
- `scripts/migrate-to-antares.js`
- `scripts/setup/init-config.js`

### Proxy Service Files Without Tests

- `proxy-service/netlify/functions/proxy.js`
- `proxy-service/val-town-proxy.js`

### MCP Service Files Without Tests

- `mcp-elasticsearch/index.js` (has test.js but needs verification)
- `mcp-formula-builder/index.js`
- `mcp-metrics-service/index.js`
- `mcp-query-engine/index.js`
- `mcp-rad-analytics/index.js`
- `mcp-rad-monitor/index.js`

### Root-Level Test Files

- `test-mcp.js` - MCP test file

---

## Summary of Untested Code

### By Category:
- **JavaScript Core**: ~25 files
- **JavaScript UI Components**: ~15 files
- **JavaScript Formula Builder**: ~20 files
- **JavaScript Emil System**: ~10 files
- **Python Scripts**: ~5 files
- **Shell Scripts**: ~20 files
- **Tool Scripts**: ~5 files
- **Service Files**: ~10 files

**Total Untested Files: ~110 files**

### Critical Untested Areas:
1. ~~**State Management** - Zustand store has no tests~~ ✅ DONE
2. **Formula Builder** - Most formula builder components lack tests
3. **UI Components** - No tests for UX component integration
4. **Shell Scripts** - Many deployment and setup scripts untested
5. **MCP Services** - Model Context Protocol services lack tests
6. **Emil UI** - UI components for Emil have no tests

### Recommendations:
1. ~~Priority 1: Test state management (app-store.js)~~ ✅ COMPLETED
2. Priority 2: Test critical services (auth-service.js, config-service.js)
3. Priority 3: Test formula builder core functionality
4. Priority 4: Test deployment scripts
5. Priority 5: Test UI components

### Recent Test Additions:
- **App Store Tests (tests/stores/app-store.test.js)** - 46 comprehensive tests covering:
  - State initialization and shape
  - All store actions (auth, UI, data, filters, connections)
  - Selector functions
  - Integration flows (login, data loading, config changes)
  - Store subscriptions and global access
  - Proper test isolation with store reset between tests
