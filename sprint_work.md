# Sprint Work Assignments - VH RAD Traffic Monitor

## Overview
This document contains comprehensive work tickets for 7 development agents to work in parallel on critical issues identified in the VH RAD Traffic Monitor project. Agent 1 (Lead Dev) will oversee and coordinate the sprint.

**Sprint Goal:** Prepare VH RAD Traffic Monitor for production deployment with FastAPI, fixing all critical security vulnerabilities, memory leaks, and configuration issues.

**Critical Success Factors:**
1. No security vulnerabilities (all cookies encrypted, no hardcoded secrets, no sensitive logging)
2. No memory leaks (stable 24+ hour operation)
3. Fully configurable deployment (works in dev/staging/prod, all URLs/ports from env/config, all validated at startup)
4. Comprehensive test coverage and monitoring (including security, integration, and memory leak tests)
5. Formula Builder working end-to-end (core production feature, all imports resolved)

---

## Agent 2: Memory Management & Performance Specialist

### Ticket: Fix Critical Memory Leaks and Performance Issues

**Priority:** 🔴 CRITICAL - Production Stability
**Estimated Effort:** 3-5 days
**Blocking:** Production deployment cannot proceed without these fixes

### Objective
Fix all memory leaks and performance issues that are causing the application to degrade over time and potentially crash after 4-6 hours of use.

### Specific Tasks
- [ ] Add LRU eviction (50-item limit) to all unbounded caches:
  - `assets/js/data-layer.js` (lines 19-24) - responseCache and parsedCache Maps
  - `assets/js/api-client-unified.js` (line 61) - metrics object
  - `assets/js/config-service.js` (line 8) - listeners array
  - `assets/js/formula-builder/core/formula-functions.js` - audit for unbounded collections
  - `assets/js/formula-builder/core/formula-experiment-manager.js` (lines 282-286) - unbounded Map growth
- [ ] Clean up all event listeners and timers:
  - `dashboard-simplified.js` (lines 566-588) - cancel requestAnimationFrame on destroy
  - `data-layer.js` (lines 876-901) - implement removeEventListener mechanism
  - `api-client-unified.js` (lines 619-637, 545-588) - WebSocket handlers and wsReconnectInterval
  - `connection-status-manager.js` (lines 62-73) - 10+ window event listeners
  - `search-filter.js` (lines 19-29) - input event listeners cleanup
  - `ui-updater.js` (lines 341-377) - listeners on dynamically created elements
  - `enhanced-formula-editor.js` (lines 630-640) - syntaxHighlightTimer
  - `formula-event-tracker.js` (line 317) - interval cleanup
  - `formula-experiment-manager.js`, `validation-worker.js` - audit for cleanup
- [ ] Remove global references and DOM leaks:
  - `main-clean.js` (line 153) - unsubscribe DashboardIntegration store subscription
  - `dashboard.js` (line 33) - remove or manage global window.Dashboard reference
  - `connection-status-manager.js` (line 27) - DOM refs in this.elements.loadingItems
  - `ui-updater.js` (lines 341-377) - event listeners on dynamic elements
- [ ] Fix Web Workers and background tasks:
  - `validation-worker.js` (lines 186-189) - insufficient cache cleanup
  - `formula-experiment-manager.js` (lines 282-286) - unbounded Map growth
- [ ] Fix LocalStorage accumulation issues:
  - `formula-experiment-manager.js` (lines 295-297) - no size limit
  - Multiple files using unencrypted localStorage (coordinate with Agent 3)
- [ ] Implement and integrate ResourceManager pattern for centralized cleanup
- [ ] Process large datasets in chunks (avoid blocking UI)
- [ ] Debounce regex tokenization in formula editor (lines 971-1032 in enhanced-formula-editor.js)
- [ ] Optimize O(n²) loops and DOM updates:
  - `data-layer.js` (lines 850-863) - bucket counting algorithm
  - `ui-updater.js` (lines 30-88) - use DocumentFragment for bulk DOM updates
  - `enhanced-visual-builder.js` (lines 1403-1418) - cache DOM queries
- [ ] Test with Chrome DevTools Memory Profiler and large datasets

### Definition of Done
- [ ] Memory usage reduced by 40-60% in long-running sessions
- [ ] No memory growth over time (stable heap size)
- [ ] UI responsiveness improved by 3-4x
- [ ] Application stable for 24+ hour sessions
- [ ] ResourceManager pattern integrated throughout
- [ ] All 30+ memory leaks identified in agent_collab.md are fixed

---

## Agent 3: Security & Authentication Specialist

### Ticket: Complete Cookie Security Standardization and Fix Authentication Inconsistencies

**Priority:** 🔴 CRITICAL - Security Vulnerability
**Estimated Effort:** 2-3 days

### Objective
Standardize all cookie storage to use encrypted storage and fix the inconsistent authentication implementation across the codebase.

### Specific Tasks
- [ ] **CRITICAL: Fix environment validation system** - `bin/env_validator.py` has syntax error preventing startup validation
- [ ] Update all remaining files to use centralized encrypted storage and a single key ('rad_monitor_auth'):
  - `config-editor.js` (line 323)
  - `auth-service.js` (lines 54, 120, 207, 222)
  - `config-service.js` (lines 236, 243, and any other direct localStorage usage)
  - `assets/js/stores/app-store.js`
  - `direct-elasticsearch-client.js`
  - `api-client-simplified.js` (line 340)
- [ ] Implement migration logic for legacy keys ('elasticCookie', 'elastic_cookie')
- [ ] Remove pre-configured cookie support in production (`config-service.js` lines 137-140, 226-246)
- [ ] Add automated grep-based test to prevent future sensitive cookie/header logging
- [ ] Implement CSRF protection for all state-changing operations
- [ ] Add rate limiting per IP address
- [ ] Fix XSS vulnerabilities (replace all uses of innerHTML with safe DOM manipulation):
  - `ui-updater.js`, `formula-builder/ui/enhanced-visual-builder.js`, `components/auth-overlay.js`
  - **61 files using innerHTML found** - comprehensive audit needed
- [ ] Add comprehensive input validation for all user input (formula builder, search filters, API params)
- [ ] Remove eval() usage in formula builder (security vulnerability)
- [ ] Audit and remove any API keys or secrets from client-side code
- [ ] Ensure all auth tokens are httpOnly and secure in production
- [ ] Implement proper error handling to prevent information leakage
- [ ] Create security regression and penetration tests
- [ ] Add automated security scanning and vulnerability detection
- [ ] **All cookie storage and authentication configuration must use centralized encrypted storage and be validated via `env_validator.py`.**
- [ ] **No sensitive data should be logged; automated grep-based tests should be run to enforce this.**
- [ ] **All new security-related environment variables must be added to `env_validator.py` and documented.**

### Definition of Done
- [ ] All cookie storage uses centralized encryption and a single key
- [ ] No sensitive data logged anywhere
- [ ] CSRF protection and rate limiting implemented
- [ ] XSS and input validation issues fixed
- [ ] Security tests passing
- [ ] Migration strategy documented and tested

---

## Agent 4: Frontend Architecture & Configuration Specialist

### Ticket: Remove All Hardcoded URLs and Implement Proper Configuration Management

**Priority:** 🔴 CRITICAL - Production Deployment Blocker
**Estimated Effort:** 2-3 days

### Objective
Replace all hardcoded URLs, ports, and endpoints with proper environment variable management and ensure all new config variables are validated.

### Specific Tasks
- [ ] Update all known files and run a comprehensive search for hardcoded URLs/ports (at least 11 files):
  - `config-service.js` (lines 48, 51) - hardcoded `http://localhost:8000`
  - `ui-updater.js` (line 94) - hardcoded Kibana URL
  - `api-client-unified.js` (lines 35, 49, 422) - localhost, WebSocket, and Elasticsearch URLs
  - `centralized-auth.js` (lines 150, 158) - auth endpoints and Netlify proxy URL
  - `fastapi-integration.js` (lines 38-39) - API and WebSocket URLs
  - `cors-direct-override.js` (line 48) - hardcoded Elasticsearch URL
  - `direct-elasticsearch-client.js` (line 8) - hardcoded Elasticsearch URL
  - `api-client-simplified.js` (line 340) - hardcoded URLs
  - Chrome extension files (background.js, popup.js)
  - `bin/server.py` (lines 82, 84, 140, 363), `bin/generate_dashboard.py` (lines 90, 92, 587), `bin/server_production.py` (lines 76, 304) - verify all use validated_env
  - Test files and scripts in `scripts/setup/init-config.js`
- [ ] Remove 60+ unnecessary files identified in cleanup analysis:
  - All temporary/analysis documentation (*_AUDIT_RESULTS.md, *_SUMMARY.md, *_STATUS.md, POST_MORTEM_*.md, etc.)
  - All radar/AI experiment files (radar_*.py, connect_radar_*.py, radar_*.json, etc.)
  - All test/demo HTML files from root (move to tests/)
  - All temporary files (distributed_ai_backup_*.tar.gz, *-test-results.json, *.pre-antares)
  - Chrome extension directory (unless specifically required)
- [ ] Consolidate duplicate code:
  - Keep api-client-unified.js, remove api-client-simplified.js
  - Keep server_production.py, remove server.py, server_enhanced.py, simple-server.py
  - Keep validate_connections_production.py, remove other validation scripts
  - Determine primary dashboard implementation and remove others
- [ ] Refactor monolithic files:
  - Split `api-client-unified.js` (751 lines) into auth, api, websocket, cache modules
  - Split `config-service.js` (843 lines) into config-loader, config-validator, config-store
  - Split `data-layer.js` (1365 lines) into data-fetch, data-process, data-cache, data-events
- [ ] Add all new URL variables to `bin/env_validator.py` and document them in `docs/ENVIRONMENT_VALIDATION.md`
- [ ] Ensure all URL references use `ConfigService.getApiUrl()` or validated_env
- [ ] Update WebSocket URLs to use environment configuration
- [ ] Test with both development and production configurations
- [ ] Remove all hardcoded URLs/ports except in config files
- [ ] **All hardcoded URLs/ports must be replaced with environment/config-driven values and validated at startup.**
- [ ] **All new config variables must be added to `env_validator.py` and documented in `docs/ENVIRONMENT_VALIDATION.md`.**
- [ ] **The environment validation system will now catch missing or invalid configuration at startup.**

### Definition of Done
- [ ] No hardcoded URLs/ports remain in codebase (except config)
- [ ] All URLs/ports validated by env_validator.py
- [ ] Application works in all environments
- [ ] Documentation updated

---

## Agent 5: Testing & Quality Assurance Specialist

### Ticket: Create Comprehensive Test Suite and Fix Broken Tests

**Priority:** 🟡 HIGH - Quality Assurance
**Estimated Effort:** 3-4 days

### Specific Tasks
- [ ] **CRITICAL: Fix dashboard module import crisis** - Multiple tests failing with "Failed to resolve import '../src/dashboard.js'"
- [ ] **CRITICAL: Fix missing Python modules** - `cors_proxy`, `dev_server_fastapi`, `data.processors` causing test failures
- [ ] Fix all broken tests listed in `tests/BROKEN_TESTS_TODO.md`
- [ ] Update tests that rely on hardcoded URLs
- [ ] **Fix test success rate from 86% to 95%+** - Currently 351/406 tests passing
- [ ] Add security, integration, and memory leak tests (including for cookie encryption, XSS, input validation, error message sanitization, pre-configured cookie blocking)
- [ ] Achieve 80%+ code coverage on critical paths
- [ ] Add integration tests for formula builder with fixed imports
- [ ] Move test HTML files from root to tests directory
- [ ] Add test coverage reporting and CI integration
- [ ] Create test data fixtures and mock services
- [ ] Add end-to-end testing framework (Cypress/Playwright)
- [ ] Add performance testing and benchmarking
- [ ] Add security regression tests and penetration testing
- [ ] Document all testing best practices and troubleshooting
- [ ] **Test suite for environment validation is in `bin/test_env_validation.py`.**
- [ ] **Tests must cover configuration errors, missing/invalid environment variables, and fail-fast behavior.**
- [ ] **All new config variables must have corresponding tests and documentation.**

### Definition of Done
- [ ] All existing and new tests fixed and passing
- [ ] 80%+ code coverage on critical paths
- [ ] Security and integration tests implemented
- [ ] CI/CD pipeline runs all tests
- [ ] Test documentation complete

---

## Agent 6: DevOps & Infrastructure Specialist

### Ticket: Complete Production Deployment Pipeline and Monitoring Setup

**Priority:** 🟡 HIGH - Production Readiness
**Estimated Effort:** 3-4 days

### Specific Tasks
- [ ] **CRITICAL: Fix GitHub Actions CI/CD pipeline** - `brb-github/workflows/test-deployment.yml` references deleted `src/` directory
- [ ] Review and enhance `deploy-production.sh` (add rollback, health checks, validation)
- [ ] **Add Docker configuration** - Create Dockerfile, docker-compose.yml for containerized deployment
- [ ] Add blue-green deployment support
- [ ] Implement comprehensive monitoring (Grafana, Prometheus, OpenTelemetry, log aggregation)
- [ ] Set up alerting rules (high error rates, memory usage, response time, WebSocket failures, auth failures)
- [ ] Implement Redis cluster for caching, load balancer, auto-scaling, disaster recovery, backup/restore
- [ ] Configure WAF, DDoS protection, security scanning, secrets management, audit logging
- [ ] Make Redis and Prometheus optional (server should warn, not crash)
- [ ] Optimize Docker images, configure CDN, request caching, connection pooling, compression
- [ ] Create Terraform/Kubernetes/Ansible infrastructure as code
- [ ] **Add centralized log aggregation system** - Currently logs scattered across multiple files
- [ ] **Implement application performance monitoring (APM)** - Missing OpenTelemetry integration
- [ ] Update all deployment and monitoring documentation
- [ ] Add all new environment variables to `env_validator.py` and documentation
- [ ] **All deployment and monitoring scripts must ensure environment validation passes before proceeding.**
- [ ] **Any new infrastructure-related environment variables must be added to `env_validator.py` and documented.**

### Definition of Done
- [ ] Automated deployment with rollback works
- [ ] All monitoring dashboards active
- [ ] Alerting rules configured and tested
- [ ] Infrastructure fully documented
- [ ] Load testing shows system handles 1000+ concurrent users
- [ ] Disaster recovery tested successfully
- [ ] Security scan shows no critical vulnerabilities

---

## Agent 7: Formula Builder & API Integration Specialist

### Ticket: Fix Formula Builder Core Functionality and Consolidate API Implementations

**Priority:** 🔴 CRITICAL - Core Feature Broken
**Estimated Effort:** 3-4 days

### Specific Tasks
- [ ] **CRITICAL: Fix missing Python modules** - `cors_proxy`, `dev_server_fastapi`, `data.processors` breaking backend functionality
- [ ] Fix import paths and exports for `enhanced-ast-parser.js` and `enhanced-validator.js` (modules now exist, but may need alignment)
- [ ] Ensure all formula builder imports are resolved and the feature loads without errors
- [ ] Consolidate API client implementations (migrate to single API abstraction layer, remove deprecated files)
- [ ] **Fix package.json server reference** - Currently points to wrong server implementation
- [ ] Implement all required formula builder API endpoints in backend (`server_production.py`)
- [ ] Add OpenAPI/Swagger documentation for all endpoints
- [ ] Connect formula builder UI to backend API, implement real-time validation and execution
- [ ] Add formula execution with live preview, autocomplete, templates, and visual builder option
- [ ] **Integrate MCP services** - 6 MCP service directories exist but not integrated
- [ ] Add unit, integration, and performance tests for formula builder
- [ ] Update all formula builder documentation

### Definition of Done
- [ ] Formula builder loads without errors
- [ ] All imports resolved (no missing modules)
- [ ] Single, clean API client implementation
- [ ] All formula functions working
- [ ] Real-time validation functioning
- [ ] OpenAPI documentation complete and accessible
- [ ] 90%+ test coverage for formula core
- [ ] Integration with dashboard verified
- [ ] Documentation complete and accurate

---

## Sprint Coordination Notes

### Dependencies
- Agent 3's cookie standardization must complete first (highest security priority)
- Agent 2's memory fixes are critical and block production deployment
- Agent 4's URL fixes block deployment to different environments
- Agent 5's tests depend on fixes from Agents 2, 3, and 4
- Agent 6's monitoring should track metrics from Agent 2's performance fixes
- Agent 7's formula builder fixes are critical for feature completeness
- Agent 7 should coordinate with Agent 4 on API client refactoring
- **All new config variables must be validated in `env_validator.py` and documented in `docs/ENVIRONMENT_VALIDATION.md`.**
- **The environment validation system now enforces configuration correctness at startup and will block deployment if any required variable is missing or invalid.**
- **Security, memory, and configuration issues are tightly coupled and must be resolved in parallel for production readiness.**

### Risk Mitigation
- If any CRITICAL issue cannot be resolved, escalate immediately to Agent 1
- Security issues (Agent 3) take precedence over all other work
- Memory leaks (Agent 2) must be fixed before production deployment
- Formula Builder (Agent 7) is a core feature - modules exist but imports may need fixing
- Cookie encryption standardization is only complete in two files; all others must be updated

### Success Criteria
- All CRITICAL security issues resolved (cookie encryption in all files, no hardcoded URLs, no sensitive logging)
- Memory leaks fixed - 30+ issues identified, application must be stable for 24+ hour sessions
- Successful deployment to production environment with FastAPI
- All tests passing with 80%+ coverage on critical paths
- Monitoring shows healthy metrics (memory stable, <500ms response times)
- No hardcoded configuration values in codebase (all must be validated)
- Formula Builder fully functional with all imports resolved
- Single consolidated API client implementation
- All cookie storage uses centralized encryption and a single key

### Timeline
- Sprint Duration: 1 week
- Day 1-2: Critical security fixes (Agent 3), memory leak fixes (Agent 2), and formula builder modules (Agent 7)
- Day 3: Mid-sprint review and integration check
- Day 4-5: Configuration fixes (Agent 4), API consolidation (Agent 7), and testing (Agent 5)
- Day 6: Final integration and infrastructure setup (Agent 6)
- Day 7: Production deployment readiness review

### Daily Sync Requirements
- Morning standup: Report progress and blockers
- Evening update: Update agent_collab.md with completed work
- Critical issues: Immediate escalation to Agent 1

### Definition of "Production Ready"
1. All CRITICAL tickets resolved
2. **Environment validation system working** (currently broken - syntax error in env_validator.py)
3. **Test success rate 95%+** (currently 86% - 351/406 tests passing)
4. **CI/CD pipeline functional** (currently broken - GitHub Actions references deleted directories)
5. Zero known security vulnerabilities (all cookies encrypted, no hardcoded URLs, no sensitive logging)
6. Memory stable over 24-hour test (30+ memory leaks identified, must all be fixed)
7. Successfully deploys to staging environment
8. All critical path tests passing
9. Monitoring and alerting configured
10. Documentation complete and up to date
11. Formula Builder functional with OpenAPI docs
12. All hardcoded URLs replaced with config and validated
13. All 30+ memory leaks fixed and verified with heap profiler
14. Cookie storage standardized to single encrypted key across all files
15. **Docker containerization ready** (currently missing)
16. **Missing Python modules resolved** (cors_proxy, dev_server_fastapi, data.processors)
