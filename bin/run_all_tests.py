#!/usr/bin/env python3
"""
Comprehensive Test Runner for RAD Monitor
Runs all tests with proper error handling and reporting
"""

import sys
import subprocess
import time
import json
from pathlib import Path
from datetime import datetime
from typing import List, Tuple, Dict, Any

# Colors for output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
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


class TestRunner:
    """Comprehensive test runner with error handling"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results = []
        self.start_time = time.time()
        self.project_root = Path(__file__).parent.parent

    def run_command(self, command: List[str], description: str,
                   timeout: int = 300) -> Tuple[bool, str, float]:
        """Run a command with timeout and error handling"""
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

            if result.returncode == 0:
                return True, result.stdout, duration
            else:
                error_msg = result.stderr or result.stdout
                return False, error_msg, duration

        except subprocess.TimeoutExpired:
            duration = time.time() - start
            return False, f"Timeout after {timeout}s", duration
        except Exception as e:
            duration = time.time() - start
            return False, str(e), duration

    def print_header(self, title: str):
        """Print a formatted header"""
        print(f"\n{Colors.blue('=' * 60)}")
        print(f"{Colors.blue(title.center(60))}")
        print(f"{Colors.blue('=' * 60)}")

    def run_validation_tests(self):
        """Run validation script tests"""
        self.print_header("VALIDATION SCRIPTS")

        scripts = [
            ("Basic Validation", ["python3", "bin/validate_connections_simple.py"]),
            ("Enhanced Validation", ["python3", "bin/validate_connections_enhanced.py"]),
            ("Production Validation", ["python3", "bin/validate_connections_production.py"]),
        ]

        for name, command in scripts:
            print(f"\n{Colors.cyan('Running:')} {name}")
            success, output, duration = self.run_command(command, name, timeout=60)

            if success:
                print(f"{Colors.green('(✓)PASSED')} ({duration:.2f}s)")
            else:
                print(f"{Colors.red('(✗) FAILED')} ({duration:.2f}s)")
                if self.verbose:
                    print(f"Error: {output[:500]}...")

            self.results.append({
                "test": name,
                "success": success,
                "duration": duration,
                "type": "validation"
            })

    def run_python_tests(self):
        """Run Python unit tests"""
        self.print_header("PYTHON UNIT TESTS")

        # Check if pytest is available
        success, _, _ = self.run_command(
            [sys.executable, "-m", "pytest", "--version"],
            "Check pytest",
            timeout=10
        )

        if not success:
            print(f"{Colors.yellow('⚠️  pytest not installed')}")
            print("Install with: pip install pytest pytest-cov")
            return

        test_files = [
            "tests/test_server_production.py",
            "tests/test_validate_connections_production.py",
            "tests/test_validate_connections_enhanced.py",
        ]

        for test_file in test_files:
            if not (self.project_root / test_file).exists():
                print(f"{Colors.yellow('⚠️  Skipping')} {test_file} (not found)")
                continue

            print(f"\n{Colors.cyan('Testing:')} {test_file}")

            command = [
                sys.executable, "-m", "pytest", test_file,
                "-v", "--tb=short",
                "--cov=bin", "--cov-report=term-missing"
            ]

            success, output, duration = self.run_command(command, test_file)

            if success:
                # Extract test summary
                lines = output.split('\n')
                for line in lines:
                    if "passed" in line and "failed" in line:
                        print(f"{Colors.green('✅')} {line.strip()}")
                        break
                else:
                    print(f"{Colors.green('(✓)All tests passed')} ({duration:.2f}s)")
            else:
                print(f"{Colors.red('(✗) Tests failed')} ({duration:.2f}s)")
                # Extract failure summary
                lines = output.split('\n')
                for line in lines:
                    if "FAILED" in line or "ERROR" in line:
                        print(f"   {Colors.red(line.strip())}")

            self.results.append({
                "test": test_file,
                "success": success,
                "duration": duration,
                "type": "python"
            })

    def run_javascript_tests(self):
        """Run JavaScript tests"""
        self.print_header("JAVASCRIPT TESTS")

        # Check if npm is available
        success, _, _ = self.run_command(
            ["npm", "--version"],
            "Check npm",
            timeout=10
        )

        if not success:
            print(f"{Colors.yellow('⚠️  npm not installed')}")
            return

        # Check if node_modules exists
        if not (self.project_root / "node_modules").exists():
            print(f"{Colors.yellow('⚠️  node_modules not found')}")
            print("Run: npm install")
            return

        print(f"\n{Colors.cyan('Running:')} npm test")

        command = ["npm", "test", "--", "--run"]
        success, output, duration = self.run_command(command, "JavaScript tests")

        if success:
            print(f"{Colors.green('(✓)JavaScript tests passed')} ({duration:.2f}s)")
        else:
            print(f"{Colors.red('(✗) JavaScript tests failed')} ({duration:.2f}s)")
            if self.verbose:
                print(output[:1000])

        self.results.append({
            "test": "JavaScript tests",
            "success": success,
            "duration": duration,
            "type": "javascript"
        })

    def run_security_checks(self):
        """Run basic security checks"""
        self.print_header("SECURITY CHECKS")

        checks = []

        # Check for hardcoded secrets
        print(f"\n{Colors.cyan('Checking:')} Hardcoded secrets")

        patterns = [
            ("password", r'password\s*=\s*["\'][^"\']+["\']'),
            ("api_key", r'api_key\s*=\s*["\'][^"\']+["\']'),
            ("secret", r'secret\s*=\s*["\'][^"\']+["\']'),
        ]

        found_issues = False
        for name, pattern in patterns:
            command = ["grep", "-r", "-E", pattern, ".",
                      "--exclude-dir=node_modules",
                      "--exclude-dir=.git",
                      "--exclude=*.test.js",
                      "--exclude=*.test.py"]

            success, output, _ = self.run_command(command, f"Check {name}", timeout=30)

            # For grep, success means pattern was found (which is bad)
            if success and output.strip():
                print(f"{Colors.red('(✗)')} Found potential {name} in code")
                found_issues = True

        if not found_issues:
            print(f"{Colors.green('(✓)No hardcoded secrets found')}")

        self.results.append({
            "test": "Security checks",
            "success": not found_issues,
            "duration": 0,
            "type": "security"
        })

    def run_performance_benchmarks(self):
        """Run basic performance benchmarks"""
        self.print_header("PERFORMANCE BENCHMARKS")

        print(f"\n{Colors.cyan('Testing:')} Server startup time")

        # Test server startup
        command = [sys.executable, "bin/server.py", "--help"]
        success, _, duration = self.run_command(command, "Server startup", timeout=10)

        if success:
            if duration < 2:
                print(f"{Colors.green('(✓)Fast startup')} ({duration:.2f}s)")
            else:
                print(f"{Colors.yellow('⚠️  Slow startup')} ({duration:.2f}s)")
        else:
            print(f"{Colors.red('(✗) Server failed to start')}")

        self.results.append({
            "test": "Server startup",
            "success": success and duration < 2,
            "duration": duration,
            "type": "performance"
        })

    def generate_report(self):
        """Generate final test report"""
        self.print_header("TEST SUMMARY")

        total_duration = time.time() - self.start_time

        # Count results by type
        by_type = {}
        for result in self.results:
            test_type = result["type"]
            if test_type not in by_type:
                by_type[test_type] = {"passed": 0, "failed": 0, "total": 0}

            by_type[test_type]["total"] += 1
            if result["success"]:
                by_type[test_type]["passed"] += 1
            else:
                by_type[test_type]["failed"] += 1

        # Print summary by type
        for test_type, counts in by_type.items():
            print(f"\n{test_type.upper()}:")
            print(f"  Passed: {Colors.green(str(counts['passed']))}")
            print(f"  Failed: {Colors.red(str(counts['failed']))}")
            print(f"  Total:  {counts['total']}")

        # Overall summary
        total_passed = sum(r["success"] for r in self.results)
        total_tests = len(self.results)

        print(f"\n{Colors.blue('OVERALL:')}")
        print(f"  Total Tests: {total_tests}")
        print(f"  Passed: {Colors.green(str(total_passed))}")
        print(f"  Failed: {Colors.red(str(total_tests - total_passed))}")
        print(f"  Duration: {total_duration:.2f}s")

        # Success rate
        if total_tests > 0:
            success_rate = (total_passed / total_tests) * 100
            if success_rate == 100:
                print(f"\n{Colors.green('🎉 All tests passed! (100%)')}")
            elif success_rate >= 80:
                print(f"\n{Colors.yellow(f'⚠️  {success_rate:.1f}% tests passed')}")
            else:
                print(f"\n{Colors.red(f'(✗) Only {success_rate:.1f}% tests passed')}")

        # Save report
        report_file = self.project_root / "test_report.json"
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "duration": total_duration,
            "summary": {
                "total": total_tests,
                "passed": total_passed,
                "failed": total_tests - total_passed,
                "success_rate": success_rate if total_tests > 0 else 0
            },
            "by_type": by_type,
            "results": self.results
        }

        try:
            with open(report_file, 'w') as f:
                json.dump(report_data, f, indent=2)
            print(f"\nDetailed report saved to: {report_file}")
        except Exception as e:
            print(f"\n{Colors.yellow('Warning:')} Could not save report: {e}")

        return total_passed == total_tests

    def run_all_tests(self):
        """Run all test suites"""
        print(f"{Colors.blue('🧪 RAD Monitor Comprehensive Test Suite')}")
        print(f"Project: {self.project_root}")
        print(f"Python: {sys.version.split()[0]}")
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Run test suites
        self.run_validation_tests()
        self.run_python_tests()
        self.run_javascript_tests()
        self.run_security_checks()
        self.run_performance_benchmarks()

        # Generate report
        all_passed = self.generate_report()

        return all_passed


def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Run comprehensive test suite for RAD Monitor'
    )
    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Show detailed output')
    parser.add_argument('--python-only', action='store_true',
                       help='Run only Python tests')
    parser.add_argument('--quick', action='store_true',
                       help='Run quick tests only')

    args = parser.parse_args()

    try:
        runner = TestRunner(verbose=args.verbose)

        if args.python_only:
            runner.run_python_tests()
            runner.generate_report()
        elif args.quick:
            runner.run_validation_tests()
            runner.generate_report()
        else:
            all_passed = runner.run_all_tests()
            sys.exit(0 if all_passed else 1)

    except KeyboardInterrupt:
        print(f"\n{Colors.yellow('Tests interrupted by user')}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Colors.red('Test runner error:')} {e}")
        sys.exit(2)


if __name__ == '__main__':
    main()
