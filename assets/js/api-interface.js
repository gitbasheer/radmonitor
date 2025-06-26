/**
 * Unified API Interface
 * Provides a consistent API regardless of backend implementation
 * Now uses the new UnifiedAPIClient for all communication
 */

import apiClient from './api-client-unified.js';
import { ConfigService } from './config-service.js';

/**
 * Unified API class that uses the new unified client
 */
export class UnifiedAPI {
    constructor() {
        this.client = apiClient;
        this.initialized = false;
        this._initPromise = null;
    }

    /**
     * Initialize the API
     */
    async initialize() {
        if (this._initPromise) return this._initPromise;
        if (this.initialized) return Promise.resolve();

        this._initPromise = this._doInitialize();
        return this._initPromise;
    }

    async _doInitialize() {
        try {
            const success = await this.client.initialize();
            this.initialized = true;
            console.log(`🚀 API Interface initialized (${this.client.isLocalDev ? 'local' : 'production'} mode)`);
            return success;
        } catch (error) {
            console.error('Failed to initialize API:', error);
            this.initialized = true; // Mark as initialized even on error
            return false;
        }
    }

    /**
     * Fetch traffic data
     */
    async fetchTrafficData(config) {
        if (!this.initialized) await this.initialize();
        return this.client.fetchTrafficData(config);
    }

    /**
     * Update configuration
     */
    async updateConfiguration(config) {
        if (!this.initialized) await this.initialize();
        return this.client.updateDashboardConfig(config);
    }

    /**
     * Get authentication details
     */
    async getAuthenticationDetails() {
        if (!this.initialized) await this.initialize();
        return this.client.getAuthenticationDetails();
    }

    /**
     * Check health status
     */
    async checkHealth() {
        if (!this.initialized) await this.initialize();
        return this.client.checkHealth();
    }

    /**
     * Execute raw Elasticsearch query
     */
    async executeQuery(query) {
        if (!this.initialized) await this.initialize();
        return this.client.executeQuery(query);
    }

    /**
     * Traffic analysis with typed request/response
     */
    async trafficAnalysis(request, options = {}) {
        if (!this.initialized) await this.initialize();
        
        try {
            // Build config from typed request
            const config = {
                baselineStart: request.baseline_start,
                baselineEnd: request.baseline_end,
                currentTimeRange: request.current_time_range || request.comparison_start && request.comparison_end 
                    ? `${request.comparison_start}/${request.comparison_end}` 
                    : 'now-12h'
            };

            // Handle flexible time comparison
            if (request.comparison_start && request.comparison_end) {
                const baselineDuration = new Date(request.baseline_end) - new Date(request.baseline_start);
                const comparisonDuration = new Date(request.comparison_end) - new Date(request.comparison_start);
                const normalizationFactor = baselineDuration / comparisonDuration;

                const result = await this.client.fetchTrafficData(config);
                
                if (result.success && result.data) {
                    // Add metadata for flexible time comparison
                    result.data.metadata = {
                        baseline_duration_ms: baselineDuration,
                        comparison_duration_ms: comparisonDuration,
                        normalization_factor: normalizationFactor,
                        comparison_method: request.time_comparison_strategy || 'linear_scale'
                    };
                }
                
                return result;
            }

            return await this.client.fetchTrafficData(config);
        } catch (error) {
            console.error('Traffic analysis failed:', error);
            return { success: false, error: { message: error.message } };
        }
    }

    /**
     * Time series analysis
     */
    async timeSeries(request, options = {}) {
        if (!this.initialized) await this.initialize();
        
        const query = this._buildTimeSeriesQuery(request);
        return await this.executeQuery(query);
    }

    /**
     * Error analysis
     */
    async errorAnalysis(request, options = {}) {
        if (!this.initialized) await this.initialize();
        
        const query = this._buildErrorAnalysisQuery(request);
        return await this.executeQuery(query);
    }

    /**
     * Health check
     */
    async healthCheck(options = {}) {
        if (!this.initialized) await this.initialize();
        return await this.checkHealth();
    }

    /**
     * Get traffic data for the current time range
     */
    async getCurrentTrafficData(timeRange = '12h', options = {}) {
        const now = new Date();
        const baselineEnd = new Date(now);
        baselineEnd.setDate(baselineEnd.getDate() - 8);
        baselineEnd.setHours(now.getHours(), now.getMinutes(), 0, 0);

        const baselineStart = new Date(baselineEnd);
        baselineStart.setDate(baselineStart.getDate() - 8);

        const request = {
            baseline_start: baselineStart.toISOString(),
            baseline_end: baselineEnd.toISOString(),
            current_time_range: timeRange
        };

        return this.trafficAnalysis(request, options);
    }

    /**
     * Get traffic data for inspection time
     */
    async getInspectionTimeData(options = {}) {
        return this.getCurrentTrafficData('inspection_time', options);
    }

    /**
     * Build time series query (helper method)
     */
    _buildTimeSeriesQuery(request) {
        return {
            size: 0,
            query: {
                range: {
                    "@timestamp": {
                        gte: request.time_range.start,
                        lte: request.time_range.end
                    }
                }
            },
            aggs: {
                time_series: {
                    date_histogram: {
                        field: "@timestamp",
                        interval: request.interval || "1h"
                    }
                }
            }
        };
    }

    /**
     * Build error analysis query (helper method)
     */
    _buildErrorAnalysisQuery(request) {
        return {
            size: 0,
            query: {
                bool: {
                    filter: [
                        {
                            range: {
                                "@timestamp": {
                                    gte: request.time_range.start,
                                    lte: request.time_range.end
                                }
                            }
                        },
                        {
                            exists: {
                                field: "error"
                            }
                        }
                    ]
                }
            },
            aggs: {
                errors: {
                    terms: {
                        field: "error.type",
                        size: 100
                    }
                }
            }
        };
    }

    /**
     * Get current mode
     */
    getMode() {
        return this.client.isLocalDev ? 'unified-local' : 'unified-production';
    }

    /**
     * Clean up resources
     */
    cleanup() {
        this.client.cleanup();
        this.initialized = false;
        this._initPromise = null;
    }

    /**
     * Prompt for authentication
     */
    async promptForCookie(purpose) {
        return this.client.promptForCookie(purpose);
    }

    /**
     * Subscribe to WebSocket events
     */
    on(event, handler) {
        this.client.on(event, handler);
    }

    /**
     * Unsubscribe from WebSocket events
     */
    off(event, handler) {
        this.client.off(event, handler);
    }

    /**
     * Get client metrics
     */
    getMetrics() {
        return this.client.getClientMetrics();
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.client.clearCache();
    }
}

// Create singleton instance
const unifiedAPI = new UnifiedAPI();

// Export the instance as default and named export
export default unifiedAPI;
export { unifiedAPI };
