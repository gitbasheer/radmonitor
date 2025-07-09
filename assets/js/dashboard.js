/**
 * Main Dashboard Entry Point
 * Coordinates initialization of all dashboard components
 */

import { appStore, useActions } from './stores/app-store.js';
import { SimplifiedDashboard } from './dashboard-simplified.js';
import './stores/dom-effects.js'; // Auto-initializes DOM effects

// Create global Dashboard instance
const dashboard = new SimplifiedDashboard();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

async function initializeDashboard() {
  try {
    console.log('🚀 Initializing RAD Monitor Dashboard...');
    
    // Initialize app store
    const actions = useActions();
    const initialized = await actions.initialize();
    
    if (initialized) {
      // Initialize dashboard
      await dashboard.init();
      
      // Make dashboard available globally for onclick handlers
      window.Dashboard = dashboard;
      
      console.log('✅ Dashboard initialization complete');
    } else {
      console.log('⚠️ Dashboard initialization incomplete - authentication required');
    }
  } catch (error) {
    console.error('❌ Dashboard initialization failed:', error);
  }
}

// Export for use in other modules
export { dashboard };