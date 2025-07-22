#!/usr/bin/env python3
"""
Test script for Formula Builder Backend Integration
Tests all formula-related endpoints
"""
import asyncio
import httpx
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_V1 = f"{BASE_URL}/api/v1"

# Test data
TEST_FORMULAS = [
    {
        "name": "Simple Count",
        "formula": "count()",
        "expected": True
    },
    {
        "name": "Average Response Time",
        "formula": "average(response_time)",
        "expected": True
    },
    {
        "name": "Traffic Drop Detection",
        "formula": "((count() - count(shift='1d')) / count(shift='1d')) * -100",
        "expected": True
    },
    {
        "name": "Invalid Formula",
        "formula": "invalid(((",
        "expected": False
    }
]

TEST_NL_QUERIES = [
    {
        "query": "show me the average response time",
        "expected_formula": "average(response_time)"
    },
    {
        "query": "count all events",
        "expected_formula": "count()"
    },
    {
        "query": "detect traffic drop",
        "expected_contains": "count(shift='1d')"
    }
]

async def test_formula_validation():
    """Test formula validation endpoint"""
    print("\n🧪 Testing Formula Validation...")
    
    async with httpx.AsyncClient() as client:
        for test in TEST_FORMULAS:
            try:
                response = await client.post(
                    f"{API_V1}/formulas/validate",
                    json={"formula": test["formula"]}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result["valid"] == test["expected"]:
                        print(f"  ✅ {test['name']}: Validation correct")
                    else:
                        print(f"  ❌ {test['name']}: Expected valid={test['expected']}, got {result['valid']}")
                else:
                    print(f"  ❌ {test['name']}: HTTP {response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ {test['name']}: Error - {str(e)}")

async def test_formula_execution():
    """Test formula execution endpoint"""
    print("\n🧪 Testing Formula Execution...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_V1}/formulas/execute",
                json={
                    "formula": "count()",
                    "time_range": "now-1h"
                },
                headers={"X-Elastic-Cookie": "test-cookie"}
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    print(f"  ✅ Formula execution successful")
                    print(f"     Result: {result.get('result', {}).get('value')}")
                    print(f"     Query time: {result.get('metadata', {}).get('execution_time')}s")
                else:
                    print(f"  ❌ Formula execution failed")
            else:
                print(f"  ❌ Formula execution: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Formula execution: Error - {str(e)}")

async def test_natural_language():
    """Test natural language to formula conversion"""
    print("\n🧪 Testing Natural Language Conversion...")
    
    async with httpx.AsyncClient() as client:
        for test in TEST_NL_QUERIES:
            try:
                response = await client.post(
                    f"{API_V1}/formulas/natural-language",
                    json={"query": test["query"]}
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if result.get("success"):
                        formula = result.get("formula", "")
                        if "expected_formula" in test:
                            if formula == test["expected_formula"]:
                                print(f"  ✅ '{test['query']}' → {formula}")
                            else:
                                print(f"  ⚠️  '{test['query']}' → {formula} (expected: {test['expected_formula']})")
                        elif "expected_contains" in test:
                            if test["expected_contains"] in formula:
                                print(f"  ✅ '{test['query']}' → {formula}")
                            else:
                                print(f"  ⚠️  '{test['query']}' → {formula} (should contain: {test['expected_contains']})")
                    else:
                        print(f"  ❌ '{test['query']}': Conversion failed")
                else:
                    print(f"  ❌ '{test['query']}': HTTP {response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ '{test['query']}': Error - {str(e)}")

async def test_formula_functions():
    """Test formula functions listing"""
    print("\n🧪 Testing Formula Functions Endpoint...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_V1}/formulas/functions")
            
            if response.status_code == 200:
                result = response.json()
                functions = result.get("functions", [])
                categories = result.get("categories", [])
                
                print(f"  ✅ Functions endpoint working")
                print(f"     Available functions: {len(functions)}")
                print(f"     Categories: {', '.join(categories)}")
                
                # Show a few function examples
                for func in functions[:3]:
                    print(f"     - {func['name']}: {func['description']}")
            else:
                print(f"  ❌ Functions endpoint: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Functions endpoint: Error - {str(e)}")

async def test_websocket_formula_updates():
    """Test WebSocket updates for formula results"""
    print("\n🧪 Testing WebSocket Formula Updates...")
    
    try:
        import websockets
        
        async with websockets.connect(f"ws://localhost:8000/ws") as websocket:
            # Send subscription message
            await websocket.send(json.dumps({
                "type": "subscribe",
                "channel": "formula_results"
            }))
            
            # Wait for response
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "subscribed":
                print(f"  ✅ WebSocket subscription successful")
                print(f"     Channel: {data.get('channel')}")
            else:
                print(f"  ⚠️  Unexpected response: {data}")
                
    except ImportError:
        print(f"  ⚠️  WebSocket test skipped (install websockets: pip install websockets)")
    except Exception as e:
        print(f"  ❌ WebSocket test: Error - {str(e)}")

async def main():
    """Run all tests"""
    print("=" * 60)
    print("Formula Builder Backend Integration Tests")
    print("=" * 60)
    print(f"Testing server at: {BASE_URL}")
    print(f"Started at: {datetime.now().isoformat()}")
    
    # Check if server is running
    print("\n🧪 Checking Server Health...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                health = response.json()
                print(f"  ✅ Server is healthy")
                print(f"     Status: {health.get('status')}")
                print(f"     Environment: {health.get('environment')}")
            else:
                print(f"  ❌ Server health check failed: HTTP {response.status_code}")
                return
    except Exception as e:
        print(f"  ❌ Cannot connect to server: {str(e)}")
        print(f"\nMake sure the server is running:")
        print(f"  python bin/server_enhanced.py")
        return
    
    # Run all tests
    await test_formula_validation()
    await test_formula_execution()
    await test_natural_language()
    await test_formula_functions()
    await test_websocket_formula_updates()
    
    print("\n" + "=" * 60)
    print("Tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())