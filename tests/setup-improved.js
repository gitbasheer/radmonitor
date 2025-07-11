// tests/setup-improved.js - Enhanced Global test setup for Vitest

import { vi, beforeEach, afterEach } from 'vitest';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  setupTestAuthentication,
  setupTestConfiguration
} from './utils/test-helpers.js';

// Import modules that tests expect to be global
import { DataLayer } from '../assets/js/data-layer.js';
import { unifiedAPI } from '../assets/js/api-interface.js';

// Enhanced Mock Modules with better functionality
const MockConfigManager = {
  getCurrentConfig: vi.fn(() => ({
    baselineStart: '2025-06-01',
    baselineEnd: '2025-06-09',
    currentTimeRange: 'now-12h',
    highVolumeThreshold: 1000,
    mediumVolumeThreshold: 100,
    minDailyVolume: 100,
    criticalThreshold: -80,
    warningThreshold: -50,
    autoRefreshEnabled: true,
    autoRefreshInterval: 300000
  })),
  loadConfiguration: vi.fn().mockImplementation(() => {
    // Simulate loading from localStorage
    const stored = localStorage.getItem('radMonitorConfig');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        // Update form fields if they exist
        Object.entries(config).forEach(([key, value]) => {
          const element = document.getElementById(key);
          if (element && typeof value !== 'object') {
            element.value = value;
          }
        });
      } catch (e) {
        console.warn('Failed to load configuration:', e);
      }
    }
  }),
  saveConfiguration: vi.fn().mockImplementation((config) => {
    localStorage.setItem('radMonitorConfig', JSON.stringify(config));
  }),
  setPresetTimeRange: vi.fn().mockImplementation((preset) => {
    const element = document.getElementById('currentTimeRange');
    if (element) {
      element.value = `now-${preset}`;
    }
  }),
  highlightActivePreset: vi.fn()
};

const MockConfigService = {
  getConfig: vi.fn(() => ({
    baselineStart: '2025-06-01',
    baselineEnd: '2025-06-09',
    currentTimeRange: 'now-12h',
    highVolumeThreshold: 1000,
    mediumVolumeThreshold: 100,
    minDailyVolume: 100,
    criticalThreshold: -80,
    warningThreshold: -50,
    autoRefreshEnabled: true,
    autoRefreshInterval: 300000,
    theme: 'light',
    maxEventsDisplay: 200,
    elasticCookie: null,
    kibanaUrl: 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243',
    elasticsearchUrl: 'https://usieventho-prod-usw2.es.us-west-2.aws.found.io:9243',
    rad_types: {
      venture_feed: {
        pattern: 'pandc.vnext.recommendations.feed.feed*',
        display_name: 'Venture Feed',
        enabled: true,
        color: '#4CAF50',
        description: 'Venture recommendations feed'
      },
      venture_metrics: {
        pattern: 'pandc.vnext.recommendations.metricsevolved*',
        display_name: 'Venture Metrics',
        enabled: true,
        color: '#9C27B0',
        description: 'Venture metrics evolved events'
      },
      checkout_flow: {
        pattern: 'pandc.vnext.recommendations.checkout*',
        display_name: 'Checkout Flow',
        enabled: true,
        color: '#FF9800',
        description: 'Checkout flow events'
      }
    }
  })),
  setConfig: vi.fn(),
  updateConfig: vi.fn().mockImplementation((updates) => {
    const current = MockConfigService.getConfig();
    const updated = { ...current, ...updates };
    localStorage.setItem('radMonitorConfig', JSON.stringify(updated));
    return updated;
  })
};

// Enhanced DataLayer mock with event system
const MockDataLayer = {
  events: new Map(),
  addEventListener: vi.fn().mockImplementation((event, handler) => {
    if (!MockDataLayer.events.has(event)) {
      MockDataLayer.events.set(event, []);
    }
    MockDataLayer.events.get(event).push(handler);
  }),
  removeEventListener: vi.fn().mockImplementation((event, handler) => {
    if (MockDataLayer.events.has(event)) {
      const handlers = MockDataLayer.events.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }),
  emit: vi.fn().mockImplementation((event, data) => {
    if (MockDataLayer.events.has(event)) {
      MockDataLayer.events.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (e) {
          console.warn('Error in event handler:', e);
        }
      });
    }
  }),
  fetchData: vi.fn().mockResolvedValue({
    success: true,
    data: [],
    timestamp: new Date().toISOString()
  })
};

// Set up the complete test environment
let testEnvironment;

// Initialize test environment before all tests
beforeEach(() => {
  // Mock ResizeObserver for tests
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  // Set up comprehensive test environment
  testEnvironment = setupTestEnvironment({
    hostname: 'localhost',
    authentication: {
      cookie: 'test_cookie_' + Date.now()
    },
    configuration: {
      autoRefreshEnabled: true,
      autoRefreshInterval: 300000
    }
  });

  // Make enhanced modules available globally
  global.DataLayer = MockDataLayer;
  global.unifiedAPI = unifiedAPI;
  global.ConfigManager = MockConfigManager;
  global.ConfigService = MockConfigService;

  // Enhanced mock implementations
  global.fetch.mockImplementation(async (url, options) => {
    // Default mock response for any unmocked fetch calls
    if (url.includes('/_search')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          aggregations: {
            events: {
              buckets: []
            }
          }
        })
      };
    }

    if (url.includes('/api/v1/')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {}
        })
      };
    }

    // Default response
    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '{}'
    };
  });

  // Enhanced console mock that preserves important logs
  const originalConsoleError = console.error;
  console.error = vi.fn((...args) => {
    // Only suppress known test-related errors
    const suppressedMessages = [
      'Dashboard update failed:',
      'Config API error',
      'Backend config load failed'
    ];

    const shouldSuppress = suppressedMessages.some(msg =>
      args[0] && args[0].toString().includes(msg)
    );

    if (!shouldSuppress) {
      originalConsoleError(...args);
    }
  });

  // Set up additional global utilities for backward compatibility
  global.setLocationForTest = testEnvironment.setLocationForTest || ((hostname) => {
    vi.stubGlobal('location', {
      hostname,
      href: hostname === 'localhost' ? `http://${hostname}:8000` : `https://${hostname}`,
      protocol: hostname === 'localhost' ? 'http:' : 'https:',
      port: hostname === 'localhost' ? '8000' : ''
    });
  });

  global.createMockResponse = (data, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers({ 'Content-Type': 'application/json' })
  });

  global.createElasticsearchResponse = (buckets = []) => ({
    aggregations: {
      events: {
        buckets: buckets.map(b => ({
          key: b.key,
          doc_count: (b.baseline || 0) + (b.current || 0),
          baseline: { doc_count: b.baseline || 0 },
          current: { doc_count: b.current || 0 }
        }))
      }
    }
  });

  global.createBucket = (key, baseline, current) => ({ key, baseline, current });

  // Backward compatibility helpers
  global.setupTestAuthentication = setupTestAuthentication;
  global.setupTestConfiguration = setupTestConfiguration;

  // Enhanced wait utilities
  global.waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));
  global.waitForDOMUpdate = async () => {
    await global.waitForNextTick();
    await global.waitForNextTick();
  };
  global.waitForAuthenticationComplete = () => new Promise(resolve => setTimeout(resolve, 100));
});

// Clean up after each test
afterEach(() => {
  cleanupTestEnvironment();

  // Reset mock implementations
  if (MockDataLayer.events) {
    MockDataLayer.events.clear();
  }

  // Reset all mocks to their default implementations
  MockConfigManager.getCurrentConfig.mockReturnValue({
    baselineStart: '2025-06-01',
    baselineEnd: '2025-06-09',
    currentTimeRange: 'now-12h',
    highVolumeThreshold: 1000,
    mediumVolumeThreshold: 100,
    minDailyVolume: 100,
    criticalThreshold: -80,
    warningThreshold: -50,
    autoRefreshEnabled: true,
    autoRefreshInterval: 300000
  });

  MockDataLayer.fetchData.mockResolvedValue({
    success: true,
    data: [],
    timestamp: new Date().toISOString()
  });
});

// Global test configuration
export const TEST_CONFIG = {
  DEFAULT_TIMEOUT: 10000,
  ASYNC_TIMEOUT: 5000,
  DOM_UPDATE_TIMEOUT: 100,

  // Common test data
  SAMPLE_RAD_EVENTS: [
    'pandc.vnext.recommendations.feed.feed_apmc',
    'pandc.vnext.recommendations.feed.feed_marketing',
    'pandc.vnext.recommendations.metricsevolved.test',
    'pandc.vnext.recommendations.checkout.flow_test'
  ],

  // Common test configurations
  TEST_CONFIGURATIONS: {
    DEFAULT: {
      baselineStart: '2025-06-01',
      baselineEnd: '2025-06-09',
      currentTimeRange: 'now-12h',
      highVolumeThreshold: 1000,
      mediumVolumeThreshold: 100
    },
    HIGH_VOLUME: {
      baselineStart: '2025-06-01',
      baselineEnd: '2025-06-09',
      currentTimeRange: 'now-12h',
      highVolumeThreshold: 5000,
      mediumVolumeThreshold: 1000
    }
  }
};

// Export enhanced mocks for direct use in tests
export {
  MockConfigManager,
  MockConfigService,
  MockDataLayer
};
