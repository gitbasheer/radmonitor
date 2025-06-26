/**
 * Proxy Client - Handles requests through serverless proxy to avoid CORS
 */

export class ProxyClient {
    constructor(proxyUrl) {
        this.proxyUrl = proxyUrl;
        this.available = null; // null = unknown, true = available, false = unavailable
    }

    /**
     * Check if proxy service is available
     */
    async checkAvailability() {
        if (this.available !== null) {
            return this.available;
        }

        try {
            const response = await fetch(`${this.proxyUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });
            this.available = response.ok;
        } catch (error) {
            console.warn('Proxy service not available:', error.message);
            this.available = false;
        }

        return this.available;
    }

    /**
     * Make request through proxy
     */
    async request(esUrl, esPath, options = {}) {
        const isAvailable = await this.checkAvailability();
        if (!isAvailable) {
            throw new Error('Proxy service not available');
        }

        const proxyRequestUrl = new URL(this.proxyUrl);
        proxyRequestUrl.searchParams.set('esUrl', esUrl);
        proxyRequestUrl.searchParams.set('esPath', esPath);
        
        if (options.cookie) {
            proxyRequestUrl.searchParams.set('cookie', options.cookie);
        }

        const response = await fetch(proxyRequestUrl.toString(), {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        if (!response.ok) {
            throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Test authentication through proxy
     */
    async testAuthentication(esUrl, esPath, cookie) {
        try {
            const result = await this.request(esUrl, esPath, {
                method: 'POST',
                cookie: cookie,
                body: {
                    size: 0,
                    query: { match_all: {} }
                }
            });

            return {
                valid: true,
                authenticated: true,
                proxy: true,
                result
            };
        } catch (error) {
            return {
                valid: false,
                authenticated: false,
                proxy: true,
                error: error.message
            };
        }
    }
}

// Global proxy client instance
window.ProxyClient = ProxyClient; 