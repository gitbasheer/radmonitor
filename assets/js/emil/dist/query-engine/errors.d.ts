/**
 * Query Engine Error Classes
 * Custom error types for better error handling and debugging
 */
/**
 * Base error class for query engine errors
 */
export declare class QueryEngineError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
/**
 * Error thrown when a template is not found
 */
export declare class TemplateNotFoundError extends QueryEngineError {
    constructor(templateId: string);
}
/**
 * Error thrown when required parameters are missing
 */
export declare class MissingParameterError extends QueryEngineError {
    constructor(parameterName: string, templateId?: string);
}
/**
 * Error thrown when parameter validation fails
 */
export declare class ParameterValidationError extends QueryEngineError {
    constructor(parameterName: string, value: any, expectedType: string, message?: string);
}
/**
 * Error thrown when query building fails
 */
export declare class QueryBuildError extends QueryEngineError {
    constructor(message: string, template?: string, parameters?: any);
}
/**
 * Error thrown when query syntax validation fails
 */
export declare class QuerySyntaxError extends QueryEngineError {
    constructor(query: string, error: string);
}
/**
 * Error thrown when query execution fails
 */
export declare class QueryExecutionError extends QueryEngineError {
    constructor(message: string, query?: string, cause?: any);
}
/**
 * Error factory for creating appropriate error types
 */
export declare class QueryErrorFactory {
    static templateNotFound(templateId: string): TemplateNotFoundError;
    static missingParameter(parameterName: string, templateId?: string): MissingParameterError;
    static parameterValidation(parameterName: string, value: any, expectedType: string, message?: string): ParameterValidationError;
    static queryBuild(message: string, template?: string, parameters?: any): QueryBuildError;
    static querySyntax(query: string, error: string): QuerySyntaxError;
    static queryExecution(message: string, query?: string, cause?: any): QueryExecutionError;
    /**
     * Check if an error is a query engine error
     */
    static isQueryEngineError(error: any): error is QueryEngineError;
    /**
     * Get user-friendly error message
     */
    static getUserMessage(error: any): string;
}
//# sourceMappingURL=errors.d.ts.map