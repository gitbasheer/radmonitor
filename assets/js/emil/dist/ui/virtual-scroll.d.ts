/**
 * Virtual Scroll implementation for handling 10k+ EIDs
 * Vanilla TypeScript implementation with high performance
 */
export interface VirtualScrollOptions {
    itemHeight: number;
    buffer: number;
    container: HTMLElement;
    totalItems: number;
    renderItem: (index: number) => HTMLElement;
}
export declare class VirtualScroll {
    private options;
    private scrollElement;
    private contentElement;
    private visibleRange;
    private renderedItems;
    private scrollRAF;
    constructor(options: VirtualScrollOptions);
    private setupDOM;
    private attachListeners;
    private handleScroll;
    private updateVisibleRange;
    private render;
    /**
     * Update total items and re-render
     */
    updateTotalItems(total: number): void;
    /**
     * Scroll to specific index
     */
    scrollToIndex(index: number): void;
    /**
     * Get current scroll position as index
     */
    getCurrentIndex(): number;
    /**
     * Force re-render of visible items
     */
    refresh(): void;
    /**
     * Destroy virtual scroll
     */
    destroy(): void;
}
//# sourceMappingURL=virtual-scroll.d.ts.map