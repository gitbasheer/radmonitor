/**
 * Clean Main Entry Point
 * Vanilla JS + Zustand for state management
 */

// Import store first
import { appStore, useActions } from './stores/app-store.js';

// Import components
import './components/loading-overlay.js';
import './components/auth-overlay.js';

// Import existing services that we'll integrate with the store
import { CentralizedAuth } from './centralized-auth.js';
import { authService } from './auth-service.js';
import { ConfigService } from './config-service.js';
import { apiClient } from './api-client-simplified.js';
import { dataService } from './data-service.js';
import { SimplifiedDashboard } from './dashboard-simplified.js';
import DOMPurify from './lib/dompurify.js';

// Initialize centralized authentication
window.CentralizedAuth = CentralizedAuth;
const centralizedAuthPromise = CentralizedAuth.init().then(auth => {
  console.log('✅ CentralizedAuth initialized', auth);
  return auth;
}).catch(err => {
  console.error('❌ CentralizedAuth initialization failed:', err);
  return null;
});

// Import config components
import ConfigEditor from './config-editor.js';
import ConfigManager from './config-manager.js';

// Import formula components (optional)
import './formula-editor-integration.js';
import './visual-formula-builder-integration.js';
import './ai-formula-integration.js';

// Import DOM effects which auto-initializes
import './stores/dom-effects.js';

// Import debug helper in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  import('./stores/debug-helper.js').catch(console.error);
}

// Enhanced RADMonitor API with store integration
window.RADMonitor = {
  // Store access
  store: appStore,
  getState: () => appStore.getState(),

  // Auth management
  setAuth: (cookie) => {
    const { setCookie } = useActions();
    setCookie(cookie.startsWith('sid=') ? cookie : `sid=${cookie}`);
    window.location.reload();
  },

  clearAuth: () => {
    const { clearAuth } = useActions();
    clearAuth();
    window.location.reload();
  },

  // Dashboard controls
  refresh: () => dashboard.refresh(),

  // Data management
  loadTestData: () => {
    const mockEvents = generateMockEvents();
    const { setData } = useActions();
    setData(mockEvents);
  },

  // Debugging
  showState: () => {
    const state = appStore.getState();
    console.log('🔍 Current App State:', state);
    return state;
  },

  // Force show auth (for testing)
  showAuth: () => {
    const { showAuthPrompt } = useActions();
    showAuthPrompt();
  },

  // Manual initialization (for debugging)
  init: () => {
    const { initialize } = useActions();
    return initialize();
  },

  // Help
  help: () => {
    console.log(`
🎯 RAD Monitor Console Commands:

Authentication:
  RADMonitor.setAuth("YOUR_SID_VALUE")  - Set Kibana cookie
  RADMonitor.clearAuth()                - Clear authentication
  RADMonitor.showAuth()                 - Show auth prompt (testing)

Dashboard:
  RADMonitor.refresh()                  - Refresh dashboard data
  RADMonitor.loadTestData()             - Load mock data for testing

Debugging:
  RADMonitor.showState()                - Show current app state
  RADMonitor.init()                     - Manual initialization

Examples:
  // Set authentication
  RADMonitor.setAuth("your-sid-cookie-value")

  // Load test data
  RADMonitor.loadTestData()

  // Debug current state
  RADMonitor.showState()
    `);
  },

  // Quick setup helper
  setupTestCookie: () => {
    console.log(`
🍪 To set up authentication:

1. Open Kibana in another tab
2. Open DevTools (F12) → Application → Cookies
3. Find the "sid" cookie
4. Copy its value
5. Run: RADMonitor.setAuth("YOUR_COOKIE_VALUE")

Or use: ${getApiUrl()}/kibana-cookie-sync.html

For testing without Kibana:
RADMonitor.loadTestData() - Load mock data
    `);
  }
};

// Generate mock events for testing
function generateMockEvents() {
  const statuses = ['CRITICAL', 'WARNING', 'NORMAL', 'INCREASED'];
  const radTypes = ['Login', 'API', 'Page View', 'Download', 'Upload'];

  return Array.from({ length: 50 }, (_, i) => ({
    id: `event-${i}`,
    name: `traffic.event.${radTypes[i % radTypes.length].toLowerCase()}.${i}`,
    radType: radTypes[i % radTypes.length],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    score: Math.floor(Math.random() * 200) - 100,
    current: Math.floor(Math.random() * 10000),
    baseline: Math.floor(Math.random() * 10000),
    impact: Math.random() > 0.5 ? 'High' : 'Low',
    kibanaUrl: '#'
  }));
}

// Enhanced dashboard integration
class DashboardIntegration {
  constructor() {
    this.unsubscribe = null;
    this.init();
  }

  init() {
    // Subscribe to store changes for dashboard updates
    this.unsubscribe = appStore.subscribe((state) => {
      this.updateDashboard(state);
    });

    // Enhance existing dashboard with store integration
    if (window.dashboard) {
      this.enhanceDashboard();
    }
  }

  updateDashboard(state) {
    // Update summary cards
    this.updateSummaryCards(state.data.stats);

    // Update table if dashboard is loaded
    if (window.dashboard && state.data.filteredEvents.length > 0) {
      this.updateTable(state.data.filteredEvents);
    }

    // Update filters
    this.updateFilters(state.filters);
  }

  updateSummaryCards(stats) {
    Object.entries(stats).forEach(([key, value]) => {
      const element = document.getElementById(`${key}Count`);
      if (element) {
        element.textContent = value;
      }
    });
  }

  updateTable(events) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    tableBody.innerHTML = DOMPurify.sanitize(events.map(event => `
      <tr>
        <td>
          <a href="${event.kibanaUrl}" target="_blank" class="event-link">
            ${event.name}
          </a>
        </td>
        <td>
          <span class="rad-type-badge">${event.radType}</span>
        </td>
        <td>
          <span class="badge ${event.status.toLowerCase()}">${event.status}</span>
        </td>
        <td class="number">
          <span class="score ${event.score < 0 ? 'negative' : 'positive'}">
            ${event.score > 0 ? '+' : ''}${event.score}%
          </span>
        </td>
        <td class="number">${event.current.toLocaleString()}</td>
        <td class="number">${event.baseline.toLocaleString()}</td>
        <td>
          <span class="impact ${event.impact.toLowerCase()}">${event.impact}</span>
        </td>
      </tr>
    `).join(''));
  }

  updateFilters(filters) {
    // Update search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput && searchInput.value !== filters.search) {
      searchInput.value = filters.search;
    }

    // Update filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filters.status);
    });
  }

  enhanceDashboard() {
    // Add event listeners for filters
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const { setFilter } = useActions();
        setFilter('search', e.target.value);
      });
    }

    // Add event listeners for status filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const { setFilter } = useActions();
        setFilter('status', btn.dataset.filter);
      });
    });
  }

  destroy() {
    console.log('🧹 DashboardIntegration: Cleaning up store subscription...');
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    console.log('✅ DashboardIntegration: Store subscription cleaned up');
  }
}

// Single initialization point
let initialized = false;
let dashboardInstance = null;
let dashboardIntegration = null;

async function initialize() {
  // Prevent double initialization
  if (initialized) {
    console.log('⚠️ App already initialized, skipping...');
    return;
  }
  initialized = true;

  console.log('🚀 RAD Monitor v3.0 (Clean Vanilla + Zustand)');
  console.log('💡 Type RADMonitor.help() for available commands');

  try {
    // Wait for CentralizedAuth to be ready first
    console.log('⏳ Waiting for CentralizedAuth to initialize...');
    await centralizedAuthPromise;
    
    // Start the app initialization
    const { initialize: initApp } = useActions();
    const success = await initApp();
    
    if (success) {
      // Create dashboard instance only after successful initialization
      dashboardInstance = new SimplifiedDashboard();
      await dashboardInstance.init();
      
      // Initialize dashboard integration for store updates
      dashboardIntegration = new DashboardIntegration();
      
      // Make essential modules globally available
      window.dashboard = dashboardInstance;
      window.Dashboard = dashboardInstance;
      window.ConfigEditor = ConfigEditor;
      window.ConfigManager = ConfigManager;
      window.ConfigService = ConfigService;
      
      // Update RADMonitor API
      window.RADMonitor.refresh = () => dashboardInstance.refresh();
      
      console.log('✅ Dashboard initialization complete');
    } else {
      console.log('⚠️ Initialization incomplete - authentication required');
    }
  } catch (error) {
    console.error('❌ Failed to initialize:', error);
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Development mode helpers
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🔧 Development mode active');
}
