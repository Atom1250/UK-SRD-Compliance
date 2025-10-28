/**
 * Security Middleware
 * Implements security hardening measures for production deployment
 */

import { createHash, randomBytes } from 'crypto';
import { config } from '../config/index.js';

// Rate limiting store (in-memory for simplicity, use Redis in production)
const rateLimitStore = new Map();

/**
 * CORS Middleware
 */
export function corsMiddleware(req, res, next) {
  const { cors } = config.security;
  
  const origin = req.headers.origin;
  
  if (cors.origin === false) {
    // CORS disabled
    return next();
  }
  
  if (cors.origin === true || (Array.isArray(cors.origin) && cors.origin.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  if (cors.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  next();
}

/**
 * Rate Limiting Middleware
 */
export function rateLimitMiddleware(req, res, next) {
  const { rateLimit } = config.security;
  
  if (!rateLimit) {
    return next();
  }
  
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  const windowStart = now - rateLimit.windowMs;
  
  // Clean up old entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  // Get or create client data
  let clientData = rateLimitStore.get(clientId);
  if (!clientData || clientData.resetTime < now) {
    clientData = {
      count: 0,
      resetTime: now + rateLimit.windowMs
    };
  }
  
  clientData.count++;
  rateLimitStore.set(clientId, clientData);
  
  // Set rate limit headers
  if (rateLimit.standardHeaders) {
    res.setHeader('RateLimit-Limit', rateLimit.max);
    res.setHeader('RateLimit-Remaining', Math.max(0, rateLimit.max - clientData.count));
    res.setHeader('RateLimit-Reset', new Date(clientData.resetTime).toISOString());
  }
  
  // Check if limit exceeded
  if (clientData.count > rateLimit.max) {
    res.writeHead(429, {
      'Content-Type': 'application/json',
      'Retry-After': Math.ceil((clientData.resetTime - now) / 1000)
    });
    res.end(JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.'
    }));
    return;
  }
  
  next();
}

/**
 * Security Headers Middleware (Helmet-like functionality)
 */
export function securityHeadersMiddleware(req, res, next) {
  const { helmet } = config.security;
  
  // Content Security Policy
  if (helmet.contentSecurityPolicy) {
    const csp = helmet.contentSecurityPolicy.directives;
    const cspString = Object.entries(csp)
      .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
      .join('; ');
    res.setHeader('Content-Security-Policy', cspString);
  }
  
  // HTTP Strict Transport Security
  if (helmet.hsts) {
    const hstsValue = [
      `max-age=${helmet.hsts.maxAge}`,
      helmet.hsts.includeSubDomains ? 'includeSubDomains' : '',
      helmet.hsts.preload ? 'preload' : ''
    ].filter(Boolean).join('; ');
    res.setHeader('Strict-Transport-Security', hstsValue);
  }
  
  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'ESG-Interview-Bot');
  
  next();
}

/**
 * Input Validation Middleware
 */
export function inputValidationMiddleware(req, res, next) {
  // Validate Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (contentType && !contentType.startsWith('application/json')) {
      res.writeHead(415, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Unsupported Media Type',
        message: 'Content-Type must be application/json'
      }));
      return;
    }
  }
  
  // Validate Content-Length
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength > maxSize) {
    res.writeHead(413, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Payload Too Large',
      message: 'Request body too large'
    }));
    return;
  }
  
  next();
}

/**
 * Request Logging Middleware
 */
export function requestLoggingMiddleware(req, res, next) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to request object
  req.requestId = requestId;
  
  // Log request
  console.log(JSON.stringify({
    type: 'request',
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: getClientIP(req),
    timestamp: new Date().toISOString()
  }));
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    console.log(JSON.stringify({
      type: 'response',
      requestId,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString()
    }));
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
}

/**
 * Error Handling Middleware
 */
export function errorHandlingMiddleware(error, req, res, next) {
  const requestId = req.requestId || 'unknown';
  
  // Log error
  console.error(JSON.stringify({
    type: 'error',
    requestId,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    timestamp: new Date().toISOString()
  }));
  
  // Don't expose internal errors in production
  const isProduction = process.env.NODE_ENV === 'production';
  const errorResponse = {
    error: 'Internal Server Error',
    requestId
  };
  
  if (!isProduction) {
    errorResponse.details = {
      message: error.message,
      stack: error.stack
    };
  }
  
  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(errorResponse));
}

/**
 * Health Check Middleware
 */
export function healthCheckMiddleware(req, res, next) {
  const { healthCheck } = config.monitoring;
  
  if (req.url === healthCheck.path) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
    return;
  }
  
  next();
}

// Helper functions
function getClientIdentifier(req) {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  return createHash('sha256').update(ip + userAgent).digest('hex');
}

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

function generateRequestId() {
  return randomBytes(16).toString('hex');
}

// Middleware composition helper
export function applySecurityMiddleware(handler) {
  return async (req, res) => {
    const middlewares = [
      corsMiddleware,
      securityHeadersMiddleware,
      rateLimitMiddleware,
      inputValidationMiddleware,
      requestLoggingMiddleware,
      healthCheckMiddleware
    ];
    
    let index = 0;
    
    function next(error) {
      if (error) {
        return errorHandlingMiddleware(error, req, res, () => {});
      }
      
      if (index >= middlewares.length) {
        return handler(req, res);
      }
      
      const middleware = middlewares[index++];
      try {
        middleware(req, res, next);
      } catch (err) {
        next(err);
      }
    }
    
    next();
  };
}