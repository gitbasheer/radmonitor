/**
 * ESM: Main entry point for the browser
 * Imports all modules and makes them available globally for backward compatibility
 */

// Import all modules
import TimeRangeUtils from './time-range-utils.js';
import DataProcessor from './data-processor.js';
import ConfigManager from './config-manager.js';
import ConfigEditor from './config-editor.js';
import { ConfigService } from './config-service.js';
import ConsoleVisualizer from './console-visualizer.js';
import UIUpdater from './ui-updater.js';
import ApiClient from './api-client.js';
import EnhancedApiClient from './api-client-enhanced.js';
import FastAPIClient from './api-client-fastapi.js';
import { FastAPIIntegration } from './fastapi-integration.js';
import DataLayer from './data-layer.js';
import Dashboard from './dashboard-main.js';
import StateLoggingDemo from './state-logging-demo.js';

// Make modules available globally for backward compatibility
window.TimeRangeUtils = TimeRangeUtils;
window.DataProcessor = DataProcessor;
window.ConfigManager = ConfigManager;
window.ConfigEditor = ConfigEditor;
window.ConfigService = ConfigService;
window.ConsoleVisualizer = ConsoleVisualizer;
window.UIUpdater = UIUpdater;
window.ApiClient = ApiClient;
window.EnhancedApiClient = EnhancedApiClient;
window.FastAPIClient = FastAPIClient;
window.FastAPIIntegration = FastAPIIntegration;
window.DataLayer = DataLayer;
window.Dashboard = Dashboard;
window.StateLoggingDemo = StateLoggingDemo;

// Initialize dashboard when DOM is ready
async function initializeDashboard() {
    await Dashboard.init();
    console.log('RAD Monitor Dashboard initialized');
    
    // Show FastAPI integration status
    if (window.FastAPIIntegration) {
        const status = window.FastAPIIntegration.getStatus();
        console.log(`%cFastAPI Integration: ${status.enabled ? 'ENABLED' : 'DISABLED'}`, `color: ${status.enabled ? '#4CAF50' : '#666'}`);
        if (!status.enabled) {
            console.log('%cTo enable FastAPI mode, run in console: FastAPIIntegration.enable()', 'color: #2196F3');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
    // DOM already loaded
    initializeDashboard();
}

// Configure logging to be less verbose by default (set early)
DataLayer.configureLogging({
    enabled: true,
    collapsed: true  // Start with collapsed logs to reduce noise
});

    // Auto-test DataLayer functionality after initialization
    setTimeout(() => {
        console.log('🧪 Testing DataLayer state management...');

        // Test basic functionality
        console.log('%c📊 DataLayer Ready!', 'color: #4CAF50; font-weight: bold;');
        console.log('%c• Dashboard.refresh() - Refresh dashboard data', 'color: #666;');
        console.log('%c• Dashboard.showPerformanceStats() - Show performance metrics', 'color: #666;');
        console.log('%c• ConfigManager.getCurrentConfig() - Get current configuration', 'color: #666;');
        console.log('%c• ConfigEditor.loadConfig() - Load configuration editor', 'color: #666;');

        console.log('✅ All modules loaded and available globally!');
        
        // Show the current authentication status
        const localCookie = localStorage.getItem('elasticCookie');
        const envCookie = window.ELASTIC_COOKIE;
        
        if (localCookie) {
            if (envCookie && localCookie === envCookie) {
                console.log('%c🍪 Authentication: Environment cookie loaded automatically!', 'color: #4CAF50; font-weight: bold;');
            } else {
                console.log('%c🍪 Authentication: Cookie found in localStorage - ready for data queries', 'color: #4CAF50;');
            }
        } else if (envCookie) {
            console.log('%c🍪 Authentication: Environment cookie available - will load automatically on first query', 'color: #2196F3;');
        } else {
            console.log('%c🍪 Authentication: No cookie - click "Set Cookie" to enable data queries', 'color: #ff9800;');
        }
    }, 2000);

// Run state logging demo after a delay (can be controlled)
if (!window.DISABLE_STATE_DEMO) {
    setTimeout(() => {
        StateLoggingDemo.demo();
    }, 3500);
}

// (Logging configuration moved earlier)

// Add console control functions
window.ConsoleControl = {
    enableVerbose: () => {
        DataLayer.configureLogging({ enabled: true, collapsed: false });
        console.log('%c✅ Verbose logging enabled', 'color: #00ff41; font-weight: bold;');
        console.log('%cTip: Use ConsoleControl.reduceVerbose() to make it quieter', 'color: #4ecdc4;');
    },
    
    reduceVerbose: () => {
        DataLayer.configureLogging({ enabled: true, collapsed: true });
        console.log('%c🔇 Logging set to quiet mode (collapsed)', 'color: #ffaa00; font-weight: bold;');
    },
    
    disableLogging: () => {
        DataLayer.configureLogging({ enabled: false });
        console.log('%c❌ State logging disabled', 'color: #ff0000; font-weight: bold;');
    },
    
    disableStateDemo: () => {
        window.DISABLE_STATE_DEMO = true;
        console.log('%c🚫 State logging demo disabled', 'color: #ff9800; font-weight: bold;');
        console.log('%cReload the page to see the effect', 'color: #4ecdc4;');
    },
    
    showHelp: () => {
        console.log('%cConsole Control Commands:', 'color: #ffe66d; font-weight: bold;');
        console.log('%c• ConsoleControl.enableVerbose() - Show detailed state logs', 'color: #a8e6cf;');
        console.log('%c• ConsoleControl.reduceVerbose() - Collapse state logs (default)', 'color: #a8e6cf;');
        console.log('%c• ConsoleControl.disableLogging() - Turn off state logging', 'color: #a8e6cf;');
        console.log('%c• ConsoleControl.disableStateDemo() - Disable state demo on next reload', 'color: #a8e6cf;');
        console.log('%c• ConsoleControl.showHelp() - Show this help', 'color: #a8e6cf;');
    }
};

// Show a brief help message on startup
console.log('%c💡 Tip: Use ConsoleControl.showHelp() to see console controls', 'color: #4ecdc4;');

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
    EnhancedApiClient,
    FastAPIClient,
    FastAPIIntegration,
    DataLayer,
    Dashboard,
    StateLoggingDemo
};
