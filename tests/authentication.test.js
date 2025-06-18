// tests/authentication.test.js - Authentication tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthenticationDetails, checkCorsProxy } from '../src/dashboard.js';

describe('Authentication', () => {
  beforeEach(() => {
    // Clear cookies and localStorage
    document.cookie = '';
    localStorage.clear();
    fetch.mockClear();
  });

  describe('checkCorsProxy', () => {
    it('should return true when CORS proxy is available', async () => {
      fetch.mockResolvedValueOnce(createMockResponse({}, 200));
      
      const result = await checkCorsProxy();
      
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('http://localhost:8889/health', {
        method: 'GET',
        mode: 'cors'
      });
    });

    it('should return false when CORS proxy is not available', async () => {
      fetch.mockResolvedValueOnce(createMockResponse({}, 502));
      
      const result = await checkCorsProxy();
      
      expect(result).toBe(false);
    });

    it('should return false when fetch throws an error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      const result = await checkCorsProxy();
      
      expect(result).toBe(false);
    });

    it('should handle connection refused errors', async () => {
      fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      
      const result = await checkCorsProxy();
      
      expect(result).toBe(false);
    });
  });

  describe('getAuthenticationDetails', () => {
    it('should return invalid auth when no cookie is found', async () => {
      const result = await getAuthenticationDetails();
      
      expect(result).toEqual({
        valid: false,
        method: null,
        cookie: null
      });
    });

    it('should get cookie from document.cookie first', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      
      // Mock window.location.hostname
      setLocation('localhost');
      
      // Mock CORS proxy available
      fetch.mockResolvedValueOnce(createMockResponse({}, 200));
      
      const result = await getAuthenticationDetails();
      
      expect(result.valid).toBe(true);
      expect(result.method).toBe('proxy');
      expect(result.cookie).toBe('test_cookie');
    });

    it('should fall back to localStorage if cookie not found', async () => {
      // Setup localStorage mock to return the value
      localStorage.getItem.mockReturnValue('localStorage_value');
      fetch.mockResolvedValueOnce(createMockResponse({}, 200));
      
      setLocation('localhost');
      
      const result = await getAuthenticationDetails();
      
      expect(result.cookie).toBe('localStorage_value');
    });

    it('should use proxy method on localhost when CORS proxy is available', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      fetch.mockResolvedValueOnce(createMockResponse({}, 200)); // CORS proxy check
      
      setLocation('localhost');
      
      const result = await getAuthenticationDetails();
      
      expect(result.valid).toBe(true);
      expect(result.method).toBe('proxy');
      expect(result.cookie).toBe('test_cookie');
      expect(fetch).toHaveBeenCalledWith('http://localhost:8889/health', expect.any(Object));
    });

    it('should use direct method when not on localhost', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      
      setLocation('example.com');
      
      const result = await getAuthenticationDetails();
      
      expect(result.valid).toBe(true);
      expect(result.method).toBe('direct');
      expect(result.cookie).toBe('test_cookie');
      
      // Should not check CORS proxy when not on localhost
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should return invalid when on localhost but CORS proxy not available', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      fetch.mockResolvedValueOnce(createMockResponse({}, 502)); // CORS proxy unavailable
      
      setLocation('localhost');
      
      const result = await getAuthenticationDetails();
      
      expect(result.valid).toBe(false);
      expect(result.method).toBe(null);
      expect(fetch).toHaveBeenCalledWith('http://localhost:8889/health', expect.any(Object));
    });

    it('should handle GitHub Pages deployment', async () => {
      document.cookie = 'elastic_cookie=github_cookie';
      
      setLocation('balkhalil.github.io');
      
      const result = await getAuthenticationDetails();
      
      expect(result.valid).toBe(true);
      expect(result.method).toBe('direct');
      expect(result.cookie).toBe('github_cookie');
      
      // Should not check CORS proxy on GitHub Pages
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle 127.0.0.1 as localhost', async () => {
      document.cookie = 'elastic_cookie=test_cookie';
      fetch.mockResolvedValueOnce(createMockResponse({}, 200));
      
      setLocation('127.0.0.1');
      
      const result = await getAuthenticationDetails();
      
      expect(result.valid).toBe(true);
      expect(result.method).toBe('proxy');
    });
  });

  describe('Authentication integration', () => {
    it('should handle complete authentication flow for local development', async () => {
      // Set up environment
      setLocation('localhost');
      
      // Set cookie
      document.cookie = 'elastic_cookie=Fe26.2**test_cookie';
      
      // Mock CORS proxy available
      fetch.mockResolvedValueOnce(createMockResponse({}, 200));
      
      const auth = await getAuthenticationDetails();
      
      expect(auth.valid).toBe(true);
      expect(auth.method).toBe('proxy');
      expect(auth.cookie).toBe('Fe26.2**test_cookie');
      
      // Verify CORS proxy was checked
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:8889/health',
        expect.objectContaining({ method: 'GET', mode: 'cors' })
      );
    });

    it('should handle complete authentication flow for production', async () => {
      // Set up environment
      setLocation('balkhalil.github.io');
      
      // Set cookie via document.cookie instead of localStorage
      document.cookie = 'elastic_cookie=github_cookie_value';
      
      const auth = await getAuthenticationDetails();
      
      expect(auth.valid).toBe(true);
      expect(auth.method).toBe('direct');
      expect(auth.cookie).toBe('github_cookie_value');
      
      // Should not check CORS proxy in production
      expect(fetch).not.toHaveBeenCalled();
    });
  });
}); 