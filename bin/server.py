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

# ====================
# Environment Validation
# ====================

# Add the parent directory to the path to import env_validator
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from env_validator import validate_environment, EnvValidationError

    # Validate environment variables at startup
    validated_env = validate_environment()
    print("✅ Environment validation completed successfully\n")

except EnvValidationError as e:
    print(f"❌ Environment validation failed:\n{e}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"❌ Failed to validate environment: {e}", file=sys.stderr)
    sys.exit(1)

# ====================
# Local Settings Implementation (replacing src imports)
# ====================

class Settings:
    """Simple settings loader replacing src.config.settings"""
    def __init__(self):
        config_path = Path(__file__).parent.parent / "config" / "settings.json"
        self._settings = {}

        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    self._settings = json.load(f)
            except Exception as e:
                print(f"Warning: Failed to load settings: {e}")

                # Environment variable overrides from validated values
        self.elasticsearch_url = validated_env.get('ELASTICSEARCH_URL',
            self._settings.get('elasticsearch', {}).get('url', 'https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243'))
        self.kibana_url = validated_env.get('KIBANA_URL',
            self._settings.get('kibana', {}).get('url', 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243'))

    def get(self, key, default=None):
        return self._settings.get(key, default)

def get_settings():
    """Get settings instance"""
    return Settings()

def reload_settings():
    """Reload settings (placeholder for compatibility)"""
    return Settings()

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
SERVER_PORT = validated_env.get("SERVER_PORT", 8000)
SERVER_HOST = validated_env.get("SERVER_HOST", "0.0.0.0")
ENVIRONMENT = validated_env.get("ENVIRONMENT", "development")

# Kibana configuration
KIBANA_URL = validated_env.get("KIBANA_URL", "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243")
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

async def execute_elasticsearch_query(query: Dict[str, Any], cookie: Optional[str] = None) -> Dict[str, Any]:
    """Execute Elasticsearch query via Kibana proxy"""
    start_time = time.time()

    headers = {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'true'
    }

    if cookie:
        headers['Cookie'] = cookie

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                f"{KIBANA_URL}{KIBANA_SEARCH_PATH}",
                headers=headers,
                json=query
            )

            if response.status_code == 200:
                result = response.json()
                query_time_ms = (time.time() - start_time) * 1000
                return {
                    "success": True,
                    "data": result,
                    "query_time_ms": query_time_ms
                }
            else:
                return {
                    "success": False,
                    "error": f"Elasticsearch returned status {response.status_code}",
                    "details": response.text
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "type": type(e).__name__
            }

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
# Configure allowed origins from environment for security
ALLOWED_ORIGINS = validated_env.get("ALLOWED_ORIGINS", ["http://localhost:8000", "http://localhost:3000"])
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]  # Clean whitespace

# Add production origin if running in production
if validated_env.get("ENVIRONMENT") == "production":
    # Add the current host as an allowed origin in production
    production_origins = [
        "https://vh-rad-traffic-monitor.vercel.app",
        "https://vh-rad-traffic-monitor.github.io"
    ]
    ALLOWED_ORIGINS.extend(production_origins)

logger.info(f"CORS allowed origins: {ALLOWED_ORIGINS}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Use specific origins for security
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
app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "assets"), name="assets")
app.mount("/node_modules", StaticFiles(directory=PROJECT_ROOT / "node_modules"), name="node_modules")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serve the main dashboard"""
    index_path = PROJECT_ROOT / "index.html"
    return FileResponse(index_path)

# ====================
# Health & Status Endpoints
# ====================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    settings = get_settings()

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

@app.post("/api/v1/auth/validate")
async def validate_auth(cookie: Optional[str] = Header(None)):
    """Validate authentication cookie"""
    if not cookie:
        raise HTTPException(status_code=401, detail="No authentication cookie provided")

    # Test the cookie by making a simple Elasticsearch query
    try:
        test_query = {
            "query": {"match_all": {}},
            "size": 0
        }
        result = await execute_elasticsearch_query(test_query, cookie)

        if result.get("success"):
            return {
                "authenticated": True,
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
    settings = get_settings()
    return {
        "elasticsearch": {
            "url": settings.elasticsearch_url,
            "index_pattern": settings.get('elasticsearch', {}).get('index_pattern', 'traffic-*')
        },
        "kibana": {
            "url": settings.kibana_url
        },
        "processing": settings.get('processing', {}),
        "dashboard": settings.get('dashboard', {}),
        "rad_types": settings.get('rad_types', {})
    }

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
    settings = get_settings()
    return {
        "healthy": True,
        "config_loaded": bool(settings._settings),
        "elasticsearch_configured": bool(settings.elasticsearch_url),
        "kibana_configured": bool(settings.kibana_url)
    }

# ====================
# Dashboard API Endpoints
# ====================

@app.get("/api/v1/dashboard/config", response_model=DashboardConfig)
async def get_dashboard_config():
    """Get dashboard configuration"""
    settings = get_settings()
    processing = settings.get('processing', {})

    return DashboardConfig(
        baseline_start=processing.get('baseline_start', '2025-06-01'),
        baseline_end=processing.get('baseline_end', '2025-06-09'),
        time_range=processing.get('current_time_range', 'now-12h'),
        critical_threshold=processing.get('critical_threshold', -80),
        warning_threshold=processing.get('warning_threshold', -50),
        high_volume_threshold=processing.get('high_volume_threshold', 1000),
        medium_volume_threshold=processing.get('medium_volume_threshold', 100)
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
    auth_cookie = cookie or x_elastic_cookie or authorization
    result = await execute_elasticsearch_query(query_request.query, auth_cookie)

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {result.get('error', 'Unknown error')}"
        )

    # Process results
    data = result["data"]
    processed_data = []

    # Extract events from aggregations if present
    if "aggregations" in data and "events" in data["aggregations"]:
        buckets = data["aggregations"]["events"].get("buckets", [])
        for bucket in buckets:
            processed_data.append({
                "event_id": bucket["key"],
                "count": bucket["doc_count"],
                "current": bucket.get("current", {}).get("doc_count", 0),
                "baseline": bucket.get("baseline", {}).get("doc_count", 0)
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
    cookie: Optional[str] = Header(None),
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Check authentication status"""
    # Check both Cookie and X-Elastic-Cookie headers
    auth_cookie = cookie or x_elastic_cookie

    if auth_cookie:
        logger.info("Auth status check - Cookie present")
    else:
        logger.info("Auth status check - No cookie found")

    return {
        "authenticated": bool(auth_cookie),
        "method": "cookie" if auth_cookie else None,
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
    cookie: Optional[str] = Header(None),
    x_elastic_cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Proxy requests to Kibana (CORS bypass)"""
    # Check both Cookie and X-Elastic-Cookie headers
    auth_cookie = cookie or x_elastic_cookie

    if not auth_cookie:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a cookie."
        )

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
        settings = get_settings()
        results["configuration"] = bool(settings._settings)
    except:
        results["configuration"] = False

    # Check static files
    results["static_files"] = (PROJECT_ROOT / "index.html").exists()

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

    # Configure uvicorn
    config = uvicorn.Config(
        app,
        host=SERVER_HOST,
        port=SERVER_PORT,
        reload=ENVIRONMENT == "development",
        log_level="info" if ENVIRONMENT == "development" else "warning",
        access_log=ENVIRONMENT == "development"
    )

    # Run server with graceful shutdown
    server = uvicorn.Server(config)

    # Create shutdown event
    shutdown_event = asyncio.Event()

    # Handle graceful shutdown
    def signal_handler(sig, frame):
        logger.info("Received shutdown signal, initiating graceful shutdown...")
        server.should_exit = True
        shutdown_event.set()

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run server with proper async handling
    try:
        server.run()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Server shutdown complete")
    except asyncio.CancelledError:
        # This is expected during shutdown, not an error
        logger.info("Async tasks cancelled during shutdown")
    finally:
        # Clean shutdown message
        logger.info("RAD Monitor server stopped")
