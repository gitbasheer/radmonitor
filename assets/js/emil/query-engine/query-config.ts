/**
 * Query Engine Configuration
 * Centralized configuration for query building and validation
 */

export const QueryConfig = {
  // Default values for common parameters
  defaults: {
    index: 'traffic-*',
    timeWindow: '1h',
    bucketSize: '1h',
    cacheSeconds: 60,
  },

  // Threshold values
  thresholds: {
    health: {
      criticalError: 0.1,
      warningError: 0.05,
      lowTraffic: 100,
      maxLatency: 1000,
    },
    baseline: {
      trafficDrop: 50,
      trafficSpike: 200,
      errorIncrease: 0.02,
      latencyIncrease: 50,
    },
    performance: {
      timeout: 5000,
      criticalLatency: 3000,
      warningLatency: 1500,
    },
  },

  // Validation patterns
  validation: {
    interval: /^\d+[smhd]$/,
    percentage: { min: 0, max: 100 },
    latency: { min: 0, max: 30000 }, // Max 30 seconds
  },

  // Query limits
  limits: {
    maxEids: 100,
    maxTimeRange: '30d',
    maxQueryLength: 10000,
  },

  // Cache configuration
  cache: {
    enabled: true,
    defaultTTL: 60,
    maxTTL: 3600,
  },

  // Error messages
  errors: {
    missingTemplate: (id: string) => `Template not found: ${id}`,
    missingParameter: (name: string) => `Required parameter missing: ${name}`,
    invalidType: (name: string, expected: string, actual: string) =>
      `Invalid type for parameter ${name}: expected ${expected}, got ${actual}`,
    validationFailed: (name: string) => `Validation failed for parameter: ${name}`,
    queryTooLong: (length: number) => `Query exceeds maximum length of ${length} characters`,
    tooManyEids: (count: number) => `Too many EIDs: ${count} exceeds maximum of ${QueryConfig.limits.maxEids}`,
  },
};

// Intent to template mapping
export const IntentTemplateMap: Record<string, string> = {
  'health-check': 'healthCheck',
  'baseline-compare': 'baselineComparison',
  'trend-analysis': 'trendAnalysis',
  'anomaly-detection': 'performanceMetrics',
  'ab-test': 'abTestComparison',
  'custom': 'healthCheck', // Default fallback
};

// Health status severity levels
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  LOW_TRAFFIC = 'LOW_TRAFFIC',
  SLOW = 'SLOW',
}

// Baseline comparison status
export enum BaselineStatus {
  NORMAL = 'NORMAL',
  TRAFFIC_DROP = 'TRAFFIC_DROP',
  TRAFFIC_SPIKE = 'TRAFFIC_SPIKE',
  ERROR_INCREASE = 'ERROR_INCREASE',
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
}