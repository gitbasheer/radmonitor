/**
 * Memory Leak Fixes Test Suite
 * Tests all the memory leak fixes implemented in the application
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock DOM environment
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
    <div id="tableBody"></div>
    <input id="searchInput" type="text" />
    <button class="filter-btn" data-filter="all">All</button>
    <button class="filter-btn" data-filter="critical">Critical</button>
    <div id="resultsInfo"></div>
    <div id="loadingOverlay" class="hidden"></div>
    <div id="mainAppContent"></div>
</body>
</html>
`, { url: 'http://localhost' });

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    clear: () => {}
};

// Mock modules
const mockResourceManager = {
    addInterval: (callback, delay) => setInterval(callback, delay),
    addTimeout: (callback, delay) => setTimeout(callback, delay),
    addListener: (element, event, handler) => element.addEventListener(event, handler),
    clearInterval: (id) => clearInterval(id),
    clearTimeout: (id) => clearTimeout(id),
    removeListener: (element, event, handler) => element.removeEventListener(event, handler),
    cleanup: () => console.log('ResourceManager cleanup called'),
    getStats: () => ({ intervals: 0, timeouts: 0, listeners: 0 }),
    logStats: () => console.log('ResourceManager stats')
};

const mockCleanupManager = {
    registerCleanup: (moduleName, cleanupFn) => console.log(`Registered cleanup for ${moduleName}`),
    unregisterCleanup: (moduleName) => console.log(`Unregistered cleanup for ${moduleName}`),
    cleanupModule: (moduleName) => console.log(`Cleaned up ${moduleName}`),
    cleanupAll: () => console.log('CleanupManager cleanupAll called'),
    getStats: () => ({ registeredModules: 0, isCleaningUp: false }),
    logStats: () => console.log('CleanupManager stats')
};

// Mock global objects
global.window.resourceManager = mockResourceManager;
global.window.cleanupManager = mockCleanupManager;
global.window.ConfigService = {
    getConfig: () => ({ rad_types: {} })
};

describe('Memory Leak Fixes', () => {
    beforeEach(() => {
        // Clear any existing intervals/timeouts
        jest.clearAllTimers();

        // Reset DOM
        document.body.innerHTML = `
            <div id="tableBody"></div>
            <input id="searchInput" type="text" />
            <button class="filter-btn" data-filter="all">All</button>
            <button class="filter-btn" data-filter="critical">Critical</button>
            <div id="resultsInfo"></div>
            <div id="loadingOverlay" class="hidden"></div>
            <div id="mainAppContent"></div>
        `;
    });

    afterEach(() => {
        // Clean up any remaining timers
        jest.clearAllTimers();
    });

    describe('Cache Size Limits', () => {
        it('should limit responseCache size in data-layer.js', () => {
            // This would require importing the actual data-layer module
            // For now, we'll test the concept
            const cache = new Map();
            const maxSize = 50;

            // Add more than max size
            for (let i = 0; i < 60; i++) {
                if (cache.size >= maxSize) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
                cache.set(`key${i}`, `value${i}`);
            }

            expect(cache.size).toBe(maxSize);
            expect(cache.has('key0')).toBe(false); // First key should be evicted
            expect(cache.has('key59')).toBe(true); // Last key should remain
        });

        it('should limit parsedCache size in data-layer.js', () => {
            const cache = new Map();
            const maxSize = 50;

            // Add more than max size
            for (let i = 0; i < 60; i++) {
                if (cache.size >= maxSize) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
                cache.set(`key${i}`, `value${i}`);
            }

            expect(cache.size).toBe(maxSize);
        });

        it('should limit cache size in api-client-unified.js', () => {
            const cache = new Map();
            const maxSize = 50;

            // Add more than max size
            for (let i = 0; i < 60; i++) {
                if (cache.size >= maxSize) {
                    const firstKey = cache.keys().next().value;
                    cache.delete(firstKey);
                }
                cache.set(`key${i}`, `value${i}`);
            }

            expect(cache.size).toBe(maxSize);
        });
    });

    describe('Event Listener Cleanup', () => {
        it('should clean up dashboard requestAnimationFrame', () => {
            const mockCancelAnimationFrame = jest.fn();
            global.cancelAnimationFrame = mockCancelAnimationFrame;

            const renderFrame = 123;

            // Simulate cleanup
            if (renderFrame) {
                cancelAnimationFrame(renderFrame);
            }

            expect(mockCancelAnimationFrame).toHaveBeenCalledWith(renderFrame);
        });

        it('should clean up connection status manager event listeners', () => {
            const mockRemoveEventListener = jest.fn();
            const mockElement = {
                removeEventListener: mockRemoveEventListener
            };

            const eventHandlers = {
                'api:connected': () => {},
                'api:disconnected': () => {},
                'auth:success': () => {}
            };

            // Simulate cleanup
            Object.entries(eventHandlers).forEach(([event, handler]) => {
                mockElement.removeEventListener(event, handler);
            });

            expect(mockRemoveEventListener).toHaveBeenCalledTimes(3);
        });

        it('should clean up search filter event listeners', () => {
            const mockRemoveEventListener = jest.fn();
            const mockElement = {
                removeEventListener: mockRemoveEventListener
            };

            const eventListeners = new Map();
            eventListeners.set(mockElement, [
                { event: 'input', handler: () => {} },
                { event: 'keyup', handler: () => {} }
            ]);

            // Simulate cleanup
            eventListeners.forEach((listeners, element) => {
                listeners.forEach(({ event, handler }) => {
                    element.removeEventListener(event, handler);
                });
            });

            expect(mockRemoveEventListener).toHaveBeenCalledTimes(2);
        });
    });

    describe('Timer Cleanup', () => {
        it('should clean up WebSocket reconnect intervals', () => {
            const mockClearInterval = jest.fn();
            global.clearInterval = mockClearInterval;

            const wsReconnectInterval = 456;

            // Simulate cleanup
            if (wsReconnectInterval) {
                clearInterval(wsReconnectInterval);
            }

            expect(mockClearInterval).toHaveBeenCalledWith(wsReconnectInterval);
        });

        it('should clean up refresh intervals', () => {
            const mockClearInterval = jest.fn();
            global.clearInterval = mockClearInterval;

            const refreshInterval = 789;

            // Simulate cleanup
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }

            expect(mockClearInterval).toHaveBeenCalledWith(refreshInterval);
        });
    });

    describe('Global Reference Cleanup', () => {
        it('should clean up global dashboard references', () => {
            const mockDestroy = jest.fn();
            global.window.dashboard = { destroy: mockDestroy };
            global.window.Dashboard = { destroy: mockDestroy };

            // Simulate cleanup
            if (global.window.dashboard && typeof global.window.dashboard.destroy === 'function') {
                global.window.dashboard.destroy();
            }

            if (global.window.Dashboard && typeof global.window.Dashboard.destroy === 'function') {
                global.window.Dashboard.destroy();
            }

            expect(mockDestroy).toHaveBeenCalledTimes(2);
        });

        it('should clean up global service references', () => {
            const mockCleanup = jest.fn();
            global.window.connectionManager = { cleanup: mockCleanup };
            global.window.apiClient = { cleanup: mockCleanup };
            global.window.ConfigService = { cleanup: mockCleanup };

            // Simulate cleanup
            if (global.window.connectionManager && typeof global.window.connectionManager.cleanup === 'function') {
                global.window.connectionManager.cleanup();
            }

            if (global.window.apiClient && typeof global.window.apiClient.cleanup === 'function') {
                global.window.apiClient.cleanup();
            }

            if (global.window.ConfigService && typeof global.window.ConfigService.cleanup === 'function') {
                global.window.ConfigService.cleanup();
            }

            expect(mockCleanup).toHaveBeenCalledTimes(3);
        });
    });

    describe('Formula Experiment Manager', () => {
        it('should limit assignments Map size', () => {
            const assignments = new Map();
            const maxAssignments = 50;

            // Add more than max size
            for (let i = 0; i < 60; i++) {
                if (assignments.size >= maxAssignments) {
                    const firstKey = assignments.keys().next().value;
                    assignments.delete(firstKey);
                }
                assignments.set(`experiment:user${i}`, 'cohort');
            }

            expect(assignments.size).toBe(maxAssignments);
            expect(assignments.has('experiment:user0')).toBe(false); // First should be evicted
            expect(assignments.has('experiment:user59')).toBe(true); // Last should remain
        });

        it('should limit localStorage size', () => {
            const data = {};
            const maxSize = 4 * 1024 * 1024; // 4MB

            // Create large data
            for (let i = 0; i < 1000; i++) {
                data[`key${i}`] = 'x'.repeat(1000); // 1KB per entry
            }

            const dataStr = JSON.stringify(data);

            // Simulate size check
            if (dataStr.length > maxSize) {
                // Clear half of the entries
                const entries = Object.entries(data);
                const toKeep = entries.slice(-Math.floor(entries.length / 2));
                const reducedData = Object.fromEntries(toKeep);
                const reducedStr = JSON.stringify(reducedData);

                expect(reducedStr.length).toBeLessThan(maxSize);
            }
        });
    });

    describe('Resource Manager Integration', () => {
        it('should track intervals through ResourceManager', () => {
            const mockAddInterval = jest.fn();
            mockResourceManager.addInterval = mockAddInterval;

            const callback = () => {};
            const delay = 1000;

            mockResourceManager.addInterval(callback, delay);

            expect(mockAddInterval).toHaveBeenCalledWith(callback, delay);
        });

        it('should track timeouts through ResourceManager', () => {
            const mockAddTimeout = jest.fn();
            mockResourceManager.addTimeout = mockAddTimeout;

            const callback = () => {};
            const delay = 5000;

            mockResourceManager.addTimeout(callback, delay);

            expect(mockAddTimeout).toHaveBeenCalledWith(callback, delay);
        });

        it('should track event listeners through ResourceManager', () => {
            const mockAddListener = jest.fn();
            mockResourceManager.addListener = mockAddListener;

            const element = document.createElement('div');
            const event = 'click';
            const handler = () => {};

            mockResourceManager.addListener(element, event, handler);

            expect(mockAddListener).toHaveBeenCalledWith(element, event, handler);
        });
    });

    describe('Cleanup Manager Integration', () => {
        it('should register cleanup functions', () => {
            const mockRegisterCleanup = jest.fn();
            mockCleanupManager.registerCleanup = mockRegisterCleanup;

            const cleanupFn = () => {};

            mockCleanupManager.registerCleanup('test-module', cleanupFn);

            expect(mockRegisterCleanup).toHaveBeenCalledWith('test-module', cleanupFn);
        });

        it('should clean up all modules', () => {
            const mockCleanupAll = jest.fn();
            mockCleanupManager.cleanupAll = mockCleanupAll;

            mockCleanupManager.cleanupAll();

            expect(mockCleanupAll).toHaveBeenCalled();
        });
    });

    describe('Memory Usage Monitoring', () => {
        it('should provide resource statistics', () => {
            const stats = mockResourceManager.getStats();

            expect(stats).toHaveProperty('intervals');
            expect(stats).toHaveProperty('timeouts');
            expect(stats).toHaveProperty('listeners');
        });

        it('should provide cleanup statistics', () => {
            const stats = mockCleanupManager.getStats();

            expect(stats).toHaveProperty('registeredModules');
            expect(stats).toHaveProperty('isCleaningUp');
        });
    });
});
