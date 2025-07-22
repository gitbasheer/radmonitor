"""
Configuration Models for VH-RAD Traffic Monitor
Provides type-safe configuration with validation and defaults
"""
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, field_validator, HttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os
import yaml


class ElasticsearchConfig(BaseModel):
    """Elasticsearch connection configuration"""
    url: HttpUrl = Field(
        default="https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243/",
        description="Elasticsearch base URL"
    )
    cookie: Optional[SecretStr] = Field(
        default=None,
        description="Authentication cookie for Elasticsearch"
    )
    index_pattern: str = Field(
        default="traffic-*",
        description="Index pattern for queries"
    )
    timeout: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Request timeout in seconds"
    )
    verify_ssl: bool = Field(
        default=True,
        description="Whether to verify SSL certificates"
    )


class KibanaConfig(BaseModel):
    """Kibana configuration"""
    url: HttpUrl = Field(
        default="https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/",
        description="Kibana base URL"
    )
    discover_path: str = Field(
        default="/app/discover#/",
        description="Path to Kibana discover app"
    )
    search_path: str = Field(
        default="/api/console/proxy?path=traffic-*/_search&method=POST",
        description="Path for search API proxy"
    )


class ProcessingConfig(BaseModel):
    """Data processing configuration"""
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
        description="Current time range for comparisons"
    )
    high_volume_threshold: int = Field(
        default=1000,
        ge=1,
        le=1000000,
        description="Threshold for high-volume events"
    )
    medium_volume_threshold: int = Field(
        default=100,
        ge=1,
        le=100000,
        description="Threshold for medium-volume events"
    )
    critical_threshold: int = Field(
        default=-80,
        le=0,
        ge=-100,
        description="Critical score threshold (percentage)"
    )
    warning_threshold: int = Field(
        default=-50,
        le=0,
        ge=-100,
        description="Warning score threshold (percentage)"
    )
    min_daily_volume: int = Field(
        default=100,
        ge=0,
        description="Minimum daily volume to consider"
    )

    @field_validator('baseline_start', 'baseline_end')
    def validate_date_format(cls, v):
        """Validate date format"""
        try:
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except ValueError:
            raise ValueError(f"Date must be in YYYY-MM-DD format, got: {v}")

    @field_validator('baseline_end')
    def validate_date_range(cls, v, values):
        """Ensure baseline_end is after baseline_start"""
        if 'baseline_start' in values.data:
            start = datetime.strptime(values.data['baseline_start'], '%Y-%m-%d')
            end = datetime.strptime(v, '%Y-%m-%d')
            if end <= start:
                raise ValueError("baseline_end must be after baseline_start")
        return v


class RadTypeConfig(BaseModel):
    """RAD type configuration"""
    pattern: str = Field(description="Event ID pattern to match")
    display_name: str = Field(description="Display name for UI")
    enabled: bool = Field(default=True, description="Whether this RAD type is enabled")
    color: str = Field(default="#4CAF50", description="Color for visualization")
    description: Optional[str] = Field(default=None, description="Description of this RAD type")


class DashboardConfig(BaseModel):
    """Dashboard UI configuration"""
    refresh_interval: int = Field(
        default=300,
        ge=10,
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
        pattern="^(light|dark|auto)$",
        description="UI theme"
    )
    console_chart_width: int = Field(
        default=30,
        ge=10,
        le=100,
        description="Console chart width in characters"
    )
    console_top_results: int = Field(
        default=20,
        ge=5,
        le=100,
        description="Number of top results to show in console"
    )


class CorsProxyConfig(BaseModel):
    """CORS proxy configuration"""
    enabled: bool = Field(default=True, description="Whether CORS proxy is enabled")
    port: int = Field(default=8889, ge=1024, le=65535, description="Port for CORS proxy")
    allowed_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="Allowed CORS origins"
    )
    proxy_timeout: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Proxy request timeout in seconds"
    )


class ProxyConfig(BaseModel):
    """External proxy configuration"""
    type: str = Field(
        default="netlify",
        pattern="^(netlify|cloudflare|none)$",
        description="Type of external proxy"
    )
    enabled: bool = Field(default=False, description="Whether external proxy is enabled")
    url: Optional[HttpUrl] = Field(
        default=None,
        description="External proxy URL"
    )
    timeout: int = Field(
        default=30000,
        ge=5000,
        le=300000,
        description="Proxy timeout in milliseconds"
    )


class ServerConfig(BaseModel):
    """Server configuration"""
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, ge=1024, le=65535, description="Server port")
    workers: int = Field(default=1, ge=1, le=16, description="Number of worker processes")
    reload: bool = Field(default=False, description="Enable auto-reload in development")
    log_level: str = Field(
        default="INFO",
        pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$",
        description="Logging level"
    )


class SecurityConfig(BaseModel):
    """Security configuration"""
    secret_key: SecretStr = Field(
        default_factory=lambda: SecretStr(os.urandom(32).hex()),
        description="Secret key for JWT tokens"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30,
        ge=5,
        le=1440,
        description="Access token expiration in minutes"
    )
    allowed_hosts: List[str] = Field(
        default=["localhost", "127.0.0.1"],
        description="Allowed host headers"
    )
    enable_docs: bool = Field(
        default=True,
        description="Enable API documentation endpoints"
    )
    require_auth: bool = Field(
        default=False,
        description="Require authentication for API access"
    )
    disable_auth: bool = Field(
        default=False,
        description="Disable authentication (for development only)"
    )
    api_tokens: Optional[List[str]] = Field(
        default=None,
        description="Valid API tokens for authentication"
    )


class RedisConfig(BaseModel):
    """Redis configuration (optional)"""
    enabled: bool = Field(default=False, description="Whether Redis is enabled")
    url: Optional[str] = Field(
        default="redis://localhost:6379",
        description="Redis connection URL"
    )
    ttl: int = Field(
        default=300,
        ge=10,
        le=86400,
        description="Default cache TTL in seconds"
    )
    max_connections: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum Redis connections"
    )


class AppConfig(BaseSettings):
    """Main application configuration"""
    model_config = SettingsConfigDict(
        env_file='.env',
        env_file_encoding='utf-8',
        env_nested_delimiter='__',
        case_sensitive=False,
        extra='ignore'
    )

    # Application metadata
    app_name: str = Field(default="RAD Monitor", description="Application name")
    environment: str = Field(
        default="development",
        pattern="^(development|staging|production)$",
        description="Environment name"
    )
    debug: bool = Field(default=False, description="Debug mode")

    # Component configurations
    elasticsearch: ElasticsearchConfig = Field(
        default_factory=ElasticsearchConfig,
        description="Elasticsearch configuration"
    )
    kibana: KibanaConfig = Field(
        default_factory=KibanaConfig,
        description="Kibana configuration"
    )
    processing: ProcessingConfig = Field(
        default_factory=ProcessingConfig,
        description="Data processing configuration"
    )
    dashboard: DashboardConfig = Field(
        default_factory=DashboardConfig,
        description="Dashboard configuration"
    )
    cors_proxy: CorsProxyConfig = Field(
        default_factory=CorsProxyConfig,
        description="CORS proxy configuration"
    )
    proxy: ProxyConfig = Field(
        default_factory=ProxyConfig,
        description="External proxy configuration"
    )
    server: ServerConfig = Field(
        default_factory=ServerConfig,
        description="Server configuration"
    )
    security: SecurityConfig = Field(
        default_factory=SecurityConfig,
        description="Security configuration"
    )
    redis: RedisConfig = Field(
        default_factory=RedisConfig,
        description="Redis configuration"
    )
    rad_types: Dict[str, RadTypeConfig] = Field(
        default_factory=dict,
        description="RAD type configurations"
    )

    @classmethod
    def load_from_yaml(cls, yaml_path: Path) -> "AppConfig":
        """Load configuration from YAML file."""
        with open(yaml_path, "r") as f:
            data = yaml.safe_load(f)

        # Convert date objects to strings
        if "processing" in data:
            if "baseline_start" in data["processing"] and hasattr(data["processing"]["baseline_start"], "isoformat"):
                data["processing"]["baseline_start"] = data["processing"]["baseline_start"].strftime("%Y-%m-%d")
            if "baseline_end" in data["processing"] and hasattr(data["processing"]["baseline_end"], "isoformat"):
                data["processing"]["baseline_end"] = data["processing"]["baseline_end"].strftime("%Y-%m-%d")

        # Handle null secret_key
        if "security" in data and data["security"].get("secret_key") is None:
            data["security"]["secret_key"] = ""  # Empty string instead of None

        return cls(**data)

    def save_to_yaml(self, path: Union[str, Path]) -> None:
        """Save configuration to YAML file"""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        # Convert to dict, handling SecretStr
        data = self.model_dump()

        # Handle SecretStr fields
        if hasattr(self.elasticsearch, 'cookie') and self.elasticsearch.cookie:
            data['elasticsearch']['cookie'] = self.elasticsearch.cookie.get_secret_value()
        if hasattr(self.security, 'secret_key') and self.security.secret_key:
            data['security']['secret_key'] = self.security.secret_key.get_secret_value()

        with open(path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)

    def validate_redis_requirements(self) -> None:
        """Validate Redis configuration if enabled"""
        if self.redis.enabled:
            try:
                import redis
            except ImportError:
                raise ImportError(
                    "Redis is enabled but 'redis' package is not installed. "
                    "Install with: pip install redis"
                )


# Convenience function to get configuration
_config_instance: Optional[AppConfig] = None


def get_config() -> AppConfig:
    """Get the application configuration singleton"""
    global _config_instance
    if _config_instance is None:
        # Try to load from YAML first
        yaml_path = Path("config/config.yaml")
        if yaml_path.exists():
            _config_instance = AppConfig.load_from_yaml(yaml_path)
        else:
            # Fall back to environment and defaults
            _config_instance = AppConfig()
    return _config_instance


def reload_config() -> AppConfig:
    """Reload configuration from files"""
    global _config_instance
    _config_instance = None
    return get_config()
