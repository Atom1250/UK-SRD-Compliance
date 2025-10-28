/**
 * Development Configuration
 * Environment-specific settings for development
 */

export const developmentConfig = {
  // Server Configuration
  server: {
    port: process.env.PORT || 4000,
    host: process.env.HOST || 'localhost',
    timeout: parseInt(process.env.SERVER_TIMEOUT) || 30000,
    keepAliveTimeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT) || 5000,
    headersTimeout: parseInt(process.env.HEADERS_TIMEOUT) || 60000
  },

  // Database Configuration
  database: {
    type: process.env.DB_TYPE || 'sqlite',
    sqlite: {
      path: process.env.SQLITE_PATH || './server/data/sessions.db',
      options: {
        busyTimeout: 5000,
        journal_mode: 'DELETE',
        synchronous: 'FULL'
      }
    }
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeout: parseInt(process.env.OPENAI_TIMEOUT) || 30000,
    maxRetries: parseInt(process.env.OPENAI_MAX_RETRIES) || 2,
    stub: process.env.OPENAI_STUB === 'true',
    strict: process.env.OPENAI_STRICT === 'true'
  },

  // Security Configuration (relaxed for development)
  security: {
    cors: {
      origin: true, // Allow all origins in development
      credentials: true
    },
    rateLimit: {
      windowMs: 60000, // 1 minute
      max: 1000, // Very high limit for development
      standardHeaders: true,
      legacyHeaders: false
    }
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.LOG_FORMAT || 'pretty',
    destination: 'stdout',
    auditLog: {
      enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
      path: './server/data/audit.log',
      retention: 30 // days
    }
  },

  // Cache Configuration
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL) || 300, // 5 minutes
    maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 100
  },

  // File Storage Configuration
  storage: {
    reports: {
      path: process.env.REPORTS_PATH || './server/data/reports',
      maxSize: process.env.REPORTS_MAX_SIZE || '10MB',
      retention: 30 // days
    },
    temp: {
      path: process.env.TEMP_PATH || './tmp',
      cleanup: true
    }
  },

  // Monitoring Configuration
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    metricsPort: parseInt(process.env.METRICS_PORT) || 9090,
    healthCheck: {
      enabled: true,
      path: '/health',
      timeout: 5000
    },
    alerts: {
      enabled: false // Disabled in development
    }
  }
};

// Validation function for development (less strict)
export function validateDevelopmentConfig() {
  // In development, we're more lenient with missing configuration
  if (!developmentConfig.openai.apiKey && !developmentConfig.openai.stub) {
    console.warn('Warning: OPENAI_API_KEY not set. Consider setting OPENAI_STUB=true for development');
  }
  
  return true;
}