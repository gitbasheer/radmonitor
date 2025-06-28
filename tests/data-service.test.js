import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataService } from '../assets/js/data-service.js';

// Mock dependencies
vi.mock('../assets/js/api-client-simplified.js', () => ({
    apiClient: {
        fetchDashboardData: vi.fn(),
        getCachedDashboardData: vi.fn()
    }
}));

vi.mock('../assets/js/event-emitter.js', () => ({
    EventEmitter: class {
        constructor() {
            this.listeners = {};
        }
        on(event, callback) {
            if (!this.listeners[event]) {
                this.listeners[event] = [];
            }
            this.listeners[event].push(callback);
        }
        emit(event, ...args) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(cb => cb(...args));
            }
        }
        removeAllListeners() {
            this.listeners = {};
        }
    }
}));

import { apiClient } from '../assets/js/api-client-simplified.js';

describe('DataService', () => {
    let dataService;

    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        dataService = new DataService();
    });

    afterEach(() => {
        if (dataService) {
            dataService.destroy();
        }
    });

    describe('initialization', () => {
        it('should initialize with default state', () => {
            const state = dataService.getState();

            expect(state.data).toEqual([]);
            expect(state.stats).toEqual({
                critical: 0,
                warning: 0,
                normal: 0,
                increased: 0,
                total: 0
            });
            expect(state.filters).toEqual({}); // Server filters should be empty
            expect(state.clientFilters).toEqual({
                status: 'all',
                search: '',
                radTypes: []
            });
            expect(state.timeRange).toBe('now-12h');
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should load persisted state from localStorage', () => {
            const persistedState = {
                filters: { someFilter: 'value' },
                clientFilters: {
                    status: 'critical',
                    search: 'test',
                    radTypes: ['type1']
                },
                timeRange: 'now-24h',
                savedAt: new Date().toISOString()
            };

            localStorage.setItem('radMonitorState', JSON.stringify(persistedState));

            dataService = new DataService();
            const state = dataService.getState();

            expect(state.filters).toEqual({ someFilter: 'value' });
            expect(state.clientFilters.status).toBe('critical');
            expect(state.clientFilters.search).toBe('test');
            expect(state.clientFilters.radTypes).toEqual(['type1']);
            expect(state.timeRange).toBe('now-24h');
        });

        it('should handle corrupted localStorage data gracefully', () => {
            localStorage.setItem('radMonitorState', 'invalid json');

            dataService = new DataService();
            const state = dataService.getState();

            expect(state.filters).toEqual({});
            expect(state.clientFilters.status).toBe('all');
        });
    });

    describe('loadData', () => {
        it('should load data successfully', async () => {
            const mockData = [
                { id: '1', status: 'normal', name: 'event1' },
                { id: '2', status: 'critical', name: 'event2' }
            ];
            const mockStats = { normal: 1, critical: 1, warning: 0, increased: 0, total: 2 };

            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: true,
                data: mockData,
                stats: mockStats,
                metadata: { timestamp: '2025-01-01' }
            });

            const result = await dataService.loadData();

            expect(result).toBe(true);
            expect(dataService.state.data).toEqual(mockData);
            expect(dataService.state.stats).toEqual(mockStats);
            expect(dataService.state.loading).toBe(false);
            expect(dataService.state.error).toBeNull();
        });

        it('should send empty filters object to server', async () => {
            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: true,
                data: [],
                stats: {},
                metadata: {}
            });

            await dataService.loadData();

            expect(apiClient.fetchDashboardData).toHaveBeenCalledWith({
                timeRange: 'now-12h',
                filters: {} // Empty filters object
            });
        });

        it('should handle authentication errors gracefully', async () => {
            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: false,
                error: 'Authentication required'
            });

            const result = await dataService.loadData();

            expect(result).toBe(false);
            expect(dataService.state.error).toBe('Authentication required - click TEST CONNECTION to set cookie');
            expect(dataService.state.data).toEqual([]);
        });

        it('should handle expired cookie errors', async () => {
            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: false,
                error: 'Invalid or expired cookie'
            });

            const result = await dataService.loadData();

            expect(result).toBe(false);
            expect(dataService.state.error).toBe('Cookie expired - click TEST CONNECTION to update');
        });

        it('should use cached data on error', async () => {
            const cachedData = {
                data: [{ id: 'cached' }],
                stats: { total: 1 }
            };

            apiClient.getCachedDashboardData.mockReturnValueOnce(cachedData);
            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: false,
                error: 'Network error'
            });

            const result = await dataService.loadData();

            expect(result).toBe(false);
            expect(dataService.state.data).toEqual(cachedData.data);
            expect(dataService.state.error).toContain('Using cached data');
        });

        it('should calculate stats if not provided', async () => {
            const mockData = [
                { id: '1', status: 'normal' },
                { id: '2', status: 'critical' },
                { id: '3', status: 'critical' }
            ];

            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: true,
                data: mockData,
                // No stats provided
                metadata: {}
            });

            await dataService.loadData();

            expect(dataService.state.stats).toEqual({
                critical: 2,
                warning: 0,
                normal: 1,
                increased: 0,
                total: 3
            });
        });
    });

    describe('applyFilters', () => {
        it('should update clientFilters not filters', () => {
            const filters = {
                status: 'critical',
                search: 'test'
            };

            dataService.applyFilters(filters);

            expect(dataService.state.clientFilters.status).toBe('critical');
            expect(dataService.state.clientFilters.search).toBe('test');
            expect(dataService.state.filters).toEqual({}); // Server filters remain empty
        });

        it('should persist filter changes', () => {
            dataService.applyFilters({ status: 'warning' });

            const saved = JSON.parse(localStorage.getItem('radMonitorState'));
            expect(saved.clientFilters.status).toBe('warning');
        });

        it('should emit filtersChanged event', () => {
            const listener = vi.fn();
            dataService.on('filtersChanged', listener);

            dataService.applyFilters({ search: 'test' });

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ search: 'test' })
            );
        });
    });

    describe('getFilteredData', () => {
        beforeEach(() => {
            dataService.state.data = [
                { id: '1', name: 'event-one', status: 'critical', rad_type: 'type1' },
                { id: '2', name: 'event-two', status: 'warning', rad_type: 'type2' },
                { id: '3', name: 'test-event', status: 'normal', rad_type: 'type1' },
                { id: '4', name: 'another', status: 'critical', rad_type: 'type3' }
            ];
        });

        it('should filter by status', () => {
            dataService.state.clientFilters.status = 'critical';
            const filtered = dataService.getFilteredData();

            expect(filtered).toHaveLength(2);
            expect(filtered.every(item => item.status === 'critical')).toBe(true);
        });

        it('should filter by search term', () => {
            dataService.state.clientFilters.search = 'event';
            const filtered = dataService.getFilteredData();

            expect(filtered).toHaveLength(3);
            expect(filtered.every(item => item.name.includes('event'))).toBe(true);
        });

        it('should filter by RAD types', () => {
            dataService.state.clientFilters.radTypes = ['type1', 'type3'];
            const filtered = dataService.getFilteredData();

            expect(filtered).toHaveLength(3);
            expect(filtered.every(item =>
                ['type1', 'type3'].includes(item.rad_type)
            )).toBe(true);
        });

        it('should apply multiple filters', () => {
            dataService.state.clientFilters = {
                status: 'critical',
                search: 'event',
                radTypes: ['type1']
            };
            const filtered = dataService.getFilteredData();

            expect(filtered).toHaveLength(1);
            expect(filtered[0].id).toBe('1');
        });

        it('should return all data when no filters applied', () => {
            dataService.state.clientFilters = {
                status: 'all',
                search: '',
                radTypes: []
            };
            const filtered = dataService.getFilteredData();

            expect(filtered).toHaveLength(4);
        });
    });

    describe('updateTimeRange', () => {
        it('should update time range and reload data', async () => {
            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: true,
                data: [],
                stats: {}
            });

            await dataService.updateTimeRange('now-24h');

            expect(dataService.state.timeRange).toBe('now-24h');
            expect(apiClient.fetchDashboardData).toHaveBeenCalledWith({
                timeRange: 'now-24h',
                filters: {}
            });
        });

        it('should persist time range change', async () => {
            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: true,
                data: [],
                stats: {}
            });

            await dataService.updateTimeRange('now-6h');

            const saved = JSON.parse(localStorage.getItem('radMonitorState'));
            expect(saved.timeRange).toBe('now-6h');
        });
    });

    describe('refresh', () => {
        it('should reload data with force flag', async () => {
            apiClient.fetchDashboardData.mockResolvedValueOnce({
                success: true,
                data: [],
                stats: {}
            });

            await dataService.refresh();

            expect(apiClient.fetchDashboardData).toHaveBeenCalledWith({
                timeRange: 'now-12h',
                filters: {}
            });
        });
    });

    describe('auto-refresh', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should start auto-refresh timer', async () => {
            apiClient.fetchDashboardData.mockResolvedValue({
                success: true,
                data: [],
                stats: {}
            });

            dataService.startAutoRefresh(1000); // 1 second for testing

            // Initial call
            expect(apiClient.fetchDashboardData).toHaveBeenCalledTimes(0);

            // After 1 second
            vi.advanceTimersByTime(1000);
            expect(apiClient.fetchDashboardData).toHaveBeenCalledTimes(1);

            // After 2 seconds
            vi.advanceTimersByTime(1000);
            expect(apiClient.fetchDashboardData).toHaveBeenCalledTimes(2);
        });

        it('should stop auto-refresh', () => {
            apiClient.fetchDashboardData.mockResolvedValue({
                success: true,
                data: [],
                stats: {}
            });

            dataService.startAutoRefresh(1000);
            dataService.stopAutoRefresh();

            vi.advanceTimersByTime(2000);
            expect(apiClient.fetchDashboardData).toHaveBeenCalledTimes(0);
        });
    });

    describe('state management', () => {
        it('should emit stateChanged event on state updates', () => {
            const listener = vi.fn();
            dataService.on('stateChanged', listener);

            dataService.setState({ loading: true });

            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({ loading: true })
            );
        });

        it('should merge state updates', () => {
            dataService.setState({ loading: true });
            dataService.setState({ error: 'Test error' });

            const state = dataService.getState();
            expect(state.loading).toBe(true);
            expect(state.error).toBe('Test error');
        });
    });

    describe('clearPersistedState', () => {
        it('should clear localStorage and reset to defaults', () => {
            localStorage.setItem('radMonitorState', JSON.stringify({ test: 'data' }));

            dataService.clearPersistedState();

            expect(localStorage.getItem('radMonitorState')).toBeNull();
            expect(dataService.state.clientFilters).toEqual({
                status: 'all',
                search: '',
                radTypes: []
            });
            expect(dataService.state.filters).toEqual({});
            expect(dataService.state.timeRange).toBe('now-12h');
        });
    });

    describe('destroy', () => {
        it('should clean up timers and listeners', () => {
            vi.useFakeTimers();

            dataService.startAutoRefresh(1000);
            const listener = vi.fn();
            dataService.on('test', listener);

            dataService.destroy();

            // Timer should be cleared
            vi.advanceTimersByTime(2000);
            expect(apiClient.fetchDashboardData).not.toHaveBeenCalled();

            // Listeners should be removed
            dataService.emit('test');
            expect(listener).not.toHaveBeenCalled();

            vi.useRealTimers();
        });
    });
});
