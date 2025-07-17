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
export enum EIDType {
  EXPERIMENT_ONLY = 0b01,  // 01
  RAD_ONLY = 0b10,         // 10
  RAD_AND_EXPERIMENT = 0b11 // 11
}

/**
 * EID status in the system
 */
export enum EIDStatus {
  TESTING = 'testing',
  LIVE = 'live',
  OLD = 'old'
}

/**
 * Base EID record structure
 */
export interface EIDRecord {
  // Unique identifier from Elasticsearch
  id: string; // detail.event.data.traffic.eid.keyword
  
  // Human-readable name registered in the system
  name: string;
  
  // Classification flags
  is_rad: boolean;
  is_experiment: boolean;
  
  // Computed type from flags
  type: EIDType;
  
  // Current status
  status: EIDStatus;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
  
  // Optional description
  description?: string;
  
  // Tags for categorization
  tags?: string[];
  
  // Owner team/user
  owner?: string;
}

/**
 * EID metrics from query calculations
 */
export interface EIDMetrics {
  eid_id: string;
  
  // Health metrics
  health_score?: number;
  health_status?: string;
  
  // Performance metrics
  avg_latency?: number;
  p95_latency?: number;
  p99_latency?: number;
  
  // Traffic metrics
  event_count?: number;
  error_rate?: number;
  success_rate?: number;
  
  // Baseline comparison
  traffic_change_percent?: number;
  latency_change_percent?: number;
  error_rate_change?: number;
  
  // Calculated status
  performance_score?: number;
  
  // Timestamp of metrics
  calculated_at: Date;
  
  // Time window used for calculation
  time_window: string;
  
  // Query template used
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
  id: string; // The Elasticsearch field value
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
  search?: string; // Search in name/description
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