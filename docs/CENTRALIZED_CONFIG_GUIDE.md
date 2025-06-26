# Centralized Configuration Guide

## Overview

The RAD Monitor now uses a centralized configuration system that provides a single source of truth for all settings across the application. This replaces the previously scattered configuration in environment variables, localStorage, and hardcoded values.

## Key Features

- **Single Source of Truth**: All configuration stored in `config/settings.json`
- **Type-Safe Validation**: Pydantic models ensure configuration validity
- **Frontend-Backend Sync**: Automatic synchronization between services
- **JSON File Persistence**: Simple file-based storage, no database required
- **Environment Variable Override**: Settings can still be overridden via env vars
- **Import/Export**: Easy configuration backup and sharing

## Configuration Structure

```json
{
  "app_name": "RAD Monitor",
  "debug": false,
  "log_level": "INFO",
  "elasticsearch": {
    "url": "https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243",
    "cookie": null,
    "index_pattern": "traffic-*",
    "timeout": 30
  },
  "kibana": {
    "url": "https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243",
    "discover_path": "/app/discover#/",
    "search_path": "/api/console/proxy?path=traffic-*/_search&method=POST"
  },
  "processing": {
    "baseline_start": "2025-06-01",
    "baseline_end": "2025-06-09",
    "current_time_range": "now-12h",
    "high_volume_threshold": 1000,
    "medium_volume_threshold": 100,
    "critical_threshold": -80,
    "warning_threshold": -50,
    "min_daily_volume": 100
  },
  "dashboard": {
    "refresh_interval": 300,
    "max_events_display": 200,
    "enable_websocket": true,
    "theme": "light",
    "console_chart_width": 30,
    "console_top_results": 20
  },
  "cors_proxy": {
    "port": 8889,
    "allowed_origins": "*",
    "proxy_timeout": 30
  }
}
```

## Usage

### Python Backend

```python
from src.config.settings import get_settings, update_settings

# Get current settings
settings = get_settings()
print(settings.elasticsearch.url)
print(settings.processing.baseline_start)

# Update settings
update_settings({
    "processing": {
        "baseline_start": "2025-07-01"
    }
})

# Update from frontend format
from src.config.settings import update_from_frontend
frontend_config = {
    "baselineStart": "2025-07-01",
    "highVolumeThreshold": 2000
}
update_from_frontend(frontend_config)
```

### JavaScript Frontend

```javascript
import { ConfigService } from './assets/js/config-service.js';

// Initialize (happens automatically on page load)
await ConfigService.initialize();

// Get configuration
const config = ConfigService.getConfig();
console.log(config.baselineStart);

// Update configuration
await ConfigService.updateConfig({
    baselineStart: '2025-07-01',
    highVolumeThreshold: 2000
});

// Get specific value
const threshold = ConfigService.get('highVolumeThreshold', 1000);

// Set specific value
await ConfigService.set('theme', 'dark');

// Subscribe to changes
const unsubscribe = ConfigService.subscribe(({ event, newConfig, oldConfig }) => {
    console.log(`Config ${event}:`, newConfig);
});

// Export/Import
ConfigService.exportConfig();  // Downloads JSON file
await ConfigService.importConfig();  // Opens file picker
```

### API Endpoints

```bash
# Get all settings
GET /api/config/settings

# Update settings
POST /api/config/update
{
    "baselineStart": "2025-07-01",
    "highVolumeThreshold": 2000
}

# Validate configuration
POST /api/config/validate
{
    "baselineStart": "2025-07-01",
    "baselineEnd": "2025-07-08"
}

# Export configuration
GET /api/config/export

# Get environment variable template
GET /api/config/environment
```

## Environment Variable Override

Settings can be overridden using environment variables:

```bash
# Elasticsearch settings
ES_COOKIE=your_cookie_here
ES_URL=https://your-es-instance.com:9243
ES_INDEX_PATTERN=custom-index-*

# Processing settings
BASELINE_START=2025-07-01
BASELINE_END=2025-07-08
CURRENT_TIME_RANGE=now-24h
HIGH_VOLUME_THRESHOLD=2000

# Dashboard settings
DASHBOARD_THEME=dark
DASHBOARD_REFRESH_INTERVAL=600
DASHBOARD_ENABLE_WEBSOCKET=true
```

## Migration Guide

### From localStorage

The system automatically migrates existing localStorage configuration:

1. On first load, ConfigService checks for existing localStorage data
2. If found, it's imported into the centralized system
3. The localStorage remains as a fallback for compatibility

### From Environment Variables

1. Run the initialization script:
   ```bash
   node scripts/setup/init-config.js
   ```

2. Set your environment variables in `.env`:
   ```
   ES_COOKIE=your_cookie
   BASELINE_START=2025-06-01
   ```

3. The settings will be loaded from env vars on first run and saved to `settings.json`

### From Hardcoded Values

All hardcoded configuration has been replaced with references to the centralized system. No manual migration needed.

## Validation Rules

The configuration system enforces these validation rules:

1. **Date Validation**:
   - `baseline_end` must be after `baseline_start`
   - Dates must be in YYYY-MM-DD format

2. **Threshold Validation**:
   - `warning_threshold` > `critical_threshold` (both negative)
   - `medium_volume_threshold` < `high_volume_threshold` (both positive)
   - All thresholds must be valid integers

3. **Time Range Validation**:
   - Must match patterns: `now-\d+[hdw]`, `inspection_time`, or `-\d+[hd]-\d+[hd]`

4. **Port Validation**:
   - CORS proxy port must be between 1024 and 65535

## Auto-Sync Feature

Enable automatic synchronization between frontend and backend:

```javascript
// Start auto-sync (checks every 60 seconds)
ConfigService.startAutoSync(60000);

// Stop auto-sync
ConfigService.stopAutoSync();
```

## Best Practices

1. **Always Validate Before Saving**:
   ```javascript
   const validation = ConfigService.validateConfig(newConfig);
   if (validation.valid) {
       await ConfigService.updateConfig(newConfig);
   }
   ```

2. **Use Component-Specific Configs**:
   ```javascript
   const elasticsearchConfig = ConfigService.getComponentConfig('elasticsearch');
   ```

3. **Handle Update Failures**:
   ```javascript
   try {
       await ConfigService.updateConfig(newConfig);
   } catch (error) {
       console.error('Config update failed:', error);
       // Revert or retry
   }
   ```

4. **Subscribe to Changes in Components**:
   ```javascript
   componentDidMount() {
       this.unsubscribe = ConfigService.subscribe(this.handleConfigChange);
   }
   
   componentWillUnmount() {
       this.unsubscribe();
   }
   ```

## Troubleshooting

### Configuration Not Loading

1. Check if `config/settings.json` exists
2. Run `node scripts/setup/init-config.js` to create default config
3. Check browser console for errors
4. Verify API endpoint is accessible

### Changes Not Persisting

1. Check file permissions on `config/settings.json`
2. Verify backend server is running
3. Check for validation errors in response
4. Look for errors in browser console

### Environment Variables Not Working

1. Ensure `.env` file is in project root
2. Restart the server after changing env vars
3. Check that variable names match expected format
4. Verify Pydantic is reading the `.env` file

## Future Enhancements

- **Versioning**: Config schema versioning for migrations
- **Encryption**: Sensitive value encryption at rest
- **Audit Trail**: Track who changed what and when
- **Multi-Environment**: Separate configs for dev/staging/prod
- **Hot Reload**: Apply changes without restart 