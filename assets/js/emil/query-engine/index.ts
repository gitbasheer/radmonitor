/**
 * Query Engine Module Exports
 * Central export point for all query engine functionality
 */

// Main query builder
export { ESQLQueryBuilder } from './query-builder.js';

// Query executor
export { QueryExecutor, type QueryExecutionOptions } from './query-executor.js';

// Configuration
export { QueryConfig, IntentTemplateMap, HealthStatus, BaselineStatus } from './query-config.js';

// Validation utilities
export {
  ValidationError,
  TypeValidators,
  validateParameterType,
  validateEids,
  validateTimeRange,
  parseInterval,
  formatQueryValue
} from './validation.js';

// Error classes
export {
  QueryEngineError,
  TemplateNotFoundError,
  MissingParameterError,
  ParameterValidationError,
  QueryBuildError,
  QuerySyntaxError,
  QueryExecutionError,
  QueryErrorFactory
} from './errors.js';

// Re-export types from template-types for convenience
export type {
  QueryTemplate,
  QueryIntent,
  QueryParameter,
  QueryContext,
  QueryResult,
  QueryResultData,
  HealthCheckResult,
  BaselineComparisonResult,
  TrendAnalysisResult,
  PerformanceMetricsResult,
  ParameterValue,
  TemplateVariable
} from '../esql/template-types.js';

// Re-export template functions
export { getTemplate, getTemplatesByCategory, getTemplateIds } from '../esql/query-templates.js';