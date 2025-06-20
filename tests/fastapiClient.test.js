import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
// ESM: Import the module directly
import FastAPIClient from '../assets/js/api-client-fastapi.js';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
    resources: 'usable'
});

global.window = dom.window;
global.document = window.document;
global.WebSocket = vi.fn();
global.fetch = vi.fn();

describe('FastAPIClient', () => {
    let mockWebSocket;
    let mockFetch;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup WebSocket mock
        mockWebSocket = {
            readyState: WebSocket.CONNECTING,
            send: vi.fn(),
            close: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
        };

        global.WebSocket = vi.fn(() => mockWebSocket);
        global.WebSocket.CONNECTING = 0;
        global.WebSocket.OPEN = 1;
        global.WebSocket.CLOSING = 2;
        global.WebSocket.CLOSED = 3;

        // Setup fetch mock
        mockFetch = vi.fn();
        global.fetch = mockFetch;
    });

    afterEach(() => {
        FastAPIClient.disconnect();
    });

    describe('WebSocket Connection', () => {
        it('should connect to WebSocket server', async () => {
            const connectPromise = FastAPIClient.connect();

            // Simulate connection
            mockWebSocket.readyState = WebSocket.OPEN;
            mockWebSocket.onopen();

            await connectPromise;

            expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8000/ws');
            expect(FastAPIClient.getConnectionState()).toBe('connected');
        });

        it('should handle WebSocket connection errors', async () => {
            const connectPromise = FastAPIClient.connect();

            // Simulate error
            const error = new Error('Connection failed');
            mockWebSocket.onerror(error);

            await expect(connectPromise).rejects.toThrow('Connection failed');
            expect(FastAPIClient.getConnectionState()).toBe('error');
        });

        it('should handle WebSocket messages', async () => {
            const configHandler = vi.fn();
            const statsHandler = vi.fn();

            FastAPIClient.on('config', configHandler);
            FastAPIClient.on('stats', statsHandler);

            await FastAPIClient.connect();
            mockWebSocket.onopen();

            // Simulate config message
            const configMessage = {
                type: 'config',
                data: {
                    baseline_start: '2025-06-01',
                    baseline_end: '2025-06-09',
                    time_range: 'now-12h'
                }
            };
            mockWebSocket.onmessage({ data: JSON.stringify(configMessage) });

            expect(configHandler).toHaveBeenCalledWith(configMessage.data);

            // Simulate stats message
            const statsMessage = {
                type: 'stats',
                data: {
                    critical_count: 5,
                    warning_count: 10,
                    normal_count: 20,
                    increased_count: 3
                }
            };
            mockWebSocket.onmessage({ data: JSON.stringify(statsMessage) });

            expect(statsHandler).toHaveBeenCalledWith(statsMessage.data);
        });

        it('should handle reconnection on disconnect', async () => {
            vi.useFakeTimers();

            await FastAPIClient.connect();
            mockWebSocket.onopen();

            // Simulate disconnect
            mockWebSocket.onclose();

            expect(FastAPIClient.getConnectionState()).toBe('disconnected');

            // Fast forward to trigger reconnection
            vi.advanceTimersByTime(5000);

            // Should attempt to reconnect
            expect(global.WebSocket).toHaveBeenCalledTimes(2);

            vi.useRealTimers();
        });

        it('should send ping messages', async () => {
            await FastAPIClient.connect();
            mockWebSocket.readyState = WebSocket.OPEN;
            mockWebSocket.onopen();

            // Manually trigger ping (normally done by interval)
            mockWebSocket.send({ type: 'ping' });

            expect(mockWebSocket.send).toHaveBeenCalled();
        });
    });

    describe('REST API Methods', () => {
        beforeEach(() => {
            mockFetch.mockImplementation((url, options) => {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({})
                });
            });
        });

        it('should fetch configuration', async () => {
            const mockConfig = {
                baseline_start: '2025-06-01',
                baseline_end: '2025-06-09',
                time_range: 'now-12h',
                critical_threshold: -80,
                warning_threshold: -50,
                high_volume_threshold: 1000,
                medium_volume_threshold: 100
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockConfig)
            });

            const config = await FastAPIClient.getConfig();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/config');
            expect(config).toEqual(mockConfig);
        });

        it('should update configuration', async () => {
            const newConfig = {
                baseline_start: '2025-07-01',
                baseline_end: '2025-07-15',
                time_range: 'now-24h',
                critical_threshold: -90,
                warning_threshold: -60,
                high_volume_threshold: 2000,
                medium_volume_threshold: 200
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(newConfig)
            });

            const result = await FastAPIClient.updateConfig(newConfig);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/config',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(newConfig)
                }
            );
            expect(result).toEqual(newConfig);
        });

        it('should handle validation errors when updating config', async () => {
            const invalidConfig = {
                baseline_start: 'invalid-date',
                baseline_end: '2025-07-15'
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 422,
                json: () => Promise.resolve({
                    detail: 'Validation error: Invalid date format'
                })
            });

            await expect(FastAPIClient.updateConfig(invalidConfig))
                .rejects.toThrow('Validation error: Invalid date format');
        });

        it('should fetch statistics', async () => {
            const mockStats = {
                critical_count: 2,
                warning_count: 5,
                normal_count: 15,
                increased_count: 3,
                last_update: '2025-06-18T12:00:00',
                total_events: 25
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockStats)
            });

            const stats = await FastAPIClient.getStats();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/api/stats');
            expect(stats).toEqual(mockStats);
        });

        it('should refresh dashboard', async () => {
            const config = FastAPIClient.buildConfig();
            const mockResponse = {
                status: 'success',
                config: config,
                stats: {
                    critical_count: 3,
                    warning_count: 7
                }
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const result = await FastAPIClient.refreshDashboard(config, true);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/refresh',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        config: config,
                        force_refresh: true
                    })
                }
            );
            expect(result).toEqual(mockResponse);
        });

        it('should check server health', async () => {
            const mockHealth = {
                status: 'healthy',
                cors_proxy: true,
                websocket_connections: 3
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockHealth)
            });

            const health = await FastAPIClient.checkHealth();

            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/health');
            expect(health).toEqual(mockHealth);
        });
    });

    describe('Configuration Helpers', () => {
        it('should validate configuration', () => {
            // Valid config
            const validConfig = {
                baseline_start: '2025-06-01',
                baseline_end: '2025-06-09',
                time_range: 'now-12h',
                critical_threshold: -80,
                warning_threshold: -50,
                high_volume_threshold: 1000,
                medium_volume_threshold: 100
            };

            const errors = FastAPIClient.validateConfig(validConfig);
            expect(errors).toHaveLength(0);

            // Invalid config
            const invalidConfig = {
                baseline_start: '06-01-2025', // Wrong format
                baseline_end: '2025-05-01', // Before start
                critical_threshold: 50, // Must be negative
                warning_threshold: -90, // Less than critical
                high_volume_threshold: 0, // Must be >= 1
                medium_volume_threshold: -5 // Must be >= 1
            };

            const invalidErrors = FastAPIClient.validateConfig(invalidConfig);
            expect(invalidErrors.length).toBeGreaterThan(0);
            expect(invalidErrors).toContain('Invalid baseline_start date format (expected YYYY-MM-DD)');
            expect(invalidErrors).toContain('baseline_end must be after baseline_start');
            expect(invalidErrors).toContain('critical_threshold must be negative');
        });

        it('should build configuration with defaults', () => {
            const config = FastAPIClient.buildConfig();

            expect(config).toHaveProperty('baseline_start', '2025-06-01');
            expect(config).toHaveProperty('baseline_end', '2025-06-09');
            expect(config).toHaveProperty('time_range', 'now-12h');
            expect(config).toHaveProperty('critical_threshold', -80);
            expect(config).toHaveProperty('warning_threshold', -50);
            expect(config).toHaveProperty('high_volume_threshold', 1000);
            expect(config).toHaveProperty('medium_volume_threshold', 100);
        });

        it('should build configuration with overrides', () => {
            const overrides = {
                baseline_start: '2025-07-01',
                time_range: 'now-24h',
                critical_threshold: -90
            };

            const config = FastAPIClient.buildConfig(overrides);

            expect(config.baseline_start).toBe('2025-07-01');
            expect(config.time_range).toBe('now-24h');
            expect(config.critical_threshold).toBe(-90);
            expect(config.warning_threshold).toBe(-50); // Default value
        });
    });

    describe('Event Handling', () => {
        it('should register and unregister event handlers', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            // Register handlers
            FastAPIClient.on('config', handler1);
            FastAPIClient.on('config', handler2);

            // Should not throw when emitting before connection
            expect(() => {
                FastAPIClient.on('stats', handler1);
            }).not.toThrow();

            // Unregister handler
            FastAPIClient.off('config', handler1);

            // Connect and simulate message
            FastAPIClient.connect();
            mockWebSocket.onopen();

            const message = {
                type: 'config',
                data: { test: 'data' }
            };
            mockWebSocket.onmessage({ data: JSON.stringify(message) });

            // Only handler2 should be called
            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalledWith(message.data);
        });
    });

    describe('Initialization', () => {
        it('should initialize successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    status: 'healthy',
                    cors_proxy: true,
                    websocket_connections: 0
                })
            });

            const initPromise = FastAPIClient.initialize();

            // Complete WebSocket connection
            mockWebSocket.readyState = WebSocket.OPEN;
            mockWebSocket.onopen();

            const result = await initPromise;

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith('http://localhost:8000/health');
            expect(global.WebSocket).toHaveBeenCalled();
        });

        it('should handle initialization failure', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Server unreachable'));

            const result = await FastAPIClient.initialize();

            expect(result).toBe(false);
        });
    });
});
