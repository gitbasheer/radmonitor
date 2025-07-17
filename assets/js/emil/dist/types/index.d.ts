/**
 * EMIL Type Definitions
 */
export interface EIDMetadata {
    eid: string;
    namespace: string;
    radset: string;
    radId: string;
    subaction?: string;
    action?: string;
    lastSeen: Date;
    frequency: number;
    avgResponseTime?: number;
    errorRate?: number;
    description?: string;
    tags?: string[];
}
export interface EIDHierarchy {
    namespace: string;
    radsets: Map<string, RADSet>;
}
export interface RADSet {
    name: string;
    rads: Map<string, RAD>;
    totalEvents: number;
}
export interface RAD {
    id: string;
    eids: EIDMetadata[];
    totalEvents: number;
}
export interface HotEIDEntry {
    eid: string;
    score: number;
    metadata: EIDMetadata;
    trend: 'rising' | 'stable' | 'falling';
}
export interface EIDSearchOptions {
    maxResults?: number;
    includeMetadata?: boolean;
    filterByNamespace?: string;
    filterByRadset?: string;
    sortBy?: 'frequency' | 'alphabetical' | 'recent';
}
export interface EIDSelectionState {
    selected: Set<string>;
    recent: string[];
    favorites: Set<string>;
}
export interface EIDSuggestion {
    eid: string;
    metadata: EIDMetadata;
    score: number;
    matchedPart: string;
}
