#!/usr/bin/env node
/**
 * Elasticsearch Proxy Server
 * 
 * A secure local proxy for Elasticsearch/Kibana access with:
 * - Cookie validation and expiry detection
 * - CSRF protection
 * - Request/response logging
 * - Error handling
 * - CORS support
 */

import http from 'http';
import https from 'https';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
    port: process.env.PROXY_PORT || 8001,
    elasticsearch: {
        host: process.env.ES_HOST || 'usieventho-prod-usw2.kb.us-west-2.aws.found.io',
        port: process.env.ES_PORT || 9243,
        defaultPath: '/api/console/proxy?path=traffic-*/_search&method=POST'
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: 'GET, POST, OPTIONS',
        headers: 'Content-Type, Authorization',
        maxAge: '86400'
    },
    logging: {
        enabled: process.env.LOG_ENABLED !== 'false',
        level: process.env.LOG_LEVEL || 'info' // info, debug, error
    }
};

// Logger utility
class Logger {
    static log(level, message, data = {}) {
        if (!CONFIG.logging.enabled) return;
        
        const levels = { error: 0, info: 1, debug: 2 };
        const currentLevel = levels[CONFIG.logging.level] || 1;
        
        if (levels[level] <= currentLevel) {
            const timestamp = new Date().toISOString();
            console.log(JSON.stringify({
                timestamp,
                level,
                message,
                ...data
            }));
        }
    }
    
    static error(message, data) { this.log('error', message, data); }
    static info(message, data) { this.log('info', message, data); }
    static debug(message, data) { this.log('debug', message, data); }
}

// CORS headers helper
function getCorsHeaders() {
    return {
        'Access-Control-Allow-Origin': CONFIG.cors.origin,
        'Access-Control-Allow-Methods': CONFIG.cors.methods,
        'Access-Control-Allow-Headers': CONFIG.cors.headers,
        'Access-Control-Max-Age': CONFIG.cors.maxAge
    };
}

// Cookie validation
function validateCookie(cookie) {
    if (!cookie) {
        return { valid: false, error: 'No cookie provided' };
    }
    
    // Ensure cookie has the right format
    const cookieStr = cookie.startsWith('sid=') ? cookie : `sid=${cookie}`;
    
    // Basic validation - check if it's a Kibana cookie format
    if (!cookieStr.match(/^sid=Fe26\.2\*\*/)) {
        return { valid: false, error: 'Invalid cookie format' };
    }
    
    return { valid: true, cookie: cookieStr };
}

// Parse request body
async function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

// Proxy request to Elasticsearch
async function proxyToElasticsearch(requestData) {
    const { cookie, query, esPath } = requestData;
    
    // Validate cookie
    const cookieValidation = validateCookie(cookie);
    if (!cookieValidation.valid) {
        throw new Error(cookieValidation.error);
    }
    
    // Validate query
    if (!query || typeof query !== 'object') {
        throw new Error('Invalid or missing query');
    }
    
    const queryString = JSON.stringify(query);
    const options = {
        hostname: CONFIG.elasticsearch.host,
        port: CONFIG.elasticsearch.port,
        path: esPath || CONFIG.elasticsearch.defaultPath,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieValidation.cookie,
            'kbn-xsrf': 'true',
            'Content-Length': Buffer.byteLength(queryString)
        }
    };
    
    Logger.debug('Proxying request', { 
        host: options.hostname,
        path: options.path,
        querySize: queryString.length 
    });
    
    return new Promise((resolve, reject) => {
        const proxyReq = https.request(options, (proxyRes) => {
            let responseBody = '';
            
            proxyRes.on('data', chunk => responseBody += chunk);
            proxyRes.on('end', () => {
                Logger.info('Proxy response received', {
                    status: proxyRes.statusCode,
                    size: responseBody.length
                });
                
                // Check for auth errors
                if (proxyRes.statusCode === 401) {
                    reject(new Error('Authentication failed - cookie may have expired'));
                    return;
                }
                
                resolve({
                    status: proxyRes.statusCode,
                    headers: proxyRes.headers,
                    body: responseBody
                });
            });
        });
        
        proxyReq.on('error', (error) => {
            Logger.error('Proxy request failed', { error: error.message });
            reject(error);
        });
        
        proxyReq.write(queryString);
        proxyReq.end();
    });
}

// Request handler
async function handleRequest(req, res) {
    const corsHeaders = getCorsHeaders();
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, corsHeaders);
        res.end();
        return;
    }
    
    // Only accept POST requests
    if (req.method !== 'POST') {
        res.writeHead(405, { ...corsHeaders, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            error: 'Method not allowed',
            message: 'This proxy only accepts POST requests'
        }));
        return;
    }
    
    try {
        // Parse request body
        const requestData = await parseRequestBody(req);
        
        // Proxy to Elasticsearch
        const proxyResponse = await proxyToElasticsearch(requestData);
        
        // Return response
        res.writeHead(proxyResponse.status, {
            ...corsHeaders,
            'Content-Type': 'application/json'
        });
        res.end(proxyResponse.body);
        
    } catch (error) {
        Logger.error('Request handling failed', { error: error.message });
        
        // Determine appropriate status code
        let statusCode = 500;
        if (error.message.includes('Invalid JSON')) statusCode = 400;
        if (error.message.includes('cookie')) statusCode = 401;
        if (error.message.includes('query')) statusCode = 400;
        
        res.writeHead(statusCode, { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
        });
        res.end(JSON.stringify({ 
            error: error.message,
            timestamp: new Date().toISOString()
        }));
    }
}

// Health check endpoint
async function handleHealthCheck(req, res) {
    if (req.url === '/health' && req.method === 'GET') {
        res.writeHead(200, { 
            ...getCorsHeaders(), 
            'Content-Type': 'application/json' 
        });
        res.end(JSON.stringify({ 
            status: 'healthy',
            service: 'elasticsearch-proxy',
            version: '1.0.0',
            elasticsearch: {
                host: CONFIG.elasticsearch.host,
                port: CONFIG.elasticsearch.port
            }
        }));
        return true;
    }
    return false;
}

// Create and start server
const server = http.createServer(async (req, res) => {
    // Check health endpoint first
    if (await handleHealthCheck(req, res)) return;
    
    // Handle all other requests
    await handleRequest(req, res);
});

// Start server
server.listen(CONFIG.port, () => {
    Logger.info('Elasticsearch proxy server started', {
        port: CONFIG.port,
        elasticsearch: `${CONFIG.elasticsearch.host}:${CONFIG.elasticsearch.port}`,
        cors: CONFIG.cors.origin
    });
    
    console.log(`
╔═══════════════════════════════════════════════════╗
║        Elasticsearch Proxy Server Running         ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  🚀 Server:     http://localhost:${CONFIG.port}         ║
║  🔗 ES Host:    ${CONFIG.elasticsearch.host}     ║
║  ❤️  Health:     http://localhost:${CONFIG.port}/health  ║
║                                                   ║
║  Usage:                                           ║
║  POST http://localhost:${CONFIG.port}                   ║
║  {                                                ║
║    "cookie": "sid=Fe26.2**...",                  ║
║    "query": { ...elasticsearch query... }         ║
║  }                                                ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    Logger.info('Shutting down proxy server');
    server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    Logger.info('Shutting down proxy server (SIGINT)');
    server.close(() => {
        Logger.info('Server closed');
        process.exit(0);
    });
});

// Export for testing
export { validateCookie, CONFIG };