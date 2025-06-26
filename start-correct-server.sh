#!/bin/bash

echo "RAD Monitor - Starting server with CORRECT index.html"
echo "======================================================"
echo ""
echo "Checking index.html has sidebar layout..."

if grep -q "control-panel" index.html; then
    echo "✅ index.html has the sidebar layout (control-panel class found)"
else
    echo "❌ ERROR: index.html does NOT have the sidebar layout!"
    echo "The file might have been overwritten. Check your deployment process."
    exit 1
fi

echo ""
echo "Starting server on http://localhost:8000"
echo "Make sure to:"
echo "1. Navigate to http://localhost:8000 (NOT any other HTML file)"
echo "2. Clear browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)"
echo ""

# Start the server
python3 -m http.server 8000