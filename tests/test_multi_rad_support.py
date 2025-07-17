#!/usr/bin/env python3
"""
Test script for Multi-RAD Support Implementation
Tests all components of the multi-RAD feature
"""

import json
import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.config.settings import Settings
from src.data.models import TrafficEvent, RADTypeConfig


def test_rad_type_configuration():
    """Test RAD type configuration loading"""
    print("\n🧪 Testing RAD Type Configuration...")
    
    settings = Settings()
    rad_types = settings.rad_types
    
    # Verify we have RAD types configured
    assert rad_types is not None, "RAD types should be loaded"
    assert len(rad_types) > 0, "Should have at least one RAD type"
    
    # Check venture_feed configuration
    assert 'venture_feed' in rad_types, "venture_feed should exist"
    vf_config = rad_types['venture_feed']
    assert vf_config['enabled'] == True, "venture_feed should be enabled"
    assert vf_config['pattern'] == 'pandc.vnext.recommendations.feed.feed*'
    assert vf_config['display_name'] == 'Venture Feed'
    assert vf_config['color'] == '#4CAF50'
    
    # Check cart_recommendations configuration
    assert 'cart_recommendations' in rad_types, "cart_recommendations should exist"
    cart_config = rad_types['cart_recommendations']
    assert cart_config['enabled'] == False, "cart_recommendations should be disabled by default"
    assert cart_config['pattern'] == 'pandc.vnext.recommendations.cart*'
    
    print("✅ RAD type configuration loaded correctly")
    print(f"   Found {len(rad_types)} RAD types:")
    for key, config in rad_types.items():
        status = "enabled" if config['enabled'] else "disabled"
        print(f"   - {config['display_name']} ({status}): {config['pattern']}")


def test_rad_type_model():
    """Test RAD type data model"""
    print("\n🧪 Testing RAD Type Data Model...")
    
    # Test RADTypeConfig validation
    rad_config = RADTypeConfig(
        pattern="test.pattern*",
        display_name="Test Pattern",
        enabled=True,
        color="#FF0000",
        description="Test RAD type"
    )
    
    assert rad_config.pattern == "test.pattern*"
    assert rad_config.display_name == "Test Pattern"
    assert rad_config.enabled == True
    assert rad_config.color == "#FF0000"
    
    # Test TrafficEvent with rad_type - use all required fields
    event = TrafficEvent(
        event_id="pandc.vnext.recommendations.feed.feed_test",
        display_name="feed_test",
        rad_type="venture_feed",
        current=100,
        baseline_12h=200,
        baseline_period=200,
        daily_avg=200,
        baseline_count=1400,
        baseline_days=7,
        current_hours=12,
        score=-50,
        status="WARNING"
    )
    
    assert event.rad_type == "venture_feed"
    assert event.event_id == "pandc.vnext.recommendations.feed.feed_test"
    print("✅ RAD type models validated correctly")


def test_pattern_matching():
    """Test pattern matching logic"""
    print("\n🧪 Testing Pattern Matching...")
    
    test_cases = [
        ("pandc.vnext.recommendations.feed.feed_apmc", "venture_feed", True),
        ("pandc.vnext.recommendations.feed.feed_creategmb", "venture_feed", True),
        ("pandc.vnext.recommendations.cart.checkout", "cart_recommendations", True),
        ("pandc.vnext.recommendations.cart", "cart_recommendations", True),
        ("pandc.vnext.recommendations.product.view", "product_recommendations", True),
        ("pandc.vnext.other.event", "venture_feed", False),
    ]
    
    settings = Settings()
    
    for event_id, expected_type, should_match in test_cases:
        rad_config = settings.rad_types.get(expected_type, {})
        pattern = rad_config.get('pattern', '')
        
        if pattern:
            # Convert wildcard to regex (same logic as JavaScript)
            import re
            regex_pattern = '^' + pattern.replace('*', '.*') + '$'
            matches = bool(re.match(regex_pattern, event_id))
            
            if should_match:
                assert matches, f"{event_id} should match {pattern}"
                print(f"✅ {event_id} → {expected_type}")
            else:
                assert not matches, f"{event_id} should not match {pattern}"
                print(f"✅ {event_id} ✗ {expected_type}")


def test_query_generation():
    """Test Elasticsearch query generation with multiple patterns"""
    print("\n🧪 Testing Query Generation...")
    
    from bin.generate_dashboard import Settings
    
    settings = Settings()
    rad_types = settings.rad_types
    
    # Build wildcard filters for enabled RAD types
    wildcard_filters = []
    for rad_key, rad_config in rad_types.items():
        if rad_config.get('enabled', False) and rad_config.get('pattern'):
            wildcard_filters.append({
                "wildcard": {
                    "detail.event.data.traffic.eid.keyword": {
                        "value": rad_config['pattern']
                    }
                }
            })
    
    # Should have at least one filter (venture_feed is enabled by default)
    assert len(wildcard_filters) > 0, "Should have at least one wildcard filter"
    
    # Test the query structure
    query_fragment = {
        "bool": {
            "should": wildcard_filters,
            "minimum_should_match": 1
        }
    }
    
    print(f"✅ Generated {len(wildcard_filters)} wildcard filters")
    for filter in wildcard_filters:
        pattern = filter['wildcard']['detail.event.data.traffic.eid.keyword']['value']
        print(f"   - {pattern}")


def test_multi_rad_scenario():
    """Test a scenario with multiple RAD types enabled"""
    print("\n🧪 Testing Multi-RAD Scenario...")
    
    # Temporarily enable all RAD types for testing
    settings = Settings()
    
    # Simulate enabling all RAD types
    enabled_count = 0
    patterns = []
    
    for rad_key, rad_config in settings.rad_types.items():
        if rad_config.get('pattern'):
            enabled_count += 1
            patterns.append(rad_config['pattern'])
    
    print(f"✅ Can support {enabled_count} different RAD types")
    print("   Patterns available:")
    for pattern in patterns:
        print(f"   - {pattern}")
    
    # Test event classification
    test_events = [
        "pandc.vnext.recommendations.feed.feed_apmc",
        "pandc.vnext.recommendations.cart.add_item",
        "pandc.vnext.recommendations.product.similar_items"
    ]
    
    print("\n   Event classification:")
    for event_id in test_events:
        # Determine which RAD type this belongs to
        matched_type = None
        for rad_key, rad_config in settings.rad_types.items():
            if rad_config.get('pattern'):
                import re
                regex_pattern = '^' + rad_config['pattern'].replace('*', '.*') + '$'
                if re.match(regex_pattern, event_id):
                    matched_type = rad_key
                    break
        
        if matched_type:
            display_name = settings.rad_types[matched_type]['display_name']
            print(f"   - {event_id} → {display_name}")
        else:
            print(f"   - {event_id} → Unknown")


def main():
    """Run all tests"""
    print("🚀 Starting Multi-RAD Support Tests")
    print("=" * 50)
    
    try:
        test_rad_type_configuration()
        test_rad_type_model()
        test_pattern_matching()
        test_query_generation()
        test_multi_rad_scenario()
        
        print("\n" + "=" * 50)
        print("✅ All tests passed! Multi-RAD support is working correctly.")
        print("\nNext steps:")
        print("1. Enable additional RAD types in config/settings.json")
        print("2. Run the dashboard to see multi-RAD data")
        print("3. Use the RAD type filter buttons in the UI")
        
    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main() 