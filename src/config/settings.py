"""
Centralized Configuration Management for RAD Monitor
Single source of truth for all application settings
"""

import os
import json
from pathlib import Path
from typing import Optional, Dict, Any, Union
from datetime import datetime
from pydantic import Field, field_validator, HttpUrl
from pydantic_settings import BaseSettings
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

# Configuration file paths
CONFIG_DIR = Path(__file__).parent.parent.parent / "config"
CONFIG_FILE = CONFIG_DIR / "settings.json"
ENV_FILE = Path(__file__).parent.parent.parent / ".env"


class ElasticsearchSettings(BaseSettings):
    """Elasticsearch connection settings"""
    url: HttpUrl = Field(
        default="https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243",
        description="Elasticsearch base URL"
    )
    cookie: Optional[str] = Field(
        default=None,
        description="Authentication cookie (sid)"
    )
    index_pattern: str = Field(
        default="traffic-*",
        description="Index pattern for queries"
    )
    timeout: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Query timeout in seconds"
    )

    class Config:
        env_prefix = "ELASTIC_"


class KibanaSettings(BaseSettings):
    """Kibana settings"""
    url: HttpUrl = Field(
        default="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243",
        description="Kibana base URL"
    )
    discover_path: str = Field(
        default="/app/discover#/",
        description="Path to Kibana discover"
    )
    search_path: str = Field(
        default="/api/console/proxy?path=traffic-*/_search&method=POST",
        description="Kibana search API path"
    )

    class Config:
        env_prefix = "KIBANA_"


class ProcessingSettings(BaseSettings):
    """Data processing and threshold settings"""
    baseline_start: str = Field(
        default="2025-06-01",
        description="Baseline period start date (YYYY-MM-DD)"
    )
    baseline_end: str = Field(
        default="2025-06-09",
        description="Baseline period end date (YYYY-MM-DD)"
    )
    current_time_range: str = Field(
        default="now-12h",
        description="Current period time range"
    )
    high_volume_threshold: int = Field(
        default=1000,
        ge=1,
        description="High volume event threshold"
    )
    medium_volume_threshold: int = Field(
        default=100,
        ge=1,
        description="Medium volume event threshold"
    )
    critical_threshold: int = Field(
        default=-80,
        le=0,
        description="Critical score threshold (negative)"
    )
    warning_threshold: int = Field(
        default=-50,
        le=0,
        description="Warning score threshold (negative)"
    )
    min_daily_volume: int = Field(
        default=100,
        ge=0,
        description="Minimum daily volume for calculations"
    )

    @field_validator('baseline_end')
    def validate_date_range(cls, v, info):
        """Ensure baseline_end is after baseline_start"""
        if 'baseline_start' in info.data and v <= info.data['baseline_start']:
            raise ValueError('baseline_end must be after baseline_start')
        return v

    @field_validator('warning_threshold')
    def validate_thresholds(cls, v, info):
        """Ensure warning threshold is greater than critical threshold"""
        if 'critical_threshold' in info.data and v <= info.data['critical_threshold']:
            raise ValueError('warning_threshold must be greater than critical_threshold')
        return v

    @field_validator('medium_volume_threshold')
    def validate_volume_thresholds(cls, v, info):
        """Ensure medium volume threshold is less than high volume threshold"""
        if 'high_volume_threshold' in info.data and v >= info.data['high_volume_threshold']:
            raise ValueError('medium_volume_threshold must be less than high_volume_threshold')
        return v

    @field_validator('current_time_range')
    def validate_time_range(cls, v):
        """Validate time range format"""
        valid_patterns = [
            r'^now-\d+[hdw]$',  # now-12h, now-7d, now-1w
            r'^inspection_time$',  # special inspection time
            r'^-\d+[hd]-\d+[hd]$'  # custom range: -48h-24h
        ]
        import re
        if not any(re.match(pattern, v) for pattern in valid_patterns):
            raise ValueError(f"Invalid time range format: {v}")
        return v

    class Config:
        env_prefix = ""  # No prefix for these settings


class DashboardSettings(BaseSettings):
    """Dashboard UI settings"""
    refresh_interval: int = Field(
        default=300,
        ge=30,
        le=3600,
        description="Auto-refresh interval in seconds"
    )
    max_events_display: int = Field(
        default=200,
        ge=10,
        le=1000,
        description="Maximum events to display"
    )
    enable_websocket: bool = Field(
        default=True,
        description="Enable real-time updates via WebSocket"
    )
    theme: str = Field(
        default="light",
        description="UI theme (light, dark, auto)"
    )
    console_chart_width: int = Field(
        default=30,
        ge=20,
        le=80,
        description="Console visualization chart width"
    )
    console_top_results: int = Field(
        default=20,
        ge=5,
        le=100,
        description="Number of top results in console view"
    )

    @field_validator('theme')
    def validate_theme(cls, v):
        """Validate theme value"""
        if v not in ['light', 'dark', 'auto']:
            raise ValueError(f"Invalid theme: {v}. Must be 'light', 'dark', or 'auto'")
        return v

    class Config:
        env_prefix = "DASHBOARD_"


class CorsProxySettings(BaseSettings):
    """CORS proxy settings"""
    port: int = Field(
        default=8889,
        ge=1024,
        le=65535,
        description="CORS proxy port"
    )
    allowed_origins: str = Field(
        default="*",
        description="Comma-separated list of allowed origins"
    )
    proxy_timeout: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Proxy request timeout in seconds"
    )

    class Config:
        env_prefix = "CORS_"


class Settings(BaseSettings):
    """Main application settings"""
    app_name: str = Field(
        default="RAD Monitor",
        description="Application name"
    )
    debug: bool = Field(
        default=False,
        description="Debug mode"
    )
    log_level: str = Field(
        default="INFO",
        description="Logging level"
    )
    
    # Nested settings
    elasticsearch: ElasticsearchSettings = Field(default_factory=ElasticsearchSettings)
    kibana: KibanaSettings = Field(default_factory=KibanaSettings)
    processing: ProcessingSettings = Field(default_factory=ProcessingSettings)
    dashboard: DashboardSettings = Field(default_factory=DashboardSettings)
    cors_proxy: CorsProxySettings = Field(default_factory=CorsProxySettings)
    
    # Calculated properties
    @property
    def baseline_days(self) -> int:
        """Calculate number of days in baseline period"""
        try:
            start = datetime.strptime(self.processing.baseline_start, "%Y-%m-%d")
            end = datetime.strptime(self.processing.baseline_end, "%Y-%m-%d")
            return (end - start).days
        except:
            return 7  # Default to 7 days
    
    def save_to_file(self, filepath: Optional[Path] = None) -> None:
        """Save current settings to JSON file"""
        filepath = filepath or CONFIG_FILE
        
        # Ensure directory exists
        filepath.parent.mkdir(parents=True, exist_ok=True)
        
        # Convert to dict and save
        settings_dict = self.model_dump()
        
        # Convert HttpUrl objects to strings
        def convert_urls(obj):
            if isinstance(obj, dict):
                return {k: convert_urls(v) for k, v in obj.items()}
            elif hasattr(obj, '__str__') and 'HttpUrl' in str(type(obj)):
                return str(obj)
            return obj
        
        settings_dict = convert_urls(settings_dict)
        
        with open(filepath, 'w') as f:
            json.dump(settings_dict, f, indent=2, default=str)
        
        logger.info(f"Settings saved to {filepath}")
    
    @classmethod
    def load_from_file(cls, filepath: Optional[Path] = None) -> 'Settings':
        """Load settings from JSON file"""
        filepath = filepath or CONFIG_FILE
        
        if not filepath.exists():
            logger.warning(f"Settings file {filepath} not found, using defaults")
            return cls()
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            # Create settings instance from loaded data
            settings = cls(**data)
            logger.info(f"Settings loaded from {filepath}")
            return settings
        except Exception as e:
            logger.error(f"Error loading settings from {filepath}: {e}")
            return cls()
    
    def merge_with_dict(self, updates: Dict[str, Any]) -> 'Settings':
        """Merge current settings with updates from a dictionary"""
        current = self.model_dump()
        
        # Deep merge the dictionaries
        def deep_merge(base: dict, updates: dict) -> dict:
            result = base.copy()
            for key, value in updates.items():
                if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = deep_merge(result[key], value)
                else:
                    result[key] = value
            return result
        
        merged = deep_merge(current, updates)
        
        # For partial updates to processing settings, ensure all fields are present
        if 'processing' in updates and isinstance(updates['processing'], dict):
            # Make sure all processing fields from current are preserved
            if 'processing' in merged:
                for field in ['baseline_start', 'baseline_end', 'current_time_range', 
                             'high_volume_threshold', 'medium_volume_threshold',
                             'critical_threshold', 'warning_threshold', 'min_daily_volume']:
                    if field not in merged['processing'] and field in current.get('processing', {}):
                        merged['processing'][field] = current['processing'][field]
        
        return Settings(**merged)
    
    def to_frontend_config(self) -> Dict[str, Any]:
        """Convert settings to frontend-compatible format"""
        return {
            "baselineStart": self.processing.baseline_start,
            "baselineEnd": self.processing.baseline_end,
            "currentTimeRange": self.processing.current_time_range,
            "highVolumeThreshold": self.processing.high_volume_threshold,
            "mediumVolumeThreshold": self.processing.medium_volume_threshold,
            "criticalThreshold": self.processing.critical_threshold,
            "warningThreshold": self.processing.warning_threshold,
            "minDailyVolume": self.processing.min_daily_volume,
            "autoRefreshEnabled": self.dashboard.enable_websocket,
            "autoRefreshInterval": self.dashboard.refresh_interval * 1000,  # Convert to ms
            "theme": self.dashboard.theme,
            "maxEventsDisplay": self.dashboard.max_events_display,
            "kibanaUrl": str(self.kibana.url),
            "elasticsearchUrl": str(self.elasticsearch.url),
            "corsProxyUrl": f"http://localhost:{self.cors_proxy.port}",
            "environment": "production" if not self.debug else "development"
        }
    
    def update_from_frontend(self, config: Dict[str, Any]) -> 'Settings':
        """Update settings from frontend configuration format"""
        updates = {
            "processing": {
                "baseline_start": config.get("baselineStart", self.processing.baseline_start),
                "baseline_end": config.get("baselineEnd", self.processing.baseline_end),
                "current_time_range": config.get("currentTimeRange", self.processing.current_time_range),
                "high_volume_threshold": config.get("highVolumeThreshold", self.processing.high_volume_threshold),
                "medium_volume_threshold": config.get("mediumVolumeThreshold", self.processing.medium_volume_threshold),
                "critical_threshold": config.get("criticalThreshold", self.processing.critical_threshold),
                "warning_threshold": config.get("warningThreshold", self.processing.warning_threshold),
                "min_daily_volume": config.get("minDailyVolume", self.processing.min_daily_volume)
            },
            "dashboard": {
                "enable_websocket": config.get("autoRefreshEnabled", self.dashboard.enable_websocket),
                "refresh_interval": config.get("autoRefreshInterval", self.dashboard.refresh_interval * 1000) // 1000,
                "theme": config.get("theme", self.dashboard.theme),
                "max_events_display": config.get("maxEventsDisplay", self.dashboard.max_events_display)
            }
        }
        
        return self.merge_with_dict(updates)
    
    class Config:
        # env_file = ".env"  # Commented out to avoid file not found error
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"  # Allow extra fields from .env


# Global settings instance
_settings: Optional[Settings] = None


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    global _settings
    
    if _settings is None:
        # Try to load from file first
        if CONFIG_FILE.exists():
            _settings = Settings.load_from_file()
        else:
            # Load from environment/defaults
            _settings = Settings()
            # Save defaults to file
            _settings.save_to_file()
    
    return _settings


def reload_settings() -> Settings:
    """Force reload settings from file"""
    global _settings
    get_settings.cache_clear()
    _settings = Settings.load_from_file()
    return _settings


def update_settings(updates: Dict[str, Any], save: bool = True) -> Settings:
    """Update settings with new values"""
    global _settings
    
    current = get_settings()
    _settings = current.merge_with_dict(updates)
    
    if save:
        _settings.save_to_file()
    
    get_settings.cache_clear()
    return _settings


def update_from_frontend(config: Dict[str, Any], save: bool = True) -> Settings:
    """Update settings from frontend configuration"""
    global _settings
    
    current = get_settings()
    _settings = current.update_from_frontend(config)
    
    if save:
        _settings.save_to_file()
    
    get_settings.cache_clear()
    return _settings


# Legacy compatibility functions
def get_elastic_cookie() -> Optional[str]:
    """Get Elasticsearch cookie for backward compatibility"""
    return get_settings().elasticsearch.cookie


def set_elastic_cookie(cookie: str, save: bool = True) -> None:
    """Set Elasticsearch cookie for backward compatibility"""
    update_settings({"elasticsearch": {"cookie": cookie}}, save=save)
