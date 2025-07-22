#!/usr/bin/env python3
"""
Health check script for RAD Monitor
Quick verification that all services are running correctly
"""

import sys
import requests
import json
from datetime import datetime

def check_service(name, url, expected_status=200):
    """Check if a service is responding"""
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == expected_status:
            return True, f"(✓){name}: OK"
        else:
            return False, f"(✗) {name}: Status {response.status_code}"
    except requests.exceptions.ConnectionError:
        return False, f"(✗) {name}: Not running"
    except Exception as e:
        return False, f"(✗) {name}: Error - {str(e)}"

def check_api_health(base_url):
    """Check API health endpoints"""
    results = []

    # Check main health endpoint
    success, message = check_service("Health Endpoint", f"{base_url}/health")
    results.append((success, message))

    if success:
        try:
            response = requests.get(f"{base_url}/health")
            data = response.json()
            if 'elasticsearch_status' in data:
                es_status = data['elasticsearch_status']
                if es_status == 'connected':
                    results.append((True, "(✓)Elasticsearch: Connected"))
                else:
                    results.append((False, f"⚠️  Elasticsearch: {es_status}"))
        except:
            pass

    # Check configuration health
    success, message = check_service("Config Health", f"{base_url}/api/config/health")
    results.append((success, message))

    if success:
        try:
            response = requests.get(f"{base_url}/api/config/health")
            data = response.json()
            status = data.get('status', 'unknown')
            if status == 'healthy':
                results.append((True, "(✓)Configuration: Healthy"))
            else:
                results.append((False, f"⚠️  Configuration: {status}"))
                if 'warnings' in data:
                    for warning in data['warnings']:
                        results.append((False, f"   - {warning}"))
        except:
            pass

    return results

def main():
    """Run health checks"""
    print("🏥 RAD Monitor Health Check")
    print("=" * 40)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # Check services
    dashboard_url = "http://localhost:8888"
    proxy_url = "http://localhost:8889"

    all_results = []

    # Check dashboard
    success, message = check_service("Dashboard", dashboard_url)
    all_results.append((success, message))
    print(message)

    # Check proxy
    success, message = check_service("CORS Proxy", proxy_url + "/health")
    all_results.append((success, message))
    print(message)

    # Detailed API checks
    if success:
        print("\n Detailed API Checks:")
        api_results = check_api_health(proxy_url)
        all_results.extend(api_results)
        for _, message in api_results:
            print(message)

    # Summary
    print("\n" + "=" * 40)
    total = len(all_results)
    passed = sum(1 for success, _ in all_results if success)

    if passed == total:
        print(f"(✓)All {total} checks passed!")
        print("🎉 RAD Monitor is healthy")
        return 0
    else:
        print(f"⚠️  {passed}/{total} checks passed")
        print("Please check the failed items above")
        return 1

if __name__ == '__main__':
    sys.exit(main())
