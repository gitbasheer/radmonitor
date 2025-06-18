#!/bin/bash
# test_locally.sh - Test the dashboard generation locally before pushing

echo "=== Testing RAD Traffic Dashboard Locally ==="
echo "This will simulate the GitHub Actions workflow"
echo ""

# Check if we have the cookie from the local script
LOCAL_COOKIE=$(grep "ELASTIC_COOKIE=" ~/scripts/traffic_monitor.sh | cut -d'"' -f2)

if [ -z "$LOCAL_COOKIE" ]; then
    echo "Error: Could not extract ELASTIC_COOKIE from ~/scripts/traffic_monitor.sh"
    echo "Please set it manually:"
    echo "export ELASTIC_COOKIE='your-cookie-here'"
    exit 1
fi

# Export the cookie for the generate script
export ELASTIC_COOKIE="$LOCAL_COOKIE"

echo "✓ Found Elastic cookie"
echo ""

# Make sure the script is executable
chmod +x scripts/generate_dashboard.sh

# Run the dashboard generation
echo "Running dashboard generation..."
./scripts/generate_dashboard.sh

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Dashboard generated successfully!"
    echo ""
    echo "Files created:"
    echo "- index.html ($(wc -l < index.html) lines)"
    echo "- data/raw_response.json ($(wc -c < data/raw_response.json) bytes)"
    echo ""
    echo "To view the dashboard locally:"
    echo "1. python3 -m http.server 8000"
    echo "2. Open http://localhost:8000 in your browser"
    echo ""
    echo "To test auto-refresh:"
    echo "- Leave the page open for 5 minutes"
    echo "- Check if it refreshes automatically"
else
    echo ""
    echo "✗ Dashboard generation failed!"
    echo "Check the error messages above"
    exit 1
fi 