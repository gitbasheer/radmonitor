#!/usr/bin/env python3
"""
Production-Ready RAD Monitor Connection Validation
Enhanced with security, performance, and comprehensive checks
"""

import os
import sys
import json
import subprocess
import asyncio
import importlib
import socket
import ssl
import time
import hashlib
import concurrent.futures
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime
import argparse
import structlog
import httpx
import psutil
from cryptography import x509
from cryptography.hazmat.backends import default_backend

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Get project root securely
PROJECT_ROOT = Path(__file__).parent.parent.resolve()

# Color codes for terminal output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    NC = '\033[0m'  # No Color

    @classmethod
    def green(cls, text: str) -> str:
        return f"{cls.GREEN}{text}{cls.NC}" if sys.stdout.isatty() else text

    @classmethod
    def red(cls, text: str) -> str:
        return f"{cls.RED}{text}{cls.NC}" if sys.stdout.isatty() else text

    @classmethod
    def yellow(cls, text: str) -> str:
        return f"{cls.YELLOW}{text}{cls.NC}" if sys.stdout.isatty() else text

    @classmethod
    def blue(cls, text: str) -> str:
        return f"{cls.BLUE}{text}{cls.NC}" if sys.stdout.isatty() else text


class ValidationResult:
    """Enhanced validation result tracking"""
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.security_issues = 0
        self.performance_issues = 0
        self.details: List[Dict[str, Any]] = []
        self.start_time = time.time()

    def add_pass(self, test_name: str, message: str = "", duration: float = 0):
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

    def add_fail(self, test_name: str, message: str = "", severity: str = "error"):
        self.failed += 1
        self.details.append({
            "test": test_name,
            "status": "failed",
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{Colors.red('(✗)')} {test_name}")
        if message:
            print(f"   {Colors.red(message)}")

    def add_warning(self, test_name: str, message: str = ""):
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

    def add_security_issue(self, test_name: str, message: str, severity: str = "high"):
        self.security_issues += 1
        self.details.append({
            "test": test_name,
            "status": "security_issue",
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{Colors.red('🔒')} SECURITY: {test_name}")
        print(f"   {Colors.red(message)}")

    def add_performance_issue(self, test_name: str, message: str):
        self.performance_issues += 1
        self.details.append({
            "test": test_name,
            "status": "performance_issue",
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{Colors.yellow('⚡')} PERFORMANCE: {test_name}")
        print(f"   {Colors.yellow(message)}")

    def to_json(self) -> Dict[str, Any]:
        """Export results as JSON"""
        return {
            "summary": {
                "passed": self.passed,
                "failed": self.failed,
                "warnings": self.warnings,
                "security_issues": self.security_issues,
                "performance_issues": self.performance_issues,
                "total": self.passed + self.failed,
                "success": self.failed == 0 and self.security_issues == 0,
                "duration": time.time() - self.start_time
            },
            "details": self.details,
            "timestamp": datetime.now().isoformat(),
            "environment": {
                "python_version": sys.version,
                "platform": sys.platform,
                "project_root": str(PROJECT_ROOT)
            }
        }


class Validator:
    """Production-ready validation logic"""

    def __init__(self, verbose: bool = False, parallel: bool = True):
        self.verbose = verbose
        self.parallel = parallel
        self.result = ValidationResult()
        self.executor = concurrent.futures.ThreadPoolExecutor(max_workers=10) if parallel else None

    def __del__(self):
        if self.executor:
            self.executor.shutdown(wait=False)

    def check_file(self, filepath: str, description: str, check_permissions: bool = True) -> bool:
        """Enhanced file check with security validation"""
        start_time = time.time()
        full_path = PROJECT_ROOT / filepath

        try:
            # Validate path to prevent directory traversal
            resolved_path = full_path.resolve()
            if not str(resolved_path).startswith(str(PROJECT_ROOT)):
                self.result.add_security_issue(
                    description,
                    f"Path traversal attempt detected: {filepath}"
                )
                return False

            if not resolved_path.is_file():
                self.result.add_fail(description, f"File not found: {filepath}")
                return False

            # Check file permissions
            if check_permissions:
                stat = resolved_path.stat()
                mode = oct(stat.st_mode)[-3:]

                # Check for world-writable files
                if mode[-1] in '2367':
                    self.result.add_security_issue(
                        description,
                        f"World-writable file detected: {filepath} (mode: {mode})"
                    )

                # Check for executable files that shouldn't be
                if not filepath.endswith(('.py', '.sh')) and os.access(resolved_path, os.X_OK):
                    self.result.add_warning(
                        description,
                        f"Unexpected executable file: {filepath}"
                    )

            # Check file size for potential issues
            size_mb = stat.st_size / (1024 * 1024)
            if size_mb > 100:
                self.result.add_performance_issue(
                    description,
                    f"Large file detected: {filepath} ({size_mb:.1f} MB)"
                )

            duration = time.time() - start_time
            self.result.add_pass(description, duration=duration)
            return True

        except Exception as e:
            self.result.add_fail(description, f"Error checking file: {e}")
            return False

    def check_dir(self, dirpath: str, description: str) -> bool:
        """Enhanced directory check"""
        full_path = PROJECT_ROOT / dirpath

        try:
            resolved_path = full_path.resolve()
            if not str(resolved_path).startswith(str(PROJECT_ROOT)):
                self.result.add_security_issue(
                    description,
                    f"Path traversal attempt detected: {dirpath}"
                )
                return False

            if not resolved_path.is_dir():
                self.result.add_fail(description, f"Directory not found: {dirpath}")
                return False

            # Check directory permissions
            stat = resolved_path.stat()
            mode = oct(stat.st_mode)[-3:]

            if mode[-1] in '2367':
                self.result.add_security_issue(
                    description,
                    f"World-writable directory: {dirpath} (mode: {mode})"
                )

            self.result.add_pass(description)
            return True

        except Exception as e:
            self.result.add_fail(description, f"Error checking directory: {e}")
            return False

    def check_python_import(self, import_statement: str, description: str) -> bool:
        """Secure Python import check"""
        try:
            # Sanitize import statement
            if any(char in import_statement for char in [';', '&', '|', '`', '$', '(', ')']):
                self.result.add_security_issue(
                    description,
                    "Potential code injection in import statement"
                )
                return False

            # Parse import safely
            if " import " in import_statement:
                module_path, names = import_statement.replace("from ", "").split(" import ")
                module = importlib.import_module(module_path)

                for name in names.split(","):
                    name = name.strip()
                    if not hasattr(module, name):
                        self.result.add_fail(description, f"Module {module_path} has no attribute {name}")
                        return False
            else:
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
        """Secure command existence check"""
        try:
            # Use shutil.which for secure command lookup
            import shutil
            if shutil.which(command):
                self.result.add_pass(description)
                return True
            else:
                self.result.add_fail(description, f"Command not found: {command}")
                return False
        except Exception as e:
            self.result.add_fail(description, f"Error checking command: {e}")
            return False

    def check_env_var(self, var_name: str, description: str, required: bool = True,
                     sensitive: bool = False) -> bool:
        """Enhanced environment variable check"""
        value = os.environ.get(var_name)

        if value:
            if sensitive:
                # Don't log sensitive values
                self.result.add_pass(description)

                # Check for common insecure patterns
                if value.lower() in ['password', 'secret', 'key', 'token', 'default']:
                    self.result.add_security_issue(
                        description,
                        f"Potentially insecure default value for {var_name}"
                    )
            else:
                self.result.add_pass(description)
            return True
        elif required:
            self.result.add_fail(description, f"Required environment variable not set: {var_name}")
            return False
        else:
            self.result.add_warning(description, f"Optional variable not set: {var_name}")
            return False

    async def check_network_connectivity(self, url: str, description: str,
                                       timeout: float = 5.0) -> bool:
        """Check network connectivity with timeout"""
        start_time = time.time()

        try:
            async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
                response = await client.get(url)
                duration = time.time() - start_time

                if response.status_code < 400:
                    self.result.add_pass(description,
                                       f"Response: {response.status_code} in {duration:.2f}s",
                                       duration=duration)

                    # Check for slow responses
                    if duration > 2.0:
                        self.result.add_performance_issue(
                            description,
                            f"Slow response time: {duration:.2f}s"
                        )
                    return True
                else:
                    self.result.add_fail(description,
                                       f"HTTP {response.status_code}",
                                       severity="warning")
                    return False

        except httpx.TimeoutException:
            self.result.add_fail(description, "Connection timeout", severity="warning")
            return False
        except Exception as e:
            self.result.add_fail(description, f"Connection error: {e}")
            return False

    def check_ssl_certificate(self, hostname: str, port: int = 443) -> bool:
        """Validate SSL certificate"""
        description = f"SSL certificate for {hostname}:{port}"

        try:
            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    # Get certificate
                    cert_der = ssock.getpeercert_binary()
                    cert = x509.load_der_x509_certificate(cert_der, default_backend())

                    # Check expiration
                    days_until_expiry = (cert.not_valid_after - datetime.now()).days

                    if days_until_expiry < 0:
                        self.result.add_security_issue(
                            description,
                            "Certificate has expired!",
                            severity="critical"
                        )
                        return False
                    elif days_until_expiry < 30:
                        self.result.add_warning(
                            description,
                            f"Certificate expires in {days_until_expiry} days"
                        )
                    else:
                        self.result.add_pass(
                            description,
                            f"Valid for {days_until_expiry} more days"
                        )

                    return True

        except Exception as e:
            self.result.add_fail(description, f"SSL verification failed: {e}")
            return False

    def check_port_availability(self, port: int, description: str) -> bool:
        """Check if a port is available or in use"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1)
                result = s.connect_ex(('localhost', port))

                if result == 0:
                    # Port is in use - check what's using it
                    for conn in psutil.net_connections():
                        if conn.laddr.port == port:
                            process = psutil.Process(conn.pid)
                            self.result.add_warning(
                                description,
                                f"Port {port} in use by {process.name()} (PID: {conn.pid})"
                            )
                            return False

                    self.result.add_warning(description, f"Port {port} is in use")
                    return False
                else:
                    self.result.add_pass(description, f"Port {port} is available")
                    return True

        except Exception as e:
            self.result.add_fail(description, f"Error checking port: {e}")
            return False

    def validate_json_file(self, filepath: str, schema: Optional[Dict] = None) -> bool:
        """Validate JSON file structure and content"""
        description = f"JSON validation: {filepath}"
        full_path = PROJECT_ROOT / filepath

        if not full_path.exists():
            self.result.add_fail(description, "File not found")
            return False

        try:
            with open(full_path, 'r') as f:
                data = json.load(f)

            # Basic validation passed
            self.result.add_pass(description, "Valid JSON structure")

            # Additional schema validation if provided
            if schema:
                # Implement JSON schema validation here
                pass

            return True

        except json.JSONDecodeError as e:
            self.result.add_fail(description, f"Invalid JSON: {e}")
            return False
        except Exception as e:
            self.result.add_fail(description, f"Error reading file: {e}")
            return False

    def check_disk_space(self, min_gb: float = 1.0) -> bool:
        """Check available disk space"""
        description = "Disk space check"

        try:
            usage = psutil.disk_usage(str(PROJECT_ROOT))
            free_gb = usage.free / (1024**3)
            used_percent = usage.percent

            if free_gb < min_gb:
                self.result.add_fail(
                    description,
                    f"Insufficient disk space: {free_gb:.1f} GB free ({used_percent}% used)"
                )
                return False
            elif used_percent > 90:
                self.result.add_warning(
                    description,
                    f"High disk usage: {used_percent}% used ({free_gb:.1f} GB free)"
                )
            else:
                self.result.add_pass(
                    description,
                    f"{free_gb:.1f} GB free ({used_percent}% used)"
                )

            return True

        except Exception as e:
            self.result.add_fail(description, f"Error checking disk space: {e}")
            return False

    def check_memory_usage(self) -> bool:
        """Check system memory usage"""
        description = "Memory usage check"

        try:
            memory = psutil.virtual_memory()

            if memory.percent > 90:
                self.result.add_performance_issue(
                    description,
                    f"High memory usage: {memory.percent}% ({memory.available / (1024**3):.1f} GB available)"
                )
                return False
            else:
                self.result.add_pass(
                    description,
                    f"{memory.percent}% used ({memory.available / (1024**3):.1f} GB available)"
                )
                return True

        except Exception as e:
            self.result.add_fail(description, f"Error checking memory: {e}")
            return False

    async def validate_all(self):
        """Run all validation checks"""
        print("=" * 60)
        print(f"{Colors.blue('🔍 RAD Monitor Production Validation')}")
        print("=" * 60)
        print(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
        print(f"Project Root: {PROJECT_ROOT}")
        print("=" * 60)

        # System checks
        print(f"\n{Colors.blue('💻 System Checks')}")
        print("-" * 40)
        self.check_disk_space()
        self.check_memory_usage()

        # Project structure
        print(f"\n{Colors.blue('🏗️  Project Structure')}")
        print("-" * 40)
        dirs = [
            ("assets", "Assets directory"),
            ("assets/js", "JavaScript assets"),
            ("assets/css", "CSS assets"),
            ("config", "Configuration directory"),
            ("bin", "Binary scripts"),
            ("tests", "Test directory"),
        ]
        for dirpath, desc in dirs:
            self.check_dir(dirpath, desc)

        # Core files
        print(f"\n{Colors.blue('📄 Core Files')}")
        print("-" * 40)
        files = [
            ("config/settings.json", "Settings configuration"),
            ("package.json", "Node.js configuration"),
            ("index.html", "Main HTML file"),
            ("bin/server.py", "FastAPI server"),
            ("bin/simple-server.py", "Simple HTTP server"),
        ]
        for filepath, desc in files:
            self.check_file(filepath, desc)

        # Configuration validation
        print(f"\n{Colors.blue('⚙️  Configuration')}")
        print("-" * 40)
        self.validate_json_file("config/settings.json")
        self.validate_json_file("package.json")

        # Security checks
        print(f"\n{Colors.blue('🔒 Security Checks')}")
        print("-" * 40)

        # Check for sensitive files
        sensitive_files = [".env", "config/secrets.json", "credentials.json"]
        for file in sensitive_files:
            if (PROJECT_ROOT / file).exists():
                self.check_file(file, f"Sensitive file: {file}", check_permissions=True)

        # Environment variables
        print(f"\n{Colors.blue('🌍 Environment Variables')}")
        print("-" * 40)
        self.check_env_var("ELASTICSEARCH_URL", "Elasticsearch URL", required=False)
        self.check_env_var("KIBANA_URL", "Kibana URL", required=False)
        self.check_env_var("API_TOKENS", "API tokens", required=False, sensitive=True)
        self.check_env_var("SECRET_KEY", "Secret key", required=False, sensitive=True)

        # Dependencies
        print(f"\n{Colors.blue('📦 Dependencies')}")
        print("-" * 40)

        # Python packages
        packages = [
            ("fastapi", "FastAPI"),
            ("pydantic", "Pydantic"),
            ("uvicorn", "Uvicorn"),
            ("httpx", "HTTPX"),
            ("structlog", "Structlog"),
        ]
        for package, desc in packages:
            self.check_python_import(f"import {package}", f"{desc} installed")

        # Network connectivity (if enabled)
        if os.getenv("VALIDATE_NETWORK", "false").lower() == "true":
            print(f"\n{Colors.blue('🌐 Network Connectivity')}")
            print("-" * 40)

            # Test endpoints
            endpoints = [
                ("http://localhost:8000/health/live", "Local server health"),
            ]

            # Run async checks
            loop = asyncio.get_event_loop()
            tasks = [self.check_network_connectivity(url, desc) for url, desc in endpoints]
            loop.run_until_complete(asyncio.gather(*tasks))

        # Port availability
        print(f"\n{Colors.blue('🚪 Port Availability')}")
        print("-" * 40)
        ports = [
            (8000, "Default server port"),
            (3000, "Development server port"),
        ]
        for port, desc in ports:
            self.check_port_availability(port, desc)

        # Performance checks
        print(f"\n{Colors.blue('⚡ Performance Checks')}")
        print("-" * 40)

        # Check for large files
        for root, dirs, files in os.walk(PROJECT_ROOT):
            # Skip node_modules and other large directories
            dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', '.pytest_cache']]

            for file in files:
                filepath = Path(root) / file
                if filepath.stat().st_size > 10 * 1024 * 1024:  # 10MB
                    self.result.add_performance_issue(
                        "Large file detected",
                        f"{filepath.relative_to(PROJECT_ROOT)} ({filepath.stat().st_size / (1024*1024):.1f} MB)"
                    )

        # Summary
        print("\n" + "=" * 60)
        print(f"{Colors.blue('📋 VALIDATION SUMMARY')}")
        print("=" * 60)

        result = self.result.to_json()
        summary = result['summary']

        print(f"Duration: {summary['duration']:.2f} seconds")
        print(f"Passed: {Colors.green(str(summary['passed']))}")
        print(f"Failed: {Colors.red(str(summary['failed']))}")
        print(f"Warnings: {Colors.yellow(str(summary['warnings']))}")
        print(f"Security Issues: {Colors.red(str(summary['security_issues']))}")
        print(f"Performance Issues: {Colors.yellow(str(summary['performance_issues']))}")

        if summary['success']:
            print(f"\n{Colors.green('(✓)All critical checks passed!')}")
        else:
            print(f"\n{Colors.red('(✗) Validation failed - please fix the issues above')}")

        return summary['success']


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Production-ready RAD Monitor validation'
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
    parser.add_argument(
        '--no-parallel',
        action='store_true',
        help='Disable parallel execution'
    )
    parser.add_argument(
        '--network',
        action='store_true',
        help='Enable network connectivity tests'
    )

    args = parser.parse_args()

    # Set network validation flag
    if args.network:
        os.environ['VALIDATE_NETWORK'] = 'true'

    # Create validator
    validator = Validator(verbose=args.verbose, parallel=not args.no_parallel)

    # Run validation
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    try:
        success = loop.run_until_complete(validator.validate_all())
    finally:
        loop.close()

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

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
