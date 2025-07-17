/**
 * EID Selector Component - Main UI for EID search and selection
 * Fixed version with proper cleanup and memory management
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
    private eventHandlers;
    private documentClickHandler;
    private styleElement;
    constructor(options: EIDSelectorOptions);
    private render;
    private applyStyles;
    private attachEventListeners;
    private addEventListener;
    private handleSearchInput;
    private handleSearchKeydown;
    private performSearch;
    private renderSuggestions;
    private highlightMatch;
    private escapeHtml;
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
     * Destroy the component and clean up all resources
     */
    destroy(): void;
}
//# sourceMappingURL=eid-selector.d.ts.map