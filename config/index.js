/**
 * Configuration Manager
 * Loads environment-specific configuration based on NODE_ENV
 */

import { productionConfig, validateProductionConfig } from './production.js';
import { developmentConfig, validateDevelopmentConfig } from './development.js';

const NODE_ENV = process.env.NODE_ENV || 'development';

// Load configuration based on environment
let config;
let validateConfig;

switch (NODE_ENV) {
  case 'production':
    config = productionConfig;
    validateConfig = validateProductionConfig;
    break;
  case 'development':
  default:
    config = developmentConfig;
    validateConfig = validateDevelopmentConfig;
    break;
}

// Validate configuration on load
try {
  validateConfig();
  console.log(`Configuration loaded for environment: ${NODE_ENV}`);
} catch (error) {
  console.error(`Configuration validation failed: ${error.message}`);
  process.exit(1);
}

export { config, NODE_ENV };

// Helper functions for common configuration access
export const getServerConfig = () => config.server;
export const getDatabaseConfig = () => config.database;
export const getOpenAIConfig = () => config.openai;
export const getSecurityConfig = () => config.security;
export const getLoggingConfig = () => config.logging;
export const getCacheConfig = () => config.cache;
export const getStorageConfig = () => config.storage;
export const getMonitoringConfig = () => config.monitoring;

// Environment helpers
export const isProduction = () => NODE_ENV === 'production';
export const isDevelopment = () => NODE_ENV === 'development';
export const isTest = () => NODE_ENV === 'test';