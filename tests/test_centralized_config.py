#!/usr/bin/env python3
"""
Test centralized configuration system
"""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add src to path for imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the settings module
from src.config.settings import (
    Settings, ElasticsearchSettings, KibanaSettings, ProcessingSettings,
    DashboardSettings, CorsProxySettings,
    get_settings, reload_settings, update_settings, update_from_frontend
)


class TestCentralizedConfig:
    """Test centralized configuration functionality"""
    
    def test_default_settings_creation(self):
        """Test that default settings are created correctly"""
        settings = Settings()
        
        assert settings.app_name == "RAD Monitor"
        assert settings.debug is False
        assert settings.log_level == "INFO"
        
        # Test nested settings
        assert str(settings.elasticsearch.url) == "https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243/"
        assert settings.processing.baseline_start == "2025-06-01"
        assert settings.dashboard.theme == "light"
    
    def test_validation_date_range(self):
        """Test date range validation"""
        with pytest.raises(ValueError, match="baseline_end must be after baseline_start"):
            ProcessingSettings(
                baseline_start="2025-06-09",
                baseline_end="2025-06-01"
            )
    
    def test_validation_thresholds(self):
        """Test threshold validation"""
        # Test warning > critical validation
        with pytest.raises(ValueError, match="warning_threshold must be greater than critical_threshold"):
            ProcessingSettings(
                critical_threshold=-50,
                warning_threshold=-80
            )
        
        # Test medium < high volume validation
        with pytest.raises(ValueError, match="medium_volume_threshold must be less than high_volume_threshold"):
            ProcessingSettings(
                high_volume_threshold=100,
                medium_volume_threshold=200
            )
    
    def test_validation_time_range(self):
        """Test time range validation"""
        # Valid patterns
        valid_ranges = ["now-12h", "now-7d", "now-1w", "inspection_time", "-48h-24h"]
        for time_range in valid_ranges:
            settings = ProcessingSettings(current_time_range=time_range)
            assert settings.current_time_range == time_range
        
        # Invalid pattern
        with pytest.raises(ValueError, match="Invalid time range format"):
            ProcessingSettings(current_time_range="invalid-range")
    
    def test_save_to_file(self, tmp_path):
        """Test saving settings to JSON file"""
        settings = Settings()
        config_file = tmp_path / "test_settings.json"
        
        settings.save_to_file(config_file)
        
        assert config_file.exists()
        
        # Load and verify
        with open(config_file) as f:
            data = json.load(f)
        
        assert data["app_name"] == "RAD Monitor"
        assert data["elasticsearch"]["url"] == "https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243/"
    
    def test_load_from_file(self, tmp_path):
        """Test loading settings from JSON file"""
        config_file = tmp_path / "test_settings.json"
        
        # Create test config
        test_config = {
            "app_name": "Test Monitor",
            "debug": True,
            "elasticsearch": {
                "url": "https://test.es.com:9200",
                "cookie": "test_cookie",
                "index_pattern": "test-*",
                "timeout": 60
            },
            "processing": {
                "baseline_start": "2025-07-01",
                "baseline_end": "2025-07-08",
                "current_time_range": "now-24h",
                "high_volume_threshold": 2000,
                "medium_volume_threshold": 200,
                "critical_threshold": -90,
                "warning_threshold": -60,
                "min_daily_volume": 50
            }
        }
        
        with open(config_file, 'w') as f:
            json.dump(test_config, f)
        
        # Load settings
        settings = Settings.load_from_file(config_file)
        
        assert settings.app_name == "Test Monitor"
        assert settings.debug is True
        assert str(settings.elasticsearch.url) == "https://test.es.com:9200/"
        assert settings.elasticsearch.cookie == "test_cookie"
        assert settings.processing.baseline_start == "2025-07-01"
        assert settings.processing.high_volume_threshold == 2000
    
    def test_merge_with_dict(self):
        """Test merging settings with update dictionary"""
        settings = Settings()
        
        updates = {
            "app_name": "Updated Monitor",
            "processing": {
                "baseline_start": "2025-05-01",  # Change to earlier date to keep valid
                "high_volume_threshold": 3000
            }
        }
        
        new_settings = settings.merge_with_dict(updates)
        
        assert new_settings.app_name == "Updated Monitor"
        assert new_settings.processing.baseline_start == "2025-05-01"
        assert new_settings.processing.high_volume_threshold == 3000
        # Unchanged values should remain
        assert new_settings.processing.baseline_end == "2025-06-09"
    
    def test_to_frontend_config(self):
        """Test conversion to frontend format"""
        settings = Settings()
        frontend_config = settings.to_frontend_config()
        
        assert frontend_config["baselineStart"] == "2025-06-01"
        assert frontend_config["highVolumeThreshold"] == 1000
        assert frontend_config["autoRefreshInterval"] == 300000  # Converted to ms
        assert frontend_config["kibanaUrl"] == "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243/"
        assert frontend_config["environment"] == "production"
    
    def test_update_from_frontend(self):
        """Test updating from frontend format"""
        settings = Settings()
        
        frontend_config = {
            "baselineStart": "2025-08-01",
            "baselineEnd": "2025-08-15",
            "highVolumeThreshold": 2500,
            "theme": "dark",
            "autoRefreshEnabled": False,
            "autoRefreshInterval": 600000  # 10 minutes in ms
        }
        
        updated = settings.update_from_frontend(frontend_config)
        
        assert updated.processing.baseline_start == "2025-08-01"
        assert updated.processing.baseline_end == "2025-08-15"
        assert updated.processing.high_volume_threshold == 2500
        assert updated.dashboard.theme == "dark"
        assert updated.dashboard.enable_websocket is False
        assert updated.dashboard.refresh_interval == 600  # Converted from ms
    
    def test_baseline_days_calculation(self):
        """Test baseline days calculation"""
        settings = Settings()
        assert settings.baseline_days == 8  # June 1-9 is 8 days
        
        # Test with custom dates
        settings.processing.baseline_start = "2025-01-01"
        settings.processing.baseline_end = "2025-01-31"
        assert settings.baseline_days == 30
    
    def test_environment_variable_override(self, monkeypatch, tmp_path):
        """Test that environment variables override defaults"""
        # Set environment variables
        monkeypatch.setenv("ES_COOKIE", "env_cookie")
        monkeypatch.setenv("ES_URL", "https://env.es.com:9200")
        monkeypatch.setenv("BASELINE_START", "2025-05-01")  # Valid date before baseline_end
        monkeypatch.setenv("BASELINE_END", "2025-05-15")     # Also set end date
        monkeypatch.setenv("DASHBOARD_THEME", "dark")
        
        # Create settings
        settings = Settings()
        
        # Should use env values
        assert settings.elasticsearch.cookie == "env_cookie"
        assert str(settings.elasticsearch.url) == "https://env.es.com:9200/"
        assert settings.processing.baseline_start == "2025-05-01"
        assert settings.processing.baseline_end == "2025-05-15"
        assert settings.dashboard.theme == "dark"
    
    @patch('src.config.settings.CONFIG_FILE')
    def test_get_settings_caching(self, mock_config_file, tmp_path):
        """Test that get_settings uses caching"""
        config_file = tmp_path / "settings.json"
        mock_config_file.exists.return_value = False
        mock_config_file.parent = tmp_path
        
        # First call should create settings
        settings1 = get_settings()
        settings2 = get_settings()
        
        # Should be the same instance (cached)
        assert settings1 is settings2
    
    def test_update_settings(self, tmp_path):
        """Test update_settings function"""
        with patch('src.config.settings.CONFIG_FILE', tmp_path / "settings.json"):
            # Get initial settings
            initial = get_settings()
            initial_app_name = initial.app_name
            
            # Update settings
            updates = {
                "app_name": "Updated RAD Monitor",
                "processing": {
                    "baseline_start": "2025-05-01",
                    "baseline_end": "2025-05-15"  # Need to update both for valid date range
                }
            }
            
            updated = update_settings(updates, save=False)
            
            assert updated.app_name == "Updated RAD Monitor"
            assert updated.processing.baseline_start == "2025-05-01"
            assert updated.processing.baseline_end == "2025-05-15"


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 