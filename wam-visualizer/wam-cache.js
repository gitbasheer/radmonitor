/**
 * WAM Cache Utility
 * Simple in-memory cache with TTL support for WAM visualizer
 * Based on existing caching patterns in the codebase
 */

export class WamCache {
    constructor() {
        this.cache = new Map();
        
        // Different TTLs for different data types
        this.CACHE_TTL = {
            current: 5 * 60 * 1000,      // 5 minutes for current data
            baseline: 30 * 60 * 1000,    // 30 minutes for historical baseline
            topEids: 10 * 60 * 1000,     // 10 minutes for top EIDs list
            stats: 15 * 60 * 1000        // 15 minutes for statistics
        };
        
        // Prevent memory leaks
        this.MAX_SIZE = 100;
        
        // Track cache performance
        this.stats = {
            hits: 0,
            misses: 0,
            evictions: 0
        };
    }
    
    /**
     * Generate cache key from query parameters
     */
    generateKey(type, ...params) {
        return `${type}:${JSON.stringify(params)}`;
    }
    
    /**
     * Get item from cache if not expired
     */
    get(key, ttlType = 'current') {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            const ttl = this.CACHE_TTL[ttlType] || this.CACHE_TTL.current;
            
            if (Date.now() - entry.timestamp < ttl) {
                this.stats.hits++;
                console.log(`📦 Cache hit for ${key.substring(0, 50)}...`);
                return entry.data;
            }
            
            // Expired - remove it
            this.cache.delete(key);
        }
        
        this.stats.misses++;
        return null;
    }
    
    /**
     * Store item in cache with LRU eviction
     */
    set(key, data) {
        // Evict oldest if at capacity
        if (this.cache.size >= this.MAX_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
            this.stats.evictions++;
            console.log(`🗑️ Cache eviction: removed oldest entry`);
        }
        
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        console.log(`💾 Cache set for ${key.substring(0, 50)}... (size: ${this.cache.size})`);
    }
    
    /**
     * Clear entire cache
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`🧹 Cache cleared (removed ${size} entries)`);
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(1)
            : 0;
            
        return {
            ...this.stats,
            size: this.cache.size,
            maxSize: this.MAX_SIZE,
            hitRate: `${hitRate}%`
        };
    }
    
    /**
     * Remove specific entries by pattern
     */
    invalidatePattern(pattern) {
        let removed = 0;
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
                removed++;
            }
        }
        if (removed > 0) {
            console.log(`🔄 Invalidated ${removed} cache entries matching "${pattern}"`);
        }
    }
}

// Create singleton instance
export const wamCache = new WamCache();