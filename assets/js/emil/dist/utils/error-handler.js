/**
 * Error handling utilities for EMIL
 */
export class EMILError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'EMILError';
    }
}
export class ErrorBoundary {
    constructor() {
        this.errorHandlers = new Set();
        this.defaultHandler = {
            onError: (error) => {
                console.error(`[EMIL Error] ${error.code}: ${error.message}`, error.details);
            }
        };
    }
    /**
     * Register an error handler
     */
    addErrorHandler(handler) {
        this.errorHandlers.add(handler);
    }
    /**
     * Remove an error handler
     */
    removeErrorHandler(handler) {
        this.errorHandlers.delete(handler);
    }
    /**
     * Handle an error
     */
    handleError(error, code) {
        const emilError = error instanceof EMILError
            ? error
            : new EMILError(error.message, code || 'UNKNOWN_ERROR', error);
        // Notify all handlers
        if (this.errorHandlers.size === 0) {
            this.defaultHandler.onError(emilError);
        }
        else {
            this.errorHandlers.forEach(handler => {
                try {
                    handler.onError(emilError);
                }
                catch (handlerError) {
                    console.error('Error in error handler:', handlerError);
                }
            });
        }
    }
    /**
     * Wrap a function with error handling
     */
    wrap(fn, errorCode) {
        return ((...args) => {
            try {
                const result = fn(...args);
                if (result instanceof Promise) {
                    return result.catch((error) => {
                        this.handleError(error, errorCode);
                        throw error;
                    });
                }
                return result;
            }
            catch (error) {
                this.handleError(error, errorCode);
                throw error;
            }
        });
    }
    /**
     * Wrap an async function with error handling
     */
    async wrapAsync(fn, errorCode) {
        try {
            return await fn();
        }
        catch (error) {
            this.handleError(error, errorCode);
            return null;
        }
    }
}
// Global error boundary instance
export const globalErrorBoundary = new ErrorBoundary();
/**
 * Error codes for different components
 */
export const ErrorCodes = {
    // EID Registry errors
    REGISTRY_INIT_FAILED: 'REGISTRY_INIT_FAILED',
    REGISTRY_SEARCH_FAILED: 'REGISTRY_SEARCH_FAILED',
    REGISTRY_ADD_FAILED: 'REGISTRY_ADD_FAILED',
    // Trie errors
    TRIE_INSERT_FAILED: 'TRIE_INSERT_FAILED',
    TRIE_SEARCH_FAILED: 'TRIE_SEARCH_FAILED',
    // UI errors
    UI_RENDER_FAILED: 'UI_RENDER_FAILED',
    UI_EVENT_HANDLER_FAILED: 'UI_EVENT_HANDLER_FAILED',
    UI_CLEANUP_FAILED: 'UI_CLEANUP_FAILED',
    // Query errors
    QUERY_BUILD_FAILED: 'QUERY_BUILD_FAILED',
    QUERY_VALIDATION_FAILED: 'QUERY_VALIDATION_FAILED',
    QUERY_EXECUTION_FAILED: 'QUERY_EXECUTION_FAILED',
    QUERY_TIMEOUT: 'QUERY_TIMEOUT',
    // Parser errors
    PARSER_INVALID_EID: 'PARSER_INVALID_EID',
    PARSER_INVALID_FORMAT: 'PARSER_INVALID_FORMAT',
    // Network errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    // Validation errors
    VALIDATION_REQUIRED_PARAM: 'VALIDATION_REQUIRED_PARAM',
    VALIDATION_INVALID_TYPE: 'VALIDATION_INVALID_TYPE',
    VALIDATION_INVALID_VALUE: 'VALIDATION_INVALID_VALUE'
};
/**
 * Safe error handler for DOM operations
 */
export function safeDOM(operation, fallback, errorCode = ErrorCodes.UI_RENDER_FAILED) {
    try {
        return operation();
    }
    catch (error) {
        globalErrorBoundary.handleError(error, errorCode);
        return fallback;
    }
}
/**
 * Safe async operation with timeout
 */
export async function safeAsyncWithTimeout(operation, timeoutMs, errorCode, timeoutMessage = 'Operation timed out') {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new EMILError(timeoutMessage, ErrorCodes.NETWORK_TIMEOUT)), timeoutMs);
    });
    try {
        return await Promise.race([operation(), timeoutPromise]);
    }
    catch (error) {
        globalErrorBoundary.handleError(error, errorCode);
        return null;
    }
}
/**
 * Validate required parameters
 */
export function validateRequired(value, paramName) {
    if (value === null || value === undefined) {
        throw new EMILError(`Required parameter missing: ${paramName}`, ErrorCodes.VALIDATION_REQUIRED_PARAM, { paramName });
    }
    return value;
}
/**
 * Type guard with error handling
 */
export function assertType(value, typeName, validator) {
    if (!validator(value)) {
        throw new EMILError(`Invalid type: expected ${typeName}`, ErrorCodes.VALIDATION_INVALID_TYPE, { value, expectedType: typeName });
    }
    return value;
}
//# sourceMappingURL=error-handler.js.map