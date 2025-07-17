/**
 * Query Engine Error Classes
 * Custom error types for better error handling and debugging
 */

/**
 * Base error class for query engine errors
 */
export class QueryEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'QueryEngineError';
    Object.setPrototypeOf(this, QueryEngineError.prototype);
  }
}

/**
 * Error thrown when a template is not found
 */
export class TemplateNotFoundError extends QueryEngineError {
  constructor(templateId: string) {
    super(
      `Query template not found: ${templateId}`,
      'TEMPLATE_NOT_FOUND',
      { templateId }
    );
    this.name = 'TemplateNotFoundError';
  }
}

/**
 * Error thrown when required parameters are missing
 */
export class MissingParameterError extends QueryEngineError {
  constructor(parameterName: string, templateId?: string) {
    super(
      `Required parameter missing: ${parameterName}`,
      'MISSING_PARAMETER',
      { parameterName, templateId }
    );
    this.name = 'MissingParameterError';
  }
}

/**
 * Error thrown when parameter validation fails
 */
export class ParameterValidationError extends QueryEngineError {
  constructor(
    parameterName: string,
    value: any,
    expectedType: string,
    message?: string
  ) {
    super(
      message || `Invalid value for parameter ${parameterName}: expected ${expectedType}`,
      'PARAMETER_VALIDATION_FAILED',
      { parameterName, value, expectedType }
    );
    this.name = 'ParameterValidationError';
  }
}

/**
 * Error thrown when query building fails
 */
export class QueryBuildError extends QueryEngineError {
  constructor(message: string, template?: string, parameters?: any) {
    super(
      message,
      'QUERY_BUILD_FAILED',
      { template, parameters }
    );
    this.name = 'QueryBuildError';
  }
}

/**
 * Error thrown when query syntax validation fails
 */
export class QuerySyntaxError extends QueryEngineError {
  constructor(query: string, error: string) {
    super(
      `Query syntax error: ${error}`,
      'QUERY_SYNTAX_ERROR',
      { query, error }
    );
    this.name = 'QuerySyntaxError';
  }
}

/**
 * Error thrown when query execution fails
 */
export class QueryExecutionError extends QueryEngineError {
  constructor(message: string, query?: string, cause?: any) {
    super(
      message,
      'QUERY_EXECUTION_FAILED',
      { query, cause }
    );
    this.name = 'QueryExecutionError';
  }
}

/**
 * Error factory for creating appropriate error types
 */
export class QueryErrorFactory {
  static templateNotFound(templateId: string): TemplateNotFoundError {
    return new TemplateNotFoundError(templateId);
  }

  static missingParameter(parameterName: string, templateId?: string): MissingParameterError {
    return new MissingParameterError(parameterName, templateId);
  }

  static parameterValidation(
    parameterName: string,
    value: any,
    expectedType: string,
    message?: string
  ): ParameterValidationError {
    return new ParameterValidationError(parameterName, value, expectedType, message);
  }

  static queryBuild(message: string, template?: string, parameters?: any): QueryBuildError {
    return new QueryBuildError(message, template, parameters);
  }

  static querySyntax(query: string, error: string): QuerySyntaxError {
    return new QuerySyntaxError(query, error);
  }

  static queryExecution(message: string, query?: string, cause?: any): QueryExecutionError {
    return new QueryExecutionError(message, query, cause);
  }

  /**
   * Check if an error is a query engine error
   */
  static isQueryEngineError(error: any): error is QueryEngineError {
    return error instanceof QueryEngineError;
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(error: any): string {
    if (this.isQueryEngineError(error)) {
      switch (error.code) {
        case 'TEMPLATE_NOT_FOUND':
          return 'The requested query template could not be found.';
        case 'MISSING_PARAMETER':
          return `Missing required information: ${error.details?.parameterName}`;
        case 'PARAMETER_VALIDATION_FAILED':
          return `Invalid value provided for: ${error.details?.parameterName}`;
        case 'QUERY_BUILD_FAILED':
          return 'Failed to build the query. Please check your parameters.';
        case 'QUERY_SYNTAX_ERROR':
          return 'The generated query has syntax errors.';
        case 'QUERY_EXECUTION_FAILED':
          return 'Failed to execute the query. Please try again.';
        default:
          return error.message;
      }
    }
    return 'An unexpected error occurred while processing your query.';
  }
}