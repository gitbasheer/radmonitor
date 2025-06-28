/**
 * Main Entry Point - Simplified Version
 * Minimal initialization for the dashboard
 */

// Import our types first
import './types.js';

// Import centralized authentication and UI components first
import './centralized-auth.js';
import './cookie-modal.js';

// Import core services
import { authService } from './auth-service.js';
import { ConfigService } from './config-service.js';
import { apiClient } from './api-client-simplified.js';
import { dataService } from './data-service.js';

// Import UI components
import { dashboard } from './dashboard-simplified.js';
import { EventEmitter } from './event-emitter.js';

// Import config components
import ConfigEditor from './config-editor.js';
import ConfigManager from './config-manager.js';

// Development testing
import './test-simplified-system.js';
import './streamlined-test.js';

// Make essential modules available globally for backward compatibility
window.dashboard = dashboard;
window.Dashboard = dashboard;  // Backward compatibility with uppercase
window.AuthService = authService;
window.DataService = dataService;
window.APIClient = apiClient;
window.ConfigEditor = ConfigEditor;
window.ConfigManager = ConfigManager;
window.ConfigService = ConfigService;

// Simple console API for debugging
window.RADMonitor = {
    // Dashboard controls
    refresh: () => dashboard.refresh(),
    clearCache: () => apiClient.clearCache(),

    // Data inspection
    getData: () => dataService.getState(),
    getMetrics: () => apiClient.getMetrics(),

    // Auth management
    getAuthStatus: () => authService.getStatus(),
    setAuth: (cookie) => authService.setLegacyCookie(cookie),
    clearAuth: () => authService.clearAuth(),

    // Help
    help: () => {
        console.log(`
🎯 RAD Monitor Console Commands:

Dashboard:
  RADMonitor.refresh()     - Refresh dashboard data
  RADMonitor.clearCache()  - Clear cached data

Data:
  RADMonitor.getData()     - Get current data state
  RADMonitor.getMetrics()  - View performance metrics

Authentication:
  RADMonitor.getAuthStatus()  - Check auth status
  RADMonitor.setAuth(cookie)  - Set authentication cookie
  RADMonitor.clearAuth()      - Clear authentication

Testing:
  TestSuite.run()          - Run full test suite
  TestSuite.showState()    - Show current state
  TestSuite.clearState()   - Clear persisted state
        `);
    }
};

// Initialize on DOM ready
async function initialize() {
    try {
        console.log('🚀 RAD Monitor v2.0 (Simplified)');

        // Set up global functions expected by HTML
        window.updateConnectionStatus = function(connected, message) {
            const statusDot = document.querySelector('.status-dot');
            const statusText = document.querySelector('.status-text');

            if (statusDot && statusText) {
                statusDot.style.backgroundColor = connected ? '#4CAF50' : '#f44336';
                statusText.textContent = message || (connected ? 'Connected' : 'Disconnected');
            }
        };

        // Initialize centralized auth first
        if (window.CentralizedAuth) {
            await window.CentralizedAuth.init();
        }

        // Initialize dashboard
        await dashboard.init();

        // Load test suite in development mode
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            try {
                await import('./test-simplified-system.js');
                console.log('🧪 Test suite loaded - Run: TestSuite.run()');
            } catch (error) {
                console.log('Test suite not available');
            }
        }

        // Show help hint
        console.log('💡 Type RADMonitor.help() for available commands');

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
