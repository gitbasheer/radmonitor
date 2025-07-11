/**
 * ES|QL Query Templates for EID Monitoring
 * Based on patterns from CRITICAL.md
 */
import { QueryTemplate } from './template-types.js';
export declare const queryTemplates: Record<string, QueryTemplate>;
/**
 * Get template by ID
 */
export declare function getTemplate(templateId: string): QueryTemplate | undefined;
/**
 * Get all templates for a category
 */
export declare function getTemplatesByCategory(category: string): QueryTemplate[];
/**
 * Get all available template IDs
 */
export declare function getTemplateIds(): string[];
//# sourceMappingURL=query-templates.d.ts.map