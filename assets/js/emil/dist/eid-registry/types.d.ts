/**
 * EID Registry Types and Interfaces
 * Defines the schema for EID classification and registry
 */
/**
 * EID classification type
 * Binary representation: [is_rad][is_experiment]
 * 00 = Neither (invalid)
 * 01 = Experiment only
 * 10 = RAD only
 * 11 = Both RAD and Experiment
 */
export declare enum EIDType {
    EXPERIMENT_ONLY = 1,// 01
    RAD_ONLY = 2,// 10
    RAD_AND_EXPERIMENT = 3
}
/**
 * EID status in the system
 */
export declare enum EIDStatus {
    TESTING = "testing",
    LIVE = "live",
    OLD = "old"
}
/**
 * Base EID record structure
 */
export interface EIDRecord {
    id: string;
    name: string;
    is_rad: boolean;
    is_experiment: boolean;
    type: EIDType;
    status: EIDStatus;
    created_at: Date;
    updated_at: Date;
    created_by?: string;
    updated_by?: string;
    description?: string;
    tags?: string[];
    owner?: string;
}
/**
 * EID metrics from query calculations
 */
export interface EIDMetrics {
    eid_id: string;
    health_score?: number;
    health_status?: string;
    avg_latency?: number;
    p95_latency?: number;
    p99_latency?: number;
    event_count?: number;
    error_rate?: number;
    success_rate?: number;
    traffic_change_percent?: number;
    latency_change_percent?: number;
    error_rate_change?: number;
    performance_score?: number;
    calculated_at: Date;
    time_window: string;
    query_template?: string;
}
/**
 * Combined EID data with latest metrics
 */
export interface EIDWithMetrics extends EIDRecord {
    latest_metrics?: EIDMetrics;
    metrics_history?: EIDMetrics[];
}
/**
 * EID registration request
 */
export interface EIDRegistrationRequest {
    id: string;
    name: string;
    is_rad: boolean;
    is_experiment: boolean;
    status?: EIDStatus;
    description?: string;
    tags?: string[];
    owner?: string;
}
/**
 * EID update request
 */
export interface EIDUpdateRequest {
    name?: string;
    is_rad?: boolean;
    is_experiment?: boolean;
    status?: EIDStatus;
    description?: string;
    tags?: string[];
    owner?: string;
}
/**
 * EID search filters
 */
export interface EIDSearchFilters {
    type?: EIDType;
    status?: EIDStatus;
    tags?: string[];
    owner?: string;
    search?: string;
    has_metrics?: boolean;
    health_status?: string[];
}
/**
 * EID registry statistics
 */
export interface EIDRegistryStats {
    total_eids: number;
    by_type: {
        experiment_only: number;
        rad_only: number;
        rad_and_experiment: number;
    };
    by_status: {
        testing: number;
        live: number;
        old: number;
    };
    with_metrics: number;
    health_distribution: {
        healthy: number;
        warning: number;
        critical: number;
        unknown: number;
    };
}
/**
 * Batch operation result
 */
export interface BatchOperationResult {
    success: number;
    failed: number;
    errors: Array<{
        eid: string;
        error: string;
    }>;
}
//# sourceMappingURL=types.d.ts.map