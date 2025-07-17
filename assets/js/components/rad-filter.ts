/**
 * RAD Filter Component - Filter events by RAD type in Event Details UI
 */

import { EIDParser } from '../emil/utils/eid-parser.js';

interface RADInfo {
  count: number;
  displayName: string;
}

interface EventData {
  event_id?: string;
  eventId?: string;
  eid?: string;
  id?: string;
  [key: string]: any;
}

export class RADFilter {
  private container: HTMLElement;
  private selectedRADs: Set<string>;
  private radCounts: Map<string, RADInfo>;
  public onFilterChange: ((filters: string[]) => void) | null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.selectedRADs = new Set();
    this.onFilterChange = null;
    this.radCounts = new Map();
  }

  /**
   * Initialize the filter with event data
   * @param events - Array of event objects with event_id field
   */
  init(events: EventData[] = []): void {
    this.updateRADCounts(events);
    this.render();
  }

  /**
   * Update RAD counts from events
   */
  private updateRADCounts(events: EventData[]): void {
    this.radCounts.clear();

    events.forEach(event => {
      const eid = event.event_id || event.eventId || event.eid || event.id || '';
      const radIdentifier = EIDParser.extractRADIdentifier(eid);

      if (!this.radCounts.has(radIdentifier)) {
        this.radCounts.set(radIdentifier, {
          count: 0,
          displayName: EIDParser.getRADDisplayName(radIdentifier)
        });
      }

      const radInfo = this.radCounts.get(radIdentifier);
      if (radInfo) {
        radInfo.count++;
      }
    });
  }

  /**
   * Render the filter UI
   */
  private render(): void {
    if (!this.container) return;

    const totalRADs = this.radCounts.size;
    const selectedCount = this.selectedRADs.size;

    let html = `
      <div class="rad-filter">
        <div class="rad-filter-header">
          <span class="rad-filter-title">RAD Types (${selectedCount}/${totalRADs})</span>
          ${selectedCount > 0 ? 
            '<button class="rad-filter-clear" data-action="clear-all">Clear</button>' : 
            ''
          }
        </div>
        <div class="rad-filter-chips">
    `;

    // Convert to array and sort by count
    const sortedRADs = Array.from(this.radCounts.entries())
      .sort((a, b) => b[1].count - a[1].count);

    sortedRADs.forEach(([radId, info]) => {
      const isSelected = this.selectedRADs.has(radId);
      html += this.createChipHTML(radId, info, isSelected);
    });

    html += '</div></div>';
    this.container.innerHTML = html;

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Create HTML for a single RAD chip
   */
  private createChipHTML(radId: string, info: RADInfo, isSelected: boolean): string {
    return `
      <div class="rad-chip ${isSelected ? 'selected' : ''}" data-rad-id="${radId}">
        <span class="rad-chip-name">${info.displayName}</span>
        <span class="rad-chip-count">${info.count}</span>
      </div>
    `;
  }

  /**
   * Attach event listeners to the filter UI
   */
  private attachEventListeners(): void {
    // Chip click handlers
    const chips = this.container.querySelectorAll('.rad-chip');
    chips.forEach((chip: Element) => {
      chip.addEventListener('click', (e: Event) => {
        const target = e.currentTarget as HTMLElement;
        const radId = target.dataset.radId;
        if (radId) {
          this.toggleRAD(radId);
        }
      });
    });

    // Clear all button
    const clearBtn = this.container.querySelector('[data-action="clear-all"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAll();
      });
    }
  }

  /**
   * Toggle a RAD selection
   */
  private toggleRAD(radId: string): void {
    if (this.selectedRADs.has(radId)) {
      this.selectedRADs.delete(radId);
    } else {
      this.selectedRADs.add(radId);
    }

    this.render();
    this.notifyFilterChange();
  }

  /**
   * Clear all selections
   */
  private clearAll(): void {
    this.selectedRADs.clear();
    this.render();
    this.notifyFilterChange();
  }

  /**
   * Notify about filter changes
   */
  private notifyFilterChange(): void {
    if (this.onFilterChange) {
      const filters = Array.from(this.selectedRADs);
      this.onFilterChange(filters);
    }
  }

  /**
   * Update filter with new events
   */
  update(events: EventData[]): void {
    this.updateRADCounts(events);
    this.render();
  }

  /**
   * Get current filter state
   */
  getActiveFilters(): string[] {
    return Array.from(this.selectedRADs);
  }

  /**
   * Set active filters programmatically
   */
  setActiveFilters(filters: string[]): void {
    this.selectedRADs = new Set(filters);
    this.render();
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).RADFilter = RADFilter;
}