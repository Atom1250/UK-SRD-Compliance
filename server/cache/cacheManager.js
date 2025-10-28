/**
 * Cache Manager for ESG Client Interview Bot
 * Provides in-memory caching for session data and OpenAI responses
 */

class CacheManager {
  constructor(options = {}) {
    this.sessionCache = new Map();
    this.openAiCache = new Map();
    this.queryCache = new Map();
    
    // Configuration
    this.config = {
      sessionCacheTTL: options.sessionCacheTTL || 30 * 60 * 1000, // 30 minutes
      openAiCacheTTL: options.openAiCacheTTL || 60 * 60 * 1000, // 1 hour
      queryCacheTTL: options.queryCacheTTL || 15 * 60 * 1000, // 15 minutes
      maxSessionCacheSize: options.maxSessionCacheSize || 1000,
      maxOpenAiCacheSize: options.maxOpenAiCacheSize || 500,
      maxQueryCacheSize: options.maxQueryCacheSize || 200,
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000 // 5 minutes
    };
    
    // Statistics
    this.stats = {
      sessionHits: 0,
      sessionMisses: 0,
      openAiHits: 0,
      openAiMisses: 0,
      queryHits: 0,
      queryMisses: 0,
      evictions: 0,
      cleanups: 0
    };
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Session caching methods
   */
  
  getSession(sessionId) {
    const entry = this.sessionCache.get(sessionId);
    
    if (!entry) {
      this.stats.sessionMisses++;
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.sessionCache.delete(sessionId);
      this.stats.sessionMisses++;
      return null;
    }
    
    // Update access time for LRU
    entry.lastAccessed = Date.now();
    this.stats.sessionHits++;
    
    return structuredClone(entry.data);
  }
  
  setSession(sessionId, sessionData) {
    // Enforce cache size limit
    if (this.sessionCache.size >= this.config.maxSessionCacheSize) {
      this.evictLRU(this.sessionCache);
    }
    
    const entry = {
      data: structuredClone(sessionData),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ttl: this.config.sessionCacheTTL
    };
    
    this.sessionCache.set(sessionId, entry);
  }
  
  invalidateSession(sessionId) {
    return this.sessionCache.delete(sessionId);
  }
  
  /**
   * OpenAI response caching methods
   */
  
  getOpenAiResponse(requestHash) {
    const entry = this.openAiCache.get(requestHash);
    
    if (!entry) {
      this.stats.openAiMisses++;
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.openAiCache.delete(requestHash);
      this.stats.openAiMisses++;
      return null;
    }
    
    entry.lastAccessed = Date.now();
    this.stats.openAiHits++;
    
    return structuredClone(entry.data);
  }
  
  setOpenAiResponse(requestHash, responseData) {
    // Don't cache error responses or stub responses
    if (responseData.compliance?.notes?.some(note => 
      note.includes('stub') || note.includes('error') || note.includes('fallback')
    )) {
      return;
    }
    
    // Enforce cache size limit
    if (this.openAiCache.size >= this.config.maxOpenAiCacheSize) {
      this.evictLRU(this.openAiCache);
    }
    
    const entry = {
      data: structuredClone(responseData),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ttl: this.config.openAiCacheTTL
    };
    
    this.openAiCache.set(requestHash, entry);
  }
  
  /**
   * Database query caching methods
   */
  
  getQueryResult(queryHash) {
    const entry = this.queryCache.get(queryHash);
    
    if (!entry) {
      this.stats.queryMisses++;
      return null;
    }
    
    if (this.isExpired(entry)) {
      this.queryCache.delete(queryHash);
      this.stats.queryMisses++;
      return null;
    }
    
    entry.lastAccessed = Date.now();
    this.stats.queryHits++;
    
    return structuredClone(entry.data);
  }
  
  setQueryResult(queryHash, resultData) {
    // Enforce cache size limit
    if (this.queryCache.size >= this.config.maxQueryCacheSize) {
      this.evictLRU(this.queryCache);
    }
    
    const entry = {
      data: structuredClone(resultData),
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      ttl: this.config.queryCacheTTL
    };
    
    this.queryCache.set(queryHash, entry);
  }
  
  /**
   * Utility methods
   */
  
  isExpired(entry) {
    return Date.now() - entry.createdAt > entry.ttl;
  }
  
  evictLRU(cache) {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }
  
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean expired session cache entries
    for (const [key, entry] of this.sessionCache.entries()) {
      if (this.isExpired(entry)) {
        this.sessionCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean expired OpenAI cache entries
    for (const [key, entry] of this.openAiCache.entries()) {
      if (this.isExpired(entry)) {
        this.openAiCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean expired query cache entries
    for (const [key, entry] of this.queryCache.entries()) {
      if (this.isExpired(entry)) {
        this.queryCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this.stats.cleanups++;
    }
  }
  
  /**
   * Cache management methods
   */
  
  clear() {
    this.sessionCache.clear();
    this.openAiCache.clear();
    this.queryCache.clear();
  }
  
  getStats() {
    const sessionHitRate = this.stats.sessionHits + this.stats.sessionMisses > 0 
      ? (this.stats.sessionHits / (this.stats.sessionHits + this.stats.sessionMisses) * 100).toFixed(2)
      : '0.00';
      
    const openAiHitRate = this.stats.openAiHits + this.stats.openAiMisses > 0
      ? (this.stats.openAiHits / (this.stats.openAiHits + this.stats.openAiMisses) * 100).toFixed(2)
      : '0.00';
      
    const queryHitRate = this.stats.queryHits + this.stats.queryMisses > 0
      ? (this.stats.queryHits / (this.stats.queryHits + this.stats.queryMisses) * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.stats,
      hitRates: {
        session: `${sessionHitRate}%`,
        openAi: `${openAiHitRate}%`,
        query: `${queryHitRate}%`
      },
      cacheSizes: {
        session: this.sessionCache.size,
        openAi: this.openAiCache.size,
        query: this.queryCache.size
      },
      memoryUsage: this.getMemoryUsage()
    };
  }
  
  getMemoryUsage() {
    // Rough estimation of memory usage
    let totalSize = 0;
    
    for (const entry of this.sessionCache.values()) {
      totalSize += JSON.stringify(entry.data).length;
    }
    
    for (const entry of this.openAiCache.values()) {
      totalSize += JSON.stringify(entry.data).length;
    }
    
    for (const entry of this.queryCache.values()) {
      totalSize += JSON.stringify(entry.data).length;
    }
    
    return {
      estimatedBytes: totalSize,
      estimatedMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
  
  /**
   * Hash generation for cache keys
   */
  
  static generateHash(data) {
    // Simple hash function for cache keys
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
  
  /**
   * Warmup cache with frequently accessed data
   */
  
  warmup(sessions = []) {
    sessions.forEach(session => {
      if (session && session.id) {
        this.setSession(session.id, session);
      }
    });
  }
  
  /**
   * Cleanup and shutdown
   */
  
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.clear();
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// Graceful shutdown
process.on('SIGTERM', () => {
  cacheManager.destroy();
});

process.on('SIGINT', () => {
  cacheManager.destroy();
});

export default cacheManager;
export { CacheManager };