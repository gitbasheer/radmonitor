import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CentralizedAuth } from '../assets/js/centralized-auth.js';

describe('CentralizedAuth', () => {
    let originalLocation;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();

        // Mock fetch for API calls
        global.fetch = vi.fn();

        // Mock window.location properly using Object.defineProperty
        originalLocation = window.location;
        Object.defineProperty(window, 'location', {
            writable: true,
            value: {
                hostname: 'localhost',
                href: 'http://localhost:8000'
            }
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(window, 'location', {
            writable: true,
            value: originalLocation
        });
    });

    describe('init', () => {
        it('should initialize with no existing auth', async () => {
            const auth = await CentralizedAuth.init();
            expect(auth).toBeNull();

            const status = CentralizedAuth.getStatus();
            expect(status.hasAuth).toBe(false);
            expect(status.needsAuth).toBe(true);
        });

        it('should load existing auth from localStorage', async () => {
            const mockAuth = {
                cookie: 'Fe26.2**test**',
                createdAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
                source: 'test',
                validated: true
            };

            localStorage.setItem('rad_monitor_auth', JSON.stringify(mockAuth));

            const auth = await CentralizedAuth.init();
            expect(auth).toEqual(expect.objectContaining({
                cookie: 'Fe26.2**test**',
                source: 'test'
            }));
        });

        it('should detect expired auth', async () => {
            const mockAuth = {
                cookie: 'Fe26.2**test**',
                createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
                expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
                source: 'test',
                validated: true
            };

            localStorage.setItem('rad_monitor_auth', JSON.stringify(mockAuth));

            await CentralizedAuth.init();
            const status = CentralizedAuth.getStatus();
            expect(status.expired).toBe(true);
            expect(status.needsAuth).toBe(true);
        });
    });

    describe('setCookie', () => {
        it('should accept valid Fe26 format cookie', async () => {
            const validCookie = 'Fe26.2**valid_cookie**';

            // Mock successful validation
            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ authenticated: true })
            });

            const auth = await CentralizedAuth.setCookie(validCookie);
            expect(auth.cookie).toBe(validCookie);
            expect(auth.source).toBe('user-input');
            expect(auth.validated).toBe(true);

            // Check it was saved to localStorage
            const saved = JSON.parse(localStorage.getItem('rad_monitor_auth'));
            expect(saved.cookie).toBe(validCookie);
        });

        it('should accept sid= format cookie', async () => {
            const validCookie = 'sid=Fe26.2**valid_cookie**';

            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ authenticated: true })
            });

            const auth = await CentralizedAuth.setCookie(validCookie);
            expect(auth.cookie).toBe(validCookie);
        });

        it('should reject invalid cookie format', async () => {
            await expect(CentralizedAuth.setCookie('invalid_cookie')).rejects.toThrow('Invalid cookie format');
        });

        it('should reject expired cookie on validation with proper error message', async () => {
            const cookie = 'Fe26.2**expired**';

            // Mock failed validation (401)
            global.fetch.mockResolvedValueOnce({
                status: 401,
                ok: false
            });

            await expect(CentralizedAuth.setCookie(cookie)).rejects.toThrow(
                'Could not verify cookie with the server - please check server is running and cookie is valid'
            );
        });

        it('should reject when server says not authenticated', async () => {
            const cookie = 'Fe26.2**test**';

            // Mock successful response but not authenticated
            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ authenticated: false })
            });

            await expect(CentralizedAuth.setCookie(cookie)).rejects.toThrow(
                'Could not verify cookie with the server - please check server is running and cookie is valid'
            );
        });

        it('should skip validation when requested', async () => {
            const cookie = 'Fe26.2**test**';

            const auth = await CentralizedAuth.setCookie(cookie, {
                skipValidation: true,
                source: 'imported'
            });

            expect(auth.cookie).toBe(cookie);
            expect(auth.validated).toBe(false);
            expect(auth.source).toBe('imported');
            expect(global.fetch).not.toHaveBeenCalled();
        });
    });

    describe('validateCookie', () => {
        it('should validate cookie using auth/status endpoint for localhost', async () => {
            window.location.hostname = 'localhost';
            const cookie = 'Fe26.2**test**';

            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ authenticated: true })
            });

            await CentralizedAuth.setCookie(cookie);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/auth/status',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'X-Elastic-Cookie': cookie
                    })
                })
            );
        });

        it('should handle sid= prefix properly', async () => {
            window.location.hostname = 'localhost';
            const cookie = 'sid=Fe26.2**test**';

            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ authenticated: true })
            });

            await CentralizedAuth.setCookie(cookie);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/auth/status',
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'X-Elastic-Cookie': 'sid=Fe26.2**test**'
                    })
                })
            );
        });

        it('should use proxy validation for production', async () => {
            window.location.hostname = 'github.io';
            const cookie = 'Fe26.2**test**';

            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true
            });

            await CentralizedAuth.setCookie(cookie);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('netlify'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining(cookie)
                })
            );
        });

        it('should log proper error messages', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const cookie = 'Fe26.2**test**';

            // Test 401 error
            global.fetch.mockResolvedValueOnce({
                status: 401,
                ok: false,
                statusText: 'Unauthorized'
            });

            await expect(CentralizedAuth.setCookie(cookie)).rejects.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith('❌ Cookie validation failed: Server returned 401 Unauthorized');

            // Test other HTTP error
            global.fetch.mockResolvedValueOnce({
                status: 500,
                ok: false,
                statusText: 'Internal Server Error'
            });

            await expect(CentralizedAuth.setCookie(cookie)).rejects.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith('❌ Cookie validation failed: Server returned 500 Internal Server Error');

            consoleSpy.mockRestore();
        });

        it('should handle network errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const cookie = 'Fe26.2**test**';

            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            await expect(CentralizedAuth.setCookie(cookie)).rejects.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith('❌ Cookie validation error:', 'Network error');

            consoleSpy.mockRestore();
        });

        it('should log success message on valid cookie', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const cookie = 'Fe26.2**test**';

            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ authenticated: true })
            });

            await CentralizedAuth.setCookie(cookie);
            expect(consoleSpy).toHaveBeenCalledWith('✅ Cookie validated successfully');

            consoleSpy.mockRestore();
        });
    });

    describe('getCookie', () => {
        it('should return null when no auth exists', () => {
            const cookie = CentralizedAuth.getCookie();
            expect(cookie).toBeNull();
        });

        it('should return cookie when valid auth exists', async () => {
            await CentralizedAuth.init();
            await CentralizedAuth.setCookie('Fe26.2**test**', { skipValidation: true });

            const cookie = CentralizedAuth.getCookie();
            expect(cookie).toBe('Fe26.2**test**');
        });

        it('should return null when auth is expired', async () => {
            const expiredAuth = {
                cookie: 'Fe26.2**expired**',
                createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                source: 'test'
            };

            localStorage.setItem('rad_monitor_auth', JSON.stringify(expiredAuth));
            await CentralizedAuth.init();

            const cookie = CentralizedAuth.getCookie();
            expect(cookie).toBeNull();
        });
    });

    describe('getStatus', () => {
        it('should return correct status for valid auth', async () => {
            await CentralizedAuth.init();
            await CentralizedAuth.setCookie('Fe26.2**test**', { skipValidation: true });

            const status = CentralizedAuth.getStatus();
            expect(status.hasAuth).toBe(true);
            expect(status.expired).toBe(false);
            expect(status.needsAuth).toBe(false);
            expect(status.source).toBe('user-input');
            expect(status.ageMinutes).toBeLessThan(1);
            expect(status.remainingMinutes).toBeGreaterThan(1400); // ~23 hours
        });

        it('should calculate age and remaining time correctly', async () => {
            const now = Date.now();
            const mockAuth = {
                cookie: 'Fe26.2**test**',
                createdAt: new Date(now - 30 * 60 * 1000).toISOString(), // 30 minutes ago
                expiresAt: new Date(now + 23.5 * 60 * 60 * 1000).toISOString(), // 23.5 hours from now
                source: 'test'
            };

            localStorage.setItem('rad_monitor_auth', JSON.stringify(mockAuth));
            await CentralizedAuth.init();

            const status = CentralizedAuth.getStatus();
            expect(status.ageMinutes).toBe(30);
            expect(status.remainingMinutes).toBe(23.5 * 60);
        });
    });

    describe('clearAuth', () => {
        it('should clear auth and localStorage', async () => {
            await CentralizedAuth.init();
            await CentralizedAuth.setCookie('Fe26.2**test**', { skipValidation: true });

            CentralizedAuth.clearAuth();

            expect(CentralizedAuth.getCookie()).toBeNull();
            expect(localStorage.getItem('rad_monitor_auth')).toBeNull();

            const status = CentralizedAuth.getStatus();
            expect(status.hasAuth).toBe(false);
        });
    });

    describe('exportAuth/importAuth', () => {
        it('should export valid auth data', async () => {
            await CentralizedAuth.init();
            await CentralizedAuth.setCookie('Fe26.2**test**', { skipValidation: true });

            const exported = CentralizedAuth.exportAuth();
            expect(exported).toEqual({
                cookie: 'Fe26.2**test**',
                expiresAt: expect.any(String),
                exportedAt: expect.any(String)
            });
        });

        it('should return null when exporting expired auth', async () => {
            const expiredAuth = {
                cookie: 'Fe26.2**expired**',
                createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
                expiresAt: new Date(Date.now() - 1000).toISOString(),
                source: 'test'
            };

            localStorage.setItem('rad_monitor_auth', JSON.stringify(expiredAuth));
            await CentralizedAuth.init();

            const exported = CentralizedAuth.exportAuth();
            expect(exported).toBeNull();
        });

        it('should import valid auth data', async () => {
            await CentralizedAuth.init();

            const importData = {
                cookie: 'Fe26.2**imported**',
                expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString()
            };

            global.fetch.mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ authenticated: true })
            });

            const auth = await CentralizedAuth.importAuth(importData);
            expect(auth.cookie).toBe('Fe26.2**imported**');
            expect(auth.source).toBe('imported');
        });
    });

    describe('environment detection', () => {
        it('should use localhost endpoint in development', async () => {
            window.location.hostname = 'localhost';

            const cookie = 'Fe26.2**test**';
            global.fetch.mockResolvedValueOnce({ status: 200, ok: true });

            await CentralizedAuth.setCookie(cookie);

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:8000/api/v1/query',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'X-Elastic-Cookie': cookie
                    })
                })
            );
        });

        it('should use Netlify proxy in production', async () => {
            window.location.hostname = 'github.io';

            const cookie = 'Fe26.2**test**';
            global.fetch.mockResolvedValueOnce({ status: 200, ok: true });

            await CentralizedAuth.setCookie(cookie);

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('netlify'),
                expect.objectContaining({
                    method: 'POST',
                    body: expect.stringContaining(cookie)
                })
            );
        });
    });
});
