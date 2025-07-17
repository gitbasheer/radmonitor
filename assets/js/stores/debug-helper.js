/**
 * Debug Helper for RAD Monitor Store
 * Provides easy access to store state and actions in browser console
 */

import { appStore } from './app-store.js';
import { authManager } from '../auth-manager.js';

// Expose store to window for debugging
window.RADStore = {
  // Get current state
  getState: () => appStore.getState(),
  
  // Get specific state slices
  auth: () => appStore.getState().auth,
  connection: () => appStore.getState().connection,
  ui: () => appStore.getState().ui,
  data: () => appStore.getState().data,
  filters: () => appStore.getState().filters,
  
  // Actions
  actions: () => appStore.getState().actions,
  
  // Subscribe to changes
  subscribe: (callback) => {
    const unsubscribe = appStore.subscribe((state) => {
      console.log('📊 State changed:', state);
      if (callback) callback(state);
    });
    return unsubscribe;
  },
  
  // Pretty print state
  log: () => {
    const state = appStore.getState();
    console.group('🏪 RAD Monitor Store State');
    console.log('🔐 Auth:', state.auth);
    console.log('🔌 Connection:', state.connection);
    console.log('🎨 UI:', state.ui);
    console.log('📊 Data:', {
      events: state.data.events.length,
      stats: state.data.stats,
      loading: state.data.loading
    });
    console.log('🔍 Filters:', state.filters);
    console.groupEnd();
  },
  
  // Check authentication status
  checkAuth: () => {
    const state = appStore.getState();
    const auth = state.auth;
    console.group('🔐 Authentication Status');
    console.log('Authenticated:', auth.isAuthenticated);
    console.log('Cookie:', auth.cookie ? '✅ Present' : '❌ Missing');
    console.log('Method:', auth.method || 'None');
    console.log('Checking:', auth.isChecking);
    console.log('Error:', auth.error || 'None');
    
    // Also check AuthManager
    const authManagerStatus = authManager.getStatus();
    console.log('AuthManager:', authManagerStatus);
    
    console.groupEnd();
    return auth;
  },
  
  // Force refresh authentication
  refreshAuth: async () => {
    console.log('🔄 Refreshing authentication...');
    const actions = appStore.getState().actions;
    const result = await actions.checkAuth();
    console.log('Authentication result:', result ? '✅ Success' : '❌ Failed');
    return result;
  },
  
  // Clear auth and show prompt
  clearAuth: () => {
    const actions = appStore.getState().actions;
    actions.clearAuth();
    console.log('🗑️ Authentication cleared');
  },
  
  // Show current cookie sources
  showCookieSources: () => {
    console.group('🍪 Cookie Sources');
    
    // Check all possible cookie locations
    const sources = {
      'AuthManager': authManager.getCookie() || null,
      'localStorage[rad_monitor_auth]': localStorage.getItem('rad_monitor_auth'),
      'localStorage[elastic_cookie]': localStorage.getItem('elastic_cookie'),
      'localStorage[elasticCookie]': localStorage.getItem('elasticCookie'),
      'window.ELASTIC_COOKIE': window.ELASTIC_COOKIE || null
    };
    
    for (const [source, value] of Object.entries(sources)) {
      if (value) {
        console.log(`✅ ${source}:`, value.substring(0, 50) + '...');
      } else {
        console.log(`❌ ${source}: Not found`);
      }
    }
    
    console.groupEnd();
  }
};

// Auto-expose store state updates in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🛠️ RAD Store Debug Helper loaded');
  console.log('Available commands:');
  console.log('  RADStore.log()         - Show current state');
  console.log('  RADStore.checkAuth()   - Check authentication');
  console.log('  RADStore.refreshAuth() - Refresh authentication');
  console.log('  RADStore.showCookieSources() - Show all cookie locations');
  console.log('  RADStore.subscribe()   - Subscribe to state changes');
}

export default window.RADStore;