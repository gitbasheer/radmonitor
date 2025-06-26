#!/bin/bash

echo "RAD Monitor - Template Cleanup Script"
echo "===================================="
echo ""

# Create backup directory with timestamp
BACKUP_DIR="backup_templates_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "Creating backups in $BACKUP_DIR/"
echo ""

# Files to remove (old templates and test files)
OLD_FILES=(
    "235pmjune25copy.html"           # Old saved copy from browser
    "dev_index.html"                  # Old development version
    "index_consolidated.html"         # Intermediate consolidated version
    "test-console-output.html"        # Test file for console output
)

# Files to keep (DO NOT DELETE)
KEEP_FILES=(
    "index.html"                      # Main dashboard file (single source of truth)
    "examples/inspection-time-example.html" # Documentation example
    "tests/demo_websocket_backoff.html"    # Test utility
)

echo "Files to be removed:"
echo "-------------------"
for file in "${OLD_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
        # Backup before removing
        cp "$file" "$BACKUP_DIR/"
    else
        echo "  ✗ $file (not found)"
    fi
done

echo ""
echo "Files being preserved:"
echo "--------------------"
for file in "${KEEP_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    fi
done

echo ""
read -p "Do you want to proceed with cleanup? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Removing old files..."
    for file in "${OLD_FILES[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo "  Removed: $file"
        fi
    done
    
    echo ""
    echo "✅ Cleanup complete!"
    echo "📁 Backups saved in: $BACKUP_DIR/"
    echo ""
    echo "Current structure:"
    echo "------------------------"
    echo "  index.html (single dashboard file - no more templates!)"
else
    echo "Cleanup cancelled."
fi