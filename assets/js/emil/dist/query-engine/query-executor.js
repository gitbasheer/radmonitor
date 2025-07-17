/**
 * Query Executor Module
 * Handles the execution of ES|QL queries with caching and error handling
 */
import { QueryConfig } from './query-config.js';
import { QueryErrorFactory } from './errors.js';
/**
 * Query Executor class
 * Manages query execution, caching, and error handling
 */
export class QueryExecutor {
    /**
     * Initialize the query executor
     */
    static initialize() {
        // Start cache cleanup interval
        if (!this.cacheCleanupInterval) {
            this.cacheCleanupInterval = setInterval(() => {
                this.cleanupCache();
            }, 60000); // Clean every minute
        }
    }
    /**
     * Execute an ES|QL query
     * @param query - The ES|QL query to execute
     * @param options - Execution options
     * @returns Query result with data and metadata
     * @throws {QueryExecutionError} If execution fails
     */
    static async execute(query, options = {}) {
        const { enableCache = QueryConfig.cache.enabled, cacheTTL = QueryConfig.cache.defaultTTL, timeout = 30000, retryAttempts = 2, retryDelay = 1000 } = options;
        const startTime = Date.now();
        try {
            // Check cache first
            if (enableCache) {
                const cached = this.getCachedResult(query);
                if (cached) {
                    return {
                        ...cached,
                        metadata: {
                            ...cached.metadata,
                            fromCache: true
                        }
                    };
                }
            }
            // Execute query with retry logic
            let lastError = null;
            for (let attempt = 0; attempt <= retryAttempts; attempt++) {
                try {
                    const result = await this.executeQuery(query, timeout);
                    // Cache successful result
                    if (enableCache && cacheTTL > 0) {
                        this.cacheResult(query, result, cacheTTL);
                    }
                    return result;
                }
                catch (error) {
                    lastError = error;
                    if (attempt < retryAttempts) {
                        await this.delay(retryDelay * (attempt + 1));
                    }
                }
            }
            throw lastError || new Error('Query execution failed');
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            throw QueryErrorFactory.queryExecution(`Query execution failed after ${executionTime}ms`, query, error);
        }
    }
    /**
     * Execute the actual query
     * @private
     */
    static async executeQuery(query, timeout) {
        // This would be replaced with actual Elasticsearch client call
        // For now, we'll simulate the execution
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        try {
            // Simulate API call to Elasticsearch
            const response = await fetch('/api/elasticsearch/esql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ query }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            const data = await response.json();
            return {
                query,
                executedAt: new Date(),
                duration: Date.now() - new Date().getTime(),
                data: data.results,
                metadata: {
                    totalHits: data.totalHits,
                    took: data.took,
                    timedOut: data.timedOut || false
                }
            };
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new Error(`Query timeout after ${timeout}ms`);
                }
                throw error;
            }
            throw new Error('Unknown error during query execution');
        }
    }
    /**
     * Get cached query result
     * @private
     */
    static getCachedResult(query) {
        const entry = this.cache.get(query);
        if (!entry) {
            return null;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(query);
            return null;
        }
        return entry.result;
    }
    /**
     * Cache a query result
     * @private
     */
    static cacheResult(query, result, ttlSeconds) {
        const ttl = Math.min(ttlSeconds, QueryConfig.cache.maxTTL);
        const expiresAt = Date.now() + (ttl * 1000);
        this.cache.set(query, {
            query,
            result,
            expiresAt
        });
    }
    /**
     * Clean up expired cache entries
     * @private
     */
    static cleanupCache() {
        const now = Date.now();
        const expiredKeys = [];
        this.cache.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                expiredKeys.push(key);
            }
        });
        expiredKeys.forEach(key => this.cache.delete(key));
    }
    /**
     * Clear all cached results
     */
    static clearCache() {
        this.cache.clear();
    }
    /**
     * Get cache statistics
     */
    static getCacheStats() {
        const now = Date.now();
        const entries = Array.from(this.cache.entries()).map(([query, entry]) => ({
            query,
            expiresIn: Math.max(0, entry.expiresAt - now)
        }));
        return {
            size: this.cache.size,
            entries
        };
    }
    /**
     * Delay helper for retry logic
     * @private
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Cleanup resources
     */
    static cleanup() {
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
            this.cacheCleanupInterval = null;
        }
        this.clearCache();
    }
}
QueryExecutor.cache = new Map();
QueryExecutor.cacheCleanupInterval = null;
// Initialize on module load
QueryExecutor.initialize();
//# sourceMappingURL=query-executor.js.map