import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimplifiedAPIClient } from '../assets/js/api-client-simplified.js';

// Mock dependencies
vi.mock('../assets/js/auth-service.js', () => ({
    authService: {
        checkAuth: vi.fn()
    }
}));

vi.mock('../assets/js/centralized-auth.js', () => ({
    CentralizedAuth: {
        getCookie: vi.fn()
    }
}));

import { authService } from '../assets/js/auth-service.js';

describe('SimplifiedAPIClient', () => {
    let client;
    let originalLocation;

    beforeEach(() => {
        client = new SimplifiedAPIClient();
        global.fetch = vi.fn();

        // Mock window.location properly
        originalLocation = window.location;
        Object.defineProperty(window, 'location', {
            writable: true,
            value: {
                hostname: 'localhost',
                href: 'http://localhost:8000'
            }
        });

        window.CentralizedAuth = {
            getCookie: vi.fn()
        };

        // Default auth to true
        authService.checkAuth.mockResolvedValue({ authenticated: true });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.useRealTimers();

        // Restore window.location
        Object.defineProperty(window, 'location', {
            writable: true,
            value: originalLocation
        });
    });

    describe('request', () => {
        it('should make authenticated request with X-Elastic-Cookie header on localhost', async () => {
            const cookie = 'sid=Fe26.2**test**';
            window.CentralizedAuth.getCookie.mockReturnValue(cookie);

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            const result = await client.request('/test', {
                method: 'GET'
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/v1/test',
                expect.objectContaining({
                    credentials: 'include',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Elastic-Cookie': cookie
                    })
                })
            );

            expect(result).toEqual({ success: true });
        });

        it('should handle cookie without sid= prefix', async () => {
            const cookie = 'Fe26.2**test**';
            window.CentralizedAuth.getCookie.mockReturnValue(cookie);

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            await client.request('/test', { method: 'GET' });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Elastic-Cookie': 'sid=' + cookie
                    })
                })
            );
        });

        it('should block request when not authenticated', async () => {
            authService.checkAuth.mockResolvedValueOnce({ authenticated: false });

            await expect(client.request('/test')).rejects.toThrow('Authentication required');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should allow anonymous requests', async () => {
            authService.checkAuth.mockResolvedValueOnce({ authenticated: false });

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'public' })
            });

            const result = await client.request('/public', {
                allowAnonymous: true
            });

            expect(result).toEqual({ data: 'public' });
        });

        it('should retry on failure with exponential backoff', async () => {
            vi.useFakeTimers();

            // First two attempts fail, third succeeds
            global.fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ success: true })
                });

            const promise = client.request('/test');

            // Wait for first retry (1000ms)
            await vi.advanceTimersByTimeAsync(1000);

            // Wait for second retry (2000ms)
            await vi.advanceTimersByTimeAsync(2000);

            const result = await promise;

            expect(result).toEqual({ success: true });
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should not retry on 401 errors', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ message: 'Unauthorized' })
            });

            await expect(client.request('/test')).rejects.toThrow('Unauthorized');
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should handle timeout', async () => {
            vi.useFakeTimers();
            let abortSignal;

            global.fetch.mockImplementationOnce((url, options) => {
                abortSignal = options.signal;
                return new Promise((resolve) => {
                    // Never resolves
                });
            });

            const promise = client.request('/test', { timeout: 100 });

            // Advance time past timeout
            await vi.advanceTimersByTimeAsync(150);

            expect(abortSignal.aborted).toBe(true);
            await expect(promise).rejects.toThrow();
        });
    });

    describe('get', () => {
        it('should cache successful GET requests', async () => {
            const response = { data: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => response
            });

            // First call should fetch
            const result1 = await client.get('/data');
            expect(result1).toEqual(response);
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const result2 = await client.get('/data');
            expect(result2).toEqual(response);
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(client.metrics.cacheHits).toBe(1);
        });

        it('should skip cache when requested', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ data: 'fresh' })
            });

            await client.get('/data');
            await client.get('/data', { skipCache: true });

            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('post', () => {
        it('should send POST request with body', async () => {
            const body = { query: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true })
            });

            await client.post('/query', body);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(body)
                })
            );
        });
    });

    describe('fetchDashboardData', () => {
        it('should fetch dashboard data with correct format', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: [{ id: '1', status: 'normal' }],
                    stats: { normal: 1 },
                    metadata: { timestamp: '2025-01-01' }
                })
            });

            const result = await client.fetchDashboardData({
                timeRange: 'now-24h',
                filters: { search: 'test' }
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/v1/dashboard/query',
                expect.objectContaining({
                    body: JSON.stringify({
                        time_range: 'now-24h',
                        filters: { search: 'test' },
                        options: {
                            includeStats: true,
                            includeMetadata: true
                        }
                    })
                })
            );

            expect(result.success).toBe(true);
            expect(result.data).toHaveLength(1);
        });

        it('should use snake_case for time_range', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [], stats: {}, metadata: {} })
            });

            await client.fetchDashboardData({ timeRange: 'now-6h' });

            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.time_range).toBe('now-6h');
            expect(body.timeRange).toBeUndefined();
        });

        it('should handle errors and return fallback data', async () => {
            vi.useFakeTimers();

            // Mock cached data
            client.cache.set('GET:/dashboard/data', {
                data: { data: [{ id: 'cached' }] },
                timestamp: Date.now()
            });

            // Make the request fail
            global.fetch.mockRejectedValue(new Error('Network error'));

            const promise = client.fetchDashboardData();

            // Advance through all retries quickly
            for (let i = 0; i < 3; i++) {
                await vi.advanceTimersByTimeAsync(5000);
            }

            const result = await promise;

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
            expect(result.fallback).toEqual({ data: [{ id: 'cached' }] });
        });

        it('should send empty filters object by default', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: [], stats: {}, metadata: {} })
            });

            await client.fetchDashboardData();

            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.filters).toEqual({});
        });
    });

    describe('testConnection', () => {
        it('should test API connection successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    data: [],
                    stats: {},
                    metadata: {}
                })
            });

            const result = await client.testConnection();

            expect(result).toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/dashboard/query'),
                expect.objectContaining({
                    body: expect.stringContaining('"time_range":"now-5m"')
                })
            );
        });

        it('should return false when not authenticated', async () => {
            authService.checkAuth.mockResolvedValueOnce({ authenticated: false });

            const result = await client.testConnection();
            expect(result).toBe(false);
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should return false on API error', async () => {
            global.fetch.mockRejectedValueOnce(new Error('API Error'));

            const result = await client.testConnection();
            expect(result).toBe(false);
        });
    });

    describe('metrics', () => {
        it('should track request metrics', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({})
            });

            await client.get('/test1');
            await client.post('/test2', {});

            // Now make a failing request
            global.fetch.mockRejectedValueOnce(new Error('Error'));
            try {
                await client.get('/test3');
            } catch (e) {
                // Expected to fail
            }

            const metrics = client.getMetrics();
            expect(metrics.requests).toBe(3);
            expect(metrics.errors).toBe(1);
            expect(metrics.cacheHits).toBe(0);
        });

        it('should calculate cache hit rate', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({})
            });

            // Make 2 requests that will be cached
            await client.get('/test1');
            await client.get('/test2');

            // Hit cache twice
            await client.get('/test1');
            await client.get('/test2');

            const metrics = client.getMetrics();
            expect(metrics.requests).toBe(2);
            expect(metrics.cacheHits).toBe(2);
            expect(metrics.cacheHitRate).toBe(100);
        });
    });

    describe('clearCache', () => {
        it('should clear all cached data', async () => {
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ data: 'test' })
            });

            // Cache some data
            await client.get('/test');
            expect(client.cache.size).toBe(1);

            // Clear cache
            client.clearCache();
            expect(client.cache.size).toBe(0);

            // Next request should fetch again
            await client.get('/test');
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });
});
