export class RADFilter {
    constructor(container: any);
    container: any;
    selectedRADs: Set<any>;
    onFilterChange: any;
    radCounts: Map<any, any>;
    /**
     * Initialize the filter with event data
     * @param {Array} events - Array of event objects with event_id field
     */
    init(events?: any[]): void;
    /**
     * Update RAD counts from events
     */
    updateRADCounts(events: any): void;
    /**
     * Render the filter UI
     */
    render(): void;
    /**
     * Attach event listeners
     */
    attachEventListeners(): void;
    /**
     * Handle chip click
     */
    handleChipClick(radId: any): void;
    /**
     * Clear all filters
     */
    clearFilters(): void;
    /**
     * Update UI state
     */
    updateUI(): void;
    /**
     * Notify filter change
     */
    notifyFilterChange(): void;
    /**
     * Get active filters
     */
    getActiveFilters(): any[];
    /**
     * Filter events based on active filters
     * @param {Array} events - Array of event objects
     * @returns {Array} Filtered events
     */
    filterEvents(events: any[]): any[];
    /**
     * Apply component styles
     */
    applyStyles(): void;
}
//# sourceMappingURL=rad-filter.d.ts.map