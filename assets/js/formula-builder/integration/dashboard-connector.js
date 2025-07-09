/**
 * Dashboard Connector - Integrates Formula Builder with RAD Dashboard
 */

import { createFormulaEditor } from '../ui/formula-editor.js';

export class DashboardFormulaIntegration {
  constructor(apiClient, dataService) {
    this.apiClient = apiClient;
    this.dataService = dataService;
    this.formulaEditor = null;
    this.activeFormula = '';
    this.activeQuery = null;
  }

  /**
   * Initialize the formula builder in the dashboard
   * @param {HTMLElement} container - Container element for the formula builder
   * @param {Object} options - Configuration options
   */
  init(container, options = {}) {
    // Create formula editor
    this.formulaEditor = createFormulaEditor(container, {
      onFormulaChange: (formula) => this.handleFormulaChange(formula),
      onQueryGenerated: (query) => this.handleQueryGenerated(query),
      ...options
    });

    // Add integration controls
    this.addIntegrationControls(container);

    return this.formulaEditor;
  }

  /**
   * Add integration controls to the formula builder
   */
  addIntegrationControls(container) {
    const controls = document.createElement('div');
    controls.className = 'formula-integration-controls';
    controls.innerHTML = `
      <div class="integration-toolbar">
        <button class="btn-execute-query">Execute Query</button>
        <button class="btn-add-to-dashboard">Add to Dashboard</button>
        <button class="btn-save-formula">Save Formula</button>
        <select class="saved-formulas-dropdown">
          <option value="">Load Saved Formula...</option>
        </select>
      </div>
      <div class="query-results-section" style="display: none;">
        <h3>Query Results</h3>
        <div class="results-summary"></div>
        <div class="results-preview"></div>
      </div>
    `;

    container.appendChild(controls);

    // Attach event handlers
    controls.querySelector('.btn-execute-query').addEventListener('click', () => {
      this.executeCurrentQuery();
    });

    controls.querySelector('.btn-add-to-dashboard').addEventListener('click', () => {
      this.addToDashboard();
    });

    controls.querySelector('.btn-save-formula').addEventListener('click', () => {
      this.saveFormula();
    });

    controls.querySelector('.saved-formulas-dropdown').addEventListener('change', (e) => {
      if (e.target.value) {
        this.loadSavedFormula(e.target.value);
      }
    });

    // Load saved formulas
    this.loadSavedFormulas();
  }

  /**
   * Handle formula changes
   */
  handleFormulaChange(formula) {
    this.activeFormula = formula;
  }

  /**
   * Handle query generation
   */
  handleQueryGenerated(query) {
    this.activeQuery = query;
  }

  /**
   * Execute the current query
   */
  async executeCurrentQuery() {
    if (!this.activeQuery) {
      this.showNotification('No query to execute. Please enter a valid formula.', 'error');
      return;
    }

    const resultsSection = document.querySelector('.query-results-section');
    const resultsSummary = resultsSection.querySelector('.results-summary');
    const resultsPreview = resultsSection.querySelector('.results-preview');

    try {
      // Show loading state
      resultsSection.style.display = 'block';
      resultsSummary.innerHTML = '<p>Executing query...</p>';
      resultsPreview.innerHTML = '';

      // Execute query through the API client
      const response = await this.executeElasticsearchQuery(this.activeQuery);

      // Process results
      const results = this.processQueryResults(response);

      // Display results
      resultsSummary.innerHTML = `
        <div class="results-stats">
          <span>Total Hits: ${results.totalHits}</span>
          <span>Took: ${results.took}ms</span>
        </div>
      `;

      resultsPreview.innerHTML = `
        <div class="results-data">
          <pre>${JSON.stringify(results.aggregations, null, 2)}</pre>
        </div>
      `;

      // Store results for dashboard integration
      this.lastQueryResults = results;

    } catch (error) {
      resultsSummary.innerHTML = `<p class="error">Error: ${error.message}</p>`;
      resultsPreview.innerHTML = '';
    }
  }

  /**
   * Execute Elasticsearch query
   */
  async executeElasticsearchQuery(query) {
    // Use the existing API client to execute the query
    const endpoint = '/internal/bsearch';

    const payload = {
      batch: [{
        request: {
          params: query,
          options: {
            sessionId: this.generateSessionId(),
            isRestore: false,
            strategy: 'ese',
            executionContext: {
              type: 'application',
              name: 'formula-builder',
              url: '/formula-builder'
            }
          }
        }
      }]
    };

    // Execute through API client
    const response = await this.apiClient.makeAuthenticatedRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'elastic-api-version': '1'
      },
      body: JSON.stringify(payload)
    });

    return response;
  }

  /**
   * Process query results
   */
  processQueryResults(response) {
    const result = response.batch?.[0]?.result || response;

    return {
      totalHits: result.hits?.total?.value || 0,
      took: result.took || 0,
      aggregations: result.aggregations || {},
      hits: result.hits?.hits || []
    };
  }

  /**
   * Add formula widget to dashboard
   */
  async addToDashboard() {
    if (!this.activeFormula || !this.lastQueryResults) {
      this.showNotification('Please execute a query first', 'error');
      return;
    }

    const widgetConfig = {
      type: 'formula',
      formula: this.activeFormula,
      query: this.activeQuery,
      title: prompt('Enter widget title:', 'Formula Widget'),
      refreshInterval: 60000, // 1 minute
      display: {
        type: 'metric', // or 'chart', 'table'
        format: 'number'
      }
    };

    if (!widgetConfig.title) return;

    // Create dashboard widget
    const widget = this.createDashboardWidget(widgetConfig);

    // Add to dashboard
    const dashboard = document.querySelector('#dashboard-container');
    if (dashboard) {
      dashboard.appendChild(widget);
      this.showNotification('Widget added to dashboard', 'success');
    }
  }

  /**
   * Create dashboard widget
   */
  createDashboardWidget(config) {
    const widget = document.createElement('div');
    widget.className = 'dashboard-widget formula-widget';
    widget.dataset.formula = config.formula;
    widget.innerHTML = `
      <div class="widget-header">
        <h4>${config.title}</h4>
        <div class="widget-controls">
          <button class="btn-refresh" title="Refresh">↻</button>
          <button class="btn-edit" title="Edit">✎</button>
          <button class="btn-remove" title="Remove">×</button>
        </div>
      </div>
      <div class="widget-body">
        <div class="widget-value">
          ${this.formatWidgetValue(this.lastQueryResults, config.display)}
        </div>
        <div class="widget-formula">
          <code>${config.formula}</code>
        </div>
      </div>
    `;

    // Attach event handlers
    widget.querySelector('.btn-refresh').addEventListener('click', () => {
      this.refreshWidget(widget, config);
    });

    widget.querySelector('.btn-edit').addEventListener('click', () => {
      this.editWidget(widget, config);
    });

    widget.querySelector('.btn-remove').addEventListener('click', () => {
      widget.remove();
    });

    // Start auto-refresh
    if (config.refreshInterval) {
      setInterval(() => {
        this.refreshWidget(widget, config);
      }, config.refreshInterval);
    }

    return widget;
  }

  /**
   * Format widget value based on display type
   */
  formatWidgetValue(results, display) {
    // Extract value from aggregations based on formula
    // This is simplified - you'd want more sophisticated value extraction
    const aggs = results.aggregations;
    const firstAgg = Object.values(aggs)[0];

    let value = 0;
    if (firstAgg?.doc_count !== undefined) {
      value = firstAgg.doc_count;
    } else if (firstAgg?.value !== undefined) {
      value = firstAgg.value;
    }

    // Format based on display type
    switch (display.format) {
      case 'number':
        return value.toLocaleString();
      case 'percent':
        return `${(value * 100).toFixed(2)}%`;
      case 'bytes':
        return this.formatBytes(value);
      default:
        return value;
    }
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Refresh widget data
   */
  async refreshWidget(widget, config) {
    const valueElement = widget.querySelector('.widget-value');
    valueElement.textContent = 'Loading...';

    try {
      const response = await this.executeElasticsearchQuery(config.query);
      const results = this.processQueryResults(response);
      valueElement.textContent = this.formatWidgetValue(results, config.display);
    } catch (error) {
      valueElement.textContent = 'Error';
    }
  }

  /**
   * Edit widget configuration
   */
  editWidget(widget, config) {
    // Load formula into editor
    if (this.formulaEditor) {
      this.formulaEditor.loadExample(config.formula);
    }
  }

  /**
   * Save formula to local storage
   */
  saveFormula() {
    if (!this.activeFormula) {
      this.showNotification('No formula to save', 'error');
      return;
    }

    const name = prompt('Enter formula name:');
    if (!name) return;

    const savedFormulas = this.getSavedFormulas();
    savedFormulas[name] = {
      formula: this.activeFormula,
      query: this.activeQuery,
      created: new Date().toISOString()
    };

    localStorage.setItem('rad_saved_formulas', JSON.stringify(savedFormulas));
    this.loadSavedFormulas();
    this.showNotification('Formula saved', 'success');
  }

  /**
   * Load saved formulas into dropdown
   */
  loadSavedFormulas() {
    const savedFormulas = this.getSavedFormulas();
    const dropdown = document.querySelector('.saved-formulas-dropdown');

    if (!dropdown) return;

    // Clear existing options except the first one
    dropdown.innerHTML = '<option value="">Load Saved Formula...</option>';

    // Add saved formulas
    Object.entries(savedFormulas).forEach(([name, data]) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      dropdown.appendChild(option);
    });
  }

  /**
   * Get saved formulas from storage
   */
  getSavedFormulas() {
    const saved = localStorage.getItem('rad_saved_formulas');
    return saved ? JSON.parse(saved) : {};
  }

  /**
   * Load a saved formula
   */
  loadSavedFormula(name) {
    const savedFormulas = this.getSavedFormulas();
    const formulaData = savedFormulas[name];

    if (formulaData && this.formulaEditor) {
      this.formulaEditor.loadExample(formulaData.formula);
      this.showNotification(`Loaded formula: ${name}`, 'success');
    }
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `formula-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // You can integrate with your existing notification system
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}

// Export function to create integration
export function createFormulaIntegration(apiClient, dataService) {
  return new DashboardFormulaIntegration(apiClient, dataService);
}
