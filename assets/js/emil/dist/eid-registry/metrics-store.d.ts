/**
 * EID Metrics Store
 * Automatically extracts and stores metrics from query results
 */
import { EIDRegistryService } from './eid-registry-service.js';
import { QueryResult } from '../esql/template-types.js';
/**
 * Metrics extraction and storage utility
 */
export declare class EIDMetricsStore {
    private registryService;
    constructor(registryService: EIDRegistryService);
    /**
     * Process query result and store metrics
     */
    processQueryResult(result: QueryResult, templateId: string, timeWindow: string): Promise<void>;
    /**
     * Extract metrics from query results based on template type
     */
    private extractMetrics;
    /**
     * Extract metrics from health check results
     */
    private extractHealthCheckMetrics;
    /**
     * Extract metrics from baseline comparison results
     */
    private extractBaselineMetrics;
    /**
     * Extract metrics from performance metrics results
     */
    private extractPerformanceMetrics;
    /**
     * Extract generic metrics from unknown result format
     */
    private extractGenericMetrics;
    /**
     * Map baseline comparison status to health status
     */
    private mapBaselineStatusToHealth;
    /**
     * Derive health status from performance metrics
     */
    private deriveHealthStatus;
    /**
     * Batch process multiple query results
     */
    batchProcessResults(results: Array<{
        result: QueryResult;
        templateId: string;
        timeWindow: string;
    }>): Promise<void>;
    /**
     * Create a metrics processor that automatically stores results
     */
    createAutoProcessor(templateId: string, timeWindow: string): (result: QueryResult) => Promise<QueryResult>;
}
//# sourceMappingURL=metrics-store.d.ts.map