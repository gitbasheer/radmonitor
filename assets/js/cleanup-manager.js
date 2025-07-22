/**
 * Cleanup Manager - Coordinates cleanup across all application modules
 * Integrates with ResourceManager to prevent memory leaks
 */

import { resourceManager } from './resource-manager.js';

export class CleanupManager {
    constructor() {
        this.cleanupFunctions = new Map();
        this.isCleaningUp = false;

        // Auto-cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanupAll());

        // Cleanup on visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.cleanupBackgroundResources();
            }
        });
    }

    /**
     * Register a cleanup function for a module
     */
    registerCleanup(moduleName, cleanupFn) {
        this.cleanupFunctions.set(moduleName, cleanupFn);
        console.log(`🧹 CleanupManager: Registered cleanup for ${moduleName}`);
    }

    /**
     * Unregister a cleanup function
     */
    unregisterCleanup(moduleName) {
        this.cleanupFunctions.delete(moduleName);
        console.log(`🧹 CleanupManager: Unregistered cleanup for ${moduleName}`);
    }

    /**
     * Clean up a specific module
     */
    cleanupModule(moduleName) {
        const cleanupFn = this.cleanupFunctions.get(moduleName);
        if (cleanupFn) {
            try {
                cleanupFn();
                console.log(`✅ CleanupManager: Cleaned up ${moduleName}`);
            } catch (error) {
                console.error(`❌ CleanupManager: Error cleaning up ${moduleName}:`, error);
            }
        } else {
            console.warn(`⚠️ CleanupManager: No cleanup function registered for ${moduleName}`);
        }
    }

    /**
     * Clean up background resources when page is hidden
     */
    cleanupBackgroundResources() {
        console.log('🧹 CleanupManager: Cleaning up background resources...');

        // Clean up non-critical modules
        const backgroundModules = [
            'dashboard',
            'formula-editor',
            'search-filter'
        ];

        backgroundModules.forEach(moduleName => {
            this.cleanupModule(moduleName);
        });

        // Use ResourceManager for background cleanup
        if (resourceManager) {
            resourceManager.cleanupBackgroundResources();
        }
    }

    /**
     * Clean up all modules and resources
     */
    cleanupAll() {
        if (this.isCleaningUp) {
            console.log('⚠️ CleanupManager: Cleanup already in progress');
            return;
        }

        this.isCleaningUp = true;
        console.log('🧹 CleanupManager: Starting comprehensive cleanup...');

        try {
            // Clean up all registered modules
            for (const [moduleName, cleanupFn] of this.cleanupFunctions) {
                try {
                    cleanupFn();
                    console.log(`✅ CleanupManager: Cleaned up ${moduleName}`);
                } catch (error) {
                    console.error(`❌ CleanupManager: Error cleaning up ${moduleName}:`, error);
                }
            }

            // Clean up global references
            this.cleanupGlobalReferences();

            // Use ResourceManager for final cleanup
            if (resourceManager) {
                resourceManager.cleanup();
            }

            console.log('✅ CleanupManager: Comprehensive cleanup completed');
        } catch (error) {
            console.error('❌ CleanupManager: Error during cleanup:', error);
        } finally {
            this.isCleaningUp = false;
        }
    }

    /**
     * Clean up global references that might cause memory leaks
     */
    cleanupGlobalReferences() {
        console.log('🧹 CleanupManager: Cleaning up global references...');

        // Clean up global dashboard references
        if (window.dashboard && typeof window.dashboard.destroy === 'function') {
            try {
                window.dashboard.destroy();
            } catch (error) {
                console.error('Error destroying dashboard:', error);
            }
        }

        // Clean up global Dashboard reference
        if (window.Dashboard && typeof window.Dashboard.destroy === 'function') {
            try {
                window.Dashboard.destroy();
            } catch (error) {
                console.error('Error destroying Dashboard:', error);
            }
        }

        // Clean up connection manager
        if (window.connectionManager && typeof window.connectionManager.cleanup === 'function') {
            try {
                window.connectionManager.cleanup();
            } catch (error) {
                console.error('Error cleaning up connection manager:', error);
            }
        }

        // Clean up API client
        if (window.apiClient && typeof window.apiClient.cleanup === 'function') {
            try {
                window.apiClient.cleanup();
            } catch (error) {
                console.error('Error cleaning up API client:', error);
            }
        }

        // Clean up config service
        if (window.ConfigService && typeof window.ConfigService.cleanup === 'function') {
            try {
                window.ConfigService.cleanup();
            } catch (error) {
                console.error('Error cleaning up config service:', error);
            }
        }

        // Clear global references
        const globalRefs = [
            'dashboard',
            'Dashboard',
            'connectionManager',
            'apiClient',
            'ConfigService',
            'unifiedAPI',
            'dataService',
            'authService'
        ];

        globalRefs.forEach(ref => {
            if (window[ref]) {
                window[ref] = null;
            }
        });

        console.log('✅ CleanupManager: Global references cleaned up');
    }

    /**
     * Get cleanup statistics
     */
    getStats() {
        return {
            registeredModules: this.cleanupFunctions.size,
            isCleaningUp: this.isCleaningUp,
            resourceManagerStats: resourceManager ? resourceManager.getStats() : null
        };
    }

    /**
     * Log cleanup statistics
     */
    logStats() {
        const stats = this.getStats();
        console.log(' CleanupManager Stats:', stats);
        return stats;
    }
}

// Global instance
export const cleanupManager = new CleanupManager();

// Make it available globally
window.cleanupManager = cleanupManager;

export default cleanupManager;
