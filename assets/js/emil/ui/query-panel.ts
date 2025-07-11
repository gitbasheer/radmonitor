/**
 * Query Panel - Quick actions for selected EIDs
 */

import { QueryIntent } from '../esql/template-types.js';
import { ESQLExecutor } from '../services/esql-executor.js';
import { QueryResultsViewer } from './query-results-viewer.js';
import { getTemplateIds, getTemplate } from '../esql/query-templates.js';

export interface QueryPanelOptions {
  container: HTMLElement;
  executor: ESQLExecutor;
  onQueryStart?: () => void;
  onQueryComplete?: () => void;
}

export class QueryPanel {
  private options: QueryPanelOptions;
  private selectedEIDs: string[] = [];
  private resultsViewer: QueryResultsViewer;
  private isLoading: boolean = false;

  constructor(options: QueryPanelOptions) {
    this.options = options;
    this.resultsViewer = new QueryResultsViewer({
      container: document.body
    });
    
    this.render();
  }

  /**
   * Update selected EIDs
   */
  updateEIDs(eids: string[]): void {
    this.selectedEIDs = eids;
    this.updateUI();
  }

  /**
   * Render the query panel
   */
  private render(): void {
    this.options.container.innerHTML = `
      <div class="emil-query-panel">
        <div class="emil-query-header">
          <h3>Quick Actions</h3>
          <span class="emil-query-status"></span>
        </div>
        
        <div class="emil-query-actions">
          <button class="emil-query-btn" data-action="health-check" disabled>
            <span class="emil-query-icon">🏥</span>
            <span class="emil-query-label">Health Check</span>
            <span class="emil-query-desc">Check current status</span>
          </button>
          
          <button class="emil-query-btn" data-action="baseline-compare" disabled>
            <span class="emil-query-icon">📊</span>
            <span class="emil-query-label">Compare Baseline</span>
            <span class="emil-query-desc">vs. last week</span>
          </button>
          
          <button class="emil-query-btn" data-action="trend-analysis" disabled>
            <span class="emil-query-icon">📈</span>
            <span class="emil-query-label">Trend Analysis</span>
            <span class="emil-query-desc">24h trends</span>
          </button>
          
          <button class="emil-query-btn" data-action="performance" disabled>
            <span class="emil-query-icon">⚡</span>
            <span class="emil-query-label">Performance</span>
            <span class="emil-query-desc">Latency metrics</span>
          </button>
        </div>

        <div class="emil-query-advanced">
          <details>
            <summary>Advanced Options</summary>
            <div class="emil-query-params">
              <label>
                Time Window:
                <select id="emil-time-window">
                  <option value="15m">Last 15 minutes</option>
                  <option value="1h" selected>Last hour</option>
                  <option value="6h">Last 6 hours</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </label>
              
              <label>
                Baseline Period:
                <select id="emil-baseline-period">
                  <option value="yesterday">Yesterday</option>
                  <option value="last-week" selected>Last week</option>
                  <option value="last-month">Last month</option>
                </select>
              </label>
            </div>
          </details>
        </div>

        <div class="emil-query-custom">
          <button class="emil-query-btn-custom" disabled>
            <span class="emil-query-icon">🔧</span>
            Custom Query Builder
          </button>
        </div>
      </div>
    `;

    this.applyStyles();
    this.attachEventListeners();
  }

  /**
   * Apply panel styles
   */
  private applyStyles(): void {
    const styleId = 'emil-query-panel-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .emil-query-panel {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 20px;
      }

      .emil-query-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .emil-query-header h3 {
        margin: 0;
        font-size: 18px;
        color: #333;
      }

      .emil-query-status {
        font-size: 12px;
        color: #666;
      }

      .emil-query-actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .emil-query-btn {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .emil-query-btn:hover:not(:disabled) {
        border-color: #0066cc;
        box-shadow: 0 2px 8px rgba(0, 102, 204, 0.1);
      }

      .emil-query-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .emil-query-btn.loading {
        background: #f5f5f5;
      }

      .emil-query-icon {
        font-size: 24px;
      }

      .emil-query-label {
        font-weight: 600;
        font-size: 14px;
        color: #333;
      }

      .emil-query-desc {
        font-size: 11px;
        color: #666;
      }

      .emil-query-advanced {
        margin-bottom: 16px;
      }

      .emil-query-advanced summary {
        cursor: pointer;
        font-size: 14px;
        color: #666;
        padding: 8px 0;
      }

      .emil-query-params {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }

      .emil-query-params label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        color: #666;
      }

      .emil-query-params select {
        padding: 6px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 14px;
      }

      .emil-query-btn-custom {
        width: 100%;
        padding: 12px;
        background: #f5f5f5;
        border: 1px dashed #ccc;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .emil-query-btn-custom:hover:not(:disabled) {
        background: #eeeeee;
        border-color: #999;
      }

      .emil-query-btn-custom:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @keyframes emil-pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }

      .emil-query-btn.loading .emil-query-icon {
        animation: emil-pulse 1.5s ease-in-out infinite;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Action buttons
    const actionButtons = this.options.container.querySelectorAll('.emil-query-btn[data-action]');
    actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.currentTarget as HTMLElement).dataset.action!;
        this.executeQuery(action as any);
      });
    });

    // Custom query builder (placeholder)
    const customBtn = this.options.container.querySelector('.emil-query-btn-custom');
    customBtn?.addEventListener('click', () => {
      alert('Custom Query Builder coming in Phase 3');
    });
  }

  /**
   * Update UI based on selected EIDs
   */
  private updateUI(): void {
    const hasEIDs = this.selectedEIDs.length > 0;
    const buttons = this.options.container.querySelectorAll('button');
    
    buttons.forEach(btn => {
      (btn as HTMLButtonElement).disabled = !hasEIDs || this.isLoading;
    });

    // Update status
    const status = this.options.container.querySelector('.emil-query-status');
    if (status) {
      if (this.isLoading) {
        status.textContent = 'Executing query...';
      } else if (hasEIDs) {
        status.textContent = `${this.selectedEIDs.length} EID${this.selectedEIDs.length > 1 ? 's' : ''} selected`;
      } else {
        status.textContent = 'Select EIDs to enable actions';
      }
    }
  }

  /**
   * Execute query based on action
   */
  private async executeQuery(action: string): Promise<void> {
    if (this.selectedEIDs.length === 0 || this.isLoading) return;

    this.isLoading = true;
    this.options.onQueryStart?.();

    // Update button state
    const button = this.options.container.querySelector(`[data-action="${action}"]`);
    button?.classList.add('loading');

    this.updateUI();

    try {
      // Get parameters from UI
      const timeWindow = (document.getElementById('emil-time-window') as HTMLSelectElement)?.value || '1h';
      const baselinePeriod = (document.getElementById('emil-baseline-period') as HTMLSelectElement)?.value || 'last-week';

      // Build intent
      const intent: QueryIntent = {
        action: action as any,
        eids: this.selectedEIDs,
        parameters: this.buildParameters(action, timeWindow, baselinePeriod)
      };

      // Execute query
      const result = await this.options.executor.executeIntent(intent);

      // Display results
      const template = getTemplate(this.mapActionToTemplate(action));
      const title = `${template?.name || action} - ${this.selectedEIDs.length} EID${this.selectedEIDs.length > 1 ? 's' : ''}`;
      
      this.resultsViewer.displayResults(result, title);

    } catch (error) {
      console.error('Query execution failed:', error);
      alert(`Query failed: ${error}`);
    } finally {
      this.isLoading = false;
      button?.classList.remove('loading');
      this.updateUI();
      this.options.onQueryComplete?.();
    }
  }

  /**
   * Build parameters based on action and UI selections
   */
  private buildParameters(action: string, timeWindow: string, baselinePeriod: string): Record<string, any> {
    const params: Record<string, any> = {
      time_window: timeWindow
    };

    if (action === 'baseline-compare') {
      // Calculate baseline dates based on period
      const now = new Date();
      let baselineStart: Date;
      let baselineEnd: Date;

      switch (baselinePeriod) {
        case 'yesterday':
          baselineStart = new Date(now);
          baselineStart.setDate(baselineStart.getDate() - 1);
          baselineStart.setHours(0, 0, 0, 0);
          baselineEnd = new Date(baselineStart);
          baselineEnd.setHours(23, 59, 59, 999);
          break;
        
        case 'last-week':
          baselineStart = new Date(now);
          baselineStart.setDate(baselineStart.getDate() - 7);
          baselineEnd = new Date(now);
          baselineEnd.setDate(baselineEnd.getDate() - 6);
          break;
        
        case 'last-month':
          baselineStart = new Date(now);
          baselineStart.setMonth(baselineStart.getMonth() - 1);
          baselineEnd = new Date(baselineStart);
          baselineEnd.setDate(baselineEnd.getDate() + 1);
          break;
        
        default:
          // Default to last week
          baselineStart = new Date(now);
          baselineStart.setDate(baselineStart.getDate() - 7);
          baselineEnd = new Date(now);
          baselineEnd.setDate(baselineEnd.getDate() - 6);
      }

      params.baseline_start = baselineStart.toISOString();
      params.baseline_end = baselineEnd.toISOString();
      params.current_window = timeWindow;
    }

    if (action === 'trend-analysis') {
      params.time_range = this.expandTimeWindow(timeWindow);
      params.bucket_size = this.calculateBucketSize(timeWindow);
    }

    return params;
  }

  /**
   * Map action to template ID
   */
  private mapActionToTemplate(action: string): string {
    const mapping: Record<string, string> = {
      'health-check': 'healthCheck',
      'baseline-compare': 'baselineComparison',
      'trend-analysis': 'trendAnalysis',
      'performance': 'performanceMetrics'
    };
    return mapping[action] || 'healthCheck';
  }

  /**
   * Expand time window for trend analysis
   */
  private expandTimeWindow(window: string): string {
    const expansions: Record<string, string> = {
      '15m': '1h',
      '1h': '6h',
      '6h': '24h',
      '24h': '7d',
      '7d': '30d'
    };
    return expansions[window] || window;
  }

  /**
   * Calculate appropriate bucket size
   */
  private calculateBucketSize(window: string): string {
    const buckets: Record<string, string> = {
      '15m': '1m',
      '1h': '5m',
      '6h': '30m',
      '24h': '1h',
      '7d': '6h'
    };
    return buckets[window] || '1h';
  }
}