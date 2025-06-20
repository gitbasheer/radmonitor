#!/bin/bash
# run_all_tests.sh - Run all the tests to make sure nothing's broken

echo "RAD Monitor - Testing Everything"
echo "================================"
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
TESTS_PASSED=0
TESTS_FAILED=0

# Run a test suite and track results
run_test_suite() {
    local suite_name=$1
    local command=$2

    echo "Running $suite_name..."
    echo "-------------------"

    if eval "$command"; then
        echo -e "${GREEN}PASS: $suite_name passed${NC}\n"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL: $suite_name failed${NC}\n"
        ((TESTS_FAILED++))
    fi
}

# Check if we're in CI
if [ -n "$CI" ]; then
    echo "Running in CI mode"
    echo
fi

# 1. JavaScript Tests
if [ -f "package.json" ]; then
    # Install deps if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing JavaScript dependencies..."
        npm install
        echo
    fi

    run_test_suite "JavaScript Tests (Vitest)" "npm test"

    # Run specific FastAPI client tests if available
    if [ -f "tests/fastapiClient.test.js" ]; then
        run_test_suite "JavaScript Tests - FastAPI Client" "npm test tests/fastapiClient.test.js"
    fi

    # Coverage report
    echo "Generating JavaScript coverage..."
    npm run test:coverage 2>/dev/null || true
    echo
else
    echo -e "${YELLOW}WARNING: Skipping JavaScript tests (no package.json)${NC}\n"
fi

# 2. Python Tests
if [ -f "tests/requirements.txt" ]; then
    # Set up venv if needed
    if [ ! -d "venv" ]; then
        echo "Setting up Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r tests/requirements.txt
        echo
    else
        source venv/bin/activate
    fi

    # Run Python tests
    run_test_suite "Python Tests - CORS Proxy" "python -m pytest tests/test_cors_proxy.py -v --cov=cors_proxy --cov-report=term-missing"

    run_test_suite "Python Tests - GitHub Pages" "python -m pytest tests/test_github_pages_integration.py -v"

    # Run tests for refactored Python modules
    if [ -f "tests/test_refactored_python.py" ]; then
        run_test_suite "Python Tests - Refactored Modules" "python -m pytest tests/test_refactored_python.py -v --cov=src/data --cov-report=term-missing"
    fi

    # Run tests for FastAPI dev server
    if [ -f "tests/test_dev_server_fastapi.py" ]; then
        run_test_suite "Python Tests - FastAPI Dev Server" "python -m pytest tests/test_dev_server_fastapi.py -v --cov=dev_server_fastapi --cov-report=term-missing"
    fi

    # Run integration tests
    if [ -f "tests/test_dashboard_generation.py" ]; then
        run_test_suite "Integration Tests - Dashboard Generation" "python -m pytest tests/test_dashboard_generation.py -v"
    fi

    if [ -f "test_full_integration.py" ]; then
        run_test_suite "Integration Tests - Full System" "python test_full_integration.py"
    fi

    # Run component tests
    if [ -f "tests/test_kibana_endpoint.py" ]; then
        run_test_suite "Python Tests - Kibana Endpoint" "python -m pytest tests/test_kibana_endpoint.py -v"
    fi

    if [ -f "tests/test_config_api.py" ]; then
        run_test_suite "Python Tests - Config API" "python -m pytest tests/test_config_api.py -v"
    fi

    if [ -f "tests/test_data_models.py" ]; then
        run_test_suite "Python Tests - Data Models" "python -m pytest tests/test_data_models.py -v"
    fi

    # HTML coverage report
    python -m pytest tests/test_*.py --cov=. --cov-report=html 2>/dev/null || true

    deactivate
else
    echo -e "${YELLOW}WARNING: Skipping Python tests (no requirements.txt)${NC}\n"
fi

# 3. Bash Tests
if command -v bats >/dev/null 2>&1; then
    run_test_suite "Bash Tests" "bats tests/test_bash_scripts.bats"

    # Run tests for refactored Bash scripts
    if [ -f "tests/test_refactored_bash.bats" ]; then
        run_test_suite "Bash Tests - Refactored Scripts" "bats tests/test_refactored_bash.bats"
    fi
else
    echo -e "${YELLOW}WARNING: Skipping Bash tests (bats not installed)${NC}"
    echo "  Install: brew install bats-core (macOS) or apt-get install bats (Linux)"
    echo
fi

# 4. Basic Integration Tests
echo -e "${YELLOW}Running basic checks...${NC}"
echo "------------------------"

# Check required files exist
echo "Checking required files..."
REQUIRED_FILES=(
    "index.html"
    "cors_proxy.py"
    "generate_dashboard.py"
    "scripts/generate_dashboard_refactored.sh"
    "run_with_cors.sh"
    "test_locally.sh"
    ".github/workflows/update-dashboard.yml"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}PASS:${NC} $file"
    else
        echo -e "${RED}FAIL:${NC} $file (missing)"
        ((MISSING_FILES++))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}PASS: All required files found${NC}\n"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL: $MISSING_FILES files missing${NC}\n"
    ((TESTS_FAILED++))
fi

# Check script permissions
echo "Checking script permissions..."
SCRIPTS=(
    "run_with_cors.sh"
    "test_locally.sh"
    "scripts/legacy/run_with_cors_direct.sh"
    "scripts/generate_dashboard_refactored.sh"
)

PERMISSION_ERRORS=0
for script in "${SCRIPTS[@]}"; do
    if [ -x "$script" ]; then
        echo -e "${GREEN}PASS:${NC} $script is executable"
    else
        echo -e "${RED}FAIL:${NC} $script not executable"
        ((PERMISSION_ERRORS++))
    fi
done

if [ $PERMISSION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}PASS: All scripts executable${NC}\n"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL: $PERMISSION_ERRORS scripts not executable${NC}\n"
    ((TESTS_FAILED++))
fi

# 5. Syntax Checks
echo -e "${YELLOW}Checking syntax...${NC}"
echo "------------------"

# Python syntax
if command -v python3 >/dev/null 2>&1; then
    echo "Checking Python syntax..."
    if python3 -m py_compile cors_proxy.py 2>/dev/null; then
        echo -e "${GREEN}PASS: Python syntax OK${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL: Python syntax errors${NC}"
        ((TESTS_FAILED++))
    fi
fi

# Bash syntax
echo "Checking Bash syntax..."
BASH_ERRORS=0
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if bash -n "$script" 2>/dev/null; then
            echo -e "${GREEN}PASS:${NC} $script syntax OK"
        else
            echo -e "${RED}FAIL:${NC} $script has syntax errors"
            ((BASH_ERRORS++))
        fi
    fi
done

if [ $BASH_ERRORS -eq 0 ]; then
    echo -e "${GREEN}PASS: All Bash scripts OK${NC}\n"
    ((TESTS_PASSED++))
else
    echo -e "${RED}FAIL: $BASH_ERRORS scripts have syntax errors${NC}\n"
    ((TESTS_FAILED++))
fi

# 6. GitHub Pages Checks
echo -e "${YELLOW}Checking GitHub Pages setup...${NC}"
echo "------------------------------"

# Check index.html for GitHub Pages compatibility
if [ -f "index.html" ]; then
    # Check for hostname detection
    if grep -q "window.location.hostname" index.html; then
        echo -e "${GREEN}PASS: GitHub Pages detection found${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}WARNING: No GitHub Pages detection in index.html${NC}"
    fi

    # Check for absolute paths (bad for GitHub Pages)
    if grep -E 'href="/|src="/' index.html; then
        echo -e "${YELLOW}WARNING: Found absolute paths (may break on GitHub Pages)${NC}"
    else
        echo -e "${GREEN}PASS: All paths are relative${NC}"
        ((TESTS_PASSED++))
    fi
fi

# Check GitHub Actions workflow
if [ -f ".github/workflows/update-dashboard.yml" ]; then
    if grep -q "ELASTIC_COOKIE" .github/workflows/update-dashboard.yml; then
        echo -e "${GREEN}PASS: GitHub Actions uses ELASTIC_COOKIE secret${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}FAIL: GitHub Actions missing ELASTIC_COOKIE${NC}"
        ((TESTS_FAILED++))
    fi
fi

echo

# Final results
echo "========================"
echo -e "${YELLOW}Test Results${NC}"
echo "========================"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"
echo

# Show coverage reports if available
if [ -d "htmlcov" ]; then
    echo "Python coverage: htmlcov/index.html"
fi

if [ -d "coverage" ]; then
    echo "JavaScript coverage: coverage/index.html"
fi

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}SUCCESS: All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}FAILED: Some tests failed${NC}"
    exit 1
fi
