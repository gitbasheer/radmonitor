/**
 * FastAPI Integration Module
 * Central control point for all FastAPI features
 */

export const FastAPIIntegration = {
    // Main feature flag - can be toggled via localStorage or config
    enabled: false,

    // Central configuration
    config: {
        apiUrl: window.FASTAPI_URL || 'http://localhost:8000',
        wsUrl: window.FASTAPI_WS_URL || 'ws://localhost:8000/ws',
        reconnectInterval: 5000,
        maxReconnectAttempts: 5,
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
        eventListeners: new Map()
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
            console.log('❌ FastAPI explicitly disabled');
            return false;
        }

        // Check if explicitly enabled
        const forceEnabled = localStorage.getItem('fastapi.enabled') === 'true';
        if (forceEnabled) {
            this.enabled = true;
            console.log('✅ FastAPI explicitly enabled');
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
        // Dynamically import FastAPI modules only when needed
        const { FastAPIClient } = await import('./api-client-fastapi.js');
        const { FastAPIAdapter } = await import('./adapters/fastapi-adapter.js');

        // Initialize the FastAPI client
        this.client = new FastAPIClient(this.config);

        // Set up adapters
        this.adapters = {
            fetchData: (config) => this.client.fetchData(config),
            updateConfig: (config) => this.client.updateConfiguration(config),
            getAuthDetails: () => this.client.getAuthenticationDetails()
        };

        // Set up WebSocket if enabled
        if (this.config.features.websocket) {
            await this.setupWebSocket();
        }
    },

    /**
     * Set up WebSocket connection with proper error handling
     */
    async setupWebSocket() {
        const { RealtimeBridge } = await import('./bridges/realtime-bridge.js');
        this.realtimeBridge = new RealtimeBridge(this.client);

        // Connect WebSocket with retry logic
        const connectWithRetry = async () => {
            try {
                await this.client.connect();
                this.state.websocketConnected = true;
                this.state.reconnectAttempts = 0;
                console.log('📡 WebSocket connected');
            } catch (error) {
                console.warn('WebSocket connection failed:', error);
                this.state.websocketConnected = false;

                // Retry logic
                if (this.state.reconnectAttempts < this.config.maxReconnectAttempts) {
                    this.state.reconnectAttempts++;
                    console.log(`🔄 Retrying WebSocket connection (${this.state.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
                    setTimeout(connectWithRetry, this.config.reconnectInterval);
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
