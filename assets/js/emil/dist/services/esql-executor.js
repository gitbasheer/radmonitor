/**
 * ES|QL Query Executor Service
 * Handles query execution, caching, and error handling
 */
import { ESQLQueryBuilder } from '../query-engine/query-builder.js';
export class ESQLExecutor {
    constructor(config = {}) {
        this.config = {
            esqlEndpoint: config.esqlEndpoint || '/api/v1/esql/query',
            timeout: config.timeout || 30000,
            maxRetries: config.maxRetries || 3,
            mockMode: config.mockMode || false,
            ...config
        };
        this.cache = new Map();
        this.inFlightRequests = new Map();
        // Clean up expired cache entries periodically
        setInterval(() => this.cleanupCache(), 60000);
    }
    /**
     * Execute ES|QL query from intent
     */
    async executeIntent(intent) {
        try {
            const query = ESQLQueryBuilder.buildFromIntent(intent);
            return await this.executeQuery(query, {
                cacheable: true,
                cacheSeconds: 60
            });
        }
        catch (error) {
            return this.createErrorResult(String(error));
        }
    }
    /**
     * Execute ES|QL query from template
     */
    async executeTemplate(templateId, params) {
        try {
            const query = ESQLQueryBuilder.buildFromTemplate(templateId, params);
            return await this.executeQuery(query, {
                cacheable: true,
                cacheSeconds: 300
            });
        }
        catch (error) {
            return this.createErrorResult(String(error));
        }
    }
    /**
     * Execute raw ES|QL query
     */
    async executeQuery(query, options = {}) {
        const startTime = Date.now();
        // Validate query
        const validation = ESQLQueryBuilder.validateQuery(query);
        if (!validation.valid) {
            return this.createErrorResult(validation.error || 'Invalid query');
        }
        // Check cache
        if (options.cacheable) {
            const cached = this.getCached(query);
            if (cached) {
                return cached;
            }
        }
        // Check for in-flight request
        const cacheKey = this.getCacheKey(query);
        if (this.inFlightRequests.has(cacheKey)) {
            return await this.inFlightRequests.get(cacheKey);
        }
        // Execute query
        const requestPromise = this.config.mockMode
            ? this.executeMockQuery(query)
            : this.executeRealQuery(query);
        this.inFlightRequests.set(cacheKey, requestPromise);
        try {
            const result = await requestPromise;
            // Cache result if successful
            if (!result.error && options.cacheable) {
                this.cacheResult(query, result, options.cacheSeconds || 60);
            }
            result.duration = Date.now() - startTime;
            return result;
        }
        finally {
            this.inFlightRequests.delete(cacheKey);
        }
    }
    /**
     * Execute real ES|QL query against Elasticsearch
     */
    async executeRealQuery(query) {
        let lastError = null;
        for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
                const response = await fetch(this.config.esqlEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
                    },
                    body: JSON.stringify({ query }),
                    signal: controller.signal,
                    credentials: 'include'
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error(`ES|QL query failed: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                return {
                    query,
                    executedAt: new Date(),
                    duration: 0,
                    data: data.rows || data,
                    metadata: {
                        totalHits: data.total?.value || data.rows?.length,
                        took: data.took,
                        timedOut: data.timed_out
                    }
                };
            }
            catch (error) {
                lastError = error;
                if (error instanceof Error && error.name === 'AbortError') {
                    return this.createErrorResult('Query timeout');
                }
                // Exponential backoff for retries
                if (attempt < this.config.maxRetries - 1) {
                    await this.sleep(Math.pow(2, attempt) * 1000);
                }
            }
        }
        return this.createErrorResult(lastError?.message || 'Query execution failed');
    }
    /**
     * Execute mock query for testing
     */
    async executeMockQuery(query) {
        // Simulate network delay
        await this.sleep(100 + Math.random() * 200);
        // Parse query to determine mock response
        const isHealthCheck = query.includes('health_status');
        const isBaseline = query.includes('baseline_count');
        const isTrend = query.includes('time_bucket');
        let mockData;
        if (isHealthCheck) {
            mockData = [
                {
                    eid: 'pandc.vnext.recommendations.view',
                    event_count: 15420,
                    avg_latency: 245.5,
                    p95_latency: 580,
                    error_count: 77,
                    error_rate: 0.005,
                    health_status: 'HEALTHY',
                    health_score: 100
                },
                {
                    eid: 'pandc.vnext.discovery.search',
                    event_count: 8930,
                    avg_latency: 389.2,
                    p95_latency: 1250,
                    error_count: 446,
                    error_rate: 0.05,
                    health_status: 'WARNING',
                    health_score: 50
                }
            ];
        }
        else if (isBaseline) {
            mockData = [
                {
                    eid: 'pandc.vnext.recommendations.view',
                    baseline_count: 12000,
                    current_count: 15420,
                    baseline_avg_latency: 220,
                    current_avg_latency: 245.5,
                    traffic_change_percent: 28.5,
                    latency_change_percent: 11.6,
                    status: 'NORMAL'
                }
            ];
        }
        else if (isTrend) {
            const now = Date.now();
            mockData = Array.from({ length: 24 }, (_, i) => ({
                time_bucket: new Date(now - (23 - i) * 3600000).toISOString(),
                eid: 'pandc.vnext.recommendations.view',
                event_count: Math.floor(500 + Math.random() * 1000),
                avg_latency: 200 + Math.random() * 100,
                error_count: Math.floor(Math.random() * 50),
                unique_users: Math.floor(100 + Math.random() * 200)
            }));
        }
        else {
            mockData = [{ message: 'Mock query executed successfully' }];
        }
        return {
            query,
            executedAt: new Date(),
            duration: 0,
            data: mockData,
            metadata: {
                totalHits: Array.isArray(mockData) ? mockData.length : 1,
                took: Math.floor(Math.random() * 100),
                timedOut: false
            }
        };
    }
    /**
     * Get cached result if available and not expired
     */
    getCached(query) {
        const key = this.getCacheKey(query);
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return {
                ...cached.result,
                metadata: {
                    ...cached.result.metadata,
                    fromCache: true
                }
            };
        }
        return null;
    }
    /**
     * Cache query result
     */
    cacheResult(query, result, seconds) {
        const key = this.getCacheKey(query);
        this.cache.set(key, {
            result,
            expires: Date.now() + seconds * 1000
        });
    }
    /**
     * Generate cache key for query
     */
    getCacheKey(query) {
        // Simple hash function for cache key
        let hash = 0;
        for (let i = 0; i < query.length; i++) {
            const char = query.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return `esql_${hash}`;
    }
    /**
     * Clean up expired cache entries
     */
    cleanupCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (value.expires < now) {
                this.cache.delete(key);
            }
        }
    }
    /**
     * Create error result
     */
    createErrorResult(error) {
        return {
            query: '',
            executedAt: new Date(),
            duration: 0,
            data: null,
            error
        };
    }
    /**
     * Sleep utility for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Clear all cached results
     */
    clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            requests: this.inFlightRequests.size
        };
    }
}
//# sourceMappingURL=esql-executor.js.map