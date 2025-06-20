"""
Test suite for Configuration Management API
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config.settings import Settings, get_settings, reload_settings
from src.api.config_api import router
from fastapi import FastAPI

# Create test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestConfigAPI:
    """Test configuration API endpoints"""

    def setup_method(self):
        """Set up test environment"""
        # Mock environment variables
        self.test_env = {
            'ES_COOKIE': 'test_cookie_123',
            'BASELINE_START': '2024-01-01T00:00:00',
            'BASELINE_END': '2024-01-07T00:00:00',
            'CURRENT_TIME_RANGE': 'now-12h',
            'HIGH_VOLUME_THRESHOLD': '1000',
            'MEDIUM_VOLUME_THRESHOLD': '100',
            'CRITICAL_THRESHOLD': '-80',
            'WARNING_THRESHOLD': '-50'
        }

    def test_get_all_settings(self):
        """Test GET /api/config/settings endpoint"""
        with patch.dict(os.environ, self.test_env, clear=True):
            response = client.get("/api/config/settings")
            assert response.status_code == 200

            data = response.json()
            assert 'app_name' in data
            assert 'elasticsearch' in data
            assert 'processing' in data
            assert 'dashboard' in data

            # Check elasticsearch settings
            assert data['elasticsearch']['cookie_configured'] is True
            assert 'url' in data['elasticsearch']

            # Check processing settings
            assert data['processing']['baseline_start'] == '2024-01-01T00:00:00'
            assert data['processing']['baseline_end'] == '2024-01-07T00:00:00'
            assert data['processing']['baseline_days'] == 6
            assert data['processing']['high_volume_threshold'] == 1000

    def test_get_processing_settings(self):
        """Test GET /api/config/settings/processing endpoint"""
        with patch.dict(os.environ, self.test_env, clear=True):
            response = client.get("/api/config/settings/processing")
            assert response.status_code == 200

            data = response.json()
            assert 'config' in data
            assert 'baseline_days' in data
            assert 'thresholds' in data

            # Check legacy format compatibility
            config = data['config']
            assert config['baselineStart'] == '2024-01-01T00:00:00'
            assert config['baselineEnd'] == '2024-01-07T00:00:00'
            assert config['currentTimeRange'] == 'now-12h'
            assert config['highVolumeThreshold'] == 1000

    def test_reload_configuration(self):
        """Test POST /api/config/reload endpoint"""
        with patch.dict(os.environ, self.test_env, clear=True):
            # Initial load
            initial_response = client.get("/api/config/settings")
            initial_data = initial_response.json()

            # Modify environment
            with patch.dict(os.environ, {'BASELINE_START': '2024-02-01T00:00:00'}):
                # Reload
                response = client.post("/api/config/reload")
                assert response.status_code == 200

                data = response.json()
                assert data['status'] == 'success'
                assert data['changes_detected'] is True
                assert 'Baseline start date' in data['changed_settings']

    def test_health_check(self):
        """Test GET /api/config/health endpoint"""
        with patch.dict(os.environ, self.test_env, clear=True):
            response = client.get("/api/config/health")
            assert response.status_code == 200

            data = response.json()
            assert data['status'] in ['healthy', 'degraded']
            assert 'checks' in data
            assert 'warnings' in data

            # Check individual health checks
            checks = data['checks']
            assert checks['settings_loaded'] is True
            assert checks['elasticsearch_configured'] is True
            assert checks['baseline_valid'] is True
            assert checks['time_range_valid'] is True
            assert checks['thresholds_valid'] is True

    def test_health_check_with_invalid_dates(self):
        """Test health check with invalid baseline dates"""
        invalid_env = self.test_env.copy()
        invalid_env['BASELINE_START'] = '2024-01-07T00:00:00'
        invalid_env['BASELINE_END'] = '2024-01-01T00:00:00'  # End before start

        with patch.dict(os.environ, invalid_env, clear=True):
            response = client.get("/api/config/health")
            assert response.status_code == 200

            data = response.json()
            assert data['status'] == 'degraded'
            assert 'Baseline end date is before start date' in data['warnings']
            assert data['checks']['baseline_valid'] is False

    def test_export_configuration(self):
        """Test GET /api/config/export endpoint"""
        with patch.dict(os.environ, self.test_env, clear=True):
            response = client.get("/api/config/export")
            assert response.status_code == 200
            assert response.headers['content-type'] == 'application/json'
            assert 'attachment' in response.headers['content-disposition']

            data = response.json()
            assert 'exported_at' in data
            assert 'elasticsearch' in data
            assert 'processing' in data
            assert 'dashboard' in data

            # Should not include sensitive data by default
            assert 'cookie' not in data['elasticsearch']

    def test_export_configuration_with_sensitive(self):
        """Test export with sensitive data included"""
        with patch.dict(os.environ, self.test_env, clear=True):
            response = client.get("/api/config/export?include_sensitive=true")
            assert response.status_code == 200

            data = response.json()
            assert 'cookie_length' in data['elasticsearch']
            assert data['elasticsearch']['cookie_length'] == len('test_cookie_123')

    def test_get_environment_template(self):
        """Test GET /api/config/environment endpoint"""
        response = client.get("/api/config/environment")
        assert response.status_code == 200

        data = response.json()
        assert 'elasticsearch' in data
        assert 'kibana' in data
        assert 'processing' in data
        assert 'dashboard' in data
        assert 'app' in data

        # Check that descriptions are provided
        assert 'ES_COOKIE' in data['elasticsearch']
        assert 'required' in data['elasticsearch']['ES_COOKIE']
        assert 'BASELINE_START' in data['processing']
        assert 'ISO format' in data['processing']['BASELINE_START']

    def test_settings_validation(self):
        """Test that invalid settings are rejected"""
        invalid_env = self.test_env.copy()
        invalid_env['CURRENT_TIME_RANGE'] = 'invalid-format'

        with patch.dict(os.environ, invalid_env, clear=True):
            # The validation should happen when settings are loaded
            with pytest.raises(ValueError):
                reload_settings()

    def test_backward_compatibility(self):
        """Test backward compatibility with legacy format"""
        with patch.dict(os.environ, self.test_env, clear=True):
            settings = get_settings()
            legacy_config = settings.to_processing_config()

            # Check legacy format keys
            assert 'baselineStart' in legacy_config
            assert 'baselineEnd' in legacy_config
            assert 'currentTimeRange' in legacy_config
            assert 'highVolumeThreshold' in legacy_config
            assert 'mediumVolumeThreshold' in legacy_config
            assert 'criticalThreshold' in legacy_config
            assert 'warningThreshold' in legacy_config

            # Verify values match
            assert legacy_config['baselineStart'] == settings.processing.baseline_start
            assert legacy_config['highVolumeThreshold'] == settings.processing.high_volume_threshold

    def test_missing_required_settings(self):
        """Test behavior when required settings are missing"""
        # Missing ES_COOKIE
        env_without_cookie = {k: v for k, v in self.test_env.items() if k != 'ES_COOKIE'}

        with patch.dict(os.environ, env_without_cookie, clear=True):
            # Should raise validation error for missing required field
            with pytest.raises(ValueError):
                reload_settings()

    def test_default_values(self):
        """Test that default values are used when optional settings are not provided"""
        minimal_env = {
            'ES_COOKIE': 'test_cookie',
            'BASELINE_START': '2024-01-01T00:00:00',
            'BASELINE_END': '2024-01-07T00:00:00'
        }

        with patch.dict(os.environ, minimal_env, clear=True):
            settings = get_settings()

            # Check defaults
            assert settings.processing.current_time_range == 'now-12h'
            assert settings.processing.high_volume_threshold == 1000
            assert settings.dashboard.refresh_interval == 300
            assert settings.dashboard.theme == 'light'
            assert settings.app_name == 'RAD Monitor'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
