/**
 * Unified API Interface
 * Provides a consistent API regardless of backend implementation
 */

import { FastAPIIntegration } from './fastapi-integration.js';
import { ApiClient } from './api-client.js';
import { FastAPIClient } from './api-client-fastapi.js';

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

            // Transform config to FastAPI format if needed
            const fastapiConfig = {
                baseline_start: config.baselineStart,
                baseline_end: config.baselineEnd,
                time_range: config.currentTimeRange,
                critical_threshold: config.criticalThreshold || -80,
                warning_threshold: config.warningThreshold || -50
            };

            // Use FastAPI client
            const query = this.buildQuery(fastapiConfig);
            const result = await this.client.fetchKibanaData(query);

            // Transform response to expected format
            return {
                success: true,
                data: result.data,
                method: 'fastapi',
                cached: result.cached || false
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
        // Build Elasticsearch query from config
        // TODO: Move this to a dedicated query builder class
        const query = {
            query: {
                bool: {
                    must: [
                        { range: { '@timestamp': { gte: config.time_range } } }
                    ]
                }
            },
            aggs: {
                events: {
                    terms: { field: 'event_id.keyword', size: 10000 }
                }
            }
        };

        // Add baseline period if specified
        if (config.baseline_start && config.baseline_end) {
            query.baseline = {
                start: config.baseline_start,
                end: config.baseline_end
            };
        }

        return query;
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
