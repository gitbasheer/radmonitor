#!/usr/bin/env python3
"""
Environment Variable Validator for RAD Monitor

Validates all required environment variables at startup to prevent
runtime failures due to missing or misconfigured settings.
"""
import os
import sys
import re
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from urllib.parse import urlparse


class ValidationLevel(Enum):
    """Validation severity levels"""
    REQUIRED = "required"
    RECOMMENDED = "recommended"
    OPTIONAL = "optional"


@dataclass
class EnvVar:
    """Environment variable definition"""
    name: str
    description: str
    level: ValidationLevel
    default: Optional[str] = None
    validator: Optional[Callable[[str], bool]] = None
    transformer: Optional[Callable[[str], Any]] = None
    example: Optional[str] = None
    sensitive: bool = False  # Whether to mask in logs


class EnvValidationError(Exception):
    """Raised when environment validation fails"""
    pass


class EnvironmentValidator:
    """Validates environment variables at startup"""

    def __init__(self, environment: Optional[str] = None):
        self.environment = environment or os.getenv("ENVIRONMENT", "development")
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.validated_vars: Dict[str, Any] = {}

    # =================
    # Validators
    # =================

    @staticmethod
    def validate_url(value: str) -> bool:
        """Validate URL format"""
        try:
            result = urlparse(value)
            return all([result.scheme in ['http', 'https'], result.netloc])
        except:
            return False

    @staticmethod
    def validate_port(value: str) -> bool:
        """Validate port number"""
        try:
            port = int(value)
            return 1 <= port <= 65535
        except:
            return False

    @staticmethod
    def validate_boolean(value: str) -> bool:
        """Validate boolean string"""
        return value.lower() in ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off']

    @staticmethod
    def validate_date(value: str) -> bool:
        """Validate ISO date format"""
        try:
            datetime.fromisoformat(value.replace('Z', '+00:00'))
            return True
        except:
            return False

    @staticmethod
    def validate_csv(value: str) -> bool:
        """Validate comma-separated values"""
        return bool(value and not value.startswith(',') and not value.endswith(','))

    @staticmethod
    def validate_regex(pattern: str):
        """Create a regex validator"""
        def validator(value: str) -> bool:
            try:
                return bool(re.match(pattern, value))
            except:
                return False
        return validator

    # =================
    # Transformers
    # =================

    @staticmethod
    def to_boolean(value: str) -> bool:
        """Convert string to boolean"""
        return value.lower() in ['true', '1', 'yes', 'on']

    @staticmethod
    def to_int(value: str) -> int:
        """Convert string to integer"""
        return int(value)

    @staticmethod
    def to_list(value: str) -> List[str]:
        """Convert CSV string to list"""
        return [item.strip() for item in value.split(',') if item.strip()]

    # =================
    # Variable Definitions
    # =================

    def get_variable_definitions(self) -> List[EnvVar]:
        """Define all environment variables and their validation rules"""

        variables = [
            # === Core Configuration ===
            EnvVar(
                name="ENVIRONMENT",
                description="Application environment (development/production)",
                level=ValidationLevel.RECOMMENDED,
                default="development",
                validator=self.validate_regex(r'^(development|production|test|staging)$'),
                example="production"
            ),

            # === Server Configuration ===
            EnvVar(
                name="SERVER_PORT",
                description="Port for the FastAPI server",
                level=ValidationLevel.OPTIONAL,
                default="8000",
                validator=self.validate_port,
                transformer=self.to_int,
                example="8000"
            ),
            EnvVar(
                name="SERVER_HOST",
                description="Host address for the server",
                level=ValidationLevel.OPTIONAL,
                default="0.0.0.0",
                example="0.0.0.0"
            ),
            EnvVar(
                name="WORKERS",
                description="Number of worker processes",
                level=ValidationLevel.OPTIONAL,
                default="4",
                validator=lambda v: v.isdigit() and int(v) > 0,
                transformer=self.to_int,
                example="4"
            ),

            # === Security Configuration ===
            EnvVar(
                name="SECRET_KEY",
                description="Secret key for JWT/session management",
                level=ValidationLevel.REQUIRED if self.environment == "production" else ValidationLevel.RECOMMENDED,
                validator=lambda v: len(v) >= 32,
                sensitive=True,
                example="your-very-long-secret-key-here-minimum-32-chars"
            ),
            EnvVar(
                name="API_TOKENS",
                description="Comma-separated list of valid API tokens",
                level=ValidationLevel.REQUIRED if self.environment == "production" else ValidationLevel.OPTIONAL,
                validator=self.validate_csv,
                transformer=self.to_list,
                sensitive=True,
                example="token1,token2,token3"
            ),
            EnvVar(
                name="ALLOWED_ORIGINS",
                description="CORS allowed origins (comma-separated)",
                level=ValidationLevel.REQUIRED if self.environment == "production" else ValidationLevel.RECOMMENDED,
                default="http://localhost:3000,http://localhost:8000",
                validator=self.validate_csv,
                transformer=self.to_list,
                example="https://app.example.com,https://www.example.com"
            ),
            EnvVar(
                name="ALLOWED_HOSTS",
                description="Allowed host headers (comma-separated)",
                level=ValidationLevel.RECOMMENDED,
                default="localhost,127.0.0.1",
                validator=self.validate_csv,
                transformer=self.to_list,
                example="example.com,www.example.com"
            ),

            # === Elasticsearch Configuration ===
            EnvVar(
                name="ELASTICSEARCH_URL",
                description="Elasticsearch endpoint URL",
                level=ValidationLevel.REQUIRED,
                validator=self.validate_url,
                example="https://your-es-instance.aws.found.io:9243"
            ),
            EnvVar(
                name="ELASTIC_COOKIE",
                description="Authentication cookie for Elasticsearch",
                level=ValidationLevel.OPTIONAL,  # Changed to optional to check with ES_COOKIE
                sensitive=True,
                example="sid=Fe26.2**your-cookie-here**"
            ),
            EnvVar(
                name="ES_COOKIE",
                description="Alternative name for Elasticsearch cookie",
                level=ValidationLevel.OPTIONAL,
                sensitive=True,
                example="sid=Fe26.2**your-cookie-here**"
            ),

            # === Kibana Configuration ===
            EnvVar(
                name="KIBANA_URL",
                description="Kibana endpoint URL",
                level=ValidationLevel.REQUIRED,
                validator=self.validate_url,
                example="https://your-kibana-instance.aws.found.io:9243"
            ),

            # === Dashboard Configuration ===
            EnvVar(
                name="BASELINE_START",
                description="Baseline period start date (ISO format)",
                level=ValidationLevel.REQUIRED,
                validator=self.validate_date,
                example="2024-01-01T00:00:00"
            ),
            EnvVar(
                name="BASELINE_END",
                description="Baseline period end date (ISO format)",
                level=ValidationLevel.REQUIRED,
                validator=self.validate_date,
                example="2024-01-07T00:00:00"
            ),
            EnvVar(
                name="CURRENT_TIME_RANGE",
                description="Current period time range",
                level=ValidationLevel.OPTIONAL,
                default="now-12h",
                validator=self.validate_regex(r'^(now-\d+[hdwM]|last_\d+_days|inspection_time)$'),
                example="now-24h"
            ),

            # === Thresholds ===
            EnvVar(
                name="HIGH_VOLUME_THRESHOLD",
                description="High volume event threshold",
                level=ValidationLevel.OPTIONAL,
                default="1000",
                validator=lambda v: v.isdigit() and int(v) > 0,
                transformer=self.to_int,
                example="1000"
            ),
            EnvVar(
                name="MEDIUM_VOLUME_THRESHOLD",
                description="Medium volume event threshold",
                level=ValidationLevel.OPTIONAL,
                default="100",
                validator=lambda v: v.isdigit() and int(v) > 0,
                transformer=self.to_int,
                example="100"
            ),
            EnvVar(
                name="CRITICAL_THRESHOLD",
                description="Critical score threshold (negative value)",
                level=ValidationLevel.OPTIONAL,
                default="-80",
                validator=lambda v: v.lstrip('-').isdigit() and int(v) <= 0,
                transformer=self.to_int,
                example="-80"
            ),
            EnvVar(
                name="WARNING_THRESHOLD",
                description="Warning score threshold (negative value)",
                level=ValidationLevel.OPTIONAL,
                default="-50",
                validator=lambda v: v.lstrip('-').isdigit() and int(v) <= 0,
                transformer=self.to_int,
                example="-50"
            ),

            # === Optional Features ===
            EnvVar(
                name="REDIS_URL",
                description="Redis URL for caching",
                level=ValidationLevel.OPTIONAL,
                default="redis://localhost:6379",
                validator=self.validate_url,
                example="redis://localhost:6379/0"
            ),
            EnvVar(
                name="LOG_LEVEL",
                description="Logging level",
                level=ValidationLevel.OPTIONAL,
                default="INFO",
                validator=self.validate_regex(r'^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$'),
                example="INFO"
            ),
            EnvVar(
                name="DISABLE_AUTH",
                description="Disable authentication (development only)",
                level=ValidationLevel.OPTIONAL,
                default="false",
                validator=self.validate_boolean,
                transformer=self.to_boolean,
                example="false"
            ),
            EnvVar(
                name="ENABLE_DOCS",
                description="Enable API documentation endpoints",
                level=ValidationLevel.OPTIONAL,
                default="false",
                validator=self.validate_boolean,
                transformer=self.to_boolean,
                example="true"
            ),
            EnvVar(
                name="VERIFY_SSL",
                description="Verify SSL certificates",
                level=ValidationLevel.OPTIONAL,
                default="true",
                validator=self.validate_boolean,
                transformer=self.to_boolean,
                example="true"
            ),
            EnvVar(
                name="ACCESS_TOKEN_EXPIRE_MINUTES",
                description="JWT token expiration time in minutes",
                level=ValidationLevel.OPTIONAL,
                default="30",
                validator=lambda v: v.isdigit() and int(v) > 0,
                transformer=self.to_int,
                example="30"
            ),
        ]

        return variables

        def validate(self) -> Dict[str, Any]:
        """Validate all environment variables"""
        print(f"\n{'='*60}")
        print(f"RAD Monitor Environment Validation")
        print(f"Environment: {self.environment}")
        print(f"{'='*60}\n")

        variables = self.get_variable_definitions()

        for var in variables:
            self._validate_variable(var)

        # Special validation: Ensure at least one cookie is provided
        if not self.validated_vars.get("ELASTIC_COOKIE") and not self.validated_vars.get("ES_COOKIE"):
            self.errors.append(
                "Authentication cookie missing: Either ELASTIC_COOKIE or ES_COOKIE must be set"
                "\n    Example: ELASTIC_COOKIE=sid=Fe26.2**your-cookie-here**"
            )
        else:
            # If ES_COOKIE is set but not ELASTIC_COOKIE, copy it over for compatibility
            if self.validated_vars.get("ES_COOKIE") and not self.validated_vars.get("ELASTIC_COOKIE"):
                self.validated_vars["ELASTIC_COOKIE"] = self.validated_vars["ES_COOKIE"]

        # Print summary
        self._print_summary()

        # Fail if there are errors
        if self.errors:
            raise EnvValidationError(
                f"Environment validation failed with {len(self.errors)} error(s):\n" +
                "\n".join(f"  - {error}" for error in self.errors)
            )

        return self.validated_vars

    def _validate_variable(self, var: EnvVar):
        """Validate a single environment variable"""
        value = os.getenv(var.name, var.default)

        # Check if required variable is missing
        if var.level == ValidationLevel.REQUIRED and not value:
            self.errors.append(
                f"{var.name}: Required variable is not set. {var.description}"
                f"\n    Example: {var.name}={var.example}"
            )
            return

        # Check if recommended variable is missing
        if var.level == ValidationLevel.RECOMMENDED and not value:
            self.warnings.append(
                f"{var.name}: Recommended variable is not set. {var.description}"
                f"\n    Example: {var.name}={var.example}"
            )
            if var.default:
                value = var.default
            else:
                return

        # Skip optional variables that aren't set
        if not value:
            return

        # Validate the value
        if var.validator and not var.validator(value):
            self.errors.append(
                f"{var.name}: Invalid value '{self._mask_value(value, var.sensitive)}'. {var.description}"
                f"\n    Example: {var.name}={var.example}"
            )
            return

        # Transform the value if needed
        if var.transformer:
            try:
                value = var.transformer(value)
            except Exception as e:
                self.errors.append(
                    f"{var.name}: Failed to transform value: {str(e)}"
                )
                return

        # Store the validated value
        self.validated_vars[var.name] = value

    def _mask_value(self, value: str, sensitive: bool) -> str:
        """Mask sensitive values in output"""
        if not sensitive or len(value) <= 8:
            return value
        return f"{value[:4]}...{value[-4:]}"

    def _print_summary(self):
        """Print validation summary"""
        total_vars = len(self.validated_vars)

        print(f"Validated {total_vars} environment variable(s)")

        if self.warnings:
            print(f"\n⚠️  Warnings ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  - {warning}")

        if self.errors:
            print(f"\n❌ Errors ({len(self.errors)}):")
            for error in self.errors:
                print(f"  - {error}")
        else:
            print("\n✅ All required environment variables are valid")

        print(f"\n{'='*60}\n")


def validate_environment(environment: Optional[str] = None) -> Dict[str, Any]:
    """
    Validate environment variables and return validated values.
    Raises EnvValidationError if validation fails.
    """
    validator = EnvironmentValidator(environment)
    return validator.validate()


if __name__ == "__main__":
    # Run validation when called directly
    try:
        validated = validate_environment()
        print("Environment validation successful!")
        sys.exit(0)
    except EnvValidationError as e:
        print(f"\n{e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"\nUnexpected error during validation: {e}", file=sys.stderr)
        sys.exit(2)
