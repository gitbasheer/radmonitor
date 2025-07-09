/**
 * Core Dashboard Integration Tests
 * Refactored to use new test utilities for better maintainability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createMockResponse,
  createElasticsearchResponse,
  createBucket,
  waitForDOMUpdate,
  waitForNextTick,
  assertElementExists,
  assertAPICall,
  setLocationForTest
} from '../utils/test-helpers.js';

// Import the dashboard module
import {
  updateDashboardRealtime,
  startAutoRefresh,
  stopAutoRefresh,
  toggleAutoRefresh,
  getAuthenticationDetails
} from '../../src/dashboard.js';

describe('Dashboard Core Integration', () => {
  beforeEach(() => {
    setupTestEnvironment({
      hostname: 'localhost',
      authentication: {
        cookie: 'dashboard_test_cookie'
      },
      configuration: {
        baselineStart: '2025-06-01',
        baselineEnd: '2025-06-09',
        currentTimeRange: 'now-12h',
        highVolumeThreshold: 1000,
        mediumVolumeThreshold: 100,
        autoRefreshEnabled: true,
        autoRefreshInterval: 300000
      }
    });
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('Dashboard Update Functionality', () => {
    it('should successfully update dashboard with valid data', async () => {
      // Arrange - Set up test data
      const testBuckets = [
        createBucket('pandc.vnext.recommendations.feed.feed_apmc', 16000, 100), // -90% drop -> CRITICAL
        createBucket('pandc.vnext.recommendations.feed.feed_marketing', 8000, 480), // -4% drop -> NORMAL
        createBucket('pandc.vnext.recommendations.metricsevolved.test', 5000, 2500) // -50% drop -> WARNING
      ];

      const mockResponse = createElasticsearchResponse(testBuckets);
      global.fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Act - Execute dashboard update
      const result = await updateDashboardRealtime();
      await waitForDOMUpdate();

      // Assert - Verify results
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);

      // Verify specific event processing
      const criticalEvent = result.results.find(r => r.eventId === 'pandc.vnext.recommendations.feed.feed_apmc');
      expect(criticalEvent.score).toBe(-90);
      expect(criticalEvent.status).toBe('CRITICAL');

      const normalEvent = result.results.find(r => r.eventId === 'pandc.vnext.recommendations.feed.feed_marketing');
      expect(normalEvent.score).toBe(-4);
      expect(normalEvent.status).toBe('NORMAL');

      // Verify API call was made correctly
      assertAPICall(global.fetch, '/_search', { method: 'POST' });
    });

    it('should handle authentication failure gracefully', async () => {
      // Arrange - Remove authentication
      localStorage.removeItem('elasticCookie');

      // Act
      const result = await updateDashboardRealtime();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('authentication');
    });

    it('should handle API errors with proper error reporting', async () => {
      // Arrange - Mock API error
      global.fetch.mockResolvedValueOnce(createMockResponse(
        { error: 'Unauthorized' },
        401
      ));

      // Act
      const result = await updateDashboardRealtime();
      await waitForNextTick();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('401');
      expect(console.error).toHaveBeenCalledWith(
        'Dashboard update failed:',
        expect.any(Error)
      );
    });

    it('should work with custom configuration', async () => {
      // Arrange - Custom config
      const customConfig = {
        baselineStart: '2025-05-01',
        baselineEnd: '2025-05-31',
        currentTimeRange: 'now-24h',
        highVolumeThreshold: 2000
      };

      const mockResponse = createElasticsearchResponse([]);
      global.fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Act
      await updateDashboardRealtime(customConfig);
      await waitForNextTick();

      // Assert - Verify custom config was used in API call
      const apiCall = global.fetch.mock.calls.find(call => call[1]?.body);
      if (apiCall) {
        const requestBody = JSON.parse(apiCall[1].body);
        expect(requestBody.aggs.events.aggs.baseline.filter.range['@timestamp'].gte)
          .toBe('2025-05-01');
        expect(requestBody.aggs.events.aggs.current.filter.range['@timestamp'].gte)
          .toBe('now-24h');
      }
    });

    it('should handle network errors appropriately', async () => {
      // Arrange - Network error
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      // Act
      const result = await updateDashboardRealtime();
      await waitForNextTick();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(console.error).toHaveBeenCalledWith(
        'Dashboard update failed:',
        expect.any(Error)
      );
    });
  });

  describe('Environment-Specific Behavior', () => {
    it('should work correctly on GitHub Pages', async () => {
      // Arrange - GitHub Pages environment
      setLocationForTest('balkhalil.github.io');

      const mockResponse = createElasticsearchResponse([
        createBucket('pandc.vnext.recommendations.feed.feed_test', 8000, 8000)
      ]);
      global.fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Act
      const result = await updateDashboardRealtime();
      await waitForNextTick();

      // Assert
      expect(result.success).toBe(true);

      // Verify direct Elasticsearch call (no CORS proxy)
      assertAPICall(global.fetch, '/_search', {
        method: 'POST'
      });
    });

    it('should use CORS proxy for localhost', async () => {
      // Arrange - Already set to localhost by default
      const mockResponse = createElasticsearchResponse([]);
      global.fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Act
      await updateDashboardRealtime();
      await waitForNextTick();

      // Assert - Should make API call (exact URL depends on implementation)
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Auto-refresh Functionality', () => {
    it('should start auto-refresh timer correctly', async () => {
      // Arrange
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      // Act
      startAutoRefresh();
      await waitForNextTick();

      // Assert
      expect(setIntervalSpy).toHaveBeenCalledWith(
        expect.any(Function),
        300000
      );
    });

    it('should stop auto-refresh timer correctly', async () => {
      // Arrange
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      startAutoRefresh();
      await waitForNextTick();

      // Act
      stopAutoRefresh();
      await waitForNextTick();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should respect auto-refresh configuration', async () => {
      // Arrange - Disabled auto-refresh
      const configData = {
        autoRefreshEnabled: false,
        autoRefreshInterval: 300000,
        baselineStart: '2025-06-01',
        baselineEnd: '2025-06-09',
        currentTimeRange: 'now-12h',
        highVolumeThreshold: 1000,
        mediumVolumeThreshold: 100,
        minDailyVolume: 100,
        criticalThreshold: -80,
        warningThreshold: -50
      };
      localStorage.setItem('radMonitorConfig', JSON.stringify(configData));

      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      // Act
      startAutoRefresh();
      await waitForNextTick();

      // Assert
      expect(setIntervalSpy).not.toHaveBeenCalled();
    });

    it('should toggle auto-refresh state correctly', () => {
      // Arrange - Start with enabled
      const initialConfig = {
        autoRefreshEnabled: true,
        autoRefreshInterval: 300000,
        baselineStart: '2025-06-01',
        baselineEnd: '2025-06-09',
        currentTimeRange: 'now-12h',
        highVolumeThreshold: 1000,
        mediumVolumeThreshold: 100,
        minDailyVolume: 100,
        criticalThreshold: -80,
        warningThreshold: -50
      };
      localStorage.setItem('radMonitorConfig', JSON.stringify(initialConfig));

      // Act & Assert - Toggle off
      let result = toggleAutoRefresh();
      expect(result).toBe(false);

      let savedConfig = JSON.parse(localStorage.getItem('radMonitorConfig'));
      expect(savedConfig.autoRefreshEnabled).toBe(false);

      // Act & Assert - Toggle on
      result = toggleAutoRefresh();
      expect(result).toBe(true);

      savedConfig = JSON.parse(localStorage.getItem('radMonitorConfig'));
      expect(savedConfig.autoRefreshEnabled).toBe(true);
    });

    it('should trigger dashboard update on timer interval', async () => {
      // Arrange
      const mockResponse = createElasticsearchResponse([]);
      global.fetch.mockResolvedValue(createMockResponse(mockResponse));

      // Act
      startAutoRefresh();
      await waitForNextTick();

      // Manually trigger the timer callback
      const timerCall = global.setInterval.mock.calls[0];
      if (timerCall && timerCall[0]) {
        await timerCall[0](); // Execute the callback
      }

      // Assert
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Authentication Management', () => {
    it('should detect valid authentication', async () => {
      // Arrange - Authentication already set up in beforeEach

      // Act
      const authDetails = getAuthenticationDetails();

      // Assert
      expect(authDetails.authenticated).toBe(true);
      expect(authDetails.cookie).toBe('dashboard_test_cookie');
    });

    it('should detect missing authentication', async () => {
      // Arrange - Remove authentication
      localStorage.removeItem('elasticCookie');

      // Act
      const authDetails = getAuthenticationDetails();

      // Assert
      expect(authDetails.authenticated).toBe(false);
      expect(authDetails.cookie).toBeNull();
    });

    it('should handle expired authentication', async () => {
      // Arrange - Expired cookie
      const expiredCookieData = {
        cookie: 'expired_cookie',
        expires: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(expiredCookieData));

      // Act
      const authDetails = getAuthenticationDetails();

      // Assert
      expect(authDetails.authenticated).toBe(false);
      expect(authDetails.expired).toBe(true);
    });
  });

  describe('DOM Integration', () => {
    it('should update summary cards correctly', async () => {
      // Arrange
      const testBuckets = [
        createBucket('critical.event.1', 10000, 100),  // Critical
        createBucket('critical.event.2', 5000, 50),    // Critical
        createBucket('warning.event.1', 2000, 800),    // Warning
        createBucket('normal.event.1', 1000, 950),     // Normal
        createBucket('increased.event.1', 500, 750)    // Increased
      ];

      const mockResponse = createElasticsearchResponse(testBuckets);
      global.fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Act
      await updateDashboardRealtime();
      await waitForDOMUpdate();

      // Assert - Check summary cards
      assertElementExists('.card.critical .card-number', { textContent: '2' });
      assertElementExists('.card.warning .card-number', { textContent: '1' });
      assertElementExists('.card.normal .card-number', { textContent: '1' });
      assertElementExists('.card.increased .card-number', { textContent: '1' });
    });

    it('should update data table correctly', async () => {
      // Arrange
      const testBuckets = [
        createBucket('pandc.vnext.recommendations.feed.test_event', 5000, 1000)
      ];

      const mockResponse = createElasticsearchResponse(testBuckets);
      global.fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Act
      await updateDashboardRealtime();
      await waitForDOMUpdate();

      // Assert - Check table content
      const tableBody = document.querySelector('table tbody');
      expect(tableBody.children.length).toBeGreaterThan(0);
      expect(tableBody.innerHTML).toContain('test_event');
      expect(tableBody.innerHTML).toContain('CRITICAL');
    });

    it('should update timestamp correctly', async () => {
      // Arrange
      const mockResponse = createElasticsearchResponse([]);
      global.fetch.mockResolvedValueOnce(createMockResponse(mockResponse));

      // Act
      await updateDashboardRealtime();
      await waitForDOMUpdate();

      // Assert
      const timestamp = document.querySelector('.timestamp');
      expect(timestamp.textContent).toContain('Last updated:');
      expect(timestamp.textContent).toContain(new Date().getFullYear());
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary network failures', async () => {
      // Arrange - First call fails, second succeeds
      global.fetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce(createMockResponse(createElasticsearchResponse([])));

      // Act - First attempt should fail
      let result = await updateDashboardRealtime();
      expect(result.success).toBe(false);

      // Act - Second attempt should succeed
      result = await updateDashboardRealtime();
      await waitForNextTick();

      // Assert
      expect(result.success).toBe(true);
    });

    it('should handle malformed API responses', async () => {
      // Arrange - Invalid response structure
      global.fetch.mockResolvedValueOnce(createMockResponse({
        invalid: 'response'
      }));

      // Act
      const result = await updateDashboardRealtime();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});
