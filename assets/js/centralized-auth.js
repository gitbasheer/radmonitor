/**
 * Centralized Authentication Manager
 * Single source of truth for cookies across dev and prod
 * Uses localStorage with enhanced persistence and sharing
 */

import { cryptoUtils } from './crypto-utils.js';

export const CentralizedAuth = (() => {
    'use strict';

    const STORAGE_KEY = 'rad_monitor_auth';
    const COOKIE_LIFESPAN = 24 * 60 * 60 * 1000; // 24 hours
    const SHARED_COOKIE_URL = '/config/shared-cookie.json'; // Optional: for team sharing

    let currentAuth = null;
    let authCheckTimer = null;

    /**
     * Initialize auth system
     */
    async function init() {
        // Load from storage
        currentAuth = await loadFromStorage();

        // Check if we should try to load a shared cookie (production only)
        if (isProduction() && (!currentAuth || currentAuth.expired)) {
            await checkSharedCookie();
        }

        // Start periodic validation
        startAuthValidation();

        return currentAuth;
    }

    /**
     * Get current cookie
     */
    function getCookie() {
        if (!currentAuth || currentAuth.expired) {
            return null;
        }
        return currentAuth.cookie;
    }

    /**
     * Set cookie (from user input)
     */
    async function setCookie(cookieValue, options = {}) {
        const cookie = cookieValue.trim();

        // Validate format
        if (!cookie.startsWith('Fe26.2') && !cookie.startsWith('sid=')) {
            throw new Error('Invalid cookie format');
        }

        // Create auth object
        const auth = {
            cookie: cookie,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + COOKIE_LIFESPAN).toISOString(),
            source: options.source || 'user-input',
            validated: false
        };

        // Validate by making a test request
        if (!options.skipValidation) {
            const isValid = await validateCookie(cookie);
            if (!isValid) {
                throw new Error('Could not verify cookie with the server - please check server is running and cookie is valid');
            }
            auth.validated = true;
            auth.validatedAt = new Date().toISOString();
        }

        // Save
        currentAuth = auth;
        await saveToStorage(auth);

        // Notify listeners
        window.dispatchEvent(new CustomEvent('authUpdated', {
            detail: { hasAuth: true, source: auth.source }
        }));

        return auth;
    }

    /**
     * Clear authentication
     */
    function clearAuth() {
        currentAuth = null;
        localStorage.removeItem(STORAGE_KEY);

        if (authCheckTimer) {
            clearInterval(authCheckTimer);
            authCheckTimer = null;
        }

        window.dispatchEvent(new CustomEvent('authCleared'));
    }

    /**
     * Delete cookie (alias for clearAuth for backward compatibility)
     */
    function deleteCookie() {
        clearAuth();
    }

    /**
     * Get auth status
     */
    function getStatus() {
        if (!currentAuth) {
            return {
                hasAuth: false,
                expired: true,
                needsAuth: true
            };
        }

        const now = new Date();
        const expiresAt = new Date(currentAuth.expiresAt);
        const createdAt = new Date(currentAuth.createdAt);
        const age = now - createdAt;
        const expired = now >= expiresAt;

        return {
            hasAuth: true,
            expired: expired,
            needsAuth: expired,
            source: currentAuth.source,
            ageMinutes: Math.floor(age / 1000 / 60),
            remainingMinutes: expired ? 0 : Math.floor((expiresAt - now) / 1000 / 60),
            validated: currentAuth.validated
        };
    }

    /**
     * Validate cookie by making a test request
     */
    async function validateCookie(cookie) {
        try {
            const isLocalhost = window.location.hostname === 'localhost';
            let response;

            if (isLocalhost) {
                // Use auth status endpoint for validation - simpler and more appropriate
                response = await fetch('http://localhost:8000/api/v1/auth/status', {
                    method: 'GET',
                    headers: {
                        'X-Elastic-Cookie': cookie.startsWith('sid=') ? cookie : `sid=${cookie}`
                    }
                });
            } else {
                // For production, use the proxy's validation
                const proxyUrl = window.PROXY_URL || 'https://regal-youtiao-09c777.netlify.app/.netlify/functions/proxy';
                response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        cookie: cookie,
                        query: { size: 0, query: { match_all: {} } }
                    })
                });
            }

            if (response.status === 401) {
                console.error('(✗) Cookie validation failed: Server returned 401 Unauthorized');
                return false;
            }

            if (!response.ok) {
                console.error(`(✗) Cookie validation failed: Server returned ${response.status} ${response.statusText}`);
                return false;
            }

            // For localhost, check if auth status shows authenticated
            if (isLocalhost) {
                const data = await response.json();
                if (!data.authenticated) {
                    console.error('(✗) Cookie validation failed: Auth status shows not authenticated');
                    return false;
                }
            }

            console.log('(✓)Cookie validated successfully');
            return true;
        } catch (error) {
            console.error('(✗) Cookie validation error:', error.message);
            return false;
        }
    }

    /**
     * Load from localStorage with decryption
     */
    async function loadFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return null;

            // Try to decrypt if it looks encrypted (base64 pattern)
            let auth;
            if (/^[A-Za-z0-9+/]+=*$/.test(stored) && stored.length > 100) {
                try {
                    auth = await cryptoUtils.decrypt(stored);
                } catch (decryptError) {
                    // Fall back to plain text for backward compatibility
                    console.warn('Failed to decrypt, trying plain text');
                    auth = JSON.parse(stored);
                }
            } else {
                // Legacy unencrypted format
                auth = JSON.parse(stored);
            }

            // Check expiry
            const now = new Date();
            const expiresAt = new Date(auth.expiresAt);
            auth.expired = now >= expiresAt;

            return auth;
        } catch (error) {
            console.error('Failed to load auth from storage:', error);
            return null;
        }
    }

    /**
     * Save to localStorage with encryption
     */
    async function saveToStorage(auth) {
        try {
            const encrypted = await cryptoUtils.encrypt(auth);
            localStorage.setItem(STORAGE_KEY, encrypted);
        } catch (error) {
            console.error('Failed to save auth to storage:', error);
            // Fallback to unencrypted if encryption fails
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
                console.warn('Saved auth without encryption as fallback');
            } catch (fallbackError) {
                console.error('Failed to save auth even without encryption:', fallbackError);
            }
        }
    }

    /**
     * Check for shared cookie (production only)
     */
    async function checkSharedCookie() {
        try {
            const response = await fetch(SHARED_COOKIE_URL);
            if (!response.ok) return;

            const data = await response.json();
            if (data.cookie && data.expiresAt) {
                const expires = new Date(data.expiresAt);
                if (expires > new Date()) {
                    // Use shared cookie
                    await setCookie(data.cookie, {
                        source: 'shared-config',
                        skipValidation: true
                    });
                    console.log('📦 Loaded shared cookie from config');
                }
            }
        } catch (error) {
            // Shared cookie is optional, so we just log at debug level
            console.debug('No shared cookie available');
        }
    }

    /**
     * Start periodic auth validation
     */
    function startAuthValidation() {
        // Check every 5 minutes
        authCheckTimer = setInterval(() => {
            const status = getStatus();

            if (status.expired) {
                window.dispatchEvent(new CustomEvent('authExpired'));
            } else if (status.remainingMinutes < 30) {
                window.dispatchEvent(new CustomEvent('authExpiring', {
                    detail: { remainingMinutes: status.remainingMinutes }
                }));
            }
        }, 5 * 60 * 1000);
    }

    /**
     * Check if running in production
     */
    function isProduction() {
        return window.location.hostname.includes('github.io');
    }

    /**
     * Export/Import helpers for sharing
     */
    function exportAuth() {
        if (!currentAuth || currentAuth.expired) {
            return null;
        }

        return {
            cookie: currentAuth.cookie,
            expiresAt: currentAuth.expiresAt,
            exportedAt: new Date().toISOString()
        };
    }

    async function importAuth(authData) {
        if (!authData || !authData.cookie) {
            throw new Error('Invalid auth data');
        }

        return setCookie(authData.cookie, {
            source: 'imported'
        });
    }

    // Public API
    return {
        init,
        getCookie,
        setCookie,
        deleteCookie,
        clearAuth,
        getStatus,
        exportAuth,
        importAuth,

        // Events to listen for:
        // - authUpdated: Cookie was updated
        // - authCleared: Cookie was cleared
        // - authExpired: Cookie has expired
        // - authExpiring: Cookie will expire soon
    };
})();

// Make available globally
window.CentralizedAuth = CentralizedAuth;
