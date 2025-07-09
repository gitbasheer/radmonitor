#!/usr/bin/env python3
"""
Test the metrics tracking endpoint
"""
import asyncio
import httpx
import json
from datetime import datetime

async def test_metrics():
    """Test the metrics endpoint functionality"""
    print("=== Metrics Endpoint Test ===\n")

    base_url = "http://localhost:8000"

    async with httpx.AsyncClient() as client:
        # 1. Reset metrics
        print("1. Resetting metrics...")
        response = await client.post(f"{base_url}/api/metrics/reset")
        if response.status_code == 200:
            print("   (✓) Metrics reset successfully")
        else:
            print(f"   (✗)Failed to reset metrics: {response.status_code}")

        # 2. Make some test requests
        print("\n2. Making test requests...")
        endpoints = [
            ("/api/config", 5),
            ("/api/stats", 3),
            ("/api/test-rate-limit", 10),  # Should trigger rate limit
        ]

        for endpoint, count in endpoints:
            print(f"   - {endpoint}: {count} requests")
            for i in range(count):
                try:
                    response = await client.get(f"{base_url}{endpoint}")
                    if response.status_code == 429:
                        print(f"     Rate limited on request {i+1}")
                except Exception as e:
                    print(f"     Error on request {i+1}: {e}")
            await asyncio.sleep(0.1)  # Small delay between endpoint tests

        # 3. Trigger an error
        print("\n3. Triggering an error...")
        try:
            response = await client.get(f"{base_url}/api/nonexistent")
            print(f"   Error endpoint returned: {response.status_code}")
        except:
            pass

        # 4. Get metrics
        print("\n4. Fetching metrics...")
        response = await client.get(f"{base_url}/api/metrics")

        if response.status_code == 200:
            metrics = response.json()

            print("\n=== Metrics Summary ===")
            print(f"Mode: {metrics['mode']}")
            print(f"Window Duration: {metrics['window_duration_seconds']:.1f}s")
            print(f"Total Requests: {metrics['total_requests']}")
            print(f"Success Rate: {metrics['success_rate']:.1f}%")
            print(f"Avg Response Time: {metrics['response_time_ms']:.1f}ms")
            print(f"Total Errors: {metrics['errors']}")
            print(f"Rate Limit Triggers: {metrics['rate_limit_triggers']}")
            print(f"Circuit Breaker Trips: {metrics['circuit_breaker_trips']}")

            print("\n=== Endpoint Breakdown ===")
            for endpoint, stats in metrics['endpoints'].items():
                print(f"\n{endpoint}:")
                print(f"  Requests: {stats['requests']}")
                print(f"  Errors: {stats['errors']}")
                print(f"  Success Rate: {stats['success_rate']:.1f}%")
                print(f"  Avg Response: {stats['avg_response_time_ms']:.1f}ms")

            # Pretty print full metrics
            print("\n=== Full Metrics JSON ===")
            print(json.dumps(metrics, indent=2))

        else:
            print(f"   (✗)Failed to get metrics: {response.status_code}")

async def continuous_monitoring(duration_seconds=30):
    """Monitor metrics continuously for a period"""
    print(f"\n=== Continuous Monitoring ({duration_seconds}s) ===")

    base_url = "http://localhost:8000"
    start_time = datetime.now()

    while (datetime.now() - start_time).total_seconds() < duration_seconds:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{base_url}/api/metrics")

            if response.status_code == 200:
                metrics = response.json()
                elapsed = (datetime.now() - start_time).total_seconds()

                print(f"\n[{elapsed:.1f}s] Requests: {metrics['total_requests']} | "
                      f"Success: {metrics['success_rate']:.1f}% | "
                      f"Avg RT: {metrics['response_time_ms']:.1f}ms | "
                      f"Errors: {metrics['errors']} | "
                      f"Rate Limits: {metrics['rate_limit_triggers']}")

        await asyncio.sleep(5)  # Check every 5 seconds

if __name__ == "__main__":
    print("Testing metrics endpoint...")
    print("Make sure FastAPI server is running!")
    print()

    # Run basic test
    asyncio.run(test_metrics())

    # Uncomment to run continuous monitoring
    # print("\nStarting continuous monitoring...")
    # asyncio.run(continuous_monitoring(duration_seconds=60))
