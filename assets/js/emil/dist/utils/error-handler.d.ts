/**
 * Error handling utilities for EMIL
 */
export declare class EMILError extends Error {
    code: string;
    details?: unknown | undefined;
    constructor(message: string, code: string, details?: unknown | undefined);
}
export interface ErrorHandler {
    onError: (error: EMILError) => void;
}
export declare class ErrorBoundary {
    private errorHandlers;
    private defaultHandler;
    /**
     * Register an error handler
     */
    addErrorHandler(handler: ErrorHandler): void;
    /**
     * Remove an error handler
     */
    removeErrorHandler(handler: ErrorHandler): void;
    /**
     * Handle an error
     */
    handleError(error: Error | EMILError, code?: string): void;
    /**
     * Wrap a function with error handling
     */
    wrap<T extends (...args: any[]) => any>(fn: T, errorCode: string): T;
    /**
     * Wrap an async function with error handling
     */
    wrapAsync<T>(fn: () => Promise<T>, errorCode: string): Promise<T | null>;
}
export declare const globalErrorBoundary: ErrorBoundary;
/**
 * Error codes for different components
 */
export declare const ErrorCodes: {
    readonly REGISTRY_INIT_FAILED: "REGISTRY_INIT_FAILED";
    readonly REGISTRY_SEARCH_FAILED: "REGISTRY_SEARCH_FAILED";
    readonly REGISTRY_ADD_FAILED: "REGISTRY_ADD_FAILED";
    readonly TRIE_INSERT_FAILED: "TRIE_INSERT_FAILED";
    readonly TRIE_SEARCH_FAILED: "TRIE_SEARCH_FAILED";
    readonly UI_RENDER_FAILED: "UI_RENDER_FAILED";
    readonly UI_EVENT_HANDLER_FAILED: "UI_EVENT_HANDLER_FAILED";
    readonly UI_CLEANUP_FAILED: "UI_CLEANUP_FAILED";
    readonly QUERY_BUILD_FAILED: "QUERY_BUILD_FAILED";
    readonly QUERY_VALIDATION_FAILED: "QUERY_VALIDATION_FAILED";
    readonly QUERY_EXECUTION_FAILED: "QUERY_EXECUTION_FAILED";
    readonly QUERY_TIMEOUT: "QUERY_TIMEOUT";
    readonly PARSER_INVALID_EID: "PARSER_INVALID_EID";
    readonly PARSER_INVALID_FORMAT: "PARSER_INVALID_FORMAT";
    readonly NETWORK_ERROR: "NETWORK_ERROR";
    readonly NETWORK_TIMEOUT: "NETWORK_TIMEOUT";
    readonly VALIDATION_REQUIRED_PARAM: "VALIDATION_REQUIRED_PARAM";
    readonly VALIDATION_INVALID_TYPE: "VALIDATION_INVALID_TYPE";
    readonly VALIDATION_INVALID_VALUE: "VALIDATION_INVALID_VALUE";
};
/**
 * Safe error handler for DOM operations
 */
export declare function safeDOM<T>(operation: () => T, fallback: T, errorCode?: string): T;
/**
 * Safe async operation with timeout
 */
export declare function safeAsyncWithTimeout<T>(operation: () => Promise<T>, timeoutMs: number, errorCode: string, timeoutMessage?: string): Promise<T | null>;
/**
 * Validate required parameters
 */
export declare function validateRequired<T>(value: T | null | undefined, paramName: string): T;
/**
 * Type guard with error handling
 */
export declare function assertType<T>(value: unknown, typeName: string, validator: (v: unknown) => v is T): T;
//# sourceMappingURL=error-handler.d.ts.map