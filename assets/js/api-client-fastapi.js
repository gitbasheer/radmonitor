/**
 * FastAPI Client Module
 * Handles communication with the FastAPI development server
 */

// ESM: Converted from IIFE to ES module export
export const FastAPIClient = (() => {
    'use strict';

    const API_BASE_URL = 'http://localhost:8000';
    const WS_URL = 'ws://localhost:8000/ws';

    let websocket = null;
    let reconnectInterval = null;
    let messageHandlers = new Map();
    let connectionState = 'disconnected';

    /**
     * WebSocket connection management
     */
    const WebSocketManager = {
        connect() {
            if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
                // Don't log for already connected/connecting to reduce console noise
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                try {
                    websocket = new WebSocket(WS_URL);

                    websocket.addEventListener('open', () => {
                        console.log('WebSocket connected');
                        connectionState = 'connected';
                        clearInterval(reconnectInterval);

                        // Send initial ping
                        this.send({ type: 'ping' });

                        resolve();
                    });

                    websocket.addEventListener('message', (event) => {
                        try {
                            const message = JSON.parse(event.data);
                            this.handleMessage(message);
                        } catch (error) {
                            console.error('Error parsing WebSocket message:', error);
                        }
                    });

                    websocket.addEventListener('error', (error) => {
                        console.error('WebSocket error:', error);
                        connectionState = 'error';
                        reject(error);
                    });

                    websocket.addEventListener('close', () => {
                        console.log('WebSocket disconnected');
                        connectionState = 'disconnected';
                        this.scheduleReconnect();
                    });
                } catch (error) {
                    reject(error);
                }
            });
        },

        disconnect() {
            if (websocket) {
                websocket.close();
                websocket = null;
            }
            clearInterval(reconnectInterval);
            connectionState = 'disconnected';
        },

        send(message) {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                // Ensure we send a string - handle both string and object inputs
                const messageStr = typeof message === 'string'
                    ? message
                    : JSON.stringify(message);
                websocket.send(messageStr);
                return true;
            } else {
                console.warn('WebSocket not connected');
                return false;
            }
        },

        handleMessage(message) {
            // Handle specific message types
            switch (message.type) {
                case 'config':
                    this.notifyHandlers('config', message.data);
                    break;
                case 'stats':
                    this.notifyHandlers('stats', message.data);
                    break;
                case 'data':
                    this.notifyHandlers('data', message.data);
                    break;
                case 'error':
                    // Classify different types of server messages
                    const level = message.data?.level || 'error';
                    const errorMessage = message.data?.message || 'Unknown error';
                    
                    if (level === 'warning' || errorMessage.includes('Query execution slow')) {
                        // Performance warnings - not actual errors
                        const duration = errorMessage.match(/(\d+)ms/)?.[1];
                        console.warn(`⚠️ Slow query: ${duration ? `${(duration/1000).toFixed(1)}s` : errorMessage}`);
                        
                        // Update UI with helpful warning
                        const refreshStatus = document.getElementById('refreshStatus');
                        if (refreshStatus) {
                            refreshStatus.textContent = `Query took ${duration ? `${(duration/1000).toFixed(1)}s` : 'long'} - data loaded`;
                            refreshStatus.style.color = '#ff9800';
                            setTimeout(() => {
                                refreshStatus.textContent = 'Ready';
                                refreshStatus.style.color = '';
                            }, 5000);
                        }
                        this.notifyHandlers('performance_warning', message.data);
                    } else {
                        // Actual errors
                        console.error('Server error:', message.data);
                        
                        // Update UI with specific error message
                        const refreshStatus = document.getElementById('refreshStatus');
                        if (refreshStatus) {
                            if (errorMessage.includes('authentication') || errorMessage.includes('cookie')) {
                                refreshStatus.innerHTML = 'Authentication expired | <a href="#" onclick="Dashboard.setCookieForRealtime(); return false;" style="color: #d32f2f;">Update Cookie</a>';
                            } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
                                refreshStatus.innerHTML = 'Connection lost | <a href="#" onclick="location.reload(); return false;" style="color: #d32f2f;">Reload Page</a>';
                            } else {
                                refreshStatus.innerHTML = `Error: ${errorMessage} | <a href="#" onclick="Dashboard.showApiSetupInstructions(); return false;" style="color: #d32f2f;">Help</a>`;
                            }
                            refreshStatus.style.color = '#d32f2f';
                        }
                        this.notifyHandlers('error', message.data);
                    }
                    break;
                case 'performance_metrics':
                    // Silently handle performance metrics
                    this.notifyHandlers('performance_metrics', message.data);
                    // Performance stats disabled - use Dashboard.showPerformanceStats() manually
                    break;
                case 'pong':
                    // Heartbeat response
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        },

        notifyHandlers(type, data) {
            const handlers = messageHandlers.get(type) || [];
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in ${type} handler:`, error);
                }
            });
        },

        scheduleReconnect() {
            if (!reconnectInterval) {
                reconnectInterval = setInterval(() => {
                    console.log('Attempting to reconnect WebSocket...');
                    this.connect().catch(error => {
                        console.error('Reconnection failed:', error);
                    });
                }, 5000); // Retry every 5 seconds
            }
        },

        ping() {
            this.send({ type: 'ping' });
        }
    };

    /**
     * REST API methods
     */
    const API = {
        async getConfig() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/config`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Error fetching config:', error);
                throw error;
            }
        },

        async updateConfig(config) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/config`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(config)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Error updating config:', error);
                throw error;
            }
        },

        async getStats() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/stats`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Error fetching stats:', error);
                throw error;
            }
        },

        async refreshDashboard(config, forceRefresh = false) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        config: config,
                        force_refresh: forceRefresh
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Error refreshing dashboard:', error);
                throw error;
            }
        },

        async checkHealth() {
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return await response.json();
            } catch (error) {
                console.error('Error checking health:', error);
                throw error;
            }
        },

        async fetchKibanaData(query, forceRefresh = false, elasticCookie = null) {
            try {
                // Get cookie from parameter or try to find it
                const cookie = elasticCookie || this.getElasticCookie();

                if (!cookie) {
                    throw new Error('Elastic cookie not found. Please authenticate first.');
                }

                // Extract meaningful query details for logging
                const timeRange = extractTimeRange(query);
                const filters = extractFilters(query);
                const aggregations = query.aggs ? Object.keys(query.aggs) : [];
                
                console.log(
                    `%c🔍 Kibana Query → %c${timeRange.description} %c| %cFilters: ${filters.count} %c| %cAggs: ${aggregations.join(', ')}`,
                    'color: #2196F3; font-weight: bold;',
                    'color: #4CAF50;',
                    'color: #666;',
                    'color: #FF9800;',
                    'color: #666;',
                    'color: #9C27B0;'
                );
                
                if (filters.details.length > 0) {
                    console.log(`%c  └─ Query details: ${filters.details.join(' | ')}`, 'color: #666; font-size: 0.9em;');
                }

                const startTime = Date.now();
                
                const response = await fetch(`${API_BASE_URL}/api/fetch-kibana-data`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Elastic-Cookie': cookie
                    },
                    body: JSON.stringify({
                        query: query,
                        force_refresh: forceRefresh
                    })
                });

                const duration = Date.now() - startTime;

                if (!response.ok) {
                    const errorData = await response.json();
                    console.log(`%c❌ Kibana Query Failed → %c${duration}ms %c| ${errorData.detail || `HTTP ${response.status}`}`, 
                        'color: #f44336; font-weight: bold;', 'color: #666;', 'color: #f44336;');
                    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                const hitCount = result.hits?.total?.value || 0;
                const aggCount = result.aggregations ? Object.keys(result.aggregations).length : 0;
                
                console.log(
                    `%c✅ Kibana Response → %c${duration}ms %c| %cHits: ${hitCount.toLocaleString()} %c| %cAggs: ${aggCount}`,
                    'color: #4CAF50; font-weight: bold;',
                    'color: #666;',
                    'color: #666;',
                    'color: #2196F3;',
                    'color: #666;',
                    'color: #9C27B0;'
                );

                return result;
            } catch (error) {
                console.error('Error fetching Kibana data:', error);
                throw error;
            }
        }
    };

    /**
     * Helper functions for query analysis
     */
    function extractTimeRange(query) {
        const filters = query.query?.bool?.filter || [];
        for (const filter of filters) {
            if (filter.range && filter.range['@timestamp']) {
                const range = filter.range['@timestamp'];
                return {
                    description: `${range.gte || 'earliest'} to ${range.lte || range.lt || 'now'}`,
                    start: range.gte,
                    end: range.lte || range.lt
                };
            }
        }
        return { description: 'No time range specified', start: null, end: null };
    }

    function extractFilters(query) {
        const filters = query.query?.bool?.filter || [];
        const details = [];
        let count = 0;
        
        filters.forEach(filter => {
            if (filter.range) {
                const field = Object.keys(filter.range)[0];
                if (field !== '@timestamp') {
                    details.push(`${field} range filter`);
                    count++;
                }
            } else if (filter.term) {
                const field = Object.keys(filter.term)[0];
                const value = filter.term[field];
                details.push(`${field}="${value}"`);
                count++;
            } else if (filter.wildcard) {
                const field = Object.keys(filter.wildcard)[0];
                const pattern = filter.wildcard[field].value || filter.wildcard[field];
                details.push(`${field} like "${pattern}"`);
                count++;
            } else if (filter.terms) {
                const field = Object.keys(filter.terms)[0];
                details.push(`${field} in [${filter.terms[field].length} values]`);
                count++;
            }
        });
        
        return { count, details };
    }

    /**
     * Additional API methods
     */
    const AdditionalAPI = {
        getElasticCookie() {
            // Try to get cookie from various sources
            // 1. Check localStorage (if stored)
            const storedCookie = localStorage.getItem('elastic_cookie');
            if (storedCookie) return storedCookie;

            // 2. Check document.cookie (if available)
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'sid') return value;
            }

            // 3. Check window.ELASTIC_COOKIE (if set globally)
            if (window.ELASTIC_COOKIE) return window.ELASTIC_COOKIE;

            return null;
        }
    };

    /**
     * Event handling
     */
    function on(event, handler) {
        if (!messageHandlers.has(event)) {
            messageHandlers.set(event, []);
        }
        messageHandlers.get(event).push(handler);
    }

    function off(event, handler) {
        if (messageHandlers.has(event)) {
            const handlers = messageHandlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    /**
     * Initialize client
     */
    async function initialize() {
        try {
            // Check server health
            const health = await API.checkHealth();
            console.log('Server health:', health);

            // Connect WebSocket
            await WebSocketManager.connect();

            // Start heartbeat
            setInterval(() => {
                if (connectionState === 'connected') {
                    WebSocketManager.ping();
                }
            }, 30000); // Ping every 30 seconds

            return true;
        } catch (error) {
            console.error('Failed to initialize FastAPI client:', error);
            return false;
        }
    }

    /**
     * Configuration helper methods
     */
    const ConfigHelpers = {
        validateConfig(config) {
            const errors = [];

            // Validate date format
            const datePattern = /^\d{4}-\d{2}-\d{2}$/;
            if (!datePattern.test(config.baseline_start)) {
                errors.push('Invalid baseline_start date format (expected YYYY-MM-DD)');
            }
            if (!datePattern.test(config.baseline_end)) {
                errors.push('Invalid baseline_end date format (expected YYYY-MM-DD)');
            }

            // Validate date range
            if (config.baseline_start >= config.baseline_end) {
                errors.push('baseline_end must be after baseline_start');
            }

            // Validate thresholds
            if (config.critical_threshold >= 0) {
                errors.push('critical_threshold must be negative');
            }
            if (config.warning_threshold >= 0) {
                errors.push('warning_threshold must be negative');
            }
            if (config.warning_threshold <= config.critical_threshold) {
                errors.push('warning_threshold must be greater than critical_threshold');
            }

            // Validate volume thresholds
            if (config.high_volume_threshold < 1) {
                errors.push('high_volume_threshold must be at least 1');
            }
            if (config.medium_volume_threshold < 1) {
                errors.push('medium_volume_threshold must be at least 1');
            }

            return errors;
        },

        buildConfig(overrides = {}) {
            const defaults = {
                baseline_start: '2025-06-01',
                baseline_end: '2025-06-09',
                time_range: 'now-12h',
                critical_threshold: -80,
                warning_threshold: -50,
                high_volume_threshold: 1000,
                medium_volume_threshold: 100
            };

            return { ...defaults, ...overrides };
        }
    };

    // Public API
    return {
        // WebSocket methods
        connect: () => WebSocketManager.connect(),
        disconnect: () => WebSocketManager.disconnect(),
        on,
        off,
        getConnectionState: () => connectionState,

        // REST API methods
        getConfig: API.getConfig,
        updateConfig: API.updateConfig,
        getStats: API.getStats,
        refreshDashboard: API.refreshDashboard,
        checkHealth: API.checkHealth,
        fetchKibanaData: API.fetchKibanaData,
        getElasticCookie: AdditionalAPI.getElasticCookie,

        // Helpers
        validateConfig: ConfigHelpers.validateConfig,
        buildConfig: ConfigHelpers.buildConfig,

        // Initialize
        initialize
    };
})();

// ESM: Export as default for convenience
export default FastAPIClient;
