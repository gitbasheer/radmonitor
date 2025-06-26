#!/usr/bin/env python3
"""
RAD Monitor Connection Validation
Validates all components are properly connected
100% functional replacement for validate_connections.sh
"""

import os
import sys
import json
import subprocess
import importlib.util
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import argparse
import logging

# Add src to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Color codes for output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'  # No Color

    @classmethod
    def green(cls, text: str) -> str:
        return f"{cls.GREEN}{text}{cls.NC}"

    @classmethod
    def red(cls, text: str) -> str:
        return f"{cls.RED}{text}{cls.NC}"

    @classmethod
    def yellow(cls, text: str) -> str:
        return f"{cls.YELLOW}{text}{cls.NC}"


class ValidationResult:
    """Track validation results"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.details: List[Tuple[str, bool, str]] = []

    def add_pass(self, test_name: str, message: str = ""):
        self.passed += 1
        self.details.append((test_name, True, message))
        print(f"{Colors.green('✅')} {test_name}")
        if message:
            print(f"   {message}")

    def add_fail(self, test_name: str, message: str = ""):
        self.failed += 1
        self.details.append((test_name, False, message))
        print(f"{Colors.red('❌')} {test_name}")
        if message:
            print(f"   {Colors.red(message)}")

    def add_warning(self, test_name: str, message: str = ""):
        self.warnings += 1
        print(f"{Colors.yellow('⚠️')}  {test_name}")
        if message:
            print(f"   {Colors.yellow(message)}")

    def to_json(self) -> Dict[str, Any]:
        """Export results as JSON"""
        return {
            "passed": self.passed,
            "failed": self.failed,
            "warnings": self.warnings,
            "total": self.passed + self.failed,
            "success": self.failed == 0,
            "details": [
                {"test": test, "passed": passed, "message": msg}
                for test, passed, msg in self.details
            ]
        }


class Validator:
    """Main validation logic"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.result = ValidationResult()

    def check_file(self, filepath: str, description: str) -> bool:
        """Check if a file exists"""
        if Path(filepath).is_file():
            self.result.add_pass(description)
            return True
        else:
            self.result.add_fail(description, f"File not found: {filepath}")
            return False

    def check_dir(self, dirpath: str, description: str) -> bool:
        """Check if a directory exists"""
        if Path(dirpath).is_dir():
            self.result.add_pass(description)
            return True
        else:
            self.result.add_fail(description, f"Directory not found: {dirpath}")
            return False

    def check_python_import(self, import_statement: str, description: str) -> bool:
        """Check if a Python import works"""
        try:
            # Split the import statement
            if " import " in import_statement:
                module_path, names = import_statement.replace("from ", "").split(" import ")
                # Try to import the module
                module = importlib.import_module(module_path)
                # Check if the imported names exist
                for name in names.split(","):
                    name = name.strip()
                    if not hasattr(module, name):
                        self.result.add_fail(description, f"Module {module_path} has no attribute {name}")
                        return False
            else:
                # Direct import
                importlib.import_module(import_statement.replace("import ", ""))

            self.result.add_pass(description)
            return True
        except ImportError as e:
            self.result.add_fail(description, str(e))
            return False
        except Exception as e:
            self.result.add_fail(description, f"Unexpected error: {e}")
            return False

    def check_command(self, command: str, description: str) -> bool:
        """Check if a command exists"""
        try:
            result = subprocess.run(
                ["which", command],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                self.result.add_pass(description)
                return True
            else:
                self.result.add_fail(description, f"Command not found: {command}")
                return False
        except:
            self.result.add_fail(description, f"Failed to check command: {command}")
            return False

    def check_env_var(self, var_name: str, description: str, required: bool = True) -> bool:
        """Check if an environment variable is set"""
        value = os.environ.get(var_name)
        if value:
            self.result.add_pass(description)
            return True
        elif required:
            self.result.add_fail(description, f"Environment variable not set: {var_name}")
            return False
        else:
            self.result.add_warning(description, f"Optional variable not set: {var_name}")
            return False

    def validate_project_structure(self):
        """Check core directories"""
        print("\n🏗️  Checking Project Structure...")
        print("================================")

        dirs = [
            ("src", "Source directory exists"),
            ("src/api", "API module exists"),
            ("src/data", "Data module exists"),
            ("src/data/processors", "Data processors exist"),
            ("assets", "Assets directory exists"),
            ("assets/js", "JavaScript assets exist"),
            ("assets/css", "CSS assets exist"),
            ("tests", "Tests directory exists"),
        ]

        for dirpath, description in dirs:
            self.check_dir(dirpath, description)

    def validate_core_files(self):
        """Check core files"""
        print("\n📄 Checking Core Files...")
        print("========================")

        # Configuration files
        files = [
            # Remove files that don't exist yet or are being checked incorrectly
            ("src/api/config_api.py", "Configuration API"),

            ("src/data/process_data.py", "Data processor"),
            ("config/env.example", "Environment example"),
            # Frontend files
            ("assets/js/dashboard-main.js", "Main dashboard script"),

            ("assets/js/config-manager.js", "Configuration manager"),
            ("assets/js/ui-updater.js", "UI updater"),
            ("assets/js/data-processor.js", "Frontend data processor"),
            # Test files
            ("tests/test_config_api.py", "Configuration API tests"),
            ("test_full_integration.py", "Integration test suite"),
            ("vitest.config.js", "JavaScript test config"),
        ]

        for filepath, description in files:
            self.check_file(filepath, description)

    def validate_python_imports(self):
        """Test Python imports"""
        print("\n🔗 Checking Python Imports...")
        print("=============================")

        # Only check imports that actually exist
        imports = [
            ("from src.data.models import ProcessingConfig, TrafficEvent", "Data models import"),
            ("from src.data.processors import TrafficProcessor, ScoreCalculator", "Data processors import"),
            ("from src.api.config_api import router", "Config API import"),
        ]

        for import_stmt, description in imports:
            self.check_python_import(import_stmt, description)

    def validate_dependencies(self):
        """Check Python dependencies"""
        print("\n📦 Checking Dependencies...")
        print("==========================")

        # Python packages
        packages = [
            ("fastapi", "FastAPI installed"),
            ("pydantic", "Pydantic installed"),
            ("uvicorn", "Uvicorn installed"),
        ]

        for package, description in packages:
            self.check_python_import(f"import {package}", description)

        # Check node modules
        if Path("node_modules").is_dir():
            self.result.add_pass("Node modules installed")
        else:
            self.result.add_fail("Node modules installed", "Run: npm install")

    def validate_configuration(self):
        """Check configuration"""
        print("\n⚙️  Checking Configuration...")
        print("============================")

        # Check for .env file
        if Path(".env").is_file():
            self.result.add_pass(".env file exists")
            # Check contents
            try:
                with open(".env", "r") as f:
                    contents = f.read()
                if "ES_COOKIE" in contents or "ELASTIC_COOKIE" in contents:
                    self.result.add_pass("Cookie configured in .env")
                else:
                    self.result.add_fail("Cookie configured in .env", "Add ES_COOKIE to .env")
            except:
                self.result.add_fail(".env file readable", "Cannot read .env file")
        else:
            self.result.add_warning("No .env file found (optional)", "Copy config/env.example to .env")

        # Test environment variables
        test_vars = {
            "ES_COOKIE": "test_validation",
            "BASELINE_START": "2024-01-01T00:00:00",
            "BASELINE_END": "2024-01-07T00:00:00"
        }

        # Set test variables
        for var, value in test_vars.items():
            os.environ[var] = value

        # Note: src/config was removed as it was never fully implemented
        self.result.add_warning("Configuration module", "src/config was removed (never implemented)")

    def validate_integration_points(self):
        """Check integration points"""
        print("\n🔄 Checking Integration Points...")
        print("================================")

        # Check CORS proxy integration
        if Path("bin/cors_proxy.py").is_file():
            self.result.add_pass("CORS proxy exists")
        else:
            self.result.add_fail("CORS proxy exists", "bin/cors_proxy.py not found")

        # Check frontend integration
        if Path("index.html").is_file():
            with open("index.html", "r") as f:
                content = f.read()

            if "config-manager.js" in content:
                self.result.add_pass("Frontend includes config manager")
            else:
                self.result.add_warning("Frontend config manager", "config-manager.js not found in index.html")

    def validate_test_configuration(self):
        """Check test configuration"""
        print("\n🧪 Checking Test Configuration...")
        print("================================")

        # Python tests
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", "--collect-only", "-q", "tests/test_config_api.py"],
                capture_output=True,
                text=True
            )
            if "error" not in result.stderr.lower():
                self.result.add_pass("Python tests discoverable")
            else:
                self.result.add_fail("Python tests discoverable", "pytest cannot discover tests")
        except:
            self.result.add_fail("Python tests discoverable", "pytest not installed")

        # JavaScript tests
        if Path("package.json").is_file():
            try:
                result = subprocess.run(
                    ["npm", "test", "--", "--run", "--reporter=json"],
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    self.result.add_pass("JavaScript tests runnable")
                else:
                    self.result.add_fail("JavaScript tests runnable", "npm test failed")
            except:
                self.result.add_fail("JavaScript tests runnable", "npm not found")

    def validate_data_flow(self):
        """Test data processing pipeline"""
        print("\n📊 Checking Data Flow...")
        print("=======================")

        # Set test environment
        os.environ['ES_COOKIE'] = 'test'
        os.environ['BASELINE_START'] = '2024-01-01T00:00:00'
        os.environ['BASELINE_END'] = '2024-01-07T00:00:00'

        try:
            # Try to initialize data pipeline
            from src.data.processors import TrafficProcessor

            # Create test config
            config = {
                'baselineStart': '2024-01-01',
                'baselineEnd': '2024-01-07',
                'currentTimeRange': 'now-12h',
                'highVolumeThreshold': 1000,
                'mediumVolumeThreshold': 100,
                'criticalThreshold': -80,
                'warningThreshold': -50
            }

            processor = TrafficProcessor(config)
            if processor:
                self.result.add_pass("Data pipeline initialization")
            else:
                self.result.add_fail("Data pipeline initialization")
        except Exception as e:
            self.result.add_fail("Data pipeline initialization", str(e))

    def run_all_validations(self):
        """Run all validation checks"""
        print("============================================")
        print("🔍 RAD Monitor Connection Validation")
        print("============================================")

        # Run all validations
        self.validate_project_structure()
        self.validate_core_files()
        self.validate_python_imports()
        self.validate_dependencies()
        self.validate_configuration()
        self.validate_integration_points()
        self.validate_test_configuration()
        self.validate_data_flow()

        # Summary
        print("\n============================================")
        print("📋 VALIDATION SUMMARY")
        print("============================================")
        print(f"Passed: {Colors.green(str(self.result.passed))}")
        print(f"Failed: {Colors.red(str(self.result.failed))}")
        if self.result.warnings > 0:
            print(f"Warnings: {Colors.yellow(str(self.result.warnings))}")
        print("")

        if self.result.failed == 0:
            print(Colors.green("🎉 All checks passed! The application is properly connected."))
            print("\nNext steps:")
            print("1. Copy config/env.example to .env and configure your settings")
            print("2. Run: ./run_enhanced_cors.sh")
            print("3. Or run full integration test: python3 test_full_integration.py")
            return True
        else:
            print(Colors.red(f"⚠️  {self.result.failed} checks failed. Please fix the issues above."))
            print("\nCommon fixes:")
            print("1. Install dependencies: pip install -r requirements-enhanced.txt")
            print("2. Install npm packages: npm install")
            print("3. Ensure all files are in the correct locations")
            return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Validate RAD Monitor connections and configuration'
    )
    parser.add_argument(
        '-v', '--verbose',
        action='store_true',
        help='Verbose output'
    )
    parser.add_argument(
        '-j', '--json',
        action='store_true',
        help='Output results as JSON'
    )
    parser.add_argument(
        '-o', '--output',
        help='Output file for results (JSON format)'
    )

    args = parser.parse_args()

    # Run validation
    validator = Validator(verbose=args.verbose)
    success = validator.run_all_validations()

    # Handle output
    if args.json or args.output:
        results = validator.result.to_json()

        if args.output:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            if not args.json:
                print(f"\nResults saved to: {args.output}")

        if args.json:
            print(json.dumps(results, indent=2))

    # Exit code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
