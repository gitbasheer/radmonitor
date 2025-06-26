/**
 * ESM: Main entry point for the browser
 * Imports all modules and makes them available globally for backward compatibility
 */

// Import all modules
import { loadApiEndpoints } from './config-loader.js';
import TimeRangeUtils from './time-range-utils.js';
import DataProcessor from './data-processor.js';
import ConfigManager from './config-manager.js';
import ConfigEditor from './config-editor.js';
import { ConfigService } from './config-service.js';
import ConsoleVisualizer from './console-visualizer.js';
import UIUpdater from './ui-updater.js';
import ApiClient from './api-client.js';
import FastAPIClient from './api-client-fastapi.js';
import apiClient from './api-client-unified.js';  // New unified client
import { FastAPIIntegration } from './fastapi-integration.js';
import DataLayer from './data-layer.js';
import Dashboard from './dashboard-main.js';
import StateLoggingDemo from './state-logging-demo.js';
import UIConsolidation from './ui-consolidation.js';
import SearchFilter from './search-filter.js';
import ThemeManager from './theme-manager.js';
import { ProxyClient } from './proxy-client.js';

// Make modules available globally for backward compatibility
window.TimeRangeUtils = TimeRangeUtils;
window.DataProcessor = DataProcessor;
window.ConfigManager = ConfigManager;
window.ConfigEditor = ConfigEditor;
window.ConfigService = ConfigService;
window.ConsoleVisualizer = ConsoleVisualizer;
window.UIUpdater = UIUpdater;
window.ApiClient = ApiClient;
window.FastAPIClient = FastAPIClient;
window.UnifiedAPIClient = apiClient;  // New unified client available globally
window.FastAPIIntegration = FastAPIIntegration;
window.DataLayer = DataLayer;
window.Dashboard = Dashboard;
window.StateLoggingDemo = StateLoggingDemo;
window.UIConsolidation = UIConsolidation;
window.SearchFilter = SearchFilter;
window.ThemeManager = ThemeManager;
window.ProxyClient = ProxyClient;

// Configure logging to be less verbose by default (MUST be set before any initialization)
DataLayer.configureLogging({
    enabled: true,
    collapsed: true,  // Start with collapsed logs to reduce noise
    verbosity: 'quiet'  // Use quiet verbosity by default - minimal logging
});

// Initialize dashboard when DOM is ready
async function initializeDashboard() {
    // Show clean startup header
    console.log('%c🚀 RAD Monitor Dashboard', 'color: #4CAF50; font-size: 18px; font-weight: bold;');
    
    // Wait for ConfigService to initialize first
    try {
        await ConfigService.initialize();
        console.log('📝 Configuration service ready');
    } catch (error) {
        console.warn('⚠️ Config service initialization failed, continuing with defaults:', error.message);
    }
    
    await Dashboard.init();
    
    // Show environment status in structured format
    const localCookie = localStorage.getItem('elasticCookie');
    const envCookie = window.ELASTIC_COOKIE;
    const config = ConfigService.getConfig();
    
    let authStatus = 'No cookie - click "Set Cookie"';
    if (config.dashboard?.autoAuthenticated) {
        authStatus = 'Auto-authenticated via GitHub Secrets';
    } else if (localCookie) {
        authStatus = envCookie && localCookie === envCookie ? 'Cookie loaded automatically' : 'Cookie found in localStorage';
    } else if (envCookie) {
        authStatus = 'Environment cookie available';
    }
    
    console.log(`├── ✅ Environment: ${authStatus}`);
    
    // Show FastAPI integration status
    if (window.FastAPIIntegration) {
        const status = window.FastAPIIntegration.getStatus();
        console.log(`├── 📡 FastAPI Integration: ${status.enabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    console.log(`└── 💡 Commands: Dashboard.showPerformanceStats() | ConsoleControl.showHelp()`);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    // DOM already loaded
    initializeDashboard();
}

// State logging demo is disabled by default
// To run the demo, use ConsoleControl.runDemo() in the console
// The demo was running automatically and creating too much console noise

// Add console control functions
window.ConsoleControl = {
    enableVerbose: () => {
        DataLayer.configureLogging({ enabled: true, collapsed: false, verbosity: 'verbose' });
        console.log('%c✅ Verbose logging enabled - showing all state actions', 'color: #00ff41; font-weight: bold;');
    },
    
    quiet: () => {
        DataLayer.configureLogging({ enabled: true, collapsed: true, verbosity: 'quiet' });
        console.log('%c🔇 Minimal logging - only important actions', 'color: #ffaa00; font-weight: bold;');
    },
    
    normal: () => {
        DataLayer.configureLogging({ enabled: true, collapsed: true, verbosity: 'normal' });
        console.log('%c🔔 Balanced logging - default mode', 'color: #4CAF50; font-weight: bold;');
    },
    
    disableLogging: () => {
        DataLayer.configureLogging({ enabled: false });
        console.log('%c❌ State logging disabled', 'color: #ff0000; font-weight: bold;');
    },
    
    runDemo: () => {
        StateLoggingDemo.demo();
    },
    
    testCookie: async (cookie) => {
        console.log('%c🔍 Testing Elasticsearch cookie...', 'color: #2196F3; font-weight: bold;');
        
        // Save the cookie
        const cookieData = {
            cookie: cookie.trim(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            saved: new Date().toISOString()
        };
        localStorage.setItem('elasticCookie', JSON.stringify(cookieData));
        
        // Test it
        try {
            const auth = await apiClient.getAuthenticationDetails();
            if (auth.valid) {
                console.log('%c✅ Cookie is valid!', 'color: #4CAF50; font-weight: bold;');
                console.log('Authentication details:', auth);
                
                // Try a test query
                const health = await apiClient.checkHealth();
                console.log('Server health:', health);
                
                return true;
            } else {
                console.log('%c❌ Cookie is invalid', 'color: #f44336; font-weight: bold;');
                return false;
            }
        } catch (error) {
            console.error('%c❌ Cookie test failed:', 'color: #f44336; font-weight: bold;', error.message);
            return false;
        }
    },
    
    showHelp: () => {
        console.log('%c🔧 Console Control Commands:', 'color: #ffe66d; font-size: 14px; font-weight: bold;');
        console.log('');
        console.log('%cLogging Levels:', 'color: #4CAF50; font-weight: bold;');
        console.log('  %cConsoleControl.quiet()%c - Minimal logging (only important actions)', 'color: #2196F3;', 'color: #666;');
        console.log('  %cConsoleControl.normal()%c - Balanced logging (default)', 'color: #2196F3;', 'color: #666;');
        console.log('  %cConsoleControl.enableVerbose()%c - Show all state actions', 'color: #2196F3;', 'color: #666;');
        console.log('  %cConsoleControl.disableLogging()%c - Turn off state logging', 'color: #2196F3;', 'color: #666;');
        console.log('');
        console.log('%cOther Commands:', 'color: #4CAF50; font-weight: bold;');
        console.log('  %cDashboard.showPerformanceStats()%c - View performance metrics', 'color: #2196F3;', 'color: #666;');
        console.log('  %cDashboard.refresh()%c - Refresh dashboard data', 'color: #2196F3;', 'color: #666;');
        console.log('  %cConsoleControl.testCookie("your_cookie")%c - Test an Elasticsearch cookie', 'color: #2196F3;', 'color: #666;');
        console.log('  %cConsoleControl.runDemo()%c - Run state logging demo', 'color: #2196F3;', 'color: #666;');
        console.log('');
    }
};

// Export all modules for ES module usage
export {
    TimeRangeUtils,
    DataProcessor,
    ConfigManager,
    ConfigEditor,
    ConfigService,
    ConsoleVisualizer,
    UIUpdater,
    ApiClient,
    FastAPIClient,
    apiClient,  // New unified client
    FastAPIIntegration,
    DataLayer,
    Dashboard,
    StateLoggingDemo,
    UIConsolidation,
    SearchFilter,
    ThemeManager,
    ProxyClient
};
