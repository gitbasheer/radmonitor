/**
 * App Store Tests
 * Comprehensive unit and integration tests for the Zustand store
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';

// Import store test setup
import './setup-store-tests.js';

// Import store after setup
import { appStore, useAuth, useConnection, useUI, useData, useFilters, useActions } from '../../assets/js/stores/app-store.js';

// Test utilities
const resetStore = () => {
  // Reset to initial state
  appStore.setState({
    auth: {
      isAuthenticated: false,
      isChecking: true,
      cookie: null,
      method: null,
      error: null,
    },
    connection: {
      api: { connected: false, message: 'Initializing...' },
      data: { loaded: false, message: 'Loading...' },
      websocket: { connected: false, message: 'Not required' },
      formula: { initialized: false, message: 'Loading...' },
    },
    ui: {
      isLoading: true,
      loadingMessage: 'Initializing RAD Monitor',
      showAuthPrompt: false,
      mainContentVisible: false,
      error: null,
      activeModal: null,
      growlMessages: [],
    },
    data: {
      events: [],
      filteredEvents: [],
      stats: {
        critical: 0,
        warning: 0,
        normal: 0,
        increased: 0,
      },
      lastUpdate: null,
    },
    filters: {
      search: '',
      status: 'all',
      radTypes: [],
    },
  });
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock CentralizedAuth
const centralizedAuthMock = {
  getCookie: vi.fn(),
  setCookie: vi.fn(),
  clearAuth: vi.fn(),
};

// Mock URLSearchParams
const mockSearchParams = new Map();

// Setup global mocks before tests
beforeAll(() => {
  // Mock localStorage
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });

  // Mock window
  global.window = {
    localStorage: localStorageMock,
    CentralizedAuth: centralizedAuthMock,
    location: {
      search: '',
      pathname: '/test',
    },
    history: {
      replaceState: vi.fn(),
    },
    URLSearchParams: vi.fn().mockImplementation(() => ({
      get: (key) => mockSearchParams.get(key),
    })),
  };

  // Also set on global for any direct references
  global.localStorage = localStorageMock;
  global.CentralizedAuth = centralizedAuthMock;
});

describe('App Store', () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
    mockSearchParams.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('State Initialization', () => {
    it('should initialize with default state', () => {
      const state = appStore.getState();

      // Check auth state
      expect(state.auth).toEqual({
        isAuthenticated: false,
        isChecking: true,
        cookie: null,
        method: null,
        error: null,
      });

      // Check connection state
      expect(state.connection).toEqual({
        api: { connected: false, message: 'Initializing...' },
        data: { loaded: false, message: 'Loading...' },
        websocket: { connected: false, message: 'Not required' },
        formula: { initialized: false, message: 'Loading...' },
      });

      // Check UI state
      expect(state.ui).toEqual({
        isLoading: true,
        loadingMessage: 'Initializing RAD Monitor',
        showAuthPrompt: false,
        mainContentVisible: false,
        error: null,
        activeModal: null,
        growlMessages: [],
      });

      // Check data state
      expect(state.data).toEqual({
        events: [],
        filteredEvents: [],
        stats: {
          critical: 0,
          warning: 0,
          normal: 0,
          increased: 0,
        },
        lastUpdate: null,
      });

      // Check filters state
      expect(state.filters).toEqual({
        search: '',
        status: 'all',
        radTypes: [],
      });
    });

    it('should have all required actions', () => {
      const actions = appStore.getState().actions;

      expect(actions.checkAuth).toBeDefined();
      expect(actions.setCookie).toBeDefined();
      expect(actions.clearAuth).toBeDefined();
      expect(actions.updateConnection).toBeDefined();
      expect(actions.setLoading).toBeDefined();
      expect(actions.setError).toBeDefined();
      expect(actions.showAuthPrompt).toBeDefined();
      expect(actions.hideAuthPrompt).toBeDefined();
      expect(actions.showMainContent).toBeDefined();
      expect(actions.hideMainContent).toBeDefined();
      expect(actions.showModal).toBeDefined();
      expect(actions.hideModal).toBeDefined();
      expect(actions.showGrowl).toBeDefined();
      expect(actions.removeGrowl).toBeDefined();
      expect(actions.setData).toBeDefined();
      expect(actions.setFilter).toBeDefined();
      expect(actions.applyFilters).toBeDefined();
      expect(actions.initialize).toBeDefined();
    });
  });

  describe('Selector Functions', () => {
    it('should return auth state via useAuth', () => {
      const auth = useAuth();
      expect(auth).toEqual(appStore.getState().auth);
    });

    it('should return connection state via useConnection', () => {
      const connection = useConnection();
      expect(connection).toEqual(appStore.getState().connection);
    });

    it('should return UI state via useUI', () => {
      const ui = useUI();
      expect(ui).toEqual(appStore.getState().ui);
    });

    it('should return data state via useData', () => {
      const data = useData();
      expect(data).toEqual(appStore.getState().data);
    });

    it('should return filters state via useFilters', () => {
      const filters = useFilters();
      expect(filters).toEqual(appStore.getState().filters);
    });

    it('should return actions via useActions', () => {
      const actions = useActions();
      expect(actions).toEqual(appStore.getState().actions);
    });
  });

  describe('Auth Actions', () => {
    describe('checkAuth', () => {
      it('should authenticate with stored cookie from CentralizedAuth', async () => {
        centralizedAuthMock.getCookie.mockReturnValue('sid=test-cookie');

        const result = await appStore.getState().actions.checkAuth();

        expect(result).toBe(true);
        expect(appStore.getState().auth).toMatchObject({
          isAuthenticated: true,
          cookie: 'sid=test-cookie',
          method: 'stored',
          isChecking: false,
        });
        expect(appStore.getState().ui.showAuthPrompt).toBe(false);
      });

      it('should authenticate with stored cookie from localStorage', async () => {
        centralizedAuthMock.getCookie.mockReturnValue(null);
        localStorageMock.getItem.mockReturnValue('sid=test-cookie');

        const result = await appStore.getState().actions.checkAuth();

        expect(result).toBe(true);
        expect(appStore.getState().auth).toMatchObject({
          isAuthenticated: true,
          cookie: 'sid=test-cookie',
          method: 'stored',
          isChecking: false,
        });
      });

      it('should authenticate with URL parameter', async () => {
        centralizedAuthMock.getCookie.mockReturnValue(null);
        localStorageMock.getItem.mockReturnValue(null);
        mockSearchParams.set('sid', 'url-cookie');

        const result = await appStore.getState().actions.checkAuth();

        expect(result).toBe(true);
        expect(appStore.getState().auth).toMatchObject({
          isAuthenticated: true,
          cookie: 'sid=url-cookie',
          method: 'url',
          isChecking: false,
        });
        expect(centralizedAuthMock.setCookie).toHaveBeenCalledWith('sid=url-cookie', { source: 'url' });
        expect(window.history.replaceState).toHaveBeenCalled();
      });

      it('should show auth prompt when no auth found', async () => {
        centralizedAuthMock.getCookie.mockReturnValue(null);
        localStorageMock.getItem.mockReturnValue(null);

        const result = await appStore.getState().actions.checkAuth();

        expect(result).toBe(false);
        expect(appStore.getState().auth).toMatchObject({
          isAuthenticated: false,
          isChecking: false,
        });
        expect(appStore.getState().ui.showAuthPrompt).toBe(true);
        expect(appStore.getState().ui.isLoading).toBe(false);
      });

      it('should handle errors gracefully', async () => {
        const error = new Error('Auth check failed');
        centralizedAuthMock.getCookie.mockImplementation(() => {
          throw error;
        });

        const result = await appStore.getState().actions.checkAuth();

        expect(result).toBe(false);
        expect(appStore.getState().auth.error).toBe('Auth check failed');
        expect(appStore.getState().auth.isChecking).toBe(false);
        expect(appStore.getState().ui.showAuthPrompt).toBe(true);
      });

      it('should have minimum delay to prevent flash', async () => {
        centralizedAuthMock.getCookie.mockReturnValue('sid=test-cookie');

        const start = Date.now();
        await appStore.getState().actions.checkAuth();
        const elapsed = Date.now() - start;

        expect(elapsed).toBeGreaterThanOrEqual(300);
      });
    });

    describe('setCookie', () => {
      it('should set cookie with sid prefix', async () => {
        await appStore.getState().actions.setCookie('test-cookie');

        expect(centralizedAuthMock.setCookie).toHaveBeenCalledWith('sid=test-cookie', { source: 'manual' });
        expect(appStore.getState().auth).toMatchObject({
          isAuthenticated: true,
          cookie: 'sid=test-cookie',
          method: 'manual',
          error: null,
        });
        expect(appStore.getState().ui.showAuthPrompt).toBe(false);
      });

      it('should not duplicate sid prefix', async () => {
        await appStore.getState().actions.setCookie('sid=test-cookie');

        expect(centralizedAuthMock.setCookie).toHaveBeenCalledWith('sid=test-cookie', { source: 'manual' });
        expect(appStore.getState().auth.cookie).toBe('sid=test-cookie');
      });

            it('should fallback to localStorage when CentralizedAuth not available', async () => {
        global.window.CentralizedAuth = null;

        await appStore.getState().actions.setCookie('test-cookie');

        expect(localStorageMock.setItem).toHaveBeenCalledWith('elastic_cookie', 'sid=test-cookie');
        expect(appStore.getState().auth.isAuthenticated).toBe(true);

        // Restore mock
        global.window.CentralizedAuth = centralizedAuthMock;
      });
    });

    describe('clearAuth', () => {
      it('should clear auth and show auth prompt', () => {
        // Set authenticated state first
        appStore.setState({
          auth: {
            isAuthenticated: true,
            cookie: 'sid=test',
            method: 'stored',
          },
          ui: {
            showAuthPrompt: false,
            mainContentVisible: true,
          },
        });

        appStore.getState().actions.clearAuth();

        expect(centralizedAuthMock.clearAuth).toHaveBeenCalled();
        expect(appStore.getState().auth).toEqual({
          isAuthenticated: false,
          isChecking: false,
          cookie: null,
          method: null,
          error: null,
        });
        expect(appStore.getState().ui.showAuthPrompt).toBe(true);
        expect(appStore.getState().ui.mainContentVisible).toBe(false);
      });

            it('should fallback to localStorage when CentralizedAuth not available', () => {
        global.window.CentralizedAuth = null;

        appStore.getState().actions.clearAuth();

        expect(localStorageMock.removeItem).toHaveBeenCalledWith('elastic_cookie');

        // Restore mock
        global.window.CentralizedAuth = centralizedAuthMock;
      });
    });
  });

  describe('UI Actions', () => {
    describe('setLoading', () => {
      it('should update loading state with message', () => {
        appStore.getState().actions.setLoading(true, 'Loading data...');

        expect(appStore.getState().ui.isLoading).toBe(true);
        expect(appStore.getState().ui.loadingMessage).toBe('Loading data...');
      });

      it('should update loading state without changing message', () => {
        appStore.setState({
          ui: { ...appStore.getState().ui, loadingMessage: 'Original message' }
        });

        appStore.getState().actions.setLoading(false);

        expect(appStore.getState().ui.isLoading).toBe(false);
        expect(appStore.getState().ui.loadingMessage).toBe('Original message');
      });
    });

    describe('Modal Actions', () => {
      it('should show modal', () => {
        appStore.getState().actions.showModal('test-modal');
        expect(appStore.getState().ui.activeModal).toBe('test-modal');
      });

      it('should hide modal', () => {
        appStore.setState({
          ui: { ...appStore.getState().ui, activeModal: 'test-modal' }
        });

        appStore.getState().actions.hideModal();
        expect(appStore.getState().ui.activeModal).toBe(null);
      });
    });

    describe('Growl Actions', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it('should add growl message with default type and duration', () => {
        appStore.getState().actions.showGrowl('Test message');

        const growls = appStore.getState().ui.growlMessages;
        expect(growls).toHaveLength(1);
        expect(growls[0]).toMatchObject({
          message: 'Test message',
          type: 'info',
          duration: 3000,
        });
        expect(growls[0].id).toBeDefined();
      });

      it('should add growl message with custom type and duration', () => {
        appStore.getState().actions.showGrowl('Error occurred', 'error', 5000);

        const growls = appStore.getState().ui.growlMessages;
        expect(growls[0]).toMatchObject({
          message: 'Error occurred',
          type: 'error',
          duration: 5000,
        });
      });

      it('should auto-remove growl after duration', () => {
        appStore.getState().actions.showGrowl('Test message', 'info', 1000);

        expect(appStore.getState().ui.growlMessages).toHaveLength(1);

        vi.advanceTimersByTime(1000);

        expect(appStore.getState().ui.growlMessages).toHaveLength(0);
      });

      it('should remove specific growl message', () => {
        // Add multiple growls
        appStore.getState().actions.showGrowl('Message 1');
        appStore.getState().actions.showGrowl('Message 2');

        const growls = appStore.getState().ui.growlMessages;
        expect(growls).toHaveLength(2);

        // Remove first growl
        appStore.getState().actions.removeGrowl(growls[0].id);

        const remainingGrowls = appStore.getState().ui.growlMessages;
        expect(remainingGrowls).toHaveLength(1);
        expect(remainingGrowls[0].message).toBe('Message 2');
      });
    });
  });

  describe('Data Actions', () => {
    const mockEvents = [
      { id: 1, name: 'Event 1', status: 'CRITICAL' },
      { id: 2, name: 'Event 2', status: 'WARNING' },
      { id: 3, name: 'Event 3', status: 'NORMAL' },
      { id: 4, name: 'Event 4', status: 'INCREASED' },
      { id: 5, name: 'Event 5', status: 'CRITICAL' },
    ];

    it('should set data and calculate stats', () => {
      appStore.getState().actions.setData(mockEvents);

      const state = appStore.getState();
      expect(state.data.events).toEqual(mockEvents);
      expect(state.data.stats).toEqual({
        critical: 2,
        warning: 1,
        normal: 1,
        increased: 1,
      });
      expect(state.data.lastUpdate).toBeDefined();
    });

    it('should apply filters after setting data', () => {
      // Set a filter first
      appStore.getState().actions.setFilter('status', 'critical');

      // Set data
      appStore.getState().actions.setData(mockEvents);

      // Check filtered events
      const filteredEvents = appStore.getState().data.filteredEvents;
      expect(filteredEvents).toHaveLength(2);
      expect(filteredEvents.every(e => e.status === 'CRITICAL')).toBe(true);
    });
  });

  describe('Filter Actions', () => {
    const mockEvents = [
      { id: 1, name: 'Event Alpha', status: 'CRITICAL', radType: 'type1' },
      { id: 2, name: 'Event Beta', status: 'WARNING', radType: 'type2' },
      { id: 3, name: 'Event Gamma', status: 'NORMAL', radType: 'type1' },
      { id: 4, name: 'Event Delta', status: 'INCREASED', radType: 'type3' },
      { id: 5, name: 'Event Epsilon', status: 'CRITICAL', radType: 'type2' },
    ];

    beforeEach(() => {
      appStore.getState().actions.setData(mockEvents);
    });

    it('should filter by status', () => {
      appStore.getState().actions.setFilter('status', 'critical');

      const filtered = appStore.getState().data.filteredEvents;
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.status === 'CRITICAL')).toBe(true);
    });

    it('should filter by search term - name', () => {
      appStore.getState().actions.setFilter('search', 'beta');

      const filtered = appStore.getState().data.filteredEvents;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Event Beta');
    });

    it('should filter by search term - radType', () => {
      appStore.getState().actions.setFilter('search', 'type1');

      const filtered = appStore.getState().data.filteredEvents;
      expect(filtered).toHaveLength(2);
      expect(filtered.every(e => e.radType === 'type1')).toBe(true);
    });

    it('should filter by RAD types', () => {
      appStore.getState().actions.setFilter('radTypes', ['type1', 'type3']);

      const filtered = appStore.getState().data.filteredEvents;
      expect(filtered).toHaveLength(3);
      expect(filtered.every(e => ['type1', 'type3'].includes(e.radType))).toBe(true);
    });

    it('should apply multiple filters', () => {
      appStore.getState().actions.setFilter('status', 'critical');
      appStore.getState().actions.setFilter('radTypes', ['type2']);

      const filtered = appStore.getState().data.filteredEvents;
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toMatchObject({
        name: 'Event Epsilon',
        status: 'CRITICAL',
        radType: 'type2',
      });
    });

    it('should show all events when status is "all"', () => {
      appStore.getState().actions.setFilter('status', 'all');

      const filtered = appStore.getState().data.filteredEvents;
      expect(filtered).toHaveLength(5);
    });

    it('should be case insensitive for search', () => {
      appStore.getState().actions.setFilter('search', 'GAMMA');

      const filtered = appStore.getState().data.filteredEvents;
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Event Gamma');
    });
  });

  describe('Connection Actions', () => {
    it('should update connection status', () => {
      appStore.getState().actions.updateConnection('api', {
        connected: true,
        message: 'API Connected',
      });

      expect(appStore.getState().connection.api).toEqual({
        connected: true,
        message: 'API Connected',
      });
    });

    it('should update multiple connection systems', () => {
      appStore.getState().actions.updateConnection('data', {
        loaded: true,
        message: 'Data Loaded',
      });
      appStore.getState().actions.updateConnection('formula', {
        initialized: true,
        message: 'Formula Ready',
      });

      const connection = appStore.getState().connection;
      expect(connection.data.loaded).toBe(true);
      expect(connection.formula.initialized).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    describe('Login Flow', () => {
      it('should handle successful login flow with stored cookie', async () => {
        centralizedAuthMock.getCookie.mockReturnValue('sid=test-cookie');

        // Initialize app
        const result = await appStore.getState().actions.initialize();

        expect(result).toBe(true);

        // Check auth state
        expect(appStore.getState().auth.isAuthenticated).toBe(true);
        expect(appStore.getState().auth.cookie).toBe('sid=test-cookie');

        // Check UI state
        expect(appStore.getState().ui.showAuthPrompt).toBe(false);
        expect(appStore.getState().ui.mainContentVisible).toBe(true);
        expect(appStore.getState().ui.isLoading).toBe(false);

        // Check connections
        expect(appStore.getState().connection.api.connected).toBe(true);
        expect(appStore.getState().connection.data.loaded).toBe(true);
        expect(appStore.getState().connection.formula.initialized).toBe(true);

        // Check growl message
        expect(appStore.getState().ui.growlMessages).toHaveLength(1);
        expect(appStore.getState().ui.growlMessages[0].message).toBe('RAD Monitor ready!');
      });

      it('should handle login flow with URL parameter', async () => {
        centralizedAuthMock.getCookie.mockReturnValue(null);
        mockSearchParams.set('sid', 'url-cookie');

        const result = await appStore.getState().actions.initialize();

        expect(result).toBe(true);
        expect(appStore.getState().auth.isAuthenticated).toBe(true);
        expect(appStore.getState().auth.cookie).toBe('sid=url-cookie');
        expect(appStore.getState().auth.method).toBe('url');
      });

      it('should handle failed login flow', async () => {
        centralizedAuthMock.getCookie.mockReturnValue(null);

        const result = await appStore.getState().actions.initialize();

        expect(result).toBe(false);
        expect(appStore.getState().auth.isAuthenticated).toBe(false);
        expect(appStore.getState().ui.showAuthPrompt).toBe(true);
        expect(appStore.getState().ui.mainContentVisible).toBe(false);
      });

      it('should handle initialization error', async () => {
        const error = new Error('Network error');
        centralizedAuthMock.getCookie.mockImplementation(() => {
          throw error;
        });

        const result = await appStore.getState().actions.initialize();

        expect(result).toBe(false);
        expect(appStore.getState().ui.error).toBe('Network error');
        expect(appStore.getState().ui.growlMessages).toHaveLength(1);
        expect(appStore.getState().ui.growlMessages[0].type).toBe('error');
      });
    });

    describe('Data Loading Flow', () => {
      beforeEach(() => {
        centralizedAuthMock.getCookie.mockReturnValue('sid=test-cookie');
      });

      it('should load and filter data correctly', async () => {
        // Initialize app
        await appStore.getState().actions.initialize();

        // Load data
        const events = [
          { id: 1, name: 'API Error', status: 'CRITICAL', radType: 'api' },
          { id: 2, name: 'DB Warning', status: 'WARNING', radType: 'database' },
          { id: 3, name: 'Service OK', status: 'NORMAL', radType: 'service' },
        ];
        appStore.getState().actions.setData(events);

        // Verify data loaded
        expect(appStore.getState().data.events).toEqual(events);
        expect(appStore.getState().data.stats.critical).toBe(1);
        expect(appStore.getState().data.stats.warning).toBe(1);
        expect(appStore.getState().data.stats.normal).toBe(1);

        // Apply search filter
        appStore.getState().actions.setFilter('search', 'API');
        expect(appStore.getState().data.filteredEvents).toHaveLength(1);
        expect(appStore.getState().data.filteredEvents[0].name).toBe('API Error');

        // Change to status filter
        appStore.getState().actions.setFilter('search', '');
        appStore.getState().actions.setFilter('status', 'warning');
        expect(appStore.getState().data.filteredEvents).toHaveLength(1);
        expect(appStore.getState().data.filteredEvents[0].name).toBe('DB Warning');
      });
    });

    describe('Configuration Change Flow', () => {
      it('should handle configuration changes during runtime', async () => {
        // Initialize with auth
        centralizedAuthMock.getCookie.mockReturnValue('sid=test-cookie');
        await appStore.getState().actions.initialize();

        // Change filters
        appStore.getState().actions.setFilter('status', 'critical');
        expect(appStore.getState().filters.status).toBe('critical');

        // Clear auth and verify state reset
        appStore.getState().actions.clearAuth();
        expect(appStore.getState().auth.isAuthenticated).toBe(false);
        expect(appStore.getState().ui.mainContentVisible).toBe(false);

        // Re-authenticate with new cookie
        await appStore.getState().actions.setCookie('new-cookie');
        expect(appStore.getState().auth.isAuthenticated).toBe(true);
        expect(appStore.getState().auth.cookie).toBe('sid=new-cookie');

        // Verify filters persist across auth changes
        expect(appStore.getState().filters.status).toBe('critical');
      });
    });
  });

  describe('Store Subscription', () => {
    it('should notify subscribers on state changes', () => {
      const listener = vi.fn();
      const unsubscribe = appStore.subscribe(listener);

      // Make a state change
      appStore.getState().actions.setLoading(false);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          ui: expect.objectContaining({ isLoading: false })
        }),
        expect.any(Object)
      );

      // Unsubscribe and verify no more calls
      unsubscribe();
      appStore.getState().actions.setLoading(true);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Global Store Access', () => {
    it('should be available on window for debugging', () => {
      expect(global.window.appStore).toBe(appStore);
    });
  });
});
