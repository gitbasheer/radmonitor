/**
 * EID Parser - Parse GoDaddy RAD EID naming conventions
 * Format: namespace.radset.radId.subaction.action
 */
import { EIDMetadata } from '../types/index.js';
export declare class EIDParser {
    private static readonly DEFAULT_NAMESPACE;
    private static readonly DEFAULT_RADSET;
    /**
     * Parse an EID string into its components
     */
    static parse(eid: string): Partial<EIDMetadata>;
    /**
     * Validate an EID format
     */
    static validate(eid: string): boolean;
    /**
     * Build an EID from components
     */
    static build(components: {
        namespace?: string;
        radset?: string;
        radId: string;
        subaction?: string;
        action?: string;
    }): string;
    /**
     * Extract RAD type from EID
     * Common patterns: recommendations, discovery, search, etc.
     */
    static extractRADType(eid: string): string;
    /**
     * Extract RAD identifier for filtering purposes
     * For Venture Feed RADs: pandc.vnext.recommendations.feed.feed*
     * Returns a string that can be used to group EIDs by RAD
     */
    static extractRADIdentifier(eid: string): string;
    /**
     * Get human-readable RAD name from identifier
     */
    static getRADDisplayName(radIdentifier: string): string;
    /**
     * Get display name for an EID
     */
    static getDisplayName(eid: string): string;
    /**
     * Convert camelCase or snake_case to human readable
     */
    private static humanize;
    /**
     * Get hierarchy path for an EID
     */
    static getHierarchyPath(eid: string): string[];
    /**
     * Check if two EIDs belong to the same RAD
     */
    static isSameRAD(eid1: string, eid2: string): boolean;
    /**
     * Check if two EIDs belong to the same RADSet
     */
    static isSameRADSet(eid1: string, eid2: string): boolean;
    /**
     * Create metadata from EID with defaults
     */
    static createMetadata(eid: string, additionalData?: Partial<EIDMetadata>): EIDMetadata;
}
//# sourceMappingURL=eid-parser.d.ts.map