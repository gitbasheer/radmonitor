/**
 * Query Engine Usage Examples
 * Demonstrates various ways to use the ES|QL query engine
 */

import { 
  ESQLQueryBuilder, 
  QueryExecutor,
  QueryErrorFactory,
  validateEids,
  parseInterval
} from './index.js';

/**
 * Example 1: Basic health check query
 */
export async function basicHealthCheck() {
  try {
    // Build query from intent
    const query = ESQLQueryBuilder.buildFromIntent({
      action: 'health-check',
      eids: ['eid-123', 'eid-456'],
      parameters: {
        time_window: '2h'
      }
    });

    // Execute query
    const result = await QueryExecutor.execute(query);
    console.log('Health check results:', result.data);
  } catch (error) {
    console.error('Error:', QueryErrorFactory.getUserMessage(error));
  }
}

/**
 * Example 2: Baseline comparison with custom thresholds
 */
export async function baselineComparison() {
  try {
    const query = ESQLQueryBuilder.buildFromTemplate('baselineComparison', {
      eids: ['eid-789', 'eid-abc'],
      baseline_start: '2024-01-01T00:00:00Z',
      baseline_end: '2024-01-07T23:59:59Z',
      current_window: '24h',
      traffic_drop_threshold: 30, // 30% drop threshold
      traffic_spike_threshold: 150, // 150% spike threshold
      error_increase_threshold: 0.01 // 1% error increase
    });

    const result = await QueryExecutor.execute(query, {
      enableCache: true,
      cacheTTL: 300 // Cache for 5 minutes
    });

    console.log('Baseline comparison:', result.data);
  } catch (error) {
    console.error('Error:', QueryErrorFactory.getUserMessage(error));
  }
}

/**
 * Example 3: Trend analysis with time buckets
 */
export async function trendAnalysis() {
  try {
    // Validate EIDs first
    const eids = validateEids(['eid-001', 'eid-002', 'eid-003']);

    const query = ESQLQueryBuilder.buildFromIntent({
      action: 'trend-analysis',
      eids,
      parameters: {
        time_range: '7d',
        bucket_size: '1h'
      }
    });

    const result = await QueryExecutor.execute(query, {
      timeout: 60000, // 60 second timeout for large queries
      retryAttempts: 3
    });

    console.log('Trend analysis:', result.data);
  } catch (error) {
    console.error('Error:', QueryErrorFactory.getUserMessage(error));
  }
}

/**
 * Example 4: Performance metrics with percentiles
 */
export async function performanceMetrics() {
  try {
    const query = ESQLQueryBuilder.buildFromTemplate('performanceMetrics', {
      eids: ['high-traffic-eid'],
      time_window: '30m',
      timeout_threshold: 3000, // 3 second timeout
      critical_latency: 2000, // 2 second critical
      warning_latency: 1000 // 1 second warning
    });

    const result = await QueryExecutor.execute(query);

    // Check performance scores
    if (result.data && Array.isArray(result.data)) {
      result.data.forEach((metric: any) => {
        if (metric.performance_score < 50) {
          console.warn(`Poor performance for ${metric.eid}: score ${metric.performance_score}`);
        }
      });
    }
  } catch (error) {
    console.error('Error:', QueryErrorFactory.getUserMessage(error));
  }
}

/**
 * Example 5: Error handling patterns
 */
export async function errorHandlingExample() {
  try {
    // This will throw MissingParameterError
    const query = ESQLQueryBuilder.buildFromTemplate('healthCheck', {
      // Missing required 'eids' parameter
      time_window: '1h'
    });
  } catch (error) {
    if (QueryErrorFactory.isQueryEngineError(error)) {
      switch (error.code) {
        case 'MISSING_PARAMETER':
          console.error('Missing parameter:', error.details?.parameterName);
          break;
        case 'PARAMETER_VALIDATION_FAILED':
          console.error('Invalid parameter:', error.details?.parameterName);
          break;
        default:
          console.error('Query error:', error.message);
      }
    }
  }
}

/**
 * Example 6: Working with cache
 */
export async function cacheExample() {
  const query = ESQLQueryBuilder.buildFromIntent({
    action: 'health-check',
    eids: ['eid-cache-test'],
    parameters: {}
  });

  // First execution - will hit the API
  console.log('First execution...');
  await QueryExecutor.execute(query, {
    enableCache: true,
    cacheTTL: 60 // Cache for 1 minute
  });

  // Second execution - will use cache
  console.log('Second execution (cached)...');
  const cachedResult = await QueryExecutor.execute(query, {
    enableCache: true
  });

  console.log('Used cache:', cachedResult.metadata?.fromCache);

  // Check cache stats
  const stats = QueryExecutor.getCacheStats();
  console.log('Cache stats:', stats);
}

/**
 * Example 7: Query validation
 */
export function queryValidationExample() {
  const query = `
FROM logs-traffic-*
| WHERE eid IN ["eid-123", "eid-456"]
  AND @timestamp > NOW() - INTERVAL 1h
| STATS
    event_count = COUNT(*),
    avg_latency = AVG(latency)
  `;

  const validation = ESQLQueryBuilder.validateQuery(query);
  if (validation.valid) {
    console.log('Query is valid');
  } else {
    console.error('Query validation failed:', validation.error);
  }

  // Extract parameters from query
  const params = ESQLQueryBuilder.parseQuery(query);
  console.log('Query parameters:', params);
}

/**
 * Example 8: Advanced intent with context
 */
export async function advancedIntentExample() {
  try {
    const query = ESQLQueryBuilder.buildFromIntent({
      action: 'baseline-compare',
      eids: ['eid-prod-1', 'eid-prod-2'],
      parameters: {
        traffic_drop_threshold: 25
      },
      context: {
        eids: ['eid-prod-1', 'eid-prod-2'],
        timeRange: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-02T00:00:00Z'
        },
        environment: 'production',
        user: {
          id: 'user-123',
          team: 'monitoring'
        }
      }
    });

    console.log('Generated query with context:', query);
  } catch (error) {
    console.error('Error:', QueryErrorFactory.getUserMessage(error));
  }
}

/**
 * Example 9: Utility functions
 */
export function utilityExamples() {
  // Parse intervals
  console.log('15m in ms:', parseInterval('15m')); // 900000
  console.log('2h in ms:', parseInterval('2h'));   // 7200000
  console.log('1d in ms:', parseInterval('1d'));   // 86400000

  // Validate EIDs with error handling
  try {
    const validEids = validateEids(['eid-1', 'eid-2', 'eid-3']);
    console.log('Valid EIDs:', validEids);
  } catch (error) {
    console.error('EID validation failed:', error);
  }
}