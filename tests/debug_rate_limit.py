#!/usr/bin/env python3
"""
Debug script to check rate limiter configuration
"""
import httpx
import asyncio

async def check_rate_limiter():
    """Check if rate limiter is working by making rapid requests"""
    print("=== Rate Limiter Debug ===")
    
    endpoint = "http://localhost:8000/api/test-rate-limit"
    print(f"Testing endpoint: {endpoint}")
    print("Rate limit: 5 per minute")
    print("\nMaking 10 rapid requests...\n")
    
    async with httpx.AsyncClient() as client:
        for i in range(10):
            try:
                response = await client.get(endpoint)
                data = response.json()
                
                if response.status_code == 200:
                    print(f"Request {i+1}: ✓ Success")
                    print(f"  Client IP: {data.get('client_ip', 'unknown')}")
                    print(f"  Time: {data.get('timestamp', 'unknown')}")
                elif response.status_code == 429:
                    print(f"Request {i+1}: 🛑 RATE LIMITED!")
                    print(f"  Detail: {data.get('detail', 'No details')}")
                    # This is what we want to see!
                else:
                    print(f"Request {i+1}: Status {response.status_code}")
                    print(f"  Response: {data}")
                
            except Exception as e:
                print(f"Request {i+1}: Error - {e}")
            
            # No delay between requests to trigger rate limit
    
    print("\n" + "="*40)
    print("If you see 🛑 RATE LIMITED above, rate limiting is working!")
    print("If all requests succeeded, there might be an issue.")
    print("\nPossible fixes:")
    print("1. Restart the FastAPI server")
    print("2. Check Python version (3.8+ required)")
    print("3. Verify slowapi is installed: pip show slowapi")

if __name__ == "__main__":
    asyncio.run(check_rate_limiter()) 