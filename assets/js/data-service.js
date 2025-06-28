/**
 * Simplified Data Service
 * Handles data fetching and state management
 * Business logic moved to backend
 * @module data-service
 */

import { apiClient } from './api-client-simplified.js';
import { EventEmitter } from './event-emitter.js';
import './types.js'; // Import type definitions

const STATE_STORAGE_KEY = 'radMonitorState';

export class DataService extends EventEmitter {
    constructor() {
        super();

        // Load persisted state
        const savedState = this.loadPersistedState();

        // Simple state with persisted values
        this.state = {
            data: [],
            stats: {
                critical: 0,
                warning: 0,
                normal: 0,
                increased: 0,
                total: 0
            },
            filters: savedState.filters || {},
            clientFilters: {
                status: savedState.clientFilters?.status || 'all',
                search: savedState.clientFilters?.search || '',
                radTypes: savedState.clientFilters?.radTypes || []
            },
            timeRange: savedState.timeRange || 'now-12h',
            loading: false,
            error: null,
            lastUpdate: null
        };

        // Auto-refresh timer
        this.refreshInterval = null;
    }

    /**
     * Load persisted state from localStorage
     * @returns {Object} Persisted state or empty object
     */
    loadPersistedState() {
        try {
            const saved = localStorage.getItem(STATE_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate the data
                if (parsed.filters && typeof parsed.filters === 'object') {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn('Failed to load persisted state:', error);
        }
        return {};
    }

    /**
     * Persist state to localStorage
     */
    persistState() {
        try {
            const toPersist = {
                filters: this.state.filters,
                clientFilters: this.state.clientFilters,
                timeRange: this.state.timeRange,
                savedAt: new Date().toISOString()
            };
            localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(toPersist));
        } catch (error) {
            console.warn('Failed to persist state:', error);
        }
    }

    /**
     * Initialize data service
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            // Load initial data
            await this.loadData();

            // Setup auto-refresh (5 minutes)
            this.startAutoRefresh(5 * 60 * 1000);

            return true;
        } catch (error) {
            console.error('Failed to initialize data service:', error);
            this.state.error = error.message;
            return false;
        }
    }

    /**
     * Load dashboard data
     * @param {Object} options - Load options
     * @returns {Promise<boolean>} Success status
     */
    async loadData(options = {}) {
        this.setState({ loading: true, error: null });

        try {
            // Fetch data from backend
            const result = await apiClient.fetchDashboardData({
                timeRange: options.timeRange || this.state.timeRange,
                filters: this.state.filters
            });

            if (!result.success) {
                // Check if it's an auth error
                if (result.error && (result.error.includes('Authentication') || result.error.includes('authentication'))) {
                    // Don't treat this as a hard error - data service can still function
                    this.setState({
                        data: [],
                        stats: { critical: 0, warning: 0, normal: 0, increased: 0, total: 0 },
                        loading: false,
                        error: 'Authentication required - click TEST CONNECTION to set cookie'
                    });
                    console.log('⚠️ Authentication required for data loading');
                    return false;
                }

                // Check if it's an invalid cookie error
                if (result.error && (result.error.includes('Invalid or expired') || result.error.includes('cookie'))) {
                    this.setState({
                        data: [],
                        stats: { critical: 0, warning: 0, normal: 0, increased: 0, total: 0 },
                        loading: false,
                        error: 'Cookie expired - click TEST CONNECTION to update'
                    });
                    console.log('⚠️ Cookie expired or invalid');
                    return false;
                }

                throw new Error(result.error || 'Failed to load data');
            }

            // Update state with backend-processed data
            this.setState({
                data: result.data || [],
                stats: result.stats || this.calculateStats(result.data),
                lastUpdate: new Date().toISOString(),
                loading: false,
                error: null
            });

            // Emit update event
            this.emit('dataUpdated', this.state);

            return true;
        } catch (error) {
            console.error('Failed to load data:', error);

            // Try to use cached data
            const fallback = apiClient.getCachedDashboardData();
            if (fallback) {
                this.setState({
                    data: fallback.data || [],
                    stats: fallback.stats || this.calculateStats(fallback.data),
                    error: 'Using cached data: ' + error.message,
                    loading: false
                });
                this.emit('dataUpdated', this.state);
            } else {
                this.setState({
                    loading: false,
                    error: error.message
                });
                this.emit('error', error);
            }

            return false;
        }
    }

    /**
     * Apply filters (client-side for performance)
     * @param {DashboardFilters} filters - Filter updates
     */
    applyFilters(filters) {
        this.setState({ clientFilters: { ...this.state.clientFilters, ...filters } });

        // Persist filter preferences
        this.persistState();

        // Emit filter change event
        this.emit('filtersChanged', this.state.clientFilters);

        // Note: Actual filtering happens in the UI layer for better performance
        // This just maintains the filter state
    }

    /**
     * Update time range
     * @param {string} timeRange - New time range
     */
    async updateTimeRange(timeRange) {
        this.setState({ timeRange });
        this.persistState();

        // Reload data with new time range
        return this.loadData({ timeRange });
    }

    /**
     * Get filtered data
     * @returns {ProcessedEvent[]} Filtered events
     */
    getFilteredData() {
        let filtered = [...this.state.data];

        // Status filter
        if (this.state.clientFilters.status !== 'all') {
            filtered = filtered.filter(item =>
                item.status.toLowerCase() === this.state.clientFilters.status
            );
        }

        // Search filter
        if (this.state.clientFilters.search) {
            const search = this.state.clientFilters.search.toLowerCase();
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(search) ||
                item.id.toLowerCase().includes(search)
            );
        }

        // RAD type filter
        if (this.state.clientFilters.radTypes.length > 0) {
            filtered = filtered.filter(item =>
                this.state.clientFilters.radTypes.includes(item.radType || item.rad_type)
            );
        }

        return filtered;
    }

    /**
     * Refresh data
     * @returns {Promise<boolean>} Success status
     */
    async refresh() {
        return this.loadData({ force: true });
    }

    /**
     * Start auto-refresh
     * @param {number} interval - Refresh interval in milliseconds
     */
    startAutoRefresh(interval = 5 * 60 * 1000) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => {
            this.loadData();
        }, interval);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Update state helper
     * @param {Partial<DashboardState>} updates - State updates
     */
    setState(updates) {
        this.state = { ...this.state, ...updates };
        this.emit('stateChanged', this.state);
    }

    /**
     * Calculate stats (fallback for when backend doesn't provide)
     * @param {ProcessedEvent[]} data - Event data
     * @returns {DashboardStats} Calculated statistics
     */
    calculateStats(data) {
        const stats = {
            critical: 0,
            warning: 0,
            normal: 0,
            increased: 0,
            total: data.length
        };

        data.forEach(item => {
            const status = item.status.toLowerCase();
            if (stats[status] !== undefined) {
                stats[status]++;
            }
        });

        return stats;
    }

    /**
     * Get current state
     * @returns {DashboardState} Current state
     */
    getState() {
        return this.state;
    }

    /**
     * Clear persisted state
     */
    clearPersistedState() {
        try {
            localStorage.removeItem(STATE_STORAGE_KEY);
            // Reset filters to defaults
            this.setState({
                filters: {},
                clientFilters: {
                    status: 'all',
                    search: '',
                    radTypes: []
                },
                timeRange: 'now-12h'
            });
        } catch (error) {
            console.warn('Failed to clear persisted state:', error);
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAutoRefresh();
        this.removeAllListeners();
    }
}

// Export singleton instance
export const dataService = new DataService();
export default dataService;
