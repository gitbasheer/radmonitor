/**
 * ES|QL Query Builder - Translates intents to executable queries
 * 
 * @module QueryBuilder
 * @description Provides functionality to build ES|QL queries from intents and templates
 */

import { QueryTemplate, QueryIntent, QueryParameter, TemplateVariable } from '../esql/template-types.js';
import { getTemplate } from '../esql/query-templates.js';
import { QueryConfig, IntentTemplateMap } from './query-config.js';
import { 
  validateParameterType, 
  validateEids, 
  validateTimeRange, 
  formatQueryValue 
} from './validation.js';
import { 
  QueryErrorFactory,
  TemplateNotFoundError,
  MissingParameterError,
  QueryBuildError,
  QuerySyntaxError
} from './errors.js';

/**
 * ES|QL Query Builder class
 * Handles the transformation of query intents and templates into executable ES|QL queries
 */
export class ESQLQueryBuilder {
  /**
   * Build an ES|QL query from intent
   * @param intent - The query intent containing action, EIDs, and parameters
   * @returns The generated ES|QL query string
   * @throws {TemplateNotFoundError} If the template for the intent action is not found
   * @throws {MissingParameterError} If required parameters are missing
   * @throws {QueryBuildError} If query building fails
   */
  static buildFromIntent(intent: QueryIntent): string {
    // Map intent action to template
    const templateId = this.mapIntentToTemplate(intent.action);
    const template = getTemplate(templateId);
    
    if (!template) {
      throw QueryErrorFactory.templateNotFound(templateId);
    }

    // Prepare parameters with defaults and validation
    const parameters = this.prepareParameters(template, intent);

    // Build the query
    return this.renderTemplate(template.template, parameters);
  }

  /**
   * Build a query from template ID and explicit parameters
   * @param templateId - The ID of the template to use
   * @param params - Parameters to fill the template
   * @returns The generated ES|QL query string
   * @throws {TemplateNotFoundError} If the template is not found
   * @throws {MissingParameterError} If required parameters are missing
   */
  static buildFromTemplate(templateId: string, params: Record<string, any>): string {
    const template = getTemplate(templateId);
    
    if (!template) {
      throw QueryErrorFactory.templateNotFound(templateId);
    }

    // Validate and prepare parameters
    const parameters = this.validateParameters(template, params);

    return this.renderTemplate(template.template, parameters);
  }

  /**
   * Map intent actions to template IDs
   * @param action - The intent action
   * @returns The corresponding template ID
   */
  private static mapIntentToTemplate(action: string): string {
    return IntentTemplateMap[action] || IntentTemplateMap.custom || 'healthCheck';
  }

  /**
   * Prepare parameters from intent, applying defaults
   * @param template - The query template
   * @param intent - The query intent
   * @returns Validated and prepared parameters
   * @throws {MissingParameterError} If required parameters are missing
   */
  private static prepareParameters(
    template: QueryTemplate, 
    intent: QueryIntent
  ): Record<string, any> {
    // Validate EIDs first
    const validatedEids = validateEids(intent.eids);
    
    const params: Record<string, any> = {
      eids: validatedEids,
      ...intent.parameters
    };

    // Apply defaults for missing parameters
    for (const param of template.parameters) {
      if (params[param.name] === undefined) {
        if (param.required && param.name !== 'eids') {
          throw QueryErrorFactory.missingParameter(param.name, template.id);
        }
        if (param.default !== undefined) {
          params[param.name] = param.default;
        }
      }
    }

    // Add context-based defaults
    if (intent.context) {
      if (intent.context.timeRange && !params.time_window) {
        const timeWindow = this.calculateTimeWindow(
          intent.context.timeRange.start,
          intent.context.timeRange.end
        );
        if (timeWindow) {
          params.time_window = timeWindow;
        }
      }
    }

    return this.validateParameters(template, params);
  }

  /**
   * Validate parameters against template requirements
   * @param template - The query template
   * @param params - Parameters to validate
   * @returns Validated and formatted parameters
   * @throws {MissingParameterError} If required parameters are missing
   * @throws {ParameterValidationError} If parameter validation fails
   */
  private static validateParameters(
    template: QueryTemplate,
    params: Record<string, any>
  ): Record<string, any> {
    const validated: Record<string, any> = {};

    for (const param of template.parameters) {
      const value = params[param.name];

      // Check required
      if (param.required && (value === undefined || value === null)) {
        throw QueryErrorFactory.missingParameter(param.name, template.id);
      }

      if (value !== undefined && value !== null) {
        try {
          // Type validation
          validateParameterType(value, param.type, param.name);

          // Custom validation
          if (param.validation && !param.validation(value)) {
            throw QueryErrorFactory.parameterValidation(
              param.name, 
              value, 
              param.type,
              `Custom validation failed for parameter: ${param.name}`
            );
          }

          validated[param.name] = formatQueryValue(value, param.type);
        } catch (error) {
          if (error instanceof Error) {
            throw error;
          }
          throw QueryErrorFactory.parameterValidation(param.name, value, param.type);
        }
      }
    }

    return validated;
  }


  /**
   * Render template with parameters
   * @param template - The template string with placeholders
   * @param params - Parameters to replace placeholders
   * @returns The rendered query string
   * @throws {QueryBuildError} If rendering fails
   */
  private static renderTemplate(template: string, params: Record<string, any>): string {
    let query = template;

    // Replace all {{parameter}} placeholders
    for (const [key, value] of Object.entries(params)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      query = query.replace(placeholder, String(value));
    }

    // Clean up extra whitespace and empty lines
    query = query
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    // Validate query length
    if (query.length > QueryConfig.limits.maxQueryLength) {
      throw QueryErrorFactory.queryBuild(
        QueryConfig.errors.queryTooLong(QueryConfig.limits.maxQueryLength),
        template,
        params
      );
    }

    return query;
  }

  /**
   * Calculate time window from date range
   * @param start - Start date string
   * @param end - End date string
   * @returns Interval string (e.g., '1h', '2d')
   */
  private static calculateTimeWindow(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d`;
    } else if (diffHours > 0) {
      return `${diffHours}h`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes}m`;
    }
  }

  /**
   * Parse ES|QL query to extract used parameters
   * @param query - The ES|QL query string
   * @returns Array of parameter names found in the query
   */
  static parseQuery(query: string): string[] {
    const paramPattern = /{{(\w+)}}/g;
    const params: string[] = [];
    let match;

    while ((match = paramPattern.exec(query)) !== null) {
      const paramName = match[1];
      if (paramName && !params.includes(paramName)) {
        params.push(paramName);
      }
    }

    return params;
  }

  /**
   * Validate query syntax (basic check)
   * @param query - The ES|QL query to validate
   * @returns Validation result with error message if invalid
   */
  static validateQuery(query: string): { valid: boolean; error?: string } {
    try {
      // Check for required ES|QL keywords
      if (!query.includes('FROM')) {
        return { valid: false, error: 'Query must contain FROM clause' };
      }

      // Check for unclosed brackets
      const openBrackets = (query.match(/\[/g) || []).length;
      const closeBrackets = (query.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        return { valid: false, error: 'Unclosed brackets in query' };
      }

      // Check for remaining placeholders
      if (query.includes('{{')) {
        return { valid: false, error: 'Query contains unresolved placeholders' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }
}