/**
 * Query Results Viewer - Display ES|QL query results
 */
export class QueryResultsViewer {
    constructor(options) {
        this.modalElement = null;
        this.options = options;
    }
    /**
     * Display query results
     */
    displayResults(result, title = 'Query Results') {
        // Create modal container
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'emil-results-modal';
        this.modalElement.innerHTML = `
      <div class="emil-results-overlay"></div>
      <div class="emil-results-container">
        <div class="emil-results-header">
          <h2>${title}</h2>
          <button class="emil-results-close" aria-label="Close">×</button>
        </div>
        <div class="emil-results-body">
          ${this.renderResults(result)}
        </div>
        <div class="emil-results-footer">
          <div class="emil-results-metadata">
            ${this.renderMetadata(result)}
          </div>
          <div class="emil-results-actions">
            <button class="emil-btn-export">Export CSV</button>
            <button class="emil-btn-copy">Copy Query</button>
          </div>
        </div>
      </div>
    `;
        // Apply styles
        this.applyStyles();
        // Add to container
        this.options.container.appendChild(this.modalElement);
        // Attach event listeners
        this.attachEventListeners(result);
    }
    /**
     * Render results based on type
     */
    renderResults(result) {
        if (result.error) {
            return `<div class="emil-error">
        <span class="emil-error-icon">⚠️</span>
        <p>Query Error: ${result.error}</p>
      </div>`;
        }
        if (!result.data || result.data.length === 0) {
            return '<div class="emil-no-data">No data returned</div>';
        }
        // Determine render type based on data structure
        if (Array.isArray(result.data)) {
            return this.renderTable(result.data);
        }
        else if (typeof result.data === 'object') {
            return this.renderObject(result.data);
        }
        else {
            return `<pre>${JSON.stringify(result.data, null, 2)}</pre>`;
        }
    }
    /**
     * Render data as table
     */
    renderTable(data) {
        if (data.length === 0)
            return '';
        // Get columns from first row
        const columns = Object.keys(data[0]);
        // Check if this is time series data
        const hasTimeBucket = columns.includes('time_bucket');
        if (hasTimeBucket && data.length > 10) {
            return this.renderTimeSeries(data);
        }
        let html = '<div class="emil-table-container"><table class="emil-results-table">';
        // Header
        html += '<thead><tr>';
        columns.forEach(col => {
            html += `<th>${this.formatColumnName(col)}</th>`;
        });
        html += '</tr></thead>';
        // Body
        html += '<tbody>';
        data.forEach(row => {
            html += '<tr>';
            columns.forEach(col => {
                html += `<td>${this.formatCellValue(row[col], col)}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';
        return html;
    }
    /**
     * Render time series data as chart placeholder
     */
    renderTimeSeries(data) {
        // For now, render as table with note about visualization
        const tableHtml = this.renderTable(data.slice(0, 10));
        return `
      <div class="emil-timeseries-note">
         Time series data detected. Showing first 10 rows.
        <br><small>Full visualization coming in Phase 3</small>
      </div>
      ${tableHtml}
      <div class="emil-data-summary">
        Showing 10 of ${data.length} rows
      </div>
    `;
    }
    /**
     * Render single object
     */
    renderObject(obj) {
        let html = '<div class="emil-object-view">';
        for (const [key, value] of Object.entries(obj)) {
            html += `
        <div class="emil-object-row">
          <span class="emil-object-key">${this.formatColumnName(key)}:</span>
          <span class="emil-object-value">${this.formatCellValue(value, key)}</span>
        </div>
      `;
        }
        html += '</div>';
        return html;
    }
    /**
     * Format column name for display
     */
    formatColumnName(name) {
        return name
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }
    /**
     * Format cell value based on type and column
     */
    formatCellValue(value, column) {
        if (value === null || value === undefined) {
            return '<span class="emil-null">—</span>';
        }
        // Format based on column name hints
        if (column.includes('time') || column.includes('date')) {
            return new Date(value).toLocaleString();
        }
        if (column.includes('percent') || column.includes('rate')) {
            const percent = typeof value === 'number' ? value * 100 : value;
            return `${Number(percent).toFixed(2)}%`;
        }
        if (column.includes('count') || column.includes('total')) {
            return Number(value).toLocaleString();
        }
        if (column.includes('latency') || column.includes('duration')) {
            return `${Number(value).toFixed(0)}ms`;
        }
        if (column === 'health_status' || column === 'status') {
            return this.renderStatus(value);
        }
        if (column === 'eid') {
            return `<code>${value}</code>`;
        }
        // Default formatting
        if (typeof value === 'number') {
            return Number(value).toLocaleString();
        }
        return String(value);
    }
    /**
     * Render status with color coding
     */
    renderStatus(status) {
        const statusClass = {
            'HEALTHY': 'emil-status-healthy',
            'NORMAL': 'emil-status-healthy',
            'WARNING': 'emil-status-warning',
            'CRITICAL': 'emil-status-critical',
            'ERROR': 'emil-status-critical',
            'LOW_TRAFFIC': 'emil-status-warning',
            'TRAFFIC_DROP': 'emil-status-critical',
            'TRAFFIC_SPIKE': 'emil-status-warning'
        }[status] || 'emil-status-unknown';
        return `<span class="${statusClass}">${status}</span>`;
    }
    /**
     * Render query metadata
     */
    renderMetadata(result) {
        const parts = [];
        if (result.duration) {
            parts.push(`Executed in ${result.duration}ms`);
        }
        if (result.metadata?.took) {
            parts.push(`ES took ${result.metadata.took}ms`);
        }
        if (result.metadata?.totalHits) {
            parts.push(`${result.metadata.totalHits} results`);
        }
        if (result.metadata?.fromCache) {
            parts.push('(cached)');
        }
        return parts.join(' • ');
    }
    /**
     * Apply modal styles
     */
    applyStyles() {
        const styleId = 'emil-results-styles';
        if (document.getElementById(styleId))
            return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      .emil-results-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .emil-results-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
      }

      .emil-results-container {
        position: relative;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        width: 90%;
        max-width: 1000px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
      }

      .emil-results-header {
        padding: 20px 24px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .emil-results-header h2 {
        margin: 0;
        font-size: 20px;
        color: #333;
      }

      .emil-results-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #999;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .emil-results-close:hover {
        color: #333;
      }

      .emil-results-body {
        flex: 1;
        overflow: auto;
        padding: 24px;
      }

      .emil-results-footer {
        padding: 16px 24px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .emil-results-metadata {
        font-size: 12px;
        color: #666;
      }

      .emil-results-actions {
        display: flex;
        gap: 8px;
      }

      .emil-results-actions button {
        padding: 6px 12px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }

      .emil-results-actions button:hover {
        background: #f5f5f5;
      }

      .emil-table-container {
        overflow-x: auto;
      }

      .emil-results-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }

      .emil-results-table th {
        background: #f5f5f5;
        padding: 12px;
        text-align: left;
        font-weight: 600;
        border-bottom: 2px solid #e0e0e0;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .emil-results-table td {
        padding: 10px 12px;
        border-bottom: 1px solid #f0f0f0;
      }

      .emil-results-table tr:hover {
        background: #f9f9f9;
      }

      .emil-results-table code {
        background: #f5f5f5;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: monospace;
        font-size: 12px;
      }

      .emil-error {
        padding: 32px;
        text-align: center;
        color: #d32f2f;
      }

      .emil-error-icon {
        font-size: 48px;
        display: block;
        margin-bottom: 16px;
      }

      .emil-no-data {
        padding: 48px;
        text-align: center;
        color: #666;
      }

      .emil-status-healthy {
        color: #4caf50;
        font-weight: 500;
      }

      .emil-status-warning {
        color: #ff9800;
        font-weight: 500;
      }

      .emil-status-critical {
        color: #f44336;
        font-weight: 500;
      }

      .emil-status-unknown {
        color: #666;
      }

      .emil-null {
        color: #999;
        font-style: italic;
      }

      .emil-object-view {
        background: #f9f9f9;
        padding: 16px;
        border-radius: 4px;
      }

      .emil-object-row {
        display: flex;
        padding: 8px 0;
        border-bottom: 1px solid #e0e0e0;
      }

      .emil-object-row:last-child {
        border-bottom: none;
      }

      .emil-object-key {
        font-weight: 600;
        margin-right: 16px;
        min-width: 200px;
        color: #666;
      }

      .emil-object-value {
        flex: 1;
      }

      .emil-timeseries-note {
        background: #e3f2fd;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
        font-size: 14px;
      }

      .emil-data-summary {
        margin-top: 16px;
        text-align: center;
        color: #666;
        font-size: 14px;
      }
    `;
        document.head.appendChild(style);
    }
    /**
     * Attach event listeners
     */
    attachEventListeners(result) {
        if (!this.modalElement)
            return;
        // Close button
        const closeBtn = this.modalElement.querySelector('.emil-results-close');
        closeBtn?.addEventListener('click', () => this.close());
        // Overlay click
        const overlay = this.modalElement.querySelector('.emil-results-overlay');
        overlay?.addEventListener('click', () => this.close());
        // Export CSV
        const exportBtn = this.modalElement.querySelector('.emil-btn-export');
        exportBtn?.addEventListener('click', () => this.exportCSV(result));
        // Copy query
        const copyBtn = this.modalElement.querySelector('.emil-btn-copy');
        copyBtn?.addEventListener('click', () => this.copyQuery(result.query));
        // ESC key
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                this.close();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    /**
     * Export results as CSV
     */
    exportCSV(result) {
        if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
            alert('No data to export');
            return;
        }
        const firstRow = result.data[0];
        if (!firstRow || typeof firstRow !== 'object') {
            alert('Invalid data format');
            return;
        }
        const columns = Object.keys(firstRow);
        const csv = [
            columns.join(','),
            ...result.data.map(row => columns.map(col => {
                const value = row[col];
                // Escape quotes and wrap in quotes if contains comma
                const escaped = String(value).replace(/"/g, '""');
                return escaped.includes(',') ? `"${escaped}"` : escaped;
            }).join(','))
        ].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emil-results-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
    /**
     * Copy query to clipboard
     */
    copyQuery(query) {
        navigator.clipboard.writeText(query).then(() => {
            alert('Query copied to clipboard');
        }).catch(() => {
            alert('Failed to copy query');
        });
    }
    /**
     * Close the modal
     */
    close() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
        this.options.onClose?.();
    }
}
//# sourceMappingURL=query-results-viewer.js.map