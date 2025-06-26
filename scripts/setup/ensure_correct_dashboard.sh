#!/bin/bash
# Ensures the dashboard has the control panel

echo "Checking dashboard version..."

# Check if index.html has the control panel
if grep -q "control-panel" index.html && grep -q "DASHBOARD CONTROLS" index.html; then
    echo "✓ Dashboard has control panel"
else
    echo "✗ Dashboard missing control panel - regenerating..."
    ./scripts/generate_dashboard_refactored.sh
    echo "Dashboard regenerated with control panel"
fi

# Check version
if grep -q "control-panel-v2" index.html; then
    echo "✓ Latest version (v2) detected"
else
    echo "⚠ Old version detected - please hard refresh your browser (Cmd+Shift+R)"
fi
