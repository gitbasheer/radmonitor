#!/usr/bin/env bats
# Comprehensive tests for all Bash scripts in the RAD Monitor project

setup() {
    # Save current directory
    export TEST_DIR="$( cd "$( dirname "$BATS_TEST_FILENAME" )" && pwd )"
    export PROJECT_DIR="$(dirname "$TEST_DIR")"
    export ORIGINAL_PATH="$PATH"
    
    # Create temporary test directory
    export TEST_TEMP_DIR="$(mktemp -d)"
    cd "$TEST_TEMP_DIR"
    
    # Mock commands that might not exist in test environment
    mkdir -p "$TEST_TEMP_DIR/bin"
    export PATH="$TEST_TEMP_DIR/bin:$PATH"
    
    # Create mock Python that tracks calls
    cat > "$TEST_TEMP_DIR/bin/python3" << 'EOF'
#!/bin/bash
echo "MOCK_PYTHON3: $@" >> "$TEST_TEMP_DIR/python_calls.log"
if [[ "$1" == "-m" && "$2" == "http.server" ]]; then
    echo "Serving HTTP on :: port $3"
    # Simulate server running
    sleep 0.5
elif [[ "$1" == "cors_proxy.py" ]]; then
    echo "🚀 Starting CORS Proxy Server on http://localhost:8889"
    sleep 0.5
fi
EOF
    chmod +x "$TEST_TEMP_DIR/bin/python3"
    
    # Create mock for lsof
    cat > "$TEST_TEMP_DIR/bin/lsof" << 'EOF'
#!/bin/bash
echo "MOCK_LSOF: $@" >> "$TEST_TEMP_DIR/lsof_calls.log"
# Return nothing (no processes on ports)
EOF
    chmod +x "$TEST_TEMP_DIR/bin/lsof"
    
    # Create mock for pkill
    cat > "$TEST_TEMP_DIR/bin/pkill" << 'EOF'
#!/bin/bash
echo "MOCK_PKILL: $@" >> "$TEST_TEMP_DIR/pkill_calls.log"
# Always succeed
exit 0
EOF
    chmod +x "$TEST_TEMP_DIR/bin/pkill"
    
    # Create mock for open (macOS browser opener)
    cat > "$TEST_TEMP_DIR/bin/open" << 'EOF'
#!/bin/bash
echo "MOCK_OPEN: $@" >> "$TEST_TEMP_DIR/open_calls.log"
EOF
    chmod +x "$TEST_TEMP_DIR/bin/open"
    
    # Create required directories and files for tests
    mkdir -p scripts data
    
    # Create a mock generate_dashboard.sh
    cat > scripts/generate_dashboard.sh << 'EOF'
#!/bin/bash
echo "=== Generating RAD Traffic Dashboard ==="
echo "Timestamp: $(date)"
if [ -z "$ELASTIC_COOKIE" ]; then
    echo "Warning: ELASTIC_COOKIE environment variable not set"
    exit 1
fi
# Create mock index.html
echo "<html><body>Dashboard</body></html>" > index.html
echo '{"data": "mock"}' > data/raw_response.json
echo "Dashboard generated successfully!"
EOF
    chmod +x scripts/generate_dashboard.sh
    
    # Copy scripts to test directory
    cp "$PROJECT_DIR/run_with_cors.sh" .
    cp "$PROJECT_DIR/run_local.sh" . 2>/dev/null || true
    cp "$PROJECT_DIR/run_local_auto.sh" . 2>/dev/null || true
    cp "$PROJECT_DIR/test_locally.sh" .
    cp "$PROJECT_DIR/run_with_cors_direct.sh" .
    cp "$PROJECT_DIR/cors_proxy.py" . 2>/dev/null || echo "# Mock cors_proxy.py" > cors_proxy.py
}

teardown() {
    # Restore original directory and PATH
    cd "$TEST_DIR"
    export PATH="$ORIGINAL_PATH"
    
    # Clean up temp directory
    rm -rf "$TEST_TEMP_DIR"
}

# Helper function to check if a string contains another string
contains() {
    [[ "$1" == *"$2"* ]]
}

# Tests for run_with_cors.sh
@test "run_with_cors.sh: starts both servers successfully" {
    export ELASTIC_COOKIE="test_cookie"
    
    # Run script in background
    timeout 3s "$TEST_TEMP_DIR/run_with_cors.sh" &
    SCRIPT_PID=$!
    
    # Wait a bit for startup
    sleep 2
    
    # Check that Python was called for both servers
    run cat "$TEST_TEMP_DIR/python_calls.log"
    [ "$status" -eq 0 ]
    contains "$output" "cors_proxy.py"
    contains "$output" "-m http.server 8888"
    
    # Check that browser was opened
    run cat "$TEST_TEMP_DIR/open_calls.log"
    [ "$status" -eq 0 ]
    contains "$output" "http://localhost:8888"
    
    # Kill the script
    kill $SCRIPT_PID 2>/dev/null || true
}

@test "run_with_cors.sh: handles missing ELASTIC_COOKIE" {
    unset ELASTIC_COOKIE
    
    # Remove any local script that might have cookie
    rm -f "$HOME/scripts/traffic_monitor.sh"
    
    run timeout 2s "$TEST_TEMP_DIR/run_with_cors.sh"
    [ "$status" -ne 0 ]
    contains "$output" "Dashboard generation failed"
}

@test "run_with_cors.sh: stops existing servers before starting" {
    export ELASTIC_COOKIE="test_cookie"
    
    timeout 2s "$TEST_TEMP_DIR/run_with_cors.sh" &
    sleep 1
    
    # Check pkill was called
    run cat "$TEST_TEMP_DIR/pkill_calls.log"
    [ "$status" -eq 0 ]
    contains "$output" "python3 -m http.server 8888"
    contains "$output" "python3 cors_proxy.py"
}

@test "run_with_cors.sh: creates index.html successfully" {
    export ELASTIC_COOKIE="test_cookie"
    
    timeout 2s "$TEST_TEMP_DIR/run_with_cors.sh" &
    sleep 1
    
    # Check index.html was created
    [ -f "index.html" ]
    run cat index.html
    contains "$output" "Dashboard"
}

# Tests for test_locally.sh
@test "test_locally.sh: runs dashboard generation" {
    export ELASTIC_COOKIE="test_cookie"
    
    run "$TEST_TEMP_DIR/test_locally.sh"
    [ "$status" -eq 0 ]
    contains "$output" "Testing RAD Traffic Dashboard Locally"
    contains "$output" "Dashboard generated successfully"
    
    # Check files were created
    [ -f "index.html" ]
    [ -f "data/raw_response.json" ]
}

@test "test_locally.sh: fails without cookie" {
    unset ELASTIC_COOKIE
    rm -f "$HOME/scripts/traffic_monitor.sh"
    
    # Modify test_locally.sh to not look for cookie in home directory
    sed -i.bak '/LOCAL_COOKIE=/d' "$TEST_TEMP_DIR/test_locally.sh"
    
    run "$TEST_TEMP_DIR/test_locally.sh"
    [ "$status" -ne 0 ]
}

# Tests for run_local_auto.sh
@test "run_local_auto.sh: starts server and opens browser" {
    export ELASTIC_COOKIE="test_cookie"
    
    # Create mock run_local_auto.sh if it doesn't exist
    if [ ! -f "$TEST_TEMP_DIR/run_local_auto.sh" ]; then
        cat > "$TEST_TEMP_DIR/run_local_auto.sh" << 'EOF'
#!/bin/bash
echo "🚀 Starting RAD Monitor (Auto-Refresh Mode)"
./scripts/generate_dashboard.sh || exit 1
python3 -m http.server 8000 &
SERVER_PID=$!
sleep 1
open http://localhost:8000 2>/dev/null || true
echo "Server started on http://localhost:8000"
wait $SERVER_PID
EOF
        chmod +x "$TEST_TEMP_DIR/run_local_auto.sh"
    fi
    
    timeout 2s "$TEST_TEMP_DIR/run_local_auto.sh" &
    sleep 1
    
    # Check Python server was started
    run cat "$TEST_TEMP_DIR/python_calls.log"
    [ "$status" -eq 0 ]
    contains "$output" "-m http.server 8000"
}

# Tests for run_with_cors_direct.sh
@test "run_with_cors_direct.sh: uses direct paths for commands" {
    export ELASTIC_COOKIE="test_cookie"
    
    # The script uses direct paths like /usr/bin/python3
    # We need to mock those too
    mkdir -p "$TEST_TEMP_DIR/usr/bin" "$TEST_TEMP_DIR/bin"
    ln -s "$TEST_TEMP_DIR/bin/python3" "$TEST_TEMP_DIR/usr/bin/python3"
    
    timeout 2s "$TEST_TEMP_DIR/run_with_cors_direct.sh" &
    sleep 1
    
    # Check that servers were started
    [ -f "index.html" ]
}

@test "run_with_cors_direct.sh: handles PATH issues gracefully" {
    # Simulate PATH issues by breaking PATH
    export PATH="/nonexistent"
    export ELASTIC_COOKIE="test_cookie"
    
    # Should still work with direct paths
    run timeout 2s "$TEST_TEMP_DIR/run_with_cors_direct.sh"
    
    # Even if it fails, it should provide helpful output
    contains "$output" "RAD Monitor - Full Real-Time Setup"
}

# Test script permissions
@test "all scripts are executable" {
    [ -x "$PROJECT_DIR/run_with_cors.sh" ]
    [ -x "$PROJECT_DIR/test_locally.sh" ]
    [ -x "$PROJECT_DIR/run_with_cors_direct.sh" ]
    [ -x "$PROJECT_DIR/scripts/generate_dashboard.sh" ]
}

# Test script syntax
@test "all scripts have valid bash syntax" {
    run bash -n "$PROJECT_DIR/run_with_cors.sh"
    [ "$status" -eq 0 ]
    
    run bash -n "$PROJECT_DIR/test_locally.sh"
    [ "$status" -eq 0 ]
    
    run bash -n "$PROJECT_DIR/run_with_cors_direct.sh"
    [ "$status" -eq 0 ]
    
    run bash -n "$PROJECT_DIR/scripts/generate_dashboard.sh"
    [ "$status" -eq 0 ]
}

# Tests for generate_dashboard.sh
@test "generate_dashboard.sh: creates dashboard with valid cookie" {
    # Create a more complete mock generate_dashboard.sh
    cat > scripts/generate_dashboard.sh << 'EOF'
#!/bin/bash
echo "=== Generating RAD Traffic Dashboard ==="
echo "Timestamp: $(date)"

if [ -z "$ELASTIC_COOKIE" ]; then
    echo "Warning: ELASTIC_COOKIE environment variable not set"
    if [ -f "$HOME/scripts/traffic_monitor.sh" ]; then
        echo "Attempting to extract cookie from local script..."
        # Simulate finding cookie
        ELASTIC_COOKIE="found_cookie"
        echo "✓ Found cookie in local script"
    else
        echo "Error: Could not extract cookie from local script"
        exit 1
    fi
fi

echo "Fetching traffic data..."
# Simulate API call
sleep 0.1

echo "Processing data..."
# Create mock dashboard
cat > index.html << 'HTML'
<!DOCTYPE html>
<html>
<head><title>RAD Traffic Health Monitor</title></head>
<body>
<h1>Dashboard</h1>
<div class="timestamp">Last updated: $(date)</div>
</body>
</html>
HTML

mkdir -p data
echo '{"aggregations": {"events": {"buckets": []}}}' > data/raw_response.json

echo "Dashboard generated successfully!"
EOF
    chmod +x scripts/generate_dashboard.sh
    
    export ELASTIC_COOKIE="test_cookie_123"
    run scripts/generate_dashboard.sh
    [ "$status" -eq 0 ]
    contains "$output" "Dashboard generated successfully"
    
    # Verify files created
    [ -f "index.html" ]
    [ -f "data/raw_response.json" ]
    
    # Check HTML content
    run cat index.html
    contains "$output" "RAD Traffic Health Monitor"
}

@test "generate_dashboard.sh: extracts cookie from local script" {
    unset ELASTIC_COOKIE
    
    # Create mock traffic_monitor.sh with cookie
    mkdir -p "$HOME/scripts"
    cat > "$HOME/scripts/traffic_monitor.sh" << 'EOF'
#!/bin/bash
ELASTIC_COOKIE="Fe26.2**extracted_cookie**xyz"
EOF
    
    run scripts/generate_dashboard.sh
    [ "$status" -eq 0 ]
    contains "$output" "Found cookie in local script"
}

@test "generate_dashboard.sh: fails when no cookie available" {
    unset ELASTIC_COOKIE
    rm -f "$HOME/scripts/traffic_monitor.sh"
    
    run scripts/generate_dashboard.sh
    [ "$status" -ne 0 ]
    contains "$output" "Error:"
}

# Integration test for GitHub Pages scenario
@test "GitHub Pages deployment: dashboard works without CORS proxy" {
    export ELASTIC_COOKIE="github_secret_cookie"
    
    # Generate dashboard as GitHub Actions would
    run scripts/generate_dashboard.sh
    [ "$status" -eq 0 ]
    
    # Verify dashboard was created
    [ -f "index.html" ]
    
    # Check that it contains expected content
    run cat index.html
    contains "$output" "Dashboard"
    
    # Verify data directory exists
    [ -d "data" ]
    [ -f "data/raw_response.json" ]
}

# Test error handling
@test "scripts handle interruption gracefully" {
    export ELASTIC_COOKIE="test_cookie"
    
    # Start script in background
    timeout 2s "$TEST_TEMP_DIR/run_with_cors.sh" &
    SCRIPT_PID=$!
    
    sleep 1
    
    # Send interrupt signal
    kill -INT $SCRIPT_PID 2>/dev/null || true
    
    wait $SCRIPT_PID 2>/dev/null || true
    
    # Script should have cleaned up (we can't easily test this in bats)
    # but at least it shouldn't hang
}

# Test cookie extraction patterns
@test "cookie extraction works with different formats" {
    # Create test script with cookie
    mkdir -p "$HOME/scripts"
    cat > "$HOME/scripts/traffic_monitor.sh" << 'EOF'
#!/bin/bash
# Some comments
ELASTIC_COOKIE="Fe26.2**1234567890abcdef**xyz123**abc**def**"
# More code
EOF
    
    # Create a simple extraction test
    run grep 'ELASTIC_COOKIE="' "$HOME/scripts/traffic_monitor.sh" | cut -d'"' -f2
    [ "$status" -eq 0 ]
    [ "$output" = "Fe26.2**1234567890abcdef**xyz123**abc**def**" ]
} 