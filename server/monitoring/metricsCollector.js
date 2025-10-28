/**
 * Metrics Collector for ESG Client Interview Bot
 * Collects and aggregates performance metrics and system health data
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      // Request metrics
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        byEndpoint: new Map(),
        responseTimeSum: 0,
        responseTimeCount: 0,
        slowRequests: 0 // > 5 seconds
      },
      
      // Session metrics
      sessions: {
        created: 0,
        completed: 0,
        abandoned: 0,
        averageDuration: 0,
        totalDuration: 0,
        durationCount: 0,
        byStage: new Map(),
        conversionRates: new Map()
      },
      
      // OpenAI metrics
      openai: {
        requests: 0,
        successful: 0,
        failed: 0,
        cached: 0,
        totalTokens: 0,
        totalCost: 0,
        averageResponseTime: 0,
        responseTimeSum: 0,
        responseTimeCount: 0,
        rateLimited: 0,
        timeouts: 0
      },
      
      // Cache metrics
      cache: {
        hits: 0,
        misses: 0,
        evictions: 0,
        memoryUsage: 0,
        hitRate: 0
      },
      
      // Database metrics
      database: {
        reads: 0,
        writes: 0,
        deletes: 0,
        averageQueryTime: 0,
        queryTimeSum: 0,
        queryTimeCount: 0,
        slowQueries: 0 // > 1 second
      },
      
      // Error metrics
      errors: {
        total: 0,
        byType: new Map(),
        byEndpoint: new Map(),
        critical: 0,
        warnings: 0
      },
      
      // System metrics
      system: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        peakConnections: 0
      }
    };
    
    this.startTime = Date.now();
    this.alerts = [];
    this.thresholds = {
      slowRequestMs: 5000,
      slowQueryMs: 1000,
      highMemoryMB: 512,
      lowCacheHitRate: 0.7,
      highErrorRate: 0.05,
      maxActiveConnections: 100
    };
    
    // Start periodic collection
    this.collectionInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.checkThresholds();
    }, 30000); // Every 30 seconds
  }
  
  /**
   * Request tracking methods
   */
  
  recordRequest(endpoint, responseTime, success = true) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Track by endpoint
    if (!this.metrics.requests.byEndpoint.has(endpoint)) {
      this.metrics.requests.byEndpoint.set(endpoint, {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimeSum: 0,
        responseTimeCount: 0
      });
    }
    
    const endpointMetrics = this.metrics.requests.byEndpoint.get(endpoint);
    endpointMetrics.total++;
    
    if (success) {
      endpointMetrics.successful++;
    } else {
      endpointMetrics.failed++;
    }
    
    // Track response times
    if (responseTime) {
      this.metrics.requests.responseTimeSum += responseTime;
      this.metrics.requests.responseTimeCount++;
      
      endpointMetrics.responseTimeSum += responseTime;
      endpointMetrics.responseTimeCount++;
      endpointMetrics.averageResponseTime = 
        endpointMetrics.responseTimeSum / endpointMetrics.responseTimeCount;
      
      if (responseTime > this.thresholds.slowRequestMs) {
        this.metrics.requests.slowRequests++;
      }
    }
  }
  
  /**
   * Session tracking methods
   */
  
  recordSessionCreated() {
    this.metrics.sessions.created++;
  }
  
  recordSessionCompleted(duration) {
    this.metrics.sessions.completed++;
    
    if (duration) {
      this.metrics.sessions.totalDuration += duration;
      this.metrics.sessions.durationCount++;
      this.metrics.sessions.averageDuration = 
        this.metrics.sessions.totalDuration / this.metrics.sessions.durationCount;
    }
  }
  
  recordSessionAbandoned() {
    this.metrics.sessions.abandoned++;
  }
  
  recordStageTransition(fromStage, toStage) {
    if (!this.metrics.sessions.byStage.has(fromStage)) {
      this.metrics.sessions.byStage.set(fromStage, {
        entered: 0,
        completed: 0,
        abandoned: 0
      });
    }
    
    if (!this.metrics.sessions.byStage.has(toStage)) {
      this.metrics.sessions.byStage.set(toStage, {
        entered: 0,
        completed: 0,
        abandoned: 0
      });
    }
    
    this.metrics.sessions.byStage.get(fromStage).completed++;
    this.metrics.sessions.byStage.get(toStage).entered++;
    
    // Calculate conversion rates
    const fromMetrics = this.metrics.sessions.byStage.get(fromStage);
    if (fromMetrics.entered > 0) {
      const conversionRate = fromMetrics.completed / fromMetrics.entered;
      this.metrics.sessions.conversionRates.set(fromStage, conversionRate);
    }
  }
  
  /**
   * OpenAI tracking methods
   */
  
  recordOpenAIRequest(responseTime, success = true, cached = false, tokens = 0) {
    this.metrics.openai.requests++;
    
    if (cached) {
      this.metrics.openai.cached++;
      return;
    }
    
    if (success) {
      this.metrics.openai.successful++;
    } else {
      this.metrics.openai.failed++;
    }
    
    if (tokens) {
      this.metrics.openai.totalTokens += tokens;
      // Rough cost estimation (GPT-4o-mini pricing)
      this.metrics.openai.totalCost += (tokens / 1000) * 0.00015;
    }
    
    if (responseTime) {
      this.metrics.openai.responseTimeSum += responseTime;
      this.metrics.openai.responseTimeCount++;
      this.metrics.openai.averageResponseTime = 
        this.metrics.openai.responseTimeSum / this.metrics.openai.responseTimeCount;
    }
  }
  
  recordOpenAIRateLimit() {
    this.metrics.openai.rateLimited++;
  }
  
  recordOpenAITimeout() {
    this.metrics.openai.timeouts++;
  }
  
  /**
   * Cache tracking methods
   */
  
  updateCacheMetrics(cacheStats) {
    this.metrics.cache.hits = cacheStats.sessionHits + cacheStats.openAiHits + cacheStats.queryHits;
    this.metrics.cache.misses = cacheStats.sessionMisses + cacheStats.openAiMisses + cacheStats.queryMisses;
    this.metrics.cache.evictions = cacheStats.evictions;
    
    const totalRequests = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate = totalRequests > 0 ? this.metrics.cache.hits / totalRequests : 0;
    
    if (cacheStats.memoryUsage) {
      this.metrics.cache.memoryUsage = parseFloat(cacheStats.memoryUsage.estimatedMB);
    }
  }
  
  /**
   * Database tracking methods
   */
  
  recordDatabaseOperation(operation, queryTime) {
    switch (operation) {
      case 'read':
        this.metrics.database.reads++;
        break;
      case 'write':
        this.metrics.database.writes++;
        break;
      case 'delete':
        this.metrics.database.deletes++;
        break;
    }
    
    if (queryTime) {
      this.metrics.database.queryTimeSum += queryTime;
      this.metrics.database.queryTimeCount++;
      this.metrics.database.averageQueryTime = 
        this.metrics.database.queryTimeSum / this.metrics.database.queryTimeCount;
      
      if (queryTime > this.thresholds.slowQueryMs) {
        this.metrics.database.slowQueries++;
      }
    }
  }
  
  /**
   * Error tracking methods
   */
  
  recordError(error, endpoint = null, critical = false) {
    this.metrics.errors.total++;
    
    if (critical) {
      this.metrics.errors.critical++;
    } else {
      this.metrics.errors.warnings++;
    }
    
    // Track by error type
    const errorType = error.name || error.constructor.name || 'Unknown';
    if (!this.metrics.errors.byType.has(errorType)) {
      this.metrics.errors.byType.set(errorType, 0);
    }
    this.metrics.errors.byType.set(errorType, this.metrics.errors.byType.get(errorType) + 1);
    
    // Track by endpoint
    if (endpoint) {
      if (!this.metrics.errors.byEndpoint.has(endpoint)) {
        this.metrics.errors.byEndpoint.set(endpoint, 0);
      }
      this.metrics.errors.byEndpoint.set(endpoint, this.metrics.errors.byEndpoint.get(endpoint) + 1);
    }
  }
  
  /**
   * System metrics collection
   */
  
  collectSystemMetrics() {
    this.metrics.system.uptime = Date.now() - this.startTime;
    
    // Memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.metrics.system.memoryUsage = Math.round(memUsage.heapUsed / 1024 / 1024); // MB
    }
    
    // CPU usage (simplified - would need more sophisticated monitoring in production)
    this.metrics.system.cpuUsage = process.cpuUsage ? 
      Math.round((process.cpuUsage().user + process.cpuUsage().system) / 1000000) : 0;
  }
  
  recordConnection(active = true) {
    if (active) {
      this.metrics.system.activeConnections++;
      if (this.metrics.system.activeConnections > this.metrics.system.peakConnections) {
        this.metrics.system.peakConnections = this.metrics.system.activeConnections;
      }
    } else {
      this.metrics.system.activeConnections = Math.max(0, this.metrics.system.activeConnections - 1);
    }
  }
  
  /**
   * Threshold monitoring and alerting
   */
  
  checkThresholds() {
    const alerts = [];
    
    // Check error rate
    const totalRequests = this.metrics.requests.total;
    if (totalRequests > 100) { // Only check after sufficient requests
      const errorRate = this.metrics.requests.failed / totalRequests;
      if (errorRate > this.thresholds.highErrorRate) {
        alerts.push({
          type: 'high_error_rate',
          severity: 'warning',
          message: `Error rate is ${(errorRate * 100).toFixed(2)}% (threshold: ${(this.thresholds.highErrorRate * 100)}%)`,
          value: errorRate,
          threshold: this.thresholds.highErrorRate
        });
      }
    }
    
    // Check memory usage
    if (this.metrics.system.memoryUsage > this.thresholds.highMemoryMB) {
      alerts.push({
        type: 'high_memory_usage',
        severity: 'warning',
        message: `Memory usage is ${this.metrics.system.memoryUsage}MB (threshold: ${this.thresholds.highMemoryMB}MB)`,
        value: this.metrics.system.memoryUsage,
        threshold: this.thresholds.highMemoryMB
      });
    }
    
    // Check cache hit rate
    if (this.metrics.cache.hitRate < this.thresholds.lowCacheHitRate && 
        (this.metrics.cache.hits + this.metrics.cache.misses) > 100) {
      alerts.push({
        type: 'low_cache_hit_rate',
        severity: 'info',
        message: `Cache hit rate is ${(this.metrics.cache.hitRate * 100).toFixed(2)}% (threshold: ${(this.thresholds.lowCacheHitRate * 100)}%)`,
        value: this.metrics.cache.hitRate,
        threshold: this.thresholds.lowCacheHitRate
      });
    }
    
    // Check active connections
    if (this.metrics.system.activeConnections > this.thresholds.maxActiveConnections) {
      alerts.push({
        type: 'high_connection_count',
        severity: 'critical',
        message: `Active connections: ${this.metrics.system.activeConnections} (threshold: ${this.thresholds.maxActiveConnections})`,
        value: this.metrics.system.activeConnections,
        threshold: this.thresholds.maxActiveConnections
      });
    }
    
    // Store new alerts
    const timestamp = new Date().toISOString();
    alerts.forEach(alert => {
      alert.timestamp = timestamp;
      this.alerts.push(alert);
    });
    
    // Keep only recent alerts (last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > oneDayAgo
    );
    
    return alerts;
  }
  
  /**
   * Reporting methods
   */
  
  getMetrics() {
    // Convert Maps to Objects for JSON serialization
    const serializedMetrics = JSON.parse(JSON.stringify(this.metrics, (key, value) => {
      if (value instanceof Map) {
        return Object.fromEntries(value);
      }
      return value;
    }));
    
    return {
      ...serializedMetrics,
      timestamp: new Date().toISOString(),
      uptime: this.metrics.system.uptime
    };
  }
  
  getHealthStatus() {
    const recentAlerts = this.alerts.filter(alert => 
      Date.now() - new Date(alert.timestamp).getTime() < 5 * 60 * 1000 // Last 5 minutes
    );
    
    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical');
    const warningAlerts = recentAlerts.filter(alert => alert.severity === 'warning');
    
    let status = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (warningAlerts.length > 0) {
      status = 'warning';
    }
    
    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: this.metrics.system.uptime,
      alerts: recentAlerts,
      summary: {
        totalRequests: this.metrics.requests.total,
        errorRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.failed / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: this.metrics.requests.responseTimeCount > 0 ?
          Math.round(this.metrics.requests.responseTimeSum / this.metrics.requests.responseTimeCount) + 'ms' : '0ms',
        cacheHitRate: (this.metrics.cache.hitRate * 100).toFixed(2) + '%',
        memoryUsage: this.metrics.system.memoryUsage + 'MB',
        activeConnections: this.metrics.system.activeConnections
      }
    };
  }
  
  getAlerts(severity = null, limit = 50) {
    let filteredAlerts = [...this.alerts];
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }
    
    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return filteredAlerts.slice(0, limit);
  }
  
  /**
   * Reset and cleanup
   */
  
  reset() {
    // Reset all metrics but keep configuration
    Object.keys(this.metrics).forEach(key => {
      if (typeof this.metrics[key] === 'object' && this.metrics[key] instanceof Map) {
        this.metrics[key].clear();
      } else if (typeof this.metrics[key] === 'object') {
        Object.keys(this.metrics[key]).forEach(subKey => {
          if (this.metrics[key][subKey] instanceof Map) {
            this.metrics[key][subKey].clear();
          } else if (typeof this.metrics[key][subKey] === 'number') {
            this.metrics[key][subKey] = 0;
          }
        });
      }
    });
    
    this.startTime = Date.now();
    this.alerts = [];
  }
  
  destroy() {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

// Graceful shutdown
process.on('SIGTERM', () => {
  metricsCollector.destroy();
});

process.on('SIGINT', () => {
  metricsCollector.destroy();
});

export default metricsCollector;
export { MetricsCollector };