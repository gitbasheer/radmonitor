/**
 * Error handling utilities for EMIL
 */

export class EMILError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'EMILError';
  }
}

export interface ErrorHandler {
  onError: (error: EMILError) => void;
}

export class ErrorBoundary {
  private errorHandlers: Set<ErrorHandler> = new Set();
  private defaultHandler: ErrorHandler = {
    onError: (error) => {
      console.error(`[EMIL Error] ${error.code}: ${error.message}`, error.details);
    }
  };

  /**
   * Register an error handler
   */
  addErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  /**
   * Remove an error handler
   */
  removeErrorHandler(handler: ErrorHandler): void {
    this.errorHandlers.delete(handler);
  }

  /**
   * Handle an error
   */
  handleError(error: Error | EMILError, code?: string): void {
    const emilError = error instanceof EMILError 
      ? error 
      : new EMILError(error.message, code || 'UNKNOWN_ERROR', error);

    // Notify all handlers
    if (this.errorHandlers.size === 0) {
      this.defaultHandler.onError(emilError);
    } else {
      this.errorHandlers.forEach(handler => {
        try {
          handler.onError(emilError);
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
        }
      });
    }
  }

  /**
   * Wrap a function with error handling
   */
  wrap<T extends (...args: any[]) => any>(
    fn: T,
    errorCode: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch((error) => {
            this.handleError(error, errorCode);
            throw error;
          });
        }
        return result;
      } catch (error) {
        this.handleError(error as Error, errorCode);
        throw error;
      }
    }) as T;
  }

  /**
   * Wrap an async function with error handling
   */
  async wrapAsync<T>(
    fn: () => Promise<T>,
    errorCode: string
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.handleError(error as Error, errorCode);
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
} as const;

/**
 * Safe error handler for DOM operations
 */
export function safeDOM<T>(
  operation: () => T,
  fallback: T,
  errorCode: string = ErrorCodes.UI_RENDER_FAILED
): T {
  try {
    return operation();
  } catch (error) {
    globalErrorBoundary.handleError(error as Error, errorCode);
    return fallback;
  }
}

/**
 * Safe async operation with timeout
 */
export async function safeAsyncWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  errorCode: string,
  timeoutMessage: string = 'Operation timed out'
): Promise<T | null> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new EMILError(timeoutMessage, ErrorCodes.NETWORK_TIMEOUT)), timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    globalErrorBoundary.handleError(error as Error, errorCode);
    return null;
  }
}

/**
 * Validate required parameters
 */
export function validateRequired<T>(
  value: T | null | undefined,
  paramName: string
): T {
  if (value === null || value === undefined) {
    throw new EMILError(
      `Required parameter missing: ${paramName}`,
      ErrorCodes.VALIDATION_REQUIRED_PARAM,
      { paramName }
    );
  }
  return value;
}

/**
 * Type guard with error handling
 */
export function assertType<T>(
  value: unknown,
  typeName: string,
  validator: (v: unknown) => v is T
): T {
  if (!validator(value)) {
    throw new EMILError(
      `Invalid type: expected ${typeName}`,
      ErrorCodes.VALIDATION_INVALID_TYPE,
      { value, expectedType: typeName }
    );
  }
  return value;
}