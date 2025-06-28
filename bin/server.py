#!/usr/bin/env python3
"""
Unified FastAPI Server for RAD Monitor
Consolidates all server functionality into a single, clean implementation.
"""
import os
import sys
import json
import signal
import asyncio
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Tuple
from contextlib import asynccontextmanager
from collections import defaultdict

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect, HTTPException, Header, BackgroundTasks
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import uvicorn
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pybreaker import CircuitBreaker
import structlog
from dotenv import load_dotenv

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Import config API router and models
from src.api.config_api import router as config_router
from src.config.settings import get_settings, reload_settings
from src.data.models import TrafficEvent, ProcessingConfig

# Load environment variables
load_dotenv()

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.dev.ConsoleRenderer()  # Human-readable for development
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# ====================
# Configuration
# ====================

# Server configuration
SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))
SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Kibana configuration
KIBANA_URL = os.getenv("KIBANA_URL", "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243")
KIBANA_SEARCH_PATH = "/api/console/proxy?path=traffic-*/_search&method=POST"

# Cache configuration
CACHE_TTL = timedelta(minutes=5)

# ====================
# Models
# ====================

class DashboardConfig(BaseModel):
    """Dashboard configuration model with validation"""
    baseline_start: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$', description="Baseline start date (YYYY-MM-DD)")
    baseline_end: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$', description="Baseline end date (YYYY-MM-DD)")
    time_range: str = Field(default="now-12h", description="Time range for current data")
    critical_threshold: int = Field(default=-80, le=0, description="Critical threshold (must be negative)")
    warning_threshold: int = Field(default=-50, le=0, description="Warning threshold (must be negative)")
    high_volume_threshold: int = Field(default=1000, ge=1, description="High volume threshold")
    medium_volume_threshold: int = Field(default=100, ge=1, description="Medium volume threshold")

    @field_validator('baseline_end')
    def validate_date_range(cls, v, info):
        if 'baseline_start' in info.data and v <= info.data['baseline_start']:
            raise ValueError('baseline_end must be after baseline_start')
        return v

class DashboardStats(BaseModel):
    """Dashboard statistics model"""
    critical_count: int = 0
    warning_count: int = 0
    normal_count: int = 0
    increased_count: int = 0
    last_update: str = Field(default_factory=lambda: datetime.now().isoformat())
    total_events: int = 0

class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str = Field(..., pattern=r'^(config|stats|data|error|performance_metrics)$')
    data: Dict[str, Any]

class ElasticsearchQuery(BaseModel):
    """Elasticsearch query model with validation"""
    size: int = Field(default=0, ge=0, description="Number of documents to return")
    query: Dict[str, Any] = Field(..., description="Elasticsearch query DSL")
    aggs: Optional[Dict[str, Any]] = Field(default=None, description="Aggregations")

class KibanaQueryRequest(BaseModel):
    """Request model for Kibana query endpoint"""
    query: ElasticsearchQuery
    force_refresh: bool = Field(default=False, description="Bypass cache and force fresh query")

class PortCleanupRequest(BaseModel):
    """Request model for port cleanup"""
    ports: List[int] = Field(default=[8000], description="Ports to clean up")
    force: bool = Field(default=False, description="Force kill processes")

class ValidationRequest(BaseModel):
    """Request model for validation"""
    verbose: bool = Field(default=False, description="Verbose output")
    categories: Optional[List[str]] = Field(default=None, description="Specific categories to validate")

# ====================
# Metrics & Monitoring
# ====================

class MetricsTracker:
    """Track performance metrics for monitoring"""
    def __init__(self):
        self.reset()

    def reset(self):
        """Reset metrics for new time window"""
        self.window_start = datetime.now()
        self.requests = defaultdict(int)
        self.errors = defaultdict(int)
        self.response_times = defaultdict(list)
        self.rate_limit_triggers = 0
        self.circuit_breaker_trips = 0

    def record_request(self, endpoint: str, duration_ms: float, success: bool):
        """Record a request with its metrics"""
        self.requests[endpoint] += 1
        self.response_times[endpoint].append(duration_ms)
        if not success:
            self.errors[endpoint] += 1

        logger.info("request_metrics",
            endpoint=endpoint,
            duration_ms=duration_ms,
            success=success,
            timestamp=datetime.now().isoformat()
        )

    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics summary"""
        total_requests = sum(self.requests.values())
        total_errors = sum(self.errors.values())
        all_times = []
        for times in self.response_times.values():
            all_times.extend(times)

        return {
            "window_start": self.window_start.isoformat(),
            "window_duration_seconds": (datetime.now() - self.window_start).total_seconds(),
            "total_requests": total_requests,
            "success_rate": ((total_requests - total_errors) / total_requests * 100) if total_requests > 0 else 100,
            "avg_response_time_ms": sum(all_times) / len(all_times) if all_times else 0,
            "errors": total_errors,
            "rate_limit_triggers": self.rate_limit_triggers,
            "circuit_breaker_trips": self.circuit_breaker_trips
        }

# ====================
# Rate Limiting & Circuit Breaker
# ====================

def get_real_client_ip(request: Request) -> str:
    """Get client IP, handling proxies and localhost"""
    client_ip = get_remote_address(request)
    if not client_ip or client_ip == "127.0.0.1":
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host
    return client_ip or "127.0.0.1"

# Initialize components
metrics_tracker = MetricsTracker()

# More permissive rate limits for development
default_limits = ["500 per minute", "5000 per hour"] if ENVIRONMENT == "development" else ["200 per minute", "1000 per hour"]

limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=default_limits,
    storage_uri="memory://"
)
es_circuit_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name='ElasticsearchBreaker'
)

# ====================
# Application State
# ====================

dashboard_state = {
    "config": DashboardConfig(
        baseline_start="2025-06-01",
        baseline_end="2025-06-09",
        time_range="now-12h"
    ),
    "stats": DashboardStats()
}
active_connections: List[WebSocket] = []
query_cache: Dict[str, Tuple[Any, datetime]] = {}

# ====================
# Helper Functions
# ====================

async def broadcast_to_websockets(message: WebSocketMessage):
    """Broadcast message to all connected WebSocket clients"""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(message.model_dump())
        except:
            disconnected.append(connection)

    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)

def process_dashboard_template(config: DashboardConfig, stats: DashboardStats) -> str:
    """Process HTML template with current data"""
    html_path = Path("index.html")
    if not html_path.exists():
        raise FileNotFoundError("index.html not found")

    with open(html_path, 'r') as f:
        content = f.read()

    # Replace configuration values
    content = content.replace('value="2025-06-01"', f'value="{config.baseline_start}"')
    content = content.replace('value="2025-06-09"', f'value="{config.baseline_end}"')
    content = content.replace('value="now-12h"', f'value="{config.time_range}"')

    # Inject Elasticsearch cookie from environment
    elastic_cookie = os.environ.get('ELASTIC_COOKIE', '')
    if elastic_cookie:
        content = content.replace('value=""', f'value="{elastic_cookie}"')
        cookie_script = f"""
    <script>
        window.ELASTIC_COOKIE = "{elastic_cookie}";
        console.log('🔍 Environment cookie loaded:', window.ELASTIC_COOKIE ? 'Yes' : 'No');
    </script>"""
        content = content.replace('</head>', f'{cookie_script}\n</head>')

    return content

async def clean_cache():
    """Clean expired cache entries"""
    now = datetime.now()
    expired_keys = [
        key for key, (_, cache_time) in query_cache.items()
        if now - cache_time > CACHE_TTL
    ]
    for key in expired_keys:
        del query_cache[key]

# ====================
# Application Lifecycle
# ====================

def signal_handler(sig, frame):
    """Handle interrupt signal for clean shutdown"""
    logger.info("Received interrupt signal, shutting down...")
    sys.exit(0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    signal.signal(signal.SIGINT, signal_handler)

    # Clear screen and show banner
    os.system('clear' if os.name != 'nt' else 'cls')
    print(f"""
╔══════════════════════════════════════════════════════════╗
║           RAD Monitor Unified Server v2.0                ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  🌐 Dashboard:    http://localhost:{SERVER_PORT:<5}                ║
║  📚 API Docs:     http://localhost:{SERVER_PORT:<5}/docs            ║
║  🔌 WebSocket:    ws://localhost:{SERVER_PORT:<5}/ws                ║
║  🚀 API Base:     http://localhost:{SERVER_PORT:<5}/api/v1           ║
║                                                          ║
║  Environment: {ENVIRONMENT:<42} ║
║  All services unified - no separate CORS proxy needed!   ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    """)

    logger.info("server_started", port=SERVER_PORT, environment=ENVIRONMENT)

    yield

    # Shutdown
    logger.info("server_stopped")

# ====================
# FastAPI Application
# ====================

app = FastAPI(
    title="RAD Monitor Unified Server",
    description="Unified server with all RAD Monitor functionality",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# ====================
# Middleware
# ====================

# CORS middleware - handles all CORS needs, no proxy required
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on environment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limit handler
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceptions"""
    metrics_tracker.rate_limit_triggers += 1
    response = JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"}
    )
    response.headers["Retry-After"] = "60"
    return response

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# Request tracking middleware
@app.middleware("http")
async def track_metrics(request: Request, call_next):
    """Track request metrics"""
    start_time = time.time()
    response = None
    success = False

    try:
        response = await call_next(request)
        success = response.status_code < 400
        return response
    finally:
        duration_ms = (time.time() - start_time) * 1000
        endpoint = f"{request.method} {request.url.path}"
        metrics_tracker.record_request(endpoint, duration_ms, success)

# ====================
# Static Files
# ====================

app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/tests", StaticFiles(directory="tests", html=True), name="tests")

# ====================
# Include Routers
# ====================

# Config API router with v1 prefix
app.include_router(config_router, prefix="/api/v1/config", tags=["Configuration"])

# ====================
# Core Endpoints
# ====================

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """Serve the main dashboard"""
    content = process_dashboard_template(dashboard_state["config"], dashboard_state["stats"])
    return HTMLResponse(content=content)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    settings = get_settings()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "environment": ENVIRONMENT,
        "services": {
            "dashboard": True,
            "api": True,
            "websocket": True,
            "cors": True,
            "config": True
        },
        "checks": {
            "elasticsearch_configured": bool(settings.elasticsearch.cookie or os.getenv('ELASTIC_COOKIE')),
            "websocket_connections": len(active_connections)
        }
    }

# ====================
# WebSocket Endpoint
# ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    active_connections.append(websocket)

    try:
        # Send initial configuration
        await websocket.send_json({
            "type": "config",
            "data": dashboard_state["config"].model_dump()
        })

        # Send initial stats
        await websocket.send_json({
            "type": "stats",
            "data": dashboard_state["stats"].model_dump()
        })

        # Keep connection alive and handle messages
        while True:
            data = await websocket.receive_json()

            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif data.get("type") == "refresh":
                # Trigger data refresh
                await websocket.send_json({
                    "type": "stats",
                    "data": dashboard_state["stats"].model_dump()
                })

    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        logger.error("websocket_error", error=str(e))
        if websocket in active_connections:
            active_connections.remove(websocket)

# ====================
# API v1 Endpoints
# ====================

# Dashboard endpoints
@app.get("/api/v1/dashboard/config", response_model=DashboardConfig)
@limiter.limit("100 per minute" if ENVIRONMENT == "development" else "30 per minute")
async def get_dashboard_config(request: Request):
    """Get current dashboard configuration"""
    return dashboard_state["config"]

@app.post("/api/v1/dashboard/config", response_model=DashboardConfig)
@limiter.limit("100 per minute" if ENVIRONMENT == "development" else "30 per minute")
async def update_dashboard_config(request: Request, config: DashboardConfig):
    """Update dashboard configuration"""
    dashboard_state["config"] = config
    await broadcast_to_websockets(WebSocketMessage(
        type="config",
        data=config.model_dump()
    ))
    return config

@app.get("/api/v1/dashboard/stats", response_model=DashboardStats)
@limiter.limit("100 per minute" if ENVIRONMENT == "development" else "60 per minute")
async def get_dashboard_stats(request: Request):
    """Get current dashboard statistics"""
    return dashboard_state["stats"]

# ====================
# Simplified Dashboard Endpoint
# ====================

class DashboardQueryRequest(BaseModel):
    """Simplified dashboard query request"""
    time_range: str = Field(default="now-12h", description="Time range for current data")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Optional filters")
    options: Dict[str, Any] = Field(default_factory=dict, description="Query options")

class ProcessedEvent(BaseModel):
    """Processed event with all calculations done server-side"""
    id: str
    name: str
    status: str = Field(..., pattern=r'^(critical|warning|normal|increased)$')
    score: int
    current: int
    baseline: int
    impact: str
    impact_class: str
    rad_type: str
    rad_display_name: str
    rad_color: str
    kibana_url: str

class DashboardQueryResponse(BaseModel):
    """Dashboard query response with processed data"""
    data: List[ProcessedEvent]
    stats: DashboardStats
    metadata: Dict[str, Any]

@app.post("/api/v1/dashboard/query", response_model=DashboardQueryResponse)
@limiter.limit("50 per minute" if ENVIRONMENT == "development" else "20 per minute")
async def dashboard_query(
    request: Request,
    query_request: DashboardQueryRequest,
    background_tasks: BackgroundTasks
):
    """
    Simplified dashboard query endpoint
    Handles all business logic server-side
    """
    try:
        # Get authentication - check multiple sources
        cookie = (
            request.headers.get("Cookie") or
            request.headers.get("X-Elastic-Cookie") or
            os.getenv("ELASTIC_COOKIE")
        )
        if not cookie:
            raise HTTPException(status_code=401, detail="Authentication required")

        # Build Elasticsearch query
        es_query = build_dashboard_query(
            time_range=query_request.time_range,
            baseline_start=dashboard_state["config"].baseline_start,
            baseline_end=dashboard_state["config"].baseline_end
        )

        # Execute query
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(
                f"{KIBANA_URL}{KIBANA_SEARCH_PATH}",
                json=es_query,
                headers={
                    "Cookie": cookie,
                    "Content-Type": "application/json",
                    "kbn-xsrf": "true"  # Required for Kibana
                }
            )

        if response.status_code != 200:
            logger.error(
                "elasticsearch_query_failed",
                status_code=response.status_code,
                response_text=response.text[:500]  # Log first 500 chars of error
            )

            # Better error messages based on status code
            if response.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid or expired authentication cookie. Please update your cookie."
                )
            elif response.status_code == 403:
                raise HTTPException(
                    status_code=403,
                    detail="Access denied. Please check your permissions."
                )
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Elasticsearch query failed with status {response.status_code}"
                )

        # Process the response
        es_data = response.json()
        processed_data = process_dashboard_data(
            es_data,
            dashboard_state["config"],
            query_request.filters
        )

        # Calculate statistics
        stats = calculate_stats(processed_data)

        # Update background state
        background_tasks.add_task(update_dashboard_state, stats, len(processed_data))

        # Return processed response
        return DashboardQueryResponse(
            data=processed_data,
            stats=stats,
            metadata={
                "query_time": query_request.time_range,
                "baseline_period": f"{dashboard_state['config'].baseline_start} to {dashboard_state['config'].baseline_end}",
                "total_events": len(processed_data),
                "timestamp": datetime.now().isoformat()
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("dashboard_query_error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")

def build_dashboard_query(time_range: str, baseline_start: str, baseline_end: str) -> dict:
    """Build Elasticsearch query with all necessary aggregations"""
    # Parse time range
    time_filter = parse_time_range(time_range)

    return {
        "size": 0,
        "query": {
            "bool": {
                "filter": [
                    {
                        "range": {
                            "@timestamp": {
                                "gte": "2025-05-19T04:00:00.000Z",
                                "lte": "now"
                            }
                        }
                    },
                    {
                        "match_phrase": {
                            "detail.global.page.host": "dashboard.godaddy.com"
                        }
                    },
                    {
                        "wildcard": {
                            "detail.event.data.traffic.eid.keyword": {
                                "value": "pandc.vnext.recommendations.feed.feed*"
                            }
                        }
                    }
                ]
            }
        },
        "aggs": {
            "events": {
                "terms": {
                    "field": "detail.event.data.traffic.eid.keyword",
                    "size": 500,
                    "order": {"_key": "asc"}
                },
                "aggs": {
                    "baseline": {
                        "filter": {
                            "range": {
                                "@timestamp": {
                                    "gte": baseline_start + "T00:00:00Z" if len(baseline_start) == 10 else baseline_start,
                                    "lt": baseline_end + "T00:00:00Z" if len(baseline_end) == 10 else baseline_end
                                }
                            }
                        }
                    },
                    "current": {
                        "filter": {
                            "range": {
                                "@timestamp": time_filter if isinstance(time_filter, dict) else {"gte": time_filter, "lte": "now"}
                            }
                        }
                    }
                }
            }
        }
    }

def parse_time_range(time_range: str) -> dict:
    """Parse time range string to Elasticsearch filter"""
    if time_range == "inspection_time":
        # Special handling for inspection time
        now = datetime.now()
        return {
            "gte": (now - timedelta(hours=36)).isoformat(),
            "lte": (now - timedelta(hours=24)).isoformat()
        }
    elif time_range.startswith("now-"):
        # Relative time range
        return {"gte": time_range, "lte": "now"}
    else:
        # Absolute time range (assumed to be "start/end" format)
        parts = time_range.split("/")
        if len(parts) == 2:
            return {"gte": parts[0], "lte": parts[1]}
        else:
            return {"gte": "now-12h", "lte": "now"}

def process_dashboard_data(
    es_response: dict,
    config: DashboardConfig,
    filters: dict
) -> List[ProcessedEvent]:
    """Process Elasticsearch response with all business logic"""
    processed = []

    if "aggregations" not in es_response:
        return processed

    events = es_response["aggregations"]["events"]["buckets"]

    for event in events:
        event_id = event["key"]
        baseline_count = event["baseline"]["doc_count"]
        current_count = event["current"]["doc_count"]

        # Calculate daily average for baseline
        # Handle dates with or without timezone
        baseline_end = config.baseline_end
        baseline_start = config.baseline_start

        # Add time component if it's just a date
        if len(baseline_end) == 10:  # YYYY-MM-DD format
            baseline_end += "T00:00:00Z"
        if len(baseline_start) == 10:  # YYYY-MM-DD format
            baseline_start += "T00:00:00Z"

        baseline_days = (
            datetime.fromisoformat(baseline_end.replace("Z", "+00:00")) -
            datetime.fromisoformat(baseline_start.replace("Z", "+00:00"))
        ).days

        if baseline_days <= 0:
            baseline_days = 1

        daily_avg = baseline_count / baseline_days

        # Calculate expected count for current period
        # This is simplified - in reality would parse time_range properly
        expected_hours = 12  # Default for "now-12h"
        expected_count = daily_avg * (expected_hours / 24)

        # Calculate score based on volume
        if daily_avg >= config.high_volume_threshold:
            # High volume scoring
            if current_count < expected_count * 0.5:
                score = int((1 - current_count / expected_count) * -100)
            else:
                score = int((current_count / expected_count - 1) * 100)
        elif daily_avg >= config.medium_volume_threshold:
            # Medium volume scoring
            if current_count < expected_count * 0.3:
                score = int((1 - current_count / expected_count) * -100)
            else:
                score = int((current_count / expected_count - 1) * 100)
        else:
            # Low volume - filter out
            continue

        # Determine status
        if score <= config.critical_threshold:
            status = "critical"
        elif score <= config.warning_threshold:
            status = "warning"
        elif score <= 0:
            status = "normal"
        else:
            status = "increased"

        # Calculate impact
        diff = current_count - expected_count
        if diff < -50:
            impact = f"Lost ~{abs(int(diff)):,} impressions"
            impact_class = "loss"
        elif diff > 50:
            impact = f"Gained ~{int(diff):,} impressions"
            impact_class = "gain"
        else:
            impact = "Normal variance"
            impact_class = ""

        # Determine RAD type (simplified for now)
        rad_type = "recommendations"
        rad_display_name = "Recommendations"
        rad_color = "#2196F3"

        # Build Kibana URL
        kibana_url = build_kibana_url(event_id)

        processed.append(ProcessedEvent(
            id=event_id,
            name=event_id,
            status=status,
            score=score,
            current=current_count,
            baseline=int(expected_count),
            impact=impact,
            impact_class=impact_class,
            rad_type=rad_type,
            rad_display_name=rad_display_name,
            rad_color=rad_color,
            kibana_url=kibana_url
        ))

    # Sort by score (most negative first)
    processed.sort(key=lambda x: x.score)

    return processed

def calculate_stats(events: List[ProcessedEvent]) -> DashboardStats:
    """Calculate dashboard statistics"""
    stats = DashboardStats()

    for event in events:
        if event.status == "critical":
            stats.critical_count += 1
        elif event.status == "warning":
            stats.warning_count += 1
        elif event.status == "normal":
            stats.normal_count += 1
        elif event.status == "increased":
            stats.increased_count += 1

    stats.total_events = len(events)
    stats.last_update = datetime.now().isoformat()

    return stats

def build_kibana_url(event_id: str) -> str:
    """Build Kibana discovery URL for an event"""
    base_url = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
    discover_path = "/app/discover#/"

    # Build params as a single concatenated string
    params = ("?_g=(filters:!(),refreshInterval:(pause:!t,value:0),"
              "time:(from:'2025-05-28T16:50:47.243Z',to:now))"
              "&_a=(columns:!(),filters:!(('$state':(store:appState),"
              f"meta:(alias:!n,disabled:!f,key:detail.event.data.traffic.eid.keyword,"
              f"negate:!f,params:(query:'{event_id}'),type:phrase),"
              f"query:(match_phrase:(detail.event.data.traffic.eid.keyword:'{event_id}'))))"
              ",grid:(columns:(detail.event.data.traffic.eid.keyword:(width:400))),"
              "hideChart:!f,index:'traffic-*',interval:auto,query:(language:kuery,query:''),sort:!())")

    return base_url + discover_path + params

async def update_dashboard_state(stats: DashboardStats, event_count: int):
    """Update dashboard state in background"""
    dashboard_state["stats"] = stats

    # Broadcast to WebSocket clients
    await broadcast_to_websockets(WebSocketMessage(
        type="stats",
        data=stats.model_dump()
    ))

# ====================
# Authentication Endpoints
# ====================

@app.get("/api/v1/auth/status")
async def auth_status(request: Request):
    """Check authentication status"""
    cookie = (
        request.headers.get("Cookie") or
        request.headers.get("X-Elastic-Cookie") or
        os.getenv("ELASTIC_COOKIE")
    )

    if cookie:
        # In production, would validate the cookie with Elasticsearch
        return {
            "authenticated": True,
            "method": "cookie",
            "expires": (datetime.now() + timedelta(days=1)).isoformat()
        }

    return {
        "authenticated": False,
        "method": None
    }

@app.post("/api/v1/auth/logout")
async def auth_logout(request: Request):
    """Logout endpoint (placeholder for future SSO integration)"""
    return {"success": True}

# ====================
# Legacy Kibana Proxy (for backward compatibility)
# ====================

@app.post("/api/v1/kibana/proxy")
@app.post("/kibana-proxy")  # Legacy compatibility
@limiter.limit("100 per minute" if ENVIRONMENT == "development" else "30 per minute")
async def kibana_proxy(
    request: Request,
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Legacy proxy endpoint for backward compatibility"""
    try:
        # Get request body
        raw_body = await request.body()

        # Use cookie from header or environment
        cookie = x_elastic_cookie or os.environ.get('ELASTIC_COOKIE', '')
        if not cookie:
            raise HTTPException(status_code=401, detail="No authentication cookie provided")

        # Parse request body
        body_data = json.loads(raw_body)
        if isinstance(body_data, dict) and "query" in body_data:
            es_query = body_data["query"]
            query_body = json.dumps(es_query).encode('utf-8')
        else:
            query_body = raw_body

        # Build request
        proxy_url = f"{KIBANA_URL}{KIBANA_SEARCH_PATH}"
        headers = {
            "Content-Type": "application/json",
            "kbn-xsrf": "true",
            "Cookie": f"sid={cookie}" if not cookie.startswith('sid=') else cookie
        }

        # Execute request
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.post(proxy_url, content=query_body, headers=headers)

        return Response(
            content=response.content,
            status_code=response.status_code,
            headers={
                "Content-Type": response.headers.get("Content-Type", "application/json"),
                "X-Cache": "miss"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("kibana_proxy_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# ====================
# Metrics & Utilities
# ====================

@app.get("/api/v1/metrics")
async def get_metrics():
    """Get server metrics"""
    return metrics_tracker.get_metrics()

@app.post("/api/v1/metrics/reset")
async def reset_metrics():
    """Reset metrics"""
    metrics_tracker.reset()
    return {"status": "success", "message": "Metrics reset"}

@app.post("/api/v1/utils/cleanup-ports")
async def cleanup_ports(request: PortCleanupRequest):
    """Clean up processes using specified ports"""
    # Import here to avoid circular imports
    from cleanup_ports import cleanup_port, find_process_by_port

    try:
        ports_cleaned = {}
        total_killed = 0

        for port in request.ports:
            killed = cleanup_port(port, force=request.force)
            ports_cleaned[port] = killed > 0
            total_killed += killed

        return {
            "success": all(not find_process_by_port(port) for port in request.ports),
            "ports_cleaned": ports_cleaned,
            "processes_killed": total_killed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/utils/validate")
async def validate_connections(request: ValidationRequest):
    """Validate project connections and configuration"""
    # Import here to avoid circular imports
    from validate_connections import Validator

    try:
        validator = Validator(verbose=request.verbose)

        # Run validations
        if request.categories:
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

        results = validator.result.to_json()
        return {
            "success": results['success'],
            "passed": results['passed'],
            "failed": results['failed'],
            "warnings": validator.result.warnings,
            "details": results['details']
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ====================
# Main Entry Point
# ====================

if __name__ == "__main__":
    # Clean up ports first
    if os.path.exists("scripts/setup/cleanup-ports.sh"):
        os.system("scripts/setup/cleanup-ports.sh >/dev/null 2>&1")

    # Run server
    uvicorn.run(
        app,  # Pass the app directly instead of module string
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=False,  # Disable reload when running directly
        log_level="info",
        access_log=False  # We have our own request tracking
    )
