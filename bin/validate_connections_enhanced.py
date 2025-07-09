#!/usr/bin/env python3
"""
Enhanced RAD Monitor Connection Validation with Comprehensive Error Handling
Robust validation with proper exception handling and recovery
"""

import os
import sys
import json
import subprocess
import importlib
import traceback
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import argparse
from datetime import datetime
import shutil
import tempfile

# Get project root with validation
try:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    if not PROJECT_ROOT.exists():
        raise RuntimeError(f"Project root does not exist: {PROJECT_ROOT}")
except Exception as e:
    print(f"FATAL: Cannot determine project root: {e}", file=sys.stderr)
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(PROJECT_ROOT / 'validation.log', mode='a'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Color codes for output with fallback
class Colors:
    """Safe color output with terminal detection"""
    try:
        if sys.stdout.isatty() and os.getenv('TERM') != 'dumb':
            GREEN = '\033[0;32m'
            RED = '\033[0;31m'
            YELLOW = '\033[1;33m'
            BLUE = '\033[0;34m'
            NC = '\033[0m'  # No Color
        else:
            GREEN = RED = YELLOW = BLUE = NC = ''
    except:
        GREEN = RED = YELLOW = BLUE = NC = ''

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


class ValidationError(Exception):
    """Custom validation exception"""
    pass


class ValidationResult:
    """Enhanced validation result tracking with error details"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.errors = 0
        self.details: List[Dict[str, Any]] = []
        self.start_time = datetime.now()
        self.critical_errors: List[str] = []

    def add_pass(self, test_name: str, message: str = "", duration: float = 0):
        """Record a passing test"""
        try:
            self.passed += 1
            self.details.append({
                "test": test_name,
                "status": "passed",
                "message": message,
                "duration": duration,
                "timestamp": datetime.now().isoformat()
            })
            print(f"{Colors.green('✅')} {test_name}")
            if message:
                print(f"   {message}")
            logger.info(f"PASS: {test_name} - {message}")
        except Exception as e:
            self._handle_output_error(e, test_name)

    def add_fail(self, test_name: str, message: str = "", critical: bool = False):
        """Record a failing test"""
        try:
            self.failed += 1
            self.details.append({
                "test": test_name,
                "status": "failed",
                "message": message,
                "critical": critical,
                "timestamp": datetime.now().isoformat()
            })
            print(f"{Colors.red('(✗)')} {test_name}")
            if message:
                print(f"   {Colors.red(message)}")
            logger.error(f"FAIL: {test_name} - {message}")

            if critical:
                self.critical_errors.append(f"{test_name}: {message}")
        except Exception as e:
            self._handle_output_error(e, test_name)

    def add_warning(self, test_name: str, message: str = ""):
        """Record a warning"""
        try:
            self.warnings += 1
            self.details.append({
                "test": test_name,
                "status": "warning",
                "message": message,
                "timestamp": datetime.now().isoformat()
            })
            print(f"{Colors.yellow('⚠️')}  {test_name}")
            if message:
                print(f"   {Colors.yellow(message)}")
            logger.warning(f"WARN: {test_name} - {message}")
        except Exception as e:
            self._handle_output_error(e, test_name)

    def add_error(self, test_name: str, error: Exception):
        """Record an error during validation"""
        try:
            self.errors += 1
            error_msg = f"{type(error).__name__}: {str(error)}"
            self.details.append({
                "test": test_name,
                "status": "error",
                "message": error_msg,
                "traceback": traceback.format_exc(),
                "timestamp": datetime.now().isoformat()
            })
            print(f"{Colors.red('💥')} ERROR in {test_name}")
            print(f"   {Colors.red(error_msg)}")
            logger.exception(f"ERROR in {test_name}: {error}")
        except Exception as e:
            self._handle_output_error(e, test_name)

    def _handle_output_error(self, error: Exception, context: str):
        """Handle errors in output/logging"""
        try:
            # Fallback to stderr
            print(f"Output error in {context}: {error}", file=sys.stderr)
        except:
            pass  # Ultimate fallback - do nothing

    def to_json(self) -> Dict[str, Any]:
        """Export results as JSON with error handling"""
        try:
            duration = (datetime.now() - self.start_time).total_seconds()
            return {
                "summary": {
                    "passed": self.passed,
                    "failed": self.failed,
                    "warnings": self.warnings,
                    "errors": self.errors,
                    "total": self.passed + self.failed,
                    "success": self.failed == 0 and self.errors == 0,
                    "duration": duration,
                    "critical_errors": self.critical_errors
                },
                "details": self.details,
                "timestamp": datetime.now().isoformat(),
                "project_root": str(PROJECT_ROOT)
            }
        except Exception as e:
            logger.error(f"Error converting results to JSON: {e}")
            return {
                "error": "Failed to generate JSON results",
                "message": str(e)
            }


class SafeValidator:
    """Validator with comprehensive error handling"""

    def __init__(self, verbose: bool = False, continue_on_error: bool = True):
        self.verbose = verbose
        self.continue_on_error = continue_on_error
        self.result = ValidationResult()
        self._temp_files: List[Path] = []

    def __del__(self):
        """Cleanup temporary files"""
        for temp_file in self._temp_files:
            try:
                if temp_file.exists():
                    temp_file.unlink()
            except:
                pass

    def safe_check_file(self, filepath: str, description: str,
                       check_read: bool = False, check_json: bool = False) -> bool:
        """Safely check file with multiple validation levels"""
        try:
            full_path = PROJECT_ROOT / filepath

            # Basic existence check
            if not full_path.exists():
                self.result.add_fail(description, f"File not found: {filepath}")
                return False

            if not full_path.is_file():
                self.result.add_fail(description, f"Not a file: {filepath}")
                return False

            # Check if readable
            if check_read:
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read(1)  # Try to read one character
                except PermissionError:
                    self.result.add_fail(description, f"Permission denied: {filepath}")
                    return False
                except UnicodeDecodeError:
                    self.result.add_warning(description, f"Not a text file: {filepath}")
                    return True  # Binary file is OK
                except Exception as e:
                    self.result.add_fail(description, f"Cannot read file: {e}")
                    return False

            # Check JSON validity if requested
            if check_json:
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        json.load(f)
                except json.JSONDecodeError as e:
                    self.result.add_fail(description, f"Invalid JSON: {e}")
                    return False
                except Exception as e:
                    self.result.add_fail(description, f"Error reading JSON: {e}")
                    return False

            # Check file size
            try:
                size = full_path.stat().st_size
                if size == 0:
                    self.result.add_warning(description, "File is empty")
                elif size > 100 * 1024 * 1024:  # 100MB
                    self.result.add_warning(description, f"Large file: {size / (1024*1024):.1f} MB")
            except:
                pass  # Size check is non-critical

            self.result.add_pass(description)
            return True

        except Exception as e:
            self.result.add_error(description, e)
            return False

    def safe_check_dir(self, dirpath: str, description: str,
                      check_writable: bool = False) -> bool:
        """Safely check directory with permissions"""
        try:
            full_path = PROJECT_ROOT / dirpath

            if not full_path.exists():
                self.result.add_fail(description, f"Directory not found: {dirpath}")
                return False

            if not full_path.is_dir():
                self.result.add_fail(description, f"Not a directory: {dirpath}")
                return False

            # Check if writable
            if check_writable:
                try:
                    temp_file = full_path / f".write_test_{os.getpid()}"
                    temp_file.touch()
                    temp_file.unlink()
                except PermissionError:
                    self.result.add_fail(description, f"Directory not writable: {dirpath}")
                    return False
                except Exception as e:
                    self.result.add_fail(description, f"Cannot write to directory: {e}")
                    return False

            self.result.add_pass(description)
            return True

        except Exception as e:
            self.result.add_error(description, e)
            return False

    def safe_check_python_import(self, import_statement: str, description: str) -> bool:
        """Safely check Python import with isolation"""
        try:
            # Basic validation
            if not import_statement or len(import_statement) > 200:
                self.result.add_fail(description, "Invalid import statement")
                return False

            # Security check
            dangerous_patterns = ['exec', 'eval', '__import__', 'compile', 'open']
            if any(pattern in import_statement.lower() for pattern in dangerous_patterns):
                self.result.add_fail(description, "Potentially dangerous import")
                return False

            # Try the import in a subprocess for isolation
            code = f"""
import sys
try:
    {import_statement}
    sys.exit(0)
except ImportError as e:
    print(str(e), file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Unexpected: {{e}}", file=sys.stderr)
    sys.exit(2)
"""
            result = subprocess.run(
                [sys.executable, "-c", code],
                capture_output=True,
                text=True,
                timeout=5
            )

            if result.returncode == 0:
                self.result.add_pass(description)
                return True
            elif result.returncode == 1:
                self.result.add_fail(description, result.stderr.strip())
                return False
            else:
                self.result.add_fail(description, f"Import error: {result.stderr.strip()}")
                return False

        except subprocess.TimeoutExpired:
            self.result.add_fail(description, "Import timeout - possible infinite loop")
            return False
        except Exception as e:
            self.result.add_error(description, e)
            return False

    def safe_check_command(self, command: str, description: str) -> bool:
        """Safely check command availability"""
        try:
            # Use shutil.which for cross-platform compatibility
            if shutil.which(command):
                self.result.add_pass(description)
                return True
            else:
                self.result.add_fail(description, f"Command not found: {command}")
                return False
        except Exception as e:
            self.result.add_error(description, e)
            return False

    def safe_check_env_var(self, var_name: str, description: str,
                          required: bool = True, sensitive: bool = False) -> bool:
        """Safely check environment variable"""
        try:
            # Validate variable name
            if not var_name or not var_name.replace('_', '').isalnum():
                self.result.add_fail(description, f"Invalid variable name: {var_name}")
                return False

            value = os.environ.get(var_name)

            if value:
                if sensitive and self.verbose:
                    # Don't log sensitive values
                    self.result.add_pass(description + " (value hidden)")
                else:
                    self.result.add_pass(description)
                return True
            elif required:
                self.result.add_fail(description, f"Required variable not set: {var_name}")
                return False
            else:
                self.result.add_warning(description, f"Optional variable not set: {var_name}")
                return True

        except Exception as e:
            self.result.add_error(description, e)
            return False

    def safe_load_json(self, filepath: str, description: str) -> Optional[Dict]:
        """Safely load and validate JSON file"""
        try:
            full_path = PROJECT_ROOT / filepath

            if not full_path.exists():
                self.result.add_fail(description, f"File not found: {filepath}")
                return None

            # Check file size first
            size = full_path.stat().st_size
            if size > 10 * 1024 * 1024:  # 10MB limit for JSON
                self.result.add_fail(description, f"JSON file too large: {size / (1024*1024):.1f} MB")
                return None

            with open(full_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            self.result.add_pass(description)
            return data

        except json.JSONDecodeError as e:
            self.result.add_fail(description, f"Invalid JSON at line {e.lineno}: {e.msg}")
            return None
        except Exception as e:
            self.result.add_error(description, e)
            return None

    def safe_run_command(self, command: List[str], description: str,
                        timeout: int = 30) -> Optional[subprocess.CompletedProcess]:
        """Safely run external command with timeout"""
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False
            )

            if result.returncode == 0:
                self.result.add_pass(description)
            else:
                self.result.add_fail(description, f"Exit code: {result.returncode}")
                if result.stderr:
                    logger.debug(f"Command stderr: {result.stderr}")

            return result

        except subprocess.TimeoutExpired:
            self.result.add_fail(description, f"Command timed out after {timeout}s")
            return None
        except FileNotFoundError:
            self.result.add_fail(description, f"Command not found: {command[0]}")
            return None
        except Exception as e:
            self.result.add_error(description, e)
            return None

    def validate_project_structure(self):
        """Validate project structure with error recovery"""
        print(f"\n{Colors.blue('🏗️  Checking Project Structure...')}")
        print("=" * 40)

        essential_dirs = [
            ("assets", "Assets directory", True),
            ("config", "Configuration directory", True),
            ("bin", "Scripts directory", True),
        ]

        optional_dirs = [
            ("assets/js", "JavaScript assets", False),
            ("assets/css", "CSS assets", False),
            ("tests", "Tests directory", False),
            ("assets/js/formula-builder", "Formula builder", False),
        ]

        # Check essential directories first
        for dirpath, desc, critical in essential_dirs:
            if not self.safe_check_dir(dirpath, desc):
                if critical and not self.continue_on_error:
                    raise ValidationError(f"Critical directory missing: {dirpath}")

        # Check optional directories
        for dirpath, desc, _ in optional_dirs:
            self.safe_check_dir(dirpath, desc)

    def validate_core_files(self):
        """Validate core files with JSON checking"""
        print(f"\n{Colors.blue('📄 Checking Core Files...')}")
        print("=" * 40)

        # Critical files that must exist and be valid
        critical_files = [
            ("config/settings.json", "Settings configuration", True, True),
            ("package.json", "Node.js configuration", True, True),
        ]

        # Important files
        important_files = [
            ("index.html", "Main HTML file", True, False),
            ("bin/server.py", "FastAPI server", True, False),
            ("bin/simple-server.py", "Simple HTTP server", True, False),
        ]

        # Optional files
        optional_files = [
            ("vitest.config.js", "Test configuration", False, False),
            (".env", "Environment configuration", False, False),
            ("requirements.txt", "Python dependencies", False, False),
        ]

        # Check critical files
        for filepath, desc, check_read, check_json in critical_files:
            if not self.safe_check_file(filepath, desc, check_read=check_read, check_json=check_json):
                if not self.continue_on_error:
                    raise ValidationError(f"Critical file invalid: {filepath}")

        # Check important files
        for filepath, desc, check_read, check_json in important_files:
            self.safe_check_file(filepath, desc, check_read=check_read, check_json=check_json)

        # Check optional files
        for filepath, desc, check_read, check_json in optional_files:
            if (PROJECT_ROOT / filepath).exists():
                self.safe_check_file(filepath, desc, check_read=check_read, check_json=check_json)

    def validate_dependencies(self):
        """Validate dependencies with fallback options"""
        print(f"\n{Colors.blue('📦 Checking Dependencies...')}")
        print("=" * 40)

        # Python packages with fallback checks
        python_packages = [
            ("fastapi", "FastAPI framework"),
            ("pydantic", "Data validation"),
            ("uvicorn", "ASGI server"),
        ]

        for package, desc in python_packages:
            if not self.safe_check_python_import(f"import {package}", desc):
                # Try pip show as fallback
                result = self.safe_run_command(
                    [sys.executable, "-m", "pip", "show", package],
                    f"{desc} (pip check)",
                    timeout=10
                )
                if result and result.returncode != 0:
                    self.result.add_warning(
                        f"{desc} installation",
                        f"Install with: pip install {package}"
                    )

        # Node.js check
        if self.safe_check_command("node", "Node.js"):
            # Check npm
            if self.safe_check_command("npm", "npm package manager"):
                # Check node_modules
                if not self.safe_check_dir("node_modules", "Node modules"):
                    self.result.add_warning(
                        "Node modules",
                        "Run: npm install"
                    )

    def validate_configuration(self):
        """Validate configuration files"""
        print(f"\n{Colors.blue('⚙️  Checking Configuration...')}")
        print("=" * 40)

        # Load and validate settings.json
        settings = self.safe_load_json("config/settings.json", "Load settings.json")
        if settings:
            # Validate required sections
            required_sections = ["elasticsearch", "kibana", "processing"]
            missing = [s for s in required_sections if s not in settings]

            if missing:
                self.result.add_fail(
                    "Settings structure",
                    f"Missing sections: {', '.join(missing)}"
                )
            else:
                self.result.add_pass("Settings structure valid")

        # Check environment configuration
        env_file = PROJECT_ROOT / ".env"
        if env_file.exists():
            try:
                with open(env_file, 'r', encoding='utf-8') as f:
                    env_content = f.read()

                # Check for common configuration patterns
                if any(key in env_content for key in ["ES_COOKIE", "ELASTIC_COOKIE", "API_TOKEN"]):
                    self.result.add_pass("Environment variables configured")
                else:
                    self.result.add_warning(
                        "Environment configuration",
                        "No authentication tokens found in .env"
                    )
            except Exception as e:
                self.result.add_error(".env file check", e)
        else:
            self.result.add_warning(
                "Environment file",
                "No .env file found - using defaults"
            )

    def validate_runtime_environment(self):
        """Validate runtime environment"""
        print(f"\n{Colors.blue('🖥️  Checking Runtime Environment...')}")
        print("=" * 40)

        # Python version
        py_version = sys.version_info
        if py_version >= (3, 8):
            self.result.add_pass(
                "Python version",
                f"Python {py_version.major}.{py_version.minor}.{py_version.micro}"
            )
        else:
            self.result.add_fail(
                "Python version",
                f"Python 3.8+ required, found {py_version.major}.{py_version.minor}"
            )

        # Check write permissions
        self.safe_check_dir(".", "Project directory writable", check_writable=True)

        # Check available disk space
        try:
            import shutil
            stat = shutil.disk_usage(PROJECT_ROOT)
            free_gb = stat.free / (1024**3)

            if free_gb < 0.1:
                self.result.add_fail("Disk space", f"Only {free_gb:.2f} GB free")
            elif free_gb < 1:
                self.result.add_warning("Disk space", f"Low disk space: {free_gb:.2f} GB free")
            else:
                self.result.add_pass("Disk space", f"{free_gb:.1f} GB free")
        except Exception as e:
            self.result.add_error("Disk space check", e)

    def run_all_validations(self) -> bool:
        """Run all validations with error handling"""
        print("=" * 60)
        print(f"{Colors.blue('🔍 RAD Monitor Enhanced Validation')}")
        print("=" * 60)
        print(f"Project Root: {PROJECT_ROOT}")
        print(f"Python: {sys.version.split()[0]}")
        print(f"Platform: {sys.platform}")
        print("=" * 60)

        try:
            # Run validations in order of importance
            validation_steps = [
                ("Runtime Environment", self.validate_runtime_environment),
                ("Project Structure", self.validate_project_structure),
                ("Core Files", self.validate_core_files),
                ("Configuration", self.validate_configuration),
                ("Dependencies", self.validate_dependencies),
            ]

            for step_name, step_func in validation_steps:
                try:
                    step_func()
                except ValidationError as e:
                    logger.error(f"Critical error in {step_name}: {e}")
                    if not self.continue_on_error:
                        break
                except Exception as e:
                    self.result.add_error(f"{step_name} validation", e)
                    if not self.continue_on_error:
                        break

            # Summary
            self._print_summary()

            return self.result.failed == 0 and self.result.errors == 0

        except Exception as e:
            logger.exception("Fatal error during validation")
            print(f"\n{Colors.red('FATAL ERROR:')} {e}")
            return False

    def _print_summary(self):
        """Print validation summary"""
        print("\n" + "=" * 60)
        print(f"{Colors.blue('📋 VALIDATION SUMMARY')}")
        print("=" * 60)

        duration = (datetime.now() - self.result.start_time).total_seconds()
        print(f"Duration: {duration:.2f} seconds")
        print(f"Passed: {Colors.green(str(self.result.passed))}")
        print(f"Failed: {Colors.red(str(self.result.failed))}")
        print(f"Warnings: {Colors.yellow(str(self.result.warnings))}")
        print(f"Errors: {Colors.red(str(self.result.errors))}")

        if self.result.critical_errors:
            print(f"\n{Colors.red('Critical Errors:')}")
            for error in self.result.critical_errors:
                print(f"  • {error}")

        if self.result.failed == 0 and self.result.errors == 0:
            print(f"\n{Colors.green('(✓)Validation successful!')}")
            print("\nNext steps:")
            print("1. Configure your settings in .env")
            print("2. Run: npm start")
            print("3. Access: http://localhost:8000")
        else:
            print(f"\n{Colors.red('(✗) Validation failed')}")
            print("\nRecommended fixes:")
            print("1. Check the errors above")
            print("2. Run: pip install -r requirements.txt")
            print("3. Run: npm install")
            print("4. Ensure all files exist and are readable")


def main():
    """Main entry point with error handling"""
    parser = argparse.ArgumentParser(
        description='Enhanced RAD Monitor validation with comprehensive error handling',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                    # Run standard validation
  %(prog)s --json            # Output results as JSON
  %(prog)s --strict          # Stop on first error
  %(prog)s -o results.json   # Save results to file
        """
    )

    parser.add_argument('-v', '--verbose', action='store_true',
                       help='Enable verbose output')
    parser.add_argument('-j', '--json', action='store_true',
                       help='Output results as JSON')
    parser.add_argument('-o', '--output',
                       help='Save results to file (JSON format)')
    parser.add_argument('-s', '--strict', action='store_true',
                       help='Stop on first error (strict mode)')
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       default='INFO', help='Set logging level')

    try:
        args = parser.parse_args()

        # Configure logging level
        logging.getLogger().setLevel(getattr(logging, args.log_level))

        # Create validator
        validator = SafeValidator(
            verbose=args.verbose,
            continue_on_error=not args.strict
        )

        # Run validation
        success = validator.run_all_validations()

        # Handle output
        if args.json or args.output:
            results = validator.result.to_json()

            if args.output:
                try:
                    with open(args.output, 'w', encoding='utf-8') as f:
                        json.dump(results, f, indent=2, ensure_ascii=False)
                    if not args.json:
                        print(f"\nResults saved to: {args.output}")
                except Exception as e:
                    logger.error(f"Failed to save results: {e}")
                    sys.exit(2)

            if args.json:
                print(json.dumps(results, indent=2, ensure_ascii=False))

        # Exit with appropriate code
        sys.exit(0 if success else 1)

    except KeyboardInterrupt:
        print(f"\n{Colors.yellow('Validation interrupted by user')}")
        sys.exit(130)
    except Exception as e:
        logger.exception("Unhandled exception in main")
        print(f"\n{Colors.red('FATAL ERROR:')} {e}")
        sys.exit(2)


if __name__ == '__main__':
    main()
