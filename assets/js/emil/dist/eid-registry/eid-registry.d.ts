/**
 * EID Registry - Central registry for EID discovery and management
 */
import { EIDMetadata, EIDHierarchy, HotEIDEntry, EIDSearchOptions, EIDSuggestion } from '../types/index.js';
export declare class EIDRegistry {
    private trie;
    private hotCache;
    private hierarchyCache;
    private recentEIDs;
    private maxRecentItems;
    private maxHotItems;
    constructor();
    /**
     * Initialize registry from historical data
     */
    initialize(historicalData?: EIDMetadata[]): Promise<void>;
    /**
     * Add or update an EID in the registry
     */
    addEID(metadata: EIDMetadata): void;
    /**
     * Sub-millisecond autocomplete search
     */
    search(query: string, options?: EIDSearchOptions): EIDSuggestion[];
    /**
     * Get hot EIDs based on ML-like scoring
     */
    getHotEIDs(limit?: number): HotEIDEntry[];
    /**
     * Get recent EIDs
     */
    getRecentEIDs(limit?: number): EIDMetadata[];
    /**
     * Get EID hierarchy for navigation
     */
    getHierarchy(): EIDHierarchy[];
    /**
     * Update EID frequency (called on user selection)
     */
    recordUsage(eid: string): void;
    /**
     * Compute hot scores for all EIDs (ML stub)
     */
    private computeHotScores;
    /**
     * Update hot score for a single EID
     * This is a stub for ML scoring - implements simple heuristics
     */
    private updateHotScore;
    /**
     * Create a suggestion from search result
     */
    private createSuggestion;
    /**
     * Find the matched part of the EID for highlighting
     */
    private findMatchedPart;
    /**
     * Update hierarchy cache
     */
    private updateHierarchy;
    /**
     * Track recent EIDs
     */
    private trackRecent;
    /**
     * Keep hot cache size under control
     */
    private pruneHotCache;
    /**
     * Export registry state for persistence
     */
    exportState(): {
        eids: EIDMetadata[];
        recent: string[];
        hotScores: Array<[string, number]>;
    };
    /**
     * Import registry state
     */
    importState(state: ReturnType<typeof this.exportState>): void;
}
//# sourceMappingURL=eid-registry.d.ts.map