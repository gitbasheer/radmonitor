/**
 * Query Engine Error Classes
 * Custom error types for better error handling and debugging
 */
/**
 * Base error class for query engine errors
 */
export class QueryEngineError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'QueryEngineError';
        Object.setPrototypeOf(this, QueryEngineError.prototype);
    }
}
/**
 * Error thrown when a template is not found
 */
export class TemplateNotFoundError extends QueryEngineError {
    constructor(templateId) {
        super(`Query template not found: ${templateId}`, 'TEMPLATE_NOT_FOUND', { templateId });
        this.name = 'TemplateNotFoundError';
    }
}
/**
 * Error thrown when required parameters are missing
 */
export class MissingParameterError extends QueryEngineError {
    constructor(parameterName, templateId) {
        super(`Required parameter missing: ${parameterName}`, 'MISSING_PARAMETER', { parameterName, templateId });
        this.name = 'MissingParameterError';
    }
}
/**
 * Error thrown when parameter validation fails
 */
export class ParameterValidationError extends QueryEngineError {
    constructor(parameterName, value, expectedType, message) {
        super(message || `Invalid value for parameter ${parameterName}: expected ${expectedType}`, 'PARAMETER_VALIDATION_FAILED', { parameterName, value, expectedType });
        this.name = 'ParameterValidationError';
    }
}
/**
 * Error thrown when query building fails
 */
export class QueryBuildError extends QueryEngineError {
    constructor(message, template, parameters) {
        super(message, 'QUERY_BUILD_FAILED', { template, parameters });
        this.name = 'QueryBuildError';
    }
}
/**
 * Error thrown when query syntax validation fails
 */
export class QuerySyntaxError extends QueryEngineError {
    constructor(query, error) {
        super(`Query syntax error: ${error}`, 'QUERY_SYNTAX_ERROR', { query, error });
        this.name = 'QuerySyntaxError';
    }
}
/**
 * Error thrown when query execution fails
 */
export class QueryExecutionError extends QueryEngineError {
    constructor(message, query, cause) {
        super(message, 'QUERY_EXECUTION_FAILED', { query, cause });
        this.name = 'QueryExecutionError';
    }
}
/**
 * Error factory for creating appropriate error types
 */
export class QueryErrorFactory {
    static templateNotFound(templateId) {
        return new TemplateNotFoundError(templateId);
    }
    static missingParameter(parameterName, templateId) {
        return new MissingParameterError(parameterName, templateId);
    }
    static parameterValidation(parameterName, value, expectedType, message) {
        return new ParameterValidationError(parameterName, value, expectedType, message);
    }
    static queryBuild(message, template, parameters) {
        return new QueryBuildError(message, template, parameters);
    }
    static querySyntax(query, error) {
        return new QuerySyntaxError(query, error);
    }
    static queryExecution(message, query, cause) {
        return new QueryExecutionError(message, query, cause);
    }
    /**
     * Check if an error is a query engine error
     */
    static isQueryEngineError(error) {
        return error instanceof QueryEngineError;
    }
    /**
     * Get user-friendly error message
     */
    static getUserMessage(error) {
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
//# sourceMappingURL=errors.js.map