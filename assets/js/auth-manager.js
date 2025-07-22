/**
 * Simplified Authentication Manager
 * Single source of truth for sid cookie management
 * @module auth-manager
 */

import { getApiUrl } from './config-service.js';

/**
 * AuthManager - Handles all authentication operations
 * Manages sid cookie storage, validation, and headers
 */
export class AuthManager {
    constructor() {
        this.STORAGE_KEY = 'sid_cookie';
        this.cookieLifespan = 24 * 60 * 60 * 1000; // 24 hours
        this._initialized = false;
    }

    /**
     * Initialize the auth manager
     */
    init() {
        if (this._initialized) return;
        
        // Clean up any legacy auth data
        this._migrateLegacyAuth();
        this._initialized = true;
    }

    /**
     * Get the sid cookie from localStorage
     * @returns {string|null} The sid cookie or null if not found/expired
     */
    getCookie() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) return null;
        
        try {
            const data = JSON.parse(stored);
            
            // Check expiration
            if (new Date(data.expires) < new Date()) {
                this.clearCookie();
                return null;
            }
            
            return data.cookie;
        } catch (error) {
            console.error('Error parsing stored cookie:', error);
            this.clearCookie();
            return null;
        }
    }

    /**
     * Set the sid cookie
     * @param {string} cookieValue - The cookie value (with or without 'sid=' prefix)
     * @returns {string} The normalized cookie
     */
    setCookie(cookieValue) {
        if (!cookieValue || typeof cookieValue !== 'string') {
            throw new Error('Cookie value must be a non-empty string');
        }

        // Extract sid value from various formats
        let sidValue = cookieValue.trim();
        
        // Handle different input formats
        if (sidValue.includes('sid=')) {
            const match = sidValue.match(/sid=([^;]+)/);
            sidValue = match ? match[1] : sidValue;
        }
        
        // Normalize: ensure it starts with 'sid='
        const normalizedCookie = `sid=${sidValue}`;
        
        const data = {
            cookie: normalizedCookie,
            created: new Date().toISOString(),
            expires: new Date(Date.now() + this.cookieLifespan).toISOString()
        };
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('auth-changed', { 
            detail: { hasAuth: true } 
        }));
        
        return normalizedCookie;
    }

    /**
     * Clear the cookie
     */
    clearCookie() {
        localStorage.removeItem(this.STORAGE_KEY);
        
        // Clear any legacy auth data
        ['elasticCookie', 'elastic_cookie', 'rad_monitor_auth'].forEach(key => {
            localStorage.removeItem(key);
        });
        
        window.dispatchEvent(new CustomEvent('auth-cleared', { 
            detail: { hasAuth: false } 
        }));
    }

    /**
     * Validate cookie with backend
     * @param {string} [cookie] - Optional cookie to validate (uses stored if not provided)
     * @returns {Promise<{valid: boolean, reason?: string, error?: any}>}
     */
    async validateCookie(cookie = null) {
        const sid = cookie || this.getCookie();
        if (!sid) {
            return { valid: false, reason: 'no_cookie' };
        }

        try {
            const apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/v1/auth/validate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${sid}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { valid: true, ...data };
            } else {
                const error = await response.text();
                return { valid: false, reason: 'invalid_cookie', error };
            }
        } catch (error) {
            console.error('Cookie validation error:', error);
            return { valid: false, reason: 'network_error', error };
        }
    }

    /**
     * Get auth headers for API requests
     * @returns {Object} Headers object with Authorization if cookie exists
     */
    getAuthHeaders() {
        const cookie = this.getCookie();
        return cookie ? { 'Authorization': `Bearer ${cookie}` } : {};
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getCookie();
    }

    /**
     * Get authentication status
     * @returns {Object} Status object with details
     */
    getStatus() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) {
            return {
                authenticated: false,
                hasAuth: false,
                needsAuth: true
            };
        }

        try {
            const data = JSON.parse(stored);
            const now = new Date();
            const expires = new Date(data.expires);
            const created = new Date(data.created);
            const expired = now >= expires;
            
            return {
                authenticated: !expired,
                hasAuth: !expired,
                needsAuth: expired,
                created: data.created,
                expires: data.expires,
                ageMinutes: Math.floor((now - created) / 1000 / 60),
                remainingMinutes: expired ? 0 : Math.floor((expires - now) / 1000 / 60)
            };
        } catch {
            return {
                authenticated: false,
                hasAuth: false,
                needsAuth: true
            };
        }
    }

    /**
     * Prompt user for cookie
     * @param {string} [purpose] - Optional purpose for the prompt
     * @returns {Promise<string|null>} The cookie if valid, null otherwise
     */
    async promptForCookie(purpose = 'access the dashboard') {
        const input = prompt(
            `Enter your Kibana sid cookie to ${purpose}:\n\n` +
            `1. Open Kibana in another tab\n` +
            `2. Open Developer Tools (F12)\n` +
            `3. Go to Application/Storage → Cookies\n` +
            `4. Find the 'sid' cookie\n` +
            `5. Copy its value (just the value, not 'sid=')\n` +
            `6. Paste it below`
        );
        
        if (!input || !input.trim()) {
            return null;
        }
        
        // Validate before saving
        const testCookie = input.includes('sid=') ? input : `sid=${input.trim()}`;
        const validation = await this.validateCookie(testCookie);
        
        if (validation.valid) {
            this.setCookie(input);
            console.log('✅ Cookie validated and saved');
            return this.getCookie();
        } else {
            alert(`Invalid cookie: ${validation.reason || 'Unknown error'}`);
            return null;
        }
    }

    /**
     * Migrate legacy auth data to new format
     * @private
     */
    _migrateLegacyAuth() {
        // Check for legacy auth data
        const legacyKeys = ['elasticCookie', 'elastic_cookie', 'rad_monitor_auth'];
        
        for (const key of legacyKeys) {
            const value = localStorage.getItem(key);
            if (value) {
                try {
                    // Try to parse and migrate
                    const parsed = JSON.parse(value);
                    if (parsed.cookie || parsed.elasticCookie) {
                        const cookie = parsed.cookie || parsed.elasticCookie;
                        this.setCookie(cookie);
                        console.log(`✅ Migrated legacy auth from ${key}`);
                        localStorage.removeItem(key);
                        return;
                    }
                } catch {
                    // Not JSON, might be raw cookie
                    if (value.includes('Fe26') || value.includes('sid=')) {
                        this.setCookie(value);
                        console.log(`✅ Migrated legacy cookie from ${key}`);
                        localStorage.removeItem(key);
                        return;
                    }
                }
            }
        }
    }
}

// Export singleton instance
export const authManager = new AuthManager();
authManager.init();

// For backward compatibility
window.AuthManager = authManager;