#!/usr/bin/env python3
"""
Test Baseline Manager for RAD Monitor

This tool manages test baselines to track which tests pass or fail,
allowing you to run specific subsets of tests based on their baseline status.

Usage:
    python bin/test_baseline_manager.py create    # Create a new baseline
    python bin/test_baseline_manager.py passed    # Run only tests that passed in baseline
    python bin/test_baseline_manager.py failed    # Run only tests that failed in baseline
    python bin/test_baseline_manager.py status    # Show baseline status
"""

import sys
import subprocess
import json
import time
import argparse
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from enum import Enum

# Colors for output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    MAGENTA = '\033[0;35m'
    NC = '\033[0m'

    @classmethod
    def green(cls, text: str) -> str:
        return f"{cls.GREEN}{text}{cls.NC}"

    @classmethod
    def red(cls, text: str) -> str:
        return f"{cls.RED}{text}{cls.NC}"

    @classmethod
    def yellow(cls, text: str) -> str:
        return f"{cls.YELLOW}{text}{cls.NC}"

    @classmethod
    def blue(cls, text: str) -> str:
        return f"{cls.BLUE}{text}{cls.NC}"

    @classmethod
    def cyan(cls, text: str) -> str:
        return f"{cls.CYAN}{text}{cls.NC}"

    @classmethod
    def magenta(cls, text: str) -> str:
        return f"{cls.MAGENTA}{text}{cls.NC}"


class TestType(Enum):
    JAVASCRIPT = "javascript"
    PYTHON = "python"
    BASH = "bash"


class TestStatus(Enum):
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


class IndividualTest:
    """Represents a single test case within a test file"""
    def __init__(self, name: str, status: TestStatus, duration: float = 0.0):
        self.name = name
        self.status = status
        self.duration = duration

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "duration": self.duration
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'IndividualTest':
        return cls(
            name=data["name"],
            status=TestStatus(data["status"]),
            duration=data.get("duration", 0.0)
        )


class TestResult:
    """Represents a single test file result with individual test cases"""
    def __init__(self, name: str, test_type: TestType, status: TestStatus,
                 duration: float = 0.0, output: str = "", command: List[str] = None,
                 individual_tests: List[IndividualTest] = None):
        self.name = name
        self.test_type = test_type
        self.status = status
        self.duration = duration
        self.output = output
        self.command = command or []
        self.individual_tests = individual_tests or []

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.test_type.value,
            "status": self.status.value,
            "duration": self.duration,
            "command": self.command,
            "individual_tests": [test.to_dict() for test in self.individual_tests]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TestResult':
        individual_tests = []
        if "individual_tests" in data:
            individual_tests = [IndividualTest.from_dict(test_data)
                              for test_data in data["individual_tests"]]

        return cls(
            name=data["name"],
            test_type=TestType(data["type"]),
            status=TestStatus(data["status"]),
            duration=data.get("duration", 0.0),
            command=data.get("command", []),
            individual_tests=individual_tests
        )


class TestBaseline:
    """Manages test baseline data"""
    def __init__(self, filepath: Path):
        self.filepath = filepath
        self.data: Dict[str, Any] = {}
        self.load()

    def load(self) -> None:
        """Load baseline from file"""
        if self.filepath.exists():
            try:
                with open(self.filepath, 'r') as f:
                    self.data = json.load(f)
            except Exception as e:
                print(f"{Colors.yellow('Warning:')} Could not load baseline: {e}")
                self.data = {}

    def save(self) -> None:
        """Save baseline to file"""
        try:
            with open(self.filepath, 'w') as f:
                json.dump(self.data, f, indent=2)
        except Exception as e:
            print(f"{Colors.red('Error:')} Could not save baseline: {e}")

    def get_tests_by_status(self, status: TestStatus) -> List[TestResult]:
        """Get all tests with a specific status"""
        results = []
        if "tests" in self.data:
            for test_data in self.data["tests"]:
                test = TestResult.from_dict(test_data)
                if test.status == status:
                    results.append(test)
        return results

    def get_individual_tests_by_status(self, status: TestStatus) -> List[Tuple[str, IndividualTest, TestResult]]:
        """Get all individual tests with a specific status
        Returns list of (test_file, individual_test, parent_test_result) tuples"""
        results = []
        if "tests" in self.data:
            for test_data in self.data["tests"]:
                test_result = TestResult.from_dict(test_data)
                for individual_test in test_result.individual_tests:
                    if individual_test.status == status:
                        results.append((test_result.name, individual_test, test_result))
        return results

    def update(self, results: List[TestResult]) -> None:
        """Update baseline with new test results"""
        # Count individual tests
        total_individual_tests = sum(len(r.individual_tests) for r in results)
        passed_individual = sum(1 for r in results for t in r.individual_tests if t.status == TestStatus.PASSED)
        failed_individual = sum(1 for r in results for t in r.individual_tests if t.status == TestStatus.FAILED)
        skipped_individual = sum(1 for r in results for t in r.individual_tests if t.status == TestStatus.SKIPPED)

        self.data = {
            "timestamp": datetime.now().isoformat(),
            "total_test_files": len(results),
            "total_individual_tests": total_individual_tests,
            "test_files": {
                "passed": sum(1 for r in results if r.status == TestStatus.PASSED),
                "failed": sum(1 for r in results if r.status == TestStatus.FAILED),
                "skipped": sum(1 for r in results if r.status == TestStatus.SKIPPED),
                "error": sum(1 for r in results if r.status == TestStatus.ERROR)
            },
            "individual_tests": {
                "passed": passed_individual,
                "failed": failed_individual,
                "skipped": skipped_individual,
                "error": 0  # Individual tests don't have error status
            },
            "tests": [r.to_dict() for r in results]
        }
        self.save()


class TestRunner:
    """Runs tests and manages results"""
    def __init__(self, project_root: Path, verbose: bool = False):
        self.project_root = project_root
        self.verbose = verbose
        self.results: List[TestResult] = []

    def run_command(self, command: List[str], timeout: int = 300) -> Tuple[int, str, str, float]:
        """Run a command and capture output"""
        start = time.time()
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=self.project_root
            )
            duration = time.time() - start
            return result.returncode, result.stdout, result.stderr, duration
        except subprocess.TimeoutExpired:
            duration = time.time() - start
            return -1, "", f"Timeout after {timeout}s", duration
        except Exception as e:
            duration = time.time() - start
            return -1, "", str(e), duration

    def parse_vitest_output(self, output: str) -> List[IndividualTest]:
        """Parse Vitest output to extract individual test names and results"""
        individual_tests = []

        # Common patterns for test results
        patterns = [
            # Vitest patterns
            r'^\s*✓\s+(.+?)\s+\([\d.]+m?s\)',  # Passed tests
            r'^\s*×\s+(.+?)(?:\s+\([\d.]+m?s\))?',  # Failed tests
            r'^\s*○\s+(.+?)(?:\s+\([\d.]+m?s\))?',  # Skipped tests
            # Jest patterns
            r'^\s*✓\s+(.+)',  # Passed tests
            r'^\s*✗\s+(.+)',  # Failed tests
            r'^\s*○\s+(.+)',  # Skipped tests
            # Generic patterns
            r'^\s*PASS\s+(.+)',
            r'^\s*FAIL\s+(.+)',
            r'^\s*SKIP\s+(.+)',
        ]

        for line in output.split('\n'):
            line = line.strip()
            if not line:
                continue

            # Check for passed tests
            if re.match(r'^\s*[✓✔]', line):
                match = re.search(r'[✓✔]\s+(.+?)(?:\s+\([\d.]+m?s\))?$', line)
                if match:
                    test_name = match.group(1).strip()
                    individual_tests.append(IndividualTest(test_name, TestStatus.PASSED))

            # Check for failed tests
            elif re.match(r'^\s*[×✗❌]', line):
                match = re.search(r'[×✗❌]\s+(.+?)(?:\s+\([\d.]+m?s\))?$', line)
                if match:
                    test_name = match.group(1).strip()
                    individual_tests.append(IndividualTest(test_name, TestStatus.FAILED))

            # Check for skipped tests
            elif re.match(r'^\s*[○⚪]', line):
                match = re.search(r'[○⚪]\s+(.+?)(?:\s+\([\d.]+m?s\))?$', line)
                if match:
                    test_name = match.group(1).strip()
                    individual_tests.append(IndividualTest(test_name, TestStatus.SKIPPED))

            # Check for describe blocks or test suites
            elif 'describe' in line.lower() or 'test suite' in line.lower():
                # Extract test suite names
                match = re.search(r'(?:describe|test suite).*?["\']([^"\']+)["\']', line, re.IGNORECASE)
                if match:
                    suite_name = match.group(1).strip()
                    # Don't add suite names as individual tests for now
                    pass

        return individual_tests

    def parse_pytest_output(self, output: str) -> List[IndividualTest]:
        """Parse pytest output to extract individual test names and results"""
        individual_tests = []

        for line in output.split('\n'):
            line = line.strip()
            if not line:
                continue

            # Look for test result lines
            # Format: path/to/test.py::test_function_name PASSED
            if '::' in line and any(status in line for status in ['PASSED', 'FAILED', 'SKIPPED']):
                parts = line.split()
                if len(parts) >= 2:
                    test_path = parts[0]
                    status_str = parts[-1]

                    # Extract just the test function name
                    if '::' in test_path:
                        test_name = test_path.split('::')[-1]
                    else:
                        test_name = test_path

                    if status_str == 'PASSED':
                        individual_tests.append(IndividualTest(test_name, TestStatus.PASSED))
                    elif status_str == 'FAILED':
                        individual_tests.append(IndividualTest(test_name, TestStatus.FAILED))
                    elif status_str == 'SKIPPED':
                        individual_tests.append(IndividualTest(test_name, TestStatus.SKIPPED))

        return individual_tests

    def parse_bats_output(self, output: str) -> List[IndividualTest]:
        """Parse BATS output to extract individual test names and results"""
        individual_tests = []

        for line in output.split('\n'):
            line = line.strip()
            if not line:
                continue

            # BATS format: ✓ test name or ✗ test name
            if line.startswith('✓') or line.startswith('✗'):
                status_char = line[0]
                test_name = line[1:].strip()

                if status_char == '✓':
                    individual_tests.append(IndividualTest(test_name, TestStatus.PASSED))
                elif status_char == '✗':
                    individual_tests.append(IndividualTest(test_name, TestStatus.FAILED))

        return individual_tests

    def discover_javascript_tests(self) -> List[Tuple[str, List[str]]]:
        """Discover all JavaScript test files"""
        tests = []
        test_dirs = [
            self.project_root / "tests",
            self.project_root / "tests" / "unit",
            self.project_root / "tests" / "integration",
            self.project_root / "tests" / "e2e",
            self.project_root / "tests" / "api"
        ]

        for test_dir in test_dirs:
            if test_dir.exists():
                for test_file in test_dir.glob("**/*.test.js"):
                    if "node_modules" not in str(test_file):
                        rel_path = test_file.relative_to(self.project_root)
                        tests.append((str(rel_path), ["npm", "test", "--", str(rel_path), "--run"]))

        # Also check TypeScript tests
        for test_dir in test_dirs:
            if test_dir.exists():
                for test_file in test_dir.glob("**/*.test.ts"):
                    if "node_modules" not in str(test_file):
                        rel_path = test_file.relative_to(self.project_root)
                        tests.append((str(rel_path), ["npm", "test", "--", str(rel_path), "--run"]))

        return tests

    def discover_python_tests(self) -> List[Tuple[str, List[str]]]:
        """Discover all Python test files"""
        tests = []
        test_patterns = ["test_*.py", "*_test.py"]

        for pattern in test_patterns:
            for test_file in self.project_root.glob(f"**/{pattern}"):
                if "venv" not in str(test_file) and "__pycache__" not in str(test_file):
                    rel_path = test_file.relative_to(self.project_root)
                    tests.append((str(rel_path), [sys.executable, "-m", "pytest", str(rel_path), "-v"]))

        return tests

    def discover_bash_tests(self) -> List[Tuple[str, List[str]]]:
        """Discover all Bash test files"""
        tests = []

        for test_file in self.project_root.glob("**/*.bats"):
            if "node_modules" not in str(test_file):
                rel_path = test_file.relative_to(self.project_root)
                tests.append((str(rel_path), ["bats", str(rel_path)]))

        return tests

    def run_javascript_test(self, test_name: str, command: List[str]) -> TestResult:
        """Run a single JavaScript test"""
        print(f"{Colors.cyan('Running JS test:')} {test_name}")

        # Ensure npm dependencies are installed
        if not (self.project_root / "node_modules").exists():
            print(f"{Colors.yellow('Installing npm dependencies...')}")
            subprocess.run(["npm", "install"], cwd=self.project_root)

        returncode, stdout, stderr, duration = self.run_command(command)

        # Parse individual tests from output
        individual_tests = self.parse_vitest_output(stdout + stderr)

        if returncode == 0:
            status = TestStatus.PASSED
            print(f"  {Colors.green('✓ PASSED')} ({duration:.2f}s)")
        else:
            status = TestStatus.FAILED
            print(f"  {Colors.red('✗ FAILED')} ({duration:.2f}s)")
            if self.verbose:
                print(f"  Output: {stderr[:500]}")

        # Display individual tests
        if individual_tests:
            print(f"    Individual tests ({len(individual_tests)}):")
            for test in individual_tests:
                status_icon = "✓" if test.status == TestStatus.PASSED else "✗" if test.status == TestStatus.FAILED else "○"
                status_color = Colors.green if test.status == TestStatus.PASSED else Colors.red if test.status == TestStatus.FAILED else Colors.yellow
                print(f"      {status_color(status_icon)} {test.name}")

        return TestResult(test_name, TestType.JAVASCRIPT, status, duration,
                         stdout + stderr, command, individual_tests)

    def run_python_test(self, test_name: str, command: List[str]) -> TestResult:
        """Run a single Python test"""
        print(f"{Colors.cyan('Running Python test:')} {test_name}")

        returncode, stdout, stderr, duration = self.run_command(command)

        # Parse individual tests from output
        individual_tests = self.parse_pytest_output(stdout + stderr)

        if returncode == 0:
            status = TestStatus.PASSED
            print(f"  {Colors.green('✓ PASSED')} ({duration:.2f}s)")
        else:
            # Check if pytest is not installed
            if "No module named pytest" in stderr:
                status = TestStatus.SKIPPED
                print(f"  {Colors.yellow('⚠ SKIPPED')} (pytest not installed)")
            else:
                status = TestStatus.FAILED
                print(f"  {Colors.red('✗ FAILED')} ({duration:.2f}s)")
                if self.verbose:
                    print(f"  Output: {stderr[:500]}")

        # Display individual tests
        if individual_tests:
            print(f"    Individual tests ({len(individual_tests)}):")
            for test in individual_tests:
                status_icon = "✓" if test.status == TestStatus.PASSED else "✗" if test.status == TestStatus.FAILED else "○"
                status_color = Colors.green if test.status == TestStatus.PASSED else Colors.red if test.status == TestStatus.FAILED else Colors.yellow
                print(f"      {status_color(status_icon)} {test.name}")

        return TestResult(test_name, TestType.PYTHON, status, duration,
                         stdout + stderr, command, individual_tests)

    def run_bash_test(self, test_name: str, command: List[str]) -> TestResult:
        """Run a single Bash test"""
        print(f"{Colors.cyan('Running Bash test:')} {test_name}")

        # Check if bats is installed
        check_code, _, _, _ = self.run_command(["which", "bats"], timeout=5)
        if check_code != 0:
            print(f"  {Colors.yellow('⚠ SKIPPED')} (bats not installed)")
            return TestResult(test_name, TestType.BASH, TestStatus.SKIPPED, 0,
                            "bats not installed", command, [])

        returncode, stdout, stderr, duration = self.run_command(command)

        # Parse individual tests from output
        individual_tests = self.parse_bats_output(stdout + stderr)

        if returncode == 0:
            status = TestStatus.PASSED
            print(f"  {Colors.green('✓ PASSED')} ({duration:.2f}s)")
        else:
            status = TestStatus.FAILED
            print(f"  {Colors.red('✗ FAILED')} ({duration:.2f}s)")
            if self.verbose:
                print(f"  Output: {stderr[:500]}")

        # Display individual tests
        if individual_tests:
            print(f"    Individual tests ({len(individual_tests)}):")
            for test in individual_tests:
                status_icon = "✓" if test.status == TestStatus.PASSED else "✗" if test.status == TestStatus.FAILED else "○"
                status_color = Colors.green if test.status == TestStatus.PASSED else Colors.red if test.status == TestStatus.FAILED else Colors.yellow
                print(f"      {status_color(status_icon)} {test.name}")

        return TestResult(test_name, TestType.BASH, status, duration,
                         stdout + stderr, command, individual_tests)

    def run_all_tests(self) -> List[TestResult]:
        """Discover and run all tests"""
        print(f"{Colors.blue('🧪 Discovering and running all tests...')}\n")

        # Discover tests
        js_tests = self.discover_javascript_tests()
        py_tests = self.discover_python_tests()
        bash_tests = self.discover_bash_tests()

        total_tests = len(js_tests) + len(py_tests) + len(bash_tests)
        print(f"Found {Colors.cyan(str(total_tests))} test files:")
        print(f"  - JavaScript: {len(js_tests)}")
        print(f"  - Python: {len(py_tests)}")
        print(f"  - Bash: {len(bash_tests)}")
        print()

        # Run JavaScript tests
        if js_tests:
            print(f"{Colors.magenta('=== JavaScript Tests ===')}")
            for test_name, command in js_tests:
                result = self.run_javascript_test(test_name, command)
                self.results.append(result)
            print()

        # Run Python tests
        if py_tests:
            print(f"{Colors.magenta('=== Python Tests ===')}")
            for test_name, command in py_tests:
                result = self.run_python_test(test_name, command)
                self.results.append(result)
            print()

        # Run Bash tests
        if bash_tests:
            print(f"{Colors.magenta('=== Bash Tests ===')}")
            for test_name, command in bash_tests:
                result = self.run_bash_test(test_name, command)
                self.results.append(result)
            print()

        return self.results

    def run_specific_tests(self, tests: List[TestResult]) -> List[TestResult]:
        """Run specific tests from a list"""
        results = []

        for test in tests:
            if test.test_type == TestType.JAVASCRIPT:
                result = self.run_javascript_test(test.name, test.command)
            elif test.test_type == TestType.PYTHON:
                result = self.run_python_test(test.name, test.command)
            elif test.test_type == TestType.BASH:
                result = self.run_bash_test(test.name, test.command)
            else:
                continue

            results.append(result)

        return results

    def run_specific_individual_tests(self, individual_tests: List[Tuple[str, IndividualTest, TestResult]]) -> List[TestResult]:
        """Run specific individual tests by running their parent test files with filtering"""
        results = []

        # Group individual tests by their parent test file
        tests_by_file = {}
        for test_file, individual_test, parent_test in individual_tests:
            if test_file not in tests_by_file:
                tests_by_file[test_file] = {
                    'parent': parent_test,
                    'individual_tests': []
                }
            tests_by_file[test_file]['individual_tests'].append(individual_test)

        print(f"Running individual tests from {len(tests_by_file)} test files...")

        for test_file, test_info in tests_by_file.items():
            parent_test = test_info['parent']
            target_tests = test_info['individual_tests']

            print(f"\n{Colors.cyan('Running individual tests from:')} {test_file}")
            print(f"  Target tests: {len(target_tests)}")
            for test in target_tests:
                status_icon = "✓" if test.status == TestStatus.PASSED else "✗" if test.status == TestStatus.FAILED else "○"
                status_color = Colors.green if test.status == TestStatus.PASSED else Colors.red if test.status == TestStatus.FAILED else Colors.yellow
                print(f"    {status_color(status_icon)} {test.name}")

            # Run the parent test file
            if parent_test.test_type == TestType.JAVASCRIPT:
                result = self.run_javascript_test(parent_test.name, parent_test.command)
            elif parent_test.test_type == TestType.PYTHON:
                result = self.run_python_test(parent_test.name, parent_test.command)
            elif parent_test.test_type == TestType.BASH:
                result = self.run_bash_test(parent_test.name, parent_test.command)
            else:
                continue

            results.append(result)

        return results


class TestBaselineManager:
    """Main manager for test baselines"""
    def __init__(self, project_root: Path, verbose: bool = False):
        self.project_root = project_root
        self.verbose = verbose
        self.baseline_file = project_root / ".test-baseline.json"
        self.baseline = TestBaseline(self.baseline_file)
        self.runner = TestRunner(project_root, verbose)

    def create_baseline(self) -> None:
        """Create a new test baseline"""
        print(f"{Colors.blue(' Creating new test baseline...')}\n")

        # Run all tests
        results = self.runner.run_all_tests()

        # Update baseline
        self.baseline.update(results)

        # Print summary
        self.print_summary(results)

        print(f"\n{Colors.green('✅ Baseline saved to:')} {self.baseline_file}")

    def run_passed_tests(self) -> None:
        """Run only individual tests that passed in the baseline"""
        passed_individual_tests = self.baseline.get_individual_tests_by_status(TestStatus.PASSED)

        if not passed_individual_tests:
            print(f"{Colors.yellow('No passed individual tests found in baseline')}")
            return

        print(f"{Colors.blue('🟢 Running')} {Colors.green(str(len(passed_individual_tests)))} {Colors.blue('passed individual tests from baseline...')}\n")

        results = self.runner.run_specific_individual_tests(passed_individual_tests)
        self.print_summary(results)

    def run_failed_tests(self) -> None:
        """Run only individual tests that failed in the baseline"""
        failed_individual_tests = self.baseline.get_individual_tests_by_status(TestStatus.FAILED)

        if not failed_individual_tests:
            print(f"{Colors.yellow('No failed individual tests found in baseline')}")
            return

        print(f"{Colors.blue('🔴 Running')} {Colors.red(str(len(failed_individual_tests)))} {Colors.blue('failed individual tests from baseline...')}\n")

        results = self.runner.run_specific_individual_tests(failed_individual_tests)
        self.print_summary(results)

    def run_passed_files(self) -> None:
        """Run only test files that passed in the baseline"""
        passed_tests = self.baseline.get_tests_by_status(TestStatus.PASSED)

        if not passed_tests:
            print(f"{Colors.yellow('No passed test files found in baseline')}")
            return

        print(f"{Colors.blue('🟢 Running')} {Colors.green(str(len(passed_tests)))} {Colors.blue('passed test files from baseline...')}\n")

        results = self.runner.run_specific_tests(passed_tests)
        self.print_summary(results)

    def run_failed_files(self) -> None:
        """Run only test files that failed in the baseline"""
        failed_tests = self.baseline.get_tests_by_status(TestStatus.FAILED)

        if not failed_tests:
            print(f"{Colors.yellow('No failed test files found in baseline')}")
            return

        print(f"{Colors.blue('🔴 Running')} {Colors.red(str(len(failed_tests)))} {Colors.blue('failed test files from baseline...')}\n")

        results = self.runner.run_specific_tests(failed_tests)
        self.print_summary(results)

    def show_status(self) -> None:
        """Show current baseline status with detailed test breakdown"""
        if not self.baseline.data:
            print(Colors.yellow('No baseline found. Run "create" to create one.'))
            return

        data = self.baseline.data
        timestamp = data.get("timestamp", "Unknown")

        print(f"{Colors.blue(' Test Baseline Status')}")
        print(f"{Colors.blue('='*70)}")
        print(f"Created: {timestamp}")
        print(f"Total test files: {data.get('total_test_files', 0)}")
        print(f"Total individual tests: {data.get('total_individual_tests', 0)}")

        # Test file summary
        test_files = data.get('test_files', {})
        print(f"\n{Colors.cyan('Test Files:')}")
        print(f"  {Colors.green('✓ Passed:')} {test_files.get('passed', 0)}")
        print(f"  {Colors.red('✗ Failed:')} {test_files.get('failed', 0)}")
        print(f"  {Colors.yellow('⚠ Skipped:')} {test_files.get('skipped', 0)}")
        print(f"  {Colors.magenta('! Error:')} {test_files.get('error', 0)}")

        # Individual test summary
        individual_tests = data.get('individual_tests', {})
        print(f"\n{Colors.cyan('Individual Tests:')}")
        print(f"  {Colors.green('✓ Passed:')} {individual_tests.get('passed', 0)}")
        print(f"  {Colors.red('✗ Failed:')} {individual_tests.get('failed', 0)}")
        print(f"  {Colors.yellow('⚠ Skipped:')} {individual_tests.get('skipped', 0)}")

        # Show details by test file
        if "tests" in data:
            print(f"\n{Colors.cyan('Detailed Test Results:')}")

            # Group by test type
            by_type = {"javascript": [], "python": [], "bash": []}
            for test in data["tests"]:
                test_type = test.get("type", "unknown")
                if test_type in by_type:
                    by_type[test_type].append(test)

            for test_type, tests in by_type.items():
                if not tests:
                    continue

                print(f"\n  {Colors.magenta(f'{test_type.upper()} Tests:')}")
                for test in tests:
                    test_name = test["name"]
                    test_status = test["status"]
                    individual_tests = test.get("individual_tests", [])

                    # Test file status
                    status_icon = "✓" if test_status == "passed" else "✗" if test_status == "failed" else "○"
                    status_color = Colors.green if test_status == "passed" else Colors.red if test_status == "failed" else Colors.yellow

                    print(f"    {status_color(status_icon)} {test_name}")

                    # Individual test results
                    if individual_tests:
                        passed_count = sum(1 for t in individual_tests if t["status"] == "passed")
                        failed_count = sum(1 for t in individual_tests if t["status"] == "failed")
                        skipped_count = sum(1 for t in individual_tests if t["status"] == "skipped")

                        print(f"      Individual tests: {len(individual_tests)} total")
                        if passed_count > 0:
                            print(f"        {Colors.green(f'✓ {passed_count} passed')}")
                        if failed_count > 0:
                            print(f"        {Colors.red(f'✗ {failed_count} failed')}")
                        if skipped_count > 0:
                            print(f"        {Colors.yellow(f'○ {skipped_count} skipped')}")

                        # Show individual test names if verbose or if there are few tests
                        if self.verbose or len(individual_tests) <= 5:
                            for individual_test in individual_tests:
                                test_name = individual_test["name"]
                                test_status = individual_test["status"]
                                status_icon = "✓" if test_status == "passed" else "✗" if test_status == "failed" else "○"
                                status_color = Colors.green if test_status == "passed" else Colors.red if test_status == "failed" else Colors.yellow
                                print(f"          {status_color(status_icon)} {test_name}")

    def print_summary(self, results: List[TestResult]) -> None:
        """Print test results summary"""
        total_files = len(results)
        passed_files = sum(1 for r in results if r.status == TestStatus.PASSED)
        failed_files = sum(1 for r in results if r.status == TestStatus.FAILED)
        skipped_files = sum(1 for r in results if r.status == TestStatus.SKIPPED)
        error_files = sum(1 for r in results if r.status == TestStatus.ERROR)

        # Count individual tests
        total_individual = sum(len(r.individual_tests) for r in results)
        passed_individual = sum(1 for r in results for t in r.individual_tests if t.status == TestStatus.PASSED)
        failed_individual = sum(1 for r in results for t in r.individual_tests if t.status == TestStatus.FAILED)
        skipped_individual = sum(1 for r in results for t in r.individual_tests if t.status == TestStatus.SKIPPED)

        print(f"\n{Colors.blue('📈 Test Summary')}")
        print(f"{Colors.blue('='*70)}")

        print(f"Test Files: {total_files}")
        print(f"  {Colors.green('✓ Passed:')} {passed_files}")
        print(f"  {Colors.red('✗ Failed:')} {failed_files}")
        if skipped_files > 0:
            print(f"  {Colors.yellow('⚠ Skipped:')} {skipped_files}")
        if error_files > 0:
            print(f"  {Colors.magenta('! Error:')} {error_files}")

        if total_individual > 0:
            print(f"\nIndividual Tests: {total_individual}")
            print(f"  {Colors.green('✓ Passed:')} {passed_individual}")
            print(f"  {Colors.red('✗ Failed:')} {failed_individual}")
            if skipped_individual > 0:
                print(f"  {Colors.yellow('⚠ Skipped:')} {skipped_individual}")

        if total_files > 0:
            file_success_rate = (passed_files / total_files) * 100
            color_fn = Colors.green if file_success_rate >= 80 else Colors.yellow if file_success_rate >= 50 else Colors.red
            print(f"\nFile Success Rate: {color_fn(f'{file_success_rate:.1f}%')}")

            if total_individual > 0:
                individual_success_rate = (passed_individual / total_individual) * 100
                color_fn = Colors.green if individual_success_rate >= 80 else Colors.yellow if individual_success_rate >= 50 else Colors.red
                print(f"Individual Test Success Rate: {color_fn(f'{individual_success_rate:.1f}%')}")


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Test Baseline Manager - Track and run tests based on their baseline status',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Commands:
  create        Create a new test baseline by running all tests
  passed        Run only individual tests that passed in the baseline
  failed        Run only individual tests that failed in the baseline
  passed-files  Run only test files that passed in the baseline
  failed-files  Run only test files that failed in the baseline
  status        Show current baseline status

Examples:
  python bin/test_baseline_manager.py create           # Create initial baseline
  python bin/test_baseline_manager.py failed           # Re-run only failed individual tests
  python bin/test_baseline_manager.py passed           # Verify passed individual tests still pass
  python bin/test_baseline_manager.py failed-files     # Re-run only failed test files
  python bin/test_baseline_manager.py status           # Check baseline status
  python bin/test_baseline_manager.py status -v        # Show detailed individual test names
        """
    )

    parser.add_argument('command', choices=['create', 'passed', 'failed', 'passed-files', 'failed-files', 'status'],
                       help='Command to execute')
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Show detailed output including individual test names')

    args = parser.parse_args()

    # Get project root
    project_root = Path(__file__).parent.parent

    # Create manager
    manager = TestBaselineManager(project_root, verbose=args.verbose)

    # Execute command
    try:
        if args.command == 'create':
            manager.create_baseline()
        elif args.command == 'passed':
            manager.run_passed_tests()
        elif args.command == 'failed':
            manager.run_failed_tests()
        elif args.command == 'passed-files':
            manager.run_passed_files()
        elif args.command == 'failed-files':
            manager.run_failed_files()
        elif args.command == 'status':
            manager.show_status()
    except KeyboardInterrupt:
        print(f"\n{Colors.yellow('Interrupted by user')}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.red('Error:')} {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
