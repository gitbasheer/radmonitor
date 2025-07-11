/**
 * ES|QL Query Builder - Translates intents to executable queries
 */
import { getTemplate } from '../esql/query-templates.js';
export class ESQLQueryBuilder {
    /**
     * Build an ES|QL query from intent
     */
    static buildFromIntent(intent) {
        // Map intent action to template
        const templateId = this.mapIntentToTemplate(intent.action);
        const template = getTemplate(templateId);
        if (!template) {
            throw new Error(`No template found for action: ${intent.action}`);
        }
        // Prepare parameters with defaults and validation
        const parameters = this.prepareParameters(template, intent);
        // Build the query
        return this.renderTemplate(template.template, parameters);
    }
    /**
     * Build a query from template ID and explicit parameters
     */
    static buildFromTemplate(templateId, params) {
        const template = getTemplate(templateId);
        if (!template) {
            throw new Error(`Template not found: ${templateId}`);
        }
        // Validate and prepare parameters
        const parameters = this.validateParameters(template, params);
        return this.renderTemplate(template.template, parameters);
    }
    /**
     * Map intent actions to template IDs
     */
    static mapIntentToTemplate(action) {
        const mapping = {
            'health-check': 'healthCheck',
            'baseline-compare': 'baselineComparison',
            'trend-analysis': 'trendAnalysis',
            'anomaly-detection': 'performanceMetrics',
            'custom': 'healthCheck' // Default for custom
        };
        return mapping[action] || 'healthCheck';
    }
    /**
     * Prepare parameters from intent, applying defaults
     */
    static prepareParameters(template, intent) {
        const params = {
            eids: intent.eids,
            ...intent.parameters
        };
        // Apply defaults for missing parameters
        for (const param of template.parameters) {
            if (params[param.name] === undefined) {
                if (param.required && param.name !== 'eids') {
                    throw new Error(`Required parameter missing: ${param.name}`);
                }
                if (param.default !== undefined) {
                    params[param.name] = param.default;
                }
            }
        }
        // Add context-based defaults
        if (intent.context) {
            if (intent.context.timeRange && !params.time_window) {
                params.time_window = this.calculateTimeWindow(intent.context.timeRange.start, intent.context.timeRange.end);
            }
        }
        return this.validateParameters(template, params);
    }
    /**
     * Validate parameters against template requirements
     */
    static validateParameters(template, params) {
        const validated = {};
        for (const param of template.parameters) {
            const value = params[param.name];
            // Check required
            if (param.required && (value === undefined || value === null)) {
                throw new Error(`Required parameter missing: ${param.name}`);
            }
            if (value !== undefined && value !== null) {
                // Type validation
                if (!this.validateType(value, param.type)) {
                    throw new Error(`Invalid type for parameter ${param.name}: expected ${param.type}, got ${typeof value}`);
                }
                // Custom validation
                if (param.validation && !param.validation(value)) {
                    throw new Error(`Validation failed for parameter: ${param.name}`);
                }
                validated[param.name] = this.formatValue(value, param.type);
            }
        }
        return validated;
    }
    /**
     * Validate parameter type
     */
    static validateType(value, type) {
        switch (type) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'date':
                return value instanceof Date || !isNaN(Date.parse(value));
            case 'interval':
                return typeof value === 'string' && /^\d+[smhd]$/.test(value);
            case 'array':
                return Array.isArray(value);
            case 'percentage':
                return typeof value === 'number' && value >= 0 && value <= 100;
            default:
                return true;
        }
    }
    /**
     * Format value for ES|QL query
     */
    static formatValue(value, type) {
        switch (type) {
            case 'string':
                return value;
            case 'array':
                // Format array of strings for ES|QL IN clause
                if (value.every((v) => typeof v === 'string')) {
                    return value.map((v) => `"${v}"`).join(', ');
                }
                return value.join(', ');
            case 'date':
                // Ensure ISO format
                return value instanceof Date ? value.toISOString() : value;
            case 'percentage':
                // Convert percentage to decimal if needed
                return value > 1 ? value / 100 : value;
            default:
                return value;
        }
    }
    /**
     * Render template with parameters
     */
    static renderTemplate(template, params) {
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
        return query;
    }
    /**
     * Calculate time window from date range
     */
    static calculateTimeWindow(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffMs = endDate.getTime() - startDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays > 0) {
            return `${diffDays}d`;
        }
        else if (diffHours > 0) {
            return `${diffHours}h`;
        }
        else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes}m`;
        }
    }
    /**
     * Parse ES|QL query to extract used parameters
     */
    static parseQuery(query) {
        const paramPattern = /{{(\w+)}}/g;
        const params = [];
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
     */
    static validateQuery(query) {
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
        }
        catch (error) {
            return { valid: false, error: String(error) };
        }
    }
}
//# sourceMappingURL=query-builder.js.map