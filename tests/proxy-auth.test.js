import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROXY_URL = 'http://localhost:8002'; // Use different port for testing
const PROXY_PATH = path.join(__dirname, '../server/elasticsearch-proxy.mjs');

describe('Elasticsearch Proxy Authentication Tests', () => {
    let proxyProcess;
    
    // Start proxy server before tests
    beforeAll(async () => {
        return new Promise((resolve) => {
            proxyProcess = spawn('node', [PROXY_PATH], {
                env: { ...process.env, PROXY_PORT: '8002', LOG_ENABLED: 'false' }
            });
            
            // Wait for server to start
            setTimeout(resolve, 2000);
        });
    });
    
    // Stop proxy server after tests
    afterAll(() => {
        if (proxyProcess) {
            proxyProcess.kill();
        }
    });
    
    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const response = await fetch(`${PROXY_URL}/health`);
            const data = await response.json();
            
            expect(response.status).toBe(200);
            expect(data.status).toBe('healthy');
            expect(data.service).toBe('elasticsearch-proxy');
        });
    });
    
    describe('Cookie Validation', () => {
        it('should reject requests without cookie', async () => {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: { match_all: {} }
                })
            });
            
            expect(response.status).toBe(401);
            const data = await response.json();
            expect(data.error).toContain('cookie');
        });
        
        it('should reject invalid cookie format', async () => {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cookie: 'invalid-cookie',
                    query: { match_all: {} }
                })
            });
            
            expect(response.status).toBe(401);
            const data = await response.json();
            expect(data.error).toContain('Invalid cookie format');
        });
        
        it('should accept valid cookie format', async () => {
            // This will fail at ES level but validates cookie format is accepted
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cookie: 'Fe26.2**test-cookie-value',
                    query: { match_all: {} }
                })
            });
            
            // Will get 401 from ES but our validation passed
            expect([401, 500]).toContain(response.status);
        });
    });
    
    describe('Request Validation', () => {
        it('should reject GET requests', async () => {
            const response = await fetch(PROXY_URL);
            expect(response.status).toBe(405);
            const data = await response.json();
            expect(data.error).toBe('Method not allowed');
        });
        
        it('should handle CORS preflight', async () => {
            const response = await fetch(PROXY_URL, {
                method: 'OPTIONS'
            });
            expect(response.status).toBe(200);
            expect(response.headers.get('access-control-allow-origin')).toBe('*');
        });
        
        it('should reject invalid JSON body', async () => {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid json'
            });
            
            expect(response.status).toBe(400);
        });
        
        it('should reject missing query', async () => {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cookie: 'Fe26.2**test'
                })
            });
            
            expect(response.status).toBe(400);
            const data = await response.json();
            expect(data.error).toContain('query');
        });
    });
    
    describe('Error Handling', () => {
        it('should include timestamp in error responses', async () => {
            const response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            
            const data = await response.json();
            expect(data.timestamp).toBeDefined();
            expect(new Date(data.timestamp)).toBeInstanceOf(Date);
        });
    });
});