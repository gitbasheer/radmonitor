/**
 * Simple EventEmitter for state management
 */

export class EventEmitter {
    constructor() {
        this.events = {};
    }

    /**
     * Subscribe to an event
     */
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return () => this.off(event, listener);
    }

    /**
     * Unsubscribe from an event
     */
    off(event, listener) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    /**
     * Emit an event
     */
    emit(event, ...args) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => {
            try {
                listener(...args);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }

    /**
     * Remove all listeners
     */
    removeAllListeners() {
        this.events = {};
    }
}
