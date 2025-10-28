/**
 * Structured Logger for ESG Client Interview Bot
 * Provides comprehensive logging with different levels and structured output
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

class Logger {
  constructor(options = {}) {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.config = {
      level: options.level || process.env.LOG_LEVEL || 'info',
      format: options.format || 'json', // 'json' or 'text'
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile !== false,
      logDir: options.logDir || path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/logs'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxFiles: options.maxFiles || 5,
      includeTimestamp: options.includeTimestamp !== false,
      includeLevel: options.includeLevel !== false,
      includeContext: options.includeContext !== false
    };
    
    // Ensure log directory exists
    if (this.config.enableFile) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
    
    this.currentLogFile = null;
    this.currentLogSize = 0;
    
    // Bind methods to preserve context
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.trace = this.trace.bind(this);
  }
  
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.config.level];
  }
  
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
      ...(this.config.includeTimestamp && { timestamp }),
      ...(this.config.includeLevel && { level: level.toUpperCase() }),
      message,
      ...(this.config.includeContext && Object.keys(context).length > 0 && { context })
    };
    
    if (this.config.format === 'json') {
      return JSON.stringify(logEntry);
    } else {
      const parts = [];
      if (this.config.includeTimestamp) parts.push(`[${timestamp}]`);
      if (this.config.includeLevel) parts.push(`[${level.toUpperCase()}]`);
      parts.push(message);
      
      if (this.config.includeContext && Object.keys(context).length > 0) {
        parts.push(JSON.stringify(context));
      }
      
      return parts.join(' ');
    }
  }
  
  writeToFile(formattedMessage) {
    if (!this.config.enableFile) return;
    
    try {
      // Check if we need to rotate log file
      if (!this.currentLogFile || this.currentLogSize >= this.config.maxFileSize) {
        this.rotateLogFile();
      }
      
      const messageWithNewline = formattedMessage + '\n';
      fs.appendFileSync(this.currentLogFile, messageWithNewline);
      this.currentLogSize += Buffer.byteLength(messageWithNewline);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }
  
  rotateLogFile() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `app-${timestamp}.log`;
    this.currentLogFile = path.join(this.config.logDir, filename);
    this.currentLogSize = 0;
    
    // Clean up old log files
    this.cleanupOldLogs();
  }
  
  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.config.logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDir, file),
          stats: fs.statSync(path.join(this.config.logDir, file))
        }))
        .sort((a, b) => b.stats.mtime - a.stats.mtime);
      
      // Remove excess files
      if (files.length > this.config.maxFiles) {
        files.slice(this.config.maxFiles).forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error.message);
    }
  }
  
  log(level, message, context = {}) {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.formatMessage(level, message, context);
    
    // Write to console
    if (this.config.enableConsole) {
      const consoleMethod = level === 'error' ? 'error' : 
                           level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](formattedMessage);
    }
    
    // Write to file
    this.writeToFile(formattedMessage);
  }
  
  error(message, context = {}) {
    this.log('error', message, context);
  }
  
  warn(message, context = {}) {
    this.log('warn', message, context);
  }
  
  info(message, context = {}) {
    this.log('info', message, context);
  }
  
  debug(message, context = {}) {
    this.log('debug', message, context);
  }
  
  trace(message, context = {}) {
    this.log('trace', message, context);
  }
  
  // Specialized logging methods
  
  logRequest(req, res, responseTime) {
    try {
      const context = {
        method: req.method ?? 'UNKNOWN',
        url: req.url ?? '',
        userAgent: req.headers?.['user-agent'],
        ip: req.socket?.remoteAddress ?? req.connection?.remoteAddress,
        statusCode: typeof res.statusCode === 'number' ? res.statusCode : undefined,
        responseTime: typeof responseTime === 'number' ? `${responseTime}ms` : undefined,
        contentLength: typeof res.getHeader === 'function'
          ? res.getHeader('content-length') ?? res.getHeader('Content-Length')
          : undefined
      };

      for (const key of Object.keys(context)) {
        if (context[key] === undefined || context[key] === null) {
          delete context[key];
        }
      }

      this.info('HTTP Request', context);
    } catch (error) {
      this.warn('Failed to log request', { error: error.message });
    }
  }
  
  logSession(action, sessionId, context = {}) {
    this.info(`Session ${action}`, {
      sessionId,
      action,
      ...context
    });
  }
  
  logOpenAI(action, context = {}) {
    this.info(`OpenAI ${action}`, {
      action,
      ...context
    });
  }
  
  logDatabase(operation, context = {}) {
    this.debug(`Database ${operation}`, {
      operation,
      ...context
    });
  }
  
  logCache(action, context = {}) {
    this.debug(`Cache ${action}`, {
      action,
      ...context
    });
  }
  
  logCompliance(event, sessionId, context = {}) {
    this.info(`Compliance ${event}`, {
      sessionId,
      event,
      ...context
    });
  }
  
  logPerformance(operation, duration, context = {}) {
    const level = duration > 5000 ? 'warn' : 'debug';
    this[level](`Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...context
    });
  }
  
  logError(error, context = {}) {
    this.error(error.message || 'Unknown error', {
      name: error.name,
      stack: error.stack,
      code: error.code,
      status: error.status,
      ...context
    });
  }
  
  // Audit logging for compliance
  
  logAudit(event, sessionId, userId = null, context = {}) {
    this.info(`AUDIT: ${event}`, {
      event,
      sessionId,
      userId,
      timestamp: new Date().toISOString(),
      ...context
    });
  }
  
  // Security logging
  
  logSecurity(event, context = {}) {
    this.warn(`SECURITY: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...context
    });
  }
  
  // Business logic logging
  
  logBusiness(event, context = {}) {
    this.info(`BUSINESS: ${event}`, {
      event,
      ...context
    });
  }
  
  // Utility methods
  
  child(defaultContext = {}) {
    return {
      error: (message, context = {}) => this.error(message, { ...defaultContext, ...context }),
      warn: (message, context = {}) => this.warn(message, { ...defaultContext, ...context }),
      info: (message, context = {}) => this.info(message, { ...defaultContext, ...context }),
      debug: (message, context = {}) => this.debug(message, { ...defaultContext, ...context }),
      trace: (message, context = {}) => this.trace(message, { ...defaultContext, ...context })
    };
  }
  
  setLevel(level) {
    if (this.levels.hasOwnProperty(level)) {
      this.config.level = level;
    }
  }
  
  getLogFiles() {
    if (!this.config.enableFile) return [];
    
    try {
      return fs.readdirSync(this.config.logDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDir, file),
          size: fs.statSync(path.join(this.config.logDir, file)).size,
          modified: fs.statSync(path.join(this.config.logDir, file)).mtime
        }))
        .sort((a, b) => b.modified - a.modified);
    } catch (error) {
      this.error('Failed to get log files', { error: error.message });
      return [];
    }
  }
  
  readLogFile(filename, lines = 100) {
    if (!this.config.enableFile) return null;
    
    try {
      const filePath = path.join(this.config.logDir, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const allLines = content.split('\n').filter(line => line.trim());
      
      return allLines.slice(-lines);
    } catch (error) {
      this.error('Failed to read log file', { filename, error: error.message });
      return null;
    }
  }
  
  searchLogs(query, maxResults = 100) {
    if (!this.config.enableFile) return [];
    
    const results = [];
    const logFiles = this.getLogFiles();
    
    for (const file of logFiles) {
      if (results.length >= maxResults) break;
      
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          if (results.length >= maxResults) return;
          
          if (line.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              file: file.name,
              line: index + 1,
              content: line,
              timestamp: this.extractTimestamp(line)
            });
          }
        });
      } catch (error) {
        this.error('Failed to search log file', { file: file.name, error: error.message });
      }
    }
    
    return results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  extractTimestamp(logLine) {
    try {
      if (this.config.format === 'json') {
        const parsed = JSON.parse(logLine);
        return parsed.timestamp;
      } else {
        const match = logLine.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
        return match ? match[1] : null;
      }
    } catch {
      return null;
    }
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
export { Logger };