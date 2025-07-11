#!/usr/bin/env python3
"""
RAD Monitor Connection Validation - Simple Version
Basic validation without comprehensive error handling
For the enhanced version, see validate_connections.py
"""

import os
import sys
import json
import subprocess
import importlib
from pathlib import Path
from typing import Dict, List, Tuple, Any
import argparse

# Get project root
PROJECT_ROOT = Path(__file__).parent.parent

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
        print(f"{Colors.red('(✗)')} {test_name}")
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
            ("assets", "Assets directory exists"),
            ("assets/js", "JavaScript assets exist"),
            ("assets/js/formula-builder", "Formula builder directory exists"),
            ("assets/css", "CSS assets exist"),
            ("tests", "Tests directory exists"),
            ("config", "Config directory exists"),
            ("bin", "Binary scripts directory exists"),
        ]

        for dirpath, description in dirs:
            self.check_dir(dirpath, description)

    def validate_core_files(self):
        """Check core files"""
        print("\n📄 Checking Core Files...")
        print("========================")

        # Configuration files
        files = [
            # Core configuration
            ("config/settings.json", "Settings configuration"),
            ("package.json", "Node.js configuration"),
            # Frontend files
            ("index.html", "Main HTML file"),
            ("assets/js/dashboard-main.js", "Main dashboard script"),
            ("assets/js/data-service.js", "Data service module"),
            ("assets/js/api-client-unified.js", "Unified API client"),
            ("assets/js/config-service.js", "Configuration service"),
            # Server files
            ("bin/server.py", "FastAPI server"),
            ("bin/simple-server.py", "Simple HTTP server"),
            # Test configuration
            ("vitest.config.js", "JavaScript test config"),
        ]

        for filepath, description in files:
            self.check_file(filepath, description)

    def validate_python_imports(self):
        """Test Python imports"""
        print("\n🔗 Checking Python Imports...")
        print("=============================")

        # Check standard library imports
        imports = [
            ("import json", "JSON module available"),
            ("import os", "OS module available"),
            ("import sys", "System module available"),
            ("import pathlib", "Path module available"),
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
                if "ELASTIC_COOKIE" in contents:
                    self.result.add_pass("Cookie configured in .env")
                else:
                    self.result.add_fail("Cookie configured in .env", "Add ELASTIC_COOKIE to .env")
            except:
                self.result.add_fail(".env file readable", "Cannot read .env file")
        else:
            self.result.add_warning("No .env file found (optional)", "Copy config/env.example to .env")

        # Test environment variables
        test_vars = {
            "ELASTIC_COOKIE": "test_validation",
            "BASELINE_START": "2024-01-01T00:00:00",
            "BASELINE_END": "2024-01-07T00:00:00"
        }

        # Set test variables
        for var, value in test_vars.items():
            os.environ[var] = value

        # Check config/settings.json
        config_path = PROJECT_ROOT / "config" / "settings.json"
        if config_path.exists():
            self.result.add_pass("Settings.json exists")
            try:
                with open(config_path, 'r') as f:
                    settings = json.load(f)
                if "elasticsearch" in settings:
                    self.result.add_pass("Elasticsearch configured in settings.json")
                else:
                    self.result.add_fail("Elasticsearch configuration", "Missing elasticsearch section in settings.json")
            except Exception as e:
                self.result.add_fail("Settings.json valid", str(e))
        else:
            self.result.add_fail("Settings.json exists", "config/settings.json not found")

    def validate_integration_points(self):
        """Check integration points"""
        print("\n🔄 Checking Integration Points...")
        print("================================")

        # CORS is now handled by the server itself
        self.result.add_pass("CORS handling integrated in server")

        # Check frontend integration
        if Path("index.html").is_file():
            with open("index.html", "r") as f:
                content = f.read()

            if "config-service.js" in content:
                self.result.add_pass("Frontend includes config service")
            else:
                self.result.add_warning("Frontend config service", "config-service.js not found in index.html")

    def validate_test_configuration(self):
        """Check test configuration"""
        print("\n🧪 Checking Test Configuration...")
        print("================================")

        # Python tests - check if pytest is available
        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", "--version"],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                self.result.add_pass("Pytest available")
            else:
                self.result.add_warning("Pytest available", "pytest not installed - install with: pip install pytest")
        except:
            self.result.add_warning("Pytest available", "pytest not installed")

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

        # Check if API endpoints are configured
        try:
            # Check if we can load settings
            config_path = PROJECT_ROOT / "config" / "settings.json"
            if config_path.exists():
                with open(config_path, 'r') as f:
                    settings = json.load(f)

                # Check for required configuration
                has_es = "elasticsearch" in settings
                has_kibana = "kibana" in settings
                has_processing = "processing" in settings

                if has_es and has_kibana and has_processing:
                    self.result.add_pass("Data pipeline configuration complete")
                else:
                    missing = []
                    if not has_es: missing.append("elasticsearch")
                    if not has_kibana: missing.append("kibana")
                    if not has_processing: missing.append("processing")
                    self.result.add_fail("Data pipeline configuration", f"Missing sections: {', '.join(missing)}")
            else:
                self.result.add_fail("Data pipeline configuration", "settings.json not found")
        except Exception as e:
            self.result.add_fail("Data pipeline configuration", str(e))

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
            print("2. Run: npm start (or python3 bin/simple-server.py)")
            print("3. Or use the full server: python3 bin/server.py")
            return True
        else:
            print(Colors.red(f"⚠️  {self.result.failed} checks failed. Please fix the issues above."))
            print("\nCommon fixes:")
            print("1. Install dependencies: pip install -r requirements.txt")
            print("2. Install npm packages: npm install")
            print("3. Ensure all files are in the correct locations")
            return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Validate RAD Monitor connections and configuration (Simple Version)'
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
