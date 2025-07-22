#!/usr/bin/env python3
"""
Test script for environment validation

This script demonstrates how the environment validator works.
Try running it with different environment variable configurations.
"""
import os
import sys

# Add the parent directory to the path to import env_validator
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from env_validator import validate_environment, EnvValidationError

# Example configurations to test
test_scenarios = [
    {
        "name": "Missing required variables",
        "env_vars": {
            "ENVIRONMENT": "production",
            # Missing ELASTICSEARCH_URL, KIBANA_URL, etc.
        }
    },
    {
        "name": "Invalid URL format",
        "env_vars": {
            "ENVIRONMENT": "development",
            "ELASTICSEARCH_URL": "not-a-valid-url",
            "KIBANA_URL": "https://valid-url.com",
            "ELASTIC_COOKIE": "test-cookie",
            "BASELINE_START": "2024-01-01T00:00:00",
            "BASELINE_END": "2024-01-07T00:00:00"
        }
    },
    {
        "name": "Valid development configuration",
        "env_vars": {
            "ENVIRONMENT": "development",
            "ELASTICSEARCH_URL": "https://elasticsearch.example.com:9243",
            "KIBANA_URL": "https://kibana.example.com:9243",
            "ELASTIC_COOKIE": "sid=Fe26.2**test-cookie**",
            "BASELINE_START": "2024-01-01T00:00:00",
            "BASELINE_END": "2024-01-07T00:00:00",
            "LOG_LEVEL": "DEBUG",
            "DISABLE_AUTH": "true"
        }
    },
    {
        "name": "Production without security",
        "env_vars": {
            "ENVIRONMENT": "production",
            "ELASTICSEARCH_URL": "https://elasticsearch.example.com:9243",
            "KIBANA_URL": "https://kibana.example.com:9243",
            "ELASTIC_COOKIE": "sid=Fe26.2**test-cookie**",
            "BASELINE_START": "2024-01-01T00:00:00",
            "BASELINE_END": "2024-01-07T00:00:00",
            # Missing SECRET_KEY and API_TOKENS which are required in production
        }
    },
    {
        "name": "Valid production configuration",
        "env_vars": {
            "ENVIRONMENT": "production",
            "ELASTICSEARCH_URL": "https://elasticsearch.example.com:9243",
            "KIBANA_URL": "https://kibana.example.com:9243",
            "ELASTIC_COOKIE": "sid=Fe26.2**production-cookie**",
            "BASELINE_START": "2024-01-01T00:00:00",
            "BASELINE_END": "2024-01-07T00:00:00",
            "SECRET_KEY": "this-is-a-very-long-secret-key-minimum-32-chars",
            "API_TOKENS": "token1,token2,token3",
            "ALLOWED_ORIGINS": "https://app.example.com,https://www.example.com",
            "LOG_LEVEL": "INFO",
            "DISABLE_AUTH": "false"
        }
    }
]

def test_scenario(scenario):
    """Test a single scenario"""
    print(f"\n{'='*60}")
    print(f"Testing: {scenario['name']}")
    print(f"{'='*60}")

    # Save current environment
    original_env = dict(os.environ)

    try:
        # Clear environment and set test variables
        os.environ.clear()
        os.environ.update(scenario['env_vars'])

        # Run validation
        validated = validate_environment()
        print(f"\n✅ Validation passed!")
        print(f"Validated {len(validated)} variables")

        # Show some validated values (mask sensitive ones)
        print("\nSample validated values:")
        for key in ["ENVIRONMENT", "SERVER_PORT", "LOG_LEVEL", "DISABLE_AUTH"]:
            if key in validated:
                print(f"  {key}: {validated[key]}")

    except EnvValidationError as e:
        print(f"\n❌ Validation failed (as expected):")
        print(f"{e}")
    except Exception as e:
        print(f"\n⚠️  Unexpected error: {e}")
    finally:
        # Restore original environment
        os.environ.clear()
        os.environ.update(original_env)

def main():
    """Run all test scenarios"""
    print("RAD Monitor Environment Validation Test Suite")
    print("=" * 60)

    for scenario in test_scenarios:
        test_scenario(scenario)
        input("\nPress Enter to continue to next scenario...")

    print("\n" + "="*60)
    print("Test suite completed!")

if __name__ == "__main__":
    main()
