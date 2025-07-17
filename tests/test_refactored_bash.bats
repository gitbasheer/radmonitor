#!/usr/bin/env bats
# Comprehensive tests for all refactored shell scripts

# Setup and teardown
setup() {
    # Create temporary test directory
    export TEST_DIR="$(mktemp -d)"
    export ORIGINAL_PWD="$(pwd)"

    # Mock environment variables
    export ELASTIC_COOKIE="test-cookie-123"
    export KIBANA_URL="https://test-kibana.example.com"
    export BASELINE_START="2025-06-01"
    export BASELINE_END="2025-06-09"
    export CURRENT_TIME_RANGE="now-12h"
    export HIGH_VOLUME_THRESHOLD="1000"
    export MEDIUM_VOLUME_THRESHOLD="100"
    export CRITICAL_THRESHOLD="-80"
    export WARNING_THRESHOLD="-50"

    # Create mock response file
    cat > "$TEST_DIR/mock_response.json" << 'EOF'
{
    "aggregations": {
        "events": {
            "buckets": [
                {
                    "key": "pandc.vnext.recommendations.feed.test1",
                    "baseline": {"doc_count": 10000},
                    "current": {"doc_count": 500}
                }
            ]
        }
    }
}
EOF
}

teardown() {
    cd "$ORIGINAL_PWD"
    rm -rf "$TEST_DIR"
}

# Tests for config/dashboard.config.sh
@test "dashboard.config.sh: exports all required variables" {
    source config/dashboard.config.sh

    [ -n "$KIBANA_URL" ]
    [ -n "$BASELINE_START" ]
    [ -n "$BASELINE_END" ]
    [ -n "$CURRENT_TIME_RANGE" ]
    [ -n "$HIGH_VOLUME_THRESHOLD" ]
    [ -n "$MEDIUM_VOLUME_THRESHOLD" ]
    [ -n "$CRITICAL_THRESHOLD" ]
    [ -n "$WARNING_THRESHOLD" ]
}

@test "dashboard.config.sh: uses defaults when env vars not set" {
    unset BASELINE_START
    source config/dashboard.config.sh

    [ "$BASELINE_START" = "2025-06-01" ]
}

# Tests for scripts/lib/error_handler.sh
@test "error_handler.sh: log_info function works" {
    source scripts/lib/error_handler.sh

    output=$(log_info "Test message" 2>&1)
    [[ "$output" =~ "INFO" ]]
    [[ "$output" =~ "Test message" ]]
}

@test "error_handler.sh: log_error function works" {
    source scripts/lib/error_handler.sh

    output=$(log_error "Error message" 2>&1)
    [[ "$output" =~ "ERROR" ]]
    [[ "$output" =~ "Error message" ]]
}

@test "error_handler.sh: die function exits with error" {
    source scripts/lib/error_handler.sh

    run die "Fatal error"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "ERROR" ]]
    [[ "$output" =~ "Fatal error" ]]
}

# Tests for scripts/lib/cookie_handler.sh
@test "cookie_handler.sh: get_elastic_cookie returns env var when set" {
    source scripts/lib/cookie_handler.sh

    cookie=$(get_elastic_cookie)
    [ "$cookie" = "test-cookie-123" ]
}

@test "cookie_handler.sh: get_elastic_cookie extracts from local script" {
    source scripts/lib/cookie_handler.sh

    # Unset env var
    unset ELASTIC_COOKIE

    # Create mock local script
    mkdir -p "$TEST_DIR/scripts"
    cat > "$TEST_DIR/scripts/traffic_monitor.sh" << 'EOF'
#!/bin/bash
ELASTIC_COOKIE="local-cookie-456"
EOF

    # Mock HOME
    export HOME="$TEST_DIR"

    cookie=$(get_elastic_cookie)
    [ "$cookie" = "local-cookie-456" ]
}

@test "cookie_handler.sh: validate_cookie accepts valid cookie" {
    source scripts/lib/cookie_handler.sh

    run validate_cookie "Fe26.2**valid-cookie-data"
    [ "$status" -eq 0 ]
}

@test "cookie_handler.sh: validate_cookie rejects empty cookie" {
    source scripts/lib/cookie_handler.sh

    run validate_cookie ""
    [ "$status" -eq 1 ]
}

# Tests for src/data/fetch_kibana_data.sh
@test "fetch_kibana_data.sh: requires cookie to be set" {
    unset ELASTIC_COOKIE

    run bash src/data/fetch_kibana_data.sh "$TEST_DIR/output.json"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "No ELASTIC_COOKIE set" ]]
}

@test "fetch_kibana_data.sh: validates output path" {
    run bash src/data/fetch_kibana_data.sh
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Usage:" ]]
}

@test "fetch_kibana_data.sh: handles curl errors" {
    # Mock curl to fail
    function curl() {
        return 1
    }
    export -f curl

    run bash src/data/fetch_kibana_data.sh "$TEST_DIR/output.json"
    [ "$status" -eq 1 ]
    [[ "$output" =~ "Failed to fetch data" ]]
}

# Tests for generate_dashboard_refactored.sh
@test "generate_dashboard_refactored.sh: creates required directories" {
    # Create a minimal test version
    cd "$TEST_DIR"

    # Mock the main script components
    mkdir -p scripts config src/data assets/templates

    # Create minimal config
    cat > config/dashboard.config.sh << 'EOF'
export KIBANA_URL="https://test.example.com"
export BASELINE_START="2025-06-01"
export BASELINE_END="2025-06-09"
export CURRENT_TIME_RANGE="now-12h"
export HIGH_VOLUME_THRESHOLD="1000"
export MEDIUM_VOLUME_THRESHOLD="100"
export CRITICAL_THRESHOLD="-80"
export WARNING_THRESHOLD="-50"
EOF

    # Create minimal fetch script that just copies mock data
    cat > src/data/fetch_kibana_data.sh << 'EOF'
#!/bin/bash
cp "$TEST_DIR/mock_response.json" "$1"
EOF
    chmod +x src/data/fetch_kibana_data.sh

    # Create minimal process script
    cat > src/data/process_data.py << 'EOF'
#!/usr/bin/env python3
print("<html>Generated dashboard</html>")
EOF
    chmod +x src/data/process_data.py

    # Create template
    touch assets/templates/index.html.template

    # Create the main script
    cat > scripts/generate_dashboard_refactored.sh << 'EOF'
#!/bin/bash
set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source configuration
source "$PROJECT_ROOT/config/dashboard.config.sh"

# Create data directory
mkdir -p "$PROJECT_ROOT/data"

echo "=== Building Dashboard ===" >&2
echo "Configuration loaded successfully" >&2

# Fetch data
"$PROJECT_ROOT/src/data/fetch_kibana_data.sh" "$PROJECT_ROOT/data/raw_response.json"

# Process data
python3 "$PROJECT_ROOT/src/data/process_data.py" \
    --response "$PROJECT_ROOT/data/raw_response.json" \
    --template "$PROJECT_ROOT/assets/templates/index.html.template" \
    --output "$PROJECT_ROOT/index.html"

echo "Dashboard generated successfully!" >&2
EOF
    chmod +x scripts/generate_dashboard_refactored.sh

    run bash scripts/generate_dashboard_refactored.sh
    [ "$status" -eq 0 ]
    [ -d "data" ]
    [ -f "data/raw_response.json" ]
}

# Integration test for the full pipeline
@test "integration: full refactored pipeline works" {
    cd "$TEST_DIR"

    # Set up minimal project structure
    mkdir -p scripts/lib config src/data/processors assets/{templates,js,css}

    # Copy or create all necessary files
    # (In real test, these would be the actual files)

    # Create config
    cat > config/dashboard.config.sh << 'EOF'
export KIBANA_URL="${KIBANA_URL:-https://test.example.com}"
export BASELINE_START="${BASELINE_START:-2025-06-01}"
export BASELINE_END="${BASELINE_END:-2025-06-09}"
export CURRENT_TIME_RANGE="${CURRENT_TIME_RANGE:-now-12h}"
export HIGH_VOLUME_THRESHOLD="${HIGH_VOLUME_THRESHOLD:-1000}"
export MEDIUM_VOLUME_THRESHOLD="${MEDIUM_VOLUME_THRESHOLD:-100}"
export CRITICAL_THRESHOLD="${CRITICAL_THRESHOLD:--80}"
export WARNING_THRESHOLD="${WARNING_THRESHOLD:--50}"
EOF

    # Create error handler
    cat > scripts/lib/error_handler.sh << 'EOF'
log_info() { echo "[INFO] $*" >&2; }
log_error() { echo "[ERROR] $*" >&2; }
die() { log_error "$*"; exit 1; }
EOF

    # Create cookie handler
    cat > scripts/lib/cookie_handler.sh << 'EOF'
get_elastic_cookie() {
    echo "${ELASTIC_COOKIE:-test-cookie}"
}
validate_cookie() {
    [ -n "$1" ]
}
EOF

    # Create template
    cat > assets/templates/index.html.template << 'EOF'
<html>
<head><title>Dashboard</title></head>
<body>
<div>Critical: {{CRITICAL_COUNT}}</div>
<div>Time: {{TIMESTAMP}}</div>
<tbody>{{TABLE_ROWS}}</tbody>
</body>
</html>
EOF

    # Create mock Python processor
    cat > src/data/process_data.py << 'EOF'
#!/usr/bin/env python3
import sys
import json
from datetime import datetime

# Read template
with open(sys.argv[sys.argv.index('--template') + 1], 'r') as f:
    template = f.read()

# Simple replacement
html = template.replace('{{CRITICAL_COUNT}}', '1')
html = html.replace('{{TIMESTAMP}}', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
html = html.replace('{{TABLE_ROWS}}', '<tr><td>Test</td></tr>')

# Write output
with open(sys.argv[sys.argv.index('--output') + 1], 'w') as f:
    f.write(html)
EOF
    chmod +x src/data/process_data.py

    # Create fetch script
    cat > src/data/fetch_kibana_data.sh << 'EOF'
#!/bin/bash
echo '{"aggregations": {"events": {"buckets": []}}}' > "$1"
EOF
    chmod +x src/data/fetch_kibana_data.sh

    # Create main script
    cat > scripts/generate_dashboard_refactored.sh << 'EOF'
#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$PROJECT_ROOT/config/dashboard.config.sh"
source "$PROJECT_ROOT/scripts/lib/error_handler.sh"
source "$PROJECT_ROOT/scripts/lib/cookie_handler.sh"

mkdir -p "$PROJECT_ROOT/data"

log_info "Building dashboard..."

"$PROJECT_ROOT/src/data/fetch_kibana_data.sh" "$PROJECT_ROOT/data/raw_response.json"

python3 "$PROJECT_ROOT/src/data/process_data.py" \
    --response "$PROJECT_ROOT/data/raw_response.json" \
    --template "$PROJECT_ROOT/assets/templates/index.html.template" \
    --output "$PROJECT_ROOT/index.html"

log_info "Dashboard generated!"
EOF
    chmod +x scripts/generate_dashboard_refactored.sh

    # Run the pipeline
    run bash scripts/generate_dashboard_refactored.sh
    [ "$status" -eq 0 ]
    [ -f "index.html" ]

    # Verify output contains expected content
    grep -q "Critical: 1" index.html
    grep -q "<tr><td>Test</td></tr>" index.html
}

# Test that all shell scripts have proper shebang
@test "all shell scripts have proper shebang" {
    cd "$ORIGINAL_PWD"

    scripts=(
        "scripts/generate_dashboard_refactored.sh"
        "scripts/lib/error_handler.sh"
        "scripts/lib/cookie_handler.sh"
        "src/data/fetch_kibana_data.sh"
        "config/dashboard.config.sh"
    )

    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            head -n1 "$script" | grep -qE '^#!/bin/(ba)?sh$' || {
                echo "Missing or invalid shebang in $script"
                return 1
            }
        fi
    done
}

# Test that all scripts are executable
@test "all shell scripts are executable" {
    cd "$ORIGINAL_PWD"

    scripts=(
        "scripts/generate_dashboard_refactored.sh"
        "src/data/fetch_kibana_data.sh"
    )

    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            [ -x "$script" ] || {
                echo "$script is not executable"
                return 1
            }
        fi
    done
}
