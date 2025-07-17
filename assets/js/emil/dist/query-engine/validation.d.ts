/**
 * Query Validation Utilities
 * Provides type-safe validation for query parameters
 */
import { ParameterValue } from '../esql/template-types.js';
/**
 * Custom error class for validation errors
 */
export declare class ValidationError extends Error {
    parameterName: string;
    value: any;
    expectedType?: string | undefined;
    constructor(message: string, parameterName: string, value: any, expectedType?: string | undefined);
}
/**
 * Type guards for parameter validation
 */
export declare const TypeValidators: {
    isString: (value: any) => value is string;
    isNumber: (value: any) => value is number;
    isBoolean: (value: any) => value is boolean;
    isDate: (value: any) => value is Date | string;
    isInterval: (value: any) => value is string;
    isArray: (value: any) => value is any[];
    isPercentage: (value: any) => value is number;
};
/**
 * Validate a parameter value against its expected type
 */
export declare function validateParameterType(value: any, type: string, paramName: string): boolean;
/**
 * Validate EID list
 */
export declare function validateEids(eids: any): string[];
/**
 * Validate time range
 */
export declare function validateTimeRange(start: any, end: any): {
    start: Date;
    end: Date;
};
/**
 * Parse interval string to milliseconds
 */
export declare function parseInterval(interval: string): number;
/**
 * Format value for ES|QL query
 */
export declare function formatQueryValue(value: ParameterValue, type: string): string | number;
//# sourceMappingURL=validation.d.ts.map