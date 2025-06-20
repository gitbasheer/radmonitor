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

// ESM: Converted from IIFE to ES module export
export const Dashboard = (() => {
    'use strict';

    // Internal state for timers and intervals
    let autoRefreshTimer = null;
    let statusUpdateTimer = null;

    /**
     * Initialize dashboard with state management
     */
    function init() {
        // Log initialization start
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
            DataLayer.logAction('DASHBOARD_INIT_START', {
                timestamp: new Date().toISOString(),
                location: window.location.hostname
            });
        }

        // Initialize configuration management
        initializeConfiguration();

        // Set up DataLayer event listeners
        setupStateListeners();

        // Initialize UI components
        initializeUIComponents();

        // Start monitoring and auto-refresh
        startSystemMonitoring();

        // Initialize performance widget
        if (typeof UIUpdater !== 'undefined' && UIUpdater.updatePerformanceWidget) {
            UIUpdater.updatePerformanceWidget();
        }

        // Log initialization complete
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
            DataLayer.logAction('DASHBOARD_INIT_COMPLETE', {
                listeners: DataLayer.getActiveQueries ? DataLayer.getActiveQueries().length : 0,
                timers: { autoRefresh: !!autoRefreshTimer, statusUpdate: !!statusUpdateTimer },
                performanceMetrics: DataLayer.getPerformanceMetrics ? DataLayer.getPerformanceMetrics() : null
            });
        }

        // Show initial performance stats in console
        console.log('%c🚀 Dashboard initialized with performance monitoring', 'color: #4CAF50; font-weight: bold;');
        console.log('%cRun Dashboard.showPerformanceStats() for detailed metrics', 'color: #2196F3;');
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

            switch (searchType) {
                case 'traffic':
                case 'main_traffic':
                    handleTrafficDataUpdate(data);
                    break;
                case 'health':
                    handleHealthDataUpdate(data);
                    break;
                default:
                    console.log(`📊 Search completed: ${searchType}`);
            }
        });

        // Listen for errors
        DataLayer.addEventListener('error', (event) => {
            const { searchType, error } = event;
            console.error(`❌ ${searchType} search failed:`, error);

            // Show user-friendly error message
            UIUpdater.hideLoading(`${searchType} failed: ${error}`);

            // For critical failures, provide fallback
            if (searchType === 'traffic' || searchType === 'main_traffic') {
                showFallbackRefresh();
            }
        });

        // Listen for state changes
        DataLayer.addEventListener('stateChange', (event) => {
            const { path, value } = event;
            console.log(`🔄 State changed: ${path}`, value);
        });
    }

    /**
     * Initialize UI components and validation
     */
    function initializeUIComponents() {
        // Show console welcome message
        ConsoleVisualizer.showWelcomeMessage();

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
            // transformedData is already processed by DataLayer
            const stats = DataProcessor.getSummaryStats(transformedData);

            // Update UI components
            UIUpdater.updateSummaryCards(stats);
            UIUpdater.updateDataTable(transformedData);
            UIUpdater.updateTimestamp();
            UIUpdater.hideLoading('✅ Updated with real-time data!');

            // Update performance widget with latest metrics
            UIUpdater.updatePerformanceWidget();

            // Show console visualization if enabled
            const config = ConfigManager.getCurrentConfig();
            if (config.enableConsoleVisualization !== false) {
                // Reconstruct the data format expected by ConsoleVisualizer
                const mockESResponse = {
                    aggregations: {
                        events: {
                            buckets: transformedData.map(item => ({
                                key: item.event_id,
                                doc_count: item.current + item.baseline_count,
                                current: { doc_count: item.current },
                                baseline: { doc_count: item.baseline_count }
                            }))
                        }
                    }
                };
                ConsoleVisualizer.visualizeData(mockESResponse, config.currentTimeRange, config);
            }

            console.log('✅ Dashboard updated successfully via DataLayer');

        } catch (error) {
            console.error('Failed to update dashboard UI:', error);
            UIUpdater.hideLoading('❌ Update failed - data processing error');
        }
    }

    /**
     * Handle health data updates
     */
    function handleHealthDataUpdate(healthData) {
        console.log('🏥 Health data updated:', healthData);
        UIUpdater.updateApiStatus();
        // Update performance widget after health check
        UIUpdater.updatePerformanceWidget();
    }

    /**
     * Refresh dashboard using DataLayer (MAIN ENTRY POINT)
     */
    async function refresh() {
        const refreshId = `refresh_${Date.now()}`;

        // Log dashboard action
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
            DataLayer.logAction('DASHBOARD_REFRESH_START', {
                refreshId,
                timestamp: new Date().toISOString()
            });
        }

        UIUpdater.showLoading('Fetching latest data...');

        try {
            // Get current configuration
            const config = ConfigManager.getCurrentConfig();

            // Use DataLayer to fetch and parse data in one clean operation
            const result = await DataLayer.fetchAndParse(`main_traffic_${refreshId}`, {
                type: 'trafficAnalysis',
                params: config
            });

            // Log completion
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('DASHBOARD_REFRESH_COMPLETE', {
                    refreshId,
                    queryId: result.queryId,
                    dataPoints: result.transformed?.length || 0,
                    method: result.raw?._source ? 'parsed' : 'direct'
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
                UIUpdater.hideLoading('❌ Authentication required - set your cookie');
                showFallbackRefresh();
            } else {
                UIUpdater.hideLoading('❌ Refresh failed - see console');
                showFallbackRefresh();
            }
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
        const cookie = await ApiClient.promptForCookie('real-time updates');
        if (cookie) {
            UIUpdater.hideLoading('🍪 Cookie saved! Click refresh to test real-time.');
            UIUpdater.updateApiStatus();
        }
    }

    /**
     * Start auto-refresh using DataLayer state management
     */
    function startAutoRefresh(interval = 300000) {
        stopAutoRefresh(); // Clear any existing timer

        console.log(`⏰ Starting auto-refresh every ${interval/1000} seconds`);

        autoRefreshTimer = setInterval(async () => {
            console.log('🔄 Auto-refresh triggered');

            // Check if we're not already loading
            const state = DataLayer.getQueryState();
            const isLoading = Array.from(state.activeQueries.values())
                .some(query => query.status === 'executing');

            if (!isLoading) {
                // Check performance metrics before refreshing
                const metrics = DataLayer.getPerformanceMetrics();

                // Adapt refresh based on performance
                if (metrics.averageQueryDuration > 10000) {
                    console.log('⚠️ Skipping auto-refresh - queries taking too long (>10s average)');
                    DataLayer.logAction('AUTO_REFRESH_SKIPPED', {
                        reason: 'poor_performance',
                        avgDuration: metrics.averageQueryDuration
                    });
                    return;
                }

                if (metrics.failedQueries > 5 && metrics.cacheHitRate < 50) {
                    console.log('⚠️ Skipping auto-refresh - too many failures and low cache rate');
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
                console.log('⏸️ Skipping auto-refresh - query already in progress');
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
            console.log('⏹️ Auto-refresh stopped');
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
2. Run: python3 cors_proxy.py
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
        console.log('🛑 Dashboard shutdown complete');
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
        getHealthStatus
    };
})();

// ESM: Export as default for convenience
export default Dashboard;

// ESM: Initialization moved to main.js
