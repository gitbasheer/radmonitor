/**
 * Integration Example
 * Demonstrates how to use the query engine with EID registry
 */
/**
 * Example: Complete workflow from EID registration to query execution and metrics storage
 */
export declare function completeWorkflowExample(): Promise<void>;
/**
 * Example: Query all EIDs of a specific type and store their metrics
 */
export declare function batchMetricsExample(): Promise<void>;
/**
 * Example: Monitor EID health continuously
 */
export declare function continuousMonitoringExample(): Promise<void>;
/**
 * Example: Create a custom dashboard data source
 */
export declare function dashboardDataExample(): Promise<{
    summary: {
        total: number;
        healthy: number;
        warning: number;
        critical: number;
        unknown: number;
    };
    byType: {
        experiment: any[];
        rad: any[];
        both: any[];
    };
    topPerformers: any[];
    needsAttention: any[];
}>;
//# sourceMappingURL=integration-example.d.ts.map