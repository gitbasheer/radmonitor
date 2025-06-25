"""
Configuration Management API endpoints
"""

from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse
from typing import Dict, Any
import json
from datetime import datetime

from ..config.settings import get_settings, reload_settings, update_settings, update_from_frontend, Settings

router = APIRouter(prefix="/api/config", tags=["Configuration"])


@router.get("/settings", summary="Get all current settings")
async def get_all_settings() -> Dict[str, Any]:
    """Return all current application settings"""
    try:
        settings = get_settings()
        return {
            "app_name": settings.app_name,
            "debug": settings.debug,
            "elasticsearch": {
                "url": str(settings.elasticsearch.url),
                "index_pattern": settings.elasticsearch.index_pattern,
                "timeout": settings.elasticsearch.timeout,
                "cookie": settings.elasticsearch.cookie,  # Include cookie for frontend
                "cookie_configured": bool(settings.elasticsearch.cookie)
            },
            "kibana": {
                "url": str(settings.kibana.url),
                "discover_path": settings.kibana.discover_path,
                "search_path": settings.kibana.search_path
            },
            "processing": {
                "baseline_start": settings.processing.baseline_start,
                "baseline_end": settings.processing.baseline_end,
                "baseline_days": settings.baseline_days,
                "current_time_range": settings.processing.current_time_range,
                "high_volume_threshold": settings.processing.high_volume_threshold,
                "medium_volume_threshold": settings.processing.medium_volume_threshold,
                "critical_threshold": settings.processing.critical_threshold,
                "warning_threshold": settings.processing.warning_threshold,
                "min_daily_volume": settings.processing.min_daily_volume
            },
            "dashboard": {
                "refresh_interval": settings.dashboard.refresh_interval,
                "max_events_display": settings.dashboard.max_events_display,
                "enable_websocket": settings.dashboard.enable_websocket,
                "theme": settings.dashboard.theme,
                "console_chart_width": settings.dashboard.console_chart_width,
                "console_top_results": settings.dashboard.console_top_results
            },
            "cors_proxy": {
                "port": settings.cors_proxy.port,
                "allowed_origins": settings.cors_proxy.allowed_origins,
                "proxy_timeout": settings.cors_proxy.proxy_timeout
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve settings: {str(e)}")


@router.get("/settings/processing", summary="Get processing-specific settings")
async def get_processing_settings() -> Dict[str, Any]:
    """Return processing-specific settings in legacy format"""
    try:
        settings = get_settings()
        return {
            "config": {
                "baselineStart": settings.processing.baseline_start,
                "baselineEnd": settings.processing.baseline_end,
                "currentTimeRange": settings.processing.current_time_range,
                "highVolumeThreshold": settings.processing.high_volume_threshold,
                "mediumVolumeThreshold": settings.processing.medium_volume_threshold,
                "criticalThreshold": settings.processing.critical_threshold,
                "warningThreshold": settings.processing.warning_threshold,
                "minDailyVolume": settings.processing.min_daily_volume
            },
            "baseline_days": settings.baseline_days,
            "thresholds": {
                "high_volume": settings.processing.high_volume_threshold,
                "medium_volume": settings.processing.medium_volume_threshold,
                "critical_score": settings.processing.critical_threshold,
                "warning_score": settings.processing.warning_threshold
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve processing settings: {str(e)}")


@router.post("/reload", summary="Reload settings from environment")
async def reload_configuration() -> Dict[str, str]:
    """Reload all settings from environment variables"""
    try:
        old_settings = get_settings()
        new_settings = reload_settings()

        # Check if critical settings changed
        changes = []
        if old_settings.elasticsearch.url != new_settings.elasticsearch.url:
            changes.append("Elasticsearch URL")
        if old_settings.processing.baseline_start != new_settings.processing.baseline_start:
            changes.append("Baseline start date")
        if old_settings.processing.baseline_end != new_settings.processing.baseline_end:
            changes.append("Baseline end date")

        return {
            "status": "success",
            "message": "Configuration reloaded successfully",
            "changes_detected": len(changes) > 0,
            "changed_settings": changes,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reload configuration: {str(e)}")


@router.get("/health", summary="Validate all settings")
async def health_check() -> Dict[str, Any]:
    """Validate all settings are correct and services are reachable"""
    try:
        settings = get_settings()
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {
                "settings_loaded": True,
                "elasticsearch_configured": bool(settings.elasticsearch.cookie),
                "baseline_valid": False,
                "time_range_valid": False,
                "thresholds_valid": False
            },
            "warnings": []
        }

        # Validate baseline dates
        try:
            start = datetime.fromisoformat(settings.processing.baseline_start)
            end = datetime.fromisoformat(settings.processing.baseline_end)
            if start < end:
                health_status["checks"]["baseline_valid"] = True
            else:
                health_status["warnings"].append("Baseline end date is before start date")
        except Exception as e:
            health_status["warnings"].append(f"Invalid baseline dates: {str(e)}")

        # Validate time range
        if settings.processing.current_time_range:
            health_status["checks"]["time_range_valid"] = True

        # Validate thresholds
        if (settings.processing.critical_threshold < settings.processing.warning_threshold < 0 and
            settings.processing.medium_volume_threshold < settings.processing.high_volume_threshold):
            health_status["checks"]["thresholds_valid"] = True
        else:
            health_status["warnings"].append("Threshold values may be misconfigured")

        # Check if Elasticsearch is configured
        if not settings.elasticsearch.cookie:
            health_status["warnings"].append("Elasticsearch cookie not configured")
            health_status["status"] = "degraded"

        # Overall status
        if not all(health_status["checks"].values()):
            health_status["status"] = "degraded"

        return health_status
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/export", summary="Export current configuration")
async def export_configuration(include_sensitive: bool = False) -> Response:
    """Export current configuration as JSON file"""
    try:
        settings = get_settings()
        config_data = {
            "exported_at": datetime.utcnow().isoformat(),
            "app_name": settings.app_name,
            "elasticsearch": {
                "url": str(settings.elasticsearch.url),
                "index_pattern": settings.elasticsearch.index_pattern,
                "timeout": settings.elasticsearch.timeout
            },
            "kibana": {
                "url": str(settings.kibana.url),
                "discover_path": settings.kibana.discover_path
            },
            "processing": {
                "baseline_start": settings.processing.baseline_start,
                "baseline_end": settings.processing.baseline_end,
                "current_time_range": settings.processing.current_time_range,
                "high_volume_threshold": settings.processing.high_volume_threshold,
                "medium_volume_threshold": settings.processing.medium_volume_threshold,
                "critical_threshold": settings.processing.critical_threshold,
                "warning_threshold": settings.processing.warning_threshold
            },
            "dashboard": {
                "refresh_interval": settings.dashboard.refresh_interval,
                "max_events_display": settings.dashboard.max_events_display,
                "enable_websocket": settings.dashboard.enable_websocket,
                "theme": settings.dashboard.theme
            }
        }

        # Only include sensitive data if requested
        if include_sensitive:
            config_data["elasticsearch"]["cookie_length"] = len(settings.elasticsearch.cookie)

        # Return as downloadable JSON file
        return Response(
            content=json.dumps(config_data, indent=2),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename=rad_monitor_config_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export configuration: {str(e)}")


@router.post("/update", summary="Update configuration from frontend")
async def update_configuration(config_data: Dict[str, Any]) -> Dict[str, Any]:
    """Update configuration with values from frontend"""
    try:
        settings = update_from_frontend(config_data, save=True)
        return {
            "status": "success",
            "message": "Configuration updated successfully",
            "config": settings.to_frontend_config()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update configuration: {str(e)}")


@router.post("/validate", summary="Validate configuration")
async def validate_configuration(config_data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate configuration without saving"""
    try:
        # Create a temporary settings instance for validation
        current = get_settings()
        test_settings = current.update_from_frontend(config_data)
        
        # Validation passed if we got here
        return {
            "valid": True,
            "errors": [],
            "warnings": []
        }
    except ValueError as e:
        return {
            "valid": False,
            "errors": [str(e)],
            "warnings": []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation error: {str(e)}")


@router.get("/environment", summary="Get required environment variables")
async def get_environment_template() -> Dict[str, Any]:
    """Return template of required environment variables"""
    return {
        "elasticsearch": {
            "ES_URL": "Elasticsearch URL (default: https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243)",
            "ES_COOKIE": "Authentication cookie for Elasticsearch (required)",
            "ES_INDEX_PATTERN": "Index pattern for queries (default: traffic-*)",
            "ES_TIMEOUT": "Query timeout in seconds (default: 30)"
        },
        "kibana": {
            "KIBANA_URL": "Kibana base URL (default: https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243)",
            "KIBANA_DISCOVER_PATH": "Path to Kibana discover (default: /app/discover#/)"
        },
        "processing": {
            "BASELINE_START": "Baseline period start date in ISO format (required, e.g., 2024-01-01T00:00:00)",
            "BASELINE_END": "Baseline period end date in ISO format (required, e.g., 2024-01-07T00:00:00)",
            "CURRENT_TIME_RANGE": "Current period time range (default: now-12h)",
            "HIGH_VOLUME_THRESHOLD": "High volume event threshold (default: 1000)",
            "MEDIUM_VOLUME_THRESHOLD": "Medium volume event threshold (default: 100)",
            "CRITICAL_THRESHOLD": "Critical score threshold (default: -80)",
            "WARNING_THRESHOLD": "Warning score threshold (default: -50)"
        },
        "dashboard": {
            "DASHBOARD_REFRESH_INTERVAL": "Auto-refresh interval in seconds (default: 300)",
            "DASHBOARD_MAX_EVENTS_DISPLAY": "Maximum events to display (default: 200)",
            "DASHBOARD_ENABLE_WEBSOCKET": "Enable real-time updates via WebSocket (default: false)",
            "DASHBOARD_THEME": "UI theme - light, dark, or auto (default: light)"
        },
        "app": {
            "APP_NAME": "Application name (default: RAD Monitor)",
            "DEBUG": "Debug mode (default: false)",
            "CORS_ALLOWED_ORIGINS": "Comma-separated list of allowed CORS origins"
        }
    }
