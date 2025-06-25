#!/usr/bin/env python3
"""
Test rate limiting after fixes
"""
import asyncio
import httpx

async def test_endpoint(endpoint, limit, requests_to_make):
    """Test a specific endpoint's rate limiting"""
    print(f"\n🧪 Testing {endpoint} (limit: {limit}/min)...")
    
    success_count = 0
    rate_limited_count = 0
    errors = []
    
    async with httpx.AsyncClient() as client:
        for i in range(requests_to_make):
            try:
                response = await client.get(f"http://localhost:8000{endpoint}")
                
                if response.status_code == 200:
                    success_count += 1
                    if i < 10:  # Only print first 10 to avoid clutter
                        print(f"   Request {i+1}: ✓ Success")
                elif response.status_code == 429:
                    rate_limited_count += 1
                    detail = response.json().get("detail", "")
                    print(f"   Request {i+1}: 🛑 Rate Limited - {detail}")
                else:
                    print(f"   Request {i+1}: ⚠️  Status {response.status_code}")
                    errors.append(f"Request {i+1}: {response.status_code}")
                    
            except Exception as e:
                print(f"   Request {i+1}: ❌ Error - {e}")
                errors.append(f"Request {i+1}: {str(e)}")
    
    print(f"\n   Results for {endpoint}:")
    print(f"   ✓ Successful: {success_count}")
    print(f"   🛑 Rate limited: {rate_limited_count}")
    
    if rate_limited_count > 0:
        print(f"   ✅ Rate limiting is working!")
    else:
        print(f"   ⚠️  Rate limiting might not be working")
    
    return success_count, rate_limited_count, errors

async def main():
    print("=== Rate Limiting Test Suite ===")
    print("Testing multiple endpoints with different rate limits...")
    
    # Check if server is running
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:8000/health")
            if response.status_code != 200:
                print("❌ Server is not healthy!")
                return
    except:
        print("❌ FastAPI server is not running!")
        print("   Start it with: python3 bin/dev_server_fastapi.py")
        return
    
    # Test different endpoints
    await test_endpoint("/api/test-rate-limit", "5", 8)  # Should block after 5
    await asyncio.sleep(1)  # Brief pause between tests
    
    await test_endpoint("/api/config", "30", 35)  # Should block after 30
    await asyncio.sleep(1)
    
    await test_endpoint("/api/stats", "60", 65)  # Should block after 60
    
    print("\n✅ Rate limiting test complete!")
    print("\nNote: If rate limiting still isn't working, try:")
    print("1. Restart the FastAPI server")
    print("2. Check that all dependencies are installed: pip install -r requirements-enhanced.txt")
    print("3. Make sure you're using Python 3.8+")

if __name__ == "__main__":
    asyncio.run(main()) 