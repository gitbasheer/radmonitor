/**
 * Simplified API Client
 * Environment-agnostic, single responsibility
 */

import { authManager } from './auth-manager.js';
import { getApiUrl } from './config-service.js';

export class SimplifiedAPIClient {
    constructor() {
        // Use relative URLs - let the deployment handle routing
        this.baseUrl = '/api/v1';
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        // Simple metrics
        this.metrics = {
            requests: 0,
            errors: 0,
            cacheHits: 0
        };
    }

    /**
     * Make an authenticated request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @param {number} [options.retry=3] - Number of retry attempts
     * @param {boolean} [options.allowAnonymous=false] - Allow anonymous requests
     * @returns {Promise<any>} Response data
     */
    async request(endpoint, options = {}) {
        // Check authentication status
        const isAuthenticated = authManager.isAuthenticated();

        // For non-anonymous requests, check if we have auth
        if (!options.allowAnonymous && !isAuthenticated) {
            // Try to prompt for cookie
            console.log('🔐 Authentication required - prompting for cookie...');
            const cookie = await authManager.promptForCookie();
            
            if (!cookie) {
                console.log('⚠️ Request blocked - no authentication');
                throw new Error('Authentication required');
            }
        }

        const url = `${this.baseUrl}${endpoint}`;
        const maxRetries = options.retry ?? 3;
        let lastError;

        // Retry loop with exponential backoff
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Get auth headers from AuthManager
                const authHeaders = authManager.getAuthHeaders();
                
                const requestOptions = {
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...authHeaders,
                        ...options.headers
                    },
                    ...options
                };

                if (authHeaders.Authorization) {
                    console.log('🍪 Using authentication cookie for request');
                }

                // Add request body if present
                if (options.body && typeof options.body === 'object') {
                    requestOptions.body = JSON.stringify(options.body);
                }

                // Add timeout
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

                try {
                    this.metrics.requests++;
                    const response = await fetch(url, {
                        ...requestOptions,
                        signal: controller.signal
                    });

                    clearTimeout(timeout);

                    if (!response.ok) {
                        const error = await response.json().catch(() => ({}));
                        const errorObj = new Error(error.message || `HTTP ${response.status}`);
                        errorObj.status = response.status;
                        throw errorObj;
                    }

                    // Success - return data
                    return await response.json();

                } catch (error) {
                    clearTimeout(timeout);
                    lastError = error;

                    // Don't retry on authentication errors or if it's the last attempt
                    if (error.status === 401 || attempt === maxRetries - 1) {
                        if (error.status === 401) {
                            // Don't clear auth immediately - let the user try setting a new cookie
                            console.log('⚠️ Authentication failed - cookie may be invalid');
                        }
                        throw error;
                    }

                    // Exponential backoff: 1s, 2s, 4s...
                    const backoffMs = Math.pow(2, attempt) * 1000;
                    console.log(`🔄 Retry ${attempt + 1}/${maxRetries} after ${backoffMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
            } catch (error) {
                this.metrics.errors++;
                lastError = error;

                // Log the attempt
                console.warn(`(✗) Request failed (attempt ${attempt + 1}/${maxRetries}):`, error.message);

                // Continue to next retry unless it's a non-retryable error
                if (error.status === 401 || error.status === 403 || attempt === maxRetries - 1) {
                    throw error;
                }
            }
        }

        // All retries exhausted
        throw lastError || new Error('Request failed after all retries');
    }

    /**
     * GET request with caching
     */
    async get(endpoint, options = {}) {
        const cacheKey = `GET:${endpoint}`;

        // Check cache
        if (!options.skipCache) {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                this.metrics.cacheHits++;
                return cached.data;
            }
        }

        const data = await this.request(endpoint, {
            method: 'GET',
            ...options
        });

        // Cache successful responses
        this.cache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    /**
     * POST request
     */
    async post(endpoint, body, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body,
            ...options
        });
    }

    /**
     * Fetch dashboard data - simplified
     */
    async fetchDashboardData(params = {}) {
        try {
            // Build Elasticsearch query matching backend expectations
            const timeRange = params.timeRange || 'now-12h';
            const filters = params.filters || {};

            // Construct Elasticsearch query
            const esQuery = {
                size: 0,
                query: {
                    bool: {
                        must: [
                            {
                                range: {
                                    "@timestamp": {
                                        gte: timeRange,
                                        lte: "now"
                                    }
                                }
                            },
                            {
                                query_string: {
                                    query: "pandc.vnext.recommendations.*"
                                }
                            }
                        ]
                    }
                },
                aggs: {
                    events: {
                        terms: {
                            field: "event_id.keyword",
                            size: 100
                        },
                        aggs: {
                            current: {
                                filter: {
                                    range: {
                                        "@timestamp": {
                                            gte: timeRange,
                                            lte: "now"
                                        }
                                    }
                                }
                            },
                            baseline: {
                                filter: {
                                    range: {
                                        "@timestamp": {
                                            gte: "2025-06-01",
                                            lte: "2025-06-09"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            };

            // Send request in expected format
            const response = await this.post('/dashboard/query', {
                query: esQuery,
                force_refresh: false
            });

            return {
                success: true,
                data: response.data,
                stats: response.stats,
                metadata: response.metadata
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                fallback: this.getCachedDashboardData()
            };
        }
    }

    /**
     * Get cached dashboard data for offline support
     */
    getCachedDashboardData() {
        const cached = this.cache.get('GET:/dashboard/data');
        return cached?.data || null;
    }

    /**
     * Update configuration
     */
    async updateConfig(config) {
        return this.post('/config/update', config);
    }

    /**
     * Get current configuration
     */
    async getConfig() {
        return this.get('/config');
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get client metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            cacheSize: this.cache.size,
            cacheHitRate: this.metrics.cacheHits / this.metrics.requests * 100
        };
    }

    /**
     * Test connection to the API
     * @returns {Promise<boolean>} True if connected
     */
    async testConnection() {
        console.log('🔌 Testing API connection...');

        try {
            const isAuthenticated = authManager.isAuthenticated();
            if (!isAuthenticated) {
                console.log('⚠️ Not authenticated');
                return false;
            }

            // Simple health check instead of full query
            // Note: health endpoint is at root, not under /api/v1
            const baseUrl = window.location.hostname === 'localhost'
                ? getApiUrl()
                : '';
            const url = `${baseUrl}/health`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error(`(✗) API connection failed: HTTP ${response.status}`);
                return false;
            }

            const data = await response.json();
            const success = data.status === 'healthy' || data.status === 'degraded';

            if (success) {
                if (data.elasticsearch_status === 'disconnected') {
                    console.warn('⚠️ Elasticsearch is disconnected');
                }
            } else {
                console.log('(✗) API connection failed:', data.message);
            }

            return { success, message: data.message };
        } catch (error) {
            console.error('(✗) Connection test error:', error);
            return false;
        }
    }
}

// Export singleton instance
export const apiClient = new SimplifiedAPIClient();
export default apiClient;
