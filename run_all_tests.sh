#!/bin/bash
# Comprehensive test runner for RAD Monitor
# Runs all JavaScript, Python, and Bash tests

echo "🧪 RAD Monitor - Complete Test Suite"
echo "==================================="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run tests and track results
run_test_suite() {
    local suite_name=$1
    local command=$2
    
    echo -e "${YELLOW}Running $suite_name...${NC}"
    echo "----------------------------------------"
    
    if eval "$command"; then
        echo -e "${GREEN}✓ $suite_name passed${NC}\n"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ $suite_name failed${NC}\n"
        ((TESTS_FAILED++))
    fi
}

# Check if running in CI environment
if [ -n "$CI" ]; then
    echo "Running in CI environment"
    echo
fi

# 1. JavaScript Tests (Vitest)
if [ -f "package.json" ]; then
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        echo "Installing JavaScript dependencies..."
        npm install
        echo
    fi
    
    run_test_suite "JavaScript Tests (Vitest)" "npm test"
    
    # Run coverage report
    echo "Generating JavaScript coverage report..."
    npm run test:coverage 2>/dev/null || true
    echo
else
    echo -e "${YELLOW}⚠ Skipping JavaScript tests (package.json not found)${NC}\n"
fi

# 2. Python Tests (pytest)
if [ -f "tests/requirements.txt" ]; then
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        echo "Creating Python virtual environment..."
        python3 -m venv venv
        source venv/bin/activate
        pip install -r tests/requirements.txt
        echo
    else
        source venv/bin/activate
    fi
    
    # Run Python tests with coverage
    run_test_suite "Python Tests - CORS Proxy" "python -m pytest tests/test_cors_proxy.py -v --cov=cors_proxy --cov-report=term-missing"
    
    run_test_suite "Python Tests - GitHub Pages Integration" "python -m pytest tests/test_github_pages_integration.py -v"
    
    # Generate HTML coverage report
    python -m pytest tests/test_*.py --cov=. --cov-report=html 2>/dev/null || true
    
    deactivate
else
    echo -e "${YELLOW}⚠ Skipping Python tests (tests/requirements.txt not found)${NC}\n"
fi

# 3. Bash Tests (bats)
if command -v bats >/dev/null 2>&1; then
    run_test_suite "Bash Tests" "bats tests/test_bash_scripts.bats"
else
    echo -e "${YELLOW}⚠ Skipping Bash tests (bats not installed)${NC}"
    echo "  Install with: brew install bats-core (macOS) or apt-get install bats (Linux)"
    echo
fi

# 4. Integration Tests
echo -e "${YELLOW}Running Integration Tests...${NC}"
echo "----------------------------------------"

# Test that all required files exist
echo "Checking required files..."
REQUIRED_FILES=(
    "index.html"
    "cors_proxy.py"
    "scripts/generate_dashboard.sh"
    "run_with_cors.sh"
    "test_locally.sh"
    ".github/workflows/update-dashboard.yml"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file (missing)"
        ((MISSING_FILES++))
    fi
done

if [ $MISSING_FILES -eq 0 ]; then
    echo -e "${GREEN}✓ All required files present${NC}\n"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ $MISSING_FILES required files missing${NC}\n"
    ((TESTS_FAILED++))
fi

# Test that scripts are executable
echo "Checking script permissions..."
SCRIPTS=(
    "run_with_cors.sh"
    "test_locally.sh"
    "run_with_cors_direct.sh"
    "scripts/generate_dashboard.sh"
)

PERMISSION_ERRORS=0
for script in "${SCRIPTS[@]}"; do
    if [ -x "$script" ]; then
        echo -e "${GREEN}✓${NC} $script is executable"
    else
        echo -e "${RED}✗${NC} $script is not executable"
        ((PERMISSION_ERRORS++))
    fi
done

if [ $PERMISSION_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All scripts have correct permissions${NC}\n"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ $PERMISSION_ERRORS scripts have incorrect permissions${NC}\n"
    ((TESTS_FAILED++))
fi

# 5. Syntax Checks
echo -e "${YELLOW}Running Syntax Checks...${NC}"
echo "----------------------------------------"

# Check Python syntax
if command -v python3 >/dev/null 2>&1; then
    echo "Checking Python syntax..."
    if python3 -m py_compile cors_proxy.py 2>/dev/null; then
        echo -e "${GREEN}✓ Python syntax valid${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ Python syntax errors${NC}"
        ((TESTS_FAILED++))
    fi
fi

# Check Bash syntax
echo "Checking Bash syntax..."
BASH_ERRORS=0
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if bash -n "$script" 2>/dev/null; then
            echo -e "${GREEN}✓${NC} $script syntax valid"
        else
            echo -e "${RED}✗${NC} $script has syntax errors"
            ((BASH_ERRORS++))
        fi
    fi
done

if [ $BASH_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All Bash scripts have valid syntax${NC}\n"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ $BASH_ERRORS Bash scripts have syntax errors${NC}\n"
    ((TESTS_FAILED++))
fi

# 6. GitHub Pages Specific Tests
echo -e "${YELLOW}Running GitHub Pages Deployment Tests...${NC}"
echo "----------------------------------------"

# Check for GitHub Pages specific configuration
if [ -f "index.html" ]; then
    # Check for CORS proxy detection
    if grep -q "window.location.hostname" index.html; then
        echo -e "${GREEN}✓ GitHub Pages detection present${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${YELLOW}⚠ GitHub Pages detection not found in index.html${NC}"
    fi
    
    # Check for relative asset paths
    if grep -E 'href="/|src="/' index.html; then
        echo -e "${YELLOW}⚠ Found absolute paths in index.html (may break on GitHub Pages)${NC}"
    else
        echo -e "${GREEN}✓ All asset paths are relative${NC}"
        ((TESTS_PASSED++))
    fi
fi

# Check GitHub Actions workflow
if [ -f ".github/workflows/update-dashboard.yml" ]; then
    if grep -q "ELASTIC_COOKIE" .github/workflows/update-dashboard.yml; then
        echo -e "${GREEN}✓ GitHub Actions workflow uses ELASTIC_COOKIE secret${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ GitHub Actions workflow missing ELASTIC_COOKIE${NC}"
        ((TESTS_FAILED++))
    fi
fi

echo

# Summary
echo "======================================="
echo -e "${YELLOW}Test Summary${NC}"
echo "======================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo

# Generate coverage badge (if possible)
if [ -d "htmlcov" ]; then
    echo "📊 Python coverage report: htmlcov/index.html"
fi

if [ -d "coverage" ]; then
    echo "📊 JavaScript coverage report: coverage/index.html"
fi

# Exit with appropriate code
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed${NC}"
    exit 1
fi 