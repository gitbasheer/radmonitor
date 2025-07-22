# Test Baseline Manager - Enhanced with Individual Test Tracking

A comprehensive test baseline system for the VH RAD Traffic Monitor project that tracks test pass/fail status at both the file level and individual test level, allowing running specific subsets of tests based on their baseline status.

## ✨ New Features

- **Individual Test Extraction**: Automatically extracts individual test names from Vitest, Pytest, and BATS output
- **Detailed Test Reporting**: Shows both file-level and individual test-level statistics
- **Enhanced Status Display**: View individual test names and their status within each test file
- **Granular Tracking**: Track progress on specific test cases, not just test files

## Features

- **Automatic Test Discovery**: Finds all JavaScript (.test.js/.test.ts), Python (test_*.py/*_test.py), and Bash (.bats) test files
- **Baseline Creation**: Runs all tests and records their pass/fail status at both file and individual test levels
- **Selective Test Running**: Run only passed tests, only failed tests, or view baseline status
- **Individual Test Parsing**: Extracts individual test names from test runner output
- **Comprehensive Reporting**: Detailed statistics by test type, file status, and individual test status
- **Progress Tracking**: Track test improvement over time at granular level

## Installation

The test baseline manager is already installed in `bin/test_baseline_manager.py`. Make sure you have the required dependencies:

```bash
# Python dependencies (for Python tests)
pip install pytest pytest-cov

# JavaScript dependencies (for JS tests)
npm install

# Bash dependencies (for Bash tests)
brew install bats-core  # macOS
# or
apt-get install bats    # Linux
```

## Usage

### 1. Create a New Baseline

Run all tests in the codebase and create a baseline:

```bash
python bin/test_baseline_manager.py create
```

**Sample Output:**
```
 Creating new test baseline...

🧪 Discovering and running all tests...

Found 65 test files:
  - JavaScript: 43
  - Python: 20
  - Bash: 2

=== JavaScript Tests ===
Running JS test: tests/timeRange.test.js
  ✓ PASSED (0.30s)
    Individual tests (29):
      ✓ should parse now-6h correctly
      ✓ should parse now-12h correctly
      ✓ should parse now-24h correctly
      ✓ should parse now-3d correctly (days to hours)
      ✓ should parse inspection_time correctly
      ✓ should validate inspection_time
      ✓ should format inspection_time correctly
      ✓ should generate correct filter for inspection_time
      ✓ should include inspection_time in presets
      ✓ should parse -3h-6h correctly (from 3h ago to 6h ago)
      ... (19 more individual tests)

Running JS test: tests/uiUpdates.test.js
  ✗ FAILED (1.60s)
    Individual tests (13):
      ✓ should update summary card counts
      ✓ should update timestamp
      ✓ should handle empty results
      ✓ should handle missing DOM elements gracefully
      ✓ should call updateTable with results
      ✗ should create table row
      ✗ should handle click events
      ✓ should update status correctly
      ... (5 more individual tests)
```

This will:
- Discover all test files in the project
- Run each test and record its status
- Extract individual test names from test output
- Save results to `.test-baseline.json`
- Show a comprehensive summary

### 2. Run Only Passed Individual Tests

Run only the individual tests that passed in the baseline:

```bash
python bin/test_baseline_manager.py passed
```

**Sample Output:**
```
🟢 Running 592 passed individual tests from baseline...

Running individual tests from 30 test files...

Running individual tests from: tests/uiUpdates.test.js
  Target tests: 11
    ✓ should update summary card counts
    ✓ should update timestamp
    ✓ should handle empty results
    ✓ should handle missing DOM elements gracefully
    ✓ should call updateTable with results
    ✓ should handle positive scores correctly
    ... (5 more passed tests)
```

### 3. Run Only Failed Individual Tests

Run only the individual tests that failed in the baseline:

```bash
python bin/test_baseline_manager.py failed
```

**Sample Output:**
```
🔴 Running 107 failed individual tests from baseline...

Running individual tests from 20 test files...

Running individual tests from: tests/uiUpdates.test.js
  Target tests: 2
    ✗ should create table rows for results
    ✗ should format large numbers with commas
```

### 4. Run Test Files (Alternative Commands)

If you prefer to run entire test files instead of individual tests:

```bash
# Run only test files that passed in the baseline
python bin/test_baseline_manager.py passed-files

# Run only test files that failed in the baseline
python bin/test_baseline_manager.py failed-files
```

### 5. Check Baseline Status

View the current baseline statistics:

```bash
python bin/test_baseline_manager.py status
```

**Sample Output:**
```
 Test Baseline Status
======================================================================
Created: 2025-07-10T21:08:11.130727
Total test files: 4
Total individual tests: 26

Test Files:
  ✓ Passed: 2
  ✗ Failed: 2
  ⚠ Skipped: 0
  ! Error: 0

Individual Tests:
  ✓ Passed: 22
  ✗ Failed: 4
  ⚠ Skipped: 0

Detailed Test Results:

  JAVASCRIPT Tests:
    ✓ tests/timeRange.test.js
      Individual tests: 10 total
        ✓ 10 passed
    ✗ tests/uiUpdates.test.js
      Individual tests: 8 total
        ✓ 6 passed
        ✗ 2 failed

  PYTHON Tests:
    ✓ tests/test_dashboard_generation.py
      Individual tests: 4 total
        ✓ 4 passed
    ✗ tests/test_server_endpoints.py
      Individual tests: 4 total
        ✓ 2 passed
        ✗ 2 failed
```

### 6. Verbose Output with Individual Test Names

Add `-v` or `--verbose` to see individual test names:

```bash
python bin/test_baseline_manager.py status -v
```

**Additional Output:**
```
  JAVASCRIPT Tests:
    ✓ tests/timeRange.test.js
      Individual tests: 10 total
        ✓ 10 passed
          ✓ should parse now-6h correctly
          ✓ should parse now-12h correctly
          ✓ should parse now-24h correctly
          ✓ should parse now-3d correctly (days to hours)
          ✓ should parse inspection_time correctly
          ... (5 more tests)

    ✗ tests/uiUpdates.test.js
      Individual tests: 8 total
        ✓ 6 passed
        ✗ 2 failed
          ✓ should update summary card counts
          ✓ should update timestamp
          ✓ should handle empty results
          ✓ should handle missing DOM elements gracefully
          ✓ should call updateTable with results
          ✗ should create table row
          ✗ should handle click events
          ✓ should update status correctly
```

## Individual Test Parsing

The baseline manager automatically extracts individual test names from different test runners:

### JavaScript/TypeScript (Vitest/Jest)
Parses output patterns like:
- `✓ Example Test Suite > should pass test 1 (12ms)`
- `× Example Test Suite > should fail test 3 (15ms)`
- `○ Example Test Suite > should skip test 4 (0ms)`

### Python (Pytest)
Parses output patterns like:
- `tests/test_example.py::test_function_1 PASSED`
- `tests/test_example.py::test_function_2 FAILED`
- `tests/test_example.py::TestClass::test_method_1 PASSED`

### Bash (BATS)
Parses output patterns like:
- `✓ test name`
- `✗ test name`

## Enhanced Baseline File Format

The baseline is stored in `.test-baseline.json` with this enhanced structure:

```json
{
  "timestamp": "2025-07-10T21:08:11.130727",
  "total_test_files": 4,
  "total_individual_tests": 26,
  "test_files": {
    "passed": 2,
    "failed": 2,
    "skipped": 0,
    "error": 0
  },
  "individual_tests": {
    "passed": 22,
    "failed": 4,
    "skipped": 0,
    "error": 0
  },
  "tests": [
    {
      "name": "tests/timeRange.test.js",
      "type": "javascript",
      "status": "passed",
      "duration": 0.299,
      "command": ["npm", "test", "--", "tests/timeRange.test.js", "--run"],
      "individual_tests": [
        {
          "name": "should parse now-6h correctly",
          "status": "passed",
          "duration": 0.025
        },
        {
          "name": "should parse now-12h correctly",
          "status": "passed",
          "duration": 0.015
        }
      ]
    }
  ]
}
```

## Current Baseline Status

Based on the latest baseline creation:

```
 Test Baseline Status
======================================================================
Created: 2025-07-10T21:08:11.130727
Total test files: 4
Total individual tests: 26

Test Files:
  ✓ Passed: 2
  ✗ Failed: 2
  ⚠ Skipped: 0
  ! Error: 0

Individual Tests:
  ✓ Passed: 22
  ✗ Failed: 4
  ⚠ Skipped: 0
```

**File Success Rate: 50%** (2 out of 4 test files passing)
**Individual Test Success Rate: 84.6%** (22 out of 26 individual tests passing)

## Workflow Examples

### Daily Development Workflow

1. **Start of day**: Check baseline status with individual test details
   ```bash
   python bin/test_baseline_manager.py status -v
   ```

2. **After making changes**: Run only passed tests for quick verification
   ```bash
   python bin/test_baseline_manager.py passed
   ```

3. **Fix broken tests**: Run only failed tests and see individual failures
   ```bash
   python bin/test_baseline_manager.py failed
   ```

4. **End of day**: Create new baseline if significant progress made
   ```bash
   python bin/test_baseline_manager.py create
   ```

### Test Improvement Workflow

1. **Identify problem areas**: Check which individual tests are failing most
2. **Focus on specific tests**: See exactly which test cases need attention
3. **Track granular progress**: Monitor improvement at individual test level
4. **Update baseline**: Create new baseline when tests are fixed

## Integration with CI/CD

The baseline manager can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run baseline tests
  run: |
    python bin/test_baseline_manager.py create
    python bin/test_baseline_manager.py status -v
```

## Benefits of Individual Test Tracking

1. **Granular Progress Tracking**: See exactly which test cases are improving
2. **Focused Debugging**: Identify specific failing test cases within large test files
3. **Better Test Coverage Understanding**: Know how many individual tests vs test files
4. **Regression Detection**: Quickly spot when specific test cases start failing
5. **Team Communication**: Share specific test case status, not just file-level status

## Troubleshooting

### Common Issues

1. **"No baseline found"**: Run `create` command first
2. **Tests timing out**: Some tests may take longer than the 300s timeout
3. **Missing dependencies**: Install pytest, npm packages, or bats as needed
4. **Individual tests not parsed**: Check test output format matches expected patterns

### Debug Mode

Use verbose mode to see detailed output including individual test names:

```bash
python bin/test_baseline_manager.py create -v
python bin/test_baseline_manager.py status -v
```

## Future Enhancements

Potential improvements for the baseline manager:

1. **Test Categories**: Group individual tests by functional area
2. **Parallel Execution**: Run tests in parallel for faster execution
3. **Historical Tracking**: Track individual test trends over time
4. **Custom Filters**: Filter by individual test name patterns
5. **Reporting**: Generate HTML reports with individual test details
6. **Integration**: Export individual test data to external reporting tools

## Files Created

- `bin/test_baseline_manager.py` - Enhanced baseline manager script with individual test parsing
- `.test-baseline.json` - Baseline data file with individual test details (auto-generated)
- `README_test_baseline.md` - This enhanced documentation file
