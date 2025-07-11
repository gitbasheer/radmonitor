/**
 * App Store using Zustand with Antares/UX components integration
 * Clean state management for the RAD Monitor dashboard
 */

import { createStore } from '/node_modules/zustand/esm/vanilla.mjs';

// Create the main app store
export const appStore = createStore((set, get) => ({
  // Authentication state
  auth: {
    isAuthenticated: false,
    isChecking: true,
    cookie: null,
    method: null,
    error: null,
  },

  // Connection status
  connection: {
    api: { connected: false, message: 'Initializing...' },
    data: { loaded: false, message: 'Loading...' },
    websocket: { connected: false, message: 'Not required' },
    formula: { initialized: false, message: 'Loading...' },
  },

  // UI state
  ui: {
    isLoading: true,
    loadingMessage: 'Initializing RAD Monitor',
    showAuthPrompt: false,
    mainContentVisible: false,
    error: null,
    activeModal: null, // For @ux/modal integration
    growlMessages: [], // For @ux/growl integration
  },

  // Dashboard data
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

  // Filters
  filters: {
    search: '',
    status: 'all',
    radTypes: [],
  },

  // Actions
  actions: {
    // Auth actions
    checkAuth: async () => {
      set((state) => ({
        auth: { ...state.auth, isChecking: true, error: null }
      }));

      // Add a minimum delay to prevent flash
      const startTime = Date.now();

      try {
        // Check centralized auth first
        let authStatus = null;
        let storedCookie = null;
        
        if (window.CentralizedAuth) {
            authStatus = window.CentralizedAuth.getStatus();
            console.log('🔍 CentralizedAuth status:', authStatus);
            
            if (authStatus.hasAuth && !authStatus.expired) {
                storedCookie = window.CentralizedAuth.getCookie();
                console.log('🔑 Got cookie from CentralizedAuth');
            }
        }
        
        // If no cookie from CentralizedAuth, check other sources
        if (!storedCookie) {
            console.log('⚠️ No cookie from CentralizedAuth, checking other sources...');
            
            // Try multiple storage keys
            const possibleKeys = ['elastic_cookie', 'elasticCookie', 'rad_monitor_auth'];
            for (const key of possibleKeys) {
                const value = localStorage.getItem(key);
                if (value) {
                    try {
                        // Try to parse if it's JSON
                        const parsed = JSON.parse(value);
                        if (parsed.cookie) {
                            storedCookie = parsed.cookie;
                            break;
                        }
                    } catch {
                        // Not JSON, use as-is if it looks like a cookie
                        if (value.startsWith('sid=') || value.startsWith('Fe26.2')) {
                            storedCookie = value;
                            break;
                        }
                    }
                }
            }
        }

        if (storedCookie) {
          console.log('✅ Found stored cookie, authenticating...');
          
          // Ensure minimum time has passed to prevent flash
          const elapsed = Date.now() - startTime;
          if (elapsed < 300) {
            await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
          }

          set((state) => ({
            auth: {
              ...state.auth,
              isAuthenticated: true,
              cookie: storedCookie,
              method: 'stored',
              isChecking: false,
            },
            ui: { ...state.ui, showAuthPrompt: false }
          }));
          console.log('🔐 Auth state updated: authenticated=true, showAuthPrompt=false');
          return true;
        }

        // Check URL params
        const urlParams = new URLSearchParams(window.location.search);
        const sid = urlParams.get('sid');
        if (sid) {
          const cookie = `sid=${sid}`;

          // Use centralized auth if available
          if (window.CentralizedAuth) {
            await window.CentralizedAuth.setCookie(cookie, { source: 'url' });
          } else {
            localStorage.setItem('elastic_cookie', cookie);
          }

          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);

          // Ensure minimum time has passed to prevent flash
          const elapsed = Date.now() - startTime;
          if (elapsed < 300) {
            await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
          }

          set((state) => ({
            auth: {
              ...state.auth,
              isAuthenticated: true,
              cookie: cookie,
              method: 'url',
              isChecking: false,
            },
            ui: { ...state.ui, showAuthPrompt: false }
          }));
          return true;
        }

        // No auth found - ensure minimum time to prevent flash
        const elapsed = Date.now() - startTime;
        if (elapsed < 300) {
          await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
        }

        console.log('⚠️ No authentication found, showing auth prompt');
        set((state) => ({
          auth: {
            ...state.auth,
            isAuthenticated: false,
            isChecking: false,
          },
          ui: { ...state.ui, showAuthPrompt: true, isLoading: false }
        }));
        return false;
      } catch (error) {
        // Ensure minimum time has passed to prevent flash
        const elapsed = Date.now() - startTime;
        if (elapsed < 300) {
          await new Promise(resolve => setTimeout(resolve, 300 - elapsed));
        }

        set((state) => ({
          auth: {
            ...state.auth,
            error: error.message,
            isChecking: false,
          },
          ui: { ...state.ui, showAuthPrompt: true, isLoading: false }
        }));
        return false;
      }
    },

    setCookie: async (cookie) => {
      const formattedCookie = cookie.startsWith('sid=') ? cookie : `sid=${cookie}`;

      // Use centralized auth if available
      if (window.CentralizedAuth) {
        await window.CentralizedAuth.setCookie(formattedCookie, { source: 'manual' });
      } else {
        localStorage.setItem('elastic_cookie', formattedCookie);
      }

      set((state) => ({
        auth: {
          ...state.auth,
          isAuthenticated: true,
          cookie: formattedCookie,
          method: 'manual',
          error: null,
        },
        ui: { ...state.ui, showAuthPrompt: false }
      }));
    },

    clearAuth: () => {
      // Use centralized auth if available
      if (window.CentralizedAuth) {
        window.CentralizedAuth.clearAuth();
      } else {
        localStorage.removeItem('elastic_cookie');
      }
      set((state) => ({
        auth: {
          isAuthenticated: false,
          isChecking: false,
          cookie: null,
          method: null,
          error: null,
        },
        ui: { ...state.ui, showAuthPrompt: true, mainContentVisible: false }
      }));
    },

    // Connection actions
    updateConnection: (system, status) => {
      set((state) => ({
        connection: {
          ...state.connection,
          [system]: { ...state.connection[system], ...status }
        }
      }));
    },

    // UI actions
    setLoading: (isLoading, message) => {
      set((state) => ({
        ui: {
          ...state.ui,
          isLoading,
          loadingMessage: message || state.ui.loadingMessage,
        }
      }));
    },

    setError: (error) => {
      set((state) => ({
        ui: { ...state.ui, error }
      }));
    },

    showAuthPrompt: () => {
      set((state) => ({
        ui: { ...state.ui, showAuthPrompt: true, isLoading: false }
      }));
    },

    hideAuthPrompt: () => {
      set((state) => ({
        ui: { ...state.ui, showAuthPrompt: false }
      }));
    },

    showMainContent: () => {
      set((state) => ({
        ui: {
          ...state.ui,
          isLoading: false,
          mainContentVisible: true,
          showAuthPrompt: false,
        }
      }));
    },

    hideMainContent: () => {
      set((state) => ({
        ui: { ...state.ui, mainContentVisible: false }
      }));
    },

    // Modal actions for @ux/modal integration
    showModal: (modalId) => {
      set((state) => ({
        ui: { ...state.ui, activeModal: modalId }
      }));
    },

    hideModal: () => {
      set((state) => ({
        ui: { ...state.ui, activeModal: null }
      }));
    },

    // Growl actions for @ux/growl integration
    showGrowl: (message, type = 'info', duration = 3000) => {
      const id = Date.now();
      const growl = { id, message, type, duration };

      set((state) => ({
        ui: {
          ...state.ui,
          growlMessages: [...state.ui.growlMessages, growl]
        }
      }));

      // Auto-remove after duration
      setTimeout(() => {
        get().actions.removeGrowl(id);
      }, duration);
    },

    removeGrowl: (id) => {
      set((state) => ({
        ui: {
          ...state.ui,
          growlMessages: state.ui.growlMessages.filter(g => g.id !== id)
        }
      }));
    },

    // Data actions
    setData: (events) => {
      // Calculate stats
      const stats = events.reduce(
        (acc, event) => {
          const status = event.status.toLowerCase();
          if (acc[status] !== undefined) {
            acc[status]++;
          }
          return acc;
        },
        { critical: 0, warning: 0, normal: 0, increased: 0 }
      );

      set((state) => ({
        data: {
          ...state.data,
          events,
          stats,
          lastUpdate: new Date().toISOString(),
        }
      }));

      // Apply current filters
      get().actions.applyFilters();
    },

    // Filter actions
    setFilter: (filterType, value) => {
      set((state) => ({
        filters: { ...state.filters, [filterType]: value }
      }));
      get().actions.applyFilters();
    },

    applyFilters: () => {
      const { events } = get().data;
      const { search, status, radTypes } = get().filters;

      let filtered = events;

      // Status filter
      if (status !== 'all') {
        filtered = filtered.filter(e => e.status.toLowerCase() === status);
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(e =>
          e.name.toLowerCase().includes(searchLower) ||
          e.radType?.toLowerCase().includes(searchLower)
        );
      }

      // RAD type filter
      if (radTypes.length > 0) {
        filtered = filtered.filter(e => radTypes.includes(e.radType));
      }

      set((state) => ({
        data: { ...state.data, filteredEvents: filtered }
      }));
    },

    // Initialize the app
    initialize: async () => {
      try {
        console.log('🚀 Initializing RAD Monitor with Antares components...');

        // Set initial loading state
        get().actions.setLoading(true, 'Initializing RAD Monitor...');

        // Step 1: Check authentication
        get().actions.setLoading(true, 'Checking authentication...');
        const isAuth = await get().actions.checkAuth();

        if (!isAuth) {
          console.log('⚠️ Not authenticated, showing auth prompt');
          return false;
        }

        // Step 2: Initialize API connection
        get().actions.setLoading(true, 'Connecting to API...');
        get().actions.updateConnection('api', { connected: true, message: 'Connected' });

        // Step 3: Initialize data service
        get().actions.setLoading(true, 'Loading data...');
        get().actions.updateConnection('data', { loaded: true, message: 'Ready' });

        // Step 4: Initialize formula builder
        get().actions.setLoading(true, 'Loading formula builder...');
        get().actions.updateConnection('formula', { initialized: true, message: 'Ready' });

        // All done - show main content
        setTimeout(() => {
          get().actions.showMainContent();
          get().actions.showGrowl('RAD Monitor ready!', 'success');
          console.log('✅ RAD Monitor ready!');
        }, 500);

        return true;
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        get().actions.setError(error.message);
        get().actions.showGrowl(error.message, 'error');
        get().actions.showAuthPrompt();
        return false;
      }
    },
  },
}));

// Helper functions for easy access
export const useAuth = () => appStore.getState().auth;
export const useConnection = () => appStore.getState().connection;
export const useUI = () => appStore.getState().ui;
export const useData = () => appStore.getState().data;
export const useFilters = () => appStore.getState().filters;
export const useActions = () => appStore.getState().actions;

// Subscribe to state changes
export const subscribe = (listener) => appStore.subscribe(listener);

// Make it available globally for debugging
window.appStore = appStore;

console.log('📦 App store initialized with Zustand + Antares integration');
