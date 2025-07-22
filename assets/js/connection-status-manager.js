/**
 * Connection Status Manager
 * Centralizes all connection and status reporting in the application
 */

import { appStore } from './stores/app-store.js';
import DOMPurify from './lib/dompurify.js';

export class ConnectionStatusManager {
    constructor() {
        this.statuses = {
            api: { connected: false, message: 'Initializing...' },
            auth: { authenticated: false, message: 'Checking...' },
            data: { loaded: false, message: 'Loading...' },
            formulaBuilder: { initialized: false, message: 'Loading...' },
            websocket: { connected: false, message: 'Not required' }
        };

        this.elements = {
            mainStatus: null,
            statusDot: null,
            statusText: null,
            refreshStatus: null,
            formulaStatus: null,
            apiStatus: null,
            quickBaseline: null,
            loadingOverlay: null,
            loadingItems: {}
        };

        this.requiredSystems = ['api', 'auth', 'data'];
        this.isFullyLoaded = false;

        this.initializeElements();
        this.setupEventListeners();
        this.showLoadingState();
    }

    initializeElements() {
        // Main connection status
        this.elements.mainStatus = document.getElementById('connectionStatus');
        this.elements.statusDot = document.querySelector('.status-dot');
        this.elements.statusText = document.querySelector('.status-text');

        // Other status elements
        this.elements.refreshStatus = document.getElementById('refreshStatus');
        this.elements.formulaStatus = document.getElementById('formulaStatus');
        this.elements.apiStatus = document.getElementById('apiStatus');
        this.elements.quickBaseline = document.getElementById('quickBaseline');

        // Loading overlay elements
        this.elements.loadingOverlay = document.getElementById('loadingOverlay');
        this.elements.loadingItems = {
            api: document.getElementById('loadingAPI'),
            auth: document.getElementById('loadingAuth'),
            data: document.getElementById('loadingData'),
            formula: document.getElementById('loadingFormula')
        };
        this.elements.loadingMessage = document.getElementById('loadingMessage');
    }

    setupEventListeners() {
        // Store event handlers for cleanup
        this.eventHandlers = {
            'api:connected': (e) => this.updateAPIStatus(true, e.detail?.message),
            'api:disconnected': (e) => this.updateAPIStatus(false, e.detail?.message),
            'auth:success': (e) => this.updateAuthStatus(true, e.detail?.message),
            'auth:failed': (e) => this.updateAuthStatus(false, e.detail?.message),
            'data:loaded': (e) => this.updateDataStatus(true, e.detail?.message),
            'data:error': (e) => this.updateDataStatus(false, e.detail?.message),
            'websocket:connected': () => this.updateWebSocketStatus(true),
            'websocket:disconnected': () => this.updateWebSocketStatus(false),
            'formula:initialized': () => this.updateFormulaStatus(true),
            'formula:error': (e) => this.updateFormulaStatus(false, e.detail?.message)
        };

        // Add event listeners
        Object.entries(this.eventHandlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler);
        });
    }

    /**
     * Update overall connection status based on all subsystems
     */
    updateOverallStatus() {
        try {
            const allConnected = this.statuses.api.connected &&
                               (this.statuses.websocket.connected || !this.isWebSocketRequired());

            const color = allConnected ? '#4CAF50' :
                         this.statuses.api.connected ? '#FF9800' : '#f44336';

            const message = allConnected ? 'Connected' :
                           this.statuses.api.connected ? 'Partial Connection' :
                           'Disconnected';

            if (this.elements.statusDot) {
                this.elements.statusDot.style.backgroundColor = color;
            }

            if (this.elements.statusText) {
                this.elements.statusText.textContent = message;
            }

            // Update main status container
            if (this.elements.mainStatus) {
                this.elements.mainStatus.className = allConnected ? 'status-connected' :
                                                    this.statuses.api.connected ? 'status-partial' :
                                                    'status-disconnected';
            }
        } catch (error) {
            console.error('Error updating overall status:', error);
            console.error('Statuses:', this.statuses);
        }
    }

    /**
     * Update API connection status
     */
    updateAPIStatus(connected, message) {
        try {
            this.statuses.api.connected = connected;
            this.statuses.api.message = message || (connected ? 'API Connected' : 'API Disconnected');

            if (this.elements.apiStatus) {
                this.elements.apiStatus.textContent = this.statuses.api.message;
                this.elements.apiStatus.className = connected ? 'status-success' : 'status-error';
            }

            this.updateLoadingItem('api', connected, this.statuses.api.message);
            this.updateOverallStatus();
            this.checkAllSystemsReady();
        } catch (error) {
            console.error('Error updating API status:', error);
            console.error('Stack trace:', error.stack);
        }
    }

    /**
     * Update authentication status
     */
    updateAuthStatus(authenticated, message) {
        this.statuses.auth.authenticated = authenticated;
        this.statuses.auth.message = message || (authenticated ? 'Authenticated' : 'Not authenticated');

        this.updateLoadingItem('auth', authenticated, this.statuses.auth.message);
        
        // Sync with app store to ensure single source of truth
        const currentState = appStore.getState();
        if (currentState.auth.isAuthenticated !== authenticated) {
            console.log('🔄 Syncing auth status with app store:', authenticated);
            // Don't trigger auth prompt here - let the app store handle it during init
        }
        
        this.checkAllSystemsReady();
    }

    /**
     * Update data loading status
     */
    updateDataStatus(loaded, message) {
        this.statuses.data.loaded = loaded;
        this.statuses.data.message = message || (loaded ? 'Configuration loaded' : 'Loading configuration...');

        if (this.elements.dataStatus) {
            this.elements.dataStatus.textContent = this.statuses.data.message;
            this.elements.dataStatus.className = loaded ? 'status-success' : 'status-value';
        }

        this.updateLoadingItem('data', loaded, this.statuses.data.message);
        this.checkAllSystemsReady();
    }

    /**
     * Update WebSocket connection status
     */
    updateWebSocketStatus(connected, message) {
        this.statuses.websocket.connected = connected;
        this.statuses.websocket.message = message || (connected ? 'WebSocket Connected' : 'WebSocket Disconnected');
        this.updateOverallStatus();
    }

    /**
     * Update Formula Builder status
     */
    updateFormulaStatus(initialized, message) {
        this.statuses.formulaBuilder.initialized = initialized;
        this.statuses.formulaBuilder.message = message ||
            (initialized ? 'Formula builder ready' : 'Formula builder not initialized');

        if (this.elements.formulaStatus) {
            this.elements.formulaStatus.textContent = this.statuses.formulaBuilder.message;
            this.elements.formulaStatus.style.color = initialized ? '#4CAF50' : '#f44336';
        }

        this.updateLoadingItem('formula', initialized, this.statuses.formulaBuilder.message);
    }

    /**
     * Update refresh status
     */
    updateRefreshStatus(status, isError = false) {
        if (this.elements.refreshStatus) {
            this.elements.refreshStatus.textContent = status;
            this.elements.refreshStatus.className = `refresh-status ${isError ? 'error' : ''}`;
        }
    }

    /**
     * Update baseline status
     */
    updateBaselineStatus(baseline) {
        if (this.elements.quickBaseline) {
            this.elements.quickBaseline.textContent = baseline || 'Not set';
        }
    }

    /**
     * Show detailed connection status in a tooltip or modal
     */
    showDetailedStatus() {
        const details = {
            'API Connection': this.statuses.api,
            'WebSocket': this.statuses.websocket,
            'Elasticsearch': this.statuses.elasticsearch,
            'Formula Builder': this.statuses.formulaBuilder
        };

        let message = 'Connection Status Details:\n\n';
        for (const [service, status] of Object.entries(details)) {
            const icon = (status.connected || status.initialized) ? '✅' : '(✗)';
            message += `${icon} ${service}: ${status.message}\n`;
        }

        console.log(message);
        return details;
    }

    /**
     * Check if WebSocket is required (only in local development)
     */
    isWebSocketRequired() {
        return window.location.hostname === 'localhost' ||
               window.location.hostname === '127.0.0.1';
    }

    /**
     * Show loading state
     */
    showLoadingState() {
        document.body.classList.add('loading');
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('hidden');
        }

        // Hide main app content
        const mainContent = document.getElementById('mainAppContent');
        if (mainContent) {
            mainContent.classList.remove('authenticated');
            mainContent.style.display = 'none';
        }
    }

    /**
     * Hide loading state
     */
    hideLoadingState() {
        document.body.classList.remove('loading');
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
        this.isFullyLoaded = true;

        // Show main app content
        const mainContent = document.getElementById('mainAppContent');
        if (mainContent) {
            mainContent.style.display = 'block';
            // Trigger reflow before adding class for smooth transition
            mainContent.offsetHeight;
            mainContent.classList.add('authenticated');
        }

        // Enable all action buttons
        const actionButtons = document.querySelectorAll('.action-button');
        actionButtons.forEach(button => {
            button.disabled = false;
        });

        // Update main status
        this.updateLoadingMessage('All systems ready', false);
    }

    /**
     * Update loading item status
     */
    updateLoadingItem(system, success, message) {
        const item = this.elements.loadingItems[system];
        if (item) {
            const icon = item.querySelector('.loading-icon');
            const text = item.querySelector('.loading-text');

            if (success) {
                item.classList.add('success');
                icon.textContent = '✅';
            } else {
                item.classList.add('error');
                icon.textContent = '(✗)';
            }

            if (text && message) {
                text.textContent = message;
            }
        }
    }

    /**
     * Check if all required systems are ready
     */
    checkAllSystemsReady() {
        const allReady = this.requiredSystems.every(system => {
            switch(system) {
                case 'api':
                    return this.statuses.api.connected;
                case 'auth':
                    return this.statuses.auth.authenticated;
                case 'data':
                    return this.statuses.data.loaded;
                default:
                    return true;
            }
        });

        // Only hide loading if authenticated
        if (allReady && !this.isFullyLoaded) {
            setTimeout(() => this.hideLoadingState(), 500);
        }
        // Let the app store handle auth prompts - don't show our own

        return allReady;
    }


    /**
     * Update loading message
     */
    updateLoadingMessage(message, isError = false) {
        if (this.elements.loadingMessage) {
            this.elements.loadingMessage.textContent = message;
            this.elements.loadingMessage.classList.toggle('error', isError);
        }
    }

    /**
     * Test all connections
     */
    async testAllConnections() {
        this.updateRefreshStatus('Testing connections...', false);

        try {
            // Test API connection
            if (window.unifiedAPI) {
                const health = await window.unifiedAPI.checkHealth();
                this.updateAPIStatus(health.healthy, health.message);
            }

            // Update refresh status
            this.updateRefreshStatus('Connection test complete', false);

            return this.statuses;
        } catch (error) {
            this.updateRefreshStatus('Connection test failed', true);
            console.error('Connection test error:', error);
            return this.statuses;
        }
    }

    /**
     * Clean up all event listeners and resources
     */
    cleanup() {
        console.log('🧹 ConnectionStatusManager: Cleaning up event listeners...');

        // Remove all event listeners
        if (this.eventHandlers) {
            Object.entries(this.eventHandlers).forEach(([event, handler]) => {
                window.removeEventListener(event, handler);
            });
            this.eventHandlers = {};
        }

        // Clear DOM references
        this.elements = {};

        console.log('✅ ConnectionStatusManager: All event listeners cleaned up');
    }
}

// Create singleton instance
export const connectionManager = new ConnectionStatusManager();

// Make it available globally for backward compatibility
window.ConnectionStatusManager = connectionManager;
