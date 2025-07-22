import os
import json
from src.config.config import config

# Colors for output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
NC = '\033[0m' # No Color

def check_value(file_path, key, expected_value, description):
    """Checks a value in a JSON file."""
    try:
        with open(file_path, "r") as f:
            data = json.load(f)
        actual_value = data.get(key)
        if actual_value == expected_value:
            print(f"{GREEN}✓{NC} {description} in {file_path}")
            return True
        else:
            print(f"{RED}✗{NC} {description} in {file_path}")
            print(f"  Expected: {expected_value}")
            print(f"  Found: {actual_value}")
            return False
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"{RED}✗{NC} Error reading {file_path}: {e}")
        return False

def verify_configuration():
    """Verifies the consistency of configuration across multiple files."""
    print("🔍 Verifying RAD Monitor Configuration...")
    errors = 0

    # Expected values
    expected_proxy_url = "https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
    expected_kibana_url = config.KIBANA_URL
    expected_index_pattern = config.KIBANA_INDEX_PATTERN

    print("\nChecking proxy URL configuration...")
    if not check_value("config/production.json", "proxy_url", expected_proxy_url, "Proxy URL"):
        errors += 1
    if not check_value("config/settings.json", "proxy_url", expected_proxy_url, "Proxy URL"):
        errors += 1
    if not check_value("config/api-endpoints.json", "proxy_url", expected_proxy_url, "Proxy URL"):
        errors += 1

    print("\nChecking index pattern configuration...")
    if not check_value("config/production.json", "index_pattern", expected_index_pattern, "Index pattern"):
        errors += 1
    if not check_value("config/settings.json", "index_pattern", expected_index_pattern, "Index pattern"):
        errors += 1

    print("\nChecking for obsolete configurations...")
    # This check can be enhanced to be more robust in Python

    print("\nChecking critical files exist...")
    critical_files = [
        "proxy-service/netlify/functions/proxy.js",
        "config/production.json",
        "config/settings.json",
        "config/api-endpoints.json",
        "assets/js/api-client-unified.js",
        "assets/js/config-service.js",
    ]

    for file in critical_files:
        if os.path.exists(file):
            print(f"{GREEN}✓{NC} {file} exists")
        else:
            print(f"{RED}✗{NC} {file} is missing!")
            errors += 1

    print("")
    if errors == 0:
        print(f"{GREEN}✅ All configurations are consistent!{NC}")
        return True
    else:
        print(f"{RED}❌ Found {errors} configuration issues{NC}")
        return False

if __name__ == "__main__":
    if not verify_configuration():
        exit(1)
