// tests/cookie.test.js - Cookie management tests

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CentralizedAuth } from '../assets/js/centralized-auth.js';

describe('Cookie Management', () => {
  beforeEach(() => {
    // Clear localStorage and reset module state
    localStorage.clear();
    vi.clearAllMocks();

    // Mock localStorage for tests
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true
    });
  });

  describe('setCookie', () => {
    it('should set a cookie with the given name and value', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ authenticated: true })
      });
      global.fetch = mockFetch;

      await CentralizedAuth.setCookie('Fe26.2**test_value');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'rad_monitor_auth',
        expect.stringContaining('Fe26.2**test_value')
      );
    });

    it('should validate cookie format', async () => {
      await expect(CentralizedAuth.setCookie('invalid_cookie')).rejects.toThrow('Invalid cookie format');
    });

    it('should handle elastic session cookie format', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ authenticated: true })
      });
      global.fetch = mockFetch;

      const elasticCookie = 'Fe26.2**special_chars==';
      await CentralizedAuth.setCookie(elasticCookie);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'rad_monitor_auth',
        expect.stringContaining(elasticCookie)
      );
    });

    it('should validate cookie with server', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ authenticated: true })
      });
      global.fetch = mockFetch;

      await CentralizedAuth.setCookie('Fe26.2**test_value');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/auth/status',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Elastic-Cookie': expect.stringContaining('Fe26.2**test_value')
          })
        })
      );
    });
  });

  describe('getCookie', () => {
    it('should get cookie value when available', () => {
      // Mock stored auth data
      const authData = {
        cookie: 'Fe26.2**test_value',
        expiresAt: new Date(Date.now() + 1000000).toISOString(),
        expired: false
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(authData));

      // Initialize with stored data
      CentralizedAuth.init();

      expect(CentralizedAuth.getCookie()).toBe('Fe26.2**test_value');
    });

    it('should return null for expired cookie', () => {
      // Mock expired auth data
      const authData = {
        cookie: 'Fe26.2**test_value',
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        expired: true
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(authData));

      // Initialize with expired data
      CentralizedAuth.init();

      expect(CentralizedAuth.getCookie()).toBeNull();
    });

    it('should return null when no cookie stored', () => {
      localStorage.getItem.mockReturnValue(null);

      CentralizedAuth.init();

      expect(CentralizedAuth.getCookie()).toBeNull();
    });

    it('should handle corrupted storage data', () => {
      localStorage.getItem.mockReturnValue('invalid json');

      CentralizedAuth.init();

      expect(CentralizedAuth.getCookie()).toBeNull();
    });
  });

  describe('deleteCookie', () => {
    it('should delete an existing cookie', () => {
      CentralizedAuth.deleteCookie();

      expect(localStorage.removeItem).toHaveBeenCalledWith('rad_monitor_auth');
    });

    it('should handle deleting non-existent cookie gracefully', () => {
      expect(() => CentralizedAuth.deleteCookie()).not.toThrow();
    });

    it('should clear auth state when deleting cookie', () => {
      // Set up initial state
      const authData = {
        cookie: 'Fe26.2**test_value',
        expiresAt: new Date(Date.now() + 1000000).toISOString(),
        expired: false
      };
      localStorage.getItem.mockReturnValue(JSON.stringify(authData));
      CentralizedAuth.init();

      // Delete cookie
      CentralizedAuth.deleteCookie();

      // Should now return null
      expect(CentralizedAuth.getCookie()).toBeNull();
    });
  });

  describe('Cookie integration scenarios', () => {
    it('should handle cookie lifecycle', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ authenticated: true })
      });
      global.fetch = mockFetch;

      // Set
      await CentralizedAuth.setCookie('Fe26.2**session_123');
      expect(CentralizedAuth.getCookie()).toBe('Fe26.2**session_123');

      // Update
      await CentralizedAuth.setCookie('Fe26.2**session_456');
      expect(CentralizedAuth.getCookie()).toBe('Fe26.2**session_456');

      // Delete
      CentralizedAuth.deleteCookie();
      expect(CentralizedAuth.getCookie()).toBeNull();
    });

    it('should handle elastic cookie format', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ authenticated: true })
      });
      global.fetch = mockFetch;

      const elasticCookie = 'Fe26.2**1234567890abcdef**xyz123**abc**def**';
      await CentralizedAuth.setCookie(elasticCookie);
      expect(CentralizedAuth.getCookie()).toBe(elasticCookie);
    });

    it('should validate auth status', () => {
      const authData = {
        cookie: 'Fe26.2**test_value',
        expiresAt: new Date(Date.now() + 1000000).toISOString(),
        expired: false,
        validated: true
      };

      localStorage.getItem.mockReturnValue(JSON.stringify(authData));
      CentralizedAuth.init();

      const status = CentralizedAuth.getStatus();
      expect(status.hasAuth).toBe(true);
      expect(status.expired).toBe(false);
      expect(status.validated).toBe(true);
    });
  });
});
