/**
 * Simplified Dashboard Controller
 * Clean separation of concerns, minimal business logic
 * @module dashboard-simplified
 */

import { authService } from './auth-service.js';
import { dataService } from './data-service.js';
import { apiClient } from './api-client-simplified.js';
import { EventEmitter } from './event-emitter.js';
import { connectionManager } from './connection-status-manager.js';
import './types.js'; // Import type definitions
import DOMPurify from './lib/dompurify.js';

export class SimplifiedDashboard {
    constructor() {
        this.isInitialized = false;
        this.isAuthenticating = false;  // Prevent auth loops
        this.authRetries = 0;           // Track retry attempts
        this.maxAuthRetries = 1;        // Only prompt once
        this.components = {
            table: null,
            cards: null,
            filters: null
        };
        this.currentFilters = {
            search: '',
            radType: ''
        };
        this.currentTimeRange = '1h';
        this.refreshInterval = null;
        this.performanceStats = {
            apiCalls: 0,
            averageResponseTime: 0,
            lastUpdateTime: null
        };
        this.eventHandlers = {
            auth: null,
            data: null,
            error: null
        };
    }

    /**
     * Update connection status in UI
     * @param {boolean} connected - Connection status
     * @param {string} message - Status message
     */
    updateConnectionStatus(connected, message) {
        if (window.updateConnectionStatus) {
            window.updateConnectionStatus(connected, message);
        }

        // Also update any UI elements directly
        const statusDot = document.querySelector('.status-dot');
        const statusText = document.querySelector('.status-text');

        if (statusDot && statusText) {
            statusDot.style.backgroundColor = connected ? 'var(--gd-color-success)' : 'var(--gd-color-error)';
            statusText.textContent = message || (connected ? 'Connected' : 'Disconnected');
        }
    }

    /**
     * Initialize dashboard
     */
    async init() {
        if (this.isInitialized) {
            console.log('⚠️ Dashboard already initialized, skipping...');
            return;
        }

        try {
            console.log('🚀 Initializing RAD Monitor Dashboard...');

            // Connection manager is already initialized in its constructor
            // Just update API status
            try {
                connectionManager.updateAPIStatus(true, 'Connected');
            } catch (error) {
                console.error('Error updating API status:', error);
                console.error('Stack trace:', error.stack);
            }

            // Step 1: Check authentication (but don't force prompt)
            let authStatus;
            try {
                authStatus = await authService.checkAuth();
                if (authStatus.authenticated) {
                    console.log('(✓)Authentication:', authStatus.method);
                    connectionManager.updateAuthStatus(true, `Authenticated via ${authStatus.method}`);
                    window.dispatchEvent(new CustomEvent('auth:success', {
                        detail: { message: `Authenticated via ${authStatus.method}` }
                    }));
                } else {
                    console.log('⚠️ Not authenticated yet');
                    connectionManager.updateAuthStatus(false, 'Not authenticated');
                    window.dispatchEvent(new CustomEvent('auth:failed', {
                        detail: { message: 'Not authenticated' }
                    }));
                }
            } catch (error) {
                console.error('⚠️ Auth check failed:', error.message);
                console.error('Stack trace:', error.stack);
                authStatus = { authenticated: false };
                connectionManager.updateAuthStatus(false, error.message);
                window.dispatchEvent(new CustomEvent('auth:failed', {
                    detail: { message: error.message }
                }));
            }

            // Step 2: Initialize data service (will handle auth internally)
            try {
                await dataService.initialize();
                console.log('(✓)Data service ready');
                connectionManager.updateDataStatus(true, 'Data service ready');
                window.dispatchEvent(new CustomEvent('data:loaded', {
                    detail: { message: 'Configuration and data service ready' }
                }));
            } catch (error) {
                console.error('Data service initialization error:', error);
                console.error('Stack trace:', error.stack);

                // If data initialization fails due to auth, show appropriate message
                connectionManager.updateDataStatus(false, error.message);
                window.dispatchEvent(new CustomEvent('data:error', {
                    detail: { message: error.message }
                }));
                if (!authStatus.authenticated) {
                    console.log('💡 Set cookie to enable data loading');
                    // Ensure auth prompt is shown on overlay
                    try {
                        connectionManager.showAuthPromptOnOverlay();
                    } catch (promptError) {
                        console.error('Error showing auth prompt:', promptError);
                        console.error('Stack trace:', promptError.stack);
                        this.showAuthPrompt(); // Fallback to regular prompt
                    }
                } else {
                    throw error; // Re-throw if not auth-related
                }
            }

            // Step 3: Setup UI components
            try {
                this.setupComponents();
                console.log('(✓)UI components ready');
            } catch (error) {
                console.error('Error setting up UI components:', error);
                console.error('Stack trace:', error.stack);
                throw new Error(`Failed to setup UI components: ${error.message}`);
            }

            // Step 4: Setup event listeners
            try {
                this.setupEventListeners();
                console.log('(✓)Event listeners attached');
            } catch (error) {
                console.error('Error setting up event listeners:', error);
                console.error('Stack trace:', error.stack);
                throw new Error(`Failed to setup event listeners: ${error.message}`);
            }

            this.isInitialized = true;
            console.log('🎉 Dashboard ready!');

            return true;
        } catch (error) {
            console.error('(✗) Dashboard initialization failed:', error);
            console.error('Stack trace:', error.stack);

            // Show error on loading overlay if available
            try {
                connectionManager.updateLoadingMessage(`Initialization failed: ${error.message}`, true);
                // Keep overlay visible with error
                if (!connectionManager.isFullyLoaded) {
                    connectionManager.showAuthPromptOnOverlay();
                }
            } catch (overlayError) {
                console.error('Error updating overlay:', overlayError);
            }

            this.showError(error.message);
            return false;
        }
    }

    /**
     * Setup UI components
     */
    setupComponents() {
        try {
            // Initialize table component
            const tableBody = document.querySelector('#tableBody');
            if (!tableBody) {
                console.warn('Table body element not found, creating placeholder');
            }
            this.components.table = new DashboardTable('#tableBody');

            // Initialize summary cards
            this.components.cards = new SummaryCards({
                critical: '#criticalCount',
                warning: '#warningCount',
                normal: '#normalCount',
                increased: '#increasedCount'
            });

            // Initialize filters
            this.components.filters = new FilterControls({
                statusButtons: '.filter-btn',
                searchInput: '#searchInput',
                radTypeButtons: '#radTypeButtons'
            });
        } catch (error) {
            console.error('Error in setupComponents:', error);
            console.error('Stack trace:', error.stack);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Data service events
        dataService.on('dataUpdated', (state) => this.handleDataUpdate(state));
        dataService.on('stateChanged', (state) => this.handleStateChange(state));
        dataService.on('error', (error) => this.handleError(error));

        // Filter events
        this.components.filters.on('filterChanged', (filters) => {
            dataService.applyFilters(filters);
            this.updateTable();
        });

        // UI events
        document.getElementById('refreshBtn')?.addEventListener('click', () => {
            this.refresh();
        });
    }

    /**
     * Handle data updates
     */
    handleDataUpdate(state) {
        // Update summary cards
        this.components.cards.update(state.stats);

        // Update table
        this.updateTable();

        // Update timestamp
        this.updateTimestamp();

        // Clear any errors
        this.clearError();
    }

    /**
     * Handle state changes
     */
    handleStateChange(state) {
        // Update loading state
        this.setLoading(state.loading);

        // Update error state
        if (state.error) {
            this.showError(state.error);
        }
    }

    /**
     * Update table with filtered data
     */
    updateTable() {
        const filteredData = dataService.getFilteredData();
        this.components.table.render(filteredData);

        // Update results count
        this.updateResultsCount(filteredData.length, dataService.getState().data.length);
    }

    /**
     * Refresh data
     */
    async refresh() {
        await dataService.refresh();
    }

    /**
     * Update timestamp
     */
    updateTimestamp() {
        const timestamp = document.querySelector('.timestamp');
        if (timestamp) {
            timestamp.textContent = `Last updated: ${new Date().toLocaleString()}`;
        }
    }

    /**
     * Update results count
     */
    updateResultsCount(shown, total) {
        const resultsInfo = document.getElementById('resultsInfo');
        if (resultsInfo) {
            if (shown < total) {
                resultsInfo.textContent = `Showing ${shown} of ${total} events`;
            } else {
                resultsInfo.textContent = `${total} events`;
            }
        }
    }

    /**
     * Show loading state
     */
    setLoading(loading) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'flex' : 'none';
        }

        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.disabled = loading;
            refreshBtn.textContent = loading ? 'REFRESHING...' : 'REFRESH NOW';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const statusEl = document.getElementById('refreshStatus');
        if (statusEl) {
            statusEl.innerHTML = DOMPurify.sanitize(`<span style="color: #d32f2f;">(✗) ${message}</span>`);
        }
    }

    /**
     * Clear error message
     */
    clearError() {
        const statusEl = document.getElementById('refreshStatus');
        if (statusEl) {
            statusEl.textContent = 'Ready';
        }
    }

    /**
     * Show authentication prompt using app store
     */
    showAuthPrompt() {
        // Use the app store to show auth prompt
        if (window.appStore) {
            const { showAuthPrompt } = window.appStore.getState().actions;
            showAuthPrompt();
        }

        // Also update the status
        this.showError('Authentication required');
    }

    /**
     * Handle errors
     */
    handleError(error) {
        console.error('Dashboard error:', error);
        this.showError(error.message || 'An error occurred');
    }

    /**
     * Test API connection
     * @returns {Promise<boolean>} Connection status
     */
    async testApiConnection() {
        // Prevent concurrent auth attempts
        if (this.isAuthenticating) {
            console.log('⏳ Authentication already in progress...');
            return false;
        }

        try {
            console.log('🔍 Testing API connection...');

            // Check auth status first
            const authStatus = await authService.checkAuth();
            console.log('Auth status:', authStatus);

            if (!authStatus.authenticated) {
                // Only prompt if we haven't exceeded retry limit
                if (this.authRetries >= this.maxAuthRetries) {
                    console.log('⚠️ Max authentication attempts reached');
                    this.updateConnectionStatus(false, 'Authentication required');
                    return false;
                }

                console.log('⚠️ Not authenticated, prompting for cookie...');
                this.isAuthenticating = true;
                this.authRetries++;

                try {
                    await authService.requireAuth();
                    // Reset auth state on success
                    this.isAuthenticating = false;
                    this.authRetries = 0;
                } catch (error) {
                    console.log('(✗) Authentication failed:', error.message);
                    this.isAuthenticating = false;
                    this.updateConnectionStatus(false, 'Authentication failed');
                    return false;
                }
            }

                            // Now test the actual connection
                const result = await apiClient.testConnection();
                const success = result.success || result === true;

                if (success) {
                    console.log('(✓)API connection successful');
                    this.updateConnectionStatus(true, 'Connected to Elasticsearch');

                    // Use a subtle notification instead of alert
                    window.dispatchEvent(new CustomEvent('connection:success', {
                        detail: { message: 'Connection successful' }
                    }));

                    // Only refresh if we're already initialized
                    if (this.isInitialized) {
                        await this.refresh();
                    }

                    return true;
                } else {
                    console.log('(✗) API connection failed');
                    this.updateConnectionStatus(false, 'Connection test failed - but data may still load');

                    // Don't show an alert - just log it
                    window.dispatchEvent(new CustomEvent('connection:failed', {
                        detail: { message: 'Connection test failed' }
                    }));

                    return false;
                }
        } catch (error) {
            console.error('(✗) Connection test error:', error);

            // Only prompt for auth if it's an auth error and we haven't exceeded retries
            if (error.message?.includes('auth') && this.authRetries < this.maxAuthRetries) {
                console.log('⚠️ Authentication required, prompting for cookie...');
                this.isAuthenticating = true;
                this.authRetries++;

                try {
                    await authService.requireAuth();
                    this.isAuthenticating = false;
                    this.authRetries = 0;
                    return await this.testApiConnection(); // Retry after auth
                } catch (authError) {
                    console.log('(✗) Authentication failed:', authError.message);
                    this.isAuthenticating = false;
                }
            }

            this.updateConnectionStatus(false, 'Connection error');
            return false;
        }
    }

    /**
     * Manual cookie setting
     */
    async setCookieForRealtime() {
        // Reset retry counter when manually setting cookie
        this.authRetries = 0;
        this.isAuthenticating = false;

        try {
            const cookie = await authService.promptForCookie();
            if (cookie) {
                await authService.setLegacyCookie(cookie);
                console.log('(✓)Cookie saved successfully');

                // Test connection after setting cookie
                const connected = await this.testApiConnection();
                if (connected) {
                    await this.refresh();
                }
            }
        } catch (error) {
            console.error('(✗) Failed to set cookie:', error);
        }
    }

    /**
     * Show API setup instructions
     */
    showApiSetupInstructions() {
        const isLocalhost = window.location.hostname === 'localhost';

        const instructions = isLocalhost ? `
            <h3>🔧 Local Development Setup</h3>
            <p>To enable real-time data updates:</p>
            <ol>
                <li>Make sure the unified server is running on port 8000</li>
                <li>Get your Elasticsearch cookie from Kibana</li>
                <li>Click "Set Cookie" and paste it</li>
            </ol>
        ` : `
            <h3>🌐 Production Setup (GitHub Pages)</h3>
            <p>To enable real-time data updates:</p>
            <ol>
                <li>Install a CORS browser extension</li>
                <li>Enable the extension for this site</li>
                <li>Get your Elasticsearch cookie from Kibana</li>
                <li>Click "Enable Real-time" and paste it</li>
            </ol>
        `;

        alert(instructions);
    }

    /**
     * Show performance stats
     */
    showPerformanceStats() {
        const metrics = apiClient.getMetrics();
        const state = dataService.getState();

        const stats = `
📊 Performance Statistics
========================
API Metrics:
- Total Requests: ${metrics.requests}
- Failed Requests: ${metrics.errors}
- Success Rate: ${metrics.requests > 0 ? ((metrics.requests - metrics.errors) / metrics.requests * 100).toFixed(1) : 0}%
- Cache Hits: ${metrics.cacheHits}
- Cache Hit Rate: ${metrics.cacheHitRate?.toFixed(1) || 0}%

Data Status:
- Events Loaded: ${state.data.length}
- Last Update: ${state.lastUpdate || 'Never'}
- Current Error: ${state.error || 'None'}
        `;

        console.log(stats);
        alert(stats);
    }

    /**
     * Clean up all resources and event listeners
     */
    destroy() {
        console.log('🧹 Dashboard: Cleaning up resources...');

        // Clear refresh interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }

        // Use ResourceManager if available
        if (window.resourceManager) {
            window.resourceManager.clearInterval(this.refreshInterval);
        }

        // Destroy components
        if (this.components.table) {
            this.components.table.destroy();
            this.components.table = null;
        }

        if (this.components.filters) {
            // Remove event listeners from FilterControls
            this.components.filters.removeAllListeners();
        }

        // Clear event handlers
        this.eventHandlers = {
            auth: null,
            data: null,
            error: null
        };

        this.isInitialized = false;
        console.log('✅ Dashboard: All resources cleaned up');
    }
}

/**
 * Dashboard Table Component
 */
class DashboardTable {
    constructor(selector) {
        this.tbody = document.querySelector(selector);
        this.renderFrame = null;
    }

    /**
     * Render table with requestAnimationFrame for smooth updates
     * @param {ProcessedEvent[]} data - Array of processed events
     */
    render(data) {
        if (!this.tbody) return;

        // Cancel any pending render
        if (this.renderFrame) {
            cancelAnimationFrame(this.renderFrame);
        }

        // Schedule render on next animation frame
        this.renderFrame = requestAnimationFrame(() => {
            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();

            // Clear existing rows
            this.tbody.innerHTML = ''; // Safe - clearing content only

            // Render rows
            data.forEach(item => {
                const row = this.createRow(item);
                fragment.appendChild(row);
            });

            this.tbody.appendChild(fragment);

            // Clear render frame reference
            this.renderFrame = null;
        });
    }

    /**
     * Create a table row for an event
     * @param {ProcessedEvent} item - Event data
     * @returns {HTMLTableRowElement} Table row element
     */
    createRow(item) {
        const row = document.createElement('tr');
        row.dataset.eventId = item.id;
        row.dataset.radType = item.radType || item.rad_type;

        row.innerHTML = DOMPurify.sanitize(`
            <td>
                <a href="${item.kibanaUrl || item.kibana_url}" target="_blank" class="event-link">
                    <span class="event-name">${item.name}</span>
                </a>
            </td>
            <td>
                <span class="rad-type-badge" style="background: ${item.radColor || item.rad_color}">
                    ${item.radDisplayName || item.rad_display_name}
                </span>
            </td>
            <td>
                <span class="badge ${item.status.toLowerCase()}">
                    ${item.status}
                </span>
            </td>
            <td class="number">
                <span class="score ${item.score < 0 ? 'negative' : 'positive'}">
                    ${item.score > 0 ? '+' : ''}${item.score}%
                </span>
            </td>
            <td class="number">${item.current.toLocaleString()}</td>
            <td class="number">${item.baseline.toLocaleString()}</td>
            <td>
                <span class="impact ${item.impactClass || item.impact_class}">
                    ${item.impact}
                </span>
            </td>
        `);

        return row;
    }

    /**
     * Clean up resources
     */
    destroy() {
        if (this.renderFrame) {
            cancelAnimationFrame(this.renderFrame);
            this.renderFrame = null;
        }

        // Use ResourceManager if available
        if (window.resourceManager) {
            window.resourceManager.cancelAnimationFrame(this.renderFrame);
        }
    }
}

/**
 * Summary Cards Component
 */
class SummaryCards {
    constructor(selectors) {
        this.elements = {};
        Object.entries(selectors).forEach(([key, selector]) => {
            this.elements[key] = document.querySelector(selector);
        });
    }

    update(stats) {
        Object.entries(stats).forEach(([key, value]) => {
            if (this.elements[key]) {
                this.elements[key].textContent = value;
            }
        });
    }
}

/**
 * Filter Controls Component
 */
class FilterControls extends EventEmitter {
    constructor(selectors) {
        super();
        this.setupStatusFilter(selectors.statusButtons);
        this.setupSearchFilter(selectors.searchInput);
        this.setupRadTypeFilter(selectors.radTypeButtons);
    }

    setupStatusFilter(selector) {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Emit filter change
                this.emit('filterChanged', {
                    status: btn.dataset.filter
                });
            });
        });
    }

    setupSearchFilter(selector) {
        const input = document.querySelector(selector);
        if (input) {
            let debounceTimer;
            input.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.emit('filterChanged', {
                        search: e.target.value
                    });
                }, 300);
            });
        }
    }

    setupRadTypeFilter(selector) {
        const container = document.querySelector(selector);
        if (container) {
            container.addEventListener('click', (e) => {
                if (e.target.classList.contains('rad-filter-btn')) {
                    e.target.classList.toggle('active');

                    // Get selected RAD types
                    const selected = Array.from(
                        container.querySelectorAll('.rad-filter-btn.active')
                    ).map(btn => btn.dataset.radType);

                    this.emit('filterChanged', {
                        radTypes: selected
                    });
                }
            });
        }
    }
}

// Export singleton instance with backward compatibility methods
export const dashboard = new SimplifiedDashboard();

// Add methods expected by HTML
dashboard.testApiConnection = dashboard.testApiConnection.bind(dashboard);
dashboard.setCookieForRealtime = dashboard.setCookieForRealtime.bind(dashboard);
dashboard.showApiSetupInstructions = dashboard.showApiSetupInstructions.bind(dashboard);
dashboard.showPerformanceStats = dashboard.showPerformanceStats.bind(dashboard);

export default dashboard;
