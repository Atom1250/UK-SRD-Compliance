/**
 * Dashboard API for System Health Monitoring
 * Provides endpoints for operational dashboards and system monitoring
 */

import metricsCollector from './metricsCollector.js';
import performanceMonitor from './performanceMonitor.js';
import logger from './logger.js';
import cacheManager from '../cache/cacheManager.js';

/**
 * Dashboard API routes
 */
export const dashboardRoutes = {
  
  /**
   * GET /api/dashboard/health
   * System health overview
   */
  getHealth: async (req, res) => {
    try {
      const health = metricsCollector.getHealthStatus();
      
      // Run health checks
      const healthChecks = await Promise.allSettled([
        performanceMonitor.healthChecks.database(),
        performanceMonitor.healthChecks.cache(),
        performanceMonitor.healthChecks.openai()
      ]);
      
      const checks = {
        database: healthChecks[0].status === 'fulfilled' ? healthChecks[0].value : { status: 'error', error: healthChecks[0].reason.message },
        cache: healthChecks[1].status === 'fulfilled' ? healthChecks[1].value : { status: 'error', error: healthChecks[1].reason.message },
        openai: healthChecks[2].status === 'fulfilled' ? healthChecks[2].value : { status: 'error', error: healthChecks[2].reason.message }
      };
      
      res.json({
        ...health,
        healthChecks: checks,
        systemResources: performanceMonitor.getSystemResources()
      });
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/health' });
      res.status(500).json({ error: 'Failed to get health status' });
    }
  },
  
  /**
   * GET /api/dashboard/metrics
   * Comprehensive metrics data
   */
  getMetrics: async (req, res) => {
    try {
      const metrics = metricsCollector.getMetrics();
      const cacheStats = cacheManager.getStats();
      
      res.json({
        ...metrics,
        cache: cacheStats
      });
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/metrics' });
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  },
  
  /**
   * GET /api/dashboard/alerts
   * Recent alerts and warnings
   */
  getAlerts: async (req, res) => {
    try {
      const { severity, limit } = req.query;
      const alerts = metricsCollector.getAlerts(severity, parseInt(limit) || 50);
      
      res.json({
        alerts,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          info: alerts.filter(a => a.severity === 'info').length
        }
      });
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/alerts' });
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  },
  
  /**
   * GET /api/dashboard/performance
   * Performance metrics and trends
   */
  getPerformance: async (req, res) => {
    try {
      const metrics = metricsCollector.getMetrics();
      
      const performance = {
        requests: {
          total: metrics.requests.total,
          successful: metrics.requests.successful,
          failed: metrics.requests.failed,
          errorRate: metrics.requests.total > 0 ? 
            (metrics.requests.failed / metrics.requests.total * 100).toFixed(2) : 0,
          averageResponseTime: metrics.requests.responseTimeCount > 0 ?
            Math.round(metrics.requests.responseTimeSum / metrics.requests.responseTimeCount) : 0,
          slowRequests: metrics.requests.slowRequests
        },
        
        sessions: {
          created: metrics.sessions.created,
          completed: metrics.sessions.completed,
          abandoned: metrics.sessions.abandoned,
          completionRate: metrics.sessions.created > 0 ?
            (metrics.sessions.completed / metrics.sessions.created * 100).toFixed(2) : 0,
          averageDuration: Math.round(metrics.sessions.averageDuration / 1000 / 60) // minutes
        },
        
        openai: {
          requests: metrics.openai.requests,
          successful: metrics.openai.successful,
          failed: metrics.openai.failed,
          cached: metrics.openai.cached,
          cacheRate: metrics.openai.requests > 0 ?
            (metrics.openai.cached / metrics.openai.requests * 100).toFixed(2) : 0,
          averageResponseTime: Math.round(metrics.openai.averageResponseTime),
          totalTokens: metrics.openai.totalTokens,
          estimatedCost: metrics.openai.totalCost.toFixed(4)
        },
        
        database: {
          reads: metrics.database.reads,
          writes: metrics.database.writes,
          deletes: metrics.database.deletes,
          averageQueryTime: Math.round(metrics.database.averageQueryTime),
          slowQueries: metrics.database.slowQueries
        }
      };
      
      res.json(performance);
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/performance' });
      res.status(500).json({ error: 'Failed to get performance data' });
    }
  },
  
  /**
   * GET /api/dashboard/sessions
   * Session analytics and statistics
   */
  getSessions: async (req, res) => {
    try {
      const { getSessionStatistics } = await import('../state/sessionStore.js');
      const stats = getSessionStatistics();
      const metrics = metricsCollector.getMetrics();
      
      const sessionData = {
        overview: {
          total: stats.total,
          active: stats.active,
          completed: stats.completed,
          archived: stats.archived,
          averageDuration: stats.averageSessionDuration
        },
        
        byStage: stats.byStage,
        byClientType: stats.byClientType,
        
        conversionRates: Object.fromEntries(metrics.sessions.conversionRates || []),
        
        trends: {
          created: metrics.sessions.created,
          completed: metrics.sessions.completed,
          abandoned: metrics.sessions.abandoned,
          completionRate: metrics.sessions.created > 0 ?
            (metrics.sessions.completed / metrics.sessions.created * 100).toFixed(2) : 0
        },
        
        oldest: stats.oldestSession,
        newest: stats.newestSession
      };
      
      res.json(sessionData);
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/sessions' });
      res.status(500).json({ error: 'Failed to get session data' });
    }
  },
  
  /**
   * GET /api/dashboard/logs
   * Recent logs and log file information
   */
  getLogs: async (req, res) => {
    try {
      const { file, lines, search } = req.query;
      
      if (search) {
        const results = logger.searchLogs(search, parseInt(lines) || 100);
        res.json({ searchResults: results });
        return;
      }
      
      if (file) {
        const content = logger.readLogFile(file, parseInt(lines) || 100);
        res.json({ file, content });
        return;
      }
      
      const logFiles = logger.getLogFiles();
      res.json({ logFiles });
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/logs' });
      res.status(500).json({ error: 'Failed to get log data' });
    }
  },
  
  /**
   * GET /api/dashboard/cache
   * Cache statistics and performance
   */
  getCache: async (req, res) => {
    try {
      const stats = cacheManager.getStats();
      
      const cacheData = {
        performance: {
          hitRates: stats.hitRates,
          totalHits: stats.sessionHits + stats.openAiHits + stats.queryHits,
          totalMisses: stats.sessionMisses + stats.openAiMisses + stats.queryMisses,
          evictions: stats.evictions,
          cleanups: stats.cleanups
        },
        
        breakdown: {
          session: {
            hits: stats.sessionHits,
            misses: stats.sessionMisses,
            hitRate: stats.hitRates.session
          },
          openai: {
            hits: stats.openAiHits,
            misses: stats.openAiMisses,
            hitRate: stats.hitRates.openAi
          },
          query: {
            hits: stats.queryHits,
            misses: stats.queryMisses,
            hitRate: stats.hitRates.query
          }
        },
        
        memory: stats.memoryUsage,
        sizes: stats.cacheSizes
      };
      
      res.json(cacheData);
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/cache' });
      res.status(500).json({ error: 'Failed to get cache data' });
    }
  },
  
  /**
   * POST /api/dashboard/cache/clear
   * Clear cache (admin operation)
   */
  clearCache: async (req, res) => {
    try {
      const { type } = req.body;
      
      if (type === 'all') {
        cacheManager.clear();
        logger.logAudit('cache_cleared', null, req.ip, { type: 'all' });
      } else {
        // Could implement selective clearing by type
        res.status(400).json({ error: 'Invalid cache clear type' });
        return;
      }
      
      res.json({ success: true, message: 'Cache cleared successfully' });
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/cache/clear' });
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  },
  
  /**
   * POST /api/dashboard/metrics/reset
   * Reset metrics (admin operation)
   */
  resetMetrics: async (req, res) => {
    try {
      metricsCollector.reset();
      logger.logAudit('metrics_reset', null, req.ip);
      
      res.json({ success: true, message: 'Metrics reset successfully' });
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/metrics/reset' });
      res.status(500).json({ error: 'Failed to reset metrics' });
    }
  },
  
  /**
   * GET /api/dashboard/system
   * System resource information
   */
  getSystem: async (req, res) => {
    try {
      const resources = performanceMonitor.getSystemResources();
      const metrics = metricsCollector.getMetrics();
      
      const systemData = {
        resources,
        connections: {
          active: metrics.system.activeConnections,
          peak: metrics.system.peakConnections
        },
        uptime: {
          process: Math.round(process.uptime()),
          system: metrics.system.uptime
        },
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          env: process.env.NODE_ENV || 'development'
        }
      };
      
      res.json(systemData);
    } catch (error) {
      logger.logError(error, { endpoint: '/api/dashboard/system' });
      res.status(500).json({ error: 'Failed to get system data' });
    }
  }
};

/**
 * Register dashboard routes with Express router
 */
export const registerDashboardRoutes = (router) => {
  router.get('/dashboard/health', dashboardRoutes.getHealth);
  router.get('/dashboard/metrics', dashboardRoutes.getMetrics);
  router.get('/dashboard/alerts', dashboardRoutes.getAlerts);
  router.get('/dashboard/performance', dashboardRoutes.getPerformance);
  router.get('/dashboard/sessions', dashboardRoutes.getSessions);
  router.get('/dashboard/logs', dashboardRoutes.getLogs);
  router.get('/dashboard/cache', dashboardRoutes.getCache);
  router.get('/dashboard/system', dashboardRoutes.getSystem);
  
  // Admin operations
  router.post('/dashboard/cache/clear', dashboardRoutes.clearCache);
  router.post('/dashboard/metrics/reset', dashboardRoutes.resetMetrics);
};

export default {
  dashboardRoutes,
  registerDashboardRoutes
};