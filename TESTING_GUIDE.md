# RAD Monitor - Comprehensive Testing Guide

This guide covers all testing aspects of the RAD Monitor project, including unit tests, integration tests, and deployment tests.

## Overview

The RAD Monitor has comprehensive test coverage across all components:
- **JavaScript Tests**: ~150+ tests using Vitest
- **Python Tests**: ~30+ tests using pytest
- **Bash Tests**: ~20+ tests using bats
- **Integration Tests**: End-to-end testing including GitHub Pages deployment

## Quick Start

Run all tests with a single command:

```bash
./run_all_tests.sh
```

This will run JavaScript, Python, and Bash tests, plus integration checks.

## Test Structure

```
tests/
├── requirements.txt           # Python test dependencies
├── setup.js                  # JavaScript test setup
├── test_cors_proxy.py        # CORS proxy Python tests
├── test_github_pages_integration.py  # GitHub Pages deployment tests
├── test_bash_scripts.bats    # Bash script tests
├── cookie.test.js           # Cookie management tests
├── authentication.test.js    # Auth flow tests
├── scoring.test.js          # Score calculation tests
├── dataProcessing.test.js   # Data processing tests
├── uiUpdates.test.js        # UI update tests
└── integration.test.js      # End-to-end tests
```

## JavaScript Tests (Vitest)

### Setup
```bash
npm install
```

### Run Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test tests/cookie.test.js
```

### Coverage Areas
- Cookie management (get, set, clear)
- Authentication flow
- CORS proxy detection
- Score calculations
- Data processing from Elasticsearch
- UI updates and DOM manipulation
- Auto-refresh functionality
- Error handling

## Python Tests (pytest)

### Setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r tests/requirements.txt
```

### Run Tests
```bash
# Run all Python tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=cors_proxy --cov-report=term-missing

# Run specific test file
pytest tests/test_cors_proxy.py -v

# Generate HTML coverage report
pytest tests/ --cov=. --cov-report=html
```

### Coverage Areas
- CORS proxy server functionality
- SSL handling for self-signed certificates
- HTTP request/response handling
- Error handling (401, 500, SSL errors)
- GitHub Pages integration
- Health check endpoint
- CORS headers

## Bash Tests (bats)

### Setup
```bash
# macOS
brew install bats-core

# Ubuntu/Debian
sudo apt-get install bats

# From source
git clone https://github.com/bats-core/bats-core.git
cd bats-core
./install.sh /usr/local
```

### Run Tests
```bash
# Run all Bash tests
bats tests/test_bash_scripts.bats

# Run with verbose output
bats tests/test_bash_scripts.bats -v
```

### Coverage Areas
- Script execution flow
- Cookie extraction from local files
- Server startup/shutdown
- Error handling
- PATH issue handling
- Dashboard generation
- Browser opening

## Integration Tests

### GitHub Pages Deployment Tests
Tests ensure the dashboard works correctly when hosted at https://balkhalil.github.io/rad-traffic-monitor/

```bash
pytest tests/test_github_pages_integration.py -v
```

Covers:
- GitHub Actions workflow validation
- Direct API calls without CORS proxy
- Relative asset paths
- Meta refresh functionality
- Error handling on GitHub Pages
- File size limits
- Scheduled updates

### Manual Integration Testing

1. **Local Development Test**
   ```bash
   export ELASTIC_COOKIE="your_cookie_here"
   ./run_with_cors.sh
   ```
   - Verify CORS proxy starts on port 8889
   - Verify dashboard opens at http://localhost:8888
   - Check real-time updates work

2. **GitHub Pages Test**
   - Push changes to GitHub
   - Wait for GitHub Actions to complete
   - Visit https://balkhalil.github.io/rad-traffic-monitor/
   - Verify dashboard loads without CORS proxy

## CI/CD Testing

GitHub Actions automatically runs all tests on:
- Push to main or develop branches
- Pull requests to main

### Test Matrix
- Node.js: 18.x, 20.x
- Python: 3.9, 3.10, 3.11
- OS: Ubuntu latest

### Workflow File
See `.github/workflows/test.yml` for CI configuration.

## Test Coverage Goals

- **JavaScript**: >80% coverage
- **Python**: >90% coverage
- **Bash**: 100% critical path coverage

## Common Test Commands

```bash
# Quick test for development
npm test -- --run  # Fast JavaScript tests
pytest tests/test_cors_proxy.py::TestCORSProxy::test_health_endpoint_success  # Single Python test

# Full test suite
./run_all_tests.sh

# Coverage reports
npm run test:coverage  # JavaScript coverage
pytest tests/ --cov=. --cov-report=html  # Python coverage in htmlcov/

# Syntax checks only
python3 -m py_compile cors_proxy.py
bash -n run_with_cors.sh
```

## Debugging Tests

### JavaScript Tests
```javascript
// Add to test file
import { vi } from 'vitest';
vi.spyOn(console, 'log');  // Spy on console

// In test
console.log(someVariable);  // Will be captured
```

### Python Tests
```python
# Add to test
import pdb; pdb.set_trace()  # Breakpoint

# Run with -s flag
pytest tests/test_cors_proxy.py -s  # Don't capture output
```

### Bash Tests
```bash
# Add to test
echo "Debug: $variable" >&3  # Output to stderr

# Run with tap output
bats tests/test_bash_scripts.bats --tap
```

## Writing New Tests

### JavaScript Test Template
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('FeatureName', () => {
    beforeEach(() => {
        // Setup
    });
    
    it('should do something', () => {
        // Arrange
        const input = 'test';
        
        // Act
        const result = functionUnderTest(input);
        
        // Assert
        expect(result).toBe('expected');
    });
});
```

### Python Test Template
```python
import pytest
from unittest.mock import Mock, patch

class TestFeature:
    def setup_method(self):
        """Setup for each test"""
        self.mock = Mock()
    
    def test_something(self):
        # Arrange
        expected = "result"
        
        # Act
        result = function_under_test()
        
        # Assert
        assert result == expected
```

### Bash Test Template
```bash
@test "feature: should do something" {
    # Arrange
    export TEST_VAR="value"
    
    # Act
    run ./script_under_test.sh
    
    # Assert
    [ "$status" -eq 0 ]
    [[ "$output" == *"expected"* ]]
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x run_all_tests.sh
   chmod +x scripts/*.sh
   ```

2. **Module Not Found (JavaScript)**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Import Error (Python)**
   ```bash
   pip install -r tests/requirements.txt
   ```

4. **Bats Not Found**
   ```bash
   # Install bats first (see setup section)
   which bats  # Verify installation
   ```

5. **PATH Issues in Tests**
   - Tests create isolated environments
   - Mock commands are used to avoid system dependencies

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Don't make real API calls in tests
3. **Test Edge Cases**: Include error scenarios
4. **Keep Tests Fast**: Avoid sleep/delays where possible
5. **Clear Test Names**: Describe what's being tested
6. **Test Documentation**: Comment complex test logic

## Contributing Tests

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass locally
3. Check coverage hasn't decreased
4. Update this guide if adding new test types

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [pytest Documentation](https://docs.pytest.org/)
- [Bats Documentation](https://bats-core.readthedocs.io/)
- [GitHub Actions Testing](https://docs.github.com/en/actions/automating-builds-and-tests) 