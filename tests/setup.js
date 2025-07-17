// tests/setup.js - Global test setup for Vitest

import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.location = dom.window.location;

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

// Helper to change location
global.setLocation = (hostname = 'localhost') => {
  const url = hostname === 'localhost' || hostname === '127.0.0.1'
    ? `http://${hostname}`
    : `https://${hostname}`;
  dom.reconfigure({ url });
};

// Reset mocks before each test
beforeEach(() => {
  global.fetch.mockReset();
  
  // Clear localStorage data
  Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
  
  // Reset localStorage mocks but restore implementations
  localStorage.getItem.mockReset();
  localStorage.setItem.mockReset();
  localStorage.removeItem.mockReset();
  localStorage.clear.mockReset();
  
  // Restore implementations
  localStorage.getItem.mockImplementation((key) => localStorageData[key] || null);
  localStorage.setItem.mockImplementation((key, value) => {
    localStorageData[key] = value;
  });
  localStorage.removeItem.mockImplementation((key) => {
    delete localStorageData[key];
  });
  localStorage.clear.mockImplementation(() => {
    Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
  });
  
  cookies = {};

  // Reset DOM
  document.body.innerHTML = '';
  vi.clearAllMocks();
  document.cookie = '';

  // Reset location to localhost
  global.setLocation('localhost');
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
