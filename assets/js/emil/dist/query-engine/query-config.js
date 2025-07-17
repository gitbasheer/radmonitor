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
        missingTemplate: (id) => `Template not found: ${id}`,
        missingParameter: (name) => `Required parameter missing: ${name}`,
        invalidType: (name, expected, actual) => `Invalid type for parameter ${name}: expected ${expected}, got ${actual}`,
        validationFailed: (name) => `Validation failed for parameter: ${name}`,
        queryTooLong: (length) => `Query exceeds maximum length of ${length} characters`,
        tooManyEids: (count) => `Too many EIDs: ${count} exceeds maximum of ${QueryConfig.limits.maxEids}`,
    },
};
// Intent to template mapping
export const IntentTemplateMap = {
    'health-check': 'healthCheck',
    'baseline-compare': 'baselineComparison',
    'trend-analysis': 'trendAnalysis',
    'anomaly-detection': 'performanceMetrics',
    'ab-test': 'abTestComparison',
    'custom': 'healthCheck', // Default fallback
};
// Health status severity levels
export var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "HEALTHY";
    HealthStatus["WARNING"] = "WARNING";
    HealthStatus["CRITICAL"] = "CRITICAL";
    HealthStatus["LOW_TRAFFIC"] = "LOW_TRAFFIC";
    HealthStatus["SLOW"] = "SLOW";
})(HealthStatus || (HealthStatus = {}));
// Baseline comparison status
export var BaselineStatus;
(function (BaselineStatus) {
    BaselineStatus["NORMAL"] = "NORMAL";
    BaselineStatus["TRAFFIC_DROP"] = "TRAFFIC_DROP";
    BaselineStatus["TRAFFIC_SPIKE"] = "TRAFFIC_SPIKE";
    BaselineStatus["ERROR_INCREASE"] = "ERROR_INCREASE";
    BaselineStatus["PERFORMANCE_DEGRADATION"] = "PERFORMANCE_DEGRADATION";
})(BaselineStatus || (BaselineStatus = {}));
//# sourceMappingURL=query-config.js.map