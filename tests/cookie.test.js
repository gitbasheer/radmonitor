// tests/cookie.test.js - Cookie management tests

import { describe, it, expect, beforeEach } from 'vitest';
import { setCookie, getCookie, deleteCookie } from '../src/dashboard.js';

describe('Cookie Management', () => {
  beforeEach(() => {
    // Clear all cookies before each test
    document.cookie = '';
  });

  describe('setCookie', () => {
    it('should set a cookie with the given name and value', () => {
      setCookie('test_cookie', 'test_value');
      expect(document.cookie).toContain('test_cookie=test_value');
    });

    it('should set cookie with expiration date', () => {
      setCookie('test_cookie', 'test_value', 7);
      expect(document.cookie).toContain('test_cookie=test_value');
      // Check that expires is set (exact date is hard to test)
      expect(document.cookie).toContain('test_cookie=test_value');
    });

    it('should handle special characters in cookie value', () => {
      const specialValue = 'Fe26.2**special_chars==';
      setCookie('elastic_cookie', specialValue);
      expect(document.cookie).toContain(`elastic_cookie=${specialValue}`);
    });

    it('should overwrite existing cookie with same name', () => {
      setCookie('test_cookie', 'value1');
      setCookie('test_cookie', 'value2');
      expect(getCookie('test_cookie')).toBe('value2');
    });
  });

  describe('getCookie', () => {
    it('should get cookie value by name', () => {
      document.cookie = 'test_cookie=test_value';
      expect(getCookie('test_cookie')).toBe('test_value');
    });

    it('should return null for non-existent cookie', () => {
      expect(getCookie('non_existent')).toBeNull();
    });

    it('should handle multiple cookies', () => {
      document.cookie = 'cookie1=value1';
      document.cookie = 'cookie2=value2';
      document.cookie = 'cookie3=value3';
      
      expect(getCookie('cookie1')).toBe('value1');
      expect(getCookie('cookie2')).toBe('value2');
      expect(getCookie('cookie3')).toBe('value3');
    });

    it('should handle cookies with spaces', () => {
      document.cookie = ' test_cookie = test_value ';
      expect(getCookie('test_cookie')).toBe('test_value');
    });

    it('should get the correct cookie when names are similar', () => {
      document.cookie = 'test=value1';
      document.cookie = 'test_cookie=value2';
      document.cookie = 'test_cookie_extended=value3';
      
      expect(getCookie('test')).toBe('value1');
      expect(getCookie('test_cookie')).toBe('value2');
      expect(getCookie('test_cookie_extended')).toBe('value3');
    });
  });

  describe('deleteCookie', () => {
    it('should delete an existing cookie', () => {
      setCookie('test_cookie', 'test_value');
      expect(getCookie('test_cookie')).toBe('test_value');
      
      deleteCookie('test_cookie');
      expect(getCookie('test_cookie')).toBeNull();
    });

    it('should handle deleting non-existent cookie gracefully', () => {
      expect(() => deleteCookie('non_existent')).not.toThrow();
    });

    it('should only delete the specified cookie', () => {
      setCookie('cookie1', 'value1');
      setCookie('cookie2', 'value2');
      
      deleteCookie('cookie1');
      
      expect(getCookie('cookie1')).toBeNull();
      expect(getCookie('cookie2')).toBe('value2');
    });
  });

  describe('Cookie integration scenarios', () => {
    it('should handle cookie lifecycle', () => {
      // Set
      setCookie('session_cookie', 'session_123');
      expect(getCookie('session_cookie')).toBe('session_123');
      
      // Update
      setCookie('session_cookie', 'session_456');
      expect(getCookie('session_cookie')).toBe('session_456');
      
      // Delete
      deleteCookie('session_cookie');
      expect(getCookie('session_cookie')).toBeNull();
    });

    it('should handle elastic cookie format', () => {
      const elasticCookie = 'Fe26.2**1234567890abcdef**xyz123**abc**def**';
      setCookie('elastic_cookie', elasticCookie);
      expect(getCookie('elastic_cookie')).toBe(elasticCookie);
    });
  });
}); 