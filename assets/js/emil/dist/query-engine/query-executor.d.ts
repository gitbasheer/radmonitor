/**
 * Query Executor Module
 * Handles the execution of ES|QL queries with caching and error handling
 */
import { QueryResult } from '../esql/template-types.js';
/**
 * Query execution options
 */
export interface QueryExecutionOptions {
    enableCache?: boolean;
    cacheTTL?: number;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}
/**
 * Query Executor class
 * Manages query execution, caching, and error handling
 */
export declare class QueryExecutor {
    private static cache;
    private static cacheCleanupInterval;
    /**
     * Initialize the query executor
     */
    static initialize(): void;
    /**
     * Execute an ES|QL query
     * @param query - The ES|QL query to execute
     * @param options - Execution options
     * @returns Query result with data and metadata
     * @throws {QueryExecutionError} If execution fails
     */
    static execute(query: string, options?: QueryExecutionOptions): Promise<QueryResult>;
    /**
     * Execute the actual query
     * @private
     */
    private static executeQuery;
    /**
     * Get cached query result
     * @private
     */
    private static getCachedResult;
    /**
     * Cache a query result
     * @private
     */
    private static cacheResult;
    /**
     * Clean up expired cache entries
     * @private
     */
    private static cleanupCache;
    /**
     * Clear all cached results
     */
    static clearCache(): void;
    /**
     * Get cache statistics
     */
    static getCacheStats(): {
        size: number;
        entries: Array<{
            query: string;
            expiresIn: number;
        }>;
    };
    /**
     * Delay helper for retry logic
     * @private
     */
    private static delay;
    /**
     * Cleanup resources
     */
    static cleanup(): void;
}
//# sourceMappingURL=query-executor.d.ts.map