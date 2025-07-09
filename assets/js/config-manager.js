/**
 * Configuration Manager for RAD Monitor Dashboard
 *
 * This is now a thin compatibility wrapper around ConfigService.
 * All actual configuration logic has been moved to ConfigService.
 * This module remains for backward compatibility with existing UI calls.
 */

// Import dependencies
import TimeRangeUtils from './time-range-utils.js';
import { ConfigService } from './config-service.js';
import DataLayer from './data-layer.js';
import { dashboard as Dashboard } from './dashboard.js';

/**
 * Get current configuration from UI elements
 * Delegates to ConfigService
 */
export function getCurrentConfig() {
    return ConfigService.getCurrentConfigFromDOM();
}

/**
 * Load configuration into UI elements
 * Delegates to ConfigService
 */
export function loadConfiguration(config) {
    ConfigService.loadConfigurationIntoDOM(config);
    highlightActivePreset();
}

/**
 * Save configuration to storage
 * Delegates to ConfigService
 */
export async function saveConfiguration(config) {
    await ConfigService.updateConfig(config);
    DataLayer.logAction('CONFIG_SAVED', { config });
}

/**
 * Apply current configuration and refresh dashboard
 */
export async function applyConfiguration() {
    const config = getCurrentConfig();

    // Validate time range
    if (!TimeRangeUtils.validateTimeRange(config.currentTimeRange)) {
        alert('Invalid time range format. Use formats like "now-12h" or "-3h-6h"');
        return;
    }

    // Save and apply
    await saveConfiguration(config);

    // Log action
    DataLayer.logAction('CONFIG_APPLIED', { config });

    // Refresh dashboard
    if (window.Dashboard && typeof window.Dashboard.refresh === 'function') {
        window.Dashboard.refresh();
    }
}

/**
 * Export configuration to file
 * Delegates to ConfigService
 */
export function exportConfiguration() {
    ConfigService.exportConfig();
}

/**
 * Import configuration from file
 * Delegates to ConfigService
 */
export async function importConfiguration() {
    try {
        const config = await ConfigService.importConfig();
        loadConfiguration(config);
        alert('Configuration imported successfully');
    } catch (error) {
        alert('Failed to import configuration: ' + error.message);
    }
}

/**
 * Set preset time range
 * Delegates to ConfigService
 */
export function setPresetTimeRange(preset) {
    ConfigService.setPresetTimeRange(preset);
    highlightActivePreset();
}

/**
 * Highlight active preset button
 * UI-specific function that remains in ConfigManager
 */
export function highlightActivePreset() {
    const currentValue = document.getElementById('currentTimeRange')?.value;
    const presetButtons = document.querySelectorAll('.preset-button');

    presetButtons.forEach(btn => {
        btn.classList.remove('active');
    });

    // Map values to buttons
    const valueMap = {
        'now-6h': '6H',
        'now-12h': '12H',
        'now-24h': '24H',
        'now-3d': '3D',
        'inspection_time': 'INSPECTION MODE'
    };

    const btnText = valueMap[currentValue];
    if (btnText) {
        presetButtons.forEach(btn => {
            if (btn.textContent === btnText || btn.textContent.includes(btnText)) {
                btn.classList.add('active');
            }
        });
    }
}

/**
 * Check environment (legacy function)
 * Delegates to ConfigService
 */
export function checkEnvironment() {
    // Environment check moved to ConfigService initialization
    return ConfigService.getConfig();
}

/**
 * Validate configuration (legacy function)
 * Delegates to ConfigService
 */
export function validateConfiguration(config) {
    return ConfigService.validateConfig(config);
}

/**
 * Initialize configuration manager
 * Sets up event listeners and loads initial config
 */
export async function initialize() {
    // Ensure ConfigService is initialized first
    await ConfigService.initialize();

    // Subscribe to config changes
    ConfigService.subscribe((event) => {
        if (event.event === 'updated') {
            loadConfiguration(event.newConfig);
        }
    });

    // Load initial configuration
    const config = ConfigService.getConfig();
    loadConfiguration(config);

    // Set up event listeners
    const timeRangeInput = document.getElementById('currentTimeRange');
    if (timeRangeInput) {
        timeRangeInput.addEventListener('change', highlightActivePreset);
    }
}

// Create default export object for backward compatibility
const ConfigManager = {
    getCurrentConfig,
    loadConfiguration,
    saveConfiguration,
    applyConfiguration,
    exportConfiguration,
    importConfiguration,
    setPresetTimeRange,
    highlightActivePreset,
    initialize,
    checkEnvironment,
    validateConfiguration
};

// Export as default for ES modules
export default ConfigManager;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initialize().catch(console.error);
    });
} else {
    initialize().catch(console.error);
}
