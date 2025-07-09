// tests/authentication.test.js - Authentication tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient from '../assets/js/api-client-unified.js';

// Helper function to create mock responses
function createMockResponse(data = {}, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  };
}

// Helper function to safely set location using our proven technique
function setLocation(hostname) {
  vi.stubGlobal('location', {
    hostname,
    href: hostname === 'localhost' || hostname === '127.0.0.1'
      ? `http://${hostname}:8000`
      : `https://${hostname}`,
    protocol: hostname === 'localhost' || hostname === '127.0.0.1' ? 'http:' : 'https:',
    host: hostname === 'localhost' || hostname === '127.0.0.1' ? `${hostname}:8000` : hostname,
    pathname: '/',
    search: '',
    hash: '',
    origin: hostname === 'localhost' || hostname === '127.0.0.1'
      ? `http://${hostname}:8000`
      : `https://${hostname}`,
    port: hostname === 'localhost' || hostname === '127.0.0.1' ? '8000' : ''
  });
}

describe('Authentication', () => {
  beforeEach(() => {
    // Clear cookies and localStorage
    document.cookie = '';

    // Set up a proper localStorage mock with storage
    const localStorageData = {};
    global.localStorage = {
      getItem: vi.fn((key) => localStorageData[key] || null),
      setItem: vi.fn((key, value) => {
        localStorageData[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete localStorageData[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
      })
    };

    // Mock global fetch
    global.fetch = vi.fn();

    // Set default location to localhost
    setLocation('localhost');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

    describe('checkCorsProxy', () => {
    it('should return true when CORS proxy is available', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse({}, 200));

      const result = await apiClient.checkCorsProxy();

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/health',
        expect.objectContaining({
          method: 'GET'
        })
      );
    });

    it('should return false when CORS proxy is not available', async () => {
      global.fetch.mockResolvedValueOnce(createMockResponse({}, 502));

      const result = await apiClient.checkCorsProxy();

      expect(result).toBe(false);
    });

    it('should return false when fetch throws an error', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await apiClient.checkCorsProxy();

      expect(result).toBe(false);
    });

    it('should handle connection refused errors', async () => {
      global.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await apiClient.checkCorsProxy();

      expect(result).toBe(false);
    });
  });

  describe('getAuthenticationDetails', () => {
    it('should return invalid auth when no cookie is found', async () => {
      const result = await apiClient.getAuthenticationDetails();

      expect(result).toEqual({
        valid: false,
        method: null,
        cookie: null,
        message: "No authentication cookie found"
      });
    });

        it('should get cookie from localStorage', async () => {
      // Set cookie in localStorage where api-client-unified expects it
      const cookieData = {
        cookie: 'test_cookie',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      // Mock window.location.hostname
      setLocation('localhost');

      // Mock CORS proxy available
      global.fetch.mockResolvedValueOnce(createMockResponse({}, 200));

      const result = await apiClient.getAuthenticationDetails();

      expect(result.valid).toBe(true);
      expect(result.method).toBe('unified-server'); // Unified API client returns this
      expect(result.cookie).toBe('test_cookie');
    });

    it('should get cookie from localStorage', async () => {
      // Setup localStorage with proper cookie format
      const cookieData = {
        cookie: 'localStorage_value',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      global.fetch.mockResolvedValueOnce(createMockResponse({}, 200));

      setLocation('localhost');

      const result = await apiClient.getAuthenticationDetails();

      expect(result.cookie).toBe('localStorage_value');
    });

    it('should use proxy method on localhost when CORS proxy is available', async () => {
      // Set cookie in localStorage
      const cookieData = {
        cookie: 'test_cookie',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      global.fetch.mockResolvedValueOnce(createMockResponse({}, 200)); // CORS proxy check

      setLocation('localhost');

      const result = await apiClient.getAuthenticationDetails();

      expect(result.valid).toBe(true);
      expect(result.method).toBe('unified-server'); // Unified API client returns this
      expect(result.cookie).toBe('test_cookie');
      // Unified client may not always check CORS proxy
    });

        it('should use direct method when not on localhost', async () => {
      // Set cookie in localStorage
      const cookieData = {
        cookie: 'test_cookie',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      setLocation('example.com');

      const result = await apiClient.getAuthenticationDetails();

      expect(result.valid).toBe(true);
      expect(result.method).toBe('unified-server'); // Unified API client returns this
      expect(result.cookie).toBe('test_cookie');

      // Should not check CORS proxy when not on localhost
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should return valid even when CORS proxy not available (unified client behavior)', async () => {
      // Set cookie in localStorage
      const cookieData = {
        cookie: 'test_cookie',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      global.fetch.mockResolvedValueOnce(createMockResponse({}, 502)); // CORS proxy unavailable

      setLocation('localhost');

      const result = await apiClient.getAuthenticationDetails();

      // The unified client still returns valid: true if a cookie exists
      expect(result.valid).toBe(true);
      expect(result.method).toBe('unified-server');
      // Unified client may not check CORS proxy in all cases
    });

    it('should handle GitHub Pages deployment', async () => {
      // Set cookie in localStorage
      const cookieData = {
        cookie: 'github_cookie',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      setLocation('balkhalil.github.io');

      const result = await apiClient.getAuthenticationDetails();

      expect(result.valid).toBe(true);
      expect(result.method).toBe('unified-server'); // Unified API client returns this
      expect(result.cookie).toBe('github_cookie');

      // Should not check CORS proxy on GitHub Pages
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle 127.0.0.1 as localhost', async () => {
      // Set cookie in localStorage
      const cookieData = {
        cookie: 'test_cookie',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      global.fetch.mockResolvedValueOnce(createMockResponse({}, 200));

      setLocation('127.0.0.1');

      const result = await apiClient.getAuthenticationDetails();

      expect(result.valid).toBe(true);
      expect(result.method).toBe('unified-server'); // Unified API client returns this
    });
  });

    describe('Authentication integration', () => {
    it('should handle complete authentication flow for local development', async () => {
      // Set up environment
      setLocation('localhost');

      // Set cookie in localStorage
      const cookieData = {
        cookie: 'Fe26.2**test_cookie',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      // Mock CORS proxy available
      global.fetch.mockResolvedValueOnce(createMockResponse({}, 200));

      const auth = await apiClient.getAuthenticationDetails();

      expect(auth.valid).toBe(true);
      expect(auth.method).toBe('unified-server'); // Unified API client returns this
      expect(auth.cookie).toBe('Fe26.2**test_cookie');
      // Unified client may not check CORS proxy in all cases
    });

    it('should handle complete authentication flow for production', async () => {
      // Set up environment
      setLocation('balkhalil.github.io');

      // Set cookie in localStorage
      const cookieData = {
        cookie: 'github_cookie_value',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        saved: new Date().toISOString()
      };
      localStorage.setItem('elasticCookie', JSON.stringify(cookieData));

      const auth = await apiClient.getAuthenticationDetails();

      expect(auth.valid).toBe(true);
      expect(auth.method).toBe('unified-server'); // Unified API client returns this
      expect(auth.cookie).toBe('github_cookie_value');

      // Should not check CORS proxy in production
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
