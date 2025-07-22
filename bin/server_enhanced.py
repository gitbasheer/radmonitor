#!/usr/bin/env python3
"""
Enhanced FastAPI Server for RAD Monitor with Formula Builder Support
Includes all production features while maintaining development flexibility
"""
import os
import sys
import json
import signal
import asyncio
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Set
from contextlib import asynccontextmanager
from functools import lru_cache
import re
import hashlib

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect, HTTPException, Header, Depends, status
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field, field_validator, validator
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
# Settings
# ====================

class Settings:
    """Enhanced settings with production support"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if not hasattr(self, '_initialized'):
            self._initialized = True
            self._load_settings()
    
    def _load_settings(self):
        """Load settings from config files and environment"""
        # Load base settings
        config_path = Path(__file__).parent.parent / "config" / "settings.json"
        self._settings = {}
        
        if config_path.exists():
            try:
                with open(config_path, 'r') as f:
                    self._settings = json.load(f)
            except Exception as e:
                print(f"Warning: Failed to load settings.json: {e}")
        
        # Load production settings if in production
        if os.getenv("ENVIRONMENT") == "production":
            prod_config_path = Path(__file__).parent.parent / "config" / "production.json"
            if prod_config_path.exists():
                try:
                    with open(prod_config_path, 'r') as f:
                        prod_settings = json.load(f)
                        self._settings.update(prod_settings)
                except Exception as e:
                    print(f"Warning: Failed to load production.json: {e}")
        
        # Environment variable overrides
        self.elasticsearch_url = os.getenv('ELASTICSEARCH_URL', 
            self._settings.get('elasticsearch', {}).get('url', 'https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243'))
        self.kibana_url = os.getenv('KIBANA_URL',
            self._settings.get('kibana', {}).get('url', 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243'))
        self.api_url = os.getenv('API_URL', 'http://localhost:8000')
        self.environment = os.getenv('ENVIRONMENT', 'development')
    
    def get(self, key: str, default=None):
        return self._settings.get(key, default)

@lru_cache()
def get_settings():
    return Settings()

# ====================
# Logging
# ====================

log_level = os.getenv("LOG_LEVEL", "INFO")
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
        structlog.processors.JSONRenderer() if os.getenv("ENVIRONMENT") == "production" else structlog.dev.ConsoleRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# ====================
# Models
# ====================

class DashboardConfig(BaseModel):
    """Dashboard configuration with validation"""
    baseline_start: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    baseline_end: str = Field(..., pattern=r'^\d{4}-\d{2}-\d{2}$')
    time_range: str = Field(default="now-12h")
    critical_threshold: int = Field(default=-80, le=0, ge=-100)
    warning_threshold: int = Field(default=-50, le=0, ge=-100)
    high_volume_threshold: int = Field(default=1000, ge=1, le=1000000)
    medium_volume_threshold: int = Field(default=100, ge=1, le=100000)

class FormulaRequest(BaseModel):
    """Formula execution request"""
    formula: str = Field(..., min_length=1, max_length=1000)
    time_range: Optional[str] = Field(default="now-1h")
    filters: Optional[Dict[str, Any]] = None
    
    @validator('formula')
    def validate_formula_safety(cls, v):
        """Basic validation to prevent injection"""
        dangerous_patterns = ['script', 'eval', 'exec', '__']
        for pattern in dangerous_patterns:
            if pattern in v.lower():
                raise ValueError(f"Potentially dangerous pattern detected: {pattern}")
        return v

class FormulaValidationRequest(BaseModel):
    """Formula validation request"""
    formula: str = Field(..., min_length=1, max_length=1000)
    context: Optional[Dict[str, Any]] = None

class NaturalLanguageRequest(BaseModel):
    """Natural language to formula request"""
    query: str = Field(..., min_length=1, max_length=500)
    context: Optional[Dict[str, Any]] = None

# ====================
# Application State
# ====================

class AppState:
    """Application state management"""
    def __init__(self):
        self.websocket_clients: Set[WebSocket] = set()
        self.cache = {}
        self.start_time = datetime.now()
        self.metrics = {
            'requests': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'errors': 0
        }

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

limiter = Limiter(key_func=get_remote_address)

# ====================
# HTTP Client
# ====================

@lru_cache()
def get_http_client():
    return httpx.AsyncClient(
        timeout=httpx.Timeout(30.0),
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
    )

# ====================
# Lifespan
# ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Enhanced RAD Monitor Server", 
                environment=get_settings().environment,
                port=int(os.getenv("SERVER_PORT", "8000")))
    
    # Validate configuration
    try:
        settings = get_settings()
        logger.info("Configuration loaded successfully")
    except Exception as e:
        logger.error(f"Configuration error: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down Enhanced RAD Monitor Server")
    
    # Close HTTP client
    client = get_http_client()
    await client.aclose()
    
    # Close WebSocket connections
    for ws in list(app_state.websocket_clients):
        try:
            await ws.close(code=1000, reason="Server shutdown")
        except:
            pass

# ====================
# FastAPI Application
# ====================

app = FastAPI(
    title="RAD Monitor Enhanced Server",
    description="Enhanced server with Formula Builder and Production Support",
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/docs" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
    redoc_url="/redoc" if os.getenv("ENABLE_DOCS", "false").lower() == "true" else None,
)

# Add exception handler for rate limiting
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ====================
# Middleware
# ====================

# CORS Middleware
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",") if os.getenv("ENVIRONMENT") == "production" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Request tracking middleware
@app.middleware("http")
async def track_requests(request: Request, call_next):
    start_time = time.time()
    app_state.metrics['requests'] += 1
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    logger.info(f"Request completed",
                method=request.method,
                path=request.url.path,
                status=response.status_code,
                duration=round(duration, 3))
    
    return response

# ====================
# Static Files
# ====================

PROJECT_ROOT = Path(__file__).parent.parent

# Mount static directories
if (PROJECT_ROOT / "assets").exists():
    app.mount("/assets", StaticFiles(directory=PROJECT_ROOT / "assets"), name="assets")

if (PROJECT_ROOT / "config").exists():
    app.mount("/config", StaticFiles(directory=PROJECT_ROOT / "config"), name="config")

@app.get("/", response_class=HTMLResponse)
async def read_index():
    """Serve the main dashboard"""
    index_path = PROJECT_ROOT / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard not found")
    return FileResponse(index_path)

# ====================
# Health Endpoints
# ====================

@app.get("/health")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "uptime": str(datetime.now() - app_state.start_time),
        "environment": get_settings().environment
    }

@app.get("/api/health")
async def api_health():
    """Detailed API health check"""
    checks = {
        "server": True,
        "elasticsearch": False,
        "cache": True,
        "websocket": len(app_state.websocket_clients) > 0
    }
    
    # Check Elasticsearch connectivity
    try:
        async with es_circuit_breaker:
            settings = get_settings()
            client = get_http_client()
            response = await client.get(
                f"{settings.elasticsearch_url}/_cluster/health",
                timeout=5.0
            )
            checks["elasticsearch"] = response.status_code == 200
    except:
        checks["elasticsearch"] = False
    
    return {
        "status": "healthy" if all(checks.values()) else "degraded",
        "checks": checks,
        "metrics": app_state.metrics,
        "timestamp": datetime.now().isoformat()
    }

# ====================
# Configuration Endpoints
# ====================

@app.get("/api/v1/config/settings")
@limiter.limit("30/minute")
async def get_config_settings(request: Request):
    """Get current configuration settings"""
    settings = get_settings()
    return {
        "processing": settings.get('processing', {}),
        "dashboard": settings.get('dashboard', {}),
        "rad_types": settings.get('rad_types', {}),
        "elasticsearch": {
            "url": settings.elasticsearch_url,
            "kibana_url": settings.kibana_url
        }
    }

@app.post("/api/v1/config/settings")
@limiter.limit("10/minute")
async def update_config_settings(request: Request, config: Dict[str, Any]):
    """Update configuration settings (development only)"""
    if get_settings().environment == "production":
        raise HTTPException(status_code=403, detail="Configuration updates disabled in production")
    
    # In development, we could update a local config file
    # For now, just return success
    return {"status": "success", "message": "Configuration updated"}

# ====================
# Dashboard Endpoints
# ====================

@app.post("/api/v1/dashboard/query")
@limiter.limit("20/minute")
async def query_dashboard(
    request: Request,
    query: Dict[str, Any],
    cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Execute Elasticsearch query through Kibana proxy"""
    # Generate cache key
    cache_key = f"query:{hashlib.md5(json.dumps(query, sort_keys=True).encode()).hexdigest()}"
    
    # Check cache
    if cache_key in app_state.cache:
        cache_entry = app_state.cache[cache_key]
        if datetime.now() - cache_entry['timestamp'] < CACHE_TTL:
            app_state.metrics['cache_hits'] += 1
            return cache_entry['data']
    
    app_state.metrics['cache_misses'] += 1
    
    # Execute query
    try:
        async with es_circuit_breaker:
            settings = get_settings()
            client = get_http_client()
            
            headers = {
                'Content-Type': 'application/json',
                'kbn-xsrf': 'true'
            }
            
            if cookie:
                headers['Cookie'] = cookie
            
            response = await client.post(
                f"{settings.kibana_url}/api/console/proxy?path=traffic-*/_search&method=POST",
                headers=headers,
                json=query
            )
            
            if response.status_code != 200:
                app_state.metrics['errors'] += 1
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Elasticsearch query failed"
                )
            
            result = response.json()
            
            # Cache result
            app_state.cache[cache_key] = {
                'data': result,
                'timestamp': datetime.now()
            }
            
            # Clean old cache entries
            if len(app_state.cache) > 100:
                oldest_keys = sorted(app_state.cache.keys(), 
                                   key=lambda k: app_state.cache[k]['timestamp'])[:20]
                for key in oldest_keys:
                    del app_state.cache[key]
            
            return result
            
    except Exception as e:
        app_state.metrics['errors'] += 1
        logger.error(f"Query error: {e}")
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")

@app.get("/api/v1/dashboard/data")
@limiter.limit("30/minute")
async def get_dashboard_data(request: Request):
    """Get processed dashboard data"""
    # This would normally process data from Elasticsearch
    # For now, return mock data structure
    return {
        "events": [],
        "stats": {
            "critical": 0,
            "warning": 0,
            "normal": 0,
            "increased": 0
        },
        "lastUpdated": datetime.now().isoformat()
    }

# ====================
# Formula Builder Endpoints
# ====================

@app.post("/api/v1/formulas/execute")
@limiter.limit("20/minute")
async def execute_formula(
    request: Request,
    formula_request: FormulaRequest,
    cookie: Optional[str] = Header(None, alias="X-Elastic-Cookie")
):
    """Execute formula and return results"""
    try:
        # First validate the formula
        validation = await validate_formula(request, FormulaValidationRequest(formula=formula_request.formula))
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail={
                "error": "Invalid formula",
                "details": validation["errors"]
            })
        
        # Parse formula to ES query
        query = {
            "size": 0,
            "aggs": {}
        }
        
        # Apply time range filter
        time_range = formula_request.time_range or "now-1h"
        query["query"] = {
            "bool": {
                "filter": [
                    {
                        "range": {
                            "@timestamp": {
                                "gte": time_range
                            }
                        }
                    }
                ]
            }
        }
        
        # Apply additional filters if provided
        if formula_request.filters:
            for field, value in formula_request.filters.items():
                query["query"]["bool"]["filter"].append({
                    "term": {field: value}
                })
        
        # Simple parser for basic functions
        formula_lower = formula_request.formula.lower()
        
        if formula_lower.startswith("sum("):
            field = formula_request.formula[4:-1].strip()
            query["aggs"]["result"] = {"sum": {"field": field}}
        elif formula_lower.startswith("avg("):
            field = formula_request.formula[4:-1].strip()
            query["aggs"]["result"] = {"avg": {"field": field}}
        elif formula_lower.startswith("count("):
            # Count can be with or without field
            content = formula_request.formula[6:-1].strip()
            if content:
                query["aggs"]["result"] = {"value_count": {"field": content}}
            else:
                query["aggs"]["result"] = {"value_count": {"field": "_id"}}
        elif formula_lower.startswith("min("):
            field = formula_request.formula[4:-1].strip()
            query["aggs"]["result"] = {"min": {"field": field}}
        elif formula_lower.startswith("max("):
            field = formula_request.formula[4:-1].strip()
            query["aggs"]["result"] = {"max": {"field": field}}
        else:
            # Complex formula - for now return error
            raise HTTPException(status_code=400, detail={
                "error": "Complex formulas not yet implemented",
                "formula": formula_request.formula
            })
        
        # Execute against Elasticsearch
        start_time = time.time()
        
        client = get_http_client()
        headers = {
            "Authorization": f"ApiKey {ES_API_KEY}",
            "Content-Type": "application/json"
        }
        
        if cookie:
            headers["Cookie"] = cookie
        
        response = await client.post(
            f"{ES_URL}/traffic-*/_search",
            headers=headers,
            json=query,
            timeout=30.0
        )
        
        execution_time = time.time() - start_time
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail={
                "error": "Elasticsearch query failed",
                "details": response.text
            })
        
        result_data = response.json()
        
        # Extract the aggregation result
        agg_result = result_data.get("aggregations", {}).get("result", {})
        value = agg_result.get("value", 0)
        
        # For count queries, ES returns the value directly
        if "doc_count" in agg_result:
            value = agg_result["doc_count"]
        
        return {
            "success": True,
            "formula": formula_request.formula,
            "result": {
                "value": value,
                "timestamp": datetime.now().isoformat()
            },
            "metadata": {
                "execution_time": round(execution_time, 3),
                "query_generated": query,
                "total_hits": result_data.get("hits", {}).get("total", {}).get("value", 0)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Formula execution error: {str(e)}")
        raise HTTPException(status_code=500, detail={
            "error": "Formula execution failed",
            "details": str(e)
        })

@app.post("/api/v1/formulas/validate")
@limiter.limit("50/minute")
async def validate_formula(
    request: Request,
    validation_request: FormulaValidationRequest
):
    """Validate formula syntax"""
    valid_functions = {"sum", "avg", "count", "min", "max", "if", "and", "or"}
    errors = []
    warnings = []

    formula = validation_request.formula

    # Basic validation
    if not formula:
        errors.append("Formula cannot be empty")
    
    # Check parentheses
    if formula.count('(') != formula.count(')'):
        errors.append("Unmatched parentheses")
    
    # Check for nested parentheses depth
    max_depth = 0
    current_depth = 0
    for char in formula:
        if char == '(':
            current_depth += 1
            max_depth = max(max_depth, current_depth)
        elif char == ')':
            current_depth -= 1
            if current_depth < 0:
                errors.append("Closing parenthesis without opening parenthesis")
                break
    
    if max_depth > 10:
        warnings.append(f"Formula has deep nesting ({max_depth} levels). Consider simplifying.")
    
    # Check function names
    import re
    functions_used = re.findall(r'(\w+)\s*\(', formula)
    for func in functions_used:
        if func.lower() not in valid_functions:
            errors.append(f"Unknown function: {func}")
    
    # Check for common syntax errors
    if '()' in formula:
        errors.append("Empty parentheses found")
    
    # Check for invalid characters
    invalid_chars = re.findall(r'[^a-zA-Z0-9\s\(\)\+\-\*\/\.,_=<>!&|]', formula)
    if invalid_chars:
        errors.append(f"Invalid characters found: {', '.join(set(invalid_chars))}")
    
    # Check for field references (basic validation)
    field_refs = re.findall(r'[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*', formula)
    for field in field_refs:
        if field.lower() not in valid_functions and '.' in field:
            # This looks like a field reference, add to context
            if len(field.split('.')) > 5:
                warnings.append(f"Deep field nesting in '{field}'. This may impact performance.")

    return {
        "valid": len(errors) == 0,
        "formula": formula,
        "errors": errors,
        "warnings": warnings
    }

@app.post("/api/v1/formulas/natural-language")
@limiter.limit("30/minute")
async def convert_natural_language(
    request: Request,
    nl_request: NaturalLanguageRequest
):
    """Convert natural language to formula"""
    # TODO: Implement NL to formula conversion
    # For now, return simple mapping
    nl_mappings = {
        "average": "average(value)",
        "sum": "sum(value)",
        "count": "count()",
        "traffic drop": "((count() - count(shift='1d')) / count(shift='1d')) * -100"
    }
    
    query_lower = nl_request.query.lower()
    for key, formula in nl_mappings.items():
        if key in query_lower:
            return {
                "success": True,
                "query": nl_request.query,
                "formula": formula,
                "confidence": 0.8
            }
    
    return {
        "success": False,
        "query": nl_request.query,
        "formula": None,
        "confidence": 0,
        "message": "Could not understand the query"
    }

@app.get("/api/v1/formulas/functions")
async def get_formula_functions():
    """Return available formula functions"""
    return {
        "functions": [
            {
                "name": "sum",
                "args": ["field"],
                "description": "Sum numeric field values",
                "example": "sum(event.count)",
                "category": "aggregation"
            },
            {
                "name": "avg",
                "args": ["field"],
                "description": "Average of numeric field values",
                "example": "avg(response.time)",
                "category": "aggregation"
            },
            {
                "name": "count",
                "args": [],
                "description": "Count number of documents",
                "example": "count()",
                "category": "aggregation"
            },
            {
                "name": "min",
                "args": ["field"],
                "description": "Minimum value of field",
                "example": "min(price)",
                "category": "aggregation"
            },
            {
                "name": "max",
                "args": ["field"],
                "description": "Maximum value of field",
                "example": "max(price)",
                "category": "aggregation"
            },
            {
                "name": "if",
                "args": ["condition", "true_value", "false_value"],
                "description": "Conditional logic",
                "example": "if(status='error', 1, 0)",
                "category": "logical"
            },
            {
                "name": "and",
                "args": ["condition1", "condition2"],
                "description": "Logical AND operation",
                "example": "and(status='active', region='US')",
                "category": "logical"
            },
            {
                "name": "or",
                "args": ["condition1", "condition2"],
                "description": "Logical OR operation",
                "example": "or(status='error', status='warning')",
                "category": "logical"
            }
        ],
        "categories": {
            "aggregation": "Functions that aggregate data across multiple documents",
            "logical": "Functions for conditional and logical operations",
            "math": "Mathematical operations (coming soon)",
            "time": "Time-based calculations (coming soon)"
        }
    }

# ====================
# WebSocket Endpoint
# ====================

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for real-time updates"""
    await websocket.accept()
    app_state.websocket_clients.add(websocket)
    
    try:
        while True:
            # Receive message
            data = await websocket.receive_json()
            
            # Handle different message types
            if data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            elif data.get("type") == "subscribe":
                # Handle subscription
                await websocket.send_json({
                    "type": "subscribed",
                    "channel": data.get("channel", "default")
                })
            else:
                # Echo message
                await websocket.send_json({
                    "type": "echo",
                    "data": data
                })
                
    except WebSocketDisconnect:
        app_state.websocket_clients.discard(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        app_state.websocket_clients.discard(websocket)

# ====================
# Utility Endpoints
# ====================

@app.get("/api/v1/rad-types")
async def get_rad_types():
    """Get configured RAD types"""
    settings = get_settings()
    return settings.get('rad_types', {})

@app.get("/api/v1/time-ranges")
async def get_time_ranges():
    """Get available time ranges"""
    return {
        "presets": [
            {"label": "Last 6 hours", "value": "now-6h"},
            {"label": "Last 12 hours", "value": "now-12h"},
            {"label": "Last 24 hours", "value": "now-24h"},
            {"label": "Last 3 days", "value": "now-3d"},
            {"label": "Last 7 days", "value": "now-7d"}
        ],
        "custom": {
            "enabled": True,
            "format": "now-[number][unit]",
            "units": ["h", "d", "w", "M"]
        }
    }

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
            "timestamp": datetime.now().isoformat()
        }
    )

# ====================
# Main Entry Point
# ====================

if __name__ == "__main__":
    # Server configuration
    SERVER_PORT = int(os.getenv("SERVER_PORT", "8000"))
    SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
    WORKERS = int(os.getenv("WORKERS", "1"))
    
    # Configure uvicorn
    config = uvicorn.Config(
        app,
        host=SERVER_HOST,
        port=SERVER_PORT,
        workers=WORKERS,
        loop="auto",
        log_level=log_level.lower(),
        access_log=True,
        use_colors=True
    )
    
    server = uvicorn.Server(config)
    server.run()