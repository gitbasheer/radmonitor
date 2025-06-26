/**
 * Configuration Loader
 * Loads API endpoints configuration
 */

import { ConfigService } from './config-service.js';

// Default configuration - can be overridden by external config file
const API_ENDPOINTS_CONFIG = {
    kibana: { 
        url: 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243',
        description: 'Production Kibana/Elasticsearch endpoint'
    },
    corsProxy: { 
        url: 'http://localhost:8889', 
        path: '/kibana-proxy',
        description: 'Local CORS proxy for development'
    },
    fastapi: { 
        url: 'http://localhost:8000',
        description: 'FastAPI development server'
    },
    searchDefaults: {
        minEventDate: '2025-05-19T04:00:00.000Z',
        defaultTimeRange: 'now-12h',
        defaultSize: 0,
        maxBuckets: 500
    }
};

export async function loadApiEndpoints() {
    // Skip trying to load external config when on FastAPI server
    // FastAPI runs on port 8000 and doesn't serve static files from /config/
    const isOnFastAPI = window.location.port === '8000';
    
    if (!isOnFastAPI) {
        // Try to load external config file (optional override)
        try {
            const response = await fetch('config/api-endpoints.json', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });
            if (response.ok) {
                const config = await response.json();
                window.API_ENDPOINTS = config;
                console.log('✅ API endpoints loaded from external config');
                return config;
            }
        } catch (error) {
            // External config is optional, silently use defaults
        }
    }
    
    // Use built-in defaults, but override with ConfigService values if available
    const configServiceValues = await ConfigService.getConfig();
    if (configServiceValues.minEventDate) {
        API_ENDPOINTS_CONFIG.searchDefaults.minEventDate = configServiceValues.minEventDate;
    }
    if (configServiceValues.kibanaUrl) {
        API_ENDPOINTS_CONFIG.kibana.url = configServiceValues.kibanaUrl;
    }
    
    window.API_ENDPOINTS = API_ENDPOINTS_CONFIG;
    return API_ENDPOINTS_CONFIG;
}

// Auto-load on import
loadApiEndpoints();