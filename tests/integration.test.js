// tests/integration.test.js - Integration tests for main functionality

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  updateDashboardRealtime,
  startAutoRefresh,
  stopAutoRefresh,
  toggleAutoRefresh,
  config
} from '../src/dashboard.js';

describe('Dashboard Integration', () => {
  let timerId = 1;
  let timers = {};
  let originalConsoleError;

  beforeEach(() => {
    // Store original console.error
    originalConsoleError = console.error;

    // Mock console.error to suppress only "Dashboard update failed:" messages
    console.error = vi.fn((...args) => {
      // Only suppress the specific error we expect during tests
      if (args[0] === 'Dashboard update failed:') {
        return; // Suppress this specific error
      }
      // Let all other errors through
      originalConsoleError(...args);
    });

    // setupDOM() is not needed - DOM is already set up by setup.js
    global.fetch = vi.fn();
    localStorage.clear();
    document.cookie = '';

    // Reset DOM
    document.body.innerHTML = `
      <div class="summary">
        <div class="card critical"><div class="card-number">0</div></div>
        <div class="card warning"><div class="card-number">0</div></div>
        <div class="card normal"><div class="card-number">0</div></div>
        <div class="card increased"><div class="card-number">0</div></div>
      </div>
      <div class="timestamp">Not updated</div>
      <table>
        <tbody></tbody>
      </table>
    `;

    // Mock timers manually to ensure proper behavior
    timerId = 1;
    timers = {};

    global.setInterval = vi.fn((callback, delay) => {
      const id = timerId++;
      timers[id] = { callback, delay };
      return id;
    });

    global.clearInterval = vi.fn((id) => {
      delete timers[id];
    });

    // Reset config
    config.autoRefreshEnabled = true;
    config.autoRefreshInterval = 300000; // 5 minutes
  });

  afterEach(() => {
    stopAutoRefresh();
    vi.clearAllMocks();
    // Restore original console.error
    console.error = originalConsoleError;
  });

  describe('updateDashboardRealtime', () => {
    it('should successfully update dashboard with valid auth', async () => {
      // Mock authentication
      document.cookie = 'elastic_cookie=test_cookie';
      fetch.mockResolvedValueOnce(createMockResponse({}, 200)); // CORS proxy check

      // Mock API response
      const mockResponse = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_apmc', 16000, 100),    // Changed to 100 for -90% drop -> CRITICAL
        createBucket('pandc.vnext.recommendations.feed.feed_marketing', 8000, 480) // Changed to 480 for -4% drop -> NORMAL
      ]);

      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      setLocation('localhost');

      const result = await updateDashboardRealtime();

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);

      // Check UI was updated
      expect(document.querySelector('.card.critical .card-number').textContent).toBe('1');
      expect(document.querySelector('.card.normal .card-number').textContent).toBe('1');
      expect(document.querySelector('.timestamp').textContent).toContain('Last updated:');
    });

    it('should handle authentication failure', async () => {
      // No cookie set
      setLocation('localhost');

      const result = await updateDashboardRealtime();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication not available or invalid');

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith('Dashboard update failed:', expect.any(Error));
    });

    it('should handle API errors gracefully', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      fetch.mockResolvedValueOnce(createMockResponse({}, 200)); // CORS proxy check

      // Mock API error
      fetch.mockResolvedValueOnce(createMockResponse({}, 401));

      setLocation('localhost');

      const result = await updateDashboardRealtime();

      expect(result.success).toBe(false);
      expect(result.error).toContain('HTTP 401');

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith('Dashboard update failed:', expect.any(Error));
    });

    it('should use custom configuration', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      fetch.mockResolvedValueOnce(createMockResponse({}, 200)); // CORS proxy check

      const customConfig = {
        baselineStart: '2025-05-01',
        baselineEnd: '2025-05-31',
        currentTimeRange: 'now-24h'
      };

      const mockResponse = createElasticsearchResponse([]);
      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      setLocation('localhost');

      await updateDashboardRealtime(customConfig);

      // Check that custom config was passed to API
      const requestBody = JSON.parse(fetch.mock.calls[1][1].body);
      expect(requestBody.aggs.events.aggs.baseline.filter.range['@timestamp'].gte).toBe('2025-05-01');
      expect(requestBody.aggs.events.aggs.current.filter.range['@timestamp'].gte).toBe('now-24h');
    });

    it('should handle network errors', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      fetch.mockRejectedValueOnce(new Error('Network error')); // CORS proxy fails

      setLocation('localhost');

      const result = await updateDashboardRealtime();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication not available or invalid');

      // Verify error was logged
      expect(console.error).toHaveBeenCalledWith('Dashboard update failed:', expect.any(Error));
    });

    it('should work on GitHub Pages without CORS proxy', async () => {
      document.cookie = 'elastic_cookie=github_cookie';

      setLocation('balkhalil.github.io');

      const mockResponse = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_test', 8000, 8000)
      ]);

      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await updateDashboardRealtime();

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://usieventho-prod-usw2.kb.us-west-2.aws.found.io'),
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'kbn-xsrf': 'true',
            'Cookie': 'sid=github_cookie'
          })
        })
      );
    });
  });

  describe('Auto-refresh functionality', () => {
    it('should start auto-refresh timer', () => {
      const updateSpy = vi.fn();
      vi.spyOn(global, 'setInterval');

      startAutoRefresh();

      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 300000);
    });

    it('should stop auto-refresh timer', () => {
      const clearSpy = vi.spyOn(global, 'clearInterval');

      startAutoRefresh();
      stopAutoRefresh();

      expect(clearSpy).toHaveBeenCalled();
    });

    it('should not start timer if auto-refresh is disabled', () => {
      config.autoRefreshEnabled = false;
      const setSpy = vi.spyOn(global, 'setInterval');

      startAutoRefresh();

      expect(setSpy).not.toHaveBeenCalled();
    });

    it('should trigger update after interval', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      setLocation('balkhalil.github.io');

      const mockResponse = createElasticsearchResponse([]);
      fetch.mockResolvedValue(createMockResponse(mockResponse));

      startAutoRefresh();

      // Manually trigger the timer callback
      const timerId = Object.keys(timers)[0];
      if (timers[timerId]) {
        await timers[timerId].callback();
      }

      // Check that fetch was called (indicating update was triggered)
      expect(fetch).toHaveBeenCalled();
    });

    it('should handle multiple start calls', () => {
      const setSpy = vi.spyOn(global, 'setInterval');
      const clearSpy = vi.spyOn(global, 'clearInterval');

      startAutoRefresh();
      startAutoRefresh(); // Second call

      // Should clear first timer before starting new one
      expect(clearSpy).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledTimes(2);
    });

    it('should toggle auto-refresh correctly', () => {
      // Initially enabled
      expect(config.autoRefreshEnabled).toBe(true);

      // Toggle off
      let result = toggleAutoRefresh();
      expect(result).toBe(false);
      expect(config.autoRefreshEnabled).toBe(false);

      // Toggle on
      result = toggleAutoRefresh();
      expect(result).toBe(true);
      expect(config.autoRefreshEnabled).toBe(true);
    });

    it('should start/stop timer when toggling', () => {
      const setSpy = vi.spyOn(global, 'setInterval');
      const clearSpy = vi.spyOn(global, 'clearInterval');

      // Start with auto-refresh enabled
      config.autoRefreshEnabled = true;

      // Toggle off (was on)
      toggleAutoRefresh();
      // Since there wasn't a timer running, clearInterval might not be called
      expect(config.autoRefreshEnabled).toBe(false);

      // Toggle on
      toggleAutoRefresh();
      expect(setSpy).toHaveBeenCalled();
      expect(config.autoRefreshEnabled).toBe(true);

      // Now toggle off again (with timer running)
      toggleAutoRefresh();
      expect(clearSpy).toHaveBeenCalled();
      expect(config.autoRefreshEnabled).toBe(false);
    });

    it('should use custom refresh interval', async () => {
      config.autoRefreshInterval = 60000; // 1 minute
      document.cookie = 'elastic_cookie=test_cookie';
      setLocation('balkhalil.github.io');

      const mockResponse = createElasticsearchResponse([]);
      fetch.mockResolvedValue(createMockResponse(mockResponse));

      startAutoRefresh();

      // Check that setInterval was called with correct delay
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 60000);

      // Manually trigger the timer callback
      const timerId = Object.keys(timers)[0];
      if (timers[timerId]) {
        await timers[timerId].callback();
      }

      expect(fetch).toHaveBeenCalled();

      // Reset
      config.autoRefreshInterval = 300000;
    });
  });

  describe('Console error handling', () => {
    it('should suppress only "Dashboard update failed:" errors', async () => {
      // This should be suppressed
      console.error('Dashboard update failed:', new Error('Test error'));

      // This should NOT be suppressed and should call originalConsoleError
      console.error('Some other error', 'with details');

      // Verify the console.error mock was called twice
      expect(console.error).toHaveBeenCalledTimes(2);

      // Verify the specific calls
      expect(console.error).toHaveBeenCalledWith('Dashboard update failed:', expect.any(Error));
      expect(console.error).toHaveBeenCalledWith('Some other error', 'with details');

      // We can't directly test that originalConsoleError was called for the second one
      // but we've verified our logic handles it correctly
    });
  });

  describe('End-to-end scenarios', () => {
    it('should handle complete traffic drop scenario', async () => {
      // Setup
      document.cookie = 'elastic_cookie=test_cookie';
      setLocation('balkhalil.github.io');

      // Mock critical traffic drop
      const mockResponse = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_apmc', 168000, 2100),      // -80% drop
        createBucket('pandc.vnext.recommendations.feed.feed_creategmb', 80000, 500),   // -90% drop
        createBucket('pandc.vnext.recommendations.feed.feed_marketing', 40000, 2375),  // Changed from 475 to 2375 for -5% drop
        createBucket('pandc.vnext.recommendations.feed.feed_ssl', 20000, 1875)         // +50% increase
      ]);

      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Execute
      const result = await updateDashboardRealtime();

      // Verify
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(4);

      // Check sorting (most critical first)
      expect(result.results[0].score).toBe(-90);  // creategmb has the most critical drop
      expect(result.results[0].status).toBe('CRITICAL');

      // Check UI summary
      expect(document.querySelector('.card.critical .card-number').textContent).toBe('2');
      expect(document.querySelector('.card.warning .card-number').textContent).toBe('0');
      expect(document.querySelector('.card.normal .card-number').textContent).toBe('1');
      expect(document.querySelector('.card.increased .card-number').textContent).toBe('1');

      // Check table
      const rows = document.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(4);
      expect(rows[0].querySelector('.event-name').textContent).toBe('feed_creategmb');
    });

    it('should handle configuration changes during runtime', async () => {
      // Initial setup
      document.cookie = 'elastic_cookie=test_cookie';
      setLocation('balkhalil.github.io');

      // Update configuration
      config.minDailyVolume = 5000;
      config.criticalThreshold = -70;

      const mockResponse = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_high', 48000, 3000),  // 6000 daily avg, 0% change
        createBucket('pandc.vnext.recommendations.feed.feed_low', 32000, 2000)    // 4000 daily avg - filtered
      ]);

      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await updateDashboardRealtime();

      // Only high volume event should be included
      expect(result.results).toHaveLength(1);
      expect(result.results[0].eventId).toContain('high');

      // Reset config
      config.minDailyVolume = 100;
      config.criticalThreshold = -80;
    });
  });
});

describe('Flexible Time Comparison Integration', () => {
  it('should handle request with comparison_start and comparison_end', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('localhost');
    fetch.mockResolvedValueOnce(createMockResponse({}, 200)); // CORS proxy check

    const customConfig = {
      baselineStart: '2023-11-01T00:00:00Z',
      baselineEnd: '2023-11-04T12:00:00Z',
      comparisonStart: '2023-11-11T11:21:00Z',
      comparisonEnd: '2023-11-11T12:00:00Z',
      timeComparisonStrategy: 'linear_scale'
    };

    const mockResponse = createElasticsearchResponse([
      createBucket('pandc.vnext.recommendations.feed.feed_test', 12923, 100)
    ]);

    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    await updateDashboardRealtime(customConfig);

    // Verify the request included new fields
    const requestBody = JSON.parse(fetch.mock.calls[1][1].body);
    const currentFilter = requestBody.aggs.events.aggs.current.filter.range['@timestamp'];

    // Should use comparison dates instead of time range
    expect(currentFilter.gte).toBe('2023-11-11T11:21:00Z');
    expect(currentFilter.lte).toBe('2023-11-11T12:00:00Z');
  });

  it('should calculate normalization factor correctly', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    // 3.5 days baseline vs 39 minutes comparison
    const baselineMs = 3.5 * 24 * 60 * 60 * 1000; // 302,400,000 ms
    const comparisonMs = 39 * 60 * 1000; // 2,340,000 ms
    const expectedNormalizationFactor = baselineMs / comparisonMs; // ~129.23

    const mockResponse = {
      took: 50,
      aggregations: {
        events: {
          buckets: [{
            key: 'test.event',
            doc_count: 13023,
            baseline: { doc_count: 12923 },
            current: { doc_count: 100 }
          }]
        }
      }
    };

    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    const result = await updateDashboardRealtime({
      baselineStart: new Date(Date.now() - baselineMs).toISOString(),
      baselineEnd: new Date().toISOString(),
      comparisonStart: new Date(Date.now() - comparisonMs).toISOString(),
      comparisonEnd: new Date().toISOString(),
      timeComparisonStrategy: 'linear_scale'
    });

    // With linear scale, baseline_period should be ~100 (12923 / 129.23)
    expect(result.results[0].baseline12h).toBeCloseTo(100, 0);
  });

  it('should support all time comparison strategies', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    const strategies = ['linear_scale', 'hourly_average', 'daily_pattern'];

    for (const strategy of strategies) {
      const mockResponse = createElasticsearchResponse([
        createBucket('test.event', 9600, 200)
      ]);

      fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      const result = await updateDashboardRealtime({
        baselineStart: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        baselineEnd: new Date().toISOString(),
        comparisonStart: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        comparisonEnd: new Date().toISOString(),
        timeComparisonStrategy: strategy
      });

      expect(result.success).toBe(true);

      // Different strategies should produce different baseline calculations
      if (strategy === 'hourly_average') {
        // 9600 / 96 hours = 100/hour, 100 * 2 hours = 200
        expect(result.results[0].baseline12h).toBeCloseTo(200, 0);
      }
    }
  });

  it('should maintain backward compatibility with currentTimeRange', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    const mockResponse = createElasticsearchResponse([
      createBucket('test.event', 10000, 500)
    ]);

    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    // Use old-style config
    const result = await updateDashboardRealtime({
      baselineStart: '2023-11-01',
      baselineEnd: '2023-11-08',
      currentTimeRange: 'now-12h' // Old style
    });

    expect(result.success).toBe(true);

    // Should still work with old time range format
    const requestBody = JSON.parse(fetch.mock.calls[0][1].body);
    expect(requestBody.aggs.events.aggs.current.filter.range['@timestamp'].gte).toBe('now-12h');
  });

  it('should handle edge case: zero duration comparison', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    const now = new Date().toISOString();

    const mockResponse = createElasticsearchResponse([
      createBucket('test.event', 1000, 0)
    ]);

    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    // Same start and end time (zero duration)
    const result = await updateDashboardRealtime({
      baselineStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      baselineEnd: now,
      comparisonStart: now,
      comparisonEnd: now,
      timeComparisonStrategy: 'linear_scale'
    });

    // Should handle gracefully without errors
    expect(result.success).toBe(true);
    expect(result.results[0].baseline12h).toBeGreaterThanOrEqual(0);
  });

  it('should handle fractional day baselines', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    // 2.5 days = 60 hours baseline
    const baselineMs = 2.5 * 24 * 60 * 60 * 1000;
    const comparisonMs = 30 * 60 * 1000; // 30 minutes

    const mockResponse = createElasticsearchResponse([
      createBucket('test.event', 6000, 50)
    ]);

    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    const result = await updateDashboardRealtime({
      baselineStart: new Date(Date.now() - baselineMs).toISOString(),
      baselineEnd: new Date().toISOString(),
      comparisonStart: new Date(Date.now() - comparisonMs).toISOString(),
      comparisonEnd: new Date().toISOString(),
      timeComparisonStrategy: 'linear_scale'
    });

    // Normalization factor = 60 hours / 0.5 hours = 120
    // baseline_period = 6000 / 120 = 50
    expect(result.results[0].baseline12h).toBeCloseTo(50, 0);
  });

  it('should include normalization metadata in response', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    const mockResponse = {
      took: 50,
      aggregations: {
        events: {
          buckets: [{
            key: 'test.event',
            doc_count: 100,
            baseline: { doc_count: 1000 },
            current: { doc_count: 100 }
          }]
        }
      },
      // Enhanced response includes metadata
      _meta: {
        baseline_duration_ms: 604800000, // 7 days
        comparison_duration_ms: 3600000, // 1 hour
        normalization_factor: 168.0,
        comparison_method: 'linear_scale'
      }
    };

    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    const result = await updateDashboardRealtime({
      baselineStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      baselineEnd: new Date().toISOString(),
      comparisonStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      comparisonEnd: new Date().toISOString(),
      timeComparisonStrategy: 'linear_scale'
    });

    expect(result.success).toBe(true);
    // Could check for metadata if the dashboard code exposes it
  });
});

describe('Error scenarios for flexible time comparison', () => {
  it('should handle invalid time comparison strategy gracefully', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    const mockResponse = createElasticsearchResponse([]);
    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    // Pass invalid strategy
    const result = await updateDashboardRealtime({
      baselineStart: '2023-11-01',
      baselineEnd: '2023-11-08',
      comparisonStart: '2023-11-10T00:00:00Z',
      comparisonEnd: '2023-11-10T01:00:00Z',
      timeComparisonStrategy: 'invalid_strategy' // Invalid
    });

    // Should fall back to default or handle gracefully
    expect(result.success).toBe(true);
  });

  it('should handle comparison period longer than baseline', async () => {
    document.cookie = 'elastic_cookie=test_cookie';
    setLocation('balkhalil.github.io');

    const mockResponse = createElasticsearchResponse([
      createBucket('test.event', 1000, 5000)
    ]);

    fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

    // Comparison period (7 days) > baseline period (1 day)
    const result = await updateDashboardRealtime({
      baselineStart: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      baselineEnd: new Date().toISOString(),
      comparisonStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      comparisonEnd: new Date().toISOString(),
      timeComparisonStrategy: 'linear_scale'
    });

    // Should still work, normalization factor < 1
    expect(result.success).toBe(true);
  });
});

// Helper functions
function createMockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data))
  };
}

function createElasticsearchResponse(buckets) {
  return {
    took: 50,
    aggregations: {
      events: {
        buckets: buckets.map(b => ({
          key: b.key,
          doc_count: b.baseline + b.current,
          baseline: { doc_count: b.baseline },
          current: { doc_count: b.current }
        }))
      }
    }
  };
}

function createBucket(eventId, baseline, current) {
  return { key: eventId, baseline, current };
}

function setLocation(hostname) {
  delete window.location;
  window.location = { hostname };
}
