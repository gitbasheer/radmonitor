/**
 * Query Engine Configuration
 * Centralized configuration for query building and validation
 */
export declare const QueryConfig: {
    defaults: {
        index: string;
        timeWindow: string;
        bucketSize: string;
        cacheSeconds: number;
    };
    thresholds: {
        health: {
            criticalError: number;
            warningError: number;
            lowTraffic: number;
            maxLatency: number;
        };
        baseline: {
            trafficDrop: number;
            trafficSpike: number;
            errorIncrease: number;
            latencyIncrease: number;
        };
        performance: {
            timeout: number;
            criticalLatency: number;
            warningLatency: number;
        };
    };
    validation: {
        interval: RegExp;
        percentage: {
            min: number;
            max: number;
        };
        latency: {
            min: number;
            max: number;
        };
    };
    limits: {
        maxEids: number;
        maxTimeRange: string;
        maxQueryLength: number;
    };
    cache: {
        enabled: boolean;
        defaultTTL: number;
        maxTTL: number;
    };
    errors: {
        missingTemplate: (id: string) => string;
        missingParameter: (name: string) => string;
        invalidType: (name: string, expected: string, actual: string) => string;
        validationFailed: (name: string) => string;
        queryTooLong: (length: number) => string;
        tooManyEids: (count: number) => string;
    };
};
export declare const IntentTemplateMap: Record<string, string>;
export declare enum HealthStatus {
    HEALTHY = "HEALTHY",
    WARNING = "WARNING",
    CRITICAL = "CRITICAL",
    LOW_TRAFFIC = "LOW_TRAFFIC",
    SLOW = "SLOW"
}
export declare enum BaselineStatus {
    NORMAL = "NORMAL",
    TRAFFIC_DROP = "TRAFFIC_DROP",
    TRAFFIC_SPIKE = "TRAFFIC_SPIKE",
    ERROR_INCREASE = "ERROR_INCREASE",
    PERFORMANCE_DEGRADATION = "PERFORMANCE_DEGRADATION"
}
//# sourceMappingURL=query-config.d.ts.map