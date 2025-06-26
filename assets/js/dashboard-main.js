/**
 * Main Dashboard Controller for RAD Monitor
 * Orchestrates all dashboard functionality using DataLayer state management
 */

// ESM: Import dependencies
import DataLayer from './data-layer.js';
import TimeRangeUtils from './time-range-utils.js';
import ConfigManager from './config-manager.js';
import UIUpdater from './ui-updater.js';
import DataProcessor from './data-processor.js';
import ConsoleVisualizer from './console-visualizer.js';
import ApiClient from './api-client.js';
import { unifiedAPI } from './api-interface.js';

// ESM: Converted from IIFE to ES module export
export const Dashboard = (() => {
    'use strict';

    // Internal state for timers and intervals
    let autoRefreshTimer = null;
    let statusUpdateTimer = null;

    /**
     * Initialize dashboard with state management
     */
    async function init() {
        // Log initialization start
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
            DataLayer.logAction('DASHBOARD_INIT_START', {
                timestamp: new Date().toISOString(),
                location: window.location.hostname
            });
        }

        // Initialize unified API
        await unifiedAPI.initialize();
        // API mode will be shown in structured format later

        // Set up FastAPI WebSocket event listeners if in FastAPI mode
        if (unifiedAPI.getMode() === 'fastapi') {
            setupFastAPIListeners();
        }

        // Initialize configuration management
        initializeConfiguration();

        // Set up DataLayer event listeners
        setupStateListeners();

        // Initialize UI components
        initializeUIComponents();

        // Start monitoring and auto-refresh
        startSystemMonitoring();

        // Performance widget is disabled by default to reduce visual clutter
        // To view performance stats, use Dashboard.showPerformanceStats() in console

        // Log initialization complete
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
            DataLayer.logAction('DASHBOARD_INIT_COMPLETE', {
                listeners: DataLayer.getActiveQueries ? DataLayer.getActiveQueries().length : 0,
                timers: { autoRefresh: !!autoRefreshTimer, statusUpdate: !!statusUpdateTimer },
                performanceMetrics: DataLayer.getPerformanceMetrics ? DataLayer.getPerformanceMetrics() : null
            });
        }

        // Initialization complete - minimal logging

        // CRITICAL: Perform initial data fetch after a brief delay to ensure everything is ready
        setTimeout(() => {
            refresh().catch(() => {
                // Silent fail for initial load - status will be shown in UI
            });
        }, 1000);
    }

    /**
     * Set up FastAPI WebSocket event listeners
     */
    function setupFastAPIListeners() {
        // Listen for config updates
        window.addEventListener('fastapi:config', (event) => {
            // Silent config update
            // Update local config if needed
            if (event.detail) {
                const config = {
                    baselineStart: event.detail.baseline_start,
                    baselineEnd: event.detail.baseline_end,
                    currentTimeRange: event.detail.time_range,
                    criticalThreshold: event.detail.critical_threshold,
                    warningThreshold: event.detail.warning_threshold,
                    highVolumeThreshold: event.detail.high_volume_threshold,
                    mediumVolumeThreshold: event.detail.medium_volume_threshold
                };
                DataLayer.updateAppConfig(config);
            }
        });

        // Listen for stats updates
        window.addEventListener('fastapi:stats', (event) => {
            // Silent stats update
            if (event.detail) {
                UIUpdater.updateSummaryCards({
                    critical: event.detail.critical_count,
                    warning: event.detail.warning_count,
                    normal: event.detail.normal_count,
                    increased: event.detail.increased_count,
                    total: event.detail.total_events
                });
                UIUpdater.updateTimestamp();
            }
        });

        // Listen for data updates
        window.addEventListener('fastapi:data', (event) => {
            // Silent data update
            if (event.detail && Array.isArray(event.detail)) {
                UIUpdater.updateDataTable(event.detail);
            }
        });

        // WebSocket listeners configured
    }

    /**
     * Initialize configuration with validation
     */
    function initializeConfiguration() {
        // Clean up any invalid saved configuration using DataLayer validation
        const saved = localStorage.getItem('radMonitorConfig');
        if (saved) {
            try {
                const config = JSON.parse(saved);
                if (config.currentTimeRange && !TimeRangeUtils.validateTimeRange(config.currentTimeRange)) {
                    config.currentTimeRange = 'now-12h';
                    localStorage.setItem('radMonitorConfig', JSON.stringify(config));
                    console.log('🔧 Fixed invalid time range in saved configuration');
                }

                // Update DataLayer with validated config
                DataLayer.updateAppConfig(config);
            } catch (e) {
                localStorage.removeItem('radMonitorConfig');
                console.log('🧹 Cleared invalid configuration');
            }
        }

        // Load configuration through ConfigManager
        ConfigManager.loadConfiguration();
        ConfigManager.highlightActivePreset();
    }

    /**
     * Set up DataLayer state listeners for reactive UI updates
     */
    function setupStateListeners() {
        // Listen for successful data fetches
        DataLayer.addEventListener('searchComplete', (event) => {
            const { searchType, data } = event;

            // Handle dynamic search type names (e.g., main_traffic_123456789)
            if (searchType.startsWith('main_traffic') || searchType === 'traffic') {
                handleTrafficDataUpdate(data);
            } else if (searchType === 'health') {
                handleHealthDataUpdate(data);
            } else {
                // Other search types handled silently
            }
        });

        // Listen for errors
        DataLayer.addEventListener('error', (event) => {
            const { searchType, error } = event;
            console.error(`❌ ${searchType} search failed:`, error);

            // Classify error and show meaningful message
            const errorMessage = classifyError(error);
            UIUpdater.hideLoading(errorMessage.short);

            // Update refresh status with specific action
            const refreshStatus = document.getElementById('refreshStatus');
            if (refreshStatus) {
                refreshStatus.innerHTML = errorMessage.detailed;
                refreshStatus.style.color = '#d32f2f';
            }

            // For critical failures, provide fallback
            if (searchType === 'traffic' || searchType.includes('main_traffic')) {
                setTimeout(() => showFallbackRefresh(), 2000);
            }
        });

        // Listen for state changes
        DataLayer.addEventListener('stateChange', (event) => {
            const { path, value } = event;
            // State changes are logged through DataLayer's logAction mechanism
            // Direct console.log removed to reduce verbosity
        });
    }

    /**
     * Initialize UI components and validation
     */
    function initializeUIComponents() {
        // Console welcome message disabled to reduce console noise
        // ConsoleVisualizer.showWelcomeMessage();

        // Add input validation for time range field
        const timeRangeInput = document.getElementById('currentTimeRange');
        if (timeRangeInput) {
            timeRangeInput.addEventListener('blur', function() {
                const value = this.value.trim();
                if (!TimeRangeUtils.validateTimeRange(value)) {
                    this.value = 'now-12h';
                    console.log('⚠️ Invalid time range entered, reset to default: now-12h');
                    ConfigManager.highlightActivePreset();
                }
            });
        }
    }

    /**
     * Start system monitoring and auto-refresh
     */
    function startSystemMonitoring() {
        // Start periodic health checks using DataLayer
        statusUpdateTimer = setInterval(() => {
            DataLayer.executeSearch('health').catch(error => {
                console.log('Health check failed (normal if CORS proxy not running):', error.message);
            });
        }, 30000);

        // Start CORS proxy health monitoring (every 60 seconds)
        startCorsProxyMonitoring();

        // Update API status immediately
        UIUpdater.updateApiStatus();
    }

    /**
     * Start CORS proxy health monitoring
     */
    function startCorsProxyMonitoring() {
        // Initial check
        checkCorsProxyHealth();

        // Check every 60 seconds
        setInterval(checkCorsProxyHealth, 60000);
    }

    /**
     * Check CORS proxy health and update status
     */
    async function checkCorsProxyHealth() {
        const isLocalhost = window.location.hostname === 'localhost';

        if (isLocalhost) {
            try {
                const proxyRunning = await ApiClient.checkCorsProxy();
                DataLayer.updateCorsProxyStatus(proxyRunning ? 'running' : 'not_running');

                // Update UI with proxy status
                UIUpdater.updateProxyStatusIndicator(proxyRunning);

            } catch (error) {
                DataLayer.updateCorsProxyStatus('error');
                UIUpdater.updateProxyStatusIndicator(false, error.message);
            }
        } else {
            // GitHub Pages doesn't need CORS proxy
            DataLayer.updateCorsProxyStatus('not_needed');
            UIUpdater.updateProxyStatusIndicator(null);
        }
    }

    /**
     * Handle traffic data updates from DataLayer
     */
    function handleTrafficDataUpdate(transformedData) {
        try {
            // Validate input data
            if (!Array.isArray(transformedData)) {
                console.warn('handleTrafficDataUpdate: transformedData is not an array:', transformedData);
                transformedData = [];
            }

            // transformedData is already processed by DataLayer
            const stats = DataProcessor.getSummaryStats(transformedData);

            // Update UI components
            UIUpdater.updateSummaryCards(stats);
            UIUpdater.updateDataTable(transformedData);
            UIUpdater.updateTimestamp();
            UIUpdater.hideLoading('✅ Updated with real-time data!');

            // Performance widget update disabled - use Dashboard.showPerformanceStats() instead

            // Console visualization is disabled by default to reduce console noise
            // To enable visualization, set enableConsoleVisualization: true in config
            const config = ConfigManager.getCurrentConfig();
            if (config.enableConsoleVisualization === true && transformedData.length > 0) {
                try {
                    // Reconstruct the data format expected by ConsoleVisualizer
                    const mockESResponse = {
                        aggregations: {
                            events: {
                                buckets: transformedData.map(item => ({
                                    key: item.event_id || 'unknown',
                                    doc_count: (item.current || 0) + (item.baseline_count || 0),
                                    current: { doc_count: item.current || 0 },
                                    baseline: { doc_count: item.baseline_count || 0 }
                                }))
                            }
                        }
                    };
                    ConsoleVisualizer.visualizeData(mockESResponse, config.currentTimeRange, config);
                } catch (vizError) {
                    // Console visualization error - silent fail
                }
            }

            // Dashboard update logged through DataLayer mechanism

        } catch (error) {
            // Dashboard UI update failed - error handling through UI
            UIUpdater.hideLoading('❌ Update failed - data processing error');
            
            // Show fallback refresh option
            showFallbackRefresh();
        }
    }

    /**
     * Handle health data updates
     */
    function handleHealthDataUpdate() {
        // Health check completed
        UIUpdater.updateApiStatus();
        // Performance widget update disabled - use Dashboard.showPerformanceStats() instead
    }

    /**
     * Refresh dashboard using DataLayer (MAIN ENTRY POINT)
     */
    async function refresh() {
        const refreshId = `refresh_${Date.now()}`;

        // Check for cookie in priority order: localStorage -> environment -> prompt user
        let hasCookie = localStorage.getItem('elasticCookie');
        
        // Try environment cookie if no localStorage cookie
        if (!hasCookie && window.ELASTIC_COOKIE) {
            localStorage.setItem('elasticCookie', window.ELASTIC_COOKIE);
            hasCookie = window.ELASTIC_COOKIE;
        }
        
        if (!hasCookie) {
            UIUpdater.hideLoading('🍪 Cookie required for data access');
            showAuthenticationRequired();
            return;
        }

        try {
            // Get current configuration
            const config = ConfigManager.getCurrentConfig();

            // Log dashboard action with meaningful configuration details
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('DASHBOARD_REFRESH_START', {
                    refreshId,
                    timeRange: config.currentTimeRange,
                    baseline: `${config.baselineStart} to ${config.baselineEnd}`,
                    thresholds: {
                        high: config.highVolumeThreshold,
                        medium: config.mediumVolumeThreshold
                    },
                    timestamp: new Date().toISOString()
                });
            }

            UIUpdater.showLoading('Fetching latest data...');

            // Use DataLayer to fetch and parse data in one clean operation
            const startTime = Date.now();
            const result = await DataLayer.fetchAndParse(`main_traffic_${refreshId}`, {
                type: 'trafficAnalysis',
                params: config
            });
            const queryTime = Date.now() - startTime;
            
            // Progress tracking handled through DataLayer logging
            // Event count and stats are calculated in handleTrafficDataUpdate
            
            // Log performance warning only if significantly slow
            if (queryTime > 10000) {
                console.warn(`⚠️ Slow query detected: ${(queryTime/1000).toFixed(1)}s`);
            }

            // Log completion with meaningful statistics
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                const stats = calculateRefreshStats(result.transformed || []);
                DataLayer.logAction('DASHBOARD_REFRESH_COMPLETE', {
                    refreshId,
                    queryTime: `${(queryTime/1000).toFixed(1)}s`,
                    events: stats.total,
                    critical: stats.critical,
                    warning: stats.warning,
                    normal: stats.normal,
                    increased: stats.increased,
                    dataSize: result.raw ? `${Math.round(JSON.stringify(result.raw).length / 1024)}KB` : 'N/A'
                });
            }

            // UI update happens automatically via state listeners
            // (handleTrafficDataUpdate is called by DataLayer event system)

        } catch (error) {
            // Log error
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('DASHBOARD_REFRESH_ERROR', {
                    refreshId,
                    error: error.message,
                    isAuthError: error.message.includes('authentication') || error.message.includes('cookie')
                });
            }

            // Check if it's an auth error
            if (error.message.includes('authentication') || error.message.includes('cookie')) {
                UIUpdater.hideLoading('🍪 Cookie required for data access');
                showAuthenticationRequired();
            } else {
                UIUpdater.hideLoading('❌ Refresh failed - see console');
                showFallbackRefresh();
            }
        }
    }

    /**
     * Show authentication required message (more specific than generic fallback)
     */
    function showAuthenticationRequired() {
        const status = document.getElementById('refreshStatus');
        if (status) {
            status.innerHTML = `
                🍪 Cookie required |
                <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #2196F3; font-weight: bold;">
                    Set Cookie Now
                </a> |
                <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">
                    Help
                </a>
            `;
            // Mark that we have an auth issue to prevent health check from overriding
            status.dataset.authRequired = 'true';
        }
    }

    /**
     * Show fallback refresh option
     */
    function showFallbackRefresh() {
        const status = document.getElementById('refreshStatus');
        if (status) {
            status.innerHTML = `
                ❌ Real-time failed |
                <a href="#" onclick="location.reload(); return false;" style="color: #d32f2f;">
                    Reload Page
                </a> |
                <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #333;">
                    Set Cookie
                </a>
            `;
            // Remove auth flag since this is a different type of error
            delete status.dataset.authRequired;
        }
    }

    /**
     * Test API connection using DataLayer
     */
    async function testApiConnection() {
        const testBtn = document.getElementById('testApiBtn');

        if (testBtn) {
            testBtn.disabled = true;
            testBtn.textContent = 'TESTING...';
        }

        UIUpdater.showLoading('Testing API connection...');

        try {
            // Use DataLayer for health check
            const result = await DataLayer.executeSearch('health');

            if (result.success) {
                UIUpdater.hideLoading(`✅ API test successful!`);
            } else {
                UIUpdater.hideLoading(`❌ Test failed: ${result.error}`);
            }
        } catch (error) {
            UIUpdater.hideLoading(`❌ Test failed: ${error.message}`);
        } finally {
            if (testBtn) {
                testBtn.disabled = false;
                testBtn.textContent = 'TEST API CONNECTION';
            }
        }
    }

    /**
     * Set cookie for real-time updates
     */
    async function setCookieForRealtime() {
        // 🚀 NEW: Try environment cookie first before prompting user
        let cookie = null;
        
        if (window.ELASTIC_COOKIE && !localStorage.getItem('elasticCookie')) {
            console.log('🔄 TRYING ENVIRONMENT COOKIE: Testing server-provided cookie first...');
            cookie = window.ELASTIC_COOKIE;
            localStorage.setItem('elasticCookie', cookie);
        } else {
            console.log('🔄 PROMPTING USER: Environment cookie not available or already tried');
            cookie = await ApiClient.promptForCookie('real-time updates');
        }
        
        if (cookie) {
            console.log('✅ COOKIE ENTERED: Now validating...');
            
            // Show validating status
            UIUpdater.hideLoading('🔄 Validating cookie...');
            
            // Test the cookie immediately
            try {
                const testResult = await ApiClient.testAuthentication();
                
                if (testResult.success) {
                    console.log('✅ COOKIE VALID: Authentication successful');
                    console.log('🔄 UPDATING STATUS: Cookie validation passed');
                    
                    // Clear authentication error flag so status can update
                    const statusEl = document.getElementById('refreshStatus');
                    if (statusEl) {
                        delete statusEl.dataset.authRequired;
                    }
                    
                    UIUpdater.hideLoading('✅ Cookie validated! Now fetching data...');
                    UIUpdater.updateApiStatus();
                    
                    // 🚀 CRITICAL FIX: Trigger data fetch after successful authentication
                    console.log('🚀 TRIGGERING DATA FETCH: Authentication successful, now fetching data...');
                    setTimeout(() => refresh(), 100); // Small delay to let UI update
                } else {
                    console.log('❌ COOKIE INVALID:', testResult.error);
                    console.log('🔄 PROMPTING USER: Cookie validation failed');
                    
                    // Remove the invalid cookie
                    localStorage.removeItem('elasticCookie');
                    
                    UIUpdater.hideLoading('❌ Invalid cookie - please try again');
                    
                    // Show error message with option to try again
                    const statusEl = document.getElementById('refreshStatus');
                    if (statusEl) {
                        statusEl.innerHTML = `
                            ❌ Cookie invalid: ${testResult.error} |
                            <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">
                                Try Again
                            </a> |
                            <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">
                                Help
                            </a>
                        `;
                        statusEl.dataset.authRequired = 'true';
                    }
                }
            } catch (error) {
                // Remove the potentially problematic cookie
                localStorage.removeItem('elasticCookie');
                
                UIUpdater.hideLoading('❌ Cookie test failed - please try again');
                
                // Show error message
                const statusEl = document.getElementById('refreshStatus');
                if (statusEl) {
                    statusEl.innerHTML = `
                        ❌ Cookie test failed |
                        <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">
                            Try Again
                        </a> |
                        <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #333;">
                            Help
                        </a>
                    `;
                    statusEl.dataset.authRequired = 'true';
                }
            }
        }
    }

    /**
     * Start auto-refresh using DataLayer state management
     */
    function startAutoRefresh(interval = 300000) {
        stopAutoRefresh(); // Clear any existing timer

        // Auto-refresh enabled

        autoRefreshTimer = setInterval(async () => {
            // Auto-refresh triggered

            // Check if we're not already loading
            const state = DataLayer.getQueryState();
            const isLoading = Array.from(state.activeQueries.values())
                .some(query => query.status === 'executing');

            if (!isLoading) {
                // Check performance metrics before refreshing
                const metrics = DataLayer.getPerformanceMetrics();

                // Adapt refresh based on performance
                if (metrics.averageQueryDuration > 10000) {
                    // Skipping auto-refresh - queries taking too long
                    DataLayer.logAction('AUTO_REFRESH_SKIPPED', {
                        reason: 'poor_performance',
                        avgDuration: metrics.averageQueryDuration
                    });
                    return;
                }

                if (metrics.failedQueries > 5 && metrics.cacheHitRate < 50) {
                    // Skipping auto-refresh - too many failures
                    DataLayer.logAction('AUTO_REFRESH_SKIPPED', {
                        reason: 'high_failure_rate',
                        failedQueries: metrics.failedQueries,
                        cacheHitRate: metrics.cacheHitRate
                    });
                    return;
                }

                // Log auto-refresh with performance context
                DataLayer.logAction('AUTO_REFRESH_EXECUTING', {
                    avgQueryDuration: metrics.averageQueryDuration,
                    cacheHitRate: metrics.cacheHitRate,
                    failedQueries: metrics.failedQueries
                });

                await refresh();
            } else {
                // Skipping auto-refresh - query already in progress
                DataLayer.logAction('AUTO_REFRESH_SKIPPED', {
                    reason: 'query_in_progress'
                });
            }
        }, interval);

        return autoRefreshTimer;
    }

    /**
     * Stop auto-refresh
     */
    function stopAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
            // Auto-refresh stopped
        }
    }

    /**
     * Show API setup instructions
     */
    function showApiSetupInstructions() {
        const isLocalhost = window.location.hostname === 'localhost';

        if (isLocalhost) {
            alert(`REAL-TIME API SETUP FOR LOCALHOST

OPTION 1: Use CORS Proxy (Recommended)
1. Open a new terminal
2. Run: python3 bin/cors_proxy.py
3. Leave it running (port 8889)
4. Refresh this dashboard
5. Set your Elastic cookie when prompted

OPTION 2: Browser CORS Bypass
- Chrome: Start with --disable-web-security --user-data-dir=/tmp/chrome_dev
- Firefox: Set security.tls.insecure_fallback_hosts in about:config
WARNING: Only for development - never for regular browsing!

OPTION 3: Direct Access (Production)
- Deploy to GitHub Pages - no CORS issues
- Real-time API calls work normally

Current Setup:
- DataLayer: ${DataLayer ? 'Loaded' : 'Not loaded'}
- Active Queries: ${DataLayer.getActiveQueries().length}
- Cache: ${DataLayer.getCachedResponses().length} items`);
        } else {
            alert(`REAL-TIME API SETUP FOR GITHUB PAGES

You're running on GitHub Pages - real-time should work!

SETUP STEPS:
1. Click "SET COOKIE FOR REAL-TIME"
2. Enter your Elastic cookie (sid=...)
3. Click "REFRESH NOW" to test

If still not working:
- Check if cookie expired
- Verify Kibana access permissions
- Check browser console for errors

Current Status:
- Environment: Production (GitHub Pages)
- DataLayer: ${DataLayer ? 'Loaded' : 'Not loaded'}
- Cookie: ${localStorage.getItem('elasticCookie') ? 'Set' : 'Not set'}`);
        }
    }

    /**
     * Classify errors and provide meaningful UI messages
     */
    function classifyError(error) {
        const errorStr = error.toString().toLowerCase();
        
        if (errorStr.includes('authentication') || errorStr.includes('cookie') || errorStr.includes('unauthorized')) {
            return {
                short: 'Authentication required',
                detailed: 'Cookie expired or invalid | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Update Cookie</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #666;">Help</a>'
            };
        }
        
        if (errorStr.includes('cors') || errorStr.includes('proxy')) {
            return {
                short: 'CORS proxy needed',
                detailed: 'CORS proxy required for localhost | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #d32f2f;">Setup Instructions</a>'
            };
        }
        
        if (errorStr.includes('network') || errorStr.includes('fetch') || errorStr.includes('connection')) {
            return {
                short: 'Network connection failed',
                detailed: 'Network error - check connection | <a href="#" onclick="location.reload(); return false;" style="color: #d32f2f;">Reload Page</a> | <a href="#" onclick="Dashboard.testApiConnection(); return false;" style="color: #666;">Test API</a>'
            };
        }
        
        if (errorStr.includes('timeout') || errorStr.includes('slow')) {
            return {
                short: 'Request timed out',
                detailed: 'Server response too slow | <a href="#" onclick="Dashboard.refresh(); return false;" style="color: #d32f2f;">Try Again</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #666;">Help</a>'
            };
        }
        
        if (errorStr.includes('query') || errorStr.includes('elasticsearch')) {
            return {
                short: 'Query execution failed',
                detailed: 'Data query failed | <a href="#" onclick="Dashboard.refresh(); return false;" style="color: #d32f2f;">Retry</a> | <a href="#" onclick="ConfigManager.loadConfig(); return false;" style="color: #666;">Check Config</a>'
            };
        }
        
        // Generic error
        return {
            short: 'Request failed',
            detailed: `Error: ${error} | <a href="#" onclick="Dashboard.refresh(); return false;" style="color: #d32f2f;">Try Again</a> | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #666;">Help</a>`
        };
    }

    /**
     * Calculate statistics from transformed data for logging
     */
    function calculateRefreshStats(transformedData) {
        const stats = { total: 0, critical: 0, warning: 0, normal: 0, increased: 0 };
        
        if (!Array.isArray(transformedData)) {
            return stats;
        }
        
        transformedData.forEach(item => {
            stats.total++;
            const status = (item.status || 'NORMAL').toLowerCase();
            if (status === 'critical') stats.critical++;
            else if (status === 'warning') stats.warning++;
            else if (status === 'increased') stats.increased++;
            else stats.normal++;
        });
        
        return stats;
    }

    /**
     * Get dashboard state for debugging
     */
    function getState() {
        return {
            dataLayer: DataLayer.getQueryState(),
            activeQueries: DataLayer.getActiveQueries(),
            performanceMetrics: DataLayer.getPerformanceMetrics(),
            config: ConfigManager.getCurrentConfig(),
            timers: {
                autoRefresh: !!autoRefreshTimer,
                statusUpdate: !!statusUpdateTimer
            }
        };
    }

    /**
     * Clean shutdown
     */
    function shutdown() {
        stopAutoRefresh();
        if (statusUpdateTimer) {
            clearInterval(statusUpdateTimer);
            statusUpdateTimer = null;
        }
        DataLayer.clearCache();
        // Dashboard shutdown complete
    }

    /**
     * Show performance statistics in console
     */
    function showPerformanceStats() {
        const metrics = DataLayer.getPerformanceMetrics();

        console.group('%c📊 Dashboard Performance Statistics', 'color: #1976d2; font-size: 14px; font-weight: bold;');

        console.log('%cQuery Performance:', 'color: #666; font-weight: bold;');
        console.log(`  Average Query Duration: ${metrics.averageQueryDuration}ms`);

        if (metrics.slowestQueryLastHour) {
            console.log(`  Slowest Query (last hour): ${metrics.slowestQueryLastHour.duration}ms`);
            console.log(`    - Query ID: ${metrics.slowestQueryLastHour.queryId}`);
            console.log(`    - Type: ${metrics.slowestQueryLastHour.queryType}`);
        }

        console.log('\n%cCache Performance:', 'color: #666; font-weight: bold;');
        console.log(`  Cache Hit Rate: ${metrics.cacheHitRate}%`);
        console.log(`  Cache Hits: ${metrics.cacheHits}`);
        console.log(`  Cache Misses: ${metrics.cacheMisses}`);

        console.log('\n%cReliability:', 'color: #666; font-weight: bold;');
        console.log(`  Failed Queries: ${metrics.failedQueries}`);

        console.log('\n%cCORS Proxy Status:', 'color: #666; font-weight: bold;');
        console.log(`  Status: ${metrics.corsProxyStatus}`);
        if (metrics.lastCorsHealthCheck) {
            const lastCheck = new Date(metrics.lastCorsHealthCheck).toLocaleTimeString();
            console.log(`  Last Health Check: ${lastCheck}`);
        }

        console.log('\n%cRecent Queries:', 'color: #666; font-weight: bold;');
        if (metrics.recentQueries.length > 0) {
            console.table(metrics.recentQueries.map(q => ({
                'Query ID': q.queryId.substring(0, 30) + '...',
                'Duration (ms)': q.duration,
                'Type': q.queryType,
                'Time': new Date(q.timestamp).toLocaleTimeString()
            })));
        } else {
            console.log('  No recent queries');
        }

        console.groupEnd();

        return metrics;
    }

    /**
     * Get dashboard health status with performance metrics
     */
    function getHealthStatus() {
        const metrics = DataLayer.getPerformanceMetrics();
        const config = ConfigManager.getCurrentConfig();
        const state = getState();

        // Calculate health score
        let healthScore = 100;

        // Deduct points for poor performance
        if (metrics.averageQueryDuration > 5000) healthScore -= 20;
        else if (metrics.averageQueryDuration > 3000) healthScore -= 10;

        // Deduct points for low cache rate
        if (metrics.cacheHitRate < 50) healthScore -= 20;
        else if (metrics.cacheHitRate < 70) healthScore -= 10;

        // Deduct points for failures
        if (metrics.failedQueries > 5) healthScore -= 30;
        else if (metrics.failedQueries > 2) healthScore -= 15;

        // Deduct points for CORS proxy issues (localhost only)
        if (window.location.hostname === 'localhost' && metrics.corsProxyStatus !== 'running') {
            healthScore -= 25;
        }

        // Determine status
        let status = 'healthy';
        if (healthScore < 50) status = 'unhealthy';
        else if (healthScore < 80) status = 'degraded';

        return {
            status,
            healthScore,
            timestamp: new Date().toISOString(),
            environment: window.location.hostname === 'localhost' ? 'development' : 'production',
            metrics: {
                avgQueryTime: metrics.averageQueryDuration,
                cacheHitRate: metrics.cacheHitRate,
                failedQueries: metrics.failedQueries,
                reliability: metrics.cacheHits + metrics.cacheMisses + metrics.failedQueries > 0
                    ? Math.round(((metrics.cacheHits + metrics.cacheMisses) / (metrics.cacheHits + metrics.cacheMisses + metrics.failedQueries)) * 100)
                    : 100
            },
            corsProxy: {
                status: metrics.corsProxyStatus,
                lastCheck: metrics.lastCorsHealthCheck ? new Date(metrics.lastCorsHealthCheck).toISOString() : null
            },
            activeQueries: state.activeQueries.length,
            currentConfig: {
                timeRange: config.currentTimeRange,
                refreshInterval: 'auto'
            }
        };
    }

    // =======================
    // PUBLIC API
    // =======================

    return {
        init,
        refresh,
        testApiConnection,
        setCookieForRealtime,
        startAutoRefresh,
        stopAutoRefresh,
        showApiSetupInstructions,
        getState,
        shutdown,
        showPerformanceStats,
        getHealthStatus,
        calculateRefreshStats
    };
})();

// ESM: Export as default for convenience
export default Dashboard;

// ESM: Initialization moved to main.js
