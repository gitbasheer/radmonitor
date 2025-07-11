/**
 * ES|QL Query Executor Service
 * Handles query execution, caching, and error handling
 */
import { QueryResult, QueryIntent } from '../esql/template-types.js';
export interface ExecutorConfig {
    esqlEndpoint?: string;
    apiKey?: string;
    timeout?: number;
    maxRetries?: number;
    mockMode?: boolean;
}
export declare class ESQLExecutor {
    private config;
    private cache;
    private inFlightRequests;
    constructor(config?: ExecutorConfig);
    /**
     * Execute ES|QL query from intent
     */
    executeIntent(intent: QueryIntent): Promise<QueryResult>;
    /**
     * Execute ES|QL query from template
     */
    executeTemplate(templateId: string, params: Record<string, any>): Promise<QueryResult>;
    /**
     * Execute raw ES|QL query
     */
    executeQuery(query: string, options?: {
        cacheable?: boolean;
        cacheSeconds?: number;
    }): Promise<QueryResult>;
    /**
     * Execute real ES|QL query against Elasticsearch
     */
    private executeRealQuery;
    /**
     * Execute mock query for testing
     */
    private executeMockQuery;
    /**
     * Get cached result if available and not expired
     */
    private getCached;
    /**
     * Cache query result
     */
    private cacheResult;
    /**
     * Generate cache key for query
     */
    private getCacheKey;
    /**
     * Clean up expired cache entries
     */
    private cleanupCache;
    /**
     * Create error result
     */
    private createErrorResult;
    /**
     * Sleep utility for delays
     */
    private sleep;
    /**
     * Clear all cached results
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        requests: number;
    };
}
//# sourceMappingURL=esql-executor.d.ts.map