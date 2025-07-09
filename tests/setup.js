// tests/setup.js - Global test setup for Vitest

import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Import modules that tests expect to be global
import { DataLayer } from '../assets/js/data-layer.js';
import { unifiedAPI } from '../assets/js/api-interface.js';

// Mock modules that need to be available globally
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
  loadConfiguration: vi.fn(),
  saveConfiguration: vi.fn()
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
      }
    }
  })),
  setConfig: vi.fn(),
  updateConfig: vi.fn()
};

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;

// Make modules available globally for tests
global.DataLayer = DataLayer;
global.unifiedAPI = unifiedAPI;
global.ConfigManager = MockConfigManager;
global.ConfigService = MockConfigService;

// Store original location and create safer location handling
const originalLocation = dom.window.location;

// Helper to safely change location for tests
global.setLocationForTest = (hostname = 'localhost', pathname = '/', search = '') => {
  const port = process.env.TEST_API_PORT || '8000';
  const url = hostname === 'localhost' || hostname === '127.0.0.1'
    ? `http://${hostname}:${port}${pathname}${search}`
    : `https://${hostname}${pathname}${search}`;

  // Use vi.stubGlobal to safely mock location without triggering navigation
  vi.stubGlobal('location', {
    hostname,
    href: url,
    pathname,
    search,
    protocol: hostname === 'localhost' || hostname === '127.0.0.1' ? 'http:' : 'https:',
    port: hostname === 'localhost' || hostname === '127.0.0.1' ? '8000' : '',
    origin: url.split(pathname)[0],
    host: hostname === 'localhost' || hostname === '127.0.0.1' ? `${hostname}:8000` : hostname,
    hash: ''
  });
};

// Helper to create a mock location object for tests that need to override location
global.createMockLocation = (options = {}) => {
  const port = process.env.TEST_API_PORT || '8000';
  return {
    hostname: options.hostname || 'localhost',
    href: options.href || `http://localhost:${port}`,
    pathname: options.pathname || '/',
    search: options.search || '',
    protocol: options.protocol || 'http:',
    port: options.port || port,
    origin: options.origin || `http://localhost:${port}`
  };
};

// Initialize location
global.setLocationForTest('localhost');
global.location = global.window.location;

// Mock fetch globally
global.fetch = vi.fn();

// Mock timers
global.setInterval = vi.fn();
global.clearInterval = vi.fn();
global.setTimeout = vi.fn();
global.clearTimeout = vi.fn();

// Mock localStorage with proper functionality
const localStorageData = {};
global.localStorage = {
  data: localStorageData, // Make data accessible for tests
  getItem: vi.fn((key) => localStorageData[key] || null),
  setItem: vi.fn((key, value) => {
    localStorageData[key] = value;
  }),
  removeItem: vi.fn((key) => {
    delete localStorageData[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
  })
};

// Mock document.cookie
let cookies = {};

Object.defineProperty(document, 'cookie', {
  get: () => {
    return Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');
  },
  set: (cookieString) => {
    const [nameValue] = cookieString.split(';');
    if (nameValue) {
      const equalIndex = nameValue.indexOf('=');
      if (equalIndex > -1) {
        const name = nameValue.substring(0, equalIndex).trim();
        const value = nameValue.substring(equalIndex + 1);
        if (value !== '') {
          cookies[name] = value;
        } else {
          delete cookies[name];
        }
      }
    }
  }
});

// Helper to change location (kept for backward compatibility)
global.setLocation = global.setLocationForTest;

// Reset mocks before each test
beforeEach(() => {
  global.fetch.mockReset();

  // Clear localStorage data
  Object.keys(localStorageData).forEach(key => delete localStorageData[key]);

  // Reset localStorage mocks but restore implementations (safe reset)
  if (localStorage.getItem.mockReset) localStorage.getItem.mockReset();
  if (localStorage.setItem.mockReset) localStorage.setItem.mockReset();
  if (localStorage.removeItem.mockReset) localStorage.removeItem.mockReset();
  if (localStorage.clear.mockReset) localStorage.clear.mockReset();

  // Restore implementations (safe restore)
  if (localStorage.getItem.mockImplementation) {
    localStorage.getItem.mockImplementation((key) => localStorageData[key] || null);
  }
  if (localStorage.setItem.mockImplementation) {
    localStorage.setItem.mockImplementation((key, value) => {
      localStorageData[key] = value;
    });
  }
  if (localStorage.removeItem.mockImplementation) {
    localStorage.removeItem.mockImplementation((key) => {
      delete localStorageData[key];
    });
  }
  if (localStorage.clear.mockImplementation) {
    localStorage.clear.mockImplementation(() => {
      Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
    });
  }

  cookies = {};

  // Reset DOM
  document.body.innerHTML = '';
  vi.clearAllMocks();
  document.cookie = '';

  // Reset location to localhost
  global.setLocationForTest('localhost');
});

// Global test utilities
global.createMockResponse = (data, status = 200) => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  };
};

global.createElasticsearchResponse = (buckets = []) => {
  return {
    aggregations: {
      events: {
        buckets
      }
    }
  };
};

global.createBucket = (key, baselineCount, currentCount) => {
  return {
    key,
    baseline: { doc_count: baselineCount },
    current: { doc_count: currentCount }
  };
};

// Helper to set up proper authentication for tests
global.setupTestAuthentication = (cookieValue = 'test_cookie') => {
  const cookieData = {
    cookie: cookieValue,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    saved: new Date().toISOString()
  };
  localStorage.setItem('elasticCookie', JSON.stringify(cookieData));
  // Also ensure localStorage mock tracks this
  localStorageData['elasticCookie'] = JSON.stringify(cookieData);
};

// Helper to set up test configuration
global.setupTestConfiguration = (config = {}) => {
  const defaultConfig = {
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
  };
  const fullConfig = { ...defaultConfig, ...config };
  localStorage.setItem('radMonitorConfig', JSON.stringify(fullConfig));
  // Also ensure localStorage mock tracks this
  localStorageData['radMonitorConfig'] = JSON.stringify(fullConfig);
};
