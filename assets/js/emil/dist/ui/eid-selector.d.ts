/**
 * EID Selector Component - Main UI for EID search and selection
 * Integrates Trie search, virtual scrolling, and autocomplete
 */
import { EIDRegistry } from '../eid-registry/eid-registry.js';
export interface EIDSelectorOptions {
    container: HTMLElement;
    registry: EIDRegistry;
    onSelect?: (eids: string[]) => void;
    onSelectionChange?: (eids: string[]) => void;
    multiSelect?: boolean;
    showHotSection?: boolean;
    showRecentSection?: boolean;
}
export declare class EIDSelector {
    private options;
    private selectedEIDs;
    private virtualScroll;
    private searchInput;
    private suggestionsContainer;
    private currentSuggestions;
    private selectedSuggestionIndex;
    private debounceTimer;
    constructor(options: EIDSelectorOptions);
    private render;
    private applyStyles;
    private attachEventListeners;
    private handleSearchInput;
    private handleSearchKeydown;
    private performSearch;
    private renderSuggestions;
    private highlightMatch;
    private navigateSuggestions;
    private selectCurrentSuggestion;
    private showSuggestions;
    private hideSuggestions;
    private renderHotSection;
    private renderRecentSection;
    private initializeVirtualScroll;
    private renderEIDItem;
    private toggleEIDSelection;
    private clearSelection;
    private selectAll;
    private applySelection;
    private updateSelectionCount;
    private refreshSections;
    /**
     * Get selected EIDs
     */
    getSelectedEIDs(): string[];
    /**
     * Set selected EIDs programmatically
     */
    setSelectedEIDs(eids: string[]): void;
    /**
     * Destroy the component
     */
    destroy(): void;
}
//# sourceMappingURL=eid-selector.d.ts.map