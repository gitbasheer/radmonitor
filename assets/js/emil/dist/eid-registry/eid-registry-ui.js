/**
 * EID Registry UI Component
 * Provides interface for managing EID classifications and viewing metrics
 */
import { EIDRegistryService } from './eid-registry-service.js';
import { EIDType, EIDStatus } from './types.js';
export class EIDRegistryUI {
    constructor(options) {
        this.currentEIDs = [];
        this.selectedEIDs = new Set();
        this.currentFilters = {};
        this.isLoading = false;
        this.options = options;
        this.render();
        this.loadEIDs();
    }
    /**
     * Render the EID registry UI
     */
    render() {
        this.options.container.innerHTML = `
      <div class="eid-registry">
        <div class="eid-registry-header">
          <h2>EID Registry</h2>
          <div class="eid-registry-actions">
            <button class="eid-btn-primary" id="eid-add-new">
              <span>➕</span> Register New EID
            </button>
            <button class="eid-btn-secondary" id="eid-export">
              <span>📥</span> Export
            </button>
          </div>
        </div>

        <div class="eid-registry-filters">
          <div class="eid-filter-group">
            <input type="text" id="eid-search" placeholder="Search EIDs..." class="eid-search-input">
          </div>
          
          <div class="eid-filter-group">
            <label>Type:</label>
            <select id="eid-filter-type" class="eid-filter-select">
              <option value="">All Types</option>
              <option value="${EIDType.EXPERIMENT_ONLY}">Experiment Only</option>
              <option value="${EIDType.RAD_ONLY}">RAD Only</option>
              <option value="${EIDType.RAD_AND_EXPERIMENT}">RAD & Experiment</option>
            </select>
          </div>

          <div class="eid-filter-group">
            <label>Status:</label>
            <select id="eid-filter-status" class="eid-filter-select">
              <option value="">All Statuses</option>
              <option value="${EIDStatus.TESTING}">Testing</option>
              <option value="${EIDStatus.LIVE}">Live</option>
              <option value="${EIDStatus.OLD}">Old</option>
            </select>
          </div>

          <div class="eid-filter-group">
            <label>Health:</label>
            <select id="eid-filter-health" class="eid-filter-select">
              <option value="">All Health States</option>
              <option value="HEALTHY">Healthy</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </div>

          <button class="eid-btn-text" id="eid-clear-filters">Clear Filters</button>
        </div>

        <div class="eid-registry-stats" id="eid-stats"></div>

        <div class="eid-registry-content">
          <div class="eid-loading" id="eid-loading">Loading EIDs...</div>
          <div class="eid-grid" id="eid-grid"></div>
        </div>
      </div>

      <!-- Registration Modal -->
      <div class="eid-modal" id="eid-registration-modal" style="display: none;">
        <div class="eid-modal-content">
          <div class="eid-modal-header">
            <h3>Register New EID</h3>
            <button class="eid-modal-close">&times;</button>
          </div>
          <div class="eid-modal-body">
            <form id="eid-registration-form">
              <div class="eid-form-group">
                <label for="eid-id">EID ID (from Elasticsearch)*</label>
                <input type="text" id="eid-id" required placeholder="e.g., eid-12345">
              </div>
              
              <div class="eid-form-group">
                <label for="eid-name">Name*</label>
                <input type="text" id="eid-name" required placeholder="Human-readable name">
              </div>

              <div class="eid-form-group">
                <label>Classification*</label>
                <div class="eid-checkbox-group">
                  <label>
                    <input type="checkbox" id="eid-is-rad" name="classification">
                    <span>RAD (Revenue Acceleration)</span>
                  </label>
                  <label>
                    <input type="checkbox" id="eid-is-experiment" name="classification">
                    <span>Experiment</span>
                  </label>
                </div>
              </div>

              <div class="eid-form-group">
                <label for="eid-status">Status</label>
                <select id="eid-status">
                  <option value="${EIDStatus.TESTING}">Testing</option>
                  <option value="${EIDStatus.LIVE}">Live</option>
                  <option value="${EIDStatus.OLD}">Old</option>
                </select>
              </div>

              <div class="eid-form-group">
                <label for="eid-description">Description</label>
                <textarea id="eid-description" rows="3" placeholder="Optional description"></textarea>
              </div>

              <div class="eid-form-group">
                <label for="eid-owner">Owner</label>
                <input type="text" id="eid-owner" placeholder="Team or user">
              </div>

              <div class="eid-form-group">
                <label for="eid-tags">Tags (comma-separated)</label>
                <input type="text" id="eid-tags" placeholder="e.g., homepage, ab-test, revenue">
              </div>

              <div class="eid-form-actions">
                <button type="submit" class="eid-btn-primary">Register EID</button>
                <button type="button" class="eid-btn-secondary eid-cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
        this.applyStyles();
        this.attachEventListeners();
    }
    /**
     * Apply component styles
     */
    applyStyles() {
        const styleId = 'eid-registry-styles';
        if (document.getElementById(styleId))
            return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
      .eid-registry {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #333;
      }

      .eid-registry-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }

      .eid-registry-header h2 {
        margin: 0;
        font-size: 24px;
      }

      .eid-registry-actions {
        display: flex;
        gap: 12px;
      }

      .eid-btn-primary, .eid-btn-secondary, .eid-btn-text {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .eid-btn-primary {
        background: #0066cc;
        color: white;
      }

      .eid-btn-primary:hover {
        background: #0052a3;
      }

      .eid-btn-secondary {
        background: #f0f0f0;
        color: #333;
      }

      .eid-btn-secondary:hover {
        background: #e0e0e0;
      }

      .eid-btn-text {
        background: none;
        color: #0066cc;
        text-decoration: underline;
      }

      .eid-registry-filters {
        display: flex;
        gap: 16px;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }

      .eid-filter-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .eid-filter-group label {
        font-size: 14px;
        color: #666;
      }

      .eid-search-input, .eid-filter-select {
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .eid-search-input {
        width: 250px;
      }

      .eid-registry-stats {
        background: #f8f9fa;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        gap: 24px;
        flex-wrap: wrap;
      }

      .eid-stat {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .eid-stat-label {
        font-size: 12px;
        color: #666;
      }

      .eid-stat-value {
        font-size: 20px;
        font-weight: 600;
      }

      .eid-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
      }

      .eid-card {
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .eid-card:hover {
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        transform: translateY(-2px);
      }

      .eid-card.selected {
        border-color: #0066cc;
        background: #f0f7ff;
      }

      .eid-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .eid-card-title {
        font-weight: 600;
        font-size: 16px;
        margin-bottom: 4px;
      }

      .eid-card-id {
        font-size: 12px;
        color: #666;
        font-family: monospace;
      }

      .eid-card-badges {
        display: flex;
        gap: 6px;
      }

      .eid-badge {
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 500;
      }

      .eid-badge-type {
        background: #e3f2fd;
        color: #1565c0;
      }

      .eid-badge-status {
        background: #fff3cd;
        color: #856404;
      }

      .eid-badge-status.live {
        background: #d4edda;
        color: #155724;
      }

      .eid-badge-status.old {
        background: #f8f9fa;
        color: #6c757d;
      }

      .eid-card-metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #eee;
      }

      .eid-metric {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .eid-metric-label {
        font-size: 11px;
        color: #666;
      }

      .eid-metric-value {
        font-size: 14px;
        font-weight: 500;
      }

      .eid-health-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 4px;
      }

      .eid-loading {
        text-align: center;
        padding: 40px;
        color: #666;
      }

      /* Modal styles */
      .eid-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .eid-modal-content {
        background: white;
        border-radius: 8px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow: auto;
      }

      .eid-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #eee;
      }

      .eid-modal-header h3 {
        margin: 0;
      }

      .eid-modal-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }

      .eid-modal-body {
        padding: 20px;
      }

      .eid-form-group {
        margin-bottom: 16px;
      }

      .eid-form-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 500;
        font-size: 14px;
      }

      .eid-form-group input,
      .eid-form-group select,
      .eid-form-group textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }

      .eid-checkbox-group {
        display: flex;
        gap: 16px;
      }

      .eid-checkbox-group label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: normal;
      }

      .eid-form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
      }
    `;
        document.head.appendChild(style);
    }
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Search input
        const searchInput = document.getElementById('eid-search');
        searchInput?.addEventListener('input', this.debounce(() => {
            this.currentFilters.search = searchInput.value;
            this.loadEIDs();
        }, 300));
        // Filter selects
        const typeFilter = document.getElementById('eid-filter-type');
        typeFilter?.addEventListener('change', () => {
            this.currentFilters.type = typeFilter.value ? parseInt(typeFilter.value) : undefined;
            this.loadEIDs();
        });
        const statusFilter = document.getElementById('eid-filter-status');
        statusFilter?.addEventListener('change', () => {
            this.currentFilters.status = statusFilter.value || undefined;
            this.loadEIDs();
        });
        const healthFilter = document.getElementById('eid-filter-health');
        healthFilter?.addEventListener('change', () => {
            this.currentFilters.health_status = healthFilter.value ? [healthFilter.value] : undefined;
            this.loadEIDs();
        });
        // Clear filters
        document.getElementById('eid-clear-filters')?.addEventListener('click', () => {
            this.currentFilters = {};
            searchInput.value = '';
            typeFilter.value = '';
            statusFilter.value = '';
            healthFilter.value = '';
            this.loadEIDs();
        });
        // Add new EID button
        document.getElementById('eid-add-new')?.addEventListener('click', () => {
            this.showRegistrationModal();
        });
        // Export button
        document.getElementById('eid-export')?.addEventListener('click', () => {
            this.exportEIDs();
        });
        // Registration form
        const form = document.getElementById('eid-registration-form');
        form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegistration();
        });
        // Modal close
        const modal = document.getElementById('eid-registration-modal');
        modal?.querySelector('.eid-modal-close')?.addEventListener('click', () => {
            this.hideRegistrationModal();
        });
        modal?.querySelector('.eid-cancel')?.addEventListener('click', () => {
            this.hideRegistrationModal();
        });
    }
    /**
     * Load EIDs from the registry
     */
    async loadEIDs() {
        if (this.isLoading)
            return;
        this.isLoading = true;
        this.showLoading(true);
        try {
            const eids = await this.options.registryService.searchEIDs(this.currentFilters);
            this.currentEIDs = eids;
            this.renderEIDs();
            this.updateStats();
            this.options.onEIDsUpdate?.(eids);
        }
        catch (error) {
            console.error('Failed to load EIDs:', error);
            this.showError('Failed to load EIDs');
        }
        finally {
            this.isLoading = false;
            this.showLoading(false);
        }
    }
    /**
     * Render EID cards
     */
    renderEIDs() {
        const grid = document.getElementById('eid-grid');
        if (!grid)
            return;
        if (this.currentEIDs.length === 0) {
            grid.innerHTML = '<div class="eid-empty">No EIDs found</div>';
            return;
        }
        grid.innerHTML = this.currentEIDs.map(eid => this.renderEIDCard(eid)).join('');
        // Attach click handlers
        grid.querySelectorAll('.eid-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const eidId = e.currentTarget.dataset.eidId;
                const eid = this.currentEIDs.find(e => e.id === eidId);
                if (eid) {
                    this.selectEID(eid);
                }
            });
        });
    }
    /**
     * Render individual EID card
     */
    renderEIDCard(eid) {
        const typeLabel = EIDRegistryService.getTypeLabel(eid.type);
        const statusColor = EIDRegistryService.getStatusColor(eid.status);
        const healthColor = eid.latest_metrics?.health_status
            ? EIDRegistryService.getHealthStatusColor(eid.latest_metrics.health_status)
            : '#9E9E9E';
        const isSelected = this.selectedEIDs.has(eid.id);
        return `
      <div class="eid-card ${isSelected ? 'selected' : ''}" data-eid-id="${eid.id}">
        <div class="eid-card-header">
          <div>
            <div class="eid-card-title">${eid.name}</div>
            <div class="eid-card-id">${eid.id}</div>
          </div>
          <div class="eid-card-badges">
            <span class="eid-badge eid-badge-type">${typeLabel}</span>
            <span class="eid-badge eid-badge-status ${eid.status}" style="background-color: ${statusColor}20; color: ${statusColor}">${eid.status}</span>
          </div>
        </div>
        
        ${eid.description ? `<div class="eid-card-description">${eid.description}</div>` : ''}
        
        ${eid.latest_metrics ? `
          <div class="eid-card-metrics">
            <div class="eid-metric">
              <div class="eid-metric-label">Health</div>
              <div class="eid-metric-value">
                <span class="eid-health-indicator" style="background-color: ${healthColor}"></span>
                ${eid.latest_metrics.health_status || 'Unknown'}
              </div>
            </div>
            <div class="eid-metric">
              <div class="eid-metric-label">Events</div>
              <div class="eid-metric-value">${this.formatNumber(eid.latest_metrics.event_count || 0)}</div>
            </div>
            <div class="eid-metric">
              <div class="eid-metric-label">Avg Latency</div>
              <div class="eid-metric-value">${this.formatLatency(eid.latest_metrics.avg_latency)}</div>
            </div>
            <div class="eid-metric">
              <div class="eid-metric-label">Error Rate</div>
              <div class="eid-metric-value">${this.formatPercentage(eid.latest_metrics.error_rate)}</div>
            </div>
          </div>
        ` : '<div class="eid-card-no-metrics">No metrics available</div>'}
      </div>
    `;
    }
    /**
     * Update statistics display
     */
    async updateStats() {
        try {
            const stats = await this.options.registryService.getStats();
            const statsEl = document.getElementById('eid-stats');
            if (!statsEl)
                return;
            statsEl.innerHTML = `
        <div class="eid-stat">
          <div class="eid-stat-label">Total EIDs</div>
          <div class="eid-stat-value">${stats.total_eids}</div>
        </div>
        <div class="eid-stat">
          <div class="eid-stat-label">Live</div>
          <div class="eid-stat-value" style="color: #00C851">${stats.by_status.live}</div>
        </div>
        <div class="eid-stat">
          <div class="eid-stat-label">Testing</div>
          <div class="eid-stat-value" style="color: #FFA500">${stats.by_status.testing}</div>
        </div>
        <div class="eid-stat">
          <div class="eid-stat-label">RAD Only</div>
          <div class="eid-stat-value">${stats.by_type.rad_only}</div>
        </div>
        <div class="eid-stat">
          <div class="eid-stat-label">Experiments</div>
          <div class="eid-stat-value">${stats.by_type.experiment_only}</div>
        </div>
        <div class="eid-stat">
          <div class="eid-stat-label">Both</div>
          <div class="eid-stat-value">${stats.by_type.rad_and_experiment}</div>
        </div>
        <div class="eid-stat">
          <div class="eid-stat-label">Healthy</div>
          <div class="eid-stat-value" style="color: #00C851">${stats.health_distribution.healthy}</div>
        </div>
        <div class="eid-stat">
          <div class="eid-stat-label">Critical</div>
          <div class="eid-stat-value" style="color: #FF4444">${stats.health_distribution.critical}</div>
        </div>
      `;
        }
        catch (error) {
            console.error('Failed to load stats:', error);
        }
    }
    /**
     * Select an EID
     */
    selectEID(eid) {
        if (this.selectedEIDs.has(eid.id)) {
            this.selectedEIDs.delete(eid.id);
        }
        else {
            this.selectedEIDs.add(eid.id);
        }
        this.renderEIDs();
        this.options.onEIDSelect?.(eid);
    }
    /**
     * Show registration modal
     */
    showRegistrationModal() {
        const modal = document.getElementById('eid-registration-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }
    /**
     * Hide registration modal
     */
    hideRegistrationModal() {
        const modal = document.getElementById('eid-registration-modal');
        if (modal) {
            modal.style.display = 'none';
            this.resetRegistrationForm();
        }
    }
    /**
     * Handle EID registration
     */
    async handleRegistration() {
        const form = document.getElementById('eid-registration-form');
        const request = {
            id: document.getElementById('eid-id').value,
            name: document.getElementById('eid-name').value,
            is_rad: document.getElementById('eid-is-rad').checked,
            is_experiment: document.getElementById('eid-is-experiment').checked,
            status: document.getElementById('eid-status').value,
            description: document.getElementById('eid-description').value || undefined,
            owner: document.getElementById('eid-owner').value || undefined,
            tags: document.getElementById('eid-tags').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t.length > 0) || undefined
        };
        try {
            await this.options.registryService.registerEID(request);
            this.hideRegistrationModal();
            this.loadEIDs();
            this.showSuccess('EID registered successfully');
        }
        catch (error) {
            this.showError(`Failed to register EID: ${error}`);
        }
    }
    /**
     * Reset registration form
     */
    resetRegistrationForm() {
        const form = document.getElementById('eid-registration-form');
        form?.reset();
    }
    /**
     * Export EIDs to CSV
     */
    async exportEIDs() {
        try {
            const blob = await this.options.registryService.exportToCSV(this.currentFilters);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `eid-registry-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        catch (error) {
            this.showError('Failed to export EIDs');
        }
    }
    /**
     * Show loading state
     */
    showLoading(show) {
        const loading = document.getElementById('eid-loading');
        const grid = document.getElementById('eid-grid');
        if (loading && grid) {
            loading.style.display = show ? 'block' : 'none';
            grid.style.display = show ? 'none' : 'grid';
        }
    }
    /**
     * Show error message
     */
    showError(message) {
        alert(message); // Replace with better notification system
    }
    /**
     * Show success message
     */
    showSuccess(message) {
        alert(message); // Replace with better notification system
    }
    /**
     * Format number
     */
    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }
    /**
     * Format latency
     */
    formatLatency(ms) {
        if (ms === undefined || ms === null)
            return '-';
        return `${Math.round(ms)}ms`;
    }
    /**
     * Format percentage
     */
    formatPercentage(rate) {
        if (rate === undefined || rate === null)
            return '-';
        return `${(rate * 100).toFixed(2)}%`;
    }
    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }
    /**
     * Get selected EIDs
     */
    getSelectedEIDs() {
        return Array.from(this.selectedEIDs);
    }
    /**
     * Clear selection
     */
    clearSelection() {
        this.selectedEIDs.clear();
        this.renderEIDs();
    }
}
//# sourceMappingURL=eid-registry-ui.js.map