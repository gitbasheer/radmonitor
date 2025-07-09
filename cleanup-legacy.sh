#!/bin/bash
# Legacy File Cleanup Script for RAD Monitor Simplification
# Run this after verifying the simplified system works correctly

echo "🧹 RAD Monitor Legacy File Cleanup"
echo "=================================="
echo ""

# Safety check
if [ "$1" != "--force" ]; then
    echo "⚠️  This will remove legacy JavaScript files!"
    echo "   Make sure you've tested the simplified system first."
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "(✗) Cleanup cancelled"
        exit 1
    fi
fi

echo "📋 Starting cleanup..."
echo ""

# Legacy JS files to remove
LEGACY_FILES=(
    "assets/js/main.js"
    "assets/js/data-layer.js"
    "assets/js/data-processor.js"
    "assets/js/api-client.js"
    "assets/js/api-client-unified.js"
    "assets/js/api-interface.js"
    "assets/js/api-client-fastapi.js"
    "assets/js/fastapi-integration.js"
    "assets/js/config-service.js"
    "assets/js/ui-updater.js"
    "assets/js/error-handler.js"
    "assets/js/utils.js"
    "assets/js/websocket-client.js"
    "assets/js/cache-manager.js"
    "assets/js/unified-server.js"
    "assets/js/state-logging-demo.js"
    "assets/js/console-visualizer.js"
    "assets/js/time-range-utils.js"
    "assets/js/config-manager.js"
    "assets/js/config-loader.js"
    "assets/js/search-filter.js"
    "assets/js/theme-manager.js"
    "assets/js/ui-consolidation.js"
    "assets/js/proxy-client.js"
    "assets/js/direct-elasticsearch-client.js"
    "assets/js/cors-direct-override.js"
    "assets/js/production-helper.js"
    "assets/js/flexible-time-comparison.js"
)

# Test/demo files to remove
TEST_FILES=(
    "test_elasticsearch.py"
    "test_api_unified.html"
    "test-ws.html"
    "examples/data-layer-example.js"
    "examples/inspection-time-example.html"
)

# Count files
REMOVED=0
NOT_FOUND=0

# Remove legacy JS files
echo "🗑️  Removing legacy JavaScript files..."
for file in "${LEGACY_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "   (✓)Removed: $file"
        ((REMOVED++))
    else
        echo "   ⏭️  Not found: $file"
        ((NOT_FOUND++))
    fi
done

echo ""
echo "🗑️  Removing test/demo files..."
for file in "${TEST_FILES[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "   (✓)Removed: $file"
        ((REMOVED++))
    else
        echo "   ⏭️  Not found: $file"
        ((NOT_FOUND++))
    fi
done

echo ""
echo "(✓)Cleanup complete!"
echo "   📊 Files removed: $REMOVED"
echo "   📊 Files not found: $NOT_FOUND"
echo ""
echo "📁 Remaining JavaScript files in assets/js/:"
echo "==========================================="
ls -la assets/js/*.js 2>/dev/null | awk '{print "   " $9 " (" $5 " bytes)"}'
echo ""
echo "📝 Next steps:"
echo "   1. Test the application thoroughly"
echo "   2. Commit these changes: git add -A && git commit -m 'chore: Remove legacy files after simplification'"
echo "   3. If everything works, merge to main branch"
echo ""
