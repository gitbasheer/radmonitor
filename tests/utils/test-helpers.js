/**
 * Comprehensive Test Utilities
 * Shared helpers, mocks, and fixtures for all test files
 */

import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// ==================== DOM UTILITIES ====================

/**
 * Create a comprehensive DOM environment for testing
 */
export function createTestDOM(customHTML = '') {
  const defaultHTML = `
    <!DOCTYPE html>
    <html>
    <body>
      <input type="hidden" id="elasticCookie" value="">

      <div class="control-panel">
        <button id="refreshBtn">REFRESH NOW</button>
        <div id="refreshStatus">Ready</div>
        <input id="baselineStart" value="2025-06-01">
        <input id="baselineEnd" value="2025-06-09">
        <input id="currentTimeRange" value="now-12h">
        <input id="highVolumeThreshold" value="1000">
        <input id="mediumVolumeThreshold" value="100">
        <input id="minDailyVolume" value="100">
        <button class="preset-button" data-range="6h">6h</button>
        <button class="preset-button" data-range="12h">12h</button>
        <button class="preset-button" data-range="24h">24h</button>
        <button class="preset-button" data-range="3d">3d</button>
        <span id="corsProxyStatus">Checking...</span>
        <span id="envStatus">Loading...</span>
        <span id="cookieStatus">Not set</span>
      </div>

      <div class="main-content">
        <div class="timestamp">Last Updated: TEST</div>
        <div class="summary-cards">
          <div class="card critical"><span class="card-number">0</span></div>
          <div class="card warning"><span class="card-number">0</span></div>
          <div class="card normal"><span class="card-number">0</span></div>
          <div class="card increased"><span class="card-number">0</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Status</th>
              <th>Score</th>
              <th>Current</th>
              <th>Baseline</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      ${customHTML}
    </body>
    </html>
  `;

  const dom = new JSDOM(defaultHTML, {
    url: 'http://localhost:8000',
    pretendToBeVisual: true,
    resources: 'usable'
  });

  return dom;
}

/**
 * Set up global DOM environment
 */
export function setupGlobalDOM(customHTML = '') {
  const dom = createTestDOM(customHTML);

  global.window = dom.window;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;

  return dom;
}

/**
 * Reset DOM to clean state
 */
export function resetDOM() {
  if (global.document) {
    global.document.body.innerHTML = createTestDOM().window.document.body.innerHTML;
  }
}

// ==================== LOCATION UTILITIES ====================

/**
 * Safely set location for tests without triggering navigation
 */
export function setLocationForTest(hostname = 'localhost', pathname = '/', search = '') {
  const url = hostname === 'localhost' || hostname === '127.0.0.1'
    ? `http://${hostname}:8000${pathname}${search}`
    : `https://${hostname}${pathname}${search}`;

  vi.stubGlobal('location', {
    hostname,
    href: url,
    pathname,
    search,
    protocol: hostname === 'localhost' || hostname === '127.0.0.1' ? 'http:' : 'https:',
    port: hostname === 'localhost' || hostname === '127.0.0.1' ? '8000' : '',
    origin: url.split(pathname)[0],
    host: hostname === 'localhost' || hostname === '127.0.0.1' ? `${hostname}:8000` : hostname,
    hash: '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  });
}

/**
 * Create mock location object
 */
export function createMockLocation(options = {}) {
  return {
    hostname: options.hostname || 'localhost',
    href: options.href || 'http://localhost:8000',
    pathname: options.pathname || '/',
    search: options.search || '',
    protocol: options.protocol || 'http:',
    port: options.port || '8000',
    origin: options.origin || 'http://localhost:8000',
    hash: options.hash || '',
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn()
  };
}

// ==================== STORAGE UTILITIES ====================

/**
 * Set up localStorage mock with proper functionality
 */
export function setupLocalStorageMock() {
  const localStorageData = {};

  global.localStorage = {
    data: localStorageData,
    getItem: vi.fn((key) => localStorageData[key] || null),
    setItem: vi.fn((key, value) => {
      localStorageData[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete localStorageData[key];
    }),
    clear: vi.fn(() => {
      Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
    }),
    key: vi.fn((index) => Object.keys(localStorageData)[index] || null),
    get length() { return Object.keys(localStorageData).length; }
  };

  return localStorageData;
}

/**
 * Set up document.cookie mock
 */
export function setupCookieMock() {
  const cookies = {};

  Object.defineProperty(global.document, 'cookie', {
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

  return cookies;
}

// ==================== AUTHENTICATION UTILITIES ====================

/**
 * Set up test authentication with proper cookie data
 */
export function setupTestAuthentication(cookieValue = 'test_cookie', options = {}) {
  const cookieData = {
    cookie: cookieValue,
    expires: options.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    saved: options.saved || new Date().toISOString(),
    ...options.additionalData
  };

  localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

  // Also ensure localStorage mock tracks this
  if (localStorage.data) {
    localStorage.data['elasticCookie'] = JSON.stringify(cookieData);
  }

  return cookieData;
}

/**
 * Set up test configuration
 */
export function setupTestConfiguration(config = {}) {
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
      }
    }
  };

  const fullConfig = { ...defaultConfig, ...config };
  localStorage.setItem('radMonitorConfig', JSON.stringify(fullConfig));

  // Also ensure localStorage mock tracks this
  if (localStorage.data) {
    localStorage.data['radMonitorConfig'] = JSON.stringify(fullConfig);
  }

  return fullConfig;
}

// ==================== API RESPONSE UTILITIES ====================

/**
 * Create mock HTTP response
 */
export function createMockResponse(data, status = 200, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(typeof data === 'string' ? data : JSON.stringify(data)),
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers
    }),
    clone: vi.fn().mockReturnThis()
  };
}

/**
 * Create Elasticsearch response structure
 */
export function createElasticsearchResponse(buckets = [], options = {}) {
  return {
    took: options.took || 50,
    timed_out: options.timed_out || false,
    _shards: options._shards || { total: 1, successful: 1, skipped: 0, failed: 0 },
    hits: options.hits || { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    aggregations: {
      events: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: buckets.map(b => ({
          key: b.key,
          doc_count: (b.baseline || 0) + (b.current || 0),
          baseline: { doc_count: b.baseline || 0 },
          current: { doc_count: b.current || 0 },
          ...b.additionalData
        }))
      }
    }
  };
}

/**
 * Create test data bucket
 */
export function createBucket(eventId, baseline, current, additionalData = {}) {
  return {
    key: eventId,
    baseline,
    current,
    ...additionalData
  };
}

/**
 * Create formula validation response
 */
export function createFormulaResponse(isValid = true, result = null, error = null) {
  return {
    valid: isValid,
    result,
    error,
    timestamp: new Date().toISOString()
  };
}

// ==================== TIMER UTILITIES ====================

/**
 * Set up timer mocks with tracking
 */
export function setupTimerMocks() {
  const timers = {};
  let timerCounter = 0;

  global.setTimeout = vi.fn((callback, delay) => {
    const id = ++timerCounter;
    timers[id] = { callback, delay, type: 'timeout' };
    return id;
  });

  global.setInterval = vi.fn((callback, delay) => {
    const id = ++timerCounter;
    timers[id] = { callback, delay, type: 'interval' };
    return id;
  });

  global.clearTimeout = vi.fn((id) => {
    delete timers[id];
  });

  global.clearInterval = vi.fn((id) => {
    delete timers[id];
  });

  return timers;
}

// ==================== ASYNC UTILITIES ====================

/**
 * Wait for next tick
 */
export const waitForNextTick = () => new Promise(resolve => {
  // Use real setTimeout if available, otherwise use the mocked one
  const timer = global.setTimeout.__original || setTimeout;
  timer(resolve, 0);
});

/**
 * Wait for multiple ticks
 */
export const waitForTicks = (count = 2) => {
  let promise = Promise.resolve();
  for (let i = 0; i < count; i++) {
    promise = promise.then(() => waitForNextTick());
  }
  return promise;
};

/**
 * Wait for DOM update
 */
export const waitForDOMUpdate = () => waitForTicks(2);

/**
 * Wait for authentication complete
 */
export const waitForAuthenticationComplete = () => new Promise(resolve => setTimeout(resolve, 100));

/**
 * Wait for data layer event (mock implementation)
 */
export function waitForDataLayerEvent(eventName, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    // Mock event listener
    const handler = (data) => {
      clearTimeout(timer);
      resolve(data);
    };

    // If DataLayer exists and has addEventListener, use it
    if (global.DataLayer && global.DataLayer.addEventListener) {
      global.DataLayer.addEventListener(eventName, handler);
    } else {
      // Fallback for tests - resolve with mock data
      setTimeout(() => {
        clearTimeout(timer);
        resolve({ eventName, data: {} });
      }, 10);
    }
  });
}

// ==================== MOCK SETUP UTILITIES ====================

/**
 * Set up all common mocks for tests
 */
export function setupCommonMocks() {
  // Fetch mock
  global.fetch = vi.fn();

  // Console mocks
  global.console = {
    ...console,
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    clear: vi.fn()
  };

  // Alert/prompt mocks
  global.alert = vi.fn();
  global.prompt = vi.fn(() => null);
  global.confirm = vi.fn(() => true);

  // AbortSignal mock
  global.AbortSignal = {
    timeout: vi.fn(() => ({ aborted: false }))
  };

  // Performance mock
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn()
  };

  return {
    fetch: global.fetch,
    console: global.console,
    alert: global.alert,
    prompt: global.prompt,
    confirm: global.confirm
  };
}

/**
 * Complete test environment setup
 */
export function setupTestEnvironment(options = {}) {
  const dom = setupGlobalDOM(options.customHTML);
  const localStorageData = setupLocalStorageMock();
  const cookies = setupCookieMock();
  const timers = setupTimerMocks();
  const mocks = setupCommonMocks();

  setLocationForTest(options.hostname || 'localhost');

  if (options.authentication) {
    setupTestAuthentication(options.authentication.cookie, options.authentication);
  }

  if (options.configuration) {
    setupTestConfiguration(options.configuration);
  }

  return {
    dom,
    localStorageData,
    cookies,
    timers,
    mocks
  };
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment() {
  vi.clearAllMocks();
  vi.unstubAllGlobals();

  if (global.localStorage && global.localStorage.clear) {
    global.localStorage.clear();
  }

  if (global.document) {
    global.document.cookie = '';
    resetDOM();
  }
}

// ==================== TEST DATA GENERATORS ====================

/**
 * Generate test RAD events
 */
export function generateTestRADEvents(count = 5) {
  const events = [];
  const radTypes = ['feed', 'metrics', 'recommendations', 'analytics', 'reporting'];

  for (let i = 0; i < count; i++) {
    const radType = radTypes[i % radTypes.length];
    events.push({
      key: `pandc.vnext.recommendations.${radType}.test_${i}`,
      baseline: Math.floor(Math.random() * 10000) + 1000,
      current: Math.floor(Math.random() * 5000) + 100
    });
  }

  return events;
}

/**
 * Generate test configuration variations
 */
export function generateTestConfigurations() {
  return [
    {
      name: 'default',
      config: setupTestConfiguration()
    },
    {
      name: 'high_thresholds',
      config: setupTestConfiguration({
        highVolumeThreshold: 5000,
        mediumVolumeThreshold: 1000,
        criticalThreshold: -90,
        warningThreshold: -70
      })
    },
    {
      name: 'short_timerange',
      config: setupTestConfiguration({
        currentTimeRange: 'now-6h',
        baselineStart: '2025-06-08',
        baselineEnd: '2025-06-09'
      })
    }
  ];
}

// ==================== ASSERTION HELPERS ====================

/**
 * Assert DOM element exists and has expected properties
 */
export function assertElementExists(selector, expectedProperties = {}) {
  const element = document.querySelector(selector);
  expect(element).toBeTruthy();

  Object.entries(expectedProperties).forEach(([prop, value]) => {
    if (prop === 'textContent') {
      expect(element.textContent).toContain(value);
    } else if (prop === 'className') {
      expect(element.className).toContain(value);
    } else {
      expect(element[prop]).toBe(value);
    }
  });

  return element;
}

/**
 * Assert API call was made with expected parameters
 */
export function assertAPICall(mockFetch, expectedUrl, expectedOptions = {}) {
  expect(mockFetch).toHaveBeenCalled();

  const calls = mockFetch.mock.calls;
  const matchingCall = calls.find(call =>
    call[0].includes(expectedUrl) || call[0] === expectedUrl
  );

  expect(matchingCall).toBeTruthy();

  if (expectedOptions.method) {
    expect(matchingCall[1]?.method).toBe(expectedOptions.method);
  }

  if (expectedOptions.body) {
    expect(matchingCall[1]?.body).toContain(expectedOptions.body);
  }

  return matchingCall;
}

// Export all utilities as default object for convenience
export default {
  // DOM utilities
  createTestDOM,
  setupGlobalDOM,
  resetDOM,

  // Location utilities
  setLocationForTest,
  createMockLocation,

  // Storage utilities
  setupLocalStorageMock,
  setupCookieMock,

  // Authentication utilities
  setupTestAuthentication,
  setupTestConfiguration,

  // API response utilities
  createMockResponse,
  createElasticsearchResponse,
  createBucket,
  createFormulaResponse,

  // Timer utilities
  setupTimerMocks,

  // Async utilities
  waitForNextTick,
  waitForTicks,
  waitForDOMUpdate,
  waitForAuthenticationComplete,
  waitForDataLayerEvent,

  // Mock setup utilities
  setupCommonMocks,
  setupTestEnvironment,
  cleanupTestEnvironment,

  // Test data generators
  generateTestRADEvents,
  generateTestConfigurations,

  // Assertion helpers
  assertElementExists,
  assertAPICall
};
