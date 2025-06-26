/**
 * Centralized Configuration Service
 * Single source of truth for all configuration, synced with backend
 */

export const ConfigService = (() => {
    'use strict';

    // Configuration state
    let config = null;
    let listeners = [];
    let syncTimer = null;

    // Backend endpoints - updated for unified server
    const ENDPOINTS = {
        get: '/api/v1/config/settings',
        update: '/api/v1/config/settings',  // Using the same endpoint for GET/POST
        validate: '/api/v1/config/validate',
        export: '/api/v1/config/export',
        environment: '/api/v1/config/environment'
    };

    /**
     * Get base URL based on environment
     */
    function getBaseUrl() {
        // Check if FastAPI is available
        if (window.FastAPIIntegration?.state?.serverAvailable) {
            return window.FASTAPI_URL || 'http://localhost:8000';
        }
        // Fallback to CORS proxy
        return 'http://localhost:8000';
    }

    /**
     * Make API request with proper error handling
     */
    async function apiRequest(endpoint, options = {}) {
        const url = `${getBaseUrl()}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            // Handle errors more gracefully - use debug level for CORS/connection errors
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                console.debug(`Config API connection error (${endpoint})`);
            } else {
                console.debug(`Config API error (${endpoint}):`, error.message);
            }
            throw error;
        }
    }

    /**
     * Initialize configuration from backend or localStorage
     */
    async function initialize() {
        // Check if we should skip backend initialization
        const skipBackend = localStorage.getItem('radMonitor_skipBackendConfig') === 'true';
        
        // Auto-skip backend if we're on localhost without explicit backend URL
        const isLocalDev = window.location.hostname === 'localhost' && 
                          !localStorage.getItem('radMonitor_backendUrl');
        
        // Skip backend in test environment
        const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
        
        if (!skipBackend && !isLocalDev && !isTest) {
            try {
                // Try to load from backend first
                const backendConfig = await loadFromBackend();
                if (backendConfig) {
                    config = backendConfig;
                    saveToLocalStorage();
                    notifyListeners('initialized', config);
                    return config;
                }
            } catch (error) {
                // Silently handle CORS errors and connection failures
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    // This is likely a CORS error or connection failure - handle silently
                    console.debug('Backend config service not available, using local configuration');
                } else {
                    // Log other types of errors with reduced verbosity
                    console.debug('Config backend error:', error.message);
                }
            }
        }

        // Fallback to localStorage
        config = loadFromLocalStorage();
        
        // If no config exists, use defaults
        if (!config) {
            config = getDefaultConfig();
            saveToLocalStorage();
        }

        notifyListeners('initialized', config);
        return config;
    }

    /**
     * Load configuration from backend
     */
    async function loadFromBackend() {
        try {
            const response = await apiRequest(ENDPOINTS.get);
            
            // Convert backend format to frontend format
            return {
                baselineStart: response.processing.baseline_start,
                baselineEnd: response.processing.baseline_end,
                currentTimeRange: response.processing.current_time_range,
                highVolumeThreshold: response.processing.high_volume_threshold,
                mediumVolumeThreshold: response.processing.medium_volume_threshold,
                criticalThreshold: response.processing.critical_threshold,
                warningThreshold: response.processing.warning_threshold,
                minDailyVolume: response.processing.min_daily_volume,
                autoRefreshEnabled: response.dashboard.enable_websocket,
                autoRefreshInterval: response.dashboard.refresh_interval * 1000,
                theme: response.dashboard.theme,
                maxEventsDisplay: response.dashboard.max_events_display,
                elasticCookie: response.elasticsearch.cookie,
                kibanaUrl: response.kibana.url,
                elasticsearchUrl: response.elasticsearch.url,
                corsProxyPort: response.cors_proxy.port,
                debug: response.debug,
                appName: response.app_name,
                // Include rad_types from backend
                rad_types: response.rad_types || getDefaultConfig().rad_types
            };
        } catch (error) {
            // Error already logged in apiRequest at debug level
            return null;
        }
    }

    /**
     * Save configuration to backend
     */
    async function saveToBackend(configData = config) {
        try {
            await apiRequest(ENDPOINTS.update, {
                method: 'POST',
                body: JSON.stringify(configData)
            });
            
            notifyListeners('saved', configData);
            return true;
        } catch (error) {
            // Error already logged in apiRequest at debug level
            return false;
        }
    }

    /**
     * Get default configuration
     */
    function getDefaultConfig() {
        return {
            baselineStart: '2025-06-01',
            baselineEnd: '2025-06-09',
            currentTimeRange: 'now-12h',
            highVolumeThreshold: 1000,
            mediumVolumeThreshold: 100,
            criticalThreshold: -80,
            warningThreshold: -50,
            minDailyVolume: 100,
            autoRefreshEnabled: true,
            autoRefreshInterval: 300000,
            theme: 'light',
            maxEventsDisplay: 200,
            elasticCookie: null,
            kibanaUrl: 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243',
            elasticsearchUrl: 'https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243',
            corsProxyPort: 8000,
            debug: false,
            appName: 'RAD Monitor',
            minEventDate: '2025-05-19T04:00:00.000Z',
            queryEventPattern: 'pandc.vnext.recommendations.feed.feed*',
            queryAggSize: 500,
            rad_types: {
                venture_feed: {
                    pattern: 'pandc.vnext.recommendations.feed.feed*',
                    display_name: 'Venture Feed',
                    enabled: true,
                    color: '#4CAF50',
                    description: 'Venture recommendations feed'
                },
                cart_recommendations: {
                    pattern: 'pandc.vnext.recommendations.cart*',
                    display_name: 'Cart Recommendations',
                    enabled: false,
                    color: '#2196F3',
                    description: 'Shopping cart recommendations'
                },
                product_recommendations: {
                    pattern: 'pandc.vnext.recommendations.product*',
                    display_name: 'Product Recommendations',
                    enabled: false,
                    color: '#FF9800',
                    description: 'Product page recommendations'
                }
            }
        };
    }

    /**
     * Load configuration from localStorage
     */
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('radMonitorConfig');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse saved config:', e);
                localStorage.removeItem('radMonitorConfig');
            }
        }
        return null;
    }

    /**
     * Save configuration to localStorage
     */
    function saveToLocalStorage(configData = config) {
        localStorage.setItem('radMonitorConfig', JSON.stringify(configData));
    }

    /**
     * Get current configuration
     */
    function getConfig() {
        if (!config) {
            console.warn('Config not initialized, returning defaults');
            return getDefaultConfig();
        }
        return { ...config };
    }

    /**
     * Update configuration
     */
    async function updateConfig(updates, options = { saveToBackend: true, saveToLocalStorage: true }) {
        const oldConfig = { ...config };
        config = { ...config, ...updates };

        // Validate the new config
        const validation = validateConfig(config);
        if (!validation.valid) {
            config = oldConfig;
            throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
        }

        // Save to localStorage
        if (options.saveToLocalStorage) {
            saveToLocalStorage();
        }

        // Skip backend save in test environment
        const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
        
        // Save to backend
        if (options.saveToBackend && !isTest) {
            const success = await saveToBackend();
            if (!success && options.revertOnFailure !== false) {
                // Revert changes if backend save failed
                config = oldConfig;
                saveToLocalStorage();
                throw new Error('Failed to save configuration to backend');
            }
        }

        notifyListeners('updated', config, oldConfig);
        return config;
    }

    /**
     * Get specific configuration value
     */
    function get(key, defaultValue = undefined) {
        if (!config) {
            initialize();  // Try to initialize if not already done
        }
        return config?.[key] ?? defaultValue;
    }

    /**
     * Set specific configuration value
     */
    async function set(key, value, options = {}) {
        return updateConfig({ [key]: value }, options);
    }

    /**
     * Validate configuration
     */
    function validateConfig(configData) {
        const errors = [];

        // Validate dates
        if (!configData.baselineStart || !configData.baselineEnd) {
            errors.push('Baseline dates are required');
        }

        if (new Date(configData.baselineStart) >= new Date(configData.baselineEnd)) {
            errors.push('Baseline end date must be after start date');
        }

        // Validate thresholds
        if (configData.highVolumeThreshold < 1) {
            errors.push('High volume threshold must be at least 1');
        }

        if (configData.mediumVolumeThreshold < 1) {
            errors.push('Medium volume threshold must be at least 1');
        }

        if (configData.mediumVolumeThreshold >= configData.highVolumeThreshold) {
            errors.push('Medium volume threshold must be less than high volume threshold');
        }

        if (configData.criticalThreshold >= configData.warningThreshold) {
            errors.push('Critical threshold must be less than warning threshold');
        }

        if (configData.criticalThreshold > 0 || configData.warningThreshold > 0) {
            errors.push('Score thresholds must be negative');
        }

        // Validate time range
        const validTimeRangePatterns = [
            /^now-\d+[hdw]$/,       // now-12h, now-7d, now-1w
            /^inspection_time$/,     // special inspection time
            /^-\d+[hd]-\d+[hd]$/    // custom range: -48h-24h
        ];

        if (!validTimeRangePatterns.some(pattern => pattern.test(configData.currentTimeRange))) {
            errors.push('Invalid time range format');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Export configuration to file
     */
    function exportConfig() {
        const dataStr = JSON.stringify(config, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `rad-monitor-config-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    /**
     * Import configuration from file
     */
    function importConfig() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';

            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) {
                    reject(new Error('No file selected'));
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const importedConfig = JSON.parse(event.target.result);
                        
                        // Validate imported config
                        const validation = validateConfig(importedConfig);
                        if (!validation.valid) {
                            reject(new Error(`Invalid configuration: ${validation.errors.join(', ')}`));
                            return;
                        }

                        // Update config
                        await updateConfig(importedConfig);
                        resolve(importedConfig);
                    } catch (error) {
                        reject(new Error(`Failed to import configuration: ${error.message}`));
                    }
                };
                reader.readAsText(file);
            };

            input.click();
        });
    }

    /**
     * Subscribe to configuration changes
     */
    function subscribe(listener) {
        if (typeof listener !== 'function') {
            throw new Error('Listener must be a function');
        }
        listeners.push(listener);
        
        // Return unsubscribe function
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * Notify all listeners of changes
     */
    function notifyListeners(event, newConfig, oldConfig = null) {
        listeners.forEach(listener => {
            try {
                listener({ event, newConfig, oldConfig });
            } catch (error) {
                console.error('Error in config listener:', error);
            }
        });
    }

    /**
     * Start auto-sync with backend
     */
    function startAutoSync(intervalMs = 60000) {
        stopAutoSync();
        
        syncTimer = setInterval(async () => {
            try {
                const backendConfig = await loadFromBackend();
                if (backendConfig && JSON.stringify(backendConfig) !== JSON.stringify(config)) {
                    config = backendConfig;
                    saveToLocalStorage();
                    notifyListeners('synced', config);
                }
            } catch (error) {
                // Silently handle auto-sync failures - errors are already logged at debug level
                console.debug('Auto-sync skipped due to backend unavailability');
            }
        }, intervalMs);
    }

    /**
     * Stop auto-sync with backend
     */
    function stopAutoSync() {
        if (syncTimer) {
            clearInterval(syncTimer);
            syncTimer = null;
        }
    }

    /**
     * Reset configuration to defaults
     */
    async function resetToDefaults() {
        const defaults = getDefaultConfig();
        await updateConfig(defaults);
        return defaults;
    }

    /**
     * Get configuration for specific component
     */
    function getComponentConfig(component) {
        const componentConfigs = {
            elasticsearch: {
                url: config.elasticsearchUrl,
                cookie: config.elasticCookie,
                indexPattern: 'traffic-*',
                timeout: 30000
            },
            kibana: {
                url: config.kibanaUrl,
                discoverPath: '/app/discover#/'
            },
            dashboard: {
                refreshInterval: config.autoRefreshInterval,
                maxEvents: config.maxEventsDisplay,
                theme: config.theme
            },
            processing: {
                baselineStart: config.baselineStart,
                baselineEnd: config.baselineEnd,
                currentTimeRange: config.currentTimeRange,
                highVolumeThreshold: config.highVolumeThreshold,
                mediumVolumeThreshold: config.mediumVolumeThreshold,
                criticalThreshold: config.criticalThreshold,
                warningThreshold: config.warningThreshold
            }
        };

        return componentConfigs[component] || {};
    }

    /**
     * UI Helper: Set preset time range
     * Migrated from ConfigManager for consolidation
     */
    function setPresetTimeRange(preset) {
        const presetMap = {
            '6h': 'now-6h',
            '12h': 'now-12h',
            '24h': 'now-24h',
            '3d': 'now-3d',
            'inspection': 'inspection_time'
        };
        
        const timeRange = presetMap[preset];
        if (timeRange) {
            set('currentTimeRange', timeRange);
            // Update DOM if element exists
            const input = document.getElementById('currentTimeRange');
            if (input) {
                input.value = timeRange;
            }
        }
    }
    
    /**
     * UI Helper: Get configuration from DOM elements
     * For backward compatibility with ConfigManager
     */
    function getCurrentConfigFromDOM() {
        const getValue = (id, defaultValue) => {
            const element = document.getElementById(id);
            return element ? element.value : defaultValue;
        };
        
        return {
            baselineStart: getValue('baselineStart', '2025-06-01'),
            baselineEnd: getValue('baselineEnd', '2025-06-09'),
            currentTimeRange: getValue('currentTimeRange', 'now-12h'),
            highVolumeThreshold: parseInt(getValue('highVolumeThreshold', '1000')),
            mediumVolumeThreshold: parseInt(getValue('mediumVolumeThreshold', '100'))
        };
    }
    
    /**
     * UI Helper: Load configuration into DOM elements
     * For backward compatibility with ConfigManager
     */
    function loadConfigurationIntoDOM(config = null) {
        const configToLoad = config || getConfig();
        
        const setValue = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        };
        
        setValue('baselineStart', configToLoad.baselineStart);
        setValue('baselineEnd', configToLoad.baselineEnd);
        setValue('currentTimeRange', configToLoad.currentTimeRange);
        setValue('highVolumeThreshold', configToLoad.highVolumeThreshold);
        setValue('mediumVolumeThreshold', configToLoad.mediumVolumeThreshold);
    }

    // Public API
    return {
        initialize,
        getConfig,
        updateConfig,
        get,
        set,
        validateConfig,
        exportConfig,
        importConfig,
        subscribe,
        startAutoSync,
        stopAutoSync,
        resetToDefaults,
        getComponentConfig,
        loadFromBackend,
        saveToBackend,
        // UI Helpers (migrated from ConfigManager)
        setPresetTimeRange,
        getCurrentConfigFromDOM,
        loadConfigurationIntoDOM,
        // Expose internals for debugging
        _debug: {
            config: () => config,
            listeners: () => listeners
        }
    };
})();

// Auto-initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        ConfigService.initialize().catch(console.error);
    });
} 