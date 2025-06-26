/**
 * Unified API Interface
 * Provides a consistent API regardless of backend implementation
 */

import { FastAPIIntegration } from './fastapi-integration.js';
import { ApiClient } from './api-client.js';
import { FastAPIClient } from './api-client-fastapi.js';
import { ConfigService } from './config-service.js';

/**
 * Adapter for Legacy API implementation
 */
class LegacyAdapter {
    async fetchData(config) {
        try {
            // Use existing ApiClient
            return await ApiClient.fetchData(config);
        } catch (error) {
            console.error('Legacy API fetch failed:', error);
            throw new Error(`Failed to fetch data: ${error.message}`);
        }
    }

    async updateConfiguration(config) {
        try {
            // Validate config before storing
            if (!config || typeof config !== 'object') {
                throw new Error('Invalid configuration object');
            }
            // Legacy doesn't have a config endpoint, store locally
            localStorage.setItem('dashboard_config', JSON.stringify(config));
            return { success: true, config };
        } catch (error) {
            console.error('Legacy config update failed:', error);
            throw error;
        }
    }

    async getAuthenticationDetails() {
        try {
            return await ApiClient.getAuthenticationDetails();
        } catch (error) {
            console.error('Legacy auth check failed:', error);
            return { valid: false, method: 'legacy', error: error.message };
        }
    }

    async checkHealth() {
        try {
            // Check CORS proxy health
            return await ApiClient.checkHealth();
        } catch (error) {
            return { healthy: false, error: error.message };
        }
    }

    async executeQuery(query) {
        // Use legacy ApiClient for raw queries
        return await ApiClient.executeQuery(query);
    }
}

/**
 * Adapter for FastAPI implementation
 */
class FastAPIAdapter {
    constructor(client) {
        this.client = client;
    }

    async fetchData(config) {
        try {
            // Validate config
            if (!config || !config.baselineStart || !config.baselineEnd) {
                throw new Error('Missing required configuration parameters');
            }

            // Build the query directly
            const query = this.buildQuery({
                baseline_start: config.baselineStart,
                baseline_end: config.baselineEnd,
                time_range: config.currentTimeRange || 'now-12h'
            });

            // Get elastic cookie
            const elasticCookie = this.client.getElasticCookie();
            if (!elasticCookie) {
                throw new Error('No elastic cookie found. Please authenticate first.');
            }

            // Fetch data using the Kibana endpoint
            const response = await this.client.fetchKibanaData(query, false, elasticCookie);

            // Transform response to expected format
            return {
                success: true,
                data: response,
                method: 'fastapi'
            };
        } catch (error) {
            console.error('FastAPI fetch failed:', error);
            throw new Error(`Failed to fetch data: ${error.message}`);
        }
    }

    async updateConfiguration(config) {
        return await this.client.updateConfig(config);
    }

    async getAuthenticationDetails() {
        // FastAPI handles auth differently
        const cookie = this.client.getElasticCookie();
        return {
            valid: !!cookie,
            method: 'fastapi',
            cookie: cookie
        };
    }

    async checkHealth() {
        return await this.client.checkHealth();
    }

    buildQuery(config) {
        // Use the same query structure as legacy ApiClient for compatibility
        const currentTimeFilter = config.time_range.startsWith('now') 
            ? { gte: config.time_range }
            : { gte: config.time_range, lte: 'now' };
            
        // Get query configuration
        const queryConfig = ConfigService.getConfig();
        const eventField = "detail.event.data.traffic.eid.keyword"; // Fixed value
        const aggSize = queryConfig.queryAggSize || 500;

        return {
            "aggs": {
                "events": {
                    "terms": {
                        "field": eventField,
                        "order": {"_key": "asc"},
                        "size": aggSize
                    },
                    "aggs": {
                        "baseline": {
                            "filter": {
                                "range": {
                                    "@timestamp": {
                                        "gte": config.baseline_start,
                                        "lt": config.baseline_end
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
                                [eventField]: {
                                    "value": queryConfig.queryEventPattern || "pandc.vnext.recommendations.feed.feed*"
                                }
                            }
                        },
                        {
                            "match_phrase": {
                                "detail.global.page.host": "dashboard.godaddy.com" // Fixed value
                            }
                        },
                        {
                            "range": {
                                "@timestamp": {
                                    "gte": ConfigService.get('minEventDate') || window.API_ENDPOINTS?.searchDefaults?.minEventDate || "2025-05-19T04:00:00.000Z",
                                    "lte": "now"
                                }
                            }
                        }
                    ]
                }
            }
        };
    }

    async executeQuery(query) {
        // For raw queries, use the Kibana endpoint
        const elasticCookie = this.client.getElasticCookie();
        if (!elasticCookie) {
            throw new Error('No elastic cookie available');
        }

        const result = await this.client.fetchKibanaData(query, false, elasticCookie);
        return { success: true, data: result, method: 'fastapi' };
    }
}

/**
 * Unified API class that selects the appropriate implementation
 */
export class UnifiedAPI {
    constructor() {
        this.implementation = null;
        this.initialized = false;
        this._initPromise = null; // Prevent multiple initialization
    }

    /**
     * Initialize the API with the appropriate implementation
     */
    async initialize() {
        // Return existing promise if initialization is in progress
        if (this._initPromise) return this._initPromise;
        if (this.initialized) return Promise.resolve();

        this._initPromise = this._doInitialize();
        return this._initPromise;
    }

    async _doInitialize() {
        try {
            // Check if FastAPI is available and enabled
            const fastAPIEnabled = await FastAPIIntegration.initialize();

            if (fastAPIEnabled) {
                // Use FastAPI implementation
                this.implementation = new FastAPIAdapter(FastAPIIntegration.client);
                console.log('🚀 Using FastAPI implementation');
            } else {
                // Use legacy implementation
                this.implementation = new LegacyAdapter();
                console.log('📦 Using legacy implementation');
            }

            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize UnifiedAPI:', error);
            // Fall back to legacy on initialization error
            this.implementation = new LegacyAdapter();
            this.initialized = true;
        }
    }

    /**
     * Fetch traffic data
     */
    async fetchTrafficData(config) {
        if (!this.initialized) await this.initialize();
        return this.implementation.fetchData(config);
    }

    /**
     * Update configuration
     */
    async updateConfiguration(config) {
        if (!this.initialized) await this.initialize();
        return this.implementation.updateConfiguration(config);
    }

    /**
     * Get authentication details
     */
    async getAuthenticationDetails() {
        if (!this.initialized) await this.initialize();
        return this.implementation.getAuthenticationDetails();
    }

    /**
     * Check health status
     */
    async checkHealth() {
        if (!this.initialized) await this.initialize();
        return this.implementation.checkHealth();
    }

    /**
     * Execute raw Elasticsearch query
     */
    async executeQuery(query) {
        if (!this.initialized) await this.initialize();
        return this.implementation.executeQuery(query);
    }

    /**
     * Get current mode
     */
    getMode() {
        return FastAPIIntegration.enabled ? 'fastapi' : 'legacy';
    }

    /**
     * Force a specific mode (for testing)
     */
    async forceMode(mode) {
        if (mode === 'fastapi') {
            FastAPIIntegration.enable(true); // Use soft reload
            await this.reinitialize();
        } else {
            FastAPIIntegration.disable(true); // Use soft reload
            await this.reinitialize();
        }
    }

    /**
     * Reinitialize after mode change
     */
    async reinitialize() {
        this.initialized = false;
        this._initPromise = null;
        this.implementation = null;
        await this.initialize();
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (FastAPIIntegration.enabled) {
            FastAPIIntegration.cleanup();
        }
        this.initialized = false;
        this._initPromise = null;
        this.implementation = null;
    }
}

// Create singleton instance
export const unifiedAPI = new UnifiedAPI();

// Export for debugging
window.UnifiedAPI = unifiedAPI;
