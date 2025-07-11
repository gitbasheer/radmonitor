/**
 * EID Registry - Central registry for EID discovery and management
 */
import { RadixTrie } from '../trie/radix-trie.js';
export class EIDRegistry {
    constructor() {
        this.maxRecentItems = 20;
        this.maxHotItems = 100;
        this.trie = new RadixTrie();
        this.hotCache = new Map();
        this.hierarchyCache = new Map();
        this.recentEIDs = [];
    }
    /**
     * Initialize registry from historical data
     */
    async initialize(historicalData) {
        if (historicalData) {
            for (const metadata of historicalData) {
                this.addEID(metadata);
            }
            this.computeHotScores();
        }
    }
    /**
     * Add or update an EID in the registry
     */
    addEID(metadata) {
        // Insert into trie
        this.trie.insert(metadata.eid, metadata);
        // Update hierarchy cache
        this.updateHierarchy(metadata);
        // Track recent
        this.trackRecent(metadata.eid);
    }
    /**
     * Sub-millisecond autocomplete search
     */
    search(query, options = {}) {
        const { maxResults = 10, includeMetadata = true, filterByNamespace, filterByRadset, sortBy = 'frequency' } = options;
        // Use trie for prefix search
        const results = this.trie.prefixSearch(query, maxResults * 2);
        // Apply filters and transform to suggestions
        const suggestions = results
            .filter(result => {
            const metadata = result.value;
            if (filterByNamespace && metadata.namespace !== filterByNamespace) {
                return false;
            }
            if (filterByRadset && metadata.radset !== filterByRadset) {
                return false;
            }
            return true;
        })
            .map(result => this.createSuggestion(result, query));
        // Sort based on preference
        switch (sortBy) {
            case 'alphabetical':
                suggestions.sort((a, b) => a.eid.localeCompare(b.eid));
                break;
            case 'recent':
                suggestions.sort((a, b) => {
                    const aIndex = this.recentEIDs.indexOf(a.eid);
                    const bIndex = this.recentEIDs.indexOf(b.eid);
                    if (aIndex === -1 && bIndex === -1)
                        return 0;
                    if (aIndex === -1)
                        return 1;
                    if (bIndex === -1)
                        return -1;
                    return aIndex - bIndex;
                });
                break;
            default: // frequency
                // Already sorted by score from trie
                break;
        }
        return suggestions.slice(0, maxResults);
    }
    /**
     * Get hot EIDs based on ML-like scoring
     */
    getHotEIDs(limit = 10) {
        const hotEntries = Array.from(this.hotCache.values());
        return hotEntries
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }
    /**
     * Get recent EIDs
     */
    getRecentEIDs(limit = 10) {
        return this.recentEIDs
            .slice(0, limit)
            .map(eid => this.trie.search(eid))
            .filter((metadata) => metadata !== undefined);
    }
    /**
     * Get EID hierarchy for navigation
     */
    getHierarchy() {
        return Array.from(this.hierarchyCache.values());
    }
    /**
     * Update EID frequency (called on user selection)
     */
    recordUsage(eid) {
        this.trie.updateFrequency(eid, 1);
        this.trackRecent(eid);
        // Update hot score
        const metadata = this.trie.search(eid);
        if (metadata) {
            metadata.frequency++;
            this.updateHotScore(metadata);
        }
    }
    /**
     * Compute hot scores for all EIDs (ML stub)
     */
    computeHotScores() {
        const allEIDs = this.trie.getAllKeys();
        for (const eid of allEIDs) {
            const metadata = this.trie.search(eid);
            if (metadata) {
                this.updateHotScore(metadata);
            }
        }
        // Keep only top N hot items
        this.pruneHotCache();
    }
    /**
     * Update hot score for a single EID
     * This is a stub for ML scoring - implements simple heuristics
     */
    updateHotScore(metadata) {
        const now = Date.now();
        const ageInHours = (now - metadata.lastSeen.getTime()) / (1000 * 60 * 60);
        // Simple scoring algorithm (to be replaced with ML)
        let score = metadata.frequency;
        // Recency boost
        if (ageInHours < 1)
            score *= 2;
        else if (ageInHours < 24)
            score *= 1.5;
        else if (ageInHours > 168)
            score *= 0.5; // Older than a week
        // Error rate penalty
        if (metadata.errorRate) {
            score *= (1 - metadata.errorRate);
        }
        // Response time factor
        if (metadata.avgResponseTime && metadata.avgResponseTime > 1000) {
            score *= 0.8; // Penalty for slow EIDs
        }
        // Determine trend
        const existing = this.hotCache.get(metadata.eid);
        let trend = 'stable';
        if (existing) {
            if (score > existing.score * 1.1)
                trend = 'rising';
            else if (score < existing.score * 0.9)
                trend = 'falling';
        }
        this.hotCache.set(metadata.eid, {
            eid: metadata.eid,
            score,
            metadata,
            trend
        });
    }
    /**
     * Create a suggestion from search result
     */
    createSuggestion(result, query) {
        const metadata = result.value;
        const matchedPart = this.findMatchedPart(metadata.eid, query);
        return {
            eid: metadata.eid,
            metadata,
            score: result.score,
            matchedPart
        };
    }
    /**
     * Find the matched part of the EID for highlighting
     */
    findMatchedPart(eid, query) {
        const lowerEid = eid.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerEid.indexOf(lowerQuery);
        if (index !== -1) {
            return eid.substring(index, index + query.length);
        }
        return query;
    }
    /**
     * Update hierarchy cache
     */
    updateHierarchy(metadata) {
        let hierarchy = this.hierarchyCache.get(metadata.namespace);
        if (!hierarchy) {
            hierarchy = {
                namespace: metadata.namespace,
                radsets: new Map()
            };
            this.hierarchyCache.set(metadata.namespace, hierarchy);
        }
        let radset = hierarchy.radsets.get(metadata.radset);
        if (!radset) {
            radset = {
                name: metadata.radset,
                rads: new Map(),
                totalEvents: 0
            };
            hierarchy.radsets.set(metadata.radset, radset);
        }
        let rad = radset.rads.get(metadata.radId);
        if (!rad) {
            rad = {
                id: metadata.radId,
                eids: [],
                totalEvents: 0
            };
            radset.rads.set(metadata.radId, rad);
        }
        // Update or add EID
        const existingIndex = rad.eids.findIndex(e => e.eid === metadata.eid);
        if (existingIndex !== -1) {
            rad.eids[existingIndex] = metadata;
        }
        else {
            rad.eids.push(metadata);
        }
        // Update counts
        rad.totalEvents += metadata.frequency;
        radset.totalEvents += metadata.frequency;
    }
    /**
     * Track recent EIDs
     */
    trackRecent(eid) {
        // Remove if already exists
        const index = this.recentEIDs.indexOf(eid);
        if (index !== -1) {
            this.recentEIDs.splice(index, 1);
        }
        // Add to front
        this.recentEIDs.unshift(eid);
        // Keep size limited
        if (this.recentEIDs.length > this.maxRecentItems) {
            this.recentEIDs.pop();
        }
    }
    /**
     * Keep hot cache size under control
     */
    pruneHotCache() {
        if (this.hotCache.size <= this.maxHotItems)
            return;
        // Convert to array and sort by score
        const entries = Array.from(this.hotCache.entries())
            .sort((a, b) => b[1].score - a[1].score);
        // Keep only top N
        this.hotCache.clear();
        for (let i = 0; i < this.maxHotItems && i < entries.length; i++) {
            const entry = entries[i];
            if (entry) {
                this.hotCache.set(entry[0], entry[1]);
            }
        }
    }
    /**
     * Export registry state for persistence
     */
    exportState() {
        const eids = [];
        const allKeys = this.trie.getAllKeys();
        for (const key of allKeys) {
            const metadata = this.trie.search(key);
            if (metadata) {
                eids.push(metadata);
            }
        }
        const hotScores = Array.from(this.hotCache.entries())
            .map(([eid, entry]) => [eid, entry.score]);
        return {
            eids,
            recent: [...this.recentEIDs],
            hotScores
        };
    }
    /**
     * Import registry state
     */
    importState(state) {
        // Clear existing data
        this.trie.clear();
        this.hotCache.clear();
        this.hierarchyCache.clear();
        this.recentEIDs = [];
        // Import EIDs
        for (const metadata of state.eids) {
            this.addEID(metadata);
        }
        // Import recent
        this.recentEIDs = state.recent;
        // Recompute hot scores
        this.computeHotScores();
    }
}
//# sourceMappingURL=eid-registry.js.map