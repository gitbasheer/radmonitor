/**
 * Test Utilities Verification
 * Tests the new test utilities to ensure they work correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createMockResponse,
  createElasticsearchResponse,
  createBucket,
  generateTestRADEvents,
  assertElementExists,
  assertAPICall,
  waitForNextTick,
  waitForDOMUpdate,
  setLocationForTest
} from '../utils/test-helpers.js';

describe('Test Utilities', () => {
  let testEnv;

  beforeEach(() => {
    testEnv = setupTestEnvironment({
      hostname: 'localhost',
      authentication: {
        cookie: 'test_cookie_123'
      },
      configuration: {
        currentTimeRange: 'now-6h',
        highVolumeThreshold: 2000
      }
    });
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('Environment Setup', () => {
    it('should set up DOM environment correctly', () => {
      expect(global.document).toBeDefined();
      expect(global.window).toBeDefined();
      expect(global.localStorage).toBeDefined();

      // Check that DOM elements exist
      expect(document.getElementById('refreshBtn')).toBeTruthy();
      expect(document.getElementById('baselineStart')).toBeTruthy();
      expect(document.querySelector('.summary-cards')).toBeTruthy();
    });

    it('should set up localStorage correctly', () => {
      expect(global.localStorage.getItem).toBeDefined();
      expect(global.localStorage.setItem).toBeDefined();
      expect(global.localStorage.data).toBeDefined();

      // Test localStorage functionality
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).toBe('value');
      expect(localStorage.data.test).toBe('value');
    });

    it('should set up authentication correctly', () => {
      const cookieData = JSON.parse(localStorage.getItem('elasticCookie'));
      expect(cookieData).toBeTruthy();
      expect(cookieData.cookie).toBe('test_cookie_123');
      expect(cookieData.expires).toBeTruthy();
    });

    it('should set up configuration correctly', () => {
      const configData = JSON.parse(localStorage.getItem('radMonitorConfig'));
      expect(configData).toBeTruthy();
      expect(configData.currentTimeRange).toBe('now-6h');
      expect(configData.highVolumeThreshold).toBe(2000);
    });

    it('should set up location correctly', () => {
      expect(global.location.hostname).toBe('localhost');
      expect(global.location.protocol).toBe('http:');
      expect(global.location.port).toBe('8000');
    });
  });

  describe('Mock Response Creation', () => {
    it('should create proper HTTP responses', () => {
      const response = createMockResponse({ success: true }, 200);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.json).toBeDefined();
      expect(response.text).toBeDefined();
    });

    it('should create error responses', () => {
      const response = createMockResponse({ error: 'Not found' }, 404);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
      expect(response.statusText).toBe('Error');
    });

    it('should create Elasticsearch responses', () => {
      const buckets = [
        createBucket('test.event.1', 1000, 800),
        createBucket('test.event.2', 500, 400)
      ];

      const response = createElasticsearchResponse(buckets);

      expect(response.aggregations).toBeDefined();
      expect(response.aggregations.events.buckets).toHaveLength(2);
      expect(response.aggregations.events.buckets[0].key).toBe('test.event.1');
      expect(response.aggregations.events.buckets[0].baseline.doc_count).toBe(1000);
      expect(response.aggregations.events.buckets[0].current.doc_count).toBe(800);
    });
  });

  describe('Test Data Generation', () => {
    it('should generate test RAD events', () => {
      const events = generateTestRADEvents(3);

      expect(events).toHaveLength(3);
      events.forEach(event => {
        expect(event.key).toMatch(/^pandc\.vnext\.recommendations\./);
        expect(typeof event.baseline).toBe('number');
        expect(typeof event.current).toBe('number');
        expect(event.baseline).toBeGreaterThan(0);
        expect(event.current).toBeGreaterThan(0);
      });
    });

    it('should generate varied RAD types', () => {
      const events = generateTestRADEvents(10);
      const radTypes = events.map(e => e.key.split('.')[3]);
      const uniqueTypes = [...new Set(radTypes)];

      expect(uniqueTypes.length).toBeGreaterThan(1);
    });
  });

  describe('Assertion Helpers', () => {
    it('should assert element existence', () => {
      const element = assertElementExists('#refreshBtn', {
        textContent: 'REFRESH NOW'
      });

      expect(element).toBeTruthy();
      expect(element.textContent).toBe('REFRESH NOW');
    });

    it('should assert API calls', () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValue(createMockResponse({}));

      // Simulate API call
      mockFetch('/api/v1/test', {
        method: 'POST',
        body: JSON.stringify({ test: true })
      });

      assertAPICall(mockFetch, '/api/v1/test', {
        method: 'POST',
        body: 'test'
      });
    });
  });

      describe('Async Utilities', () => {
    it('should provide async utility functions', () => {
      // Test that the functions exist and are callable
      expect(typeof waitForNextTick).toBe('function');
      expect(typeof waitForDOMUpdate).toBe('function');
    });

    it('should return promises from async utilities', () => {
      const nextTickPromise = waitForNextTick();
      const domUpdatePromise = waitForDOMUpdate();

      expect(nextTickPromise).toBeInstanceOf(Promise);
      expect(domUpdatePromise).toBeInstanceOf(Promise);

      // Clean up promises
      nextTickPromise.catch(() => {});
      domUpdatePromise.catch(() => {});
    });
  });

  describe('Location Management', () => {
    it('should change location safely', () => {
      setLocationForTest('github.com');

      expect(global.location.hostname).toBe('github.com');
      expect(global.location.protocol).toBe('https:');
      expect(global.location.port).toBe('');
    });

    it('should handle localhost correctly', () => {
      setLocationForTest('localhost');

      expect(global.location.hostname).toBe('localhost');
      expect(global.location.protocol).toBe('http:');
      expect(global.location.port).toBe('8000');
    });
  });

  describe('Mock Integration', () => {
    it('should work with fetch mocks', async () => {
      const mockData = { results: [{ id: 1, name: 'test' }] };
      global.fetch.mockResolvedValueOnce(createMockResponse(mockData));

      const response = await fetch('/api/test');
      const data = await response.json();

      expect(data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith('/api/test');
    });

    it('should work with localStorage mocks', () => {
      const testConfig = { theme: 'dark', timeout: 5000 };
      localStorage.setItem('config', JSON.stringify(testConfig));

      const stored = JSON.parse(localStorage.getItem('config'));
      expect(stored).toEqual(testConfig);
    });

    it('should work with timer mocks', () => {
      const callback = vi.fn();
      const timerId = setTimeout(callback, 1000);

      expect(global.setTimeout).toHaveBeenCalledWith(callback, 1000);
      expect(typeof timerId).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      expect(() => {
        assertElementExists('#nonexistent');
      }).toThrow();
    });

    it('should handle fetch errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetch('/api/test')).rejects.toThrow('Network error');
    });

    it('should handle localStorage errors', () => {
      // Simulate localStorage error
      localStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      expect(() => localStorage.getItem('test')).toThrow('Storage error');
    });
  });

  describe('Cleanup', () => {
    it('should clean up mocks properly', () => {
      const initialCallCount = global.fetch.mock.calls.length;

      global.fetch.mockResolvedValueOnce(createMockResponse({}));
      fetch('/test');

      expect(global.fetch.mock.calls.length).toBe(initialCallCount + 1);

      cleanupTestEnvironment();

      // After cleanup, mocks should be reset
      expect(global.fetch.mock.calls.length).toBe(0);
    });

    it('should reset localStorage', () => {
      localStorage.setItem('test', 'value');
      expect(localStorage.getItem('test')).toBe('value');

      cleanupTestEnvironment();

      expect(localStorage.getItem('test')).toBeNull();
    });

    it('should reset DOM', () => {
      document.body.innerHTML = '<div>test</div>';
      expect(document.body.innerHTML).toContain('test');

      cleanupTestEnvironment();

      // DOM should be reset to default structure
      expect(document.getElementById('refreshBtn')).toBeTruthy();
    });
  });
});

describe('Test Utilities Integration Examples', () => {
  describe('Dashboard Testing Example', () => {
    beforeEach(() => {
      setupTestEnvironment({
        authentication: { cookie: 'dashboard_test_cookie' },
        configuration: {
          currentTimeRange: 'now-12h',
          highVolumeThreshold: 1000
        }
      });
    });

    afterEach(() => {
      cleanupTestEnvironment();
    });

    it('should test dashboard update workflow', async () => {
      // Mock API response
      const testData = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.test', 1000, 100)
      ]);

      global.fetch.mockResolvedValueOnce(createMockResponse(testData));

      // Simulate dashboard update
      const response = await fetch('/_search', {
        method: 'POST',
        body: JSON.stringify({ query: {} })
      });

      const data = await response.json();

      // Verify response
      expect(data.aggregations.events.buckets).toHaveLength(1);
      expect(data.aggregations.events.buckets[0].key).toBe('pandc.vnext.recommendations.feed.test');

      // Verify API call
      assertAPICall(global.fetch, '/_search', { method: 'POST' });
    });
  });

  describe('Authentication Testing Example', () => {
    it('should test authentication flow', () => {
      setupTestEnvironment({
        authentication: { cookie: 'auth_test_cookie' }
      });

      // Verify authentication is set up
      const cookieData = JSON.parse(localStorage.getItem('elasticCookie'));
      expect(cookieData.cookie).toBe('auth_test_cookie');

      // Test authentication check
      const isAuthenticated = cookieData && cookieData.cookie;
      expect(isAuthenticated).toBeTruthy();

      cleanupTestEnvironment();
    });
  });

  describe('Configuration Testing Example', () => {
    it('should test configuration management', () => {
      const customConfig = {
        currentTimeRange: 'now-24h',
        highVolumeThreshold: 5000,
        theme: 'dark'
      };

      setupTestEnvironment({
        configuration: customConfig
      });

      // Verify configuration is set up
      const configData = JSON.parse(localStorage.getItem('radMonitorConfig'));
      expect(configData.currentTimeRange).toBe('now-24h');
      expect(configData.highVolumeThreshold).toBe(5000);
      expect(configData.theme).toBe('dark');

      cleanupTestEnvironment();
    });
  });
});
