/**
 * Query Validation Utilities
 * Provides type-safe validation for query parameters
 */

import { QueryConfig } from './query-config.js';
import { ParameterValue } from '../esql/template-types.js';

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public parameterName: string,
    public value: any,
    public expectedType?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Type guards for parameter validation
 */
export const TypeValidators = {
  isString: (value: any): value is string => typeof value === 'string',
  
  isNumber: (value: any): value is number => 
    typeof value === 'number' && !isNaN(value),
  
  isBoolean: (value: any): value is boolean => typeof value === 'boolean',
  
  isDate: (value: any): value is Date | string => 
    value instanceof Date || !isNaN(Date.parse(String(value))),
  
  isInterval: (value: any): value is string => 
    TypeValidators.isString(value) && QueryConfig.validation.interval.test(value),
  
  isArray: (value: any): value is any[] => Array.isArray(value),
  
  isPercentage: (value: any): value is number => 
    TypeValidators.isNumber(value) && 
    value >= QueryConfig.validation.percentage.min && 
    value <= QueryConfig.validation.percentage.max,
};

/**
 * Validate a parameter value against its expected type
 */
export function validateParameterType(
  value: any,
  type: string,
  paramName: string
): boolean {
  switch (type) {
    case 'string':
      if (!TypeValidators.isString(value)) {
        throw new ValidationError(
          QueryConfig.errors.invalidType(paramName, type, typeof value),
          paramName,
          value,
          type
        );
      }
      return true;

    case 'number':
      if (!TypeValidators.isNumber(value)) {
        throw new ValidationError(
          QueryConfig.errors.invalidType(paramName, type, typeof value),
          paramName,
          value,
          type
        );
      }
      return true;

    case 'boolean':
      if (!TypeValidators.isBoolean(value)) {
        throw new ValidationError(
          QueryConfig.errors.invalidType(paramName, type, typeof value),
          paramName,
          value,
          type
        );
      }
      return true;

    case 'date':
      if (!TypeValidators.isDate(value)) {
        throw new ValidationError(
          QueryConfig.errors.invalidType(paramName, type, 'date'),
          paramName,
          value,
          type
        );
      }
      return true;

    case 'interval':
      if (!TypeValidators.isInterval(value)) {
        throw new ValidationError(
          `Invalid interval format for ${paramName}. Expected format: number followed by s/m/h/d`,
          paramName,
          value,
          type
        );
      }
      return true;

    case 'array':
      if (!TypeValidators.isArray(value)) {
        throw new ValidationError(
          QueryConfig.errors.invalidType(paramName, type, typeof value),
          paramName,
          value,
          type
        );
      }
      return true;

    case 'percentage':
      if (!TypeValidators.isPercentage(value)) {
        throw new ValidationError(
          `Invalid percentage for ${paramName}. Must be between 0 and 100`,
          paramName,
          value,
          type
        );
      }
      return true;

    default:
      return true;
  }
}

/**
 * Validate EID list
 */
export function validateEids(eids: any): string[] {
  if (!TypeValidators.isArray(eids)) {
    throw new ValidationError(
      'EIDs must be an array',
      'eids',
      eids,
      'array'
    );
  }

  if (eids.length === 0) {
    throw new ValidationError(
      'At least one EID must be provided',
      'eids',
      eids
    );
  }

  if (eids.length > QueryConfig.limits.maxEids) {
    throw new ValidationError(
      QueryConfig.errors.tooManyEids(eids.length),
      'eids',
      eids
    );
  }

  // Ensure all EIDs are strings
  const validatedEids = eids.map((eid, index) => {
    if (!TypeValidators.isString(eid)) {
      throw new ValidationError(
        `EID at index ${index} must be a string`,
        'eids',
        eid,
        'string'
      );
    }
    return eid.trim();
  });

  return validatedEids;
}

/**
 * Validate time range
 */
export function validateTimeRange(start: any, end: any): { start: Date; end: Date } {
  if (!TypeValidators.isDate(start)) {
    throw new ValidationError(
      'Start date must be a valid date',
      'start',
      start,
      'date'
    );
  }

  if (!TypeValidators.isDate(end)) {
    throw new ValidationError(
      'End date must be a valid date',
      'end',
      end,
      'date'
    );
  }

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (startDate >= endDate) {
    throw new ValidationError(
      'Start date must be before end date',
      'timeRange',
      { start, end }
    );
  }

  // Check max time range
  const maxRangeMs = parseInterval(QueryConfig.limits.maxTimeRange);
  const rangeMs = endDate.getTime() - startDate.getTime();
  
  if (rangeMs > maxRangeMs) {
    throw new ValidationError(
      `Time range exceeds maximum of ${QueryConfig.limits.maxTimeRange}`,
      'timeRange',
      { start, end }
    );
  }

  return { start: startDate, end: endDate };
}

/**
 * Parse interval string to milliseconds
 */
export function parseInterval(interval: string): number {
  const match = interval.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new ValidationError(
      'Invalid interval format',
      'interval',
      interval,
      'interval'
    );
  }

  const value = match[1];
  const unit = match[2];
  const num = parseInt(value || '0', 10);

  switch (unit) {
    case 's': return num * 1000;
    case 'm': return num * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'd': return num * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown interval unit: ${unit}`);
  }
}

/**
 * Format value for ES|QL query
 */
export function formatQueryValue(value: ParameterValue, type: string): string | number {
  switch (type) {
    case 'string':
      return String(value);
    
    case 'array':
      // Format array for ES|QL IN clause
      if (Array.isArray(value)) {
        return value.map(v => 
          TypeValidators.isString(v) ? `"${v}"` : String(v)
        ).join(', ');
      }
      return String(value);
    
    case 'date':
      // Ensure ISO format
      return value instanceof Date 
        ? value.toISOString() 
        : new Date(String(value)).toISOString();
    
    case 'percentage':
      // Convert to decimal if needed
      const num = Number(value);
      return num > 1 ? num / 100 : num;
    
    default:
      return value as string | number;
  }
}