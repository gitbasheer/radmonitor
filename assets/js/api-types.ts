/**
 * TypeScript type definitions for the Enhanced CORS Proxy API
 * These types match the Pydantic models on the backend
 */

// =======================
// Request Types
// =======================

export interface TimeRange {
  start: string; // ISO 8601 datetime
  end: string;   // ISO 8601 datetime
}

export interface TrafficQueryRequest {
  baseline_start: string;      // ISO 8601 datetime
  baseline_end: string;         // ISO 8601 datetime
  current_time_range?: string; // Default: "12h", also supports "inspection_time"

  // NEW: Alternative to current_time_range for precise time periods
  comparison_start?: string;   // ISO 8601 datetime
  comparison_end?: string;     // ISO 8601 datetime

  // NEW: How to handle time mismatches between baseline and comparison periods
  time_comparison_strategy?: 'linear_scale' | 'hourly_average' | 'daily_pattern';

  event_pattern?: string;      // Default: "pandc.vnext.recommendations.feed.feed*"
  host?: string;              // Default: "dashboard.godaddy.com"
}

export interface TimeSeriesRequest {
  time_range: TimeRange;
  interval?: string;           // Default: "1h"
  group_by?: string | null;
  filters?: Record<string, any>;
}

export interface ErrorAnalysisRequest {
  time_range: TimeRange;
  error_types?: boolean;       // Default: true
  status_codes?: boolean;      // Default: true
}

// =======================
// Response Types
// =======================

export interface TrafficEvent {
  event_id: string;
  display_name: string;
  current_count: number;
  baseline_count: number;
  baseline_period: number;
  daily_avg: number;
  score: number;
  status: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'INCREASED';
}

export interface TrafficQueryResponse {
  events: TrafficEvent[];
  metadata: {
    total_events: number;
    query_time: number;
    baseline_days: number;
    current_hours: number;
    time_range_type?: 'inspection' | 'standard';

    // NEW: Time normalization info
    baseline_duration_ms: number;
    comparison_duration_ms: number;
    normalization_factor: number; // e.g., 3.5 days / 39 minutes
    comparison_method: 'linear_scale' | 'hourly_average' | 'daily_pattern';

    [key: string]: any;
  };
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  groups?: Array<{
    key: string;
    value: number;
  }>;
}

export interface TimeSeriesResponse {
  data: TimeSeriesDataPoint[];
  metadata: {
    query_time: number;
    total_hits: number;
    [key: string]: any;
  };
}

export interface ErrorType {
  type: string;
  count: number;
}

export interface StatusCode {
  code: number;
  count: number;
}

export interface ErrorAnalysisResponse {
  error_types: ErrorType[];
  status_codes: StatusCode[];
  metadata: {
    query_time: number;
    total_errors: number;
    [key: string]: any;
  };
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  endpoints: string[];
  elasticsearch_status: string | null;
}

// =======================
// API Client Types
// =======================

export interface ApiClientConfig {
  baseUrl?: string;           // Default: "http://localhost:8889"
  elasticCookie?: string;
  timeout?: number;           // Default: 30000ms
}

export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

// =======================
// Utility Types
// =======================

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

export interface QueryOptions {
  forceRefresh?: boolean;
  cacheTimeout?: number;
  signal?: AbortSignal;
}

// =======================
// Time Range Types
// =======================

export type StandardTimeRange = 'now-6h' | 'now-12h' | 'now-24h' | 'now-3d';
export type CustomTimeRange = string; // Format: "-Xh-Yh" or "-Xd-Yd"
export type InspectionTimeRange = 'inspection_time';
export type TimeRangeValue = StandardTimeRange | CustomTimeRange | InspectionTimeRange;
