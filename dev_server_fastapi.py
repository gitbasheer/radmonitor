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

# Global process reference for cleanup
cors_process = None

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
    print('\n\n✋ Stopping development servers...')
    if cors_process:
        cors_process.terminate()
    sys.exit(0)

async def start_cors_proxy():
    """Start the CORS proxy subprocess"""
    global cors_process
    cors_process = subprocess.Popen(
        [sys.executable, 'cors_proxy.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    print("✅ CORS proxy started on port 8889")

async def stop_cors_proxy():
    """Stop the CORS proxy subprocess"""
    global cors_process
    if cors_process:
        cors_process.terminate()
        cors_process.wait()
        print("✅ CORS proxy stopped")

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
    print("✅ All servers stopped cleanly.")

# Create FastAPI app
app = FastAPI(
    title="RAD Monitor Dev Server",
    description="Development server for RAD Traffic Health Monitor with real-time updates",
    version="2.0.0",
    lifespan=lifespan
)

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
    """Process HTML template with current data"""
    template_path = Path("assets/templates/index.html.template")

    if not template_path.exists():
        # Fallback to index.html if template doesn't exist
        template_path = Path("index.html")

    with open(template_path, 'r') as f:
        content = f.read()

    # Replace configuration values
    content = content.replace('value="2025-06-01"', f'value="{config.baseline_start}"')
    content = content.replace('value="2025-06-09"', f'value="{config.baseline_end}"')
    content = content.replace('value="now-12h"', f'value="{config.time_range}"')
    content = content.replace('value="1000"', f'value="{config.high_volume_threshold}"')
    content = content.replace('value="100"', f'value="{config.medium_volume_threshold}"')

    # Update stats if they're displayed in the template
    content = content.replace('>0</div>', f'>{stats.critical_count}</div>')

    return content

@app.get("/", response_class=HTMLResponse)
async def get_dashboard():
    """Serve the dashboard with current configuration"""
    content = process_template(dashboard_state["config"], dashboard_state["stats"])
    return HTMLResponse(content=content)

@app.get("/api/config", response_model=DashboardConfig)
async def get_config():
    """Get current dashboard configuration"""
    return dashboard_state["config"]

@app.post("/api/config", response_model=DashboardConfig)
async def update_config(config: DashboardConfig):
    """Update dashboard configuration with validation"""
    dashboard_state["config"] = config

    # Broadcast update to WebSocket clients
    await broadcast_to_websockets(WebSocketMessage(
        type="config",
        data=config.model_dump()
    ))

    return config

@app.get("/api/stats", response_model=DashboardStats)
async def get_stats():
    """Get current dashboard statistics"""
    return dashboard_state["stats"]

@app.post("/api/refresh", response_model=Dict[str, Any])
async def refresh_dashboard(request: RefreshRequest):
    """Refresh dashboard data with new configuration"""
    try:
        # Update configuration
        dashboard_state["config"] = request.config

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
    return {
        "status": "healthy",
        "cors_proxy": cors_process.poll() is None if cors_process else False,
        "websocket_connections": len(active_connections)
    }

@app.post("/api/fetch-kibana-data", response_model=KibanaResponse)
async def fetch_kibana_data(
    request: KibanaQueryRequest,
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
    query_json = json.dumps(request.query.model_dump(), sort_keys=True)
    cache_key = hashlib.md5(query_json.encode()).hexdigest()

    # Create query ID for tracking
    query_id = f"kibana_{cache_key[:8]}_{int(time.time())}"

    # Start performance tracking
    start_time = time.time()

    # Log action - query start
    print(f"[QUERY_EXECUTE_START] Query ID: {query_id}, Cache Key: {cache_key}")

    # Check cache if not forcing refresh
    if not request.force_refresh and cache_key in app.state.cache:
        cache_timestamp = app.state.cache_timestamps.get(cache_key, 0)
        if time.time() - cache_timestamp < app.state.cache_timeout:
            # Cache hit
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)

            print(f"[QUERY_CACHE_HIT] Query ID: {query_id}, Duration: {duration_ms}ms")

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

        # Create httpx client with SSL verification disabled (like the bash script)
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            # Execute query
            response = await client.post(
                kibana_url,
                json=request.query.model_dump(),
                headers=headers
            )

            # Handle non-200 responses
            if response.status_code != 200:
                end_time = time.time()
                duration_ms = int((end_time - start_time) * 1000)

                print(f"[QUERY_EXECUTE_ERROR] Query ID: {query_id}, Status: {response.status_code}, Duration: {duration_ms}ms")

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

                print(f"[QUERY_EXECUTE_ERROR] Query ID: {query_id}, ES Error: {kibana_response.error.get('type', 'unknown')}, Duration: {duration_ms}ms")

                raise HTTPException(
                    status_code=400,
                    detail=f"Elasticsearch error: {kibana_response.error.get('reason', 'Unknown error')}"
                )

            # Success - calculate final metrics
            end_time = time.time()
            duration_ms = int((end_time - start_time) * 1000)

            print(f"[QUERY_EXECUTE_SUCCESS] Query ID: {query_id}, Took: {kibana_response.took}ms, Total Duration: {duration_ms}ms")

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
                print(f"[PERFORMANCE_WARNING] CRITICAL: Query {query_id} took {duration_ms}ms (>5s)")
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
                print(f"[PERFORMANCE_WARNING] Query {query_id} took {duration_ms}ms (>3s)")
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

        print(f"[QUERY_EXECUTE_ERROR] Query ID: {query_id}, Connection Error: {str(e)}, Duration: {duration_ms}ms")

        raise HTTPException(
            status_code=502,
            detail=f"Connection to Kibana failed: {str(e)}"
        )
    except Exception as e:
        end_time = time.time()
        duration_ms = int((end_time - start_time) * 1000)

        print(f"[QUERY_EXECUTE_ERROR] Query ID: {query_id}, Error: {str(e)}, Duration: {duration_ms}ms")

        if isinstance(e, HTTPException):
            raise

        raise HTTPException(
            status_code=500,
            detail=f"Internal error: {str(e)}"
        )

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False  # Set to True for development
    )
