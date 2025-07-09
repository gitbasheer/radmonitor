#!/usr/bin/env node

/**
 * Initialize centralized configuration system
 * Creates default settings.json if it doesn't exist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_DIR = path.join(__dirname, '..', '..', 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json');

// Default configuration matching the Python Settings class
const DEFAULT_CONFIG = {
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
                    "port": 8000,
        "allowed_origins": "*",
        "proxy_timeout": 30
    }
};

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    console.log(`Creating config directory: ${CONFIG_DIR}`);
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Check if config file exists
if (!fs.existsSync(CONFIG_FILE)) {
    console.log(`Creating default configuration file: ${CONFIG_FILE}`);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
    console.log('Default configuration created successfully!');
} else {
    console.log(`Configuration file already exists: ${CONFIG_FILE}`);

    // Validate existing config
    try {
        const existingConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        console.log('Existing configuration is valid JSON');

        // Check for missing keys and merge with defaults
        let updated = false;
        const mergedConfig = mergeConfigs(DEFAULT_CONFIG, existingConfig);

        if (JSON.stringify(mergedConfig) !== JSON.stringify(existingConfig)) {
            console.log('Updating configuration with missing default values...');
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2));
            console.log('Configuration updated successfully!');
        }
    } catch (error) {
        console.error('Error reading existing configuration:', error.message);
        console.log('Creating backup and generating new configuration...');

        // Backup corrupted file
        const backupFile = `${CONFIG_FILE}.backup.${Date.now()}`;
        fs.copyFileSync(CONFIG_FILE, backupFile);
        console.log(`Backup created: ${backupFile}`);

        // Create new config
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
        console.log('New configuration created successfully!');
    }
}

// Helper function to deep merge configurations
function mergeConfigs(defaultObj, userObj) {
    const result = { ...defaultObj };

    for (const key in userObj) {
        if (userObj.hasOwnProperty(key)) {
            if (typeof userObj[key] === 'object' && userObj[key] !== null && !Array.isArray(userObj[key])) {
                result[key] = mergeConfigs(defaultObj[key] || {}, userObj[key]);
            } else {
                result[key] = userObj[key];
            }
        }
    }

    return result;
}

console.log('\nConfiguration initialization complete!');
console.log('You can now:');
console.log('1. Edit config/settings.json directly');
console.log('2. Use environment variables to override settings');
console.log('3. Update settings via the API at /api/config/update');
console.log('\nEnvironment variable format:');
console.log('- ES_COOKIE=your_cookie');
console.log('- BASELINE_START=2025-06-01');
console.log('- DASHBOARD_THEME=dark');
console.log('- etc.');
