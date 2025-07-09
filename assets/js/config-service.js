/**
 * Centralized Configuration Service
 * Single source of truth for all configuration, synced with backend
 */

// Configuration state
let config = null;
let listeners = [];
let syncTimer = null;
let isInitialized = false;
let environment = detectEnvironment();

// Environment detection
function detectEnvironment() {
    const hostname = window.location.hostname;
    if (hostname.includes('github.io') || hostname.includes('githubusercontent.com')) {
        return 'production';
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'development';
    } else {
        return 'unknown';
    }
}

export function isProduction() {
    return environment === 'production';
}

export function isDevelopment() {
    return environment === 'development';
}

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
    if (isInitialized) {
        return config;
    }

    try {
        console.log(`🔧 Loading configuration for ${environment} environment...`);

        if (isProduction()) {
            await loadProductionConfig();
        } else {
            await loadDevelopmentConfig();
        }

        isInitialized = true;
        console.log('(✓)Configuration loaded successfully:', config);
        notifyListeners('initialized', config);
        return config;
    } catch (error) {
        console.error('(✗) Failed to load configuration:', error);
        loadFallbackConfig();
        isInitialized = true;
        notifyListeners('initialized', config);
        return config;
    }
}

/**
 * Load production configuration
 */
async function loadProductionConfig() {
    try {
        // Try to load production config first
        const productionResponse = await fetch('./config/production.json');
        if (productionResponse.ok) {
            const productionConfig = await productionResponse.json();
            console.log('📦 Loaded production configuration');

            // Merge with default config
            const defaultConfig = getDefaultConfig();
            config = { ...defaultConfig, ...productionConfig };

            // Handle environment variable substitution
            if (config.server?.url === '${API_URL}') {
                config.server.url = window.PRODUCTION_API_URL || window.location.origin;
            }
            
            // Handle pre-configured cookie
            if (productionConfig.elasticsearch?.preConfiguredCookie &&
                productionConfig.dashboard?.autoLoadCookie) {
                await handlePreConfiguredCookie(productionConfig.elasticsearch.preConfiguredCookie);
            }

            saveToLocalStorage();
            return;
        }
    } catch (error) {
        console.warn('⚠️ Production config not found, using defaults with production overrides');
    }

    // Fallback to default config with production overrides
    const defaultConfig = getDefaultConfig();
    config = {
        ...defaultConfig,
        environment: 'production',
        baseUrl: window.location.origin + window.location.pathname.replace(/\/$/, ''),
        server: {
            type: 'fastapi',
            url: window.PRODUCTION_API_URL || window.location.origin
        },
        corsProxy: { enabled: false },
        features: { 
            fastapi: true, 
            localServer: false, 
            corsProxy: false,
            websocket: true,
            formulaBuilder: true,
            authentication: true
        },
        elasticsearch: {
            directConnection: false,
            url: 'https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243',
            kibanaUrl: 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243',
            path: '/api/console/proxy?path=traffic-*/_search&method=POST',
            corsRequired: false
        }
    };
    saveToLocalStorage();
}

/**
 * Load development configuration
 */
async function loadDevelopmentConfig() {
    const defaultConfig = getDefaultConfig();

    // Try to load from backend
    try {
        const backendConfig = await loadFromBackend();
        if (backendConfig) {
            config = { ...defaultConfig, ...backendConfig };
            console.log('📡 Loaded configuration from backend');
            saveToLocalStorage();
            return;
        }
    } catch (error) {
        console.warn('⚠️ Backend config not available, using defaults');
    }

    config = {
        ...defaultConfig,
        environment: 'development',
        features: { fastapi: true, localServer: true, corsProxy: true }
    };
    saveToLocalStorage();
}

/**
 * Load fallback configuration
 */
function loadFallbackConfig() {
    console.log('🆘 Loading fallback configuration');
    config = {
        ...getDefaultConfig(),
        environment: environment,
        features: {
            fastapi: isDevelopment(),
            localServer: isDevelopment(),
            corsProxy: isDevelopment()
        }
    };
    saveToLocalStorage();
}

/**
 * Handle pre-configured cookie from GitHub Secrets
 */
async function handlePreConfiguredCookie(cookieValue) {
    if (!cookieValue || cookieValue === '' || cookieValue === 'undefined') {
        console.log('🔐 No pre-configured cookie available');
        return;
    }

    try {
        console.log('🔐 Setting up pre-configured authentication...');

        // Store the cookie in localStorage with proper format
        const cookieData = {
            cookie: cookieValue.trim(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            saved: new Date().toISOString(),
            source: 'github-secrets'
        };

        localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

        // Update config to reflect the auto-authentication
        config.elasticCookie = cookieValue.trim();
        config.dashboard = config.dashboard || {};
        config.dashboard.autoAuthenticated = true;

        console.log('(✓)Pre-configured authentication ready');

        // Notify that cookie is available
        if (window.Dashboard) {
            window.Dashboard.onCookieReady?.();
        }

    } catch (error) {
        console.warn('⚠️ Failed to set up pre-configured cookie:', error.message);
    }
}

/**
 * Load configuration from backend
 */
async function loadFromBackend() {
    if (!isDevelopment()) {
        throw new Error('Backend loading only available in development');
    }

    try {
        const response = await apiRequest(ENDPOINTS.get);

        // Convert backend format to frontend format if needed
        return {
            baselineStart: response.processing?.baseline_start || response.baselineStart,
            baselineEnd: response.processing?.baseline_end || response.baselineEnd,
            currentTimeRange: response.processing?.current_time_range || response.currentTimeRange,
            highVolumeThreshold: response.processing?.high_volume_threshold || response.highVolumeThreshold,
            mediumVolumeThreshold: response.processing?.medium_volume_threshold || response.mediumVolumeThreshold,
            criticalThreshold: response.processing?.critical_threshold || response.criticalThreshold,
            warningThreshold: response.processing?.warning_threshold || response.warningThreshold,
            minDailyVolume: response.processing?.min_daily_volume || response.minDailyVolume,
            autoRefreshEnabled: response.dashboard?.enable_websocket ?? response.autoRefreshEnabled,
            autoRefreshInterval: (response.dashboard?.refresh_interval * 1000) || response.autoRefreshInterval,
            theme: response.dashboard?.theme || response.theme,
            maxEventsDisplay: response.dashboard?.max_events_display || response.maxEventsDisplay,
            elasticCookie: response.elasticsearch?.cookie || response.elasticCookie,
            kibanaUrl: response.kibana?.url || response.kibanaUrl,
            elasticsearchUrl: response.elasticsearch?.url || response.elasticsearchUrl,
            corsProxyPort: response.cors_proxy?.port || response.corsProxyPort,
            debug: response.debug,
            appName: response.app_name || response.appName,
            rad_types: response.rad_types || response.rad_types
        };
    } catch (error) {
        console.debug('Backend config load failed:', error.message);
        throw error;
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
        elasticsearchPath: '/traffic-*/_search',
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
            venture_metrics: {
                pattern: 'pandc.vnext.recommendations.metricsevolved*',
                display_name: 'Venture Metrics',
                enabled: true,
                color: '#9C27B0',
                description: 'Venture metrics evolved events'
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
    if (!isInitialized) {
        console.warn('⚠️ Config requested before initialization - returning defaults');
        const defaultConfig = getDefaultConfig();

        // For production, add basic proxy settings even in defaults
        if (isProduction()) {
            return {
                ...defaultConfig,
                environment: 'production',
                corsProxy: {
                    enabled: true,
                    url: "https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy"
                },
                features: {
                    fastapi: false,
                    localServer: false,
                    corsProxy: true
                }
            };
        }

        return defaultConfig;
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
export function subscribe(listener) {
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
export function startAutoSync(intervalMs = 60000) {
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
export function stopAutoSync() {
    if (syncTimer) {
        clearInterval(syncTimer);
        syncTimer = null;
    }
}

/**
 * Reset configuration to defaults
 */
export async function resetToDefaults() {
    const defaults = getDefaultConfig();
    await updateConfig(defaults);
    return defaults;
}

/**
 * Get configuration for specific component
 */
export function getComponentConfig(component) {
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
 * Check if CORS setup instructions should be shown
 */
export function shouldShowCorsInstructions() {
    return isProduction() && config?.elasticsearch?.corsRequired;
}

/**
 * Get CORS setup instructions
 */
export function getCorsInstructions() {
    return {
        title: "CORS Setup Required for GitHub Pages",
        message: "To connect to Elasticsearch from this static site, you need to:",
        steps: [
            "1. Install a CORS browser extension:",
            "   • Chrome: 'CORS Unblock' or 'CORS Unlocker'",
            "   • Firefox: 'CORS Everywhere'",
            "   • Safari: 'CORS Unblock'",
            "",
            "2. Enable the extension for this site",
            "3. Refresh the page and enter your Elasticsearch cookie",
            "",
            "Alternative: Use the dashboard from your local development environment"
        ],
        note: "This is required because GitHub Pages is a static hosting service and cannot proxy requests to Elasticsearch."
    };
}

/**
 * Get environment information
 */
export function getEnvironmentInfo() {
    return {
        environment,
        isProduction: isProduction(),
        isDevelopment: isDevelopment(),
        hostname: window.location.hostname,
        origin: window.location.origin
    };
}

/**
 * UI Helper: Set preset time range
 * Migrated from ConfigManager for consolidation
 */
export function setPresetTimeRange(preset) {
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
export function getCurrentConfigFromDOM() {
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
export function loadConfigurationIntoDOM(config = null) {
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

// Export internal functions needed externally
export {
    initialize,
    getConfig,
    updateConfig,
    get,
    set,
    validateConfig,
    exportConfig,
    importConfig,
    loadFromBackend,
    saveToBackend
};

// Create default export object for backward compatibility
export const ConfigService = {
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
    // Environment helpers
    shouldShowCorsInstructions,
    getCorsInstructions,
    getEnvironmentInfo,
    isProduction,
    isDevelopment,
    // UI Helpers (migrated from ConfigManager)
    setPresetTimeRange,
    getCurrentConfigFromDOM,
    loadConfigurationIntoDOM,
    // Expose internals for debugging
    _debug: {
        config: () => config,
        listeners: () => listeners,
        environment: () => environment
    }
};

// Export as default
export default ConfigService;

// ConfigManager handles initialization - don't auto-initialize here
