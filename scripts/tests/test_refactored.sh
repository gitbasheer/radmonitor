#!/bin/bash
# Test script to verify the refactored dashboard structure

echo "=== Testing Refactored Dashboard Structure ==="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Check if all required files exist
echo "Checking file structure..."

files=(
    "config/dashboard.config.sh"
    "config/queries/traffic_query.json"
    "src/data/fetch_kibana_data.sh"
    "src/data/process_data.py"
    "src/data/processors/__init__.py"
    "src/data/processors/traffic_processor.py"
    "src/data/processors/score_calculator.py"
    "src/data/processors/html_generator.py"
    "assets/css/dashboard.css"
    "assets/js/api-client.js"
    "assets/js/config-manager.js"
    "assets/js/console-visualizer.js"
    "assets/js/data-processor.js"
    "assets/js/time-range-utils.js"
    "assets/js/ui-updater.js"
    "assets/js/dashboard-main.js"
    "assets/templates/index.html.template"
    "scripts/generate_dashboard_refactored.sh"
    "scripts/lib/cookie_handler.sh"
    "scripts/lib/error_handler.sh"
)

all_exist=true
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file"
        all_exist=false
    fi
done

if [ "$all_exist" = false ]; then
    echo -e "\n${RED}Some files are missing!${NC}"
    exit 1
fi

echo -e "\n${GREEN}All files present!${NC}"

# Test Python imports
echo -e "\nTesting Python imports..."
python3 -c "
import sys
sys.path.append('src')
try:
    from data.processors import TrafficProcessor, ScoreCalculator, HTMLGenerator
    print('(✓) Python imports successful')
except ImportError as e:
    print(f'(✗)Python import error: {e}')
    sys.exit(1)
"

# Test bash scripts are executable
echo -e "\nChecking script permissions..."
scripts=(
    "scripts/generate_dashboard_refactored.sh"
    "src/data/fetch_kibana_data.sh"
    "src/data/process_data.py"
)

for script in "${scripts[@]}"; do
    if [ -x "$script" ]; then
        echo -e "${GREEN}✓${NC} $script is executable"
    else
        echo -e "${RED}✗${NC} $script is not executable"
    fi
done

# Test configuration loading
echo -e "\nTesting configuration..."
source config/dashboard.config.sh
if [ -n "$KIBANA_URL" ]; then
    echo -e "${GREEN}✓${NC} Configuration loaded successfully"
    echo "  KIBANA_URL: $KIBANA_URL"
    echo "  DEFAULT_BASELINE_START: $DEFAULT_BASELINE_START"
else
    echo -e "${RED}✗${NC} Configuration failed to load"
fi

echo -e "\n${GREEN}=== Refactored structure test complete ===${NC}"
echo -e "\nTo run the dashboard generator:"
echo "./scripts/generate_dashboard_refactored.sh"
