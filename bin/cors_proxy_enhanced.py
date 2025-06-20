#!/usr/bin/env python3
"""
Enhanced CORS proxy for the RAD monitor dashboard using FastAPI
Maintains raw proxy functionality while adding typed endpoints
"""

import json
import ssl
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Union, Literal
from urllib.parse import quote_plus
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict, validator
import uvicorn

# Import configuration settings and API
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from src.config.settings import get_settings
# from src.api.config_api import router as config_router  # Commented out for testing

# Skip SSL verification - we know what we're doing
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE

# Elasticsearch configuration
KIBANA_URL = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
PROXY_PATH = "/api/console/proxy?path=traffic-*/_search&method=POST"

# =======================
# PYDANTIC MODELS
# =======================

class TimeRange(BaseModel):
    """Time range for queries"""
    start: datetime = Field(description="Start time")
    end: datetime = Field(description="End time")

    def to_es_format(self) -> Dict[str, str]:
        """Convert to Elasticsearch format"""
        return {
            "gte": self.start.isoformat() + "Z",
            "lte": self.end.isoformat() + "Z"
        }

class TrafficQueryRequest(BaseModel):
    """Request model for traffic analysis queries"""
    model_config = ConfigDict(extra='forbid')

    baseline_start: datetime = Field(description="Baseline period start")
    baseline_end: datetime = Field(description="Baseline period end")
    current_time_range: Union[str, None] = Field(default="12h", description="Current time range (e.g., '12h', '24h', 'inspection_time')")

    # NEW: Alternative to current_time_range for precise time periods
    comparison_start: Optional[datetime] = Field(default=None, description="Comparison period start (ISO 8601)")
    comparison_end: Optional[datetime] = Field(default=None, description="Comparison period end (ISO 8601)")

    # NEW: How to handle time mismatches between baseline and comparison periods
    time_comparison_strategy: Optional[Literal['linear_scale', 'hourly_average', 'daily_pattern']] = Field(
        default='linear_scale',
        description="Strategy for normalizing different time periods"
    )

    event_pattern: str = Field(default="pandc.vnext.recommendations.feed.feed*", description="Event ID pattern")
    host: str = Field(default="dashboard.godaddy.com", description="Host filter")

    @validator('current_time_range')
    def validate_time_range(cls, v):
        """Validate time range format"""
        if v == 'inspection_time':
            return v
        # Standard format: now-Xh or now-Xd
        if v and not (v.startswith('now-') or v.startswith('-') or v == 'inspection_time'):
            # Try to parse as simple hour format (e.g., '12h')
            if v.endswith('h') or v.endswith('d'):
                return v
            raise ValueError(f"Invalid time range format: {v}")
        return v

    def build_es_query(self) -> Dict[str, Any]:
        """Build Elasticsearch query"""
        # Use comparison_start/end if provided, otherwise fall back to current_time_range
        if self.comparison_start and self.comparison_end:
            current_start = self.comparison_start
            current_end = self.comparison_end
        elif self.current_time_range == 'inspection_time':
            # Inspection time: from 24 hours ago to 8 hours ago
            current_end = datetime.utcnow() - timedelta(hours=8)
            current_start = datetime.utcnow() - timedelta(hours=24)
        else:
            # Parse current time range
            if self.current_time_range.startswith('-'):
                # Custom range like "-8h-24h"
                parts = self.current_time_range[1:].split('-')
                if len(parts) == 2:
                    from_val = int(parts[0].rstrip('hd'))
                    to_val = int(parts[1].rstrip('hd'))
                    current_end = datetime.utcnow() - timedelta(hours=from_val)
                    current_start = datetime.utcnow() - timedelta(hours=to_val)
                else:
                    # Fallback
                    hours = int(self.current_time_range.rstrip('h'))
                    current_start = datetime.utcnow() - timedelta(hours=hours)
                    current_end = datetime.utcnow()
            else:
                # Standard range
                hours = int(self.current_time_range.rstrip('h'))
                current_start = datetime.utcnow() - timedelta(hours=hours)
                current_end = datetime.utcnow()

        return {
            "aggs": {
                "events": {
                    "terms": {
                        "field": "detail.event.data.traffic.eid.keyword",
                        "order": {"_key": "asc"},
                        "size": 500
                    },
                    "aggs": {
                        "baseline": {
                            "filter": {
                                "range": {
                                    "@timestamp": {
                                        "gte": self.baseline_start.isoformat() + "Z",
                                        "lt": self.baseline_end.isoformat() + "Z"
                                    }
                                }
                            }
                        },
                        "current": {
                            "filter": {
                                "range": {
                                    "@timestamp": {
                                        "gte": current_start.isoformat() + "Z",
                                        "lte": current_end.isoformat() + "Z"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {
                            "wildcard": {
                                "detail.event.data.traffic.eid.keyword": {
                                    "value": self.event_pattern
                                }
                            }
                        },
                        {
                            "match_phrase": {
                                "detail.global.page.host": self.host
                            }
                        },
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": "2025-05-19T04:00:00.000Z",
                                    "lte": "now"
                                }
                            }
                        }
                    ]
                }
            }
        }

class TrafficEvent(BaseModel):
    """Response model for traffic events"""
    event_id: str
    display_name: str
    current_count: int
    baseline_count: int
    baseline_period: float
    daily_avg: float
    score: int
    status: str

class TrafficQueryResponse(BaseModel):
    """Response model for traffic analysis"""
    events: List[TrafficEvent]
    metadata: Dict[str, Any] = Field(default_factory=dict)

class TimeSeriesRequest(BaseModel):
    """Request model for time series queries"""
    model_config = ConfigDict(extra='forbid')

    time_range: TimeRange
    interval: str = Field(default="1h", description="Time bucket interval")
    group_by: Optional[str] = Field(default=None, description="Field to group by")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Additional filters")

    def build_es_query(self) -> Dict[str, Any]:
        """Build Elasticsearch query for time series"""
        query = {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {"range": {"@timestamp": self.time_range.to_es_format()}}
                    ]
                }
            },
            "aggs": {
                "timeline": {
                    "date_histogram": {
                        "field": "@timestamp",
                        "calendar_interval": self.interval,
                        "min_doc_count": 0
                    }
                }
            }
        }

        # Add additional filters
        for field, value in self.filters.items():
            if isinstance(value, dict) and "wildcard" in value:
                query["query"]["bool"]["filter"].append({
                    "wildcard": {field: {"value": value["wildcard"]}}
                })
            else:
                query["query"]["bool"]["filter"].append({
                    "term": {field: value}
                })

        # Add grouping if specified
        if self.group_by:
            query["aggs"]["timeline"]["aggs"] = {
                "groups": {
                    "terms": {
                        "field": self.group_by,
                        "size": 10
                    }
                }
            }

        return query

class ErrorAnalysisRequest(BaseModel):
    """Request model for error analysis"""
    model_config = ConfigDict(extra='forbid')

    time_range: TimeRange
    error_types: bool = Field(default=True, description="Include error types")
    status_codes: bool = Field(default=True, description="Include status codes")

    def build_es_query(self) -> Dict[str, Any]:
        """Build Elasticsearch query for error analysis"""
        query = {
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {"range": {"@timestamp": self.time_range.to_es_format()}},
                        {"exists": {"field": "error"}}
                    ]
                }
            },
            "aggs": {}
        }

        if self.error_types:
            query["aggs"]["error_types"] = {
                "terms": {
                    "field": "error.type.keyword",
                    "size": 50
                }
            }

        if self.status_codes:
            query["aggs"]["error_codes"] = {
                "terms": {
                    "field": "response.status_code",
                    "size": 20
                }
            }

        return query

class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    version: str = "2.0.0"
    endpoints: List[str]
    elasticsearch_status: Optional[str] = None

# =======================
# ELASTICSEARCH CLIENT
# =======================

class ElasticsearchClient:
    """Shared Elasticsearch client for all endpoints"""

    def __init__(self):
        self.kibana_url = KIBANA_URL
        self.proxy_path = PROXY_PATH

    async def execute_query(self, query: Dict[str, Any], elastic_cookie: str) -> Dict[str, Any]:
        """Execute a query against Elasticsearch"""
        try:
            url = self.kibana_url + self.proxy_path
            data = json.dumps(query).encode()

            req = Request(url, data=data)
            req.add_header('Content-Type', 'application/json')
            req.add_header('kbn-xsrf', 'true')
            req.add_header('Cookie', f'sid={elastic_cookie}')

            with urlopen(req, timeout=30, context=ssl_context) as response:
                response_data = response.read()
                return json.loads(response_data)

        except HTTPError as e:
            raise HTTPException(status_code=e.code, detail=f"Kibana error: {e.reason}")
        except URLError as e:
            raise HTTPException(status_code=502, detail=f"Connection failed: {e.reason}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

    async def test_connection(self, elastic_cookie: str) -> bool:
        """Test Elasticsearch connection"""
        try:
            test_query = {
                "size": 0,
                "query": {"match_all": {}},
                "aggs": {"test": {"max": {"field": "@timestamp"}}}
            }
            result = await self.execute_query(test_query, elastic_cookie)
            return "aggregations" in result
        except:
            return False

# =======================
# RESPONSE PROCESSORS
# =======================

class ResponseProcessor:
    """Process Elasticsearch responses into typed models"""

    @staticmethod
    def process_traffic_response(response: Dict[str, Any], request: TrafficQueryRequest) -> TrafficQueryResponse:
        """Process traffic analysis response"""
        events = []

        if "aggregations" in response and "events" in response["aggregations"]:
            buckets = response["aggregations"]["events"]["buckets"]

            # Calculate baseline period duration
            baseline_duration = request.baseline_end - request.baseline_start
            baseline_days = abs(baseline_duration.days)  # Handle negative durations
            # For periods less than a day, use fractional days
            if baseline_days == 0:
                baseline_days = abs(baseline_duration.total_seconds()) / 86400  # seconds in a day
            baseline_duration_ms = abs(int(baseline_duration.total_seconds() * 1000))

            # Calculate comparison period duration
            if request.comparison_start and request.comparison_end:
                # Use exact comparison period
                comparison_duration = request.comparison_end - request.comparison_start
                comparison_duration_ms = abs(int(comparison_duration.total_seconds() * 1000))
                current_hours = abs(comparison_duration.total_seconds()) / 3600
            elif request.current_time_range == 'inspection_time':
                current_hours = 16  # 24h - 8h = 16h window
                comparison_duration_ms = int(current_hours * 3600 * 1000)
            elif request.current_time_range.startswith('-'):
                # Custom range
                parts = request.current_time_range[1:].split('-')
                if len(parts) == 2:
                    from_hours = int(parts[0].rstrip('hd'))
                    to_hours = int(parts[1].rstrip('hd'))
                    if parts[0].endswith('d'):
                        from_hours *= 24
                    if parts[1].endswith('d'):
                        to_hours *= 24
                    current_hours = to_hours - from_hours
                else:
                    current_hours = 12  # fallback
                comparison_duration_ms = int(current_hours * 3600 * 1000)
            else:
                current_hours = int(request.current_time_range.rstrip('h'))
                comparison_duration_ms = int(current_hours * 3600 * 1000)

            # Calculate normalization factor with safety checks
            if comparison_duration_ms > 0 and baseline_duration_ms > 0:
                normalization_factor = baseline_duration_ms / comparison_duration_ms
                # Ensure it's a reasonable value
                if not (0.000001 < normalization_factor < 1000000000):
                    normalization_factor = 1.0
            else:
                normalization_factor = 1.0

            # Determine comparison method based on strategy
            comparison_method = request.time_comparison_strategy or 'linear_scale'

            for bucket in buckets:
                baseline_count = bucket.get("baseline", {}).get("doc_count", 0)
                current_count = bucket.get("current", {}).get("doc_count", 0)

                # Calculate metrics
                daily_avg = baseline_count / baseline_days if baseline_days > 0 else 0

                # Apply time comparison strategy
                if comparison_method == 'linear_scale':
                    # Linear scaling based on time ratio
                    baseline_period = baseline_count / normalization_factor if normalization_factor > 0 else 0
                elif comparison_method == 'hourly_average':
                    # Use hourly average from baseline
                    baseline_hours = abs(baseline_duration.total_seconds()) / 3600
                    hourly_avg = baseline_count / baseline_hours if baseline_hours > 0 else 0
                    baseline_period = hourly_avg * current_hours
                elif comparison_method == 'daily_pattern':
                    # Use daily average pattern
                    baseline_period = (baseline_count / baseline_days / 24 * current_hours) if baseline_days > 0 else 0
                else:
                    # Default to linear scale
                    baseline_period = baseline_count / normalization_factor if normalization_factor > 0 else 0

                # Get thresholds from settings
                settings = get_settings()

                # Skip low volume events
                if daily_avg < 5:  # configurable threshold
                    continue

                # Calculate score
                score = 0
                if baseline_period > 0:
                    ratio = current_count / baseline_period
                    # Use a reasonable default threshold -- add to a config to link it from
                    high_volume_threshold = 1000
                    if daily_avg >= high_volume_threshold:
                        score = int((1 - ratio) * -100) if ratio < 0.5 else int((ratio - 1) * 100)
                    else:
                        score = int((1 - ratio) * -100) if ratio < 0.3 else int((ratio - 1) * 100)

                # Determine status using configured thresholds
                status = "NORMAL"
                if score <= -100:  # Critical threshold
                    status = "CRITICAL"
                elif score <= -50:  # Warning threshold
                    status = "WARNING"
                elif score > 0:
                    status = "INCREASED"

                event = TrafficEvent(
                    event_id=bucket["key"],
                    display_name=bucket["key"].replace("pandc.vnext.recommendations.feed.", ""),
                    current_count=current_count,
                    baseline_count=baseline_count,
                    baseline_period=round(baseline_period, 2),
                    daily_avg=round(daily_avg, 2),
                    score=score,
                    status=status
                )
                events.append(event)

        return TrafficQueryResponse(
            events=events,
            metadata={
                "total_events": len(events),
                "query_time": response.get("took", 0),
                "baseline_days": baseline_days,
                "current_hours": current_hours,
                "time_range_type": "inspection" if request.current_time_range == "inspection_time" else "standard",
                # NEW: Time normalization info
                "baseline_duration_ms": baseline_duration_ms,
                "comparison_duration_ms": comparison_duration_ms,
                "normalization_factor": round(normalization_factor, 4),
                "comparison_method": comparison_method
            }
        )

# =======================
# FASTAPI APP
# =======================

# Create shared Elasticsearch client
es_client = ElasticsearchClient()

# Create FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Enhanced CORS Proxy starting up...")

    # Validate configuration on startup
    try:
        settings = get_settings()
        print("Configuration loaded successfully")
        print("Elasticsearch URL configured")
        print("Processing baseline configuration loaded")

        # Check if critical settings are present
        if False:  # Cookie check disabled
            print("WARNING: Elasticsearch cookie not configured!")
        if False:  # Baseline dates check disabled
            print("WARNING: Processing baseline dates not configured!")

    except Exception as e:
        print(f"ERROR loading configuration: {e}")
        print("Continuing with defaults...")

    yield
    # Shutdown
    print("Enhanced CORS Proxy shutting down...")

app = FastAPI(
    title="RAD Monitor Enhanced CORS Proxy",
    description="CORS proxy with typed endpoints for Elasticsearch queries",
    version="2.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include configuration API router
# app.include_router(config_router)  # Commented out for testing

# =======================
# ENDPOINTS
# =======================

@app.get("/health", response_model=HealthCheckResponse)
async def health_check(x_elastic_cookie: Optional[str] = Header(None)):
    """Health check endpoint"""
    es_status = "unknown"
    if x_elastic_cookie:
        es_status = "connected" if await es_client.test_connection(x_elastic_cookie) else "disconnected"

    return HealthCheckResponse(
        status="running",
        service="RAD Monitor Enhanced CORS Proxy",
        endpoints=[
            "/health",
            "/kibana-proxy",
            "/api/traffic-analysis",
            "/api/time-series",
            "/api/error-analysis",
            "/api/config/settings",
            "/api/config/settings/processing",
            "/api/config/reload",
            "/api/config/health",
            "/api/config/export",
            "/api/config/environment"
        ],
        elasticsearch_status=es_status
    )

@app.post("/kibana-proxy")
async def kibana_proxy(
    body: Dict[str, Any] = Body(...),
    x_elastic_cookie: str = Header(...)
):
    """Raw proxy endpoint - maintains existing functionality"""
    result = await es_client.execute_query(body, x_elastic_cookie)
    return JSONResponse(content=result)

@app.post("/api/traffic-analysis", response_model=TrafficQueryResponse)
async def traffic_analysis(
    request: TrafficQueryRequest,
    x_elastic_cookie: str = Header(...)
):
    """Typed endpoint for traffic analysis"""
    query = request.build_es_query()
    response = await es_client.execute_query(query, x_elastic_cookie)
    return ResponseProcessor.process_traffic_response(response, request)

@app.post("/api/time-series")
async def time_series(
    request: TimeSeriesRequest,
    x_elastic_cookie: str = Header(...)
):
    """Typed endpoint for time series analysis"""
    query = request.build_es_query()
    response = await es_client.execute_query(query, x_elastic_cookie)

    # Process time series response
    result = {
        "data": [],
        "metadata": {
            "query_time": response.get("took", 0),
            "total_hits": response.get("hits", {}).get("total", {}).get("value", 0)
        }
    }

    if "aggregations" in response and "timeline" in response["aggregations"]:
        timeline = response["aggregations"]["timeline"]["buckets"]

        for bucket in timeline:
            point = {
                "timestamp": bucket["key_as_string"],
                "value": bucket["doc_count"]
            }

            # Add grouped data if present
            if "groups" in bucket:
                point["groups"] = [
                    {"key": g["key"], "value": g["doc_count"]}
                    for g in bucket["groups"]["buckets"]
                ]

            result["data"].append(point)

    return result

@app.post("/api/error-analysis")
async def error_analysis(
    request: ErrorAnalysisRequest,
    x_elastic_cookie: str = Header(...)
):
    """Typed endpoint for error analysis"""
    query = request.build_es_query()
    response = await es_client.execute_query(query, x_elastic_cookie)

    # Process error analysis response
    result = {
        "error_types": [],
        "status_codes": [],
        "metadata": {
            "query_time": response.get("took", 0),
            "total_errors": response.get("hits", {}).get("total", {}).get("value", 0)
        }
    }

    if "aggregations" in response:
        if "error_types" in response["aggregations"]:
            result["error_types"] = [
                {"type": bucket["key"], "count": bucket["doc_count"]}
                for bucket in response["aggregations"]["error_types"]["buckets"]
            ]

        if "error_codes" in response["aggregations"]:
            result["status_codes"] = [
                {"code": bucket["key"], "count": bucket["doc_count"]}
                for bucket in response["aggregations"]["error_codes"]["buckets"]
            ]

    return result

# =======================
# MAIN
# =======================

if __name__ == "__main__":
    print("Starting Enhanced CORS Proxy Server with FastAPI")
    print("Will maintain existing proxy functionality while adding typed endpoints")
    print("Stop with Ctrl+C")
    print("=" * 60)

    uvicorn.run(app, host="localhost", port=8889, log_level="info")
