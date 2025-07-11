/**
 * FastAPI Integration Module
 * Central control point for all FastAPI features
 */

import { getApiUrl } from './config-service.js';

/**
 * Exponential Backoff with Jitter for reconnection
 */
class ExponentialBackoffReconnect {
    constructor(baseDelay = 1000, maxDelay = 30000, factor = 1.5) {
        this.baseDelay = baseDelay;
        this.maxDelay = maxDelay;
        this.factor = factor;
        this.attempt = 0;
    }

    nextDelay() {
        const exponentialDelay = Math.min(
            this.baseDelay * Math.pow(this.factor, this.attempt++),
            this.maxDelay
        );
        // Add jitter (±20%) to prevent thundering herd
        const jitter = exponentialDelay * 0.2 * Math.random();
        return Math.round(exponentialDelay + jitter);
    }

    reset() {
        this.attempt = 0;
    }
}

export const FastAPIIntegration = {
    // Main feature flag - can be toggled via localStorage or config
    enabled: false,

    // Central configuration
    config: {
        apiUrl: getApiUrl(),
        wsUrl: (() => {
            const apiUrl = getApiUrl();
            const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
            const wsHost = apiUrl.replace(/^https?:\/\//, '');
            return `${wsProtocol}://${wsHost}/ws`;
        })(),
        reconnectInterval: 5000, // Deprecated - using exponential backoff
        maxReconnectAttempts: 10, // Increased for exponential backoff
        enableRealtime: true,
        // Feature flags for specific FastAPI features
        features: {
            websocket: true,
            performanceMetrics: true,
            serverSideValidation: true,
            batchOperations: true
        }
    },

    // Current state
    state: {
        serverAvailable: false,
        websocketConnected: false,
        lastHealthCheck: null,
        reconnectAttempts: 0,
        eventListeners: new Map(),
        reconnectBackoff: null // Exponential backoff instance
    },

    /**
     * Initialize the integration
     * Checks server availability and sets up adapters
     */
    async initialize() {
        console.log('🔍 Checking FastAPI integration...');

        // Check if explicitly disabled
        const forceDisabled = localStorage.getItem('fastapi.disabled') === 'true';
        if (forceDisabled) {
            console.log('(✗) FastAPI explicitly disabled');
            return false;
        }

        // Check if explicitly enabled
        const forceEnabled = localStorage.getItem('fastapi.enabled') === 'true';
        if (forceEnabled) {
            this.enabled = true;
            console.log('(✓)FastAPI explicitly enabled');
            await this.setupAdapters();
            return true;
        }

        // Auto-detect based on server availability
        this.enabled = await this.checkAvailability();

        if (this.enabled) {
            console.log('🚀 FastAPI server detected and enabled');
            await this.setupAdapters();
        } else {
            console.log('📦 Using legacy mode (FastAPI not available)');
        }

        return this.enabled;
    },

    /**
     * Check if FastAPI server is available
     */
    async checkAvailability() {
        try {
            const response = await fetch(`${this.config.apiUrl}/health`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000) // 2 second timeout
            });

            if (response.ok) {
                const data = await response.json();
                this.state.serverAvailable = true;
                this.state.lastHealthCheck = new Date();
                this.state.reconnectAttempts = 0; // Reset on success
                return data.status === 'healthy';
            }
        } catch (error) {
            console.debug('FastAPI server not available:', error.message);
        }

        this.state.serverAvailable = false;
        return false;
    },

    /**
     * Set up adapters for API calls
     */
    async setupAdapters() {
        // Use the unified API client which already has WebSocket support
        const { default: apiClient } = await import('./api-client-unified.js');

        // Use the unified client
        this.client = apiClient;

        // Initialize the client
        await this.client.initialize();

        // Set up WebSocket if enabled
        if (this.config.features.websocket) {
            await this.setupWebSocket();
        }
    },

    /**
     * Set up WebSocket connection with proper error handling
     */
    async setupWebSocket() {
        // Initialize exponential backoff
        this.state.reconnectBackoff = new ExponentialBackoffReconnect();

        // Set up WebSocket event handlers to bridge to UI
        this.client.on('config', (data) => {
            // Emit event for UI updater
            window.dispatchEvent(new CustomEvent('fastapi:config', { detail: data }));
        });

        this.client.on('stats', (data) => {
            // Emit event for UI updater
            window.dispatchEvent(new CustomEvent('fastapi:stats', { detail: data }));
        });

        this.client.on('data', (data) => {
            // Emit event for UI updater
            window.dispatchEvent(new CustomEvent('fastapi:data', { detail: data }));
        });

        // Connect WebSocket with exponential backoff retry
        const connectWithRetry = async () => {
            try {
                await this.client.connect();
                this.state.websocketConnected = true;
                this.state.reconnectAttempts = 0;
                this.state.reconnectBackoff.reset(); // Reset backoff on success
                console.log('📡 WebSocket connected');
            } catch (error) {
                console.warn('WebSocket connection failed:', error);
                this.state.websocketConnected = false;

                // Retry logic with exponential backoff
                if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
                    this.state.reconnectAttempts++;
                    const delay = this.state.reconnectBackoff.nextDelay();
                    console.log(`🔄 Retrying WebSocket connection (${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts}) in ${delay}ms...`);
                    setTimeout(connectWithRetry, delay);
                } else {
                    console.error('(✗) WebSocket reconnection failed after maximum attempts');
                }
            }
        };

        await connectWithRetry();
    },

    /**
     * Enable FastAPI mode with optional soft reload
     */
    enable(softReload = false) {
        localStorage.setItem('fastapi.enabled', 'true');
        localStorage.removeItem('fastapi.disabled');
        this.enabled = true;

        if (!softReload) {
            window.location.reload();
        } else {
            // Emit custom event for components to reinitialize
            window.dispatchEvent(new CustomEvent('fastapi:enabled'));
        }
    },

    /**
     * Disable FastAPI mode with cleanup
     */
    disable(softReload = false) {
        localStorage.setItem('fastapi.disabled', 'true');
        localStorage.removeItem('fastapi.enabled');
        this.enabled = false;

        // Clean up resources
        this.cleanup();

        if (!softReload) {
            window.location.reload();
        } else {
            // Emit custom event for components to reinitialize
            window.dispatchEvent(new CustomEvent('fastapi:disabled'));
        }
    },

    /**
     * Clean up resources
     */
    cleanup() {
        // Disconnect WebSocket if connected
        if (this.client && this.state.websocketConnected) {
            this.client.disconnect();
        }

        // Clear event listeners
        this.state.eventListeners.forEach((listener, event) => {
            window.removeEventListener(event, listener);
        });
        this.state.eventListeners.clear();

        // Reset state
        this.state.websocketConnected = false;
        this.state.reconnectAttempts = 0;
    },

    /**
     * Get current status
     */
    getStatus() {
        return {
            mode: this.enabled ? 'fastapi' : 'legacy',
            enabled: this.enabled,
            serverAvailable: this.state.serverAvailable,
            websocketConnected: this.state.websocketConnected,
            lastHealthCheck: this.state.lastHealthCheck,
            config: this.config
        };
    },

    /**
     * Toggle between modes with option for soft reload
     */
    toggle(softReload = false) {
        if (this.enabled) {
            this.disable(softReload);
        } else {
            this.enable(softReload);
        }
    }
};

// Export for use in console/debugging
window.FastAPIIntegration = FastAPIIntegration;
