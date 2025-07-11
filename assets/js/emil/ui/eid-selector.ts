/**
 * EID Selector Component - Main UI for EID search and selection
 * Fixed version with proper cleanup and memory management
 */

import { EIDRegistry } from '../eid-registry/eid-registry.js';
import { VirtualScroll } from './virtual-scroll.js';
import { EIDMetadata, EIDSuggestion } from '../types/index.js';
import { EIDParser } from '../utils/eid-parser.js';

export interface EIDSelectorOptions {
  container: HTMLElement;
  registry: EIDRegistry;
  onSelect?: (eids: string[]) => void;
  onSelectionChange?: (eids: string[]) => void;
  multiSelect?: boolean;
  showHotSection?: boolean;
  showRecentSection?: boolean;
}

export class EIDSelector {
  private options: EIDSelectorOptions;
  private selectedEIDs: Set<string> = new Set();
  private virtualScroll: VirtualScroll | null = null;
  private searchInput: HTMLInputElement | null = null;
  private suggestionsContainer: HTMLElement | null = null;
  private currentSuggestions: EIDSuggestion[] = [];
  private selectedSuggestionIndex: number = -1;
  private debounceTimer: number | null = null;
  
  // Store bound event handlers for cleanup
  private eventHandlers: Map<Element, Map<string, EventListener>> = new Map();
  private documentClickHandler: ((e: Event) => void) | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor(options: EIDSelectorOptions) {
    this.options = {
      multiSelect: true,
      showHotSection: true,
      showRecentSection: true,
      ...options
    };

    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    // Create main container structure
    this.options.container.innerHTML = `
      <div class="eid-selector">
        <div class="eid-selector-header">
          <div class="eid-search-container">
            <input 
              type="text" 
              class="eid-search-input" 
              placeholder="Search EIDs (e.g., pandc.vnext.recommendations...)"
              autocomplete="off"
              spellcheck="false"
              aria-label="Search EIDs"
              role="combobox"
              aria-expanded="false"
              aria-autocomplete="list"
              aria-controls="eid-suggestions"
            />
            <div class="eid-search-icon" aria-hidden="true">🔍</div>
          </div>
          <div class="eid-selector-actions">
            <button class="eid-clear-btn" title="Clear selection" aria-label="Clear all selections">Clear</button>
            <button class="eid-select-all-btn" title="Select all visible" aria-label="Select all visible EIDs">Select All</button>
          </div>
        </div>

        <div id="eid-suggestions" class="eid-suggestions-dropdown" role="listbox" style="display: none;"></div>

        <div class="eid-selector-body">
          ${this.options.showHotSection ? '<div class="eid-hot-section" role="region" aria-label="Hot EIDs"></div>' : ''}
          ${this.options.showRecentSection ? '<div class="eid-recent-section" role="region" aria-label="Recent EIDs"></div>' : ''}
          <div class="eid-list-section" role="region" aria-label="All EIDs">
            <div class="eid-list-header">
              <span class="eid-list-title">All EIDs</span>
              <span class="eid-list-count" aria-live="polite">0</span>
            </div>
            <div class="eid-virtual-list" role="list"></div>
          </div>
        </div>

        <div class="eid-selector-footer">
          <span class="eid-selection-count" aria-live="polite" aria-atomic="true">0 selected</span>
          <button class="eid-apply-btn" aria-label="Apply EID selection">Apply Selection</button>
        </div>
      </div>
    `;

    // Apply styles
    this.applyStyles();

    // Cache DOM references
    this.searchInput = this.options.container.querySelector('.eid-search-input');
    this.suggestionsContainer = this.options.container.querySelector('.eid-suggestions-dropdown');

    // Initialize sections
    if (this.options.showHotSection) {
      this.renderHotSection();
    }
    if (this.options.showRecentSection) {
      this.renderRecentSection();
    }

    // Initialize virtual scroll for all EIDs
    this.initializeVirtualScroll();
  }

  private applyStyles(): void {
    const styleId = 'emil-eid-selector-styles';
    
    // Remove existing styles if any
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    this.styleElement = document.createElement('style');
    this.styleElement.id = styleId;
    this.styleElement.textContent = `
      .eid-selector {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
      }

      .eid-selector-header {
        padding: 16px;
        border-bottom: 1px solid #e0e0e0;
      }

      .eid-search-container {
        position: relative;
        margin-bottom: 12px;
      }

      .eid-search-input {
        width: 100%;
        padding: 10px 40px 10px 12px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
        outline: none;
        transition: border-color 0.2s;
      }

      .eid-search-input:focus {
        border-color: #0066cc;
      }

      .eid-search-icon {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
      }

      .eid-suggestions-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        max-height: 300px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ccc;
        border-top: none;
        border-radius: 0 0 4px 4px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
      }

      .eid-suggestion {
        padding: 8px 12px;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
      }

      .eid-suggestion:hover,
      .eid-suggestion.selected,
      .eid-suggestion[aria-selected="true"] {
        background: #f5f5f5;
      }

      .eid-suggestion-primary {
        font-weight: 500;
        color: #333;
      }

      .eid-suggestion-secondary {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }

      .eid-suggestion-match {
        background: #ffeb3b;
        font-weight: bold;
      }

      .eid-selector-actions {
        display: flex;
        gap: 8px;
      }

      .eid-selector-actions button {
        padding: 6px 12px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .eid-selector-actions button:hover {
        background: #f5f5f5;
      }

      .eid-selector-actions button:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }

      .eid-selector-body {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .eid-hot-section,
      .eid-recent-section {
        padding: 12px 16px;
        border-bottom: 1px solid #e0e0e0;
      }

      .eid-section-title {
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .eid-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .eid-chip {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        background: #e8f0fe;
        border: 1px solid #1976d2;
        border-radius: 16px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .eid-chip:hover {
        background: #1976d2;
        color: white;
      }

      .eid-chip:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }

      .eid-chip.selected,
      .eid-chip[aria-pressed="true"] {
        background: #1976d2;
        color: white;
      }

      .eid-trend {
        font-size: 10px;
        margin-left: 4px;
      }

      .eid-trend.rising { color: #4caf50; }
      .eid-trend.falling { color: #f44336; }

      .eid-list-section {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .eid-list-header {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f5f5f5;
      }

      .eid-list-title {
        font-weight: 600;
      }

      .eid-list-count {
        font-size: 12px;
        color: #666;
      }

      .eid-virtual-list {
        flex: 1;
        position: relative;
        min-height: 0;
      }

      .eid-item {
        display: flex;
        align-items: center;
        padding: 8px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        user-select: none;
      }

      .eid-item:hover {
        background: #f5f5f5;
      }

      .eid-item-checkbox {
        margin-right: 12px;
      }

      .eid-item-content {
        flex: 1;
      }

      .eid-item-primary {
        font-size: 14px;
        color: #333;
      }

      .eid-item-secondary {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
      }

      .eid-selector-footer {
        padding: 12px 16px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .eid-selection-count {
        font-size: 14px;
        color: #666;
      }

      .eid-apply-btn {
        padding: 8px 24px;
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
      }

      .eid-apply-btn:hover {
        background: #0052a3;
      }

      .eid-apply-btn:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }

      .eid-apply-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(this.styleElement);
  }

  private attachEventListeners(): void {
    if (!this.searchInput) return;

    // Search input handlers
    this.addEventListener(this.searchInput, 'input', this.handleSearchInput.bind(this));
this.addEventListener(this.searchInput, 'keydown', this.handleSearchKeydown.bind(this) as EventListener);
    this.addEventListener(this.searchInput, 'focus', () => {
      if (this.currentSuggestions.length > 0) {
        this.showSuggestions();
      }
    });

    // Click outside to close suggestions
    this.documentClickHandler = (e: Event) => {
      if (!this.options.container.contains(e.target as Node)) {
        this.hideSuggestions();
      }
    };
    document.addEventListener('click', this.documentClickHandler);

    // Action buttons
    const clearBtn = this.options.container.querySelector('.eid-clear-btn');
    if (clearBtn) {
      this.addEventListener(clearBtn, 'click', () => this.clearSelection());
    }

    const selectAllBtn = this.options.container.querySelector('.eid-select-all-btn');
    if (selectAllBtn) {
      this.addEventListener(selectAllBtn, 'click', () => this.selectAll());
    }

    const applyBtn = this.options.container.querySelector('.eid-apply-btn');
    if (applyBtn) {
      this.addEventListener(applyBtn, 'click', () => this.applySelection());
    }
  }

  // Helper method to track event listeners for cleanup
  private addEventListener(element: Element, event: string, handler: EventListener): void {
    element.addEventListener(event, handler);
    
    if (!this.eventHandlers.has(element)) {
      this.eventHandlers.set(element, new Map());
    }
    this.eventHandlers.get(element)!.set(event, handler);
  }

  private handleSearchInput(e: Event): void {
    const query = (e.target as HTMLInputElement).value.trim();

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(query);
    }, 150);
  }

  private handleSearchKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.navigateSuggestions(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.navigateSuggestions(-1);
        break;
      case 'Enter':
        e.preventDefault();
        this.selectCurrentSuggestion();
        break;
      case 'Escape':
        this.hideSuggestions();
        break;
    }
  }

  private performSearch(query: string): void {
    if (!query) {
      this.currentSuggestions = [];
      this.hideSuggestions();
      return;
    }

    // Search using Trie
    this.currentSuggestions = this.options.registry.search(query, {
      maxResults: 10,
      includeMetadata: true
    });

    if (this.currentSuggestions.length > 0) {
      this.renderSuggestions();
      this.showSuggestions();
    } else {
      this.hideSuggestions();
    }
  }

  private renderSuggestions(): void {
    if (!this.suggestionsContainer) return;

    // Clear existing event listeners on suggestions
    const existingSuggestions = this.suggestionsContainer.querySelectorAll('.eid-suggestion');
    existingSuggestions.forEach(el => {
      const handlers = this.eventHandlers.get(el);
      if (handlers) {
        handlers.forEach((handler, event) => {
          el.removeEventListener(event, handler);
        });
        this.eventHandlers.delete(el);
      }
    });

    const html = this.currentSuggestions
      .map((suggestion, index) => {
        const displayName = EIDParser.getDisplayName(suggestion.eid);
        const highlighted = this.highlightMatch(suggestion.eid, suggestion.matchedPart);
        const isSelected = index === this.selectedSuggestionIndex;
        
        return `
          <div class="eid-suggestion ${isSelected ? 'selected' : ''}" 
               data-index="${index}"
               role="option"
               aria-selected="${isSelected}"
               id="eid-suggestion-${index}">
            <div class="eid-suggestion-primary">${highlighted}</div>
            <div class="eid-suggestion-secondary">${displayName}</div>
          </div>
        `;
      })
      .join('');

    this.suggestionsContainer.innerHTML = html;

    // Add click handlers with proper cleanup tracking
    this.suggestionsContainer.querySelectorAll('.eid-suggestion').forEach((el, index) => {
      this.addEventListener(el, 'click', () => {
        this.selectedSuggestionIndex = index;
        this.selectCurrentSuggestion();
      });
    });

    // Update ARIA attributes
    if (this.searchInput) {
      this.searchInput.setAttribute('aria-expanded', 'true');
      if (this.selectedSuggestionIndex >= 0) {
        this.searchInput.setAttribute('aria-activedescendant', `eid-suggestion-${this.selectedSuggestionIndex}`);
      }
    }
  }

  private highlightMatch(text: string, match: string): string {
    if (!match) return this.escapeHtml(text);
    
    const escapedText = this.escapeHtml(text);
    const index = text.toLowerCase().indexOf(match.toLowerCase());
    if (index === -1) return escapedText;

    return (
      escapedText.substring(0, index) +
      `<span class="eid-suggestion-match">${escapedText.substring(index, index + match.length)}</span>` +
      escapedText.substring(index + match.length)
    );
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private navigateSuggestions(direction: number): void {
    if (this.currentSuggestions.length === 0) return;

    this.selectedSuggestionIndex += direction;

    if (this.selectedSuggestionIndex < 0) {
      this.selectedSuggestionIndex = this.currentSuggestions.length - 1;
    } else if (this.selectedSuggestionIndex >= this.currentSuggestions.length) {
      this.selectedSuggestionIndex = 0;
    }

    this.renderSuggestions();
  }

  private selectCurrentSuggestion(): void {
if (this.selectedSuggestionIndex >= 0 && 
        this.selectedSuggestionIndex < this.currentSuggestions.length) {
      const suggestion = this.currentSuggestions[this.selectedSuggestionIndex];
      if (suggestion) {
        this.toggleEIDSelection(suggestion.eid);
        
        // Record usage for hot tracking
        this.options.registry.recordUsage(suggestion.eid);
      }
      
      // Clear search
      if (this.searchInput) {
        this.searchInput.value = '';
      }
      this.hideSuggestions();
      
      // Update UI
      this.updateSelectionCount();
      this.refreshSections();
    }
  }

  private showSuggestions(): void {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.style.display = 'block';
      if (this.searchInput) {
        this.searchInput.setAttribute('aria-expanded', 'true');
      }
    }
  }

  private hideSuggestions(): void {
    if (this.suggestionsContainer) {
      this.suggestionsContainer.style.display = 'none';
    }
    if (this.searchInput) {
      this.searchInput.setAttribute('aria-expanded', 'false');
      this.searchInput.removeAttribute('aria-activedescendant');
    }
    this.selectedSuggestionIndex = -1;
  }

  private renderHotSection(): void {
    const container = this.options.container.querySelector('.eid-hot-section');
    if (!container) return;

    // Clean up existing event listeners
    const existingChips = container.querySelectorAll('.eid-chip');
    existingChips.forEach(chip => {
      const handlers = this.eventHandlers.get(chip);
      if (handlers) {
        handlers.forEach((handler, event) => {
          chip.removeEventListener(event, handler);
        });
        this.eventHandlers.delete(chip);
      }
    });

    const hotEIDs = this.options.registry.getHotEIDs(8);

    const html = `
      <div class="eid-section-title">
        🔥 Hot EIDs
      </div>
      <div class="eid-chips" role="group" aria-label="Hot EIDs">
        ${hotEIDs.map(entry => {
          const isSelected = this.selectedEIDs.has(entry.eid);
          return `
          <button class="eid-chip ${isSelected ? 'selected' : ''}" 
               data-eid="${this.escapeHtml(entry.eid)}"
               title="${this.escapeHtml(entry.eid)}"
               aria-pressed="${isSelected}"
               role="button">
            ${this.escapeHtml(EIDParser.extractRADType(entry.eid))}
            <span class="eid-trend ${entry.trend}" aria-label="${entry.trend} trend">${
              entry.trend === 'rising' ? '↑' : 
              entry.trend === 'falling' ? '↓' : 
              '→'
            }</span>
          </button>
        `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;

    // Add click handlers with tracking
    container.querySelectorAll('.eid-chip').forEach(chip => {
      this.addEventListener(chip, 'click', () => {
        const eid = chip.getAttribute('data-eid');
        if (eid) {
          this.toggleEIDSelection(eid);
          chip.classList.toggle('selected');
          chip.setAttribute('aria-pressed', String(this.selectedEIDs.has(eid)));
          this.updateSelectionCount();
        }
      });
    });
  }

  private renderRecentSection(): void {
    const container = this.options.container.querySelector('.eid-recent-section');
    if (!container) return;

    // Clean up existing event listeners
    const existingChips = container.querySelectorAll('.eid-chip');
    existingChips.forEach(chip => {
      const handlers = this.eventHandlers.get(chip);
      if (handlers) {
        handlers.forEach((handler, event) => {
          chip.removeEventListener(event, handler);
        });
        this.eventHandlers.delete(chip);
      }
    });

    const recentEIDs = this.options.registry.getRecentEIDs(5);

    const html = `
      <div class="eid-section-title">
        🕐 Recent EIDs
      </div>
      <div class="eid-chips" role="group" aria-label="Recent EIDs">
        ${recentEIDs.map(metadata => {
          const isSelected = this.selectedEIDs.has(metadata.eid);
          return `
          <button class="eid-chip ${isSelected ? 'selected' : ''}" 
               data-eid="${this.escapeHtml(metadata.eid)}"
               title="${this.escapeHtml(metadata.eid)}"
               aria-pressed="${isSelected}"
               role="button">
            ${this.escapeHtml(EIDParser.extractRADType(metadata.eid))}
          </button>
        `;
        }).join('')}
      </div>
    `;

    container.innerHTML = html;

    // Add click handlers with tracking
    container.querySelectorAll('.eid-chip').forEach(chip => {
      this.addEventListener(chip, 'click', () => {
        const eid = chip.getAttribute('data-eid');
        if (eid) {
          this.toggleEIDSelection(eid);
          chip.classList.toggle('selected');
          chip.setAttribute('aria-pressed', String(this.selectedEIDs.has(eid)));
          this.updateSelectionCount();
        }
      });
    });
  }

  private initializeVirtualScroll(): void {
    const container = this.options.container.querySelector('.eid-virtual-list') as HTMLElement;
    if (!container) return;

    // Get all EIDs from registry
    const allEIDs = this.options.registry.exportState().eids;

    // Update count
    const countEl = this.options.container.querySelector('.eid-list-count');
    if (countEl) {
      countEl.textContent = `${allEIDs.length} total`;
    }

    // Create virtual scroll
    this.virtualScroll = new VirtualScroll({
      container,
      itemHeight: 60,
      buffer: 5,
      totalItems: allEIDs.length,
renderItem: (index) => {
        const metadata = allEIDs[index];
        if (metadata) {
          return this.renderEIDItem(metadata);
        }
        // Return empty element if metadata is undefined
        const div = document.createElement('div');
        return div;
      }
    });
  }

  private renderEIDItem(metadata: EIDMetadata): HTMLElement {
    const div = document.createElement('div');
    div.className = 'eid-item';
    div.dataset.eid = metadata.eid;
    div.setAttribute('role', 'listitem');

    const isSelected = this.selectedEIDs.has(metadata.eid);
    const checkboxId = `eid-checkbox-${metadata.eid.replace(/\./g, '-')}`;

    const checkbox = this.options.multiSelect ? `
      <input type="checkbox" 
             class="eid-item-checkbox"
             id="${checkboxId}"
             ${isSelected ? 'checked' : ''}
             aria-label="Select ${this.escapeHtml(metadata.eid)}" />
    ` : '';

    div.innerHTML = `
      ${checkbox}
      <div class="eid-item-content">
        <div class="eid-item-primary">${this.escapeHtml(metadata.eid)}</div>
        <div class="eid-item-secondary">
          ${this.escapeHtml(EIDParser.getDisplayName(metadata.eid))} 
          · ${metadata.frequency} events
        </div>
      </div>
    `;

    // Add click handler
    this.addEventListener(div, 'click', (e: Event) => {
      if ((e.target as HTMLElement).classList.contains('eid-item-checkbox')) {
        return; // Let checkbox handle it
      }
      this.toggleEIDSelection(metadata.eid);
      const checkbox = div.querySelector('.eid-item-checkbox') as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = this.selectedEIDs.has(metadata.eid);
      }
      this.updateSelectionCount();
    });

    return div;
  }

  private toggleEIDSelection(eid: string): void {
    if (!this.options.multiSelect) {
      this.selectedEIDs.clear();
    }

    if (this.selectedEIDs.has(eid)) {
      this.selectedEIDs.delete(eid);
    } else {
      this.selectedEIDs.add(eid);
    }

    this.options.onSelectionChange?.(Array.from(this.selectedEIDs));
  }

  private clearSelection(): void {
    this.selectedEIDs.clear();
    this.updateSelectionCount();
    this.refreshSections();
    this.virtualScroll?.refresh();
    this.options.onSelectionChange?.([]);
  }

  private selectAll(): void {
    // Select all visible EIDs
    const allEIDs = this.options.registry.exportState().eids;
    allEIDs.forEach(metadata => {
      this.selectedEIDs.add(metadata.eid);
    });
    this.updateSelectionCount();
    this.refreshSections();
    this.virtualScroll?.refresh();
    this.options.onSelectionChange?.(Array.from(this.selectedEIDs));
  }

  private applySelection(): void {
    this.options.onSelect?.(Array.from(this.selectedEIDs));
  }

  private updateSelectionCount(): void {
    const countEl = this.options.container.querySelector('.eid-selection-count');
    if (countEl) {
      const count = this.selectedEIDs.size;
      countEl.textContent = `${count} selected`;
      countEl.setAttribute('aria-label', `${count} EIDs selected`);
    }

    const applyBtn = this.options.container.querySelector('.eid-apply-btn') as HTMLButtonElement;
    if (applyBtn) {
      applyBtn.disabled = this.selectedEIDs.size === 0;
    }
  }

  private refreshSections(): void {
    if (this.options.showHotSection) {
      this.renderHotSection();
    }
    if (this.options.showRecentSection) {
      this.renderRecentSection();
    }
  }

  /**
   * Get selected EIDs
   */
  getSelectedEIDs(): string[] {
    return Array.from(this.selectedEIDs);
  }

  /**
   * Set selected EIDs programmatically
   */
  setSelectedEIDs(eids: string[]): void {
    this.selectedEIDs = new Set(eids);
    this.updateSelectionCount();
    this.refreshSections();
    this.virtualScroll?.refresh();
  }

  /**
   * Destroy the component and clean up all resources
   */
  destroy(): void {
    // Clear timers
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Remove all tracked event listeners
    this.eventHandlers.forEach((handlers, element) => {
      handlers.forEach((handler, event) => {
        element.removeEventListener(event, handler);
      });
    });
    this.eventHandlers.clear();

    // Remove document click handler
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }

    // Destroy virtual scroll
    if (this.virtualScroll) {
      this.virtualScroll.destroy();
      this.virtualScroll = null;
    }

    // Remove styles
    if (this.styleElement && this.styleElement.parentNode) {
      this.styleElement.remove();
      this.styleElement = null;
    }

    // Clear DOM references
    this.searchInput = null;
    this.suggestionsContainer = null;

    // Clear data
    this.selectedEIDs.clear();
    this.currentSuggestions = [];

    // Clear container
    this.options.container.innerHTML = '';
  }
}