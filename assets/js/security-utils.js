/**
 * Security Utilities for RAD Monitor
 * Provides XSS prevention, input validation, and security functions
 */

export class SecurityUtils {
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    static escapeHtml(text) {
        if (typeof text !== 'string') {
            return String(text);
        }

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Safely set text content (prevents XSS)
     * @param {Element} element - DOM element
     * @param {string} text - Text to set
     */
    static setTextContent(element, text) {
        if (element) {
            element.textContent = text;
        }
    }

    /**
     * Safely create HTML element with content
     * @param {string} tag - HTML tag name
     * @param {string} text - Text content
     * @param {Object} attributes - HTML attributes
     * @returns {Element} Created element
     */
    static createElement(tag, text = '', attributes = {}) {
        const element = document.createElement(tag);

        if (text) {
            element.textContent = text;
        }

        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        }

        return element;
    }

    /**
     * Safely append child elements
     * @param {Element} parent - Parent element
     * @param {Element|string} child - Child element or text
     */
    static appendChild(parent, child) {
        if (!parent) return;

        if (typeof child === 'string') {
            parent.appendChild(document.createTextNode(child));
        } else if (child instanceof Element) {
            parent.appendChild(child);
        }
    }

    /**
     * Validate and sanitize user input
     * @param {string} input - User input
     * @param {Object} options - Validation options
     * @returns {Object} Validation result
     */
    static validateInput(input, options = {}) {
        const {
            maxLength = 1000,
            allowedPattern = null,
            forbiddenPatterns = [],
            required = false
        } = options;

        const result = {
            valid: true,
            errors: [],
            sanitized: input
        };

        // Check if required
        if (required && (!input || input.trim() === '')) {
            result.valid = false;
            result.errors.push('Input is required');
            return result;
        }

        // Check length
        if (input && input.length > maxLength) {
            result.valid = false;
            result.errors.push(`Input too long (max: ${maxLength} characters)`);
        }

        // Check allowed pattern
        if (allowedPattern && input && !allowedPattern.test(input)) {
            result.valid = false;
            result.errors.push('Input format not allowed');
        }

        // Check forbidden patterns
        for (const pattern of forbiddenPatterns) {
            if (input && pattern.test(input)) {
                result.valid = false;
                result.errors.push('Input contains forbidden content');
                break;
            }
        }

        // Sanitize if valid
        if (result.valid && input) {
            result.sanitized = input.trim();
        }

        return result;
    }

    /**
     * Validate formula input specifically
     * @param {string} formula - Formula string
     * @returns {Object} Validation result
     */
    static validateFormula(formula) {
        const forbiddenPatterns = [
            /eval\s*\(/i,
            /Function\s*\(/i,
            /setTimeout\s*\(/i,
            /setInterval\s*\(/i,
            /import\s*\(/i,
            /require\s*\(/i,
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i
        ];

        return this.validateInput(formula, {
            maxLength: 5000,
            forbiddenPatterns,
            required: true
        });
    }

    /**
     * Validate API parameters
     * @param {Object} params - API parameters
     * @returns {Object} Validation result
     */
    static validateApiParams(params) {
        const result = {
            valid: true,
            errors: [],
            sanitized: {}
        };

        if (!params || typeof params !== 'object') {
            result.valid = false;
            result.errors.push('Invalid parameters object');
            return result;
        }

        // Validate common API parameters
        const validators = {
            timeRange: (value) => {
                if (value && typeof value === 'string') {
                    const validPatterns = [
                        /^now-\d+[hdwM]$/,
                        /^last_\d+_days$/,
                        /^inspection_time$/
                    ];
                    return validPatterns.some(pattern => pattern.test(value));
                }
                return true;
            },
            limit: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 1 && num <= 10000;
            },
            offset: (value) => {
                const num = parseInt(value);
                return !isNaN(num) && num >= 0;
            }
        };

        for (const [key, value] of Object.entries(params)) {
            if (validators[key]) {
                if (!validators[key](value)) {
                    result.valid = false;
                    result.errors.push(`Invalid ${key} parameter`);
                }
            }

            // Sanitize string values
            if (typeof value === 'string') {
                result.sanitized[key] = value.trim();
            } else {
                result.sanitized[key] = value;
            }
        }

        return result;
    }

    /**
     * Generate CSRF token
     * @returns {string} CSRF token
     */
    static generateCSRFToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    /**
     * Validate CSRF token
     * @param {string} token - Token to validate
     * @param {string} expected - Expected token
     * @returns {boolean} True if valid
     */
    static validateCSRFToken(token, expected) {
        if (!token || !expected) return false;
        return token === expected;
    }

    /**
     * Rate limiting helper
     */
    static createRateLimiter(maxRequests = 100, windowMs = 60000) {
        const requests = new Map();

        return {
            check: (identifier) => {
                const now = Date.now();
                const windowStart = now - windowMs;

                // Clean old entries
                for (const [id, timestamps] of requests.entries()) {
                    const validTimestamps = timestamps.filter(time => time > windowStart);
                    if (validTimestamps.length === 0) {
                        requests.delete(id);
                    } else {
                        requests.set(id, validTimestamps);
                    }
                }

                // Check current identifier
                const currentRequests = requests.get(identifier) || [];
                if (currentRequests.length >= maxRequests) {
                    return false; // Rate limited
                }

                // Add current request
                currentRequests.push(now);
                requests.set(identifier, currentRequests);

                return true; // Allowed
            },

            reset: (identifier) => {
                requests.delete(identifier);
            }
        };
    }

    /**
     * Sanitize URL
     * @param {string} url - URL to sanitize
     * @returns {string} Sanitized URL or empty string
     */
    static sanitizeUrl(url) {
        if (!url || typeof url !== 'string') return '';

        try {
            const parsed = new URL(url);
            // Only allow http and https protocols
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return '';
            }
            return parsed.toString();
        } catch {
            return '';
        }
    }

    /**
     * Log security event (without sensitive data)
     * @param {string} event - Event type
     * @param {Object} data - Event data (will be sanitized)
     */
    static logSecurityEvent(event, data = {}) {
        const sanitizedData = { ...data };

        // Remove sensitive fields
        const sensitiveFields = ['cookie', 'token', 'password', 'secret', 'key'];
        for (const field of sensitiveFields) {
            if (sanitizedData[field]) {
                sanitizedData[field] = '[REDACTED]';
            }
        }

        console.warn(`🔒 Security Event: ${event}`, sanitizedData);

        // Dispatch custom event for monitoring
        window.dispatchEvent(new CustomEvent('securityEvent', {
            detail: { event, data: sanitizedData, timestamp: new Date().toISOString() }
        }));
    }
}

// Export singleton instance
export const securityUtils = SecurityUtils;
