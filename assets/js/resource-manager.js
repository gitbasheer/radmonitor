/**
 * Resource Manager - Centralized cleanup for all application resources
 * Prevents memory leaks by tracking and cleaning up all resources
 */

export class ResourceManager {
    constructor() {
        this.intervals = new Set();
        this.timeouts = new Set();
        this.listeners = new Map(); // element -> [{event, handler, options}]
        this.workers = new Set();
        this.animationFrames = new Set();
        this.caches = new Map(); // cacheName -> {cache, maxSize}

        // Auto-cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());

        // Cleanup on visibility change to prevent background leaks
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.cleanupBackgroundResources();
            }
        });
    }

    /**
     * Add interval with automatic cleanup tracking
     */
    addInterval(callback, delay, ...args) {
        const id = setInterval(callback, delay, ...args);
        this.intervals.add(id);
        return id;
    }

    /**
     * Add timeout with automatic cleanup tracking
     */
    addTimeout(callback, delay, ...args) {
        const id = setTimeout(callback, delay, ...args);
        this.timeouts.add(id);
        return id;
    }

    /**
     * Add event listener with automatic cleanup tracking
     */
    addListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);

        if (!this.listeners.has(element)) {
            this.listeners.set(element, []);
        }

        this.listeners.get(element).push({ event, handler, options });
        return { element, event, handler, options };
    }

    /**
     * Add Web Worker with automatic cleanup tracking
     */
    addWorker(worker) {
        this.workers.add(worker);
        return worker;
    }

    /**
     * Add animation frame with automatic cleanup tracking
     */
    addAnimationFrame(callback) {
        const id = requestAnimationFrame(callback);
        this.animationFrames.add(id);
        return id;
    }

    /**
     * Register a cache with size limits
     */
    registerCache(name, cache, maxSize = 50) {
        this.caches.set(name, { cache, maxSize });
        return cache;
    }

    /**
     * Clear specific interval
     */
    clearInterval(id) {
        if (this.intervals.has(id)) {
            clearInterval(id);
            this.intervals.delete(id);
        }
    }

    /**
     * Clear specific timeout
     */
    clearTimeout(id) {
        if (this.timeouts.has(id)) {
            clearTimeout(id);
            this.timeouts.delete(id);
        }
    }

    /**
     * Remove specific event listener
     */
    removeListener(element, event, handler, options = {}) {
        element.removeEventListener(event, handler, options);

        if (this.listeners.has(element)) {
            const listeners = this.listeners.get(element);
            const index = listeners.findIndex(l =>
                l.event === event && l.handler === handler
            );
            if (index !== -1) {
                listeners.splice(index, 1);
            }
            if (listeners.length === 0) {
                this.listeners.delete(element);
            }
        }
    }

    /**
     * Terminate specific worker
     */
    terminateWorker(worker) {
        if (this.workers.has(worker)) {
            worker.terminate();
            this.workers.delete(worker);
        }
    }

    /**
     * Cancel specific animation frame
     */
    cancelAnimationFrame(id) {
        if (this.animationFrames.has(id)) {
            cancelAnimationFrame(id);
            this.animationFrames.delete(id);
        }
    }

    /**
     * Clean up background resources when page is hidden
     */
    cleanupBackgroundResources() {
        // Clear timeouts and intervals that aren't critical
        this.timeouts.forEach(id => {
            clearTimeout(id);
        });
        this.timeouts.clear();

        // Keep intervals running but clear animation frames
        this.animationFrames.forEach(id => {
            cancelAnimationFrame(id);
        });
        this.animationFrames.clear();
    }

    /**
     * Clean up all resources
     */
    cleanup() {
        console.log('🧹 ResourceManager: Cleaning up all resources...');

        // Clear all intervals
        this.intervals.forEach(id => {
            clearInterval(id);
        });
        this.intervals.clear();

        // Clear all timeouts
        this.timeouts.forEach(id => {
            clearTimeout(id);
        });
        this.timeouts.clear();

        // Remove all event listeners
        this.listeners.forEach((listeners, element) => {
            listeners.forEach(({ event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        this.listeners.clear();

        // Terminate all workers
        this.workers.forEach(worker => {
            worker.terminate();
        });
        this.workers.clear();

        // Cancel all animation frames
        this.animationFrames.forEach(id => {
            cancelAnimationFrame(id);
        });
        this.animationFrames.clear();

        // Clear all caches
        this.caches.forEach(({ cache }) => {
            if (cache.clear) {
                cache.clear();
            } else if (cache.size !== undefined) {
                // For Maps and Sets
                cache.clear();
            }
        });

        console.log('✅ ResourceManager: All resources cleaned up');
    }

    /**
     * Get resource statistics
     */
    getStats() {
        return {
            intervals: this.intervals.size,
            timeouts: this.timeouts.size,
            listeners: Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
            workers: this.workers.size,
            animationFrames: this.animationFrames.size,
            caches: this.caches.size
        };
    }

    /**
     * Log current resource usage
     */
    logStats() {
        const stats = this.getStats();
        console.log('📊 ResourceManager Stats:', stats);
        return stats;
    }
}

// Global instance
export const resourceManager = new ResourceManager();

// Make it available globally for easy access
window.resourceManager = resourceManager;

export default resourceManager;
