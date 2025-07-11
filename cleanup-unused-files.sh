#!/bin/bash

echo "🧹 RAD Monitor - Comprehensive File Cleanup Script"
echo "=================================================="
echo ""
echo "This script will remove unused, outdated, and redundant files"
echo "based on the comprehensive audit findings."
echo ""

# Safety check
if [ "$1" != "--force" ]; then
    echo "⚠️  This will permanently remove many files!"
    echo "   Make sure you have a backup if needed."
    echo ""
    read -p "Continue with cleanup? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Cleanup cancelled"
        exit 1
    fi
fi

# Create backup directory
BACKUP_DIR="backup_cleanup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "📁 Creating backup directory: $BACKUP_DIR"
echo ""

# Counters
REMOVED=0
BACKED_UP=0
NOT_FOUND=0

# Function to remove file with backup
remove_with_backup() {
    local file="$1"
    if [ -f "$file" ] || [ -d "$file" ]; then
        echo "  🗑️  Removing: $file"
        cp -r "$file" "$BACKUP_DIR/" 2>/dev/null
        rm -rf "$file"
        ((REMOVED++))
        ((BACKED_UP++))
    else
        echo "  ❓ Not found: $file"
        ((NOT_FOUND++))
    fi
}

# Function to remove file without backup (for large directories)
remove_without_backup() {
    local file="$1"
    if [ -f "$file" ] || [ -d "$file" ]; then
        echo "  🗑️  Removing (no backup): $file"
        rm -rf "$file"
        ((REMOVED++))
    else
        echo "  ❓ Not found: $file"
        ((NOT_FOUND++))
    fi
}

echo "🚨 HIGH PRIORITY - Definitely Unused/Old Files"
echo "=============================================="

# Archive directory (too large for backup)
echo ""
echo "📁 Removing archive directory..."
if [ -d "archive/" ]; then
    echo "  ⚠️  Archive directory is large - removing without backup"
    remove_without_backup "archive/"
else
    echo "  ✅ Archive directory not found (already cleaned)"
fi

# Obsolete backend files
echo ""
echo "🖥️  Removing obsolete backend files..."
OBSOLETE_BACKEND=(
    "bin/dev_server.py"
    "bin/cors_proxy.py"
    "bin/centralized_api.py"
    "bin/dev_server_fastapi.py"
)

for file in "${OBSOLETE_BACKEND[@]}"; do
    remove_with_backup "$file"
done

# Old API clients
echo ""
echo "🔌 Removing old API client files..."
OLD_API_CLIENTS=(
    "assets/js/api-client.js"
    "assets/js/api-client-fastapi.js"
    "assets/js/api-client-simplified.js"
)

for file in "${OLD_API_CLIENTS[@]}"; do
    remove_with_backup "$file"
done

echo ""
echo "🟡 MEDIUM PRIORITY - Likely Duplicates/Outdated"
echo "=============================================="

# Test/demo HTML files
echo ""
echo "🧪 Removing test/demo HTML files from root..."
TEST_DEMO_FILES=(
    "test-console-output.html"
    "test-api-unified.html"
    "test-ws.html"
    "demo-antares-features.html"
    "enhanced-formula-builder-demo.html"
    "formula-builder-demo.html"
    "formula-editor-demo.html"
    "kibana-cookie-sync.html"
    "kibana-cookie-sync.js"
)

for file in "${TEST_DEMO_FILES[@]}"; do
    remove_with_backup "$file"
done

# Temporary files
echo ""
echo "🗂️  Removing temporary files..."
TEMP_FILES=(
    "test_results.json"
    "test-dataprocessing-results.json"
    "test-results.json"
)

for file in "${TEMP_FILES[@]}"; do
    remove_with_backup "$file"
done

# Find and remove .pre-antares files
echo ""
echo "🔄 Removing .pre-antares backup files..."
find . -name "*.pre-antares" -type f | while read file; do
    remove_with_backup "$file"
done

# Duplicate server files
echo ""
echo "🖥️  Removing duplicate server files..."
DUPLICATE_SERVERS=(
    "bin/server_enhanced.py"
    "bin/simple-server.py"
    "bin/validate_connections.py"
    "bin/validate_connections_enhanced.py"
    "bin/validate_connections_simple.py"
)

for file in "${DUPLICATE_SERVERS[@]}"; do
    remove_with_backup "$file"
done

# Potentially outdated documentation
echo ""
echo "📚 Removing potentially outdated documentation..."
OLD_DOCS=(
    "CLEANUP_CHECKLIST.md"
    "CLEANUP_SUMMARY.md"
    "COHERENCE_FIX_PLAN.md"
    "COHERENCE_UPDATE_SUMMARY.md"
    "MIGRATION_STATUS.md"
    "PRODUCTION_READY_SUMMARY.md"
    "checklist.md"
)

for file in "${OLD_DOCS[@]}"; do
    remove_with_backup "$file"
done

# Legacy JavaScript files that may be unused
echo ""
echo "📜 Removing potentially unused JavaScript files..."
POTENTIALLY_UNUSED_JS=(
    "assets/js/config-loader.js"
    "assets/js/config-manager.js"
    "assets/js/error-handler.js"
    "assets/js/cache-manager.js"
    "assets/js/websocket-client.js"
    "assets/js/unified-server.js"
    "assets/js/cors-direct-override.js"
    "assets/js/visual-formula-builder-integration.js"
    "formula-builder-example.js"
)

for file in "${POTENTIALLY_UNUSED_JS[@]}"; do
    remove_with_backup "$file"
done

# Old test files
echo ""
echo "🧪 Removing outdated test files..."
OLD_TESTS=(
    "tests/fastapiClient.test.js"
    "tests/duplicate-export-fix.test.js"
    "tests/setup.js"
    "tests/test_bash_scripts.bats"
    "tests/test_refactored_bash.bats"
)

for file in "${OLD_TESTS[@]}"; do
    remove_with_backup "$file"
done

# Chrome extension (unless specifically needed)
echo ""
echo "🌐 Removing Chrome extension directory..."
if [ -d "chrome-extension/" ]; then
    echo "  ⚠️  Chrome extension found - removing (backup available)"
    remove_with_backup "chrome-extension/"
fi

# Distributed AI backup files (if any)
echo ""
echo "📦 Removing distributed AI backup files..."
find . -name "distributed_ai_backup_*.tar.gz" -type f | while read file; do
    remove_with_backup "$file"
done

echo ""
echo "✅ CLEANUP COMPLETE"
echo "=================="
echo ""
echo "📊 Summary:"
echo "  🗑️  Files/directories removed: $REMOVED"
echo "  💾 Items backed up: $BACKED_UP"
echo "  ❓ Items not found: $NOT_FOUND"
echo ""
echo "📁 Backup location: $BACKUP_DIR"
echo ""
echo "🔍 Files preserved (core functionality):"
echo "  ✅ index.html (main dashboard)"
echo "  ✅ assets/js/main-clean.js (main entry point)"
echo "  ✅ assets/js/api-client-unified.js (unified API)"
echo "  ✅ assets/js/data-layer.js (data processing)"
echo "  ✅ assets/js/config-service.js (configuration)"
echo "  ✅ bin/server_production.py (production server)"
echo "  ✅ All formula-builder components"
echo "  ✅ All emil components"
echo ""
echo "⚠️  Manual review recommended for:"
echo "  📋 Remaining documentation files"
echo "  🧪 Test files in tests/ directory"
echo "  🎨 CSS theme files (consider consolidation)"
echo ""
echo "🎉 Cleanup completed successfully!"
