/**
 * Simplified Authentication Service
 * Single source of truth for authentication state
 * @module auth-service
 */

import './types.js'; // Import type definitions

export class AuthService {
    constructor() {
        /** @type {AuthStatus|null} */
        this.authStatus = null;
        /** @type {Promise<AuthStatus>|null} */
        this.authCheckPromise = null;
    }

    /**
     * Check authentication status - single source of truth
     * @returns {Promise<AuthStatus>} Authentication status
     */
    async checkAuth() {
        // Avoid multiple simultaneous auth checks
        if (this.authCheckPromise) {
            return this.authCheckPromise;
        }

        this.authCheckPromise = this._performAuthCheck();
        const result = await this.authCheckPromise;
        this.authCheckPromise = null;
        return result;
    }

    /**
     * Perform the actual authentication check
     * @private
     * @returns {Promise<AuthStatus>} Authentication status
     */
    async _performAuthCheck() {
        try {
            // Use CentralizedAuth if available
            if (window.CentralizedAuth) {
                const cookie = await window.CentralizedAuth.getCookie();
                if (cookie) {
                    this.authStatus = {
                        authenticated: true,
                        method: 'centralized',
                        source: 'CentralizedAuth'
                    };
                    return this.authStatus;
                }
            }

            // Check for stored cookie first - use centralized auth if available
            let storedCookie = null;
            if (window.CentralizedAuth) {
                storedCookie = window.CentralizedAuth.getCookie();
            } else {
                // Fallback to legacy storage
                storedCookie = localStorage.getItem('elastic_cookie');
            }

            // Try backend auth check with cookie
            const headers = {
                'Accept': 'application/json'
            };

            if (storedCookie) {
                headers['X-Elastic-Cookie'] = storedCookie;
                headers['Cookie'] = storedCookie;
            }

            const response = await fetch('/api/v1/auth/status', {
                credentials: 'include',
                headers: headers
            });

            if (response.ok) {
                const result = await response.json();
                // If server says authenticated, include the cookie in the status
                if (result.authenticated && storedCookie) {
                    this.authStatus = {
                        ...result,
                        cookie: storedCookie
                    };
                } else {
                    this.authStatus = result;
                }
                return this.authStatus;
            }

            // For now, fallback to localStorage check for backward compatibility
            // This will be removed once backend auth is fully implemented
            const legacyCookie = this._getLegacyCookie();
            if (legacyCookie) {
                this.authStatus = {
                    authenticated: true,
                    method: 'legacy',
                    temporary: true,
                    cookie: legacyCookie  // Include the cookie in auth status
                };
                return this.authStatus;
            }

            this.authStatus = { authenticated: false };
            return this.authStatus;
        } catch (error) {
            // Network error - check legacy auth
            const legacyCookie = this._getLegacyCookie();
            this.authStatus = {
                authenticated: !!legacyCookie,
                method: 'legacy',
                error: error.message,
                cookie: legacyCookie  // Include cookie if available
            };
            return this.authStatus;
        }
    }

    /**
     * Temporary legacy cookie check for backward compatibility
     * @private
     * @returns {string|null} Cookie value or null
     */
    _getLegacyCookie() {
        // Use centralized auth if available
        if (window.CentralizedAuth) {
            return window.CentralizedAuth.getCookie();
        }

        // Fallback to legacy storage
        try {
            const saved = localStorage.getItem('elasticCookie');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.expires && new Date(parsed.expires) > new Date()) {
                    return parsed.cookie;
                }
            }
        } catch (e) {
            // Invalid cookie data
        }
        return window.ELASTIC_COOKIE || null;
    }

    /**
     * Require authentication - only prompts if no valid auth exists
     * @returns {Promise<AuthStatus>} Authentication status
     * @throws {Error} If authentication fails and user cancels
     */
    async requireAuth() {
        const status = await this.checkAuth();

        // If already authenticated, return immediately
        if (status.authenticated) {
            console.log('(✓)Using existing authentication');
            return status;
        }

        // Only prompt if we don't have any authentication
        console.log('⚠️ No valid authentication found, prompting user...');
        const cookie = await this.promptForCookie();
        if (cookie) {
            await this.setLegacyCookie(cookie);
            // Re-check auth after setting cookie
            const newStatus = await this.checkAuth();
            if (newStatus.authenticated) {
                console.log('(✓)Authentication successful with new cookie');
                return newStatus;
            }
        }

        throw new Error('Authentication required - no valid cookie provided');
    }

    /**
     * Prompt for cookie using UI modal
     * @returns {Promise<string|null>} Cookie value or null
     */
    async promptForCookie() {
        // Use app store to show auth prompt
        if (window.appStore) {
            const { showAuthPrompt } = window.appStore.getState().actions;
            showAuthPrompt();
            // Return null since auth overlay handles cookie submission
            return null;
        }

        // Fallback to prompt (should not reach here)
        const cookie = prompt(
            'Enter your Elastic authentication cookie:\n\n' +
            '1. Open Kibana in another tab\n' +
            '2. Open Developer Tools (F12)\n' +
            '3. Go to Network tab\n' +
            '4. Find any request and copy the Cookie header\n'
        );

        return cookie?.trim() || null;
    }

    /**
     * Set legacy cookie - temporary
     * @param {string} cookie - Cookie value
     * @returns {Promise<boolean>} Success status
     */
    async setLegacyCookie(cookie) {
        if (!cookie) return false;

        // Use CentralizedAuth if available
        if (window.CentralizedAuth) {
            await window.CentralizedAuth.setCookie(cookie);
            this.authStatus = null; // Reset to force recheck
            return true;
        }

        // Use centralized auth if available
        if (window.CentralizedAuth) {
            await window.CentralizedAuth.setCookie(cookie);
        } else {
            // Fallback to localStorage
            const cookieData = {
                cookie: cookie.trim(),
                expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                saved: new Date().toISOString()
            };

            localStorage.setItem('elasticCookie', JSON.stringify(cookieData));
        }
        this.authStatus = null; // Reset to force recheck
        return true;
    }

    /**
     * Clear authentication
     * @returns {Promise<void>}
     */
    async clearAuth() {
        // Use CentralizedAuth if available
        if (window.CentralizedAuth) {
            await window.CentralizedAuth.clearAuth();
        } else {
            localStorage.removeItem('elasticCookie');
        }
        this.authStatus = null;

        try {
            await fetch('/api/v1/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            // Ignore logout errors
        }
    }

    /**
     * Get current auth status without checking
     * @returns {AuthStatus} Current authentication status
     */
    getStatus() {
        return this.authStatus || { authenticated: false };
    }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
