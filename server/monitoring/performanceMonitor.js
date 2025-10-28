/**
 * Performance Monitor Middleware
 * Tracks request performance and system health
 */

import metricsCollector from './metricsCollector.js';
import cacheManager from '../cache/cacheManager.js';

/**
 * Express middleware for performance monitoring
 */
export const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Track connection
  metricsCollector.recordConnection(true);
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    const success = res.statusCode < 400;
    
    // Record request metrics
    metricsCollector.recordRequest(
      req.route?.path || req.path || req.url,
      responseTime,
      success
    );
    
    // Track connection end
    metricsCollector.recordConnection(false);
    
    // Call original end
    originalEnd.apply(this, args);
  };
  
  // Handle errors
  res.on('error', (error) => {
    metricsCollector.recordError(error, req.path, true);
  });
  
  next();
};

/**
 * Database operation monitoring wrapper
 */
export const monitorDatabaseOperation = (operation, fn) => {
  return async (...args) => {
    const startTime = Date.now();
    
    try {
      const result = await fn(...args);
      const queryTime = Date.now() - startTime;
      
      metricsCollector.recordDatabaseOperation(operation, queryTime);
      
      return result;
    } catch (error) {
      const queryTime = Date.now() - startTime;
      metricsCollector.recordDatabaseOperation(operation, queryTime);
      metricsCollector.recordError(error, null, true);
      throw error;
    }
  };
};

/**
 * OpenAI request monitoring wrapper
 */
export const monitorOpenAIRequest = async (requestFn, requestData) => {
  const startTime = Date.now();
  
  try {
    // Check if response is cached
    const requestHash = cacheManager.constructor.generateHash(requestData);
    const cached = cacheManager.getOpenAiResponse(requestHash);
    
    if (cached) {
      metricsCollector.recordOpenAIRequest(0, true, true);
      return cached;
    }
    
    // Make actual request
    const result = await requestFn();
    const responseTime = Date.now() - startTime;
    
    // Estimate tokens (rough approximation)
    const estimatedTokens = JSON.stringify(result).length / 4;
    
    metricsCollector.recordOpenAIRequest(responseTime, true, false, estimatedTokens);
    
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Track specific error types
    if (error.message?.includes('rate limit') || error.status === 429) {
      metricsCollector.recordOpenAIRateLimit();
    } else if (error.message?.includes('timeout')) {
      metricsCollector.recordOpenAITimeout();
    }
    
    metricsCollector.recordOpenAIRequest(responseTime, false, false);
    metricsCollector.recordError(error, 'openai', true);
    
    throw error;
  }
};

/**
 * Session lifecycle monitoring
 */
export const monitorSessionLifecycle = {
  created: (sessionId) => {
    metricsCollector.recordSessionCreated();
  },
  
  completed: (sessionId, duration) => {
    metricsCollector.recordSessionCompleted(duration);
  },
  
  abandoned: (sessionId) => {
    metricsCollector.recordSessionAbandoned();
  },
  
  stageTransition: (sessionId, fromStage, toStage) => {
    metricsCollector.recordStageTransition(fromStage, toStage);
  }
};

/**
 * Periodic cache metrics update
 */
export const updateCacheMetrics = () => {
  const cacheStats = cacheManager.getStats();
  metricsCollector.updateCacheMetrics(cacheStats);
};

// Update cache metrics every minute
setInterval(updateCacheMetrics, 60000);

/**
 * Error boundary for async operations
 */
export const withErrorMonitoring = (fn, context = 'unknown') => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      metricsCollector.recordError(error, context, true);
      throw error;
    }
  };
};

/**
 * Performance profiler for critical operations
 */
export class PerformanceProfiler {
  constructor(operationName) {
    this.operationName = operationName;
    this.startTime = Date.now();
    this.checkpoints = [];
  }
  
  checkpoint(name) {
    const now = Date.now();
    this.checkpoints.push({
      name,
      timestamp: now,
      elapsed: now - this.startTime
    });
  }
  
  finish() {
    const endTime = Date.now();
    const totalTime = endTime - this.startTime;
    
    const profile = {
      operation: this.operationName,
      totalTime,
      checkpoints: this.checkpoints,
      timestamp: new Date().toISOString()
    };
    
    // Log slow operations
    if (totalTime > 5000) { // 5 seconds
      console.warn(`Slow operation detected: ${this.operationName} took ${totalTime}ms`, profile);
    }
    
    return profile;
  }
}

/**
 * Health check utilities
 */
export const healthChecks = {
  database: async () => {
    try {
      const { fetchSessions } = await import('../db/sqlite.js');
      const startTime = Date.now();
      await fetchSessions();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Database connection failed'
      };
    }
  },
  
  cache: async () => {
    try {
      const stats = cacheManager.getStats();
      const memoryUsage = parseFloat(stats.memoryUsage.estimatedMB);
      
      return {
        status: memoryUsage < 100 ? 'healthy' : 'warning',
        memoryUsage: `${memoryUsage}MB`,
        hitRates: stats.hitRates,
        message: memoryUsage < 100 ? 'Cache operating normally' : 'High cache memory usage'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Cache health check failed'
      };
    }
  },
  
  openai: async () => {
    try {
      // Simple test request to check OpenAI connectivity
      const { callComplianceResponder } = await import('../integrations/openAiClient.js');
      const startTime = Date.now();
      
      await callComplianceResponder({
        messages: [{ role: 'user', content: 'health check' }]
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        message: 'OpenAI API connection successful'
      };
    } catch (error) {
      return {
        status: error.status === 401 ? 'warning' : 'unhealthy',
        error: error.message,
        message: error.status === 401 ? 'OpenAI API key issue' : 'OpenAI API connection failed'
      };
    }
  }
};

/**
 * System resource monitoring
 */
export const getSystemResources = () => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  return {
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      external: Math.round(memUsage.external / 1024 / 1024), // MB
      rss: Math.round(memUsage.rss / 1024 / 1024) // MB
    },
    cpu: {
      user: Math.round(cpuUsage.user / 1000), // ms
      system: Math.round(cpuUsage.system / 1000) // ms
    },
    uptime: Math.round(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
};

export default {
  performanceMiddleware,
  monitorDatabaseOperation,
  monitorOpenAIRequest,
  monitorSessionLifecycle,
  updateCacheMetrics,
  withErrorMonitoring,
  PerformanceProfiler,
  healthChecks,
  getSystemResources
};