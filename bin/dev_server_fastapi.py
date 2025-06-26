#!/usr/bin/env python3
"""
FastAPI-based development server for RAD Monitor with real-time updates and validation
"""
import subprocess
import sys
import os
import signal
import asyncio
import json
import hashlib
import time
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect, HTTPException, Header
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import uvicorn
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from pybreaker import CircuitBreaker
import structlog
from collections import defaultdict

# Import config API router
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from src.api.config_api import router as config_router

# 🚀 CRITICAL FIX: Load .env file for environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
    print(f"✅ Environment loaded - ELASTIC_COOKIE: {'Yes' if os.environ.get('ELASTIC_COOKIE') else 'No'}")
except ImportError:
    print("⚠️  python-dotenv not available - install with: pip install python-dotenv")
    print(f"📋 Manual check - ELASTIC_COOKIE in environment: {'Yes' if os.environ.get('ELASTIC_COOKIE') else 'No'}")
except Exception as e:
    print(f"❌ Error loading .env: {e}")

# Global process reference for cleanup
cors_process = None

# Configure structured logging
import logging

# Configure standard logging to use structlog
logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=logging.INFO
)

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
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Metrics tracking system
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
        
    def record_request(self, endpoint: str, duration_ms: float, success: bool, mode: str = "fastapi"):
        """Record a request with its metrics"""
        self.requests[endpoint] += 1
        self.response_times[endpoint].append(duration_ms)
        
        if not success:
            self.errors[endpoint] += 1
            
        # Log structured metrics
        logger.info("request_metrics",
            endpoint=endpoint,
            duration_ms=duration_ms,
            success=success,
            mode=mode,
            timestamp=datetime.now().isoformat()
        )
    
    def record_rate_limit(self, endpoint: str):
        """Record a rate limit trigger"""
        self.rate_limit_triggers += 1
        logger.warning("rate_limit_triggered", 
            endpoint=endpoint,
            total_triggers=self.rate_limit_triggers
        )
    
    def record_circuit_breaker_trip(self):
        """Record a circuit breaker trip"""
        self.circuit_breaker_trips += 1
        logger.warning("circuit_breaker_tripped",
            total_trips=self.circuit_breaker_trips
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics summary"""
        total_requests = sum(self.requests.values())
        total_errors = sum(self.errors.values())
        
        # Calculate average response times
        avg_response_times = {}
        for endpoint, times in self.response_times.items():
            if times:
                avg_response_times[endpoint] = sum(times) / len(times)
        
        # Overall average
        all_times = []
        for times in self.response_times.values():
            all_times.extend(times)
        
        overall_avg = sum(all_times) / len(all_times) if all_times else 0
        
        metrics = {
            "mode": "fastapi",
            "window_start": self.window_start.isoformat(),
            "window_duration_seconds": (datetime.now() - self.window_start).total_seconds(),
            "total_requests": total_requests,
            "success_rate": ((total_requests - total_errors) / total_requests * 100) if total_requests > 0 else 100,
            "response_time_ms": overall_avg,
            "errors": total_errors,
            "rate_limit_triggers": self.rate_limit_triggers,
            "circuit_breaker_trips": self.circuit_breaker_trips,
            "endpoints": {
                endpoint: {
                    "requests": self.requests[endpoint],
                    "errors": self.errors[endpoint],
                    "avg_response_time_ms": avg_response_times.get(endpoint, 0),
                    "success_rate": ((self.requests[endpoint] - self.errors[endpoint]) / self.requests[endpoint] * 100) if self.requests[endpoint] > 0 else 100
                }
                for endpoint in self.requests
            }
        }
        
        return metrics

# Initialize metrics tracker
metrics_tracker = MetricsTracker()

# Custom key function to handle localhost properly
def get_real_client_ip(request: Request) -> str:
    """Get client IP, handling proxies and localhost"""
    # Try standard method first
    client_ip = get_remote_address(request)
    
    # If it's None or 127.0.0.1, try other headers
    if not client_ip or client_ip == "127.0.0.1":
        # Check for common proxy headers
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            # Use the direct client connection
            if request.client:
                client_ip = request.client.host
    
    # Default to a consistent value for localhost testing
    return client_ip or "127.0.0.1"

# Configure rate limiter with in-memory storage
limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=["200 per minute", "1000 per hour"],
    storage_uri="memory://",
    strategy="fixed-window"
)

# Configure circuit breaker for Elasticsearch
es_circuit_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    name='ElasticsearchBreaker'
)

# Kibana configuration (same as cors_proxy.py)
KIBANA_URL = "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243"
KIBANA_SEARCH_PATH = "/api/console/proxy?path=traffic-*/_search&method=POST"

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

    @field_validator('warning_threshold')
    def validate_thresholds(cls, v, info):
        if 'critical_threshold' in info.data and v <= info.data['critical_threshold']:
            raise ValueError('warning_threshold must be greater than critical_threshold')
        return v

class DashboardStats(BaseModel):
    """Dashboard statistics model"""
    critical_count: int = 0
    warning_count: int = 0
    normal_count: int = 0
    increased_count: int = 0
    last_update: str = Field(default_factory=lambda: datetime.now().isoformat())
    total_events: int = 0

class RefreshRequest(BaseModel):
    """Request model for dashboard refresh"""
    config: DashboardConfig
    force_refresh: bool = False

class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str = Field(..., pattern=r'^(config|stats|data|error|performance_metrics)$')
    data: Dict[str, Any]

class ElasticsearchQuery(BaseModel):
    """Elasticsearch query model with validation"""
    size: int = Field(default=0, ge=0, description="Number of documents to return")
    query: Dict[str, Any] = Field(..., description="Elasticsearch query DSL")
    aggs: Dict[str, Any] = Field(..., description="Aggregations")

    @field_validator('aggs')
    def validate_aggregations(cls, v):
        if 'events' not in v:
            raise ValueError('Query must include "events" aggregation for traffic analysis')
        return v

class KibanaResponseHit(BaseModel):
    """Single hit from Elasticsearch response"""
    _index: str
    _id: str
    _score: Optional[float] = None
    _source: Dict[str, Any]

class KibanaResponseHits(BaseModel):
    """Hits section of Elasticsearch response"""
    total: Dict[str, Any]
    max_score: Optional[float] = None
    hits: List[KibanaResponseHit]

class KibanaResponse(BaseModel):
    """Kibana/Elasticsearch response model"""
    took: int = Field(..., description="Query execution time in milliseconds")
    timed_out: bool = Field(default=False, description="Whether the query timed out")
    hits: Optional[KibanaResponseHits] = None
    aggregations: Optional[Dict[str, Any]] = None
    error: Optional[Dict[str, Any]] = None

class QueryPerformanceMetrics(BaseModel):
    """Performance metrics for query execution"""
    query_id: str
    start_time: float
    end_time: float
    duration_ms: int
    cache_hit: bool
    query_type: str = "elasticsearch"

    @property
    def is_slow(self) -> bool:
        """Check if query is considered slow (>3 seconds)"""
        return self.duration_ms > 3000

    @property
    def is_critical(self) -> bool:
        """Check if query is critically slow (>5 seconds)"""
        return self.duration_ms > 5000

class KibanaQueryRequest(BaseModel):
    """Request model for Kibana query endpoint"""
    query: ElasticsearchQuery
    force_refresh: bool = Field(default=False, description="Bypass cache and force fresh query")

class PerformanceWebSocketMessage(BaseModel):
    """WebSocket message for performance metrics"""
    type: str = Field(default="performance_metrics", pattern=r'^performance_metrics$')
    data: Dict[str, Any]

# Store active websocket connections
active_connections: List[WebSocket] = []

# Current dashboard state
dashboard_state = {
    "config": DashboardConfig(
        baseline_start="2025-06-01",
        baseline_end="2025-06-09"
    ),
    "stats": DashboardStats(),
    "data": []
}

def signal_handler(sig, frame):
    """Handle shutdown gracefully"""
    logger.info("shutdown_signal_received", signal=sig)
    if cors_process:
        cors_process.terminate()
    sys.exit(0)

async def start_cors_proxy():
    """Start the CORS proxy subprocess"""
    global cors_process
    # Use the correct path to cors_proxy.py
    cors_proxy_path = os.path.join(os.path.dirname(__file__), 'cors_proxy.py')
    cors_process = subprocess.Popen(
        [sys.executable, cors_proxy_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    logger.info("cors_proxy_started", port=8889, pid=cors_process.pid)

async def stop_cors_proxy():
    """Stop the CORS proxy subprocess"""
    global cors_process
    if cors_process:
        cors_process.terminate()
        cors_process.wait()
        logger.info("cors_proxy_stopped")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    signal.signal(signal.SIGINT, signal_handler)
    await start_cors_proxy()

    # Initialize cache for Kibana queries
    app.state.cache = {}
    app.state.cache_timestamps = {}
    app.state.cache_timeout = 300  # 5 minutes in seconds

    # Clear screen and show banner
    os.system('clear' if os.name != 'nt' else 'cls')
    print("""
╔══════════════════════════════════════════════════════════╗
║        RAD Monitor FastAPI Development Server            ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║     CORS Proxy:     http://localhost:8889                ║
║     Dashboard:      http://localhost:8000                ║
║     API Docs:       http://localhost:8000/docs           ║
║     WebSocket:      ws://localhost:8000/ws               ║
║                                                          ║
║  🚀 FastAPI server with real-time updates & validation!  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    """)

    yield

    # Shutdown
    await stop_cors_proxy()
    logger.info("all_servers_stopped")

# Create FastAPI app
app = FastAPI(
    title="RAD Monitor Dev Server",
    description="Development server for RAD Traffic Health Monitor with real-time updates",
    version="2.0.0",
    lifespan=lifespan
)

# Custom exception handler for rate limits with metrics
async def custom_rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceptions with metrics tracking"""
    endpoint = request.url.path
    metrics_tracker.record_rate_limit(endpoint)
    
    response = JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded: {exc.detail}"}
    )
    response.headers["Retry-After"] = "60"
    return response

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_handler)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/assets", StaticFiles(directory="assets"), name="assets")
app.mount("/tests", StaticFiles(directory="tests", html=True), name="tests")

# Include config API router
app.include_router(config_router)

async def broadcast_to_websockets(message: WebSocketMessage):
    """Broadcast message to all connected WebSocket clients"""
    disconnected = []
    for connection in active_connections:
        try:
            await connection.send_json(message.model_dump())
        except:
            disconnected.append(connection)

    # Remove disconnected clients
    for conn in disconnected:
        if conn in active_connections:
            active_connections.remove(conn)

def process_template(config: DashboardConfig, stats: DashboardStats) -> str:
    """Process HTML file with current data"""
    html_path = Path("index.html")

    if not html_path.exists():
        raise FileNotFoundError("index.html not found")

    with open(html_path, 'r') as f:
        content = f.read()

    # Replace configuration values
    content = content.replace('value="2025-06-01"', f'value="{config.baseline_start}"')
    content = content.replace('value="2025-06-09"', f'value="{config.baseline_end}"')
    content = content.replace('value="now-12h"', f'value="{config.time_range}"')
    content = content.replace('value="1000"', f'value="{config.high_volume_threshold}"')
    content = content.replace('value="100"', f'value="{config.medium_volume_threshold}"')

    # 🚀 INJECT ELASTIC_COOKIE from environment
    elastic_cookie = os.environ.get('ELASTIC_COOKIE', '')
    content = content.replace('value=""', f'value="{elastic_cookie}"')

    # 🚀 ALSO INJECT AS GLOBAL JAVASCRIPT VARIABLE  
    if elastic_cookie:
        # Add script tag after the main.js import
        cookie_script = f"""
    <!-- Inject environment cookie -->
    <script>
        window.ELASTIC_COOKIE = "{elastic_cookie}";
        console.log('🚀 Environment cookie loaded:', window.ELASTIC_COOKIE ? 'Yes' : 'No');
    </script>"""
        content = content.replace('</head>', f'{cookie_script}\n</head>')

    # Update stats if they're displayed in the template
    content = content.replace('>0</div>', f'>{stats.critical_count}</div>')

    return content

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """Serve the dashboard with current configuration"""
    content = process_template(dashboard_state["config"], dashboard_state["stats"])
    return HTMLResponse(content=content)

@app.get("/api/config", response_model=DashboardConfig)
@limiter.limit("30 per minute")
async def get_config(request: Request):
    """Get current dashboard configuration"""
    return dashboard_state["config"]

@app.post("/api/config", response_model=DashboardConfig)
@limiter.limit("30 per minute")
async def update_config(request: Request, config: DashboardConfig):
    """Update dashboard configuration with validation"""
    dashboard_state["config"] = config

    # Broadcast update to WebSocket clients
    await broadcast_to_websockets(WebSocketMessage(
        type="config",
        data=config.model_dump()
    ))

    return config

@app.get("/api/stats", response_model=DashboardStats)
@limiter.limit("60 per minute")
async def get_stats(request: Request):
    """Get current dashboard statistics"""
    return dashboard_state["stats"]

@app.post("/api/refresh", response_model=Dict[str, Any])
@limiter.limit("20 per minute")
async def refresh_dashboard(request: Request, refresh_request: RefreshRequest):
    """Refresh dashboard data with new configuration"""
    try:
        # Update configuration
        dashboard_state["config"] = refresh_request.config

        # In a real implementation, this would fetch data from Elasticsearch
        # For now, we'll simulate some data
        dashboard_state["stats"] = DashboardStats(
            critical_count=2,
            warning_count=5,
            normal_count=15,
            increased_count=3,
            total_events=25
        )

        # Broadcast updates
        await broadcast_to_websockets(WebSocketMessage(
            type="stats",
            data=dashboard_state["stats"].model_dump()
        ))

        return {
            "status": "success",
            "config": dashboard_state["config"].model_dump(),
            "stats": dashboard_state["stats"].model_dump()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    active_connections.append(websocket)

    # Send initial state
    await websocket.send_json({
        "type": "config",
        "data": dashboard_state["config"].model_dump()
    })
    await websocket.send_json({
        "type": "stats",
        "data": dashboard_state["stats"].model_dump()
    })

    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif message.get("type") == "refresh":
                # Trigger refresh
                await refresh_dashboard(RefreshRequest(
                    config=dashboard_state["config"],
                    force_refresh=True
                ))
    except WebSocketDisconnect:
        active_connections.remove(websocket)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        cors_proxy_status = False
        if cors_process:
            try:
                cors_proxy_status = cors_process.poll() is None
            except Exception:
                cors_proxy_status = False
                
        return {
            "status": "healthy",
            "cors_proxy": cors_proxy_status,
            "websocket_connections": len(active_connections)
        }
    except Exception as e:
        # Ensure we always return a valid response
        return {
            "status": "error",
            "error": str(e),
            "cors_proxy": False,
            "websocket_connections": 0
        }

@app.get("/api/test-rate-limit")
@limiter.limit("5 per minute")
async def test_rate_limit(request: Request):
    """Test endpoint with strict rate limit (5 per minute)"""
    return {
        "message": "Rate limit test successful",
        "client_ip": get_real_client_ip(request),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/fetch-kibana-data", response_model=KibanaResponse)
@limiter.limit("10 per minute")  # Expensive operation - limit to 10 per minute
async def fetch_kibana_data(
    request: Request,
    kibana_request: KibanaQueryRequest,
    x_elastic_cookie: str = Header(None, alias="X-Elastic-Cookie")
):
    """
    Fetch data from Kibana/Elasticsearch with typed validation and performance tracking.

    This endpoint replaces the bash script fetch_kibana_data.sh with:
    - Type-safe request/response validation
    - Built-in caching to reduce Kibana load
    - Performance monitoring with WebSocket broadcasts
    - Proper error handling

    Args:
        request: Query configuration with Elasticsearch DSL
        x_elastic_cookie: Elastic authentication cookie (required)

    Returns:
        KibanaResponse: Typed response from Elasticsearch

    Raises:
        HTTPException: On authentication failure or query errors
    """
    if not x_elastic_cookie:
        raise HTTPException(status_code=401, detail="X-Elastic-Cookie header is required")

    # Generate cache key from query
    query_json = json.dumps(kibana_request.query.model_dump(), sort_keys=True)
    cache_key = hashlib.md5(query_json.encode()).hexdigest()

    # Create query ID for tracking
    query_id = f"kibana_{cache_key[:8]}_{int(time.time())}"

    # Start performance tracking
    start_time = time.time()

    # Structured logging - query start
    logger.info("query_execute_start", 
        query_id=query_id,
        cache_key=cache_key,
        query_size=len(query_json),
        client_ip=get_real_client_ip(request)
    )

    # Check cache if not forcing refresh
    if not kibana_request.force_refresh and cache_key in app.state.cache:
        cache_timestamp = app.state.cache_timestamps.get(cache_key, 0)
        if time.time() - cache_timestamp < app.state.cache_timeout:
            # Cache hit
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)

            logger.info("query_cache_hit",
                query_id=query_id,
                duration_ms=duration_ms,
                cache_age_seconds=int(time.time() - cache_timestamp)
            )

            # Create performance metrics
            metrics = QueryPerformanceMetrics(
                query_id=query_id,
                start_time=start_time,
                end_time=end_time,
                duration_ms=duration_ms,
                cache_hit=True,
                query_type="elasticsearch"
            )

            # Broadcast performance metrics
            await broadcast_to_websockets(PerformanceWebSocketMessage(
                type="performance_metrics",
                data=metrics.model_dump()
            ))

            return app.state.cache[cache_key]

    # Cache miss - execute query
    try:
        # Build Kibana URL
        kibana_url = f"{KIBANA_URL}{KIBANA_SEARCH_PATH}"

        # Prepare headers
        headers = {
            "Content-Type": "application/json",
            "kbn-xsrf": "true",
            "Cookie": f"sid={x_elastic_cookie}"
        }

        # Wrap Elasticsearch query with circuit breaker
        @es_circuit_breaker
        async def execute_es_query():
            async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
                return await client.post(
                    kibana_url,
                    json=kibana_request.query.model_dump(),
                    headers=headers
                )
        
        # Execute query with circuit breaker protection
        try:
            response = await execute_es_query()
        except Exception as e:
            logger.error("circuit_breaker_open",
                query_id=query_id,
                error=str(e),
                breaker_state=es_circuit_breaker.state
            )
            raise HTTPException(
                status_code=503,
                detail="Service temporarily unavailable due to circuit breaker"
            )

        # Handle non-200 responses
        if response.status_code != 200:
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)

            logger.error("query_execute_error",
                query_id=query_id,
                status_code=response.status_code,
                duration_ms=duration_ms,
                error_type="http_error"
            )

            # Try to parse error response
            try:
                error_data = response.json()
                error_message = error_data.get("error", {}).get("reason", f"HTTP {response.status_code}")
            except:
                error_message = f"HTTP {response.status_code}: {response.text[:200]}"

            raise HTTPException(
                status_code=response.status_code,
                detail=f"Kibana error: {error_message}"
            )

        # Parse response
        response_data = response.json()

        # Validate response structure
        kibana_response = KibanaResponse(**response_data)

        # Check for Elasticsearch errors
        if kibana_response.error:
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)

            logger.error("elasticsearch_error",
                query_id=query_id,
                es_error_type=kibana_response.error.get('type', 'unknown'),
                es_error_reason=kibana_response.error.get('reason', 'Unknown error'),
                duration_ms=duration_ms
            )

            raise HTTPException(
                status_code=400,
                detail=f"Elasticsearch error: {kibana_response.error.get('reason', 'Unknown error')}"
            )

        # Success - calculate final metrics
        end_time = time.time()
        duration_ms = int((end_time - start_time) * 1000)

        logger.info("query_execute_success",
            query_id=query_id,
            es_took_ms=kibana_response.took,
            total_duration_ms=duration_ms,
            hits_total=kibana_response.hits.total.get('value', 0) if kibana_response.hits else 0,
            circuit_breaker_state=es_circuit_breaker.state
        )

        # Update cache
        app.state.cache[cache_key] = kibana_response
        app.state.cache_timestamps[cache_key] = time.time()

        # Create performance metrics
        metrics = QueryPerformanceMetrics(
            query_id=query_id,
            start_time=start_time,
            end_time=end_time,
            duration_ms=duration_ms,
            cache_hit=False,
            query_type="elasticsearch"
        )

        # Broadcast performance metrics
        await broadcast_to_websockets(PerformanceWebSocketMessage(
            type="performance_metrics",
            data=metrics.model_dump()
        ))

        # Check for slow queries
        if metrics.is_critical:
            logger.warning("performance_critical",
                query_id=query_id,
                duration_ms=duration_ms,
                threshold_ms=5000,
                severity="critical"
            )
            # Broadcast warning
            await broadcast_to_websockets(WebSocketMessage(
                type="error",
                data={
                    "level": "critical",
                    "message": f"Query execution critically slow: {duration_ms}ms",
                    "query_id": query_id
                }
            ))
        elif metrics.is_slow:
            logger.warning("performance_slow",
                query_id=query_id,
                duration_ms=duration_ms,
                threshold_ms=3000,
                severity="warning"
            )
            # Broadcast warning
            await broadcast_to_websockets(WebSocketMessage(
                type="error",
                data={
                    "level": "warning",
                    "message": f"Query execution slow: {duration_ms}ms",
                    "query_id": query_id
                }
            ))

        return kibana_response

    except httpx.RequestError as e:
        end_time = time.time()
        duration_ms = int((end_time - start_time) * 1000)

        logger.error("query_connection_error",
            query_id=query_id,
            error=str(e),
            duration_ms=duration_ms,
            error_type="connection_error"
        )

        raise HTTPException(
            status_code=502,
            detail=f"Connection to Kibana failed: {str(e)}"
        )
    except Exception as e:
        end_time = time.time()
        duration_ms = int((end_time - start_time) * 1000)

        logger.error("query_internal_error",
            query_id=query_id,
            error=str(e),
            duration_ms=duration_ms,
            error_type=type(e).__name__
        )

        if isinstance(e, HTTPException):
            raise

        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )

@app.middleware("http")
async def track_metrics(request: Request, call_next):
    """Middleware to track request metrics"""
    # Skip static files and WebSocket
    if request.url.path.startswith(("/assets", "/tests", "/ws")):
        return await call_next(request)
    
    start_time = time.time()
    
    try:
        response = await call_next(request)
        duration_ms = (time.time() - start_time) * 1000
        
        # Record metrics
        metrics_tracker.record_request(
            endpoint=request.url.path,
            duration_ms=duration_ms,
            success=response.status_code < 400,
            mode="fastapi"
        )
        
        return response
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        # Record error metrics
        metrics_tracker.record_request(
            endpoint=request.url.path,
            duration_ms=duration_ms,
            success=False,
            mode="fastapi"
        )
        
        raise

@app.get("/api/metrics")
async def get_metrics():
    """Get current performance metrics"""
    return metrics_tracker.get_metrics()

@app.post("/api/metrics/reset")
async def reset_metrics():
    """Reset metrics (admin endpoint)"""
    metrics_tracker.reset()
    return {"status": "metrics reset", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    # Configure uvicorn to use our structured logger
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(message)s",
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
        },
        "root": {
            "level": "INFO",
            "handlers": ["default"],
        },
    }
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        log_config=log_config,
        reload=False  # Set to True for development
    )
