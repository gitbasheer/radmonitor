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
  
  beforeEach(() => {
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