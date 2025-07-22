/**
 * RAD Filter Component - Filter events by RAD type in Event Details UI
 */

import { EIDParser } from '../emil/utils/eid-parser.js';

export class RADFilter {
  constructor(container) {
    this.container = container;
    this.selectedRADs = new Set();
    this.onFilterChange = null;
    this.radCounts = new Map();
    this.totalEventCount = 0;
  }

  /**
   * Initialize the filter with event data
   * @param {Array} events - Array of event objects with event_id field
   */
  init(events = []) {
    this.updateRADCounts(events);
    this.render();
  }

    /**
   * Update RAD counts from events
   */
  updateRADCounts(events) {
    this.radCounts.clear();
    this.totalEventCount = events.length || 0;

    events.forEach(event => {
      const eid = event.event_id || event.eventId || event.eid || '';
      const radIdentifier = EIDParser.extractRADIdentifier(eid);

      if (!this.radCounts.has(radIdentifier)) {
        this.radCounts.set(radIdentifier, {
          count: 0,
          displayName: EIDParser.getRADDisplayName(radIdentifier)
        });
      }

      this.radCounts.get(radIdentifier).count++;
    });
  }

  /**
   * Get total event count
   */
  getTotalEventCount() {
    return this.totalEventCount || 0;
  }

  /**
   * Render the filter UI
   */
  render() {
    if (!this.container) return;

    // Sort RADs by count (descending) and then by name
    const sortedRADs = Array.from(this.radCounts.entries())
      .sort((a, b) => {
        if (b[1].count !== a[1].count) {
          return b[1].count - a[1].count;
        }
        return a[1].displayName.localeCompare(b[1].displayName);
      });

    const html = `
      <div class="rad-filter-container">
        <div class="rad-filter-header">
          <span class="rad-filter-title">Filter by RAD:</span>
          ${this.selectedRADs.size > 0 ? `
            <button class="rad-filter-clear" data-action="clear">
              Clear (${this.selectedRADs.size})
            </button>
          ` : ''}
        </div>
        <div class="rad-filter-chips">
          <button class="rad-filter-chip ${this.selectedRADs.size === 0 ? 'active' : ''}"
                  data-rad="all">
            All RADs (${this.getTotalEventCount()})
          </button>
          ${sortedRADs.map(([radId, data]) => `
            <button class="rad-filter-chip ${this.selectedRADs.has(radId) ? 'active' : ''}"
                    data-rad="${radId}">
              ${data.displayName} (${data.count})
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
    this.applyStyles();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const chips = this.container.querySelectorAll('.rad-filter-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        const radId = e.target.dataset.rad;
        this.handleChipClick(radId);
      });
    });

    const clearBtn = this.container.querySelector('.rad-filter-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }
  }

  /**
   * Handle chip click
   */
  handleChipClick(radId) {
    if (radId === 'all') {
      this.selectedRADs.clear();
    } else {
      if (this.selectedRADs.has(radId)) {
        this.selectedRADs.delete(radId);
      } else {
        this.selectedRADs.add(radId);
      }
    }

    this.updateUI();
    this.notifyFilterChange();
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.selectedRADs.clear();
    this.updateUI();
    this.notifyFilterChange();
  }

  /**
   * Update UI state
   */
  updateUI() {
    const chips = this.container.querySelectorAll('.rad-filter-chip');
    chips.forEach(chip => {
      const radId = chip.dataset.rad;
      if (radId === 'all') {
        chip.classList.toggle('active', this.selectedRADs.size === 0);
      } else {
        chip.classList.toggle('active', this.selectedRADs.has(radId));
      }
    });

    // Update clear button visibility
    const clearBtn = this.container.querySelector('.rad-filter-clear');
    if (clearBtn) {
      clearBtn.style.display = this.selectedRADs.size > 0 ? 'inline-block' : 'none';
    }
  }

  /**
   * Notify filter change
   */
  notifyFilterChange() {
    if (typeof this.onFilterChange === 'function') {
      this.onFilterChange(this.getActiveFilters());
    }
  }

  /**
   * Get active filters
   */
  getActiveFilters() {
    return Array.from(this.selectedRADs);
  }

  /**
   * Filter events based on active filters
   * @param {Array} events - Array of event objects
   * @returns {Array} Filtered events
   */
  filterEvents(events) {
    if (this.selectedRADs.size === 0) {
      return events;
    }

    return events.filter(event => {
      const eid = event.event_id || event.eventId || event.eid || '';
      const radIdentifier = EIDParser.extractRADIdentifier(eid);
      return this.selectedRADs.has(radIdentifier);
    });
  }

  /**
   * Apply component styles
   */
  applyStyles() {
    if (document.getElementById('rad-filter-styles')) return;

    const style = document.createElement('style');
    style.id = 'rad-filter-styles';
    style.textContent = `
      .rad-filter-container {
        margin: 15px 0;
        padding: 15px;
        background: var(--rad-bg-secondary, #f8f9fa);
        border-radius: 8px;
        border: 1px solid var(--rad-border-secondary, #e9ecef);
      }

      .rad-filter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }

      .rad-filter-title {
        font-weight: 600;
        color: var(--rad-text-primary, #333);
        font-size: 14px;
      }

      .rad-filter-clear {
        background: none;
        border: none;
        color: var(--rad-primary, #ff6900);
        cursor: pointer;
        font-size: 13px;
        padding: 4px 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }

      .rad-filter-clear:hover {
        background: rgba(255, 105, 0, 0.1);
      }

      .rad-filter-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .rad-filter-chip {
        padding: 6px 12px;
        border: 1px solid var(--rad-border-primary, #dee2e6);
        background: white;
        border-radius: 20px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--rad-text-secondary, #666);
        white-space: nowrap;
      }

      .rad-filter-chip:hover {
        border-color: var(--rad-primary, #ff6900);
        color: var(--rad-primary, #ff6900);
      }

      .rad-filter-chip.active {
        background: var(--rad-primary, #ff6900);
        color: white;
        border-color: var(--rad-primary, #ff6900);
      }

      @media (max-width: 768px) {
        .rad-filter-chips {
          gap: 6px;
        }

        .rad-filter-chip {
          padding: 4px 10px;
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export for use in other modules
window.RADFilter = RADFilter;
