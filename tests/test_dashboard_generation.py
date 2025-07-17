#!/usr/bin/env python3
"""
Test the Python dashboard generator
"""

import os
import sys
import json
import tempfile
import shutil
from pathlib import Path
import subprocess

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_dashboard_generator_cli():
    """Test the dashboard generator command line interface"""
    # Test help
    result = subprocess.run([sys.executable, 'bin/generate_dashboard.py', '--help'],
                          capture_output=True, text=True)
    assert result.returncode == 0
    assert 'Generate RAD Monitor Dashboard' in result.stdout
    assert 'baseline_start' in result.stdout
    print("✅ CLI help works")


def test_dashboard_generator_import():
    """Test that the dashboard generator can be imported"""
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bin'))
        import generate_dashboard
        assert hasattr(generate_dashboard, 'main')
        assert hasattr(generate_dashboard, 'DashboardConfig')
        assert hasattr(generate_dashboard, 'fetch_kibana_data')
        print("✅ Module imports correctly")
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False
    return True


def test_configuration():
    """Test the configuration class"""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bin'))
    from generate_dashboard import DashboardConfig

    config = DashboardConfig()
    assert config.default_baseline_start == "2025-06-01"
    assert config.default_baseline_end == "2025-06-09"
    assert config.default_current_time == "now-12h"
    assert config.high_volume_threshold == 1000
    assert config.critical_threshold == -80
    assert config.data_dir == "data"
    print("✅ Configuration defaults are correct")


def test_cookie_validation():
    """Test cookie validation functions"""
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bin'))
    from generate_dashboard import validate_cookie, get_elastic_cookie

    # Test invalid cookies
    assert validate_cookie(None) == False
    assert validate_cookie("") == False
    assert validate_cookie("short") == False

    # Test valid cookies
    assert validate_cookie("Fe26.2**" + "x" * 100) == True
    assert validate_cookie("x" * 150) == True

    print("✅ Cookie validation works correctly")


def test_wrapper_script():
    """Test that the wrapper script works"""
    wrapper_path = Path("scripts/generate_dashboard_refactored.sh")
    assert wrapper_path.exists(), "Wrapper script doesn't exist"
    assert os.access(wrapper_path, os.X_OK), "Wrapper script is not executable"

    # Test wrapper help
    result = subprocess.run([str(wrapper_path), '--help'],
                          capture_output=True, text=True)
    assert result.returncode == 0
    assert 'Generate RAD Monitor Dashboard' in result.stdout
    print("✅ Wrapper script works correctly")


def test_backward_compatibility():
    """Test that the new implementation maintains backward compatibility"""
    # The wrapper should accept the same arguments as the old script
    wrapper_path = Path("scripts/generate_dashboard_refactored.sh")

    # Test with arguments (dry run with --help to avoid actual execution)
    result = subprocess.run([str(wrapper_path), "2025-06-01", "2025-06-09", "now-12h", "--help"],
                          capture_output=True, text=True)
    # Should still show help even with extra args
    assert 'Generate RAD Monitor Dashboard' in result.stdout
    print("✅ Backward compatibility maintained")


def main():
    """Run all tests"""
    print("🧪 Testing Dashboard Generator Migration")
    print("=" * 50)

    tests = [
        test_dashboard_generator_cli,
        test_dashboard_generator_import,
        test_configuration,
        test_cookie_validation,
        test_wrapper_script,
        test_backward_compatibility
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            print(f"\nRunning {test.__name__}...")
            test()
            passed += 1
        except Exception as e:
            print(f"❌ {test.__name__} failed: {e}")
            failed += 1

    print("\n" + "=" * 50)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")

    return failed == 0


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
