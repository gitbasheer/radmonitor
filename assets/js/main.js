/**
 * ESM: Main entry point for the browser
 * Imports all modules and makes them available globally for backward compatibility
 */

// Import all modules
import TimeRangeUtils from './time-range-utils.js';
import DataProcessor from './data-processor.js';
import ConfigManager from './config-manager.js';
import ConsoleVisualizer from './console-visualizer.js';
import UIUpdater from './ui-updater.js';
import ApiClient from './api-client.js';
import EnhancedApiClient from './api-client-enhanced.js';
import FastAPIClient from './api-client-fastapi.js';
import DataLayer from './data-layer.js';
import Dashboard from './dashboard-main.js';
import DataLayerExample from '../../examples/data-layer-example.js';
import StateLoggingDemo from './state-logging-demo.js';

// Make modules available globally for backward compatibility
window.TimeRangeUtils = TimeRangeUtils;
window.DataProcessor = DataProcessor;
window.ConfigManager = ConfigManager;
window.ConsoleVisualizer = ConsoleVisualizer;
window.UIUpdater = UIUpdater;
window.ApiClient = ApiClient;
window.EnhancedApiClient = EnhancedApiClient;
window.FastAPIClient = FastAPIClient;
window.DataLayer = DataLayer;
window.Dashboard = Dashboard;
window.DataLayerExample = DataLayerExample;
window.StateLoggingDemo = StateLoggingDemo;

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Dashboard.init();
    });
} else {
    // DOM already loaded
    Dashboard.init();
}

// Auto-run examples after a delay (if enabled)
setTimeout(() => {
    console.log('🧪 Testing DataLayer state management...');

    // Enable full logging for examples
    DataLayer.configureLogging({
        enabled: true,
        collapsed: false  // Show full state details
    });

    // Run examples with logging
    DataLayerExample.queryBuilding();
    DataLayerExample.responseParsing();
    DataLayerExample.stateInspection();

    // Show how to control logging
    console.log('%c📊 State Logging Examples:', 'color: #4CAF50; font-weight: bold;');
    console.log('%c• DataLayer.logAction("CUSTOM_ACTION", { data: "example" })', 'color: #666;');
    console.log('%c• DataLayer.configureLogging({ collapsed: true })', 'color: #666;');
    console.log('%c• DataLayer.configureLogging({ enabled: false })', 'color: #666;');

    console.log('✅ DataLayer examples complete! Check console for state action logs.');
}, 2000);

// Run state logging demo after a delay
setTimeout(() => {
    StateLoggingDemo.demo();
}, 3500);

// Export all modules for ES module usage
export {
    TimeRangeUtils,
    DataProcessor,
    ConfigManager,
    ConsoleVisualizer,
    UIUpdater,
    ApiClient,
    EnhancedApiClient,
    FastAPIClient,
    DataLayer,
    Dashboard,
    DataLayerExample,
    StateLoggingDemo
};
