/**
 * Configuration Manager for RAD Monitor Dashboard
 * Handles loading, saving, and managing dashboard configuration
 */

// ESM: Import dependencies
import TimeRangeUtils from './time-range-utils.js';

// ESM: Converted from IIFE to ES module export
export const ConfigManager = (() => {
    'use strict';

    const CONFIG_KEY = 'radMonitorConfig';
    const DEFAULT_CONFIG = {
        baselineStart: '2025-06-01',
        baselineEnd: '2025-06-09',
        currentTimeRange: 'now-12h',
        highVolumeThreshold: 1000,
        mediumVolumeThreshold: 100
    };

    /**
     * Get current configuration from form inputs
     */
    function getCurrentConfig() {
        // Handle cases where DOM elements might not exist (e.g., in tests)
        const getElementValue = (id, defaultValue) => {
            const element = document.getElementById(id);
            return element ? element.value : defaultValue;
        };

        return {
            baselineStart: getElementValue('baselineStart', DEFAULT_CONFIG.baselineStart),
            baselineEnd: getElementValue('baselineEnd', DEFAULT_CONFIG.baselineEnd),
            currentTimeRange: getElementValue('currentTimeRange', DEFAULT_CONFIG.currentTimeRange),
            highVolumeThreshold: parseInt(getElementValue('highVolumeThreshold', DEFAULT_CONFIG.highVolumeThreshold)) || DEFAULT_CONFIG.highVolumeThreshold,
            mediumVolumeThreshold: parseInt(getElementValue('mediumVolumeThreshold', DEFAULT_CONFIG.mediumVolumeThreshold)) || DEFAULT_CONFIG.mediumVolumeThreshold,
            minDailyVolume: parseInt(getElementValue('minDailyVolume', '100')) || 100,
            criticalThreshold: parseInt(getElementValue('criticalThreshold', '-80')) || -80,
            warningThreshold: parseInt(getElementValue('warningThreshold', '-50')) || -50,
            autoRefreshEnabled: document.getElementById('autoRefreshEnabled')?.checked ?? true,
            autoRefreshInterval: parseInt(getElementValue('autoRefreshInterval', '300')) || 300
        };
    }

    /**
     * Load configuration from localStorage
     */
    function loadConfiguration() {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            try {
                const config = JSON.parse(saved);

                // Validate and fix time range if needed
                if (config.currentTimeRange && !TimeRangeUtils.validateTimeRange(config.currentTimeRange)) {
                    config.currentTimeRange = DEFAULT_CONFIG.currentTimeRange;
                    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
                    console.log('Fixed invalid time range in saved configuration');
                }

                // Apply to form inputs
                document.getElementById('baselineStart').value = config.baselineStart || DEFAULT_CONFIG.baselineStart;
                document.getElementById('baselineEnd').value = config.baselineEnd || DEFAULT_CONFIG.baselineEnd;
                document.getElementById('currentTimeRange').value = config.currentTimeRange || DEFAULT_CONFIG.currentTimeRange;
                document.getElementById('highVolumeThreshold').value = config.highVolumeThreshold || DEFAULT_CONFIG.highVolumeThreshold;
                document.getElementById('mediumVolumeThreshold').value = config.mediumVolumeThreshold || DEFAULT_CONFIG.mediumVolumeThreshold;

                return config;
            } catch (e) {
                console.error('Failed to load configuration:', e);
                localStorage.removeItem(CONFIG_KEY);
            }
        }

        // Set defaults if no saved config
        document.getElementById('currentTimeRange').value = DEFAULT_CONFIG.currentTimeRange;
        return DEFAULT_CONFIG;
    }

    /**
     * Save configuration to localStorage
     */
    function saveConfiguration(config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    /**
     * Apply configuration and trigger refresh
     */
    function applyConfiguration() {
        const previousConfig = getCurrentConfig();
        const config = getCurrentConfig();

        // Get performance metrics before config change
        const metricsBefore = typeof DataLayer !== 'undefined' ? DataLayer.getPerformanceMetrics() : null;

        saveConfiguration(config);

        // Log configuration change with performance context
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
            DataLayer.logAction('CONFIG_CHANGE_APPLIED', {
                previousConfig,
                newConfig: config,
                performanceMetrics: metricsBefore,
                changes: {
                    baselineChanged: previousConfig.baselineStart !== config.baselineStart ||
                                   previousConfig.baselineEnd !== config.baselineEnd,
                    timeRangeChanged: previousConfig.currentTimeRange !== config.currentTimeRange,
                    thresholdsChanged: previousConfig.highVolumeThreshold !== config.highVolumeThreshold ||
                                     previousConfig.mediumVolumeThreshold !== config.mediumVolumeThreshold
                }
            });
        }

        // Show immediate feedback
        const status = document.getElementById('refreshStatus');
        status.textContent = 'Configuration saved! Click refresh to apply.';

        // Optional: Auto-refresh with new configuration
        setTimeout(() => {
            Dashboard.refresh();

            // Check performance impact after refresh completes
            setTimeout(() => {
                if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                    const metricsAfter = DataLayer.getPerformanceMetrics();

                    // Compare performance before and after
                    if (metricsBefore && metricsAfter) {
                        const performanceImpact = {
                            queryDurationChange: metricsAfter.averageQueryDuration - metricsBefore.averageQueryDuration,
                            cacheHitRateChange: metricsAfter.cacheHitRate - metricsBefore.cacheHitRate,
                            failureChange: metricsAfter.failedQueries - metricsBefore.failedQueries
                        };

                        DataLayer.logAction('CONFIG_CHANGE_IMPACT', {
                            configChange: config.currentTimeRange !== previousConfig.currentTimeRange ?
                                         `${previousConfig.currentTimeRange} -> ${config.currentTimeRange}` :
                                         'other changes',
                            performanceImpact,
                            improved: performanceImpact.queryDurationChange < 0 ||
                                    performanceImpact.cacheHitRateChange > 0
                        });
                    }
                }
            }, 5000); // Wait 5 seconds for refresh to complete
        }, 1000);
    }

    /**
     * Export configuration as JSON file
     */
    function exportConfiguration() {
        const config = getCurrentConfig();
        config.timestamp = new Date().toISOString();

        // Include current performance metrics in export
        if (typeof DataLayer !== 'undefined') {
            config.performanceSnapshot = DataLayer.getPerformanceMetrics();
        }

        const dataStr = JSON.stringify(config, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'rad-monitor-config.json';
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Set preset time range
     */
    function setPresetTimeRange(preset) {
        const currentInput = document.getElementById('currentTimeRange');
        const previousValue = currentInput.value;

        switch(preset) {
            case '6h':
                currentInput.value = 'now-6h';
                break;
            case '12h':
                currentInput.value = 'now-12h';
                break;
            case '24h':
                currentInput.value = 'now-24h';
                break;
            case '3d':
                currentInput.value = 'now-3d';
                break;
            case 'inspection':
                currentInput.value = 'inspection_time';
                break;
        }

        // Log preset change with performance context
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction && previousValue !== currentInput.value) {
            const metrics = DataLayer.getPerformanceMetrics();
            DataLayer.logAction('TIME_RANGE_PRESET_SELECTED', {
                preset,
                previousValue,
                newValue: currentInput.value,
                currentPerformance: {
                    avgQueryDuration: metrics.averageQueryDuration,
                    cacheHitRate: metrics.cacheHitRate
                }
            });
        }

        // Update active button styling
        highlightActivePreset();
    }

    /**
     * Highlight active preset button
     */
    function highlightActivePreset() {
        const currentValue = document.getElementById('currentTimeRange').value;
        const presetButtons = document.querySelectorAll('.preset-button');

        // Map time range values to button text
        const valueToButton = {
            'now-6h': '6h',
            'now-12h': '12h',
            'now-24h': '24h',
            'now-3d': '3d',
            'inspection_time': 'Inspection'
        };

        const activeButton = valueToButton[currentValue];

        presetButtons.forEach(button => {
            if (button.textContent === activeButton) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Import configuration from JSON file
     */
    function importConfiguration() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const config = JSON.parse(event.target.result);

                    // Apply imported configuration
                    document.getElementById('baselineStart').value = config.baselineStart || DEFAULT_CONFIG.baselineStart;
                    document.getElementById('baselineEnd').value = config.baselineEnd || DEFAULT_CONFIG.baselineEnd;
                    document.getElementById('currentTimeRange').value = config.currentTimeRange || DEFAULT_CONFIG.currentTimeRange;
                    document.getElementById('highVolumeThreshold').value = config.highVolumeThreshold || DEFAULT_CONFIG.highVolumeThreshold;
                    document.getElementById('mediumVolumeThreshold').value = config.mediumVolumeThreshold || DEFAULT_CONFIG.mediumVolumeThreshold;

                    saveConfiguration(config);
                    alert('Configuration imported successfully!');
                } catch (error) {
                    alert('Failed to import configuration: Invalid JSON');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    /**
     * Check current environment
     */
    function checkEnvironment() {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isGitHubPages = window.location.hostname.includes('github.io');

        return {
            isLocalhost,
            isGitHubPages,
            isDevelopment: isLocalhost,
            isProduction: isGitHubPages,
            hostname: window.location.hostname
        };
    }

    /**
     * Validate configuration
     */
    function validateConfiguration(config) {
        const errors = [];

        // Validate dates
        if (!config.baselineStart || !config.baselineEnd) {
            errors.push('Baseline dates are required');
        }

        if (new Date(config.baselineStart) >= new Date(config.baselineEnd)) {
            errors.push('Baseline end date must be after start date');
        }

        // Validate time range
        if (!TimeRangeUtils.validateTimeRange(config.currentTimeRange)) {
            errors.push('Invalid time range format');
        }

        // Validate thresholds
        if (config.highVolumeThreshold < 1) {
            errors.push('High volume threshold must be at least 1');
        }

        if (config.mediumVolumeThreshold < 1) {
            errors.push('Medium volume threshold must be at least 1');
        }

        if (config.mediumVolumeThreshold >= config.highVolumeThreshold) {
            errors.push('Medium volume threshold must be less than high volume threshold');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Public API
    return {
        getCurrentConfig,
        loadConfiguration,
        saveConfiguration,
        exportConfiguration,
        importConfiguration,
        setPresetTimeRange,
        highlightActivePreset,
        checkEnvironment,
        validateConfiguration
    };
})();

// ESM: Export as default for convenience
export default ConfigManager;
