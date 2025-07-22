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

export class VirtualScroll {
private options: VirtualScrollOptions;
  private scrollElement!: HTMLElement;
  private contentElement!: HTMLElement;
  private visibleRange: { start: number; end: number };
  private renderedItems: Map<number, HTMLElement>;
  private scrollRAF: number | null = null;

  constructor(options: VirtualScrollOptions) {
    this.options = options;
    this.renderedItems = new Map();
    this.visibleRange = { start: 0, end: 0 };

    this.setupDOM();
    this.attachListeners();
    this.updateVisibleRange();
    this.render();
  }

  private setupDOM(): void {
    // Create scroll container
    this.scrollElement = document.createElement('div');
    this.scrollElement.className = 'virtual-scroll-container';
    this.scrollElement.style.cssText = `
      position: relative;
      height: 100%;
      overflow-y: auto;
      will-change: transform;
    `;

    // Create content container
    this.contentElement = document.createElement('div');
    this.contentElement.className = 'virtual-scroll-content';
    this.contentElement.style.cssText = `
      position: relative;
      width: 100%;
      height: ${this.options.totalItems * this.options.itemHeight}px;
    `;

    this.scrollElement.appendChild(this.contentElement);
    this.options.container.appendChild(this.scrollElement);
  }

  private attachListeners(): void {
    this.scrollElement.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.updateVisibleRange();
      this.render();
    });
    resizeObserver.observe(this.scrollElement);
  }

  private handleScroll(): void {
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }

    this.scrollRAF = requestAnimationFrame(() => {
      this.updateVisibleRange();
      this.render();
      this.scrollRAF = null;
    });
  }

  private updateVisibleRange(): void {
    const scrollTop = this.scrollElement.scrollTop;
    const clientHeight = this.scrollElement.clientHeight;

    const start = Math.floor(scrollTop / this.options.itemHeight);
    const visibleCount = Math.ceil(clientHeight / this.options.itemHeight);
    const end = start + visibleCount;

    // Add buffer
    this.visibleRange = {
      start: Math.max(0, start - this.options.buffer),
      end: Math.min(this.options.totalItems, end + this.options.buffer)
    };
  }

  private render(): void {
    const { start, end } = this.visibleRange;

    // Remove items outside visible range
    for (const [index, element] of this.renderedItems) {
      if (index < start || index >= end) {
        element.remove();
        this.renderedItems.delete(index);
      }
    }

    // Add items in visible range
    for (let i = start; i < end; i++) {
      if (!this.renderedItems.has(i)) {
        const element = this.options.renderItem(i);
        element.style.position = 'absolute';
        element.style.top = `${i * this.options.itemHeight}px`;
        element.style.width = '100%';
        element.style.height = `${this.options.itemHeight}px`;
        
        this.contentElement.appendChild(element);
        this.renderedItems.set(i, element);
      }
    }
  }

  /**
   * Update total items and re-render
   */
  updateTotalItems(total: number): void {
    this.options.totalItems = total;
    this.contentElement.style.height = `${total * this.options.itemHeight}px`;
    this.updateVisibleRange();
    this.render();
  }

  /**
   * Scroll to specific index
   */
  scrollToIndex(index: number): void {
    const targetScroll = index * this.options.itemHeight;
    this.scrollElement.scrollTop = targetScroll;
  }

  /**
   * Get current scroll position as index
   */
  getCurrentIndex(): number {
    return Math.floor(this.scrollElement.scrollTop / this.options.itemHeight);
  }

  /**
   * Force re-render of visible items
   */
  refresh(): void {
    // Clear all rendered items
    for (const [, element] of this.renderedItems) {
      element.remove();
    }
    this.renderedItems.clear();

    // Re-render
    this.render();
  }

  /**
   * Destroy virtual scroll
   */
  destroy(): void {
    if (this.scrollRAF) {
      cancelAnimationFrame(this.scrollRAF);
    }
    this.scrollElement.remove();
    this.renderedItems.clear();
  }
}