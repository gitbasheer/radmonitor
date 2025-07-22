#!/usr/bin/env python3
"""
Unified FastAPI Server for RAD Monitor
Fixed version without src/ directory dependencies

NOTE: For production use, see server_production.py which includes:
- Security hardening (CORS, authentication, input validation)
- Performance optimizations (connection pooling, caching)
- Monitoring and metrics (Prometheus, structured logging)
- Error handling and circuit breakers
- Health checks and graceful shutdown
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

# Load environment variables
load_dotenv()

# Add the parent directory to the path to ensure local imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import execute_elasticsearch_query from the local elasticsearch module
from elasticsearch import execute_elasticsearch_query

# ====================
# Configuration Loading
# ====================

try:
    from config import get_config, AppConfig

    # Load configuration
    config = get_config()
    print(f"✅ Configuration loaded successfully (environment: {config.environment})\n")

except Exception as e:
    print(f"❌ Failed to load configuration: {e}", file=sys.stderr)
    sys.exit(1)

# Simple models replacing src.data.models
class TrafficEvent(BaseModel):
    """Traffic event model"""
    event_id: str
    timestamp: datetime
    count: int

class ProcessingConfig(BaseModel):
    """Processing configuration model"""
    baseline_start: str
    baseline_end: str
    time_range: str

# Configure structured logging
log_processors = [
    structlog.stdlib.filter_by_level,
    structlog.stdlib.add_logger_name,
    structlog.stdlib.add_log_level,
    structlog.stdlib.PositionalArgumentsFormatter(),
    structlog.processors.TimeStamper(fmt="iso"),
    structlog.processors.StackInfoRenderer(),
    structlog.processors.format_exc_info,
    structlog.processors.UnicodeDecoder(),
]

# Use JSON renderer in production
if config.environment == "production":
    log_processors.append(structlog.processors.JSONRenderer())
else:
    log_processors.append(structlog.dev.ConsoleRenderer())

structlog.configure(
    processors=log_processors,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# ====================
# Configuration
# ====================

# Server configuration with safe access
SERVER_PORT = config.server.port if hasattr(config, 'server') and hasattr(config.server, 'port') else int(os.getenv('PORT', 8000))
SERVER_HOST = config.server.host if hasattr(config, 'server') and hasattr(config.server, 'host') else os.getenv('HOST', '0.0.0.0')
ENVIRONMENT = config.environment if hasattr(config, 'environment') else os.getenv('ENVIRONMENT', 'development')

# Kibana configuration with safe access
ELASTICSEARCH_URL = str(config.elasticsearch.url) if hasattr(config, 'elasticsearch') and hasattr(config.elasticsearch, 'url') else os.getenv('ELASTICSEARCH_URL', 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/')
KIBANA_SEARCH_PATH = config.kibana.search_path if hasattr(config, 'kibana') and hasattr(config.kibana, 'search_path') else '/api/console/proxy?path=traffic-*/_search&method=POST'

# Cache configuration with safe access
redis_ttl = 300  # default
if hasattr(config, 'redis') and config.redis:
    redis_ttl = getattr(config.redis, 'ttl', 300) if getattr(config.redis, 'enabled', False) else 300
CACHE_TTL = timedelta(seconds=redis_ttl)

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
    total_events: int = 0
    last_update: str = Field(default_factory=lambda: datetime.now().isoformat())

class WebSocketMessage(BaseModel):
    """WebSocket message model"""
    type: str
    data: Dict[str, Any]
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

class ElasticsearchQuery(BaseModel):
    """Elasticsearch query model for validation"""
    query: Dict[str, Any]
    size: int = Field(default=0, ge=0, description="Number of documents to return")
    aggs: Optional[Dict[str, Any]] = Field(default=None, description="Aggregations")

class KibanaQueryRequest(BaseModel):
    """Request model for Kibana queries"""
    query: Dict[str, Any] = Field(..., description="Elasticsearch query body")
    force_refresh: bool = Field(default=False, description="Bypass cache and force fresh query")

class PortCleanupRequest(BaseModel):
    """Request model for port cleanup utility"""
    ports: List[int] = Field(default=[8000], description="Ports to clean up")
    force: bool = Field(default=False, description="Force kill processes")

class ConfigUpdateRequest(BaseModel):
    """Configuration update request"""
    key: str
    value: Any

class DashboardQueryResponse(BaseModel):
    """Response model for dashboard queries"""
    data: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    cached: bool = False
    query_time_ms: float

# ====================
# Application State
# ====================

class AppState:
    """Application state management"""
    def __init__(self):
        self.cache = {}
        self.websocket_clients: List[WebSocket] = []
        self.metrics = {
            "requests_total": 0,
            "requests_success": 0,
            "requests_failed": 0,
            "websocket_connections": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "avg_response_time_ms": 0
        }
        self.start_time = datetime.now()
        self.elasticsearch_healthy = False
        self.last_health_check = None

app_state = AppState()

# ====================
# Utilities
# ====================

def get_cache_key(query: Dict[str, Any]) -> str:
    """Generate cache key from query"""
    return json.dumps(query, sort_keys=True)

def determine_rad_type_from_eid(eid: str) -> str:
    """Determine RAD type from EID using registry mappings"""
    # Check registry first
    for mapping_eid, mapping in eid_registry.items():
        if mapping_eid.upper() in eid.upper():
            return mapping.rad_type
    
    # Fallback to pattern matching
    eid_upper = eid.upper()
    if 'LOGIN' in eid_upper or 'AUTH' in eid_upper:
        return 'login'
    elif 'API' in eid_upper or 'ENDPOINT' in eid_upper:
        return 'api_call'
    elif 'PAGE' in eid_upper or 'VIEW' in eid_upper:
        return 'page_view'
    elif 'DOWNLOAD' in eid_upper or 'FILE' in eid_upper:
        return 'file_download'
    
    return 'custom'


# ====================
# Circuit Breaker for External Services
# ====================

es_circuit_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    exclude=[httpx.TimeoutException]
)

# ====================
# Rate Limiter Setup
# ====================

limiter = Limiter(key_func=get_remote_address)

# ====================
# Lifespan Management
# ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting RAD Monitor Server",
                port=SERVER_PORT,
                environment=ENVIRONMENT)

    # Initialize health check
    app_state.last_health_check = datetime.now()

    try:
        yield
    finally:
        # Shutdown - this will run even if cancelled
        logger.info("Initiating graceful shutdown...")

        # Close WebSocket connections gracefully
        if app_state.websocket_clients:
            logger.info(f"Closing {len(app_state.websocket_clients)} WebSocket connections...")
            close_tasks = []
            for ws in app_state.websocket_clients:
                try:
                    close_tasks.append(ws.close(code=1001, reason="Server shutting down"))
                except:
                    pass

            # Wait for all connections to close with timeout
            if close_tasks:
                try:
                    await asyncio.wait_for(
                        asyncio.gather(*close_tasks, return_exceptions=True),
                        timeout=5.0
                    )
                except asyncio.TimeoutError:
                    logger.warning("Some WebSocket connections did not close in time")

        # Final cleanup
        logger.info("Graceful shutdown complete")

# ====================
# FastAPI Application
# ====================

app = FastAPI(
    title="RAD Monitor Unified Server",
    description="Unified server with dashboard, API, WebSocket, and utilities",
    version="2.0.0",
    lifespan=lifespan
)

# Add exception handler for rate limiting
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ====================
# Middleware
# ====================

# CORS Middleware
# Configure allowed origins from configuration
ALLOWED_ORIGINS = config.cors_proxy.allowed_origins.copy()

# Add production origins if running in production
if config.environment == "production":
    production_origins = [
        "https://vh-rad-traffic-monitor.vercel.app",
        "https://vh-rad-traffic-monitor.github.io"
    ]
    ALLOWED_ORIGINS.extend(production_origins)

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
)

@app.middleware("http")
async def add_metrics(request: Request, call_next):
    """Add request metrics"""
    start_time = time.time()

    # Track request
    app_state.metrics["requests_total"] += 1

    try:
        response = await call_next(request)

        if response.status_code < 400:
            app_state.metrics["requests_success"] += 1
        else:
            app_state.metrics["requests_failed"] += 1

        # Update average response time
        duration_ms = (time.time() - start_time) * 1000
        current_avg = app_state.metrics["avg_response_time_ms"]
        total_requests = app_state.metrics["requests_success"] + app_state.metrics["requests_failed"]
        app_state.metrics["avg_response_time_ms"] = (
            (current_avg * (total_requests - 1) + duration_ms) / total_requests
        )

        return response

    except Exception as e:
        app_state.metrics["requests_failed"] += 1
        raise

# ====================
# Static Files & Homepage
# ====================

# Get project root
PROJECT_ROOT = Path(__file__).parent.parent

# Mount static directories
# First check if we have dist/assets (production build), otherwise use regular assets
if (PROJECT_ROOT / "dist" / "assets").exists():
    app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "dist" / "assets"), name="assets")
else:
    app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "assets"), name="assets")

app.mount("/node_modules", StaticFiles(directory=PROJECT_ROOT / "node_modules"), name="node_modules")
app.mount("/wam-visualizer", StaticFiles(directory=PROJECT_ROOT / "wam-visualizer"), name="wam-visualizer")

# Mount the entire dist directory to serve index.html and other files
if (PROJECT_ROOT / "dist").exists():
    app.mount("/dist", StaticFiles(directory=PROJECT_ROOT / "dist"), name="dist")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serve the main dashboard"""
    # Check dist folder first, then root
    dist_index = PROJECT_ROOT / "dist" / "index.html"
    root_index = PROJECT_ROOT / "index.html"
    
    if dist_index.exists():
        return FileResponse(dist_index)
    elif root_index.exists():
        return FileResponse(root_index)
    else:
        raise HTTPException(status_code=404, detail="index.html not found")

@app.get("/wam-visualizer.html", response_class=HTMLResponse)
async def serve_wam_visualizer():
    """Serve the WAM visualizer page"""
    wam_path = PROJECT_ROOT / "wam-visualizer.html"
    if wam_path.exists():
        return FileResponse(wam_path)
    else:
        raise HTTPException(status_code=404, detail="WAM visualizer not found")

@app.get("/wam_test_guided.html", response_class=HTMLResponse)
async def serve_wam_test():
    """Serve the WAM test page"""
    wam_test_path = PROJECT_ROOT / "wam_test_guided.html"
    if wam_test_path.exists():
        return FileResponse(wam_test_path)
    else:
        raise HTTPException(status_code=404, detail="WAM test page not found")

# ====================
# Health & Status Endpoints
# ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # Check Elasticsearch connectivity
    es_healthy = False
    es_message = "Not checked"

    if datetime.now() - app_state.last_health_check > timedelta(minutes=1):
        try:
            test_query = {"query": {"match_all": {}}, "size": 0}
            result = await execute_elasticsearch_query(test_query)
            es_healthy = result.get("success", False)
            es_message = "Connected" if es_healthy else result.get("error", "Unknown error")
            app_state.elasticsearch_healthy = es_healthy
            app_state.last_health_check = datetime.now()
        except Exception as e:
            es_message = str(e)
            app_state.elasticsearch_healthy = False
    else:
        es_healthy = app_state.elasticsearch_healthy
        es_message = "Connected (cached)" if es_healthy else "Disconnected (cached)"

    return {
        "status": "healthy" if es_healthy else "degraded",
        "timestamp": datetime.now().isoformat(),
        "environment": ENVIRONMENT,
        "uptime_seconds": (datetime.now() - app_state.start_time).total_seconds(),
        "elasticsearch_status": "connected" if es_healthy else "disconnected",
        "elasticsearch_message": es_message,
        "websocket_clients": len(app_state.websocket_clients),
        "cache_size": len(app_state.cache)
    }

@app.get("/favicon.ico")
async def favicon():
    """Serve favicon if it exists"""
    favicon_path = PROJECT_ROOT / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    else:
        raise HTTPException(status_code=404, detail="Favicon not found")

# ====================
# Authentication Endpoint
# ====================

class AuthValidateRequest(BaseModel):
    """Request model for auth validation"""
    sid_cookie: str = Field(..., description="Enter your sid cookie value (e.g., Fe26.2**...)")

@app.post("/api/v1/auth/validate")
async def validate_auth(request: AuthValidateRequest):
    """Validate authentication cookie against Kibana
    
    Enter your sid cookie value (the long Fe26.2** string from Kibana).
    The endpoint will test it against Elasticsearch to verify it's valid.
    """
    
    # Extract the sid value
    sid_value = request.sid_cookie.strip()
    
    # Remove sid= prefix if they included it
    if sid_value.startswith("sid="):
        sid_value = sid_value.replace("sid=", "")
    
    # Format properly for Elasticsearch
    sid_cookie = f"sid={sid_value}"
    
    # Test the cookie by making a simple Elasticsearch query
    try:
        test_query = {
            "query": {"match_all": {}},
            "size": 0
        }
        result = await execute_elasticsearch_query(test_query, sid_cookie)

        if result.get("success"):
            return {
                "authenticated": True,
                "valid": True,
                "message": "Cookie is valid",
                "timestamp": datetime.now().isoformat()
            }
        else:
            raise HTTPException(
                status_code=401,
                detail=result.get("error", "Invalid authentication cookie")
            )
    except Exception as e:
        logger.error(f"Auth validation error: {e}")
        raise HTTPException(status_code=401, detail=str(e))

# ====================
# WebSocket Endpoint
# ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    app_state.websocket_clients.append(websocket)
    app_state.metrics["websocket_connections"] = len(app_state.websocket_clients)

    logger.info(f"WebSocket client connected. Total clients: {len(app_state.websocket_clients)}")

    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()

            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            elif data.get("type") == "subscribe":
                # Handle subscription requests
                await websocket.send_json({
                    "type": "subscribed",
                    "channel": data.get("channel", "default"),
                    "timestamp": datetime.now().isoformat()
                })
            else:
                # Echo back unknown messages
                await websocket.send_json({
                    "type": "echo",
                    "data": data,
                    "timestamp": datetime.now().isoformat()
                })

    except WebSocketDisconnect:
        app_state.websocket_clients.remove(websocket)
        app_state.metrics["websocket_connections"] = len(app_state.websocket_clients)
        logger.info(f"WebSocket client disconnected. Total clients: {len(app_state.websocket_clients)}")

# ====================
# Configuration API Endpoints (replacing config_router)
# ====================

@app.get("/api/v1/config/settings")
async def get_config_settings():
    """Get current configuration settings"""
    # Access the global config properly with safe attribute access
    app_config = config
    
    # Build response with safe attribute access
    response = {}
    
    # Add elasticsearch config if it exists
    if hasattr(app_config, 'elasticsearch') and app_config.elasticsearch:
        response["elasticsearch"] = {
            "url": str(app_config.elasticsearch.url) if hasattr(app_config.elasticsearch, 'url') else None,
            "index_pattern": getattr(app_config.elasticsearch, 'index_pattern', 'traffic-*')
        }
    else:
        # Fallback to default values
        response["elasticsearch"] = {
            "url": os.getenv('ELASTICSEARCH_URL', 'https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243/'),
            "index_pattern": "traffic-*"
        }
    
    # Add kibana config if it exists
    if hasattr(app_config, 'kibana') and app_config.kibana:
        response["kibana"] = {
            "url": str(app_config.kibana.url) if hasattr(app_config.kibana, 'url') else None
        }
    else:
        response["kibana"] = {
            "url": os.getenv('ELASTICSEARCH_URL', 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/')
        }
    
    # Add processing config if it exists
    if hasattr(app_config, 'processing') and app_config.processing:
        response["processing"] = app_config.processing.model_dump()
    else:
        response["processing"] = {
            "baseline_start": "2025-06-01",
            "baseline_end": "2025-06-09",
            "current_time_range": "now-12h",
            "high_volume_threshold": 1000,
            "medium_volume_threshold": 100,
            "critical_threshold": -80,
            "warning_threshold": -50,
            "min_daily_volume": 100
        }
    
    # Add dashboard config if it exists
    if hasattr(app_config, 'dashboard') and app_config.dashboard:
        response["dashboard"] = app_config.dashboard.model_dump()
    else:
        response["dashboard"] = {
            "refresh_interval": 300,
            "max_events_display": 200,
            "enable_websocket": True,
            "theme": "light"
        }
    
    # Add rad_types if it exists
    if hasattr(app_config, 'rad_types') and app_config.rad_types:
        response["rad_types"] = {k: v.model_dump() for k, v in app_config.rad_types.items()}
    else:
        response["rad_types"] = {}
    
    return response

@app.post("/api/v1/config/settings")
async def update_config_settings(update: ConfigUpdateRequest):
    """Update configuration setting (in-memory only for this server)"""
    # This is a simplified version - in production you'd want persistence
    return {
        "message": "Configuration update received",
        "key": update.key,
        "value": update.value,
        "note": "Updates are in-memory only for this session"
    }

@app.get("/api/v1/config/health")
async def config_health():
    """Check configuration health"""
    app_config = config
    
    # Build health response with safe attribute access
    health_status = {
        "healthy": True,
        "config_loaded": True,
        "elasticsearch_configured": False,
        "kibana_configured": False,
        "environment": "development",
        "redis_enabled": False
    }
    
    # Check elasticsearch configuration
    if hasattr(app_config, 'elasticsearch') and app_config.elasticsearch:
        health_status["elasticsearch_configured"] = bool(getattr(app_config.elasticsearch, 'url', None))
    
    # Check kibana configuration
    if hasattr(app_config, 'kibana') and app_config.kibana:
        health_status["kibana_configured"] = bool(getattr(app_config.kibana, 'url', None))
    
    # Get environment
    if hasattr(app_config, 'environment'):
        health_status["environment"] = app_config.environment
    
    # Check redis configuration
    if hasattr(app_config, 'redis') and app_config.redis:
        health_status["redis_enabled"] = getattr(app_config.redis, 'enabled', False)
    
    return health_status

# ====================
# Dashboard API Endpoints
# ====================

@app.get("/api/v1/dashboard/config", response_model=DashboardConfig)
async def get_dashboard_config():
    """Get dashboard configuration"""
    app_config = config
    
    # Build dashboard config with safe attribute access
    baseline_start = "2025-06-01"
    baseline_end = "2025-06-09"
    
    if hasattr(app_config, 'processing') and app_config.processing:
        baseline_start = getattr(app_config.processing, 'baseline_start', baseline_start)
        baseline_end = getattr(app_config.processing, 'baseline_end', baseline_end)
    
    # Get other config values with safe defaults
    time_range = "now-12h"
    critical_threshold = -80
    warning_threshold = -50
    high_volume_threshold = 1000
    medium_volume_threshold = 100
    
    if hasattr(app_config, 'processing') and app_config.processing:
        time_range = getattr(app_config.processing, 'current_time_range', time_range)
        critical_threshold = getattr(app_config.processing, 'critical_threshold', critical_threshold)
        warning_threshold = getattr(app_config.processing, 'warning_threshold', warning_threshold)
        high_volume_threshold = getattr(app_config.processing, 'high_volume_threshold', high_volume_threshold)
        medium_volume_threshold = getattr(app_config.processing, 'medium_volume_threshold', medium_volume_threshold)
    
    return DashboardConfig(
        baseline_start=baseline_start,
        baseline_end=baseline_end,
        time_range=time_range,
        critical_threshold=critical_threshold,
        warning_threshold=warning_threshold,
        high_volume_threshold=high_volume_threshold,
        medium_volume_threshold=medium_volume_threshold
    )

@app.post("/api/v1/dashboard/config", response_model=DashboardConfig)
async def update_dashboard_config(config: DashboardConfig):
    """Update dashboard configuration (in-memory)"""
    # Store in app state for this session
    app_state.dashboard_config = config
    return config

@app.get("/api/v1/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get current dashboard statistics"""
    # This would normally query actual data
    # For now, return mock stats
    return DashboardStats(
        critical_count=0,
        warning_count=0,
        normal_count=0,
        increased_count=0,
        total_events=0,
        last_update=datetime.now().isoformat()
    )

@app.post("/api/v1/dashboard/query", response_model=DashboardQueryResponse)
@limiter.limit("10/minute")
async def query_dashboard_data(
    request: Request,
    query_request: KibanaQueryRequest,
    authorization: Optional[str] = Header(None),
    cookie: Optional[str] = Header(None),
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Execute dashboard query against Elasticsearch"""
    # Check cache first
    cache_key = get_cache_key(query_request.query)

    if not query_request.force_refresh and cache_key in app_state.cache:
        cached_entry = app_state.cache[cache_key]
        if datetime.now() - cached_entry["timestamp"] < CACHE_TTL:
            app_state.metrics["cache_hits"] += 1
            return DashboardQueryResponse(
                data=cached_entry["data"],
                metadata=cached_entry["metadata"],
                cached=True,
                query_time_ms=0
            )

    app_state.metrics["cache_misses"] += 1

    # Execute query - check all possible auth headers
    # Try Authorization header first (new standard), then fallback to others
    auth_cookie = None
    
    if authorization and authorization.startswith("Bearer "):
        logger.info("Using Authorization header (Bearer token)")
        auth_cookie = authorization.replace("Bearer ", "").strip()
    elif cookie:
        logger.info("Using Cookie header")
        auth_cookie = cookie
    elif x_elastic_cookie:
        logger.info("Using X-Elastic-Cookie header")
        auth_cookie = x_elastic_cookie
    elif authorization:
        # Non-Bearer authorization header (backward compatibility)
        logger.info("Using Authorization header (legacy)")
        auth_cookie = authorization
    else:
        logger.warning("No authentication cookie found")
    
    if not auth_cookie:
        raise HTTPException(status_code=401, detail="Authentication credentials not found")
    
    # Ensure cookie has sid= prefix
    if not auth_cookie.startswith("sid="):
        auth_cookie = f"sid={auth_cookie}"

    # Continue with query execution
    result = await execute_elasticsearch_query(query_request.query, auth_cookie)

    if not result["success"]:
        logger.error("Query Execution Failed", error=result.get('error', 'Unknown'), details=result.get('details', 'No details'))
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {result.get('error', 'Unknown error')}"
        )

    # Process results
    data = result["data"]
    processed_data = []

    # In development mode with mock data, extract from hits
    if ENVIRONMENT == 'development' and "hits" in data and "hits" in data["hits"]:
        # Define RAD type colors and display names
        rad_type_config = {
            "login": {"color": "#6B7280", "display": "Login"},
            "api_call": {"color": "#3B82F6", "display": "API Call"},
            "page_view": {"color": "#10B981", "display": "Page View"},
            "file_download": {"color": "#F59E0B", "display": "File Download"}
        }
        
        for hit in data["hits"]["hits"]:
            source = hit.get("_source", {})
            rad_type = source.get("rad_type", "")
            rad_config = rad_type_config.get(rad_type, {"color": "#6B7280", "display": rad_type.title()})
            
            impact = source.get("impact", "").lower()
            impact_class = "high" if impact == "high" else "medium" if impact == "medium" else "low"
            
            processed_data.append({
                "id": f"{source.get('name', '')}_{source.get('timestamp', '')}",
                "name": source.get("name", ""),
                "radType": rad_type,
                "radColor": rad_config["color"],
                "radDisplayName": rad_config["display"],
                "status": source.get("status", "").upper(),
                "score": source.get("score", 0),
                "current": source.get("current", 0),
                "baseline": source.get("baseline", 0),
                "impact": source.get("impact", ""),
                "impactClass": impact_class,
                "timestamp": source.get("timestamp", ""),
                "kibanaUrl": "#"
            })
    # Extract events from aggregations if present (production mode)
    elif "aggregations" in data and "events" in data["aggregations"]:
        # Define RAD type colors and display names
        rad_type_config = {
            "login": {"color": "#6B7280", "display": "Login"},
            "api_call": {"color": "#3B82F6", "display": "API Call"},
            "page_view": {"color": "#10B981", "display": "Page View"},
            "file_download": {"color": "#F59E0B", "display": "File Download"},
            "custom": {"color": "#8B5CF6", "display": "Custom"}
        }
        
        buckets = data["aggregations"]["events"].get("buckets", [])
        for bucket in buckets:
            event_id = bucket["key"]
            current = bucket.get("current", {}).get("doc_count", 0)
            baseline = bucket.get("baseline", {}).get("doc_count", 0)
            
            # Determine RAD type from EID
            rad_type = determine_rad_type_from_eid(event_id)
            rad_config = rad_type_config.get(rad_type, {"color": "#6B7280", "display": "Custom"})
            
            # Calculate score and status
            score = 0
            if baseline > 0:
                score = int(((current - baseline) / baseline) * 100)
            
            status = "NORMAL"
            if score < -30:
                status = "CRITICAL"
            elif score < -20:
                status = "WARNING"
            elif score > 50:
                status = "INCREASED"
            
            processed_data.append({
                "id": event_id,
                "name": event_id,
                "event_id": event_id,
                "radType": rad_type,
                "radColor": rad_config["color"],
                "radDisplayName": rad_config["display"],
                "status": status,
                "score": score,
                "count": bucket["doc_count"],
                "current": current,
                "baseline": baseline,
                "impact": "High" if abs(score) > 50 else "Medium" if abs(score) > 30 else "Low",
                "timestamp": datetime.now().isoformat(),
                "kibanaUrl": f"/app/discover#/?_g=(filters:!(),time:(from:now-24h,to:now))&_a=(query:(match_phrase:(event_id:'{event_id}')))"
            })

    # Cache successful results
    app_state.cache[cache_key] = {
        "data": processed_data,
        "metadata": {
            "took": data.get("took", 0),
            "total_hits": data.get("hits", {}).get("total", {}).get("value", 0)
        },
        "timestamp": datetime.now()
    }

    # Limit cache size
    if len(app_state.cache) > 100:
        oldest_key = min(app_state.cache.keys(),
                        key=lambda k: app_state.cache[k]["timestamp"])
        del app_state.cache[oldest_key]

    return DashboardQueryResponse(
        data=processed_data,
        metadata={
            "took": data.get("took", 0),
            "total_hits": data.get("hits", {}).get("total", {}).get("value", 0)
        },
        cached=False,
        query_time_ms=result["query_time_ms"]
    )

# ====================
# Authentication Endpoints
# ====================

@app.get("/api/v1/auth/status")
async def auth_status(
    authorization: Optional[str] = Header(None),
    cookie: Optional[str] = Header(None),
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Check authentication status"""
    # Check Authorization header first (new standard), then others
    auth_cookie = None
    method = None
    
    if authorization and authorization.startswith("Bearer "):
        auth_cookie = authorization.replace("Bearer ", "").strip()
        method = "bearer"
    elif cookie:
        auth_cookie = cookie
        method = "cookie"
    elif x_elastic_cookie:
        auth_cookie = x_elastic_cookie
        method = "x-elastic-cookie"

    if auth_cookie:
        logger.info(f"Auth status check - {method} present")
    else:
        logger.info("Auth status check - No authentication found")

    return {
        "authenticated": bool(auth_cookie),
        "method": method,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/auth/logout")
async def logout():
    """Logout endpoint (placeholder)"""
    return {
        "message": "Logout successful",
        "timestamp": datetime.now().isoformat()
    }

# ====================
# Kibana Proxy Endpoints
# ====================

@app.post("/api/v1/kibana/proxy")
@app.post("/kibana-proxy")  # Legacy compatibility
@limiter.limit("20/minute")
async def kibana_proxy(
    request: Request,
    body: Dict[str, Any],
    authorization: Optional[str] = Header(None),
    cookie: Optional[str] = Header(None),
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Proxy requests to Kibana (CORS bypass)"""
    # Check Authorization header first (new standard), then others
    auth_cookie = None
    
    if authorization and authorization.startswith("Bearer "):
        auth_cookie = authorization.replace("Bearer ", "").strip()
    elif cookie:
        auth_cookie = cookie
    elif x_elastic_cookie:
        auth_cookie = x_elastic_cookie

    if not auth_cookie:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Use Authorization: Bearer sid=..."
        )
    
    # Ensure cookie has sid= prefix
    if not auth_cookie.startswith("sid="):
        auth_cookie = f"sid={auth_cookie}"

    # Execute the query
    result = await execute_elasticsearch_query(body, auth_cookie)

    if result["success"]:
        return result["data"]
    else:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Proxy request failed")
        )

# ====================
# Metrics & Monitoring
# ====================

@app.get("/api/v1/metrics")
async def get_metrics():
    """Get server metrics"""
    return {
        "uptime_seconds": (datetime.now() - app_state.start_time).total_seconds(),
        "metrics": app_state.metrics,
        "cache_info": {
            "size": len(app_state.cache),
            "hit_rate": (
                app_state.metrics["cache_hits"] /
                (app_state.metrics["cache_hits"] + app_state.metrics["cache_misses"])
                if (app_state.metrics["cache_hits"] + app_state.metrics["cache_misses"]) > 0
                else 0
            )
        }
    }

@app.post("/api/v1/metrics/reset")
async def reset_metrics():
    """Reset metrics (admin endpoint)"""
    app_state.metrics = {
        "requests_total": 0,
        "requests_success": 0,
        "requests_failed": 0,
        "websocket_connections": len(app_state.websocket_clients),
        "cache_hits": 0,
        "cache_misses": 0,
        "avg_response_time_ms": 0
    }
    return {"message": "Metrics reset", "timestamp": datetime.now().isoformat()}

# ====================
# EID Registry Endpoints
# ====================

class EIDMapping(BaseModel):
    """Model for EID to RAD mapping"""
    eid: str
    rad_type: str
    description: Optional[str] = None
    added_at: datetime = Field(default_factory=datetime.now)

class EIDRegistryResponse(BaseModel):
    """Response model for EID registry operations"""
    success: bool
    message: str
    mappings: Optional[List[EIDMapping]] = None

# In-memory storage for EID mappings (in production, use a database)
eid_registry: Dict[str, EIDMapping] = {}

@app.get("/api/v1/eid-registry", response_model=EIDRegistryResponse)
async def get_eid_registry():
    """Get all EID mappings"""
    return EIDRegistryResponse(
        success=True,
        message="Registry retrieved successfully",
        mappings=list(eid_registry.values())
    )

@app.post("/api/v1/eid-registry", response_model=EIDRegistryResponse)
async def add_eid_mapping(mapping: EIDMapping):
    """Add a new EID mapping"""
    if mapping.eid in eid_registry:
        raise HTTPException(
            status_code=400,
            detail="EID already exists in registry"
        )
    
    eid_registry[mapping.eid] = mapping
    return EIDRegistryResponse(
        success=True,
        message=f"EID '{mapping.eid}' added successfully",
        mappings=[mapping]
    )

@app.delete("/api/v1/eid-registry/{eid}", response_model=EIDRegistryResponse)
async def delete_eid_mapping(eid: str):
    """Delete an EID mapping"""
    if eid not in eid_registry:
        raise HTTPException(
            status_code=404,
            detail="EID not found in registry"
        )
    
    del eid_registry[eid]
    return EIDRegistryResponse(
        success=True,
        message=f"EID '{eid}' deleted successfully"
    )

@app.post("/api/v1/eid-registry/bulk", response_model=EIDRegistryResponse)
async def bulk_import_eid_mappings(mappings: List[EIDMapping]):
    """Bulk import EID mappings"""
    added = 0
    for mapping in mappings:
        if mapping.eid not in eid_registry:
            eid_registry[mapping.eid] = mapping
            added += 1
    
    return EIDRegistryResponse(
        success=True,
        message=f"Added {added} new mappings (skipped {len(mappings) - added} duplicates)",
        mappings=list(eid_registry.values())
    )

# ====================
# Diagnostic Endpoints
# ====================

class DiagnosticInfo(BaseModel):
    """Model for diagnostic information"""
    total_events: int
    registry_mappings: int
    registry_matches: int
    pattern_matches: int
    unknown_eids: List[str]
    processing_details: List[Dict[str, Any]]

@app.get("/api/v1/diagnostics/eid-processing")
async def get_eid_processing_diagnostics():
    """Get detailed diagnostics about EID processing"""
    # Get current cached data
    cache_entries = []
    for key, entry in app_state.cache.items():
        if "data" in entry:
            cache_entries.extend(entry["data"])
    
    # Analyze EID processing
    registry_matches = 0
    pattern_matches = 0
    unknown_eids = []
    processing_details = []
    
    for event in cache_entries:
        eid = event.get("event_id") or event.get("id") or event.get("name", "")
        if not eid:
            continue
            
        # Check registry match
        registry_match = None
        for mapping_eid, mapping in eid_registry.items():
            if mapping_eid.upper() in eid.upper():
                registry_match = mapping
                registry_matches += 1
                break
        
        if registry_match:
            processing_details.append({
                "eid": eid,
                "detected_rad": registry_match.rad_type,
                "source": "registry",
                "confidence": 100,
                "mapping": registry_match.eid
            })
        else:
            # Try pattern matching
            detected_rad = determine_rad_type_from_eid(eid)
            if detected_rad and detected_rad != 'custom':
                pattern_matches += 1
                processing_details.append({
                    "eid": eid,
                    "detected_rad": detected_rad,
                    "source": "pattern",
                    "confidence": calculate_pattern_confidence(eid, detected_rad)
                })
            else:
                unknown_eids.append(eid)
                processing_details.append({
                    "eid": eid,
                    "detected_rad": detected_rad or "unknown",
                    "source": "unknown",
                    "confidence": 0
                })
    
    return DiagnosticInfo(
        total_events=len(cache_entries),
        registry_mappings=len(eid_registry),
        registry_matches=registry_matches,
        pattern_matches=pattern_matches,
        unknown_eids=unknown_eids[:20],  # Limit to first 20
        processing_details=processing_details[:50]  # Limit to first 50
    )

def calculate_pattern_confidence(eid: str, rad_type: str) -> int:
    """Calculate confidence score for pattern-based RAD type detection"""
    eid_upper = eid.upper()
    patterns = {
        'login': ['LOGIN', 'AUTH', 'SIGNIN', 'LOGON'],
        'api_call': ['API', 'ENDPOINT', 'SERVICE', 'REQUEST'],
        'page_view': ['PAGE', 'VIEW', 'VISIT', 'SCREEN'],
        'file_download': ['DOWNLOAD', 'FILE', 'EXPORT', 'ATTACHMENT']
    }
    
    relevant_patterns = patterns.get(rad_type, [])
    if not relevant_patterns:
        return 0
    
    match_count = sum(1 for pattern in relevant_patterns if pattern in eid_upper)
    return min(100, int((match_count / len(relevant_patterns)) * 100))

@app.get("/api/v1/diagnostics/cache-analysis")
async def get_cache_analysis():
    """Analyze cache usage and performance"""
    cache_sizes = []
    cache_ages = []
    now = datetime.now()
    
    for key, entry in app_state.cache.items():
        cache_sizes.append(len(str(entry)))
        age = (now - entry["timestamp"]).total_seconds()
        cache_ages.append(age)
    
    return {
        "cache_entries": len(app_state.cache),
        "total_size_bytes": sum(cache_sizes),
        "average_size_bytes": sum(cache_sizes) / len(cache_sizes) if cache_sizes else 0,
        "oldest_entry_age_seconds": max(cache_ages) if cache_ages else 0,
        "newest_entry_age_seconds": min(cache_ages) if cache_ages else 0,
        "cache_hit_rate": (
            app_state.metrics["cache_hits"] /
            (app_state.metrics["cache_hits"] + app_state.metrics["cache_misses"])
            if (app_state.metrics["cache_hits"] + app_state.metrics["cache_misses"]) > 0
            else 0
        )
    }

# ====================
# Utility Endpoints
# ====================

@app.post("/api/v1/utils/cleanup-ports")
async def cleanup_ports(cleanup_request: PortCleanupRequest):
    """Cleanup ports utility endpoint"""
    import subprocess

    cleaned_ports = []
    failed_ports = []

    for port in cleanup_request.ports:
        try:
            # Use the cleanup script
            result = subprocess.run(
                ["python3", "bin/cleanup_ports.py", str(port)],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                cleaned_ports.append(port)
            else:
                failed_ports.append(port)
        except Exception as e:
            failed_ports.append(port)
            logger.error(f"Failed to cleanup port {port}: {e}")

    return {
        "cleaned": cleaned_ports,
        "failed": failed_ports,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/v1/utils/validate")
async def validate_connections():
    """Validate all connections and configuration"""
    results = {
        "elasticsearch": False,
        "configuration": False,
        "static_files": False,
        "timestamp": datetime.now().isoformat()
    }

    # Check Elasticsearch
    try:
        test_query = {"query": {"match_all": {}}, "size": 0}
        result = await execute_elasticsearch_query(test_query)
        results["elasticsearch"] = result.get("success", False)
    except:
        results["elasticsearch"] = False

    # Check configuration
    try:
        # Check if config was loaded successfully
        results["configuration"] = bool(config) and hasattr(config, 'environment')
    except:
        results["configuration"] = False

    # Check static files
    dist_index = PROJECT_ROOT / "dist" / "index.html"
    root_index = PROJECT_ROOT / "index.html"
    results["static_files"] = dist_index.exists() or root_index.exists()

    return results

# ====================
# Error Handlers
# ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "type": type(exc).__name__,
            "timestamp": datetime.now().isoformat()
        }
    )

# ====================
# Startup Banner
# ====================

def print_startup_banner():
    """Print startup banner with server information"""
    banner = f"""
╔══════════════════════════════════════════════════════════════════╗
║                    RAD Monitor Unified Server                     ║
║                         Version 2.0.0                             ║
╠══════════════════════════════════════════════════════════════════╣
║  Environment: {ENVIRONMENT:<50} ║
║  Port: {SERVER_PORT:<57} ║
║  Host: {SERVER_HOST:<57} ║
╠══════════════════════════════════════════════════════════════════╣
║  Dashboard: http://localhost:{SERVER_PORT}                              ║
║  API Docs:  http://localhost:{SERVER_PORT}/docs                         ║
║  WebSocket: ws://localhost:{SERVER_PORT}/ws                             ║
╚══════════════════════════════════════════════════════════════════╝
    """
    print(banner)

# ====================
# Main Entry Point
# ====================

if __name__ == "__main__":
    print_startup_banner()

    # Create an async function to run the server
    async def run_server():
        # Configure uvicorn
        config = uvicorn.Config(
            app,
            host=SERVER_HOST,
            port=SERVER_PORT,
            reload=False,  # Disable reload to prevent orphaned processes
            log_level="info" if ENVIRONMENT == "development" else "warning",
            access_log=ENVIRONMENT == "development",
            loop="asyncio"
        )

        # Create server instance
        server = uvicorn.Server(config)

        # Set up signal handlers for graceful shutdown
        loop = asyncio.get_event_loop()
        
        def signal_handler(sig):
            logger.info(f"Received signal {sig}, initiating graceful shutdown...")
            server.should_exit = True

        # Register signal handlers
        for sig in [signal.SIGTERM, signal.SIGINT]:
            loop.add_signal_handler(sig, signal_handler, sig)

        try:
            # Run the server
            await server.serve()
        except Exception as e:
            logger.error(f"Server error: {e}")
        finally:
            # Clean up signal handlers
            for sig in [signal.SIGTERM, signal.SIGINT]:
                loop.remove_signal_handler(sig)
            
            # Force close any remaining connections
            await asyncio.sleep(0.1)
            logger.info("Server shutdown complete")

    # Run the async function
    try:
        asyncio.run(run_server())
    except KeyboardInterrupt:
        logger.info("Keyboard interrupt received")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
    finally:
        # Extra cleanup - force kill any remaining tasks
        try:
            # Get all running tasks
            loop = asyncio.new_event_loop()
            # Use the correct method for Python 3.9+
            if hasattr(asyncio, 'all_tasks'):
                pending = asyncio.all_tasks(loop)
            else:
                # For Python 3.7-3.8
                pending = asyncio.Task.all_tasks(loop) if hasattr(asyncio.Task, 'all_tasks') else set()
            
            for task in pending:
                task.cancel()
        except:
            pass
        
        logger.info("RAD Monitor server stopped")
