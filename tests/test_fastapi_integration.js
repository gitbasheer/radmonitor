/**
 * Test FastAPI Integration
 * Verifies the unified API interface works correctly
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unifiedAPI } from '../assets/js/api-interface.js';
import { FastAPIIntegration } from '../assets/js/fastapi-integration.js';

describe('FastAPI Integration', () => {
    beforeEach(() => {
        // Reset localStorage
        localStorage.clear();
        // Reset fetch mock
        vi.resetAllMocks();
    });

    afterEach(() => {
        // Clean up
        unifiedAPI.cleanup();
    });

    describe('Unified API', () => {
        it('should initialize in legacy mode when FastAPI is not available', async () => {
            // Mock fetch to simulate FastAPI not available
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

            await unifiedAPI.initialize();
            expect(unifiedAPI.getMode()).toBe('legacy');
        });

        it('should initialize in FastAPI mode when server is available', async () => {
            // Mock fetch to simulate FastAPI available
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'healthy' })
            });

            // Force enable FastAPI
            localStorage.setItem('fastapi.enabled', 'true');

            await unifiedAPI.initialize();
            expect(unifiedAPI.getMode()).toBe('fastapi');
        });

        it('should provide consistent API methods regardless of mode', async () => {
            await unifiedAPI.initialize();
            
            // Check that all required methods exist
            expect(typeof unifiedAPI.fetchTrafficData).toBe('function');
            expect(typeof unifiedAPI.updateConfiguration).toBe('function');
            expect(typeof unifiedAPI.getAuthenticationDetails).toBe('function');
            expect(typeof unifiedAPI.checkHealth).toBe('function');
            expect(typeof unifiedAPI.executeQuery).toBe('function');
        });

        it('should switch modes dynamically', async () => {
            // Start in legacy mode
            localStorage.setItem('fastapi.disabled', 'true');
            await unifiedAPI.initialize();
            expect(unifiedAPI.getMode()).toBe('legacy');

            // Switch to FastAPI mode
            await unifiedAPI.forceMode('fastapi');
            expect(unifiedAPI.getMode()).toBe('fastapi');

            // Switch back to legacy
            await unifiedAPI.forceMode('legacy');
            expect(unifiedAPI.getMode()).toBe('legacy');
        });
    });

    describe('FastAPI Integration Module', () => {
        it('should detect server availability', async () => {
            // Mock successful health check
            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ status: 'healthy' })
            });

            const available = await FastAPIIntegration.checkAvailability();
            expect(available).toBe(true);
            expect(FastAPIIntegration.state.serverAvailable).toBe(true);
        });

        it('should handle server not available', async () => {
            // Mock failed health check
            global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

            const available = await FastAPIIntegration.checkAvailability();
            expect(available).toBe(false);
            expect(FastAPIIntegration.state.serverAvailable).toBe(false);
        });

        it('should respect feature flags', () => {
            expect(FastAPIIntegration.config.features.websocket).toBe(true);
            expect(FastAPIIntegration.config.features.performanceMetrics).toBe(true);
            expect(FastAPIIntegration.config.features.serverSideValidation).toBe(true);
        });

        it('should provide status information', () => {
            const status = FastAPIIntegration.getStatus();
            expect(status).toHaveProperty('mode');
            expect(status).toHaveProperty('enabled');
            expect(status).toHaveProperty('serverAvailable');
            expect(status).toHaveProperty('websocketConnected');
            expect(status).toHaveProperty('config');
        });
    });

    describe('Error Handling', () => {
        it('should fall back to legacy on initialization error', async () => {
            // Mock fetch to throw error
            global.fetch = vi.fn().mockImplementation(() => {
                throw new Error('Network error');
            });

            await unifiedAPI.initialize();
            expect(unifiedAPI.getMode()).toBe('legacy');
            expect(unifiedAPI.initialized).toBe(true);
        });

        it('should handle authentication errors gracefully', async () => {
            await unifiedAPI.initialize();

            // Mock no cookie available
            global.localStorage.removeItem('elasticCookie');

            const auth = await unifiedAPI.getAuthenticationDetails();
            expect(auth.valid).toBe(false);
        });
    });
}); 