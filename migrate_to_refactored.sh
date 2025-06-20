#!/bin/bash
# Migration script - Updates all references from generate_dashboard.sh to generate_dashboard_refactored.sh

echo "=== RAD Monitor Migration Script ==="
echo "This will update all references to use the refactored dashboard generator"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "scripts/generate_dashboard.sh" ] || [ ! -f "scripts/generate_dashboard_refactored.sh" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "Starting migration..."
echo ""

# Files to update
FILES_TO_UPDATE=(
    ".github/workflows/update-dashboard.yml"
    ".github/workflows/test.yml"
    ".github/workflows/test-comprehensive.yml"
    "package.json"
    "test_locally.sh"
    "run_with_cors.sh"
    "run_all_tests.sh"
    "README.md"
    "ensure_correct_dashboard.sh"
    "tests/test_bash_scripts.bats"
    "tests/test_github_pages_integration.py"
)

# Backup original files
echo "Creating backups..."
mkdir -p backups/migration-$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/migration-$(date +%Y%m%d-%H%M%S)"

for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo -e "${GREEN}✓${NC} Backed up $file"
    fi
done

echo ""
echo "Updating files..."

# Update references
UPDATED=0
FAILED=0

for file in "${FILES_TO_UPDATE[@]}"; do
    if [ -f "$file" ]; then
        # Use sed to replace references
        if sed -i.bak 's/generate_dashboard\.sh/generate_dashboard_refactored.sh/g' "$file"; then
            echo -e "${GREEN}✓${NC} Updated $file"
            ((UPDATED++))
            # Remove backup created by sed
            rm -f "${file}.bak"
        else
            echo -e "${RED}✗${NC} Failed to update $file"
            ((FAILED++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Skipped $file (not found)"
    fi
done

echo ""
echo "Migration Summary:"
echo "-----------------"
echo -e "${GREEN}Updated:${NC} $UPDATED files"
echo -e "${RED}Failed:${NC} $FAILED files"
echo -e "${YELLOW}Backups:${NC} $BACKUP_DIR"

# Test the new setup
echo ""
echo "Testing refactored setup..."
if bash -n scripts/generate_dashboard_refactored.sh; then
    echo -e "${GREEN}✓${NC} Refactored script syntax OK"
else
    echo -e "${RED}✗${NC} Refactored script has syntax errors"
fi

# Verify all required files exist
echo ""
echo "Verifying refactored structure..."

REQUIRED_FILES=(
    "config/dashboard.config.sh"
    "config/queries/traffic_query.json"
    "src/data/fetch_kibana_data.sh"
    "src/data/process_data.py"
    "assets/templates/index.html.template"
    "scripts/generate_dashboard_refactored.sh"
)

ALL_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file missing"
        ALL_PRESENT=false
    fi
done

echo ""
if [ "$ALL_PRESENT" = true ]; then
    echo -e "${GREEN}✅ Migration complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test locally: ./test_locally.sh"
    echo "2. Commit changes: git add -A && git commit -m 'Migrate to refactored dashboard'"
    echo "3. Push to GitHub: git push"
    echo ""
    echo "The original generate_dashboard.sh is still available as backup."
else
    echo -e "${RED}❌ Migration incomplete - some files are missing${NC}"
    echo "Run ./test_refactored.sh to check the setup"
    exit 1
fi
