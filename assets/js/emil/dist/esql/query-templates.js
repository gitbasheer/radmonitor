/**
 * ES|QL Query Templates for EID Monitoring
 * Based on patterns from CRITICAL.md
 */
export const queryTemplates = {
    healthCheck: {
        id: 'health-check',
        name: 'EID Health Check',
        description: 'Check current health status of selected EIDs',
        category: 'health',
        template: `
FROM logs-{{index}}
| WHERE eid IN [{{eids}}]
  AND @timestamp > NOW() - INTERVAL {{time_window}}
| STATS
    event_count = COUNT(*),
    avg_latency = AVG(latency),
    p95_latency = PERCENTILE(latency, 95),
    error_count = COUNT(*) WHERE status >= 400,
    error_rate = COUNT(*) WHERE status >= 400 / COUNT(*)
| EVAL 
    health_status = CASE(
      error_rate > {{critical_error_threshold}}, "CRITICAL",
      error_rate > {{warning_error_threshold}}, "WARNING",
      event_count < {{low_traffic_threshold}}, "LOW_TRAFFIC",
      avg_latency > {{latency_threshold}}, "SLOW",
      "HEALTHY"
    ),
    health_score = CASE(
      error_rate > {{critical_error_threshold}}, 0,
      error_rate > {{warning_error_threshold}}, 50,
      event_count < {{low_traffic_threshold}}, 60,
      avg_latency > {{latency_threshold}}, 70,
      100
    )
| SORT health_score ASC`,
        parameters: [
            {
                name: 'index',
                type: 'string',
                required: false,
                default: 'traffic-*',
                description: 'Elasticsearch index pattern'
            },
            {
                name: 'eids',
                type: 'array',
                required: true,
                description: 'List of EIDs to check'
            },
            {
                name: 'time_window',
                type: 'interval',
                required: false,
                default: '1h',
                description: 'Time window for analysis'
            },
            {
                name: 'critical_error_threshold',
                type: 'percentage',
                required: false,
                default: 0.1,
                description: 'Error rate threshold for critical status'
            },
            {
                name: 'warning_error_threshold',
                type: 'percentage',
                required: false,
                default: 0.05,
                description: 'Error rate threshold for warning status'
            },
            {
                name: 'low_traffic_threshold',
                type: 'number',
                required: false,
                default: 100,
                description: 'Minimum events for healthy traffic'
            },
            {
                name: 'latency_threshold',
                type: 'number',
                required: false,
                default: 1000,
                description: 'Maximum latency in ms for healthy status'
            }
        ],
        resultType: 'aggregate',
        cacheable: true,
        cacheSeconds: 60
    },
    baselineComparison: {
        id: 'baseline-comparison',
        name: 'Baseline Traffic Comparison',
        description: 'Compare current traffic against historical baseline',
        category: 'baseline',
        template: `
FROM logs-{{index}}
| WHERE eid IN [{{eids}}]
| EVAL 
    is_baseline = CASE(
      @timestamp >= "{{baseline_start}}" AND @timestamp <= "{{baseline_end}}", true,
      false
    ),
    is_current = CASE(
      @timestamp > NOW() - INTERVAL {{current_window}}, true,
      false
    )
| WHERE is_baseline == true OR is_current == true
| STATS
    baseline_count = COUNT(*) WHERE is_baseline == true,
    current_count = COUNT(*) WHERE is_current == true,
    baseline_avg_latency = AVG(latency) WHERE is_baseline == true,
    current_avg_latency = AVG(latency) WHERE is_current == true,
    baseline_error_rate = COUNT(*) WHERE is_baseline == true AND status >= 400 / COUNT(*) WHERE is_baseline == true,
    current_error_rate = COUNT(*) WHERE is_current == true AND status >= 400 / COUNT(*) WHERE is_current == true
  BY eid
| EVAL
    traffic_change_percent = (current_count - baseline_count) / baseline_count * 100,
    latency_change_percent = (current_avg_latency - baseline_avg_latency) / baseline_avg_latency * 100,
    error_rate_change = current_error_rate - baseline_error_rate,
    status = CASE(
      traffic_change_percent < -{{traffic_drop_threshold}}, "TRAFFIC_DROP",
      traffic_change_percent > {{traffic_spike_threshold}}, "TRAFFIC_SPIKE",
      error_rate_change > {{error_increase_threshold}}, "ERROR_INCREASE",
      latency_change_percent > {{latency_increase_threshold}}, "PERFORMANCE_DEGRADATION",
      "NORMAL"
    )
| SORT status ASC, traffic_change_percent DESC`,
        parameters: [
            {
                name: 'index',
                type: 'string',
                required: false,
                default: 'traffic-*',
                description: 'Elasticsearch index pattern'
            },
            {
                name: 'eids',
                type: 'array',
                required: true,
                description: 'List of EIDs to compare'
            },
            {
                name: 'baseline_start',
                type: 'date',
                required: true,
                description: 'Start date for baseline period'
            },
            {
                name: 'baseline_end',
                type: 'date',
                required: true,
                description: 'End date for baseline period'
            },
            {
                name: 'current_window',
                type: 'interval',
                required: false,
                default: '1h',
                description: 'Current time window for comparison'
            },
            {
                name: 'traffic_drop_threshold',
                type: 'percentage',
                required: false,
                default: 50,
                description: 'Percentage drop to trigger alert'
            },
            {
                name: 'traffic_spike_threshold',
                type: 'percentage',
                required: false,
                default: 200,
                description: 'Percentage increase to trigger alert'
            },
            {
                name: 'error_increase_threshold',
                type: 'percentage',
                required: false,
                default: 0.02,
                description: 'Error rate increase to trigger alert'
            },
            {
                name: 'latency_increase_threshold',
                type: 'percentage',
                required: false,
                default: 50,
                description: 'Latency increase percentage to trigger alert'
            }
        ],
        resultType: 'table',
        cacheable: true,
        cacheSeconds: 300
    },
    trendAnalysis: {
        id: 'trend-analysis',
        name: 'EID Trend Analysis',
        description: 'Analyze traffic trends over time buckets',
        category: 'analytics',
        template: `
FROM logs-{{index}}
| WHERE eid IN [{{eids}}]
  AND @timestamp > NOW() - INTERVAL {{time_range}}
| EVAL 
    time_bucket = DATE_TRUNC({{bucket_size}}, @timestamp)
| STATS
    event_count = COUNT(*),
    avg_latency = AVG(latency),
    error_count = COUNT(*) WHERE status >= 400,
    unique_users = COUNT_DISTINCT(user_id)
  BY time_bucket, eid
| SORT time_bucket ASC, eid ASC`,
        parameters: [
            {
                name: 'index',
                type: 'string',
                required: false,
                default: 'traffic-*',
                description: 'Elasticsearch index pattern'
            },
            {
                name: 'eids',
                type: 'array',
                required: true,
                description: 'List of EIDs to analyze'
            },
            {
                name: 'time_range',
                type: 'interval',
                required: false,
                default: '24h',
                description: 'Time range for trend analysis'
            },
            {
                name: 'bucket_size',
                type: 'interval',
                required: false,
                default: '1h',
                description: 'Time bucket size for aggregation'
            }
        ],
        resultType: 'timeseries',
        cacheable: true,
        cacheSeconds: 600
    },
    performanceMetrics: {
        id: 'performance-metrics',
        name: 'EID Performance Metrics',
        description: 'Detailed performance metrics for selected EIDs',
        category: 'performance',
        template: `
FROM logs-{{index}}
| WHERE eid IN [{{eids}}]
  AND @timestamp > NOW() - INTERVAL {{time_window}}
| STATS
    total_requests = COUNT(*),
    avg_latency = AVG(latency),
    min_latency = MIN(latency),
    max_latency = MAX(latency),
    p50_latency = PERCENTILE(latency, 50),
    p90_latency = PERCENTILE(latency, 90),
    p95_latency = PERCENTILE(latency, 95),
    p99_latency = PERCENTILE(latency, 99),
    success_count = COUNT(*) WHERE status < 400,
    error_count = COUNT(*) WHERE status >= 400,
    timeout_count = COUNT(*) WHERE status == 504 OR latency > {{timeout_threshold}}
  BY eid
| EVAL
    success_rate = success_count / total_requests * 100,
    error_rate = error_count / total_requests * 100,
    timeout_rate = timeout_count / total_requests * 100,
    performance_score = CASE(
      p95_latency > {{critical_latency}}, 0,
      p95_latency > {{warning_latency}}, 50,
      p90_latency > {{warning_latency}}, 70,
      100
    )
| SORT performance_score ASC, total_requests DESC`,
        parameters: [
            {
                name: 'index',
                type: 'string',
                required: false,
                default: 'traffic-*',
                description: 'Elasticsearch index pattern'
            },
            {
                name: 'eids',
                type: 'array',
                required: true,
                description: 'List of EIDs to analyze'
            },
            {
                name: 'time_window',
                type: 'interval',
                required: false,
                default: '1h',
                description: 'Time window for analysis'
            },
            {
                name: 'timeout_threshold',
                type: 'number',
                required: false,
                default: 5000,
                description: 'Latency threshold for timeout in ms'
            },
            {
                name: 'critical_latency',
                type: 'number',
                required: false,
                default: 3000,
                description: 'Critical latency threshold in ms'
            },
            {
                name: 'warning_latency',
                type: 'number',
                required: false,
                default: 1500,
                description: 'Warning latency threshold in ms'
            }
        ],
        resultType: 'table',
        cacheable: true,
        cacheSeconds: 120
    },
    abTestComparison: {
        id: 'ab-test-comparison',
        name: 'A/B Test EID Comparison',
        description: 'Compare performance between experiment variants',
        category: 'analytics',
        template: `
FROM experiments-{{index}}
| WHERE eid IN [{{eids}}]
  AND experiment_id == "{{experiment_id}}"
  AND @timestamp > NOW() - INTERVAL {{time_window}}
| STATS
    total_users = COUNT_DISTINCT(user_id),
    conversions = COUNT(*) WHERE converted == true,
    revenue = SUM(revenue_amount),
    avg_session_duration = AVG(session_duration),
    bounce_count = COUNT(*) WHERE bounced == true
  BY variant, eid
| EVAL
    conversion_rate = conversions / total_users * 100,
    revenue_per_user = revenue / total_users,
    bounce_rate = bounce_count / total_users * 100
| SORT conversion_rate DESC`,
        parameters: [
            {
                name: 'index',
                type: 'string',
                required: false,
                default: '*',
                description: 'Elasticsearch index pattern'
            },
            {
                name: 'eids',
                type: 'array',
                required: true,
                description: 'List of EIDs in the experiment'
            },
            {
                name: 'experiment_id',
                type: 'string',
                required: true,
                description: 'Experiment identifier'
            },
            {
                name: 'time_window',
                type: 'interval',
                required: false,
                default: '7d',
                description: 'Time window for analysis'
            }
        ],
        resultType: 'table',
        cacheable: true,
        cacheSeconds: 3600
    }
};
/**
 * Get template by ID
 */
export function getTemplate(templateId) {
    return queryTemplates[templateId];
}
/**
 * Get all templates for a category
 */
export function getTemplatesByCategory(category) {
    return Object.values(queryTemplates).filter(t => t.category === category);
}
/**
 * Get all available template IDs
 */
export function getTemplateIds() {
    return Object.keys(queryTemplates);
}
//# sourceMappingURL=query-templates.js.map