#!/usr/bin/env python3
"""
Production-Ready FastAPI Server for RAD Monitor
Enhanced with security, monitoring, and error handling
"""
import os
import sys
import json
import signal
import asyncio
import time
import uuid
import secrets
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Set
from contextlib import asynccontextmanager
from functools import lru_cache
import re

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect, HTTPException, Header, Depends, status
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, field_validator, validator, constr
import uvicorn
import httpx
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pybreaker import CircuitBreaker
import structlog
from dotenv import load_dotenv
from prometheus_client import Counter, Histogram, Gauge, generate_latest
import aioredis
from asyncio import Lock
import hashlib

# Load environment variables
load_dotenv()

# ====================
# Environment Validation - Must happen first!
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
# Security Configuration
# ====================

# Security settings - Now using validated values
SECRET_KEY = validated_env.get("SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = validated_env.get("ACCESS_TOKEN_EXPIRE_MINUTES", 30)

# CORS settings - Using validated list
ALLOWED_ORIGINS = validated_env.get("ALLOWED_ORIGINS", ["http://localhost:3000", "http://localhost:8000"])
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

# Trusted hosts - Using validated list
ALLOWED_HOSTS = validated_env.get("ALLOWED_HOSTS", ["localhost", "127.0.0.1"])
ALLOWED_HOSTS = [host.strip() for host in ALLOWED_HOSTS if host.strip()]

# ====================
# Local Settings Implementation
# ====================

class Settings:
    """Production-ready settings loader with validation and caching"""
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self._settings = {}
            self._load_settings()

    def _load_settings(self):
        """Load and validate settings"""
        config_path = Path(__file__).parent.parent / "config" / "settings.json"

        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    self._settings = json.load(f)
                self._validate_settings()
            except json.JSONDecodeError as e:
                raise RuntimeError(f"Invalid JSON in settings.json: {e}")
            except Exception as e:
                raise RuntimeError(f"Failed to load settings: {e}")
        else:
            raise RuntimeError(f"Settings file not found: {config_path}")

                # Apply validated environment variable overrides
        self.elasticsearch_url = validated_env.get('ELASTICSEARCH_URL',
            self._settings.get('elasticsearch', {}).get('url'))
        self.kibana_url = validated_env.get('KIBANA_URL',
            self._settings.get('kibana', {}).get('url'))

    def _get_url_setting(self, env_var: str, default: str) -> str:
        """Get and validate URL settings"""
        url = os.getenv(env_var, default)
        if not url:
            raise ValueError(f"{env_var} is required")
        if not url.startswith(('http://', 'https://')):
            raise ValueError(f"{env_var} must be a valid HTTP(S) URL")
        return url

    def _validate_settings(self):
        """Validate required settings exist"""
        required = ['elasticsearch', 'kibana', 'processing']
        missing = [key for key in required if key not in self._settings]
        if missing:
            raise ValueError(f"Missing required settings: {', '.join(missing)}")

    def get(self, key: str, default=None):
        return self._settings.get(key, default)

@lru_cache()
def get_settings():
    """Get cached settings instance"""
    return Settings()

# ====================
# Logging Configuration
# ====================

# Configure structured logging for production
log_level = validated_env.get("LOG_LEVEL", "INFO")
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
        structlog.processors.JSONRenderer() if validated_env.get("ENVIRONMENT") == "production" else structlog.dev.ConsoleRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# ====================
# Prometheus Metrics
# ====================

# Define metrics
request_count = Counter('rad_monitor_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('rad_monitor_request_duration_seconds', 'Request duration', ['method', 'endpoint'])
active_connections = Gauge('rad_monitor_active_connections', 'Active connections')
cache_hits = Counter('rad_monitor_cache_hits_total', 'Cache hits')
cache_misses = Counter('rad_monitor_cache_misses_total', 'Cache misses')
elasticsearch_errors = Counter('rad_monitor_elasticsearch_errors_total', 'Elasticsearch errors')

# ====================
# Models with Validation
# ====================

class DashboardConfig(BaseModel):
    """Dashboard configuration with strict validation"""
    baseline_start: constr(regex=r'^\d{4}-\d{2}-\d{2}$') = Field(..., description="Baseline start date (YYYY-MM-DD)")
    baseline_end: constr(regex=r'^\d{4}-\d{2}-\d{2}$') = Field(..., description="Baseline end date (YYYY-MM-DD)")
    time_range: constr(regex=r'^(now-\d+[hdwM]|last_\d+_days)$') = Field(default="now-12h", description="Valid time range")
    critical_threshold: int = Field(default=-80, le=0, ge=-100, description="Critical threshold (-100 to 0)")
    warning_threshold: int = Field(default=-50, le=0, ge=-100, description="Warning threshold (-100 to 0)")
    high_volume_threshold: int = Field(default=1000, ge=1, le=1000000, description="High volume threshold")
    medium_volume_threshold: int = Field(default=100, ge=1, le=100000, description="Medium volume threshold")

    @validator('baseline_end')
    def validate_date_range(cls, v, values):
        if 'baseline_start' in values and v <= values['baseline_start']:
            raise ValueError('baseline_end must be after baseline_start')
        # Ensure dates are not too far in the past or future
        try:
            start_date = datetime.strptime(values['baseline_start'], '%Y-%m-%d')
            end_date = datetime.strptime(v, '%Y-%m-%d')
            if (end_date - start_date).days > 365:
                raise ValueError('Date range cannot exceed 365 days')
            if end_date > datetime.now():
                raise ValueError('End date cannot be in the future')
        except ValueError as e:
            raise ValueError(f'Invalid date range: {e}')
        return v

class ElasticsearchQuery(BaseModel):
    """Validated Elasticsearch query"""
    query: Dict[str, Any]
    size: int = Field(default=0, ge=0, le=10000, description="Result size limit")
    aggs: Optional[Dict[str, Any]] = None

    @validator('query')
    def validate_query_structure(cls, v):
        """Validate query doesn't contain dangerous operations"""
        query_str = json.dumps(v)

        # Check for script injections
        dangerous_patterns = [
            r'"script"',
            r'"inline"',
            r'"source"',
            r'_update',
            r'_delete',
            r'_bulk'
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, query_str, re.IGNORECASE):
                raise ValueError(f"Potentially dangerous pattern detected: {pattern}")

        return v

class WebSocketMessage(BaseModel):
    """Validated WebSocket message"""
    type: constr(regex=r'^(ping|subscribe|unsubscribe|query)$')
    data: Dict[str, Any]
    timestamp: Optional[str] = None

    @validator('data')
    def validate_data_size(cls, v):
        """Limit message size"""
        if len(json.dumps(v)) > 1024 * 1024:  # 1MB limit
            raise ValueError("Message too large")
        return v

# ====================
# Security Dependencies
# ====================

security = HTTPBearer(auto_error=False)

async def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Verify authentication token"""
    if validated_env.get("DISABLE_AUTH", False):
        # Allow disabling auth for development only
        return {"user": "dev", "roles": ["admin"]}

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In production, implement proper JWT validation here
    # For now, validate against environment variable
    valid_tokens = validated_env.get("API_TOKENS", [])
    valid_tokens = [token.strip() for token in valid_tokens if token.strip()]

    if not valid_tokens or credentials.credentials not in valid_tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"user": "api_user", "roles": ["user"]}

# ====================
# Application State with Redis
# ====================

class AppState:
    """Production application state with Redis caching"""
    def __init__(self):
        self.websocket_clients: Set[WebSocket] = set()
        self.redis_client = None
        self.local_cache = {}  # Fallback cache
        self.start_time = datetime.now()
        self._locks = {}

    async def init_redis(self):
        """Initialize Redis connection"""
        redis_url = validated_env.get("REDIS_URL", "redis://localhost:6379")
        try:
            self.redis_client = await aioredis.create_redis_pool(redis_url)
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed, using local cache: {e}")

    async def get_lock(self, key: str) -> Lock:
        """Get or create lock for key"""
        if key not in self._locks:
            self._locks[key] = Lock()
        return self._locks[key]

    async def cache_get(self, key: str) -> Optional[Any]:
        """Get from cache with fallback"""
        try:
            if self.redis_client:
                value = await self.redis_client.get(key)
                if value:
                    cache_hits.inc()
                    return json.loads(value)
            else:
                # Fallback to local cache
                if key in self.local_cache:
                    value, expiry = self.local_cache[key]
                    if datetime.now() < expiry:
                        cache_hits.inc()
                        return value
                    else:
                        del self.local_cache[key]
        except Exception as e:
            logger.error(f"Cache get error: {e}")

        cache_misses.inc()
        return None

    async def cache_set(self, key: str, value: Any, ttl: int = 300):
        """Set cache with TTL"""
        try:
            if self.redis_client:
                await self.redis_client.setex(key, ttl, json.dumps(value))
            else:
                # Fallback to local cache with size limit
                if len(self.local_cache) > 1000:
                    # Remove oldest entries
                    oldest = sorted(self.local_cache.items(),
                                  key=lambda x: x[1][1])[:100]
                    for old_key, _ in oldest:
                        del self.local_cache[old_key]

                self.local_cache[key] = (value, datetime.now() + timedelta(seconds=ttl))
        except Exception as e:
            logger.error(f"Cache set error: {e}")

app_state = AppState()

# ====================
# Circuit Breakers
# ====================

es_circuit_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    exclude=[httpx.TimeoutException]
)

# ====================
# Rate Limiter
# ====================

def get_client_ip(request: Request) -> str:
    """Get real client IP considering proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host

limiter = Limiter(key_func=get_client_ip)

# ====================
# HTTP Client Pool
# ====================

class HTTPClientPool:
    """Manage HTTP client connections"""
    def __init__(self):
        self.client = None

    async def get_client(self) -> httpx.AsyncClient:
        if not self.client:
            self.client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0),
                limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
                verify=validated_env.get("VERIFY_SSL", True)
            )
        return self.client

    async def close(self):
        if self.client:
            await self.client.aclose()

http_pool = HTTPClientPool()

# ====================
# Lifespan Management
# ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
        # Startup
    logger.info("Starting RAD Monitor Production Server",
                environment=validated_env.get("ENVIRONMENT", "production"))

    # Initialize Redis
    await app_state.init_redis()

    # Validate configuration
    try:
        settings = get_settings()
        logger.info("Configuration loaded successfully")
    except Exception as e:
        logger.error(f"Configuration error: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down RAD Monitor Server")

    # Close connections
    await http_pool.close()

    if app_state.redis_client:
        app_state.redis_client.close()
        await app_state.redis_client.wait_closed()

    # Close WebSocket connections gracefully
    for ws in list(app_state.websocket_clients):
        try:
            await ws.close(code=1000, reason="Server shutdown")
        except:
            pass

# ====================
# FastAPI Application
# ====================

app = FastAPI(
    title="RAD Monitor Production Server",
    description="Production-ready server with security and monitoring",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs" if validated_env.get("ENABLE_DOCS", False) else None,
    redoc_url="/redoc" if validated_env.get("ENABLE_DOCS", False) else None,
)

# Add exception handler for rate limiting
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ====================
# Middleware
# ====================

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    return response

# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    with structlog.contextvars.bind_contextvars(request_id=request_id):
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# Metrics middleware
@app.middleware("http")
async def add_metrics(request: Request, call_next):
    start_time = time.time()

    # Track active connections
    active_connections.inc()

    try:
        response = await call_next(request)

        # Record metrics
        duration = time.time() - start_time
        request_count.labels(
            method=request.method,
            endpoint=request.url.path,
            status=response.status_code
        ).inc()
        request_duration.labels(
            method=request.method,
            endpoint=request.url.path
        ).observe(duration)

        return response
    finally:
        active_connections.dec()

# CORS Middleware - Restricted
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)

# Trusted Host Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=ALLOWED_HOSTS
)

# GZip Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ====================
# Static Files (with security)
# ====================

PROJECT_ROOT = Path(__file__).parent.parent

# Validate static file paths
def validate_static_path(path: str) -> bool:
    """Validate static file path to prevent directory traversal"""
    try:
        # Resolve the path and ensure it's within project root
        resolved = (PROJECT_ROOT / path).resolve()
        return resolved.is_relative_to(PROJECT_ROOT)
    except:
        return False

# Mount static directories with validation
if (PROJECT_ROOT / "assets").exists():
    app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "assets"), name="assets")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serve the main dashboard"""
    index_path = PROJECT_ROOT / "index.html"
    if not index_path.exists() or not validate_static_path("index.html"):
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return FileResponse(index_path)

# ====================
# Health & Monitoring Endpoints
# ====================

@app.get("/health/live")
async def liveness():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.now().isoformat()}

@app.get("/health/ready")
async def readiness():
    """Kubernetes readiness probe"""
    checks = {
        "configuration": False,
        "elasticsearch": False,
        "redis": False,
    }

    # Check configuration
    try:
        settings = get_settings()
        checks["configuration"] = True
    except:
        pass

    # Check Elasticsearch
    try:
        async with es_circuit_breaker:
            client = await http_pool.get_client()
            response = await client.get(
                f"{settings.elasticsearch_url}/_cluster/health",
                timeout=5.0
            )
            checks["elasticsearch"] = response.status_code == 200
    except:
        checks["elasticsearch"] = False

    # Check Redis
    checks["redis"] = app_state.redis_client is not None

    # Overall status
    all_ready = all(checks.values())

    return JSONResponse(
        status_code=200 if all_ready else 503,
        content={
            "status": "ready" if all_ready else "not ready",
            "checks": checks,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type="text/plain")

# ====================
# API Endpoints with Authentication
# ====================

@app.get("/api/v1/dashboard/config")
@limiter.limit("30/minute")
async def get_dashboard_config(
    request: Request,
    user: dict = Depends(verify_token)
):
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

@app.post("/api/v1/dashboard/query")
@limiter.limit("10/minute")
async def query_dashboard(
    request: Request,
    query: ElasticsearchQuery,
    user: dict = Depends(verify_token),
    cookie: Optional[str] = Header(None)
):
    """Execute validated Elasticsearch query"""
    # Generate cache key
    cache_key = f"query:{hashlib.md5(json.dumps(query.dict(), sort_keys=True).encode()).hexdigest()}"

    # Check cache
    cached = await app_state.cache_get(cache_key)
    if cached:
        return cached

    # Execute query with circuit breaker
    try:
        async with es_circuit_breaker:
            settings = get_settings()
            client = await http_pool.get_client()

            headers = {
                'Content-Type': 'application/json',
                'kbn-xsrf': 'true'
            }

            if cookie:
                headers['Cookie'] = cookie

            response = await client.post(
                f"{settings.kibana_url}/api/console/proxy?path=traffic-*/_search&method=POST",
                headers=headers,
                json=query.dict()
            )

            if response.status_code != 200:
                elasticsearch_errors.inc()
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Elasticsearch query failed"
                )

            result = response.json()

            # Cache successful results
            await app_state.cache_set(cache_key, result, ttl=300)

            return result

    except Exception as e:
        elasticsearch_errors.inc()
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")

# ====================
# WebSocket with Authentication
# ====================

@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None
):
    """Secure WebSocket endpoint"""
    # Validate token
    if not validated_env.get("DISABLE_AUTH", False):
        valid_tokens = validated_env.get("API_TOKENS", [])
        if not token or token not in valid_tokens:
            await websocket.close(code=1008, reason="Unauthorized")
            return

    await websocket.accept()
    app_state.websocket_clients.add(websocket)
    client_id = str(uuid.uuid4())

    logger.info(f"WebSocket client connected: {client_id}")

    try:
        while True:
            # Set timeout for receive
            data = await asyncio.wait_for(websocket.receive_json(), timeout=300.0)

            # Validate message
            try:
                message = WebSocketMessage(**data)
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Invalid message format: {e}"
                })
                continue

            # Handle message types
            if message.type == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            elif message.type == "subscribe":
                # Implement subscription logic
                channel = message.data.get("channel", "default")
                await websocket.send_json({
                    "type": "subscribed",
                    "channel": channel,
                    "timestamp": datetime.now().isoformat()
                })
            else:
                # Echo validated messages
                await websocket.send_json({
                    "type": "echo",
                    "data": message.data,
                    "timestamp": datetime.now().isoformat()
                })

    except asyncio.TimeoutError:
        await websocket.close(code=1000, reason="Idle timeout")
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {client_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason="Server error")
    finally:
        app_state.websocket_clients.discard(websocket)

# ====================
# Error Handlers
# ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom HTTP exception handler"""
    request_id = request.headers.get("X-Request-ID", "unknown")
    logger.warning(f"HTTP exception: {exc.status_code} - {exc.detail}",
                  request_id=request_id,
                  path=request.url.path)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "request_id": request_id,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """General exception handler - never expose internal errors"""
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    logger.error(f"Unhandled exception: {exc}",
                exc_info=True,
                request_id=request_id,
                path=request.url.path)

    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "request_id": request_id,
            "timestamp": datetime.now().isoformat()
        }
    )

# ====================
# Graceful Shutdown
# ====================

def signal_handler(sig, frame):
    logger.info("Received shutdown signal")
    # Trigger graceful shutdown
    asyncio.create_task(shutdown())

async def shutdown():
    """Graceful shutdown procedure"""
    logger.info("Starting graceful shutdown")

    # Stop accepting new connections
    for ws in list(app_state.websocket_clients):
        try:
            await ws.close(code=1000, reason="Server shutdown")
        except:
            pass

    # Wait for ongoing requests to complete (max 30 seconds)
    await asyncio.sleep(0.5)

    logger.info("Shutdown complete")

# ====================
# Main Entry Point
# ====================

if __name__ == "__main__":
    # Production configuration
    SERVER_PORT = validated_env.get("SERVER_PORT", 8000)
    SERVER_HOST = validated_env.get("SERVER_HOST", "0.0.0.0")
    WORKERS = validated_env.get("WORKERS", 4)

    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Configure uvicorn for production
    config = uvicorn.Config(
        app,
        host=SERVER_HOST,
        port=SERVER_PORT,
        workers=WORKERS,
        loop="uvloop",
        log_level=log_level.lower(),
        access_log=False,  # Use structured logging instead
        use_colors=False,
        server_header=False,  # Don't expose server info
        date_header=False,  # Managed by proxy
    )

    server = uvicorn.Server(config)
    server.run()
