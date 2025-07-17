// tests/dataProcessing.test.js - Data processing and API tests

import { describe, it, expect, vi } from 'vitest';
import { processElasticsearchResponse, fetchTrafficData, config } from '../src/dashboard.js';

describe('Data Processing', () => {
  describe('processElasticsearchResponse', () => {
    it('should process valid Elasticsearch response', () => {
      const response = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_creategmb', 8000, 1000),
        createBucket('pandc.vnext.recommendations.feed.feed_marketing', 4000, 3800),
        createBucket('pandc.vnext.recommendations.feed.feed_startseo', 16000, 100)
      ]);

      const results = processElasticsearchResponse(response);

      expect(results).toHaveLength(3);
      expect(results[0].eventId).toBe('pandc.vnext.recommendations.feed.feed_startseo');
      expect(results[0].score).toBe(-90); // 90% drop: 100 current vs 1000 baseline
      expect(results[0].status).toBe('CRITICAL');
    });

    it('should filter out low volume events', () => {
      const response = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_high', 8000, 4000),
        createBucket('pandc.vnext.recommendations.feed.feed_low', 400, 50), // 50 daily avg
        createBucket('pandc.vnext.recommendations.feed.feed_medium', 2000, 1000)
      ]);

      const results = processElasticsearchResponse(response);

      expect(results).toHaveLength(2);
      expect(results.find(r => r.eventId.includes('low'))).toBeUndefined();
    });

    it('should calculate baseline for 12 hours correctly', () => {
      const response = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_test', 19200, 1200)
        // 19200 over 8 days = 2400/day = 100/hour = 1200 for 12 hours
      ]);

      const results = processElasticsearchResponse(response);

      expect(results[0].baseline12h).toBe(1200);
      expect(results[0].current).toBe(1200);
      expect(results[0].score).toBe(0); // No change
    });

    it('should sort results by score (most negative first)', () => {
      const response = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_a', 4000, 187),  // Changed from 375 to 187 for -25%
        createBucket('pandc.vnext.recommendations.feed.feed_b', 4000, 25),   // -90%
        createBucket('pandc.vnext.recommendations.feed.feed_c', 4000, 125),  // -50%
        createBucket('pandc.vnext.recommendations.feed.feed_d', 4000, 312)   // +25%
      ]);

      const results = processElasticsearchResponse(response);

      expect(results[0].score).toBe(-90);
      expect(results[1].score).toBe(-50);
      expect(results[2].score).toBe(-25);
      expect(results[3].score).toBe(25);
    });

    it('should handle empty buckets', () => {
      const response = createElasticsearchResponse([]);
      const results = processElasticsearchResponse(response);
      expect(results).toHaveLength(0);
    });

    it('should throw error for invalid response structure', () => {
      expect(() => processElasticsearchResponse({})).toThrow('Invalid response structure');
      expect(() => processElasticsearchResponse({ aggregations: {} })).toThrow('Invalid response structure');
    });

    it('should remove event prefix from display name', () => {
      const response = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_creategmb', 8000, 4000)
      ]);

      const results = processElasticsearchResponse(response);
      expect(results[0].displayName).toBe('feed_creategmb');
    });

    it('should handle missing baseline or current counts', () => {
      const response = {
        aggregations: {
          events: {
            buckets: [
              { key: 'pandc.vnext.recommendations.feed.feed_test', baseline: {}, current: { doc_count: 100 } },
              { key: 'pandc.vnext.recommendations.feed.feed_test2', baseline: { doc_count: 1000 }, current: {} }
            ]
          }
        }
      };

      const results = processElasticsearchResponse(response);
      
      // First bucket has no baseline, so it's filtered out (0 daily avg)
      // Second bucket has baseline but no current
      expect(results).toHaveLength(1);
      expect(results[0].current).toBe(0);
    });

    it('should respect minDailyVolume configuration', () => {
      const originalMinVolume = config.minDailyVolume;
      config.minDailyVolume = 200;

      const response = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_high', 2000, 1000),  // 250 daily
        createBucket('pandc.vnext.recommendations.feed.feed_low', 1200, 600)     // 150 daily
      ]);

      const results = processElasticsearchResponse(response);
      
      expect(results).toHaveLength(1);
      expect(results[0].eventId).toContain('high');

      // Restore original value
      config.minDailyVolume = originalMinVolume;
    });
  });

  describe('fetchTrafficData', () => {
    beforeEach(() => {
      fetch.mockClear();
    });

    it('should fetch data using proxy method', async () => {
      const auth = { valid: true, method: 'proxy', cookie: 'test_cookie' };
      const mockResponse = createElasticsearchResponse([]);
      
      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await fetchTrafficData(auth);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8889/kibana-proxy',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Elastic-Cookie': 'test_cookie'
          },
          credentials: 'omit'
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should fetch data using direct method', async () => {
      const auth = { valid: true, method: 'direct', cookie: 'test_cookie' };
      const mockResponse = createElasticsearchResponse([]);
      
      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await fetchTrafficData(auth);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/console/proxy'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'kbn-xsrf': 'true',
            'Cookie': 'sid=test_cookie'
          },
          credentials: 'include'
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should use custom configuration when provided', async () => {
      const auth = { valid: true, method: 'proxy', cookie: 'test_cookie' };
      const customConfig = {
        baselineStart: '2025-05-01',
        baselineEnd: '2025-05-31',
        currentTimeRange: 'now-24h'
      };
      
      fetch.mockResolvedValueOnce(createMockResponse({}));

      await fetchTrafficData(auth, customConfig);

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      
      expect(requestBody.aggs.events.aggs.baseline.filter.range['@timestamp'].gte).toBe('2025-05-01');
      expect(requestBody.aggs.events.aggs.baseline.filter.range['@timestamp'].lt).toBe('2025-05-31');
      expect(requestBody.aggs.events.aggs.current.filter.range['@timestamp'].gte).toBe('now-24h');
    });

    it('should throw error on HTTP error response', async () => {
      const auth = { valid: true, method: 'proxy', cookie: 'test_cookie' };
      
      fetch.mockResolvedValueOnce(createMockResponse({}, 401));

      await expect(fetchTrafficData(auth)).rejects.toThrow('HTTP 401');
    });

    it('should throw error on Elasticsearch error', async () => {
      const auth = { valid: true, method: 'proxy', cookie: 'test_cookie' };
      const errorResponse = {
        error: {
          type: 'security_exception',
          reason: 'Invalid authentication'
        }
      };
      
      fetch.mockResolvedValueOnce(createMockResponse(errorResponse));

      await expect(fetchTrafficData(auth)).rejects.toThrow('Elasticsearch error: Invalid authentication');
    });

    it('should throw error on network failure', async () => {
      const auth = { valid: true, method: 'proxy', cookie: 'test_cookie' };
      
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchTrafficData(auth)).rejects.toThrow('Network error');
    });

    it('should build correct query structure', async () => {
      const auth = { valid: true, method: 'proxy', cookie: 'test_cookie' };
      
      fetch.mockResolvedValueOnce(createMockResponse({}));

      await fetchTrafficData(auth);

      const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
      
      // Check query structure
      expect(requestBody.size).toBe(0);
      expect(requestBody.aggs.events.terms.field).toBe('detail.event.data.traffic.eid.keyword');
      expect(requestBody.aggs.events.terms.size).toBe(500);
      expect(requestBody.query.bool.filter).toHaveLength(3);
      
      // Check filters
      const filters = requestBody.query.bool.filter;
      expect(filters[0].wildcard['detail.event.data.traffic.eid.keyword'].value).toBe('pandc.vnext.recommendations.feed.feed*');
      expect(filters[1].match_phrase['detail.global.page.host']).toBe('dashboard.godaddy.com');
      expect(filters[2].range['@timestamp'].gte).toBe('2025-05-19T04:00:00.000Z');
    });

    it('should handle timeout gracefully', async () => {
      const auth = { valid: true, method: 'proxy', cookie: 'test_cookie' };
      
      // Create a promise that rejects immediately
      fetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(fetchTrafficData(auth)).rejects.toThrow('Request timeout');
    });
  });
}); 