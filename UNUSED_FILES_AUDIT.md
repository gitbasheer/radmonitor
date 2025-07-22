# Unused/Old Files Audit

**Generated:** 2025-01-13
**Purpose:** List potentially unused, old, or outdated files for manual review and cleanup

## 🚨 High Priority - Definitely Unused/Old

### Archive Directory
All files in `archive/` appear to be old documentation backups:
- `archive/docs-backup-20250627-144826/progress.md`
- `archive/docs-backup-20250627-144826/SIMPLIFICATION_SUMMARY.md`
- `archive/docs-backup-20250627-144826/gh-pages-status.md`
- `archive/docs-backup-20250627-144826/CHANGES_SUMMARY.md`
- `archive/docs-backup-20250627-144826/tests/` (entire directory)
- `archive/docs-backup-20250627-144826/proxy-service/` (entire directory)
- `archive/docs-backup-20250627-144826/docs/` (entire directory)
- `archive/docs-backup-20250627-144826/SIMPLIFICATION_GUIDE.md`
- `archive/docs-backup-20250627-144826/user-journey-diagram.md`
- `archive/docs-backup-20250627-144826/WORKING_SETUP_SUMMARY.md`
- `archive/docs-backup-20250627-144826/UPDATE_PROXY_URL.md`
- `archive/docs-backup-20250627-144826/lens_formula_reference.md`
- `archive/docs-backup-20250627-144826/GITHUB_SECRETS_SETUP.md`
- `archive/docs-backup-20250627-144826/PROJECT_ANALYSIS.md`
- `archive/docs-backup-20250627-144826/PROJECT_COMPLETION_CHECKLIST.md`

### Backup Files (from migrations)
**Status Update**: No `.pre-antares` backup files currently found in the repository.
Migration appears to have been completed and backup files cleaned up.

### Obsolete Backend Files
According to CLEANUP_CHECKLIST.md, these are ready for deletion:
- `bin/dev_server.py`
- `bin/cors_proxy.py`
- `bin/centralized_api.py`
- `bin/dev_server_fastapi.py`

### Old API Clients (Migration in Progress)
According to MIGRATION_STATUS.md, these are ready for deletion:
- `assets/js/api-client.js`
- `assets/js/api-client-fastapi.js`
- `assets/js/api-client-simplified.js`

## 🟡 Medium Priority - Likely Duplicates/Outdated

### Multiple Main Entry Points
Current project has multiple entry points:
- `assets/js/main-clean.js` (**CURRENTLY USED** by index.html)
- `assets/js/main.js` (referenced in docs but may not be current)
- `assets/js/main-simplified.js` (mentioned in documentation but may be outdated)

**Note**: `main-clean.js` appears to be the current active entry point used by index.html

### Multiple Dashboard Files
- `assets/js/dashboard-simplified.js` (appears to be older version)
- `assets/js/dashboard-main.js` (may be current, need verification)

### Duplicate Requirements Files
Based on documentation, these should be consolidated:
- `requirements-enhanced.txt` (should be merged into requirements.txt)
- `requirements-minimal.txt` (should be merged into requirements.txt)

### Old Configuration Files
- `env.sample` (appears to be duplicate of env.example)

### Test Files for Deleted Functionality
According to `tests/BROKEN_TESTS_TODO.md`, these test files reference deleted functionality:
- `tests/test_centralized_config.py`
- `tests/test_config_api.py`
- `tests/test_data_models.py`
- `tests/test_multi_rad_support.py`

### Demo/Test HTML Files (Multiple versions)
Many test HTML files that may be outdated:
- `demo-antares-features.html`
- `enhanced-formula-builder-demo.html`
- `formula-builder-demo.html`
- `formula-editor-demo.html`
- `test-ai-formula-integration.html`
- `test-antares-complete.html`
- `test-antares-theme.html`
- `test-auth-flow.html`
- `test-clean-setup.html`
- `test-formula-fixes.html`
- `test-formula-integration.html`
- `test-unified-api-migration.html`
- `kibana-cookie-sync.html`

## 🟢 Low Priority - Phase Documentation (Potentially Outdated)

### PHASE Documentation Files
These appear to be project management docs that may be outdated:
- `PHASE_5_TEST_PROGRESS.md`
- `PHASE_5_TEST_ROADMAP.md`
- `PHASE_5B_BATCH1_SUMMARY.md`
- `PHASE_5B_BATCH2_SUMMARY.md`
- `PHASE_5B_BATCH3_SUMMARY.md`
- `PHASE_5B_BATCH4_SUMMARY.md`
- `PHASE_5B_BATCH5_SUMMARY.md`
- `PHASE_5B_ROADMAP.md`
- `PHASE_6_SECURITY_ROADMAP.md`
- `PHASE_7_PERFORMANCE_ROADMAP.md`

### Project Analysis Documents (Potentially Outdated)
- `ARCHITECTURE_MAPPING.md`
- `COMPLETE_CODEBASE_DIAGRAM.md`
- `COHERENCE_FIX_PLAN.md`
- `COHERENCE_UPDATE_SUMMARY.md`
- `MIGRATION_STATUS.md`
- `PRODUCTION_READINESS_ANALYSIS.md`
- `PRODUCTION_READY_SUMMARY.md`

### Cleanup Documentation (May be completed)
- `CLEANUP_CHECKLIST.md`
- `CLEANUP_SUMMARY.md`
- `checklist.md`

## 🔵 Files to Investigate Further

### Potential Duplicates
- `assets/js/data-service.js` vs `assets/js/data-layer.js` (similar functionality?)
- `assets/js/config-service.js` vs `assets/js/config-manager.js` vs `assets/js/config-loader.js`
- `assets/js/centralized-auth.js` vs `assets/js/auth-service.js`

### Old Test Files (Large number)
Many test files that may be testing deprecated functionality:
- `tests/fastapiClient.test.js` (marked as deprecated in docs)
- `tests/duplicate-export-fix.test.js`
- `tests/formula-builder-fixes.test.js`
- `tests/setup.js` vs `tests/setup-improved.js`

### Scripts in bin/ directory
Multiple similar server scripts:
- `bin/server.py`
- `bin/server_production.py`
- `bin/simple-server.py`
- `bin/health_check.py`
- `bin/validate_connections.py`
- `bin/validate_connections_enhanced.py`
- `bin/validate_connections_production.py`
- `bin/validate_connections_simple.py`

### Formula Builder Files (Potentially redundant)
- `formula-builder-example.js` (example file)
- `assets/js/formula-editor-integration.js`
- `assets/js/visual-formula-builder-integration.js`

## 📋 Recommended Actions by Category

### Immediate Deletion (High Confidence)
1. **Archive directory**: Delete entire `archive/` directory
2. **Obsolete backend**: Delete the 4 backend files listed in cleanup checklist
3. **Broken tests**: Delete the 4 Python test files that reference deleted `src/`

**Note**: No `.pre-antares` backup files found - migration cleanup appears complete

### Investigation Required (Medium Priority)
1. **API clients**: Verify migration is complete, then delete old clients
2. **Main entry points**: Determine which main.js file is canonical
3. **Requirements files**: Consolidate into single requirements.txt
4. **Demo HTML files**: Determine which are still needed for testing

### Documentation Review (Low Priority)
1. **PHASE files**: Review if project phases are complete, archive if outdated
2. **Analysis docs**: Check if these are still relevant or can be archived
3. **Cleanup docs**: Archive if cleanup tasks are complete

## 🚀 Next Steps

1. **Verify Current Usage**: Before deleting any files, run:
   ```bash
   # Check for imports/references to suspicious files
   grep -r "main-clean" . --exclude-dir=node_modules
   grep -r "api-client-simplified" . --exclude-dir=node_modules
   grep -r "dashboard-simplified" . --exclude-dir=node_modules
   ```

2. **Test Current Functionality**: Ensure current system works before cleanup:
   ```bash
   npm run dev
   npm test
   ```

3. **Create Backup**: Before mass deletion:
   ```bash
   git tag pre-cleanup-audit
   git push origin pre-cleanup-audit
   ```

4. **Staged Cleanup**: Delete files in stages, testing after each stage

##  Estimated Impact

- **Archive directory**: ~15-20 files, safe to delete
- **Old API clients**: ~3 files, significant cleanup after migration verification
- **Demo HTML files**: ~12 files, moderate cleanup
- **Documentation**: ~20 files, significant cleanup if outdated
- **Broken test files**: ~4 files, safe to delete
- **Total estimated**: 45-60 files could potentially be removed

**Updated**: No `.pre-antares` backup files found - migration cleanup already complete

## 🎉 CLEANUP COMPLETED!

**Date Completed:** 2025-01-13
**Files Archived:** 97 files safely moved to organized archive folders
**Approach:** Safe archival rather than deletion - all files can be restored if needed

**See [CLEANUP_PROGRESS_SUMMARY.md](CLEANUP_PROGRESS_SUMMARY.md) for detailed results.**

### ✅ Key Accomplishments:
- Removed duplicate API clients and main entry points
- Archived broken test files that imported from deleted directories
- Consolidated duplicate requirements files
- Moved completed project management documentation
- Preserved all current functionality while reducing repository complexity

**Repository is now much cleaner and less confusing! 🚀**
