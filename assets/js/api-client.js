/**
 * API Client for RAD Monitor Dashboard
 * Handles communication with Kibana/Elasticsearch
 */

// ESM: Import dependencies
import TimeRangeUtils from './time-range-utils.js';

// ESM: Converted from IIFE to ES module export
export const ApiClient = (() => {
    'use strict';

    // Load API endpoints from config - with fallbacks for backward compatibility
    const getApiConfig = () => {
        if (window.API_ENDPOINTS) {
            return window.API_ENDPOINTS;
        }
        // Fallback to hardcoded values if config not loaded
        return {
            kibana: { url: 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243' },
            corsProxy: { url: 'http://localhost:8000', path: '/api/fetch-kibana-data' }
        };
    };

    const getKibanaUrl = () => getApiConfig().kibana.url;
    const getCorsProxyUrl = () => {
        const config = getApiConfig();
        return config.corsProxy.url + config.corsProxy.path;
    };

    /**
     * Check if CORS proxy is available
     */
    async function checkCorsProxy() {
        const startTime = Date.now();
        try {
            const response = await fetch('http://localhost:8000/health', {
                method: 'GET',
                signal: AbortSignal.timeout(1000)
            });

            // Log performance for proxy check
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('CORS_PROXY_CHECK', {
                    duration: Date.now() - startTime,
                    status: response.ok ? 'available' : 'unavailable'
                });
            }

            return response.ok;
        } catch (error) {
            // Log failed proxy check
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('CORS_PROXY_CHECK_ERROR', {
                    duration: Date.now() - startTime,
                    error: error.message
                });
            }
            return false;
        }
    }

    /**
     * Get authentication details
     */
    async function getAuthenticationDetails() {
        const authStartTime = Date.now();
        const isLocalhost = window.location.hostname === 'localhost';

        // Check if CORS proxy is available (localhost only)
        if (isLocalhost) {
            const proxyAvailable = await checkCorsProxy();
            if (proxyAvailable) {
                const cookie = await getElasticCookie(true);
                if (cookie) {
                    // Log successful proxy auth
                    if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                        DataLayer.logAction('AUTH_METHOD_RESOLVED', {
                            method: 'proxy',
                            duration: Date.now() - authStartTime,
                            hasValidCookie: true
                        });
                    }
                    return { valid: true, method: 'proxy', cookie: cookie };
                }
            }
        }

        // Try direct method (works on GitHub Pages)
        const cookie = await getElasticCookie(false);
        if (cookie) {
            // Log successful direct auth
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('AUTH_METHOD_RESOLVED', {
                    method: 'direct',
                    duration: Date.now() - authStartTime,
                    hasValidCookie: true
                });
            }
            return { valid: true, method: 'direct', cookie: cookie };
        }

        // No valid authentication - log failure
        if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
            DataLayer.logAction('AUTH_METHOD_FAILED', {
                duration: Date.now() - authStartTime,
                isLocalhost,
                reason: 'No valid cookie found'
            });
        }

        return { valid: false, method: null, cookie: null };
    }

    /**
     * Get Elastic cookie
     */
    async function getElasticCookie(useProxy) {
        // Try localStorage first
        const saved = localStorage.getItem('elasticCookie');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.expires && new Date(parsed.expires) > new Date()) {
                    return parsed.cookie;
                }
            } catch (e) {
                // Invalid JSON, continue to prompt
            }
        }

        // If no valid saved cookie, we can't get one automatically
        return null;
    }

    /**
     * Prompt user for cookie
     */
    async function promptForCookie(purpose = 'API access') {
        const cookie = prompt(`Enter your Elastic authentication cookie for ${purpose}:\n\n` +
            `1. Open Kibana in another tab\n` +
            `2. Open Developer Tools (F12)\n` +
            `3. Go to Network tab\n` +
            `4. Refresh the page\n` +
            `5. Find any request to Kibana\n` +
            `6. Copy the 'Cookie' header value\n` +
            `7. Paste it below\n\n` +
            `Look for: sid=xxxxx`);

        if (cookie && cookie.trim()) {
            // Save cookie with 24-hour expiration
            const cookieData = {
                cookie: cookie.trim(),
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                saved: new Date().toISOString()
            };
            localStorage.setItem('elasticCookie', JSON.stringify(cookieData));
            return cookie.trim();
        }

        return null;
    }

    /**
     * Execute Elasticsearch query (NEW - for data layer integration)
     */
    async function executeQuery(query) {
        const queryStartTime = Date.now();
        const queryId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        try {
            // Log query start
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('API_QUERY_START', {
                    queryId,
                    querySize: JSON.stringify(query).length,
                    timestamp: new Date().toISOString()
                });
            }

            const auth = await getAuthenticationDetails();

            if (!auth.valid) {
                const error = 'No valid authentication. Please set your cookie.';

                // Log authentication failure
                if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                    DataLayer.logAction('API_AUTH_FAILURE', {
                        queryId,
                        duration: Date.now() - queryStartTime,
                        error
                    });
                }

                return {
                    success: false,
                    error
                };
            }

            let response;
            const fetchStartTime = Date.now();

            if (auth.method === 'proxy') {
                // Use CORS proxy (FastAPI endpoint)
                response = await fetch(getCorsProxyUrl(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Elastic-Cookie': auth.cookie
                    },
                    body: JSON.stringify({
                        query: query,
                        force_refresh: false
                    })
                });
            } else {
                // Direct access
                response = await fetch(`${getKibanaUrl()}/elasticsearch/usi*/_search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': auth.cookie
                    },
                    body: JSON.stringify(query)
                });
            }

            const fetchDuration = Date.now() - fetchStartTime;

            if (!response.ok) {
                throw new Error(`Query failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Check for Elasticsearch errors
            if (data.error) {
                throw new Error(`Elasticsearch error: ${data.error.reason || data.error.type}`);
            }

            const totalDuration = Date.now() - queryStartTime;

            // Log successful query with detailed metrics
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('API_QUERY_SUCCESS', {
                    queryId,
                    totalDuration,
                    fetchDuration,
                    method: auth.method,
                    responseSize: JSON.stringify(data).length,
                    hits: data.hits?.total?.value || 0,
                    aggregations: data.aggregations ? Object.keys(data.aggregations) : []
                });

                // Log performance warning if slow
                if (totalDuration > 3000) {
                    DataLayer.logAction('API_PERFORMANCE_WARNING', {
                        queryId,
                        duration: totalDuration,
                        threshold: 3000,
                        message: 'API call exceeded 3 seconds'
                    });
                }
            }

            return { success: true, data, method: auth.method, queryId, duration: totalDuration };

        } catch (error) {
            const totalDuration = Date.now() - queryStartTime;

            console.error('Query execution failed:', error);

            // Log query failure with metrics
            if (typeof DataLayer !== 'undefined' && DataLayer.logAction) {
                DataLayer.logAction('API_QUERY_ERROR', {
                    queryId,
                    duration: totalDuration,
                    error: error.message,
                    errorType: error.name
                });
            }

            return { success: false, error: error.message, queryId, duration: totalDuration };
        }
    }

    /**
     * Test API connection
     */
    async function testConnection() {
        try {
            const auth = await getAuthenticationDetails();

            if (!auth.valid) {
                return { success: false, error: 'No authentication available' };
            }

            // Simple test query
            const testQuery = {
                size: 1,
                query: { match_all: {} }
            };

            const result = await executeQuery(testQuery);
            return result;

        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Check health endpoint
     */
    async function checkHealth() {
        try {
            const response = await fetch('http://localhost:8000/health');
            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                return { success: false, error: 'Health check failed' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Test authentication by doing a minimal query
     */
    async function testAuthentication() {
        try {
            // Check if we're in production mode and have unified API client
            const isProduction = window.location.hostname !== 'localhost';
            
            if (isProduction && window.UnifiedApiClient) {
                console.log('🔍 Using unified API client for production authentication test');
                
                // Use unified API client health check in production
                const healthCheck = await window.UnifiedApiClient.checkHealth();
                if (healthCheck.healthy && healthCheck.authenticated) {
                    return { 
                        success: true, 
                        method: 'production-proxy', 
                        message: 'Authentication validated successfully via proxy' 
                    };
                } else {
                    return { 
                        success: false, 
                        error: healthCheck.message || 'Authentication failed via proxy' 
                    };
                }
            }

            // Fallback to old method for localhost or when unified client not available
            const auth = await getAuthenticationDetails();

            if (!auth.valid) {
                return { success: false, error: 'No authentication cookie found' };
            }

            // Minimal test query - just check if we can access the index
            const testQuery = {
                size: 0,
                query: { 
                    bool: { 
                        filter: [{
                            range: {
                                "@timestamp": {
                                    "gte": "now-1h"
                                }
                            }
                        }]
                    }
                }
            };

            let response;

            if (auth.method === 'proxy') {
                // Test through CORS proxy (FastAPI endpoint - localhost only)
                response = await fetch(getCorsProxyUrl(), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Elastic-Cookie': auth.cookie
                    },
                    body: JSON.stringify({
                        query: testQuery,
                        force_refresh: false
                    }),
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                });
            } else {
                // Test direct access
                response = await fetch(`${getKibanaUrl()}/elasticsearch/usi*/_search`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': auth.cookie
                    },
                    body: JSON.stringify(testQuery),
                    signal: AbortSignal.timeout(5000) // 5 second timeout
                });
            }

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    return { success: false, error: 'Authentication failed - cookie is invalid or expired' };
                }
                return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
            }

            const data = await response.json();

            // Check for Elasticsearch errors
            if (data.error) {
                if (data.error.type === 'security_exception') {
                    return { success: false, error: 'Authentication failed - cookie is invalid or expired' };
                }
                return { success: false, error: `Elasticsearch error: ${data.error.reason || data.error.type}` };
            }

            // Success - we got a valid response
            return { 
                success: true, 
                method: auth.method, 
                message: 'Authentication validated successfully' 
            };

        } catch (error) {
            if (error.name === 'TimeoutError') {
                return { success: false, error: 'Authentication test timed out - check network connection' };
            }
            
            // Check for CORS errors in production
            if (error.message && error.message.includes('CORS')) {
                return { success: false, error: 'CORS Error: Failed to fetch. Please set up CORS extension (see instructions).' };
            }
            
            return { success: false, error: `Authentication test failed: ${error.message}` };
        }
    }

    /**
     * Fetch data (EXISTING - keep for compatibility)
     */
    async function fetchData(config) {
        const query = buildQuery(config);
        return await executeQuery(query);
    }

    /**
     * Build Elasticsearch query (EXISTING - keep for compatibility)
     * NOTE: This is legacy code. New code should use api-interface.js which supports multiple RAD patterns
     */
    function buildQuery(config) {
        const currentTimeFilter = TimeRangeUtils.parseTimeRangeToFilter(config.currentTimeRange);

        return {
            "aggs": {
                "events": {
                    "terms": {
                        "field": "detail.event.data.traffic.eid.keyword",
                        "order": {"_key": "asc"},
                        "size": 500
                    },
                    "aggs": {
                        "baseline": {
                            "filter": {
                                "range": {
                                    "@timestamp": {
                                        "gte": config.baselineStart,
                                        "lt": config.baselineEnd
                                    }
                                }
                            }
                        },
                        "current": {
                            "filter": {
                                "range": {
                                    "@timestamp": currentTimeFilter
                                }
                            }
                        }
                    }
                }
            },
            "size": 0,
            "query": {
                "bool": {
                    "filter": [
                        {
                            "wildcard": {
                                "detail.event.data.traffic.eid.keyword": {
                                    "value": "pandc.vnext.recommendations.feed.feed*"
                                }
                            }
                        },
                        {
                            "match_phrase": {
                                "detail.global.page.host": "dashboard.godaddy.com"
                            }
                        },
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": "2025-05-19T04:00:00.000Z",
                                    "lte": "now"
                                }
                            }
                        }
                    ]
                }
            }
        };
    }

    // Public API
    return {
        fetchData,
        buildQuery,
        testConnection,
        promptForCookie,
        getAuthenticationDetails,
        checkCorsProxy,

        // NEW - Data layer integration
        executeQuery,
        checkHealth,
        testAuthentication
    };
})();

// ESM: Export as default for convenience
export default ApiClient;
