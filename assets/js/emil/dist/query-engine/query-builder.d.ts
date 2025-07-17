/**
 * ES|QL Query Builder - Translates intents to executable queries
 *
 * @module QueryBuilder
 * @description Provides functionality to build ES|QL queries from intents and templates
 */
import { QueryIntent } from '../esql/template-types.js';
/**
 * ES|QL Query Builder class
 * Handles the transformation of query intents and templates into executable ES|QL queries
 */
export declare class ESQLQueryBuilder {
    /**
     * Build an ES|QL query from intent
     * @param intent - The query intent containing action, EIDs, and parameters
     * @returns The generated ES|QL query string
     * @throws {TemplateNotFoundError} If the template for the intent action is not found
     * @throws {MissingParameterError} If required parameters are missing
     * @throws {QueryBuildError} If query building fails
     */
    static buildFromIntent(intent: QueryIntent): string;
    /**
     * Build a query from template ID and explicit parameters
     * @param templateId - The ID of the template to use
     * @param params - Parameters to fill the template
     * @returns The generated ES|QL query string
     * @throws {TemplateNotFoundError} If the template is not found
     * @throws {MissingParameterError} If required parameters are missing
     */
    static buildFromTemplate(templateId: string, params: Record<string, any>): string;
    /**
     * Map intent actions to template IDs
     * @param action - The intent action
     * @returns The corresponding template ID
     */
    private static mapIntentToTemplate;
    /**
     * Prepare parameters from intent, applying defaults
     * @param template - The query template
     * @param intent - The query intent
     * @returns Validated and prepared parameters
     * @throws {MissingParameterError} If required parameters are missing
     */
    private static prepareParameters;
    /**
     * Validate parameters against template requirements
     * @param template - The query template
     * @param params - Parameters to validate
     * @returns Validated and formatted parameters
     * @throws {MissingParameterError} If required parameters are missing
     * @throws {ParameterValidationError} If parameter validation fails
     */
    private static validateParameters;
    /**
     * Render template with parameters
     * @param template - The template string with placeholders
     * @param params - Parameters to replace placeholders
     * @returns The rendered query string
     * @throws {QueryBuildError} If rendering fails
     */
    private static renderTemplate;
    /**
     * Calculate time window from date range
     * @param start - Start date string
     * @param end - End date string
     * @returns Interval string (e.g., '1h', '2d')
     */
    private static calculateTimeWindow;
    /**
     * Parse ES|QL query to extract used parameters
     * @param query - The ES|QL query string
     * @returns Array of parameter names found in the query
     */
    static parseQuery(query: string): string[];
    /**
     * Validate query syntax (basic check)
     * @param query - The ES|QL query to validate
     * @returns Validation result with error message if invalid
     */
    static validateQuery(query: string): {
        valid: boolean;
        error?: string;
    };
}
//# sourceMappingURL=query-builder.d.ts.map