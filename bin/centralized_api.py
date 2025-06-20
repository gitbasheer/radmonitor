#!/usr/bin/env python3
"""
Centralized FastAPI API for RAD Monitor
Combines CORS proxy, utilities, and typed endpoints
"""

import os
import sys
import json
import asyncio
import httpx
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathlib import Path

from fastapi import FastAPI, Request, Response, HTTPException, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
import uvicorn

# Add local imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import our utilities
from cleanup_ports import cleanup_port, find_process_by_port
from validate_connections import Validator

# Import existing modules
from src.api.config_api import router as config_router
from src.data.models import ProcessingConfig, TrafficEvent


# Pydantic Models for API
class PortCleanupRequest(BaseModel):
    """Request model for port cleanup"""
    ports: List[int] = Field(default=[8889, 8000], description="Ports to clean up")
    force: bool = Field(default=False, description="Force kill processes")


class PortCleanupResponse(BaseModel):
    """Response model for port cleanup"""
    success: bool
    ports_cleaned: Dict[int, bool]
    processes_killed: int
    message: str


class ProcessInfo(BaseModel):
    """Information about a process using a port"""
    pid: int
    name: str
    port: int


class PortStatusResponse(BaseModel):
    """Response model for port status check"""
    port: int
    in_use: bool
    processes: List[ProcessInfo]


class ValidationRequest(BaseModel):
    """Request model for validation"""
    verbose: bool = Field(default=False, description="Verbose output")
    categories: Optional[List[str]] = Field(
        default=None,
        description="Specific categories to validate"
    )


class ValidationResponse(BaseModel):
    """Response model for validation results"""
    success: bool
    passed: int
    failed: int
    warnings: int
    details: List[Dict[str, Any]]
    recommendations: Optional[List[str]] = None


class ElasticsearchQuery(BaseModel):
    """Elasticsearch query model"""
    query: Dict[str, Any]
    size: Optional[int] = 0
    aggs: Optional[Dict[str, Any]] = None

    @field_validator('aggs')
    def validate_aggregations(cls, v):
        if v and 'events' not in v:
            raise ValueError("Query must include 'events' aggregation")
        return v


class TrafficSearchParams(BaseModel):
    """Parameters for traffic search"""
    time_range: str = Field(default="now-12h", description="Time range for search")
    event_pattern: str = Field(default="pandc.vnext.*", description="Event pattern to search")
    min_volume: Optional[int] = Field(default=None, description="Minimum volume threshold")
    include_zero_traffic: bool = Field(default=False, description="Include events with zero traffic")


class TrafficResponse(BaseModel):
    """Response model for traffic data"""
    events: List[TrafficEvent]
    total: int
    query_time_ms: int
    cached: bool = False
    cache_key: Optional[str] = None


# Initialize FastAPI app
app = FastAPI(
    title="RAD Monitor Centralized API",
    description="Centralized API combining CORS proxy, utilities, and typed endpoints",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include config router
app.include_router(config_router, prefix="/api/config", tags=["Configuration"])

# Global HTTP client
http_client = httpx.AsyncClient(timeout=30.0, verify=False)

# Cache for queries
query_cache: Dict[str, Tuple[Any, datetime]] = {}
CACHE_TTL = timedelta(minutes=5)


# Utility Endpoints
@app.post("/api/utils/cleanup-ports", response_model=PortCleanupResponse)
async def cleanup_ports_endpoint(request: PortCleanupRequest):
    """Clean up processes using specified ports"""
    try:
        ports_cleaned = {}
        total_killed = 0

        for port in request.ports:
            killed = cleanup_port(port, force=request.force)
            ports_cleaned[port] = killed > 0
            total_killed += killed

        # Verify all ports are free
        all_clear = all(not find_process_by_port(port) for port in request.ports)

        return PortCleanupResponse(
            success=all_clear,
            ports_cleaned=ports_cleaned,
            processes_killed=total_killed,
            message=f"Cleaned {total_killed} processes from {len(request.ports)} ports"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/utils/port-status/{port}", response_model=PortStatusResponse)
async def check_port_status(port: int):
    """Check if a port is in use and by which processes"""
    try:
        processes = find_process_by_port(port)

        return PortStatusResponse(
            port=port,
            in_use=len(processes) > 0,
            processes=[
                ProcessInfo(pid=pid, name=name, port=port)
                for pid, name in processes
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/utils/validate", response_model=ValidationResponse)
async def validate_connections(request: ValidationRequest):
    """Validate project connections and configuration"""
    try:
        validator = Validator(verbose=request.verbose)

        # Run specific categories or all
        if request.categories:
            # Run only requested categories
            for category in request.categories:
                method_name = f"validate_{category}"
                if hasattr(validator, method_name):
                    getattr(validator, method_name)()
        else:
            # Run all validations
            validator.validate_project_structure()
            validator.validate_core_files()
            validator.validate_python_imports()
            validator.validate_dependencies()
            validator.validate_configuration()
            validator.validate_integration_points()
            validator.validate_test_configuration()
            validator.validate_data_flow()

        # Get results
        results = validator.result.to_json()

        # Add recommendations
        recommendations = []
        if results['failed'] > 0:
            recommendations.extend([
                "Install dependencies: pip install -r requirements-enhanced.txt",
                "Install npm packages: npm install",
                "Ensure all files are in the correct locations"
            ])

        return ValidationResponse(
            success=results['success'],
            passed=results['passed'],
            failed=results['failed'],
            warnings=validator.result.warnings,
            details=results['details'],
            recommendations=recommendations if recommendations else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# CORS Proxy Endpoints (maintaining existing functionality)
@app.post("/api/proxy")
@app.post("/kibana-proxy")  # Backward compatibility
async def cors_proxy(
    request: Request,
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Raw CORS proxy for Kibana/Elasticsearch (maintains existing functionality)"""
    try:
        # Get request body
        body = await request.body()

        # Use cookie from header or environment
        cookie = x_elastic_cookie or os.environ.get('ES_COOKIE', '')
        if not cookie:
            raise HTTPException(status_code=401, detail="No authentication cookie provided")

        # Forward to Kibana
        kibana_url = os.environ.get(
            'KIBANA_URL',
            'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243'
        )

        proxy_url = f"{kibana_url}/api/console/proxy?path=%2Ftraffic-*%2F_search&method=POST"

        headers = {
            "Content-Type": "application/json",
            "kbn-xsrf": "true",
            "Cookie": f"sid={cookie}"
        }

        response = await http_client.post(
            proxy_url,
            content=body,
            headers=headers
        )

        return Response(
            content=response.content,
            status_code=response.status_code,
            headers={
                "Content-Type": response.headers.get("Content-Type", "application/json"),
                "Access-Control-Allow-Origin": "*"
            }
        )

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Kibana timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Typed FastAPI Endpoints
@app.post("/api/search/traffic", response_model=TrafficResponse)
async def search_traffic(
    params: TrafficSearchParams,
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie"),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Search for traffic data with typed parameters and response"""
    try:
        start_time = datetime.now()

        # Build Elasticsearch query
        query = ElasticsearchQuery(
            query={
                "bool": {
                    "filter": [
                        {
                            "wildcard": {
                                "detail.event.data.traffic.eid.keyword": {
                                    "value": params.event_pattern
                                }
                            }
                        },
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": params.time_range
                                }
                            }
                        }
                    ]
                }
            },
            aggs={
                "events": {
                    "terms": {
                        "field": "detail.event.data.traffic.eid.keyword",
                        "size": 500,
                        "order": {"_count": "desc"}
                    },
                    "aggs": {
                        "traffic_over_time": {
                            "date_histogram": {
                                "field": "@timestamp",
                                "fixed_interval": "1h"
                            }
                        }
                    }
                }
            }
        )

        # Check cache
        cache_key = json.dumps(query.model_dump(), sort_keys=True)
        if cache_key in query_cache:
            cached_result, cache_time = query_cache[cache_key]
            if datetime.now() - cache_time < CACHE_TTL:
                query_time = int((datetime.now() - start_time).total_seconds() * 1000)
                return TrafficResponse(
                    events=cached_result['events'],
                    total=cached_result['total'],
                    query_time_ms=query_time,
                    cached=True,
                    cache_key=cache_key[:16]
                )

        # Forward query using proxy
        cookie = x_elastic_cookie or os.environ.get('ES_COOKIE', '')
        if not cookie:
            raise HTTPException(status_code=401, detail="No authentication cookie provided")

        # Execute query
        kibana_url = os.environ.get(
            'KIBANA_URL',
            'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243'
        )

        proxy_url = f"{kibana_url}/api/console/proxy?path=%2Ftraffic-*%2F_search&method=POST"

        headers = {
            "Content-Type": "application/json",
            "kbn-xsrf": "true",
            "Cookie": f"sid={cookie}"
        }

        response = await http_client.post(
            proxy_url,
            json=query.model_dump(),
            headers=headers
        )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Elasticsearch query failed: {response.text}"
            )

        # Process response
        data = response.json()
        events = []

        if 'aggregations' in data and 'events' in data['aggregations']:
            for bucket in data['aggregations']['events']['buckets']:
                # Process each event
                event_id = bucket['key']
                doc_count = bucket['doc_count']

                # Apply volume filter
                if params.min_volume and doc_count < params.min_volume:
                    if not params.include_zero_traffic:
                        continue

                # Create TrafficEvent (simplified)
                events.append(TrafficEvent(
                    event_id=event_id,
                    display_name=event_id.replace('pandc.vnext.', ''),
                    current=doc_count,
                    baseline_12h=doc_count,  # Would need separate query
                    baseline_period=doc_count,
                    daily_avg=doc_count / 24,
                    baseline_count=doc_count,
                    baseline_days=7,
                    current_hours=12,
                    score=0,  # Would need calculation
                    status='NORMAL'
                ))

        # Cache result
        result = {
            'events': events,
            'total': len(events)
        }
        query_cache[cache_key] = (result, datetime.now())

        # Clean old cache entries in background
        background_tasks.add_task(clean_cache)

        query_time = int((datetime.now() - start_time).total_seconds() * 1000)

        return TrafficResponse(
            events=events,
            total=len(events),
            query_time_ms=query_time,
            cached=False,
            cache_key=cache_key[:16]
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def clean_cache():
    """Clean expired cache entries"""
    now = datetime.now()
    expired_keys = [
        key for key, (_, cache_time) in query_cache.items()
        if now - cache_time > CACHE_TTL
    ]
    for key in expired_keys:
        del query_cache[key]


# Health and Status Endpoints
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "services": {
            "cors_proxy": True,
            "utilities": True,
            "typed_endpoints": True
        }
    }


@app.get("/api/status")
async def system_status():
    """Get system status including port usage"""
    ports_to_check = [8889, 8000, 8888]
    port_status = {}

    for port in ports_to_check:
        processes = find_process_by_port(port)
        port_status[port] = {
            "in_use": len(processes) > 0,
            "processes": [{"pid": pid, "name": name} for pid, name in processes]
        }

    return {
        "timestamp": datetime.now().isoformat(),
        "ports": port_status,
        "cache_size": len(query_cache),
        "environment": {
            "has_cookie": bool(os.environ.get('ES_COOKIE')),
            "kibana_url": os.environ.get('KIBANA_URL', 'default')
        }
    }


@app.on_event("startup")
async def startup_event():
    """Initialize app on startup"""
    print("🚀 RAD Monitor Centralized API starting...")
    print("📚 API docs available at: http://localhost:8889/docs")
    print("🔌 CORS proxy maintained at: /api/proxy and /kibana-proxy")
    print("🛠️  Utilities available at: /api/utils/*")
    print("📊 Typed endpoints at: /api/search/*")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await http_client.aclose()


if __name__ == "__main__":
    # Run with uvicorn
    port = int(os.environ.get("PORT", 8889))
    uvicorn.run(
        "centralized_api:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
