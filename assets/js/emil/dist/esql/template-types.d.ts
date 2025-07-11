/**
 * ES|QL Template Types and Interfaces
 */
export interface QueryParameter {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'interval' | 'array' | 'percentage';
    required: boolean;
    default?: any;
    description?: string;
    validation?: (value: any) => boolean;
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
    parameters?: Record<string, any>;
    context?: QueryContext;
}
export interface QueryResult {
    query: string;
    executedAt: Date;
    duration: number;
    data: any;
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
    value: any;
    escaped?: boolean;
}
//# sourceMappingURL=template-types.d.ts.map