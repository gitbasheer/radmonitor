#!/usr/bin/env python3
"""
Demo script to enable multiple RAD types for testing
This temporarily enables all RAD types to demonstrate the multi-RAD functionality
"""

import json
import sys
from pathlib import Path

def enable_all_rad_types():
    """Enable all RAD types in settings.json for demo purposes"""
    config_file = Path("config/settings.json")

    # Read current settings
    with open(config_file, 'r') as f:
        settings = json.load(f)

    # Enable all RAD types
    if 'rad_types' in settings:
        for rad_key, rad_config in settings['rad_types'].items():
            old_status = rad_config.get('enabled', False)
            rad_config['enabled'] = True
            print(f"(✓) Enabled {rad_config['display_name']} (was: {old_status})")

    # Save updated settings
    with open(config_file, 'w') as f:
        json.dump(settings, f, indent=2)

    print("\n(✓)All RAD types enabled for testing!")
    print("\nTo test multi-RAD support:")
    print("1. Start the dashboard: npm run dev")
    print("2. Notice the RAD type filter buttons above the table")
    print("3. Click different RAD type buttons to filter results")
    print("4. Check the RAD Type column in the data table")
    print("\nNote: You'll only see data for RAD types that have actual traffic in Elasticsearch")

def reset_rad_types():
    """Reset RAD types to default state"""
    config_file = Path("config/settings.json")

    # Read current settings
    with open(config_file, 'r') as f:
        settings = json.load(f)

    # Reset to defaults (only venture_feed enabled)
    if 'rad_types' in settings:
        settings['rad_types']['venture_feed']['enabled'] = True
        settings['rad_types']['cart_recommendations']['enabled'] = False
        settings['rad_types']['product_recommendations']['enabled'] = False

    # Save updated settings
    with open(config_file, 'w') as f:
        json.dump(settings, f, indent=2)

    print("(✓)RAD types reset to defaults (only Venture Feed enabled)")

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--reset':
        reset_rad_types()
    else:
        enable_all_rad_types()
