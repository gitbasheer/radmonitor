/**
 * Simplified Data Service
 * Handles data fetching and state management
 * Business logic moved to backend
 * @module data-service
 */

import { apiClient } from './api-client-simplified.js';
import { EventEmitter } from './event-emitter.js';
import './types.js'; // Import type definitions

// Import formula builder modules
import { EnhancedFormulaParser } from './formula-builder/core/enhanced-ast-parser.js';
import { EnhancedFormulaValidator } from './formula-builder/core/enhanced-validator.js';
import { QueryBuilder } from './formula-builder/translator/query-builder.js';

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

        // Initialize formula builder components
        this.formulaParser = new EnhancedFormulaParser();
        this.formulaValidator = new EnhancedFormulaValidator({
            fieldSchema: new Map() // This will be populated from the backend
        });
        this.queryBuilder = new QueryBuilder();
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
            console.log(' Dashboard data received:', result);
            const processedData = result.data || [];
            const stats = result.stats || this.calculateStats(processedData);
            
            this.setState({
                data: processedData,
                stats: stats,
                lastUpdate: new Date().toISOString(),
                loading: false,
                error: null
            });
            
            console.log(' State updated with', processedData.length, 'events');

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

    /**
     * Execute a formula-based query
     * @param {string} formula - The formula string to execute
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Query results in the same format as fetchDashboardData
     */
    async executeFormulaQuery(formula, options = {}) {
        this.setState({ loading: true, error: null });

        try {
            // Parse and validate formula
            const parseResult = this.formulaParser.parse(formula);
            if (!parseResult.success) {
                throw new Error(parseResult.errors.map(e => e.message).join(', '));
            }

            // Quick validation
            const context = {
                dataView: options.context?.dataView,
                timeRange: options.timeRange || this.state.timeRange
            };
            const validation = await this.formulaValidator.validate(parseResult.ast, context);

            if (!validation.valid) {
                const errors = validation.results
                    .filter(r => r.severity === 'error')
                    .map(r => r.message)
                    .join(', ');
                throw new Error(errors);
            }

            // Build and execute query
            const query = this.queryBuilder.buildQuery(parseResult.ast, {
                timeRange: this.parseTimeRange(options.timeRange || this.state.timeRange),
                filters: options.filters || this.state.filters,
                index: 'traffic-*'
            });

            const result = await apiClient.post('/dashboard/formula-query', {
                formula,
                query,
                time_range: options.timeRange || this.state.timeRange,
                filters: options.filters || this.state.filters
            });

            if (!result.success) {
                throw new Error(result.error || 'Query failed');
            }

            // Update state
            this.setState({
                data: result.data || [],
                stats: result.stats || this.calculateStats(result.data),
                lastUpdate: new Date().toISOString(),
                loading: false,
                error: null
            });

            this.emit('dataUpdated', this.state);

            return {
                success: true,
                data: result.data,
                stats: result.stats,
                metadata: result.metadata
            };

        } catch (error) {
            this.setState({ loading: false, error: error.message });
            this.emit('error', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Validate a formula without executing it
     * @param {string} formula - The formula to validate
     * @param {Object} context - Validation context
     * @returns {Promise<Object>} Validation result
     */
    async validateFormula(formula, context = {}) {
        try {
            const parseResult = this.formulaParser.parse(formula);
            if (!parseResult.success) {
                return {
                    valid: false,
                    errors: parseResult.errors,
                    warnings: []
                };
            }

            const validation = await this.formulaValidator.validate(parseResult.ast, context);
            return {
                valid: validation.valid,
                errors: validation.results.filter(r => r.severity === 'error'),
                warnings: validation.results.filter(r => r.severity === 'warning'),
                complexity: validation.complexity
            };

        } catch (error) {
            return {
                valid: false,
                errors: [{ message: error.message, position: 0 }],
                warnings: []
            };
        }
    }

    /**
     * Update field schema for validation
     * @param {Array} fields - Array of field definitions
     */
    updateFieldSchema(fields) {
        const fieldSchema = new Map();
        fields.forEach(field => {
            fieldSchema.set(field.name, {
                type: field.type,
                aggregatable: field.aggregatable
            });
        });
        this.formulaValidator.fieldSchema = fieldSchema;
    }

    /**
     * Parse time range string into from/to format
     * @param {string} timeRange - Time range string
     * @returns {Object} Object with from and to timestamps
     */
    parseTimeRange(timeRange) {
        const now = new Date();
        let from = new Date(now);
        let to = now;

        if (timeRange.startsWith('now-')) {
            const match = timeRange.match(/now-(\d+)([hdwM])/);
            if (match) {
                const [, amount, unit] = match;
                const units = { h: 'Hours', d: 'Date', w: 'Date', M: 'Month' };
                const multiplier = { h: 1, d: 1, w: 7, M: 1 };

                if (units[unit]) {
                    from[`set${units[unit]}`](
                        from[`get${units[unit]}`]() - (parseInt(amount) * multiplier[unit])
                    );
                }
            }
        }

        return {
            from: from.toISOString(),
            to: to.toISOString()
        };
    }
}

// Export singleton instance
export const dataService = new DataService();
export default dataService;
