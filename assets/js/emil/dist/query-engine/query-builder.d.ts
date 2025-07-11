/**
 * ES|QL Query Builder - Translates intents to executable queries
 */
import { QueryIntent } from '../esql/template-types.js';
export declare class ESQLQueryBuilder {
    /**
     * Build an ES|QL query from intent
     */
    static buildFromIntent(intent: QueryIntent): string;
    /**
     * Build a query from template ID and explicit parameters
     */
    static buildFromTemplate(templateId: string, params: Record<string, any>): string;
    /**
     * Map intent actions to template IDs
     */
    private static mapIntentToTemplate;
    /**
     * Prepare parameters from intent, applying defaults
     */
    private static prepareParameters;
    /**
     * Validate parameters against template requirements
     */
    private static validateParameters;
    /**
     * Validate parameter type
     */
    private static validateType;
    /**
     * Format value for ES|QL query
     */
    private static formatValue;
    /**
     * Render template with parameters
     */
    private static renderTemplate;
    /**
     * Calculate time window from date range
     */
    private static calculateTimeWindow;
    /**
     * Parse ES|QL query to extract used parameters
     */
    static parseQuery(query: string): string[];
    /**
     * Validate query syntax (basic check)
     */
    static validateQuery(query: string): {
        valid: boolean;
        error?: string;
    };
}
//# sourceMappingURL=query-builder.d.ts.map