/**
 * Production Configuration
 * Environment-specific settings for production deployment
 */

export const productionConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 8080,
    host: process.env.HOST || '0.0.0.0',
    timeout: parseInt(process.env.SERVER_TIMEOUT) || 30000,
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000,
    headersTimeout: parseInt(process.env.HEADERS_TIMEOUT) || 60000,
    maxHeaderSize: parseInt(process.env.MAX_HEADER_SIZE) || 16384
  },

  // Database Configuration
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    sqlite: {
      path: process.env.SQLITE_PATH || './data/production.db',
      options: {
        busyTimeout: 30000,
        journal_mode: 'WAL',
        synchronous: 'NORMAL',
        cache_size: -64000, // 64MB cache
        temp_store: 'MEMORY'
      }
    },
    postgresql: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.DB_SSL === 'true',
      pool: {
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000
      }
    }
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES) || 3,
    stub: process.env.OPENAI_STUB === 'true',
    strict: process.env.OPENAI_STRICT === 'true'
  },

  // Security Configuration
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false,
      credentials: process.env.CORS_CREDENTIALS === 'true'
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000, // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
      standardHeaders: true,
      legacyHeaders: false
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "wss:", "ws:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'json',
    destination: process.env.LOG_DESTINATION || 'stdout',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    auditLog: {
      enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
      path: process.env.AUDIT_LOG_PATH || './logs/audit.log',
      retention: parseInt(process.env.AUDIT_LOG_RETENTION) || 90 // days
    }
  },

  // Cache Configuration
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000,
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB) || 0
    }
  },

  // File Storage Configuration
  storage: {
    reports: {
      path: process.env.REPORTS_PATH || './data/reports',
      maxSize: process.env.REPORTS_MAX_SIZE || '10MB',
      retention: parseInt(process.env.REPORTS_RETENTION) || 365 // days
    },
    temp: {
      path: process.env.TEMP_PATH || './tmp',
      cleanup: process.env.TEMP_CLEANUP !== 'false'
    }
  },

  // Monitoring Configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metricsPort: parseInt(process.env.METRICS_PORT) || 9090,
    healthCheck: {
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      path: process.env.HEALTH_CHECK_PATH || '/health',
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000
    },
    alerts: {
      enabled: process.env.ALERTS_ENABLED === 'true',
      webhook: process.env.ALERT_WEBHOOK_URL,
      thresholds: {
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.05,
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME) || 5000,
        memoryUsage: parseFloat(process.env.ALERT_MEMORY_USAGE) || 0.85
      }
    }
  }
};

// Validation function to ensure required environment variables are set
export function validateProductionConfig() {
  const required = [];
  
  if (!productionConfig.openai.apiKey && !productionConfig.openai.stub) {
    required.push('OPENAI_API_KEY (or set OPENAI_STUB=true)');
  }
  
  if (productionConfig.database.type === 'postgresql') {
    if (!productionConfig.database.postgresql.host) required.push('DB_HOST');
    if (!productionConfig.database.postgresql.database) required.push('DB_NAME');
    if (!productionConfig.database.postgresql.username) required.push('DB_USER');
    if (!productionConfig.database.postgresql.password) required.push('DB_PASSWORD');
  }
  
  if (required.length > 0) {
    throw new Error(`Missing required environment variables: ${required.join(', ')}`);
  }
  
  return true;
}