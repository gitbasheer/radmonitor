/**
 * EID Metrics Store
 * Automatically extracts and stores metrics from query results
 */

import { EIDMetrics } from './types.js';
import { EIDRegistryService } from './eid-registry-service.js';
import { 
  QueryResult,
  HealthCheckResult,
  BaselineComparisonResult,
  PerformanceMetricsResult
} from '../esql/template-types.js';

/**
 * Metrics extraction and storage utility
 */
export class EIDMetricsStore {
  private registryService: EIDRegistryService;

  constructor(registryService: EIDRegistryService) {
    this.registryService = registryService;
  }

  /**
   * Process query result and store metrics
   */
  async processQueryResult(
    result: QueryResult,
    templateId: string,
    timeWindow: string
  ): Promise<void> {
    if (!result.data || result.error) {
      console.warn('No data to process or query error:', result.error);
      return;
    }

    try {
      const metrics = this.extractMetrics(result.data, templateId, timeWindow);
      
      // Store metrics for each EID
      const storePromises = metrics.map(metric => 
        this.registryService.storeMetrics(metric.eid_id, {
          ...metric,
          query_template: templateId,
          time_window: timeWindow
        }).catch(error => {
          console.error(`Failed to store metrics for EID ${metric.eid_id}:`, error);
          return null;
        })
      );

      await Promise.all(storePromises);
      console.log(`Stored metrics for ${metrics.length} EIDs`);
    } catch (error) {
      console.error('Failed to process query result:', error);
    }
  }

  /**
   * Extract metrics from query results based on template type
   */
  private extractMetrics(
    data: any,
    templateId: string,
    timeWindow: string
  ): Omit<EIDMetrics, 'calculated_at'>[] {
    if (!Array.isArray(data)) {
      return [];
    }

    switch (templateId) {
      case 'healthCheck':
        return this.extractHealthCheckMetrics(data as HealthCheckResult[], timeWindow);
      
      case 'baselineComparison':
        return this.extractBaselineMetrics(data as BaselineComparisonResult[], timeWindow);
      
      case 'performanceMetrics':
        return this.extractPerformanceMetrics(data as PerformanceMetricsResult[], timeWindow);
      
      default:
        return this.extractGenericMetrics(data, timeWindow);
    }
  }

  /**
   * Extract metrics from health check results
   */
  private extractHealthCheckMetrics(
    results: HealthCheckResult[],
    timeWindow: string
  ): Omit<EIDMetrics, 'calculated_at'>[] {
    return results.map(result => ({
      eid_id: result.eid,
      health_score: result.health_score,
      health_status: result.health_status,
      avg_latency: result.avg_latency,
      p95_latency: result.p95_latency,
      event_count: result.event_count,
      error_rate: result.error_rate,
      success_rate: 1 - result.error_rate,
      time_window: timeWindow
    }));
  }

  /**
   * Extract metrics from baseline comparison results
   */
  private extractBaselineMetrics(
    results: BaselineComparisonResult[],
    timeWindow: string
  ): Omit<EIDMetrics, 'calculated_at'>[] {
    return results.map(result => ({
      eid_id: result.eid,
      event_count: result.current_count,
      avg_latency: result.current_avg_latency,
      error_rate: result.current_error_rate,
      success_rate: 1 - result.current_error_rate,
      traffic_change_percent: result.traffic_change_percent,
      latency_change_percent: result.latency_change_percent,
      error_rate_change: result.error_rate_change,
      health_status: this.mapBaselineStatusToHealth(result.status),
      time_window: timeWindow
    }));
  }

  /**
   * Extract metrics from performance metrics results
   */
  private extractPerformanceMetrics(
    results: PerformanceMetricsResult[],
    timeWindow: string
  ): Omit<EIDMetrics, 'calculated_at'>[] {
    return results.map(result => ({
      eid_id: result.eid,
      event_count: result.total_requests,
      avg_latency: result.avg_latency,
      p95_latency: result.p95_latency,
      p99_latency: result.p99_latency,
      error_rate: result.error_rate / 100, // Convert percentage to decimal
      success_rate: result.success_rate / 100,
      performance_score: result.performance_score,
      health_status: this.deriveHealthStatus(result),
      time_window: timeWindow
    }));
  }

  /**
   * Extract generic metrics from unknown result format
   */
  private extractGenericMetrics(
    results: any[],
    timeWindow: string
  ): Omit<EIDMetrics, 'calculated_at'>[] {
    return results.map(result => {
      const metric: Omit<EIDMetrics, 'calculated_at'> = {
        eid_id: result.eid || result.eid_id || '',
        time_window: timeWindow
      };

      // Try to extract common fields
      if ('event_count' in result) metric.event_count = result.event_count;
      if ('avg_latency' in result) metric.avg_latency = result.avg_latency;
      if ('p95_latency' in result) metric.p95_latency = result.p95_latency;
      if ('p99_latency' in result) metric.p99_latency = result.p99_latency;
      if ('error_rate' in result) metric.error_rate = result.error_rate;
      if ('success_rate' in result) metric.success_rate = result.success_rate;
      if ('health_status' in result) metric.health_status = result.health_status;
      if ('health_score' in result) metric.health_score = result.health_score;
      if ('performance_score' in result) metric.performance_score = result.performance_score;

      return metric;
    }).filter(metric => metric.eid_id); // Filter out entries without EID
  }

  /**
   * Map baseline comparison status to health status
   */
  private mapBaselineStatusToHealth(status: string): string {
    switch (status) {
      case 'NORMAL':
        return 'HEALTHY';
      case 'TRAFFIC_DROP':
      case 'TRAFFIC_SPIKE':
        return 'WARNING';
      case 'ERROR_INCREASE':
      case 'PERFORMANCE_DEGRADATION':
        return 'CRITICAL';
      default:
        return status;
    }
  }

  /**
   * Derive health status from performance metrics
   */
  private deriveHealthStatus(metrics: PerformanceMetricsResult): string {
    if (metrics.performance_score >= 90) {
      return 'HEALTHY';
    } else if (metrics.performance_score >= 70) {
      return 'WARNING';
    } else if (metrics.performance_score >= 50) {
      return 'SLOW';
    } else {
      return 'CRITICAL';
    }
  }

  /**
   * Batch process multiple query results
   */
  async batchProcessResults(
    results: Array<{
      result: QueryResult;
      templateId: string;
      timeWindow: string;
    }>
  ): Promise<void> {
    const processPromises = results.map(({ result, templateId, timeWindow }) =>
      this.processQueryResult(result, templateId, timeWindow)
    );

    await Promise.all(processPromises);
  }

  /**
   * Create a metrics processor that automatically stores results
   */
  createAutoProcessor(templateId: string, timeWindow: string) {
    return async (result: QueryResult) => {
      await this.processQueryResult(result, templateId, timeWindow);
      return result;
    };
  }
}