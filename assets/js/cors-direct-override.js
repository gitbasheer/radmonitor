/**
 * CORS Direct Override - Bypasses proxy when CORS extension is active
 * This provides immediate functionality while proxy issues are resolved
 */

// Override immediately when script loads
(function() {
    console.log('🔧 Initializing CORS Direct Override...');
    
    // Function to apply the override
    function applyCorsOverride() {
        if (window.UnifiedAPIClient) {
            // Override the executeQuery method to go direct to Elasticsearch
            const originalExecuteQuery = window.UnifiedAPIClient.executeQuery;
            
            window.UnifiedAPIClient.executeQuery = async function(query, forceRefresh = false) {
                console.log('🚀 Using direct Elasticsearch connection (CORS override)');
                
                // Get authentication cookie
                const auth = await this.getAuthenticationDetails();
                
                if (!auth.valid) {
                    return {
                        success: false,
                        error: 'No authentication available. Please set your cookie.'
                    };
                }
                
                // Check cache first
                const cacheKey = JSON.stringify(query);
                if (!forceRefresh && this.cache.has(cacheKey)) {
                    const cached = this.cache.get(cacheKey);
                    if (Date.now() - cached.timestamp < this.CACHE_TTL) {
                        console.log('📦 Using cached query result');
                        return { success: true, data: cached.data, cached: true };
                    }
                }
                
                // Direct Elasticsearch connection
                const esUrl = 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
                const esPath = '/elasticsearch/usi*/_search';
                
                try {
                    const response = await fetch(`${esUrl}${esPath}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Cookie': auth.cookie
                        },
                        body: JSON.stringify(query)
                    });
                    
                    if (!response.ok) {
                        if (response.status === 401 || response.status === 403) {
                            return {
                                success: false,
                                error: 'Authentication failed - cookie may be expired'
                            };
                        }
                        return {
                            success: false,
                            error: `HTTP ${response.status}: ${response.statusText}`
                        };
                    }
                    
                    const data = await response.json();
                    
                    if (data.error) {
                        return {
                            success: false,
                            error: `Elasticsearch error: ${data.error.reason || data.error.type}`
                        };
                    }
                    
                    // Cache successful results
                    this.cache.set(cacheKey, {
                        data: data,
                        timestamp: Date.now()
                    });
                    
                    console.log('✅ Direct Elasticsearch query successful!');
                    return {
                        success: true,
                        data: data,
                        method: 'direct-elasticsearch-override'
                    };
                    
                } catch (error) {
                    console.error('❌ Direct Elasticsearch connection failed:', error);
                    
                    // If direct fails and it's a CORS error, show helpful message
                    if (error.message.includes('CORS') || error.message.includes('fetch')) {
                        return {
                            success: false,
                            error: 'CORS extension required - please enable your CORS extension and refresh',
                            corsRequired: true
                        };
                    }
                    
                    return {
                        success: false,
                        error: error.message
                    };
                }
            };
            
            console.log('✅ CORS Direct Override activated - using direct Elasticsearch connection');
            
            // Also override the health check to reflect direct mode
            const originalCheckHealth = window.UnifiedAPIClient.checkHealth;
            window.UnifiedAPIClient.checkHealth = async function() {
                const auth = await this.getAuthenticationDetails();
                return { 
                    healthy: auth.valid, 
                    mode: 'direct-elasticsearch',
                    authenticated: auth.valid,
                    message: auth.valid ? 'Direct Elasticsearch connection ready' : 'No authentication cookie'
                };
            };
            
        } else {
            console.warn('⚠️ UnifiedAPIClient not found - CORS override not applied');
        }
    }
    
    // Set up an interceptor for when UnifiedAPIClient gets created
    let _unifiedAPIClient = null;
    Object.defineProperty(window, 'UnifiedAPIClient', {
        get: function() {
            return _unifiedAPIClient;
        },
        set: function(value) {
            _unifiedAPIClient = value;
            console.log('🔍 UnifiedAPIClient detected, applying CORS override...');
            // Apply override immediately when it gets set
            setTimeout(() => applyCorsOverride(), 0);
        },
        configurable: true
    });
    
    // Try to apply immediately, then retry if needed
    applyCorsOverride();
    
    // Also try to trigger a dashboard refresh after override is applied
    setTimeout(() => {
        if (window.Dashboard && window.Dashboard.refresh) {
            console.log('🔄 Triggering dashboard refresh after CORS override');
            window.Dashboard.refresh();
        }
    }, 1000);
})(); 