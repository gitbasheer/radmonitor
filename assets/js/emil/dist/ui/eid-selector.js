/**
 * EID Selector Component - Main UI for EID search and selection
 * Integrates Trie search, virtual scrolling, and autocomplete
 */
import { VirtualScroll } from './virtual-scroll.js';
import { EIDParser } from '../utils/eid-parser.js';
import DOMPurify from './../../../lib/dompurify.js';

export class EIDSelector {
    constructor(options) {
        this.selectedEIDs = new Set();
        this.virtualScroll = null;
        this.currentSuggestions = [];
        this.selectedSuggestionIndex = -1;
        this.debounceTimer = null;
        this.options = {
            multiSelect: true,
            showHotSection: true,
            showRecentSection: true,
            ...options
        };
        this.render();
        this.attachEventListeners();
    }
    render() {
        // Create main container structure
        this.options.container.innerHTML = DOMPurify.sanitize(`
      <div class="eid-selector">
        <div class="eid-selector-header">
          <div class="eid-search-container">
            <input
              type="text"
              class="eid-search-input"
              placeholder="Search EIDs (e.g., pandc.vnext.recommendations...)"
              autocomplete="off"
              spellcheck="false"
            />
            <div class="eid-search-icon">🔍</div>
          </div>
          <div class="eid-selector-actions">
            <button class="eid-clear-btn" title="Clear selection">Clear</button>
            <button class="eid-select-all-btn" title="Select all visible">Select All</button>
          </div>
        </div>

        <div class="eid-suggestions-dropdown" style="display: none;"></div>

        <div class="eid-selector-body">
          ${this.options.showHotSection ? '<div class="eid-hot-section"></div>' : ''}
          ${this.options.showRecentSection ? '<div class="eid-recent-section"></div>' : ''}
          <div class="eid-list-section">
            <div class="eid-list-header">
              <span class="eid-list-title">All EIDs</span>
              <span class="eid-list-count">0</span>
            </div>
            <div class="eid-virtual-list"></div>
          </div>
        </div>

        <div class="eid-selector-footer">
          <span class="eid-selection-count">0 selected</span>
          <button class="eid-apply-btn">Apply Selection</button>
        </div>
      </div>
    `);
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
    applyStyles() {
        const style = document.createElement('style');
        style.textContent = `
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
      .eid-suggestion.selected {
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

      .eid-chip.selected {
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

      .eid-apply-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
    `;
        document.head.appendChild(style);
    }
    attachEventListeners() {
        // Search input
        this.searchInput.addEventListener('input', this.handleSearchInput.bind(this));
        this.searchInput.addEventListener('keydown', this.handleSearchKeydown.bind(this));
        this.searchInput.addEventListener('focus', () => {
            if (this.currentSuggestions.length > 0) {
                this.showSuggestions();
            }
        });
        // Click outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!this.options.container.contains(e.target)) {
                this.hideSuggestions();
            }
        });
        // Action buttons
        const clearBtn = this.options.container.querySelector('.eid-clear-btn');
        clearBtn?.addEventListener('click', () => this.clearSelection());
        const selectAllBtn = this.options.container.querySelector('.eid-select-all-btn');
        selectAllBtn?.addEventListener('click', () => this.selectAll());
        const applyBtn = this.options.container.querySelector('.eid-apply-btn');
        applyBtn?.addEventListener('click', () => this.applySelection());
    }
    handleSearchInput(e) {
        const query = e.target.value.trim();
        // Debounce search
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = window.setTimeout(() => {
            this.performSearch(query);
        }, 150);
    }
    handleSearchKeydown(e) {
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
    performSearch(query) {
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
        }
        else {
            this.hideSuggestions();
        }
    }
    renderSuggestions() {
        const html = this.currentSuggestions
            .map((suggestion, index) => {
            const displayName = EIDParser.getDisplayName(suggestion.eid);
            const highlighted = this.highlightMatch(suggestion.eid, suggestion.matchedPart);
            return `
          <div class="eid-suggestion ${index === this.selectedSuggestionIndex ? 'selected' : ''}"
               data-index="${index}">
            <div class="eid-suggestion-primary">${highlighted}</div>
            <div class="eid-suggestion-secondary">${displayName}</div>
          </div>
        `;
        })
            .join('');
        this.suggestionsContainer.innerHTML = DOMPurify.sanitize(html);
        // Add click handlers
        this.suggestionsContainer.querySelectorAll('.eid-suggestion').forEach((el, index) => {
            el.addEventListener('click', () => {
                this.selectedSuggestionIndex = index;
                this.selectCurrentSuggestion();
            });
        });
    }
    highlightMatch(text, match) {
        const index = text.toLowerCase().indexOf(match.toLowerCase());
        if (index === -1)
            return text;
        return (text.substring(0, index) +
            `<span class="eid-suggestion-match">${text.substring(index, index + match.length)}</span>` +
            text.substring(index + match.length));
    }
    navigateSuggestions(direction) {
        if (this.currentSuggestions.length === 0)
            return;
        this.selectedSuggestionIndex += direction;
        if (this.selectedSuggestionIndex < 0) {
            this.selectedSuggestionIndex = this.currentSuggestions.length - 1;
        }
        else if (this.selectedSuggestionIndex >= this.currentSuggestions.length) {
            this.selectedSuggestionIndex = 0;
        }
        this.renderSuggestions();
    }
    selectCurrentSuggestion() {
        if (this.selectedSuggestionIndex >= 0 &&
            this.selectedSuggestionIndex < this.currentSuggestions.length) {
            const suggestion = this.currentSuggestions[this.selectedSuggestionIndex];
            if (suggestion) {
                this.toggleEIDSelection(suggestion.eid);
                // Record usage for hot tracking
                this.options.registry.recordUsage(suggestion.eid);
            }
            // Clear search
            this.searchInput.value = '';
            this.hideSuggestions();
            // Update UI
            this.updateSelectionCount();
            this.refreshSections();
        }
    }
    showSuggestions() {
        this.suggestionsContainer.style.display = 'block';
    }
    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
        this.selectedSuggestionIndex = -1;
    }
    renderHotSection() {
        const container = this.options.container.querySelector('.eid-hot-section');
        if (!container)
            return;
        const hotEIDs = this.options.registry.getHotEIDs(8);
        const html = `
      <div class="eid-section-title">
        🔥 Hot EIDs
      </div>
      <div class="eid-chips">
        ${hotEIDs.map(entry => `
          <div class="eid-chip ${this.selectedEIDs.has(entry.eid) ? 'selected' : ''}"
               data-eid="${entry.eid}"
               title="${entry.eid}">
            ${EIDParser.extractRADType(entry.eid)}
            <span class="eid-trend ${entry.trend}">${entry.trend === 'rising' ? '↑' :
            entry.trend === 'falling' ? '↓' :
                '→'}</span>
          </div>
        `).join('')}
      </div>
    `;
        container.innerHTML = DOMPurify.sanitize(html);
        // Add click handlers
        container.querySelectorAll('.eid-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const eid = chip.getAttribute('data-eid');
                this.toggleEIDSelection(eid);
                chip.classList.toggle('selected');
                this.updateSelectionCount();
            });
        });
    }
    renderRecentSection() {
        const container = this.options.container.querySelector('.eid-recent-section');
        if (!container)
            return;
        const recentEIDs = this.options.registry.getRecentEIDs(5);
        const html = `
      <div class="eid-section-title">
        🕐 Recent EIDs
      </div>
      <div class="eid-chips">
        ${recentEIDs.map(metadata => `
          <div class="eid-chip ${this.selectedEIDs.has(metadata.eid) ? 'selected' : ''}"
               data-eid="${metadata.eid}"
               title="${metadata.eid}">
            ${EIDParser.extractRADType(metadata.eid)}
          </div>
        `).join('')}
      </div>
    `;
        container.innerHTML = DOMPurify.sanitize(html);
        // Add click handlers
        container.querySelectorAll('.eid-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const eid = chip.getAttribute('data-eid');
                this.toggleEIDSelection(eid);
                chip.classList.toggle('selected');
                this.updateSelectionCount();
            });
        });
    }
    initializeVirtualScroll() {
        const container = this.options.container.querySelector('.eid-virtual-list');
        if (!container)
            return;
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
    renderEIDItem(metadata) {
        const div = document.createElement('div');
        div.className = 'eid-item';
        div.dataset.eid = metadata.eid;
        const checkbox = this.options.multiSelect ? `
      <input type="checkbox" class="eid-item-checkbox"
             ${this.selectedEIDs.has(metadata.eid) ? 'checked' : ''} />
    ` : '';
        div.innerHTML = DOMPurify.sanitize(`
      ${checkbox}
      <div class="eid-item-content">
        <div class="eid-item-primary">${metadata.eid}</div>
        <div class="eid-item-secondary">
          ${EIDParser.getDisplayName(metadata.eid)}
          · ${metadata.frequency} events
        </div>
      </div>
    `);
        // Add click handler
        div.addEventListener('click', (e) => {
            if (e.target.classList.contains('eid-item-checkbox')) {
                return; // Let checkbox handle it
            }
            this.toggleEIDSelection(metadata.eid);
            const checkbox = div.querySelector('.eid-item-checkbox');
            if (checkbox) {
                checkbox.checked = this.selectedEIDs.has(metadata.eid);
            }
            this.updateSelectionCount();
        });
        return div;
    }
    toggleEIDSelection(eid) {
        if (!this.options.multiSelect) {
            this.selectedEIDs.clear();
        }
        if (this.selectedEIDs.has(eid)) {
            this.selectedEIDs.delete(eid);
        }
        else {
            this.selectedEIDs.add(eid);
        }
        this.options.onSelectionChange?.(Array.from(this.selectedEIDs));
    }
    clearSelection() {
        this.selectedEIDs.clear();
        this.updateSelectionCount();
        this.refreshSections();
        this.virtualScroll?.refresh();
        this.options.onSelectionChange?.([]);
    }
    selectAll() {
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
    applySelection() {
        this.options.onSelect?.(Array.from(this.selectedEIDs));
    }
    updateSelectionCount() {
        const countEl = this.options.container.querySelector('.eid-selection-count');
        if (countEl) {
            countEl.textContent = `${this.selectedEIDs.size} selected`;
        }
        const applyBtn = this.options.container.querySelector('.eid-apply-btn');
        if (applyBtn) {
            applyBtn.disabled = this.selectedEIDs.size === 0;
        }
    }
    refreshSections() {
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
    getSelectedEIDs() {
        return Array.from(this.selectedEIDs);
    }
    /**
     * Set selected EIDs programmatically
     */
    setSelectedEIDs(eids) {
        this.selectedEIDs = new Set(eids);
        this.updateSelectionCount();
        this.refreshSections();
        this.virtualScroll?.refresh();
    }
    /**
     * Destroy the component
     */
    destroy() {
        this.virtualScroll?.destroy();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
    }
}
//# sourceMappingURL=eid-selector.js.map
