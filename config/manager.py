"""
Configuration Manager for VH-RAD Traffic Monitor
Handles loading, merging, and managing configurations from multiple sources
"""
import os
import json
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, Union, List
from datetime import datetime
import shutil
from contextlib import contextmanager

from .models import AppConfig, get_config, reload_config


class ConfigurationManager:
    """Manages application configuration with multiple sources and environments"""

    def __init__(self, config_dir: Optional[Path] = None):
        self.config_dir = config_dir or Path("config")
        self.config_dir = Path(self.config_dir)
        self._ensure_config_structure()

    def _ensure_config_structure(self):
        """Ensure configuration directory structure exists"""
        self.config_dir.mkdir(exist_ok=True)
        (self.config_dir / "environments").mkdir(exist_ok=True)
        (self.config_dir / "backups").mkdir(exist_ok=True)

    def get_config(self, environment: Optional[str] = None) -> AppConfig:
        """Get configuration for specified environment"""
        if environment:
            # Try to load environment-specific config
            env_config_path = self.config_dir / "environments" / f"{environment}.yaml"
            if env_config_path.exists():
                return AppConfig.load_from_yaml(env_config_path)

        # Fall back to main config
        return get_config()

    def create_environment_config(self, environment: str, base_config: Optional[AppConfig] = None) -> Path:
        """Create environment-specific configuration"""
        env_config_path = self.config_dir / "environments" / f"{environment}.yaml"

        # Start with base config or current config
        config = base_config or get_config()

        # Apply environment-specific defaults
        if environment == "production":
            config.environment = "production"
            config.debug = False
            config.server.workers = 4
            config.server.reload = False
            config.security.require_auth = True
            config.security.enable_docs = False
            config.redis.enabled = True
        elif environment == "staging":
            config.environment = "staging"
            config.debug = False
            config.server.workers = 2
            config.security.require_auth = True
        elif environment == "development":
            config.environment = "development"
            config.debug = True
            config.server.workers = 1
            config.server.reload = True
            config.security.require_auth = False

        # Save environment config
        config.save_to_yaml(env_config_path)
        return env_config_path

    def backup_config(self, config_path: Optional[Path] = None) -> Path:
        """Create a backup of configuration file"""
        if config_path is None:
            config_path = self.config_dir / "config.yaml"

        config_path = Path(config_path)
        if not config_path.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")

        # Create backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{config_path.stem}_{timestamp}{config_path.suffix}"
        backup_path = self.config_dir / "backups" / backup_name

        # Copy file
        shutil.copy2(config_path, backup_path)

        # Keep only last 10 backups
        self._cleanup_old_backups()

        return backup_path

    def _cleanup_old_backups(self, keep_count: int = 10):
        """Remove old backup files, keeping only the most recent ones"""
        backup_dir = self.config_dir / "backups"
        if not backup_dir.exists():
            return

        # Get all backup files sorted by modification time
        backups = sorted(
            backup_dir.glob("*.yaml"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )

        # Remove old backups
        for backup in backups[keep_count:]:
            backup.unlink()

    def merge_configs(self, *configs: Union[Dict[str, Any], AppConfig]) -> AppConfig:
        """Merge multiple configurations, later configs override earlier ones"""
        merged_data = {}

        for config in configs:
            if isinstance(config, AppConfig):
                data = config.model_dump()
            else:
                data = config

            # Deep merge
            self._deep_merge(merged_data, data)

        return AppConfig(**merged_data)

    def _deep_merge(self, base: Dict[str, Any], update: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries"""
        for key, value in update.items():
            if key in base and isinstance(base[key], dict) and isinstance(value, dict):
                self._deep_merge(base[key], value)
            else:
                base[key] = value
        return base

    def validate_config(self, config: Union[AppConfig, Dict[str, Any], Path]) -> List[str]:
        """Validate configuration and return list of issues"""
        issues = []

        # Load config if needed
        if isinstance(config, Path):
            try:
                config = AppConfig.load_from_yaml(config)
            except Exception as e:
                return [f"Failed to load config: {e}"]
        elif isinstance(config, dict):
            try:
                config = AppConfig(**config)
            except Exception as e:
                return [f"Invalid configuration: {e}"]

        # Validate dates
        try:
            start = datetime.strptime(config.processing.baseline_start, '%Y-%m-%d')
            end = datetime.strptime(config.processing.baseline_end, '%Y-%m-%d')
            if end <= start:
                issues.append("baseline_end must be after baseline_start")
        except ValueError as e:
            issues.append(f"Invalid date format: {e}")

        # Validate thresholds
        if config.processing.critical_threshold > config.processing.warning_threshold:
            issues.append("critical_threshold should be less than warning_threshold")

        if config.processing.high_volume_threshold < config.processing.medium_volume_threshold:
            issues.append("high_volume_threshold should be greater than medium_volume_threshold")

        # Validate Redis if enabled
        if config.redis.enabled:
            try:
                config.validate_redis_requirements()
            except ImportError as e:
                issues.append(str(e))

        # Validate URLs
        for url_field in ['elasticsearch.url', 'kibana.url']:
            try:
                value = config
                for part in url_field.split('.'):
                    value = getattr(value, part)
                if not str(value).startswith(('http://', 'https://')):
                    issues.append(f"{url_field} must be a valid HTTP(S) URL")
            except AttributeError:
                issues.append(f"Missing {url_field}")

        return issues

    def export_env_template(self, environment: str = "development") -> str:
        """Export environment variable template for given environment"""
        config = self.get_config(environment)

        lines = [
            "# VH-RAD Traffic Monitor Environment Variables",
            f"# Generated for: {environment}",
            f"# Generated at: {datetime.now().isoformat()}",
            "",
            "# Application",
            f"ENVIRONMENT={environment}",
            f"APP_NAME={config.app_name}",
            f"DEBUG={str(config.debug).lower()}",
            "",
            "# Elasticsearch",
            f"ELASTICSEARCH__URL={config.elasticsearch.url}",
            "# ELASTICSEARCH__COOKIE=your_cookie_here",
            f"ELASTICSEARCH__INDEX_PATTERN={config.elasticsearch.index_pattern}",
            f"ELASTICSEARCH__TIMEOUT={config.elasticsearch.timeout}",
            "",
            "# Server",
            f"SERVER__HOST={config.server.host}",
            f"SERVER__PORT={config.server.port}",
            f"SERVER__WORKERS={config.server.workers}",
            f"SERVER__LOG_LEVEL={config.server.log_level}",
            "",
            "# Security",
            "# SECRET_KEY will be auto-generated if not provided",
            f"SECURITY__ACCESS_TOKEN_EXPIRE_MINUTES={config.security.access_token_expire_minutes}",
            f"SECURITY__REQUIRE_AUTH={str(config.security.require_auth).lower()}",
            "",
            "# Redis (optional)",
            f"REDIS__ENABLED={str(config.redis.enabled).lower()}",
        ]

        if config.redis.enabled:
            lines.extend([
                f"REDIS__URL={config.redis.url}",
                f"REDIS__TTL={config.redis.ttl}",
            ])

        return "\n".join(lines)

    def migrate_from_json(self, json_path: Path) -> AppConfig:
        """Migrate from old JSON configuration to new YAML format"""
        with open(json_path, 'r') as f:
            data = json.load(f)

        # Map old structure to new structure if needed
        if 'cors_proxy' not in data and 'corsProxy' in data:
            # Handle camelCase to snake_case conversion
            data['cors_proxy'] = {
                'port': data.get('corsProxy', {}).get('port', 8889),
                'enabled': True
            }

        # Create config from old data
        config = AppConfig(**data)

        # Save as YAML
        yaml_path = self.config_dir / "config.yaml"
        config.save_to_yaml(yaml_path)

        return config

    @contextmanager
    def temporary_config(self, config: AppConfig):
        """Context manager for temporary configuration changes"""
        original = get_config()
        try:
            # Apply temporary config
            global _config_instance
            _config_instance = config
            yield config
        finally:
            # Restore original
            _config_instance = original


# Convenience functions
def get_config_manager(config_dir: Optional[Path] = None) -> ConfigurationManager:
    """Get configuration manager instance"""
    return ConfigurationManager(config_dir)


def validate_current_config() -> List[str]:
    """Validate current configuration"""
    manager = get_config_manager()
    return manager.validate_config(get_config())
