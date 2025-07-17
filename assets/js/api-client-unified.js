/**
 * Unified API Client for RAD Monitor Dashboard
 * Consolidates all API communication into a single, clean implementation
 * Works with the unified server (bin/server.py) on port 8000
 */

import TimeRangeUtils from './time-range-utils.js';
import { ConfigService } from './config-service.js';

/**
 * Unified API Client
 * Single source of truth for all API communication
 */
export class UnifiedAPIClient {
    constructor() {
        // Environment detection
        this.isLocalDev = window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
        this.isProduction = window.location.hostname.includes('github.io');

        // Base URLs - unified server handles everything
        this.baseUrl = this.isLocalDev ? 'http://localhost:8000' : '';
        this.apiV1 = `${this.baseUrl}/api/v1`;
        this.wsUrl = this.isLocalDev ? 'ws://localhost:8000/ws' : null;

        // Production mode uses proxy, not direct API calls
        this.useProxy = this.isProduction;

        // WebSocket state
        this.websocket = null;
        this.wsHandlers = new Map();
        this.wsReconnectInterval = null;
        this.wsState = 'disconnected';

        // Cache
        this.cache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        // Performance tracking
        this.metrics = {
            requests: 0,
            errors: 0,
            totalTime: 0
        };
    }

    // ====================
    // Authentication
    // ====================

    /**
     * Get authentication cookie from various sources
     */
    getElasticCookie() {
        // Check localStorage first
        const saved = localStorage.getItem('elasticCookie');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.expires && new Date(parsed.expires) > new Date()) {
                    return parsed.cookie;
                }
            } catch (e) {
                // Invalid JSON, continue checking
            }
        }

        // Check window.ELASTIC_COOKIE
        if (window.ELASTIC_COOKIE) {
            return window.ELASTIC_COOKIE;
        }

        // No cookie found
        return null;
    }

    /**
     * Save authentication cookie
     */
    saveElasticCookie(cookie) {
        if (!cookie || !cookie.trim()) return false;

        const cookieData = {
            cookie: cookie.trim(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            saved: new Date().toISOString()
        };

        localStorage.setItem('elasticCookie', JSON.stringify(cookieData));
        return true;
    }

    /**
     * Get authentication details
     */
    async getAuthenticationDetails() {
        const cookie = this.getElasticCookie();

        if (cookie) {
            return {
                valid: true,
                method: this.isLocalDev ? 'unified-server' : 'direct',
                cookie: cookie
            };
        }

        return {
            valid: false,
            method: null,
            cookie: null,
            message: 'No authentication cookie found'
        };
    }

    /**
     * Prompt user for cookie
     */
    async promptForCookie(purpose = 'API access') {
        const cookie = prompt(
            `Enter your Elastic authentication cookie for ${purpose}:\n\n` +
            `1. Open Kibana in another tab\n` +
            `2. Open Developer Tools (F12)\n` +
            `3. Go to Network tab\n` +
            `4. Refresh the page\n` +
            `5. Find any request to Kibana\n` +
            `6. Copy the 'Cookie' header value\n` +
            `7. Paste it below\n\n` +
            `Look for: sid=xxxxx`
        );

        if (cookie && this.saveElasticCookie(cookie)) {
            return cookie.trim();
        }

        return null;
    }

    // ====================
    // HTTP Methods
    // ====================

    /**
     * Make HTTP request with consistent error handling
     */
    async request(url, options = {}) {
        const startTime = Date.now();
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // Add default headers
            options.headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };

            // Add timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeout);

                const duration = Date.now() - startTime;
                this.metrics.requests++;
                this.metrics.totalTime += duration;

                if (!response.ok) {
                    const error = await response.json().catch(() => ({}));
                    throw new Error(error.detail || `HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Log success
                console.log(
                    `✅ API Request → ${options.method || 'GET'} ${url} | ${duration}ms`,
                    { requestId, status: response.status }
                );

                return { success: true, data, duration, requestId };

            } catch (error) {
                clearTimeout(timeout);
                throw error;
            }

        } catch (error) {
            const duration = Date.now() - startTime;
            this.metrics.errors++;

            console.error(
                `❌ API Request Failed → ${options.method || 'GET'} ${url} | ${duration}ms`,
                { requestId, error: error.message }
            );

            return {
                success: false,
                error: error.message,
                duration,
                requestId
            };
        }
    }

    /**
     * GET request helper
     */
    async get(endpoint, options = {}) {
        return this.request(`${this.apiV1}${endpoint}`, {
            method: 'GET',
            ...options
        });
    }

    /**
     * POST request helper
     */
    async post(endpoint, data, options = {}) {
        return this.request(`${this.apiV1}${endpoint}`, {
            method: 'POST',
            body: JSON.stringify(data),
            ...options
        });
    }

    // ====================
    // Query Building
    // ====================

    /**
     * Build Elasticsearch query with multi-RAD support
     */
    buildQuery(config) {
        const settings = ConfigService.getConfig();
        const radTypes = settings.rad_types || {};

        // Get enabled RAD patterns
        let enabledPatterns = Object.entries(radTypes)
            .filter(([_, radConfig]) => radConfig.enabled && radConfig.pattern)
            .map(([_, radConfig]) => radConfig.pattern.trim())
            .filter(pattern => pattern.length > 0);

        // Fallback to default pattern if no valid patterns found
        if (enabledPatterns.length === 0) {
            console.warn('No valid RAD patterns found, using default pattern');
            enabledPatterns = ['pandc.vnext.recommendations.feed.feed*'];
        }

        console.log('🔍 Query patterns:', enabledPatterns);

        // Parse time range
        const currentTimeFilter = TimeRangeUtils.parseTimeRangeToFilter(config.currentTimeRange);

        // Build query
        const query = {
            size: 0,
            aggs: {
                events: {
                    terms: {
                        field: "detail.event.data.traffic.eid.keyword",
                        order: { "_key": "asc" },
                        size: settings.queryAggSize || 500
                    },
                    aggs: {
                        baseline: {
                            filter: {
                                range: {
                                    "@timestamp": {
                                        gte: config.baselineStart,
                                        lt: config.baselineEnd
                                    }
                                }
                            }
                        },
                        current: {
                            filter: {
                                range: {
                                    "@timestamp": currentTimeFilter
                                }
                            }
                        }
                    }
                }
            },
            query: {
                bool: {
                    filter: [
                        // Pattern filter - handle single or multiple patterns
                        enabledPatterns.length === 1
                            ? {
                                wildcard: {
                                    "detail.event.data.traffic.eid.keyword": {
                                        value: enabledPatterns[0]
                                    }
                                }
                            }
                            : {
                                bool: {
                                    should: enabledPatterns.map(pattern => ({
                                        wildcard: {
                                            "detail.event.data.traffic.eid.keyword": {
                                                value: pattern
                                            }
                                        }
                                    })),
                                    minimum_should_match: 1
                                }
                            },
                        {
                            match_phrase: {
                                "detail.global.page.host": "dashboard.godaddy.com"
                            }
                        },
                        {
                            range: {
                                "@timestamp": {
                                    gte: settings.minEventDate || "2025-05-19T04:00:00.000Z",
                                    lte: "now"
                                }
                            }
                        }
                    ]
                }
            }
        };

        return query;
    }

    // ====================
    // Core API Methods
    // ====================

    /**
     * Compare two time windows for baseline health checks
     * @param {string} healthyStart - ISO timestamp for healthy window start
     * @param {string} healthyEnd - ISO timestamp for healthy window end
     * @param {string} recentStart - ISO timestamp for recent window start
     * @param {string} recentEnd - ISO timestamp for recent window end
     * @param {string} eidPrefix - EID pattern to filter (default: 'pandc.vnext.recommendations.feed.feed*')
     * @returns {Promise<Object>} Comparison result with status and details
     */
    async compareWindows(healthyStart, healthyEnd, recentStart, recentEnd, eidPrefix = 'pandc.vnext.recommendations.feed.feed*') {
        // Build base query structure
        const baseQuery = {
            size: 0,
            query: {
                bool: {
                    filter: [
                        {
                            wildcard: {
                                'detail.event.data.traffic.eid.keyword': eidPrefix
                            }
                        },
                        {
                            match_phrase: {
                                'detail.global.page.host': 'dashboard.godaddy.com'
                            }
                        }
                    ]
                }
            },
            aggs: {
                unique_eids: {
                    terms: {
                        field: 'detail.event.data.traffic.eid.keyword',
                        size: 10000
                    }
                },
                event_count: {
                    value_count: {
                        field: '@timestamp'
                    }
                }
            }
        };

        // Create queries for both time windows
        const healthyQuery = {
            ...baseQuery,
            query: {
                ...baseQuery.query,
                bool: {
                    ...baseQuery.query.bool,
                    filter: [
                        ...baseQuery.query.bool.filter,
                        {
                            range: {
                                '@timestamp': {
                                    gte: healthyStart,
                                    lte: healthyEnd
                                }
                            }
                        }
                    ]
                }
            }
        };

        const recentQuery = {
            ...baseQuery,
            query: {
                ...baseQuery.query,
                bool: {
                    ...baseQuery.query.bool,
                    filter: [
                        ...baseQuery.query.bool.filter,
                        {
                            range: {
                                '@timestamp': {
                                    gte: recentStart,
                                    lte: recentEnd
                                }
                            }
                        }
                    ]
                }
            }
        };

        // Execute both queries in parallel
        const [healthyRes, recentRes] = await Promise.all([
            this.executeQuery(healthyQuery),
            this.executeQuery(recentQuery)
        ]);

        // Check if both queries succeeded
        if (!healthyRes.success || !recentRes.success) {
            return {
                success: false,
                error: 'Failed to execute comparison queries',
                details: {
                    healthyError: healthyRes.error,
                    recentError: recentRes.error
                }
            };
        }

        // Extract metrics from responses
        const healthyData = healthyRes.data;
        const recentData = recentRes.data;

        const healthyCount = healthyData.aggregations?.event_count?.value || 0;
        const recentCount = recentData.aggregations?.event_count?.value || 0;

        const healthyEids = healthyData.aggregations?.unique_eids?.buckets || [];
        const recentEids = recentData.aggregations?.unique_eids?.buckets || [];

        // Calculate percentage difference
        const diff = healthyCount > 0 
            ? ((recentCount - healthyCount) / healthyCount) * 100
            : (recentCount > 0 ? 100 : 0);

        // Determine status based on thresholds
        let status = 'NORMAL';
        if (diff < -80) {
            status = 'CRITICAL';
        } else if (diff < -50) {
            status = 'WARNING';
        } else if (diff > 50) {
            status = 'INCREASED';
        }

        // Calculate EID differences
        const healthyEidSet = new Set(healthyEids.map(b => b.key));
        const recentEidSet = new Set(recentEids.map(b => b.key));
        
        const missingEids = [...healthyEidSet].filter(eid => !recentEidSet.has(eid));
        const newEids = [...recentEidSet].filter(eid => !healthyEidSet.has(eid));

        return {
            success: true,
            status,
            percentageDiff: Math.round(diff * 100) / 100,
            details: {
                healthy: {
                    eventCount: healthyCount,
                    uniqueEids: healthyEids.length,
                    topEids: healthyEids.slice(0, 5).map(b => ({
                        eid: b.key,
                        count: b.doc_count
                    }))
                },
                recent: {
                    eventCount: recentCount,
                    uniqueEids: recentEids.length,
                    topEids: recentEids.slice(0, 5).map(b => ({
                        eid: b.key,
                        count: b.doc_count
                    }))
                },
                eidAnalysis: {
                    missingEids: missingEids.slice(0, 10),
                    newEids: newEids.slice(0, 10),
                    totalMissing: missingEids.length,
                    totalNew: newEids.length
                },
                timeWindows: {
                    healthy: { start: healthyStart, end: healthyEnd },
                    recent: { start: recentStart, end: recentEnd }
                },
                eidPattern: eidPrefix
            }
        };
    }

    /**
     * Execute Elasticsearch query
     */
    async executeQuery(query, forceRefresh = false) {
        const auth = await this.getAuthenticationDetails();

        if (!auth.valid) {
            return {
                success: false,
                error: 'No authentication available. Please set your cookie.'
            };
        }

        // Check cache
        const cacheKey = JSON.stringify(query);
        if (!forceRefresh && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.CACHE_TTL) {
                console.log('📦 Using cached query result');
                return { success: true, data: cached.data, cached: true };
            }
        }

        let result;

        if (this.useProxy) {
            // Production mode: try proxy service first
            const config = ConfigService.getConfig();
            const proxyUrl = config.corsProxy?.url;

            if (!proxyUrl) {
                return {
                    success: false,
                    error: 'Proxy service not configured for production mode'
                };
            }

            // Send everything securely in request body
            const esUrl = config.elasticsearch?.url || 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
            const esPath = config.elasticsearch?.path || '/api/console/proxy?path=traffic-*/_search&method=POST';

            const requestBody = {
                esUrl,
                esPath,
                cookie: auth.cookie,
                query
            };

            result = await this.request(proxyUrl, {
                method: 'POST',
                body: JSON.stringify(requestBody),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // If proxy fails, try direct Elasticsearch (requires CORS extension)
            if (!result.success && result.error && result.error.includes('CORS')) {
                console.log('🔄 Proxy failed, trying direct Elasticsearch connection...');

                try {
                    const directResponse = await fetch(`${esUrl}${esPath}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': auth.cookie
                        },
                        body: JSON.stringify(query)
                    });

                    if (directResponse.ok) {
                        const directData = await directResponse.json();
                        if (!directData.error) {
                            console.log('✅ Direct Elasticsearch connection successful!');
                            result = {
                                success: true,
                                data: directData,
                                method: 'direct-elasticsearch-fallback'
                            };
                        }
                    }
                } catch (directError) {
                    console.log('⚠️ Direct connection also failed:', directError.message);
                    // Keep original proxy error
                }
            }
        } else {
            // Development mode: use unified server
            result = await this.request(`${this.apiV1}/kibana/proxy`, {
                method: 'POST',
                body: JSON.stringify({
                    query: query,  // Wrap the query as expected by server
                    force_refresh: forceRefresh
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'X-Elastic-Cookie': auth.cookie
                }
            });
        }

        // Cache successful results
        if (result.success) {
            this.cache.set(cacheKey, {
                data: result.data,
                timestamp: Date.now()
            });
        }

        return result;
    }

    /**
     * Fetch traffic data (main API method)
     */
    async fetchTrafficData(config) {
        const query = this.buildQuery(config);
        return await this.executeQuery(query);
    }

    /**
     * Health check
     */
    async checkHealth() {
        if (this.useProxy) {
            // In production, we don't have a health endpoint
            // Instead, check if we have authentication
            const auth = await this.getAuthenticationDetails();
            return {
                healthy: auth.valid,
                mode: 'production-proxy',
                authenticated: auth.valid,
                message: auth.valid ? 'Proxy authentication ready' : 'No authentication cookie'
            };
        }

        const result = await this.request(`${this.baseUrl}/health`);
        return result.success ? result.data : { healthy: false, error: result.error };
    }

    /**
     * Get dashboard configuration
     */
    async getDashboardConfig() {
        return await this.get('/dashboard/config');
    }

    /**
     * Update dashboard configuration
     */
    async updateDashboardConfig(config) {
        return await this.post('/dashboard/config', config);
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats() {
        return await this.get('/dashboard/stats');
    }

    /**
     * Get server metrics
     */
    async getMetrics() {
        return await this.get('/metrics');
    }

    // ====================
    // WebSocket Management
    // ====================

    /**
     * Connect to WebSocket for real-time updates
     */
    async connectWebSocket() {
        if (!this.wsUrl || !this.isLocalDev) {
            return false; // WebSocket only available in local dev
        }

        if (this.websocket?.readyState === WebSocket.OPEN) {
            return true; // Already connected
        }

        return new Promise((resolve) => {
            try {
                this.websocket = new WebSocket(this.wsUrl);

                this.websocket.onopen = () => {
                    console.log('🔌 WebSocket connected');
                    this.wsState = 'connected';
                    this.clearReconnectInterval();

                    // Send initial ping
                    this.websocket.send(JSON.stringify({ type: 'ping' }));
                    resolve(true);
                };

                this.websocket.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleWebSocketMessage(message);
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                };

                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.wsState = 'error';
                    resolve(false);
                };

                this.websocket.onclose = () => {
                    console.log('🔌 WebSocket disconnected');
                    this.wsState = 'disconnected';
                    this.scheduleReconnect();
                };

            } catch (error) {
                console.error('Failed to create WebSocket:', error);
                resolve(false);
            }
        });
    }

    /**
     * Disconnect WebSocket
     */
    disconnectWebSocket() {
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
        this.clearReconnectInterval();
        this.wsState = 'disconnected';
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        const handlers = this.wsHandlers.get(message.type) || [];
        handlers.forEach(handler => {
            try {
                handler(message.data);
            } catch (error) {
                console.error(`Error in ${message.type} handler:`, error);
            }
        });
    }

    /**
     * Subscribe to WebSocket events
     */
    on(event, handler) {
        if (!this.wsHandlers.has(event)) {
            this.wsHandlers.set(event, []);
        }
        this.wsHandlers.get(event).push(handler);
    }

    /**
     * Unsubscribe from WebSocket events
     */
    off(event, handler) {
        const handlers = this.wsHandlers.get(event);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Schedule WebSocket reconnection
     */
    scheduleReconnect() {
        if (!this.wsReconnectInterval) {
            this.wsReconnectInterval = setInterval(() => {
                console.log('Attempting WebSocket reconnection...');
                this.connectWebSocket();
            }, 5000);
        }
    }

    /**
     * Clear reconnect interval
     */
    clearReconnectInterval() {
        if (this.wsReconnectInterval) {
            clearInterval(this.wsReconnectInterval);
            this.wsReconnectInterval = null;
        }
    }

    // ====================
    // Utility Methods
    // ====================

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Cache cleared');
    }

    /**
     * Get client metrics
     */
    getClientMetrics() {
        return {
            ...this.metrics,
            avgResponseTime: this.metrics.requests > 0
                ? Math.round(this.metrics.totalTime / this.metrics.requests)
                : 0,
            successRate: this.metrics.requests > 0
                ? Math.round(((this.metrics.requests - this.metrics.errors) / this.metrics.requests) * 100)
                : 100,
            cacheSize: this.cache.size,
            websocketState: this.wsState
        };
    }

    /**
     * Initialize client
     */
    async initialize() {
        console.log('🚀 Initializing Unified API Client');

        // Check health
        const health = await this.checkHealth();
        console.log('Health check:', health);

        // Connect WebSocket if in local dev
        if (this.isLocalDev) {
            await this.connectWebSocket();
        }

        return health.healthy !== false;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.disconnectWebSocket();
        this.clearCache();
        console.log('🧹 API Client cleaned up');
    }
}

// Create singleton instance
export const apiClient = new UnifiedAPIClient();

// Export as default
export default apiClient;
