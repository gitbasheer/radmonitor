/**
 * Enhanced API Client for RAD Monitor
 * Supports both raw Elasticsearch queries and typed endpoints
 */

export const EnhancedApiClient = (() => {
    'use strict';

    // Configuration
    const config = {
        baseUrl: 'http://localhost:8889',
        timeout: 30000,
        elasticCookie: null
    };

    // =======================
    // Core Request Handler
    // =======================

    /**
     * Make HTTP request with proper headers and error handling
     */
    async function makeRequest(endpoint, options = {}) {
        const url = `${config.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add elastic cookie if available
        if (config.elasticCookie) {
            headers['X-Elastic-Cookie'] = config.elasticCookie;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || config.timeout);

        try {
            const response = await fetch(url, {
                method: options.method || 'POST',
                headers,
                body: options.body ? JSON.stringify(options.body) : undefined,
                signal: options.signal || controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw {
                    status: response.status,
                    message: error.detail || error.message || response.statusText,
                    details: error
                };
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                throw {
                    status: 408,
                    message: 'Request timeout',
                    details: { timeout: config.timeout }
                };
            }

            throw {
                status: error.status || 500,
                message: error.message || 'Network error',
                details: error.details || error
            };
        }
    }

    // =======================
    // Raw Proxy Endpoint
    // =======================

    /**
     * Execute raw Elasticsearch query (backward compatible)
     */
    async function executeQuery(query, options = {}) {
        try {
            const data = await makeRequest('/kibana-proxy', {
                method: 'POST',
                body: query,
                ...options
            });

            return { success: true, data };
        } catch (error) {
            console.error('Query execution failed:', error);
            return { success: false, error };
        }
    }

    // =======================
    // Typed Endpoints
    // =======================

    /**
     * Traffic analysis with typed request/response
     */
    async function trafficAnalysis(request, options = {}) {
        try {
            const data = await makeRequest('/api/traffic-analysis', {
                method: 'POST',
                body: request,
                ...options
            });

            return { success: true, data };
        } catch (error) {
            console.error('Traffic analysis failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Time series analysis with typed request/response
     */
    async function timeSeries(request, options = {}) {
        try {
            const data = await makeRequest('/api/time-series', {
                method: 'POST',
                body: request,
                ...options
            });

            return { success: true, data };
        } catch (error) {
            console.error('Time series analysis failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Error analysis with typed request/response
     */
    async function errorAnalysis(request, options = {}) {
        try {
            const data = await makeRequest('/api/error-analysis', {
                method: 'POST',
                body: request,
                ...options
            });

            return { success: true, data };
        } catch (error) {
            console.error('Error analysis failed:', error);
            return { success: false, error };
        }
    }

    /**
     * Health check
     */
    async function healthCheck(options = {}) {
        try {
            const data = await makeRequest('/health', {
                method: 'GET',
                ...options
            });

            return { success: true, data };
        } catch (error) {
            console.error('Health check failed:', error);
            return { success: false, error };
        }
    }

    // =======================
    // Convenience Methods
    // =======================

    /**
     * Get traffic data for the current time range
     * @param {string} timeRange - Time range: '12h', '24h', 'inspection_time', or custom like '-8h-24h'
     * @param {object} options - Additional options
     */
    async function getCurrentTrafficData(timeRange = '12h', options = {}) {
        // Calculate baseline period (8 days ago)
        const now = new Date();
        const baselineEnd = new Date(now);
        baselineEnd.setDate(baselineEnd.getDate() - 8);
        baselineEnd.setHours(now.getHours(), now.getMinutes(), 0, 0);

        const baselineStart = new Date(baselineEnd);
        baselineStart.setDate(baselineStart.getDate() - 8);

        const request = {
            baseline_start: baselineStart.toISOString(),
            baseline_end: baselineEnd.toISOString(),
            current_time_range: timeRange  // Now supports 'inspection_time'
        };

        return trafficAnalysis(request, options);
    }

    /**
     * Get traffic data for inspection time
     * Convenience method specifically for inspection time window
     */
    async function getInspectionTimeData(options = {}) {
        return getCurrentTrafficData('inspection_time', options);
    }

    /**
     * Get time series data for a specific period
     */
    async function getTimeSeries(hours = 24, interval = '1h', options = {}) {
        const now = new Date();
        const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const request = {
            time_range: {
                start: start.toISOString(),
                end: now.toISOString()
            },
            interval
        };

        return timeSeries(request, options);
    }

    /**
     * Get error analysis for a specific period
     */
    async function getErrorAnalysis(hours = 24, options = {}) {
        const now = new Date();
        const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

        const request = {
            time_range: {
                start: start.toISOString(),
                end: now.toISOString()
            }
        };

        return errorAnalysis(request, options);
    }

    // =======================
    // Configuration
    // =======================

    /**
     * Set elastic cookie for authentication
     */
    function setElasticCookie(cookie) {
        config.elasticCookie = cookie;
        localStorage.setItem('elastic_cookie', cookie);
    }

    /**
     * Get elastic cookie
     */
    function getElasticCookie() {
        return config.elasticCookie || localStorage.getItem('elastic_cookie');
    }

    /**
     * Clear elastic cookie
     */
    function clearElasticCookie() {
        config.elasticCookie = null;
        localStorage.removeItem('elastic_cookie');
    }

    /**
     * Update configuration
     */
    function configure(newConfig) {
        Object.assign(config, newConfig);
    }

    // =======================
    // Migration Helper
    // =======================

    /**
     * Convert raw query to typed request
     * Helps with gradual migration from raw queries to typed endpoints
     */
    function convertToTypedRequest(rawQuery) {
        // Detect query type and convert
        if (rawQuery.aggs && rawQuery.aggs.events) {
            // Traffic analysis query
            const filters = rawQuery.query?.bool?.filter || [];
            const timeFilter = filters.find(f => f.range && f.range['@timestamp']);

            // Extract baseline and current from aggregations
            const baselineFilter = rawQuery.aggs.events.aggs?.baseline?.filter?.range?.['@timestamp'];
            const currentFilter = rawQuery.aggs.events.aggs?.current?.filter?.range?.['@timestamp'];

            if (baselineFilter && currentFilter) {
                return {
                    type: 'traffic',
                    request: {
                        baseline_start: baselineFilter.gte,
                        baseline_end: baselineFilter.lt,
                        current_time_range: '12h' // Default, would need to calculate from currentFilter
                    }
                };
            }
        }

        // Add more conversions as needed
        return null;
    }

    // =======================
    // Public API
    // =======================

    return {
        // Configuration
        configure,
        setElasticCookie,
        getElasticCookie,
        clearElasticCookie,

        // Raw endpoint (backward compatible)
        executeQuery,

        // Typed endpoints
        trafficAnalysis,
        timeSeries,
        errorAnalysis,
        healthCheck,

        // Convenience methods
        getCurrentTrafficData,
        getInspectionTimeData,  // NEW: Specific method for inspection time
        getTimeSeries,
        getErrorAnalysis,

        // Migration helper
        convertToTypedRequest,

        // Expose config for debugging
        getConfig: () => ({ ...config })
    };
})();

// ESM: Export as default for convenience
export default EnhancedApiClient;

// ESM: For backward compatibility, we'll need to handle global assignment elsewhere
// Removing window assignments as they don't work with ESM
