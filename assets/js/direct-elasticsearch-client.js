/**
 * Direct Elasticsearch Client for CORS-enabled environments
 * This bypasses proxy issues when CORS extension is active
 */

export class DirectElasticsearchClient {
    constructor() {
        this.elasticsearchUrl = 'https://usieventho-prod-usw2.kb.us-west-2.aws.found.io:9243';
        this.indexPath = '/elasticsearch/usi*/_search';
    }

    /**
     * Get authentication cookie from localStorage
     */
    getAuthCookie() {
        try {
            const saved = localStorage.getItem('elasticCookie');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.expires && new Date(parsed.expires) > new Date()) {
                    return parsed.cookie;
                }
            }
        } catch (e) {
            console.warn('Failed to parse saved cookie:', e);
        }
        return null;
    }

    /**
     * Execute query directly to Elasticsearch (requires CORS extension)
     */
    async executeQuery(query) {
        const cookie = this.getAuthCookie();
        
        if (!cookie) {
            return {
                success: false,
                error: 'No authentication cookie found'
            };
        }

        const url = `${this.elasticsearchUrl}${this.indexPath}`;
        
        try {
            console.log('🔄 Attempting direct Elasticsearch connection...');
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': cookie
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

            console.log('✅ Direct Elasticsearch connection successful!');
            return {
                success: true,
                data: data,
                method: 'direct-elasticsearch'
            };

        } catch (error) {
            console.error('Direct Elasticsearch connection failed:', error);
            return {
                success: false,
                error: error.message,
                corsRequired: error.message.includes('CORS') || error.message.includes('fetch')
            };
        }
    }

    /**
     * Test connection
     */
    async testConnection() {
        const testQuery = {
            size: 0,
            query: { 
                bool: { 
                    filter: [{
                        range: {
                            "@timestamp": {
                                "gte": "now-1h"
                            }
                        }
                    }]
                }
            }
        };

        return await this.executeQuery(testQuery);
    }
}

// Create singleton instance
export const directClient = new DirectElasticsearchClient();
export default directClient; 