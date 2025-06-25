# Configuration Editor UI Guide

## Overview

The RAD Monitor dashboard now includes a simple configuration editor in the control panel that allows you to modify dashboard settings directly from the UI using the centralized ConfigService API.

## Location

The configuration editor is located in the dashboard's left sidebar control panel, below the existing configuration fields. Look for the "Advanced Configuration Editor" section.

## Features

### 1. Load Current Configuration
Click the "LOAD CURRENT CONFIG" button to fetch and display the current configuration from the backend.

### 2. Edit Settings
The editor displays three main sections:

- **Processing Settings**
  - Critical Threshold: Traffic drop percentage to trigger critical status
  - Warning Threshold: Traffic drop percentage to trigger warning status  
  - Min Daily Volume: Minimum daily traffic volume to include in analysis

- **Dashboard Settings**
  - Refresh Interval: Auto-refresh time in seconds
  - Max Events Display: Maximum number of events to show
  - Theme: Choose between light, dark, or auto theme
  - Console Chart Width: Width of ASCII charts in console

- **Elasticsearch Settings**
  - Index Pattern: Elasticsearch index pattern to query
  - Timeout: Query timeout in seconds

### 3. Save Changes
After modifying settings, click "SAVE CHANGES" to persist them to both the backend and browser storage. The dashboard will automatically refresh with the new settings.

### 4. Reset to Defaults
Click "RESET TO DEFAULTS" to restore all settings to their default values. You'll be prompted to confirm this action.

## Usage Example

1. Open the dashboard at http://localhost:8000
2. In the left sidebar, scroll down to "Advanced Configuration Editor"
3. Click "LOAD CURRENT CONFIG"
4. Modify any settings (e.g., change theme to "dark")
5. Click "SAVE CHANGES"
6. The dashboard will refresh with your new settings applied

## Browser Console Access

You can also interact with the configuration programmatically via the browser console:

```javascript
// Get current config
const config = await ConfigService.getConfig();

// Update a single setting
await ConfigService.updateSetting('dashboard.theme', 'dark');

// Subscribe to config changes
ConfigService.subscribe((newConfig) => {
    console.log('Config changed:', newConfig);
});

// Save to backend
await ConfigService.saveToBackend();
```

## Technical Details

- The editor uses the ConfigService API to interact with the centralized configuration
- Changes are validated on the backend using Pydantic models
- Configuration is persisted to `config/settings.json`
- The UI automatically syncs with backend changes
- All existing code remains compatible through the ConfigManager wrapper

## Troubleshooting

- If settings don't load, ensure the FastAPI server is running
- Check the browser console for any error messages
- Verify `config/settings.json` exists and is valid JSON
- The status message will show success/error states for all operations 