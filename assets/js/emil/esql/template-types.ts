/**
 * ES|QL Template Types and Interfaces
 * Fixed version with proper type definitions (no 'any')
 */

// Parameter value types
export type ParameterValue = string | number | boolean | Date | string[] | number[];

export interface QueryParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'interval' | 'array' | 'percentage';
  required: boolean;
  default?: ParameterValue;
  description?: string;
  validation?: (value: ParameterValue) => boolean;
}

export interface QueryTemplate {
  id: string;
  name: string;
  description: string;
  category: 'health' | 'baseline' | 'analytics' | 'performance' | 'custom';
  template: string;
  parameters: QueryParameter[];
  resultType: 'timeseries' | 'aggregate' | 'table' | 'metric';
  cacheable?: boolean;
  cacheSeconds?: number;
}

export interface QueryContext {
  eids: string[];
  timeRange?: {
    start: string;
    end: string;
  };
  environment?: 'production' | 'staging' | 'development';
  user?: {
    id: string;
    team?: string;
  };
}

export interface QueryIntent {
  action: 'health-check' | 'baseline-compare' | 'trend-analysis' | 'anomaly-detection' | 'custom';
  eids: string[];
  parameters?: Record<string, ParameterValue>;
  context?: QueryContext;
}

// Result data types
export interface HealthCheckResult {
  eid: string;
  event_count: number;
  avg_latency: number;
  p95_latency: number;
  error_count: number;
  error_rate: number;
  health_status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'LOW_TRAFFIC' | 'SLOW';
  health_score: number;
}

export interface BaselineComparisonResult {
  eid: string;
  baseline_count: number;
  current_count: number;
  baseline_avg_latency: number;
  current_avg_latency: number;
  baseline_error_rate: number;
  current_error_rate: number;
  traffic_change_percent: number;
  latency_change_percent: number;
  error_rate_change: number;
  status: 'NORMAL' | 'TRAFFIC_DROP' | 'TRAFFIC_SPIKE' | 'ERROR_INCREASE' | 'PERFORMANCE_DEGRADATION';
}

export interface TrendAnalysisResult {
  time_bucket: string;
  eid: string;
  event_count: number;
  avg_latency: number;
  error_count: number;
  unique_users: number;
}

export interface PerformanceMetricsResult {
  eid: string;
  total_requests: number;
  avg_latency: number;
  min_latency: number;
  max_latency: number;
  p50_latency: number;
  p90_latency: number;
  p95_latency: number;
  p99_latency: number;
  success_count: number;
  error_count: number;
  timeout_count: number;
  success_rate: number;
  error_rate: number;
  timeout_rate: number;
  performance_score: number;
}

export type QueryResultData = 
  | HealthCheckResult[]
  | BaselineComparisonResult[]
  | TrendAnalysisResult[]
  | PerformanceMetricsResult[]
  | Record<string, unknown>[]
  | null;

export interface QueryResult {
  query: string;
  executedAt: Date;
  duration: number;
  data: QueryResultData;
  error?: string;
  metadata?: {
    totalHits?: number;
    took?: number;
    timedOut?: boolean;
    fromCache?: boolean;
  };
}

export interface TemplateVariable {
  name: string;
  value: ParameterValue;
  escaped?: boolean;
}