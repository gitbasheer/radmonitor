import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import apiClient, { UnifiedAPIClient } from '../assets/js/api-client-unified.js';

// Mock dependencies
vi.mock('../assets/js/config-service.js', () => ({
    ConfigService: {
        getConfig: vi.fn(() => ({
            baselineStart: '2025-06-01',
            baselineEnd: '2025-06-09',
            currentTimeRange: 'now-12h',
            rad_types: {
                feed: {
                    enabled: true,
                    pattern: 'panc.vnext.recommendations.feed.*'
                }
            },
            minEventDate: '2025-05-19T04:00:00.000Z',
            queryAggSize: 500
        }))
    }
}));

vi.mock('../assets/js/time-range-utils.js', () => ({
    default: {
        parseTimeRangeToFilter: vi.fn((range) => ({ gte: range }))
    }
}));

describe('UnifiedAPIClient', () => {
    let client;
    let originalLocalStorage;

    beforeEach(() => {
        // Create a new instance for each test to avoid state pollution
        client = new UnifiedAPIClient();
        global.fetch = vi.fn();

        // Mock localStorage
        originalLocalStorage = global.localStorage;
        global.localStorage = {
            getItem: vi.fn(),
            setItem: vi.fn(),
            removeItem: vi.fn(),
            clear: vi.fn()
        };

        // Use vi.stubGlobal for safe location mocking (no navigation errors)
        vi.stubGlobal('location', {
            hostname: 'localhost',
            href: 'http://localhost:8000',
            protocol: 'http:',
            host: 'localhost:8000',
            pathname: '/',
            search: '',
            hash: '',
            origin: 'http://localhost:8000',
            port: '8000'
        });

        // Default auth cookie
        global.localStorage.getItem.mockImplementation((key) => {
            if (key === 'elasticCookie') {
                return JSON.stringify({
                    cookie: 'sid=Fe26.2**test**',
                    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    saved: new Date().toISOString()
                });
            }
            return null;
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
        vi.useRealTimers();
        vi.unstubAllGlobals();
        global.localStorage = originalLocalStorage;
    });

    describe('request', () => {
        it('should make authenticated request with proper headers', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ test: 'data' })
            });

            const result = await client.request('http://localhost:8000/api/v1/test', {
                method: 'GET'
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/test',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ test: 'data' });
        });

        it('should handle errors properly', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ detail: 'Resource not found' })
            });

            const result = await client.request('http://localhost:8000/api/v1/missing');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Resource not found');
        });

        it('should handle network errors', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await client.request('http://localhost:8000/api/v1/test');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Network error');
        });

        it('should support timeout', async () => {
            vi.useFakeTimers();

            // Mock a long-running request
            global.fetch.mockImplementationOnce(() => new Promise((resolve) => {
                setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 5000);
            }));

            const promise = client.request('http://localhost:8000/api/v1/test', {
                timeout: 100
            });

            // Advance timers past the timeout
            await vi.advanceTimersByTimeAsync(150);

            const result = await promise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('aborted');

            vi.useRealTimers();
        });


    });

    describe('get', () => {
        it('should make GET requests with correct URL', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ data: 'test' })
            });

            const result = await client.get('/data');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/data',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ data: 'test' });
        });
    });

    describe('post', () => {
        it('should send POST request with body', async () => {
            const body = { query: 'test' };
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ result: 'success' })
            });

            const result = await client.post('/query', body);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/query',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(body),
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    })
                })
            );

            expect(result.success).toBe(true);
            expect(result.data).toEqual({ result: 'success' });
        });
    });

    describe('fetchTrafficData', () => {
        it('should fetch traffic data with elasticsearch query', async () => {
            const mockElasticsearchResponse = {
                aggregations: {
                    events: {
                        buckets: [
                            {
                                key: 'panc.vnext.recommendations.feed.feed_apmc',
                                doc_count: 1000,
                                current: { doc_count: 100 },
                                baseline: { doc_count: 1000 }
                            }
                        ]
                    }
                }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockElasticsearchResponse
            });

            const config = {
                currentTimeRange: 'now-12h',
                baselineStart: '2025-06-01',
                baselineEnd: '2025-06-09'
            };

            const result = await client.fetchTrafficData(config);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/kibana/proxy',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'X-Elastic-Cookie': 'sid=Fe26.2**test**'
                    })
                })
            );

            // Check the request body contains a query
            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            expect(body.query).toBeDefined();
            expect(body.query.aggs).toBeDefined();

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockElasticsearchResponse);
        });

        it('should handle missing authentication', async () => {
            // Remove the auth cookie
            global.localStorage.getItem.mockReturnValue(null);

            const result = await client.fetchTrafficData({
                currentTimeRange: 'now-12h',
                baselineStart: '2025-06-01',
                baselineEnd: '2025-06-09'
            });

            expect(result.success).toBe(false);
            expect(result.error).toContain('No authentication available');
            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should use cached results when available', async () => {
            const mockResponse = {
                aggregations: { events: { buckets: [] } }
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const config = {
                currentTimeRange: 'now-12h',
                baselineStart: '2025-06-01',
                baselineEnd: '2025-06-09'
            };

            // First call should fetch
            const result1 = await client.fetchTrafficData(config);
            expect(result1.success).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const result2 = await client.fetchTrafficData(config);
            expect(result2.success).toBe(true);
            expect(result2.cached).toBe(true);
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('checkHealth', () => {
        it('should check health successfully', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    healthy: true,
                    status: 'ok',
                    version: '1.0.0'
                })
            });

            const result = await client.checkHealth();

            expect(result.healthy).toBe(true);
            expect(result.status).toBe('ok');
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/health',
                expect.any(Object)
            );
        });

        it('should handle health check failure', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await client.checkHealth();

            expect(result.healthy).toBe(false);
            expect(result.error).toBe('Network error');
        });
    });

    describe('metrics', () => {
        it('should track request metrics', async () => {
            // Reset metrics
            client.metrics = { requests: 0, errors: 0, totalTime: 0 };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({})
            });

            await client.get('/test1');
            await client.post('/test2', {});

            // Make a failing request
            global.fetch.mockRejectedValueOnce(new Error('Error'));
            await client.get('/test3');

            const metrics = client.getClientMetrics();
            expect(metrics.requests).toBe(3);
            expect(metrics.errors).toBe(1);
            expect(metrics.successRate).toBe(67); // 2/3 success = 67%
        });

        it('should calculate average response time', async () => {
            // Reset metrics
            client.metrics = { requests: 0, errors: 0, totalTime: 0 };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({})
            });

            await client.get('/test1');
            await client.get('/test2');

            const metrics = client.getClientMetrics();
            expect(metrics.requests).toBe(2);
            expect(metrics.avgResponseTime).toBeGreaterThan(0);
        });
    });

    describe('clearCache', () => {
        it('should clear all cached data', async () => {
            const mockResponse = {
                aggregations: { events: { buckets: [] } }
            };

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            });

            // Cache some data by making a traffic data request
            const config = {
                currentTimeRange: 'now-12h',
                baselineStart: '2025-06-01',
                baselineEnd: '2025-06-09'
            };

            await client.fetchTrafficData(config);
            expect(client.cache.size).toBe(1);

            // Clear cache
            client.clearCache();
            expect(client.cache.size).toBe(0);

            // Next request should fetch again
            await client.fetchTrafficData(config);
            expect(global.fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('authentication', () => {
        it('should get authentication details from localStorage', async () => {
            const authDetails = await client.getAuthenticationDetails();

            expect(authDetails.valid).toBe(true);
            expect(authDetails.method).toBe('unified-server');
            expect(authDetails.cookie).toBe('sid=Fe26.2**test**');
        });

        it('should handle missing cookie', async () => {
            global.localStorage.getItem.mockReturnValue(null);

            const authDetails = await client.getAuthenticationDetails();

            expect(authDetails.valid).toBe(false);
            expect(authDetails.message).toContain('No authentication cookie found');
        });

        it('should save cookie to localStorage', () => {
            const cookie = 'sid=Fe26.2**newcookie**';
            const result = client.saveElasticCookie(cookie);

            expect(result).toBe(true);
            expect(global.localStorage.setItem).toHaveBeenCalledWith(
                'elasticCookie',
                expect.stringContaining('"cookie":"sid=Fe26.2**newcookie**"')
            );
        });
    });

    describe('initialization', () => {
        it('should initialize successfully when healthy', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ healthy: true, status: 'ok' })
            });

            const eventSpy = vi.fn();
            window.addEventListener('api:connected', eventSpy);

            const result = await client.initialize();

            expect(result).toBe(true);
            expect(eventSpy).toHaveBeenCalled();
        });

        it('should handle initialization failure', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Connection failed'));

            const eventSpy = vi.fn();
            window.addEventListener('api:disconnected', eventSpy);

            const result = await client.initialize();

            expect(result).toBe(false);
            expect(eventSpy).toHaveBeenCalled();
        });
    });
});
