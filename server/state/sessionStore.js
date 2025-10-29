import { randomUUID } from "node:crypto";
import { CONVERSATION_STAGES } from "./constants.js";
import {
  persistSession,
  fetchSession,
  fetchSessions,
  clearSessions,
  deleteSession
} from "../db/sqlite.js";
import { 
  validateAndMigrateSession,
  migrateSessionData 
} from "./validateSession.js";
import cacheManager from "../cache/cacheManager.js";
import { monitorSessionLifecycle } from "../monitoring/performanceMonitor.js";
import logger from "../monitoring/logger.js";

// Import session monitor for real-time notifications
let sessionMonitor = null;
import("../websocket/sessionMonitor.js")
  .then(({ sessionMonitor: monitor }) => {
    sessionMonitor = monitor;
  })
  .catch((error) => {
    // WebSocket monitor not available, continue without real-time features
    if (error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'MODULE_NOT_FOUND') {
      console.log('WebSocket session monitor not available');
    } else {
      console.error('Failed to load WebSocket session monitor', error);
    }
  });

const createEmptySessionData = (sessionId) => ({
  session_id: sessionId,
  client_profile: {
    client_type: "",
    objectives: "",
    horizon_years: null,
    risk_tolerance: null,
    capacity_for_loss: "",
    liquidity_needs: "",
    knowledge_experience: {
      summary: "",
      instruments: [],
      frequency: "",
      duration: ""
    },
    financial_situation: {
      provided: false,
      income: null,
      assets: null,
      liabilities: null,
      notes: ""
    }
  },
  sustainability_preferences: {
    preference_level: "none",
    labels_interest: [],
    themes: [],
    exclusions: [],
    impact_goals: [],
    engagement_importance: "",
    reporting_frequency_pref: "none",
    tradeoff_tolerance: "",
    educ_pack_sent: false
  },
  consent: {
    data_processing: null,
    e_delivery: null,
    future_contact: {
      granted: null,
      purpose: ""
    }
  },
  summary_confirmation: {
    client_summary_confirmed: false,
    confirmed_at: null,
    edits_requested: ""
  },
  advice_outcome: {
    recommendation: "",
    rationale: "",
    sust_fit: "",
    costs_summary: "",
    adviser_notes: "",
    fee_details: {
      bespoke: false,
      explanation: ""
    }
  },
  disclosures: {
    documents: [],
    agr_disclaimer_presented: false
  },
  prod_governance: {
    target_market_match: null,
    manufacturer_info_complete: true
  },
  timestamps: {
    explanation_shown_at: null,
    consent_recorded_at: null,
    education_completed_at: null,
    report_generated_at: null,
    session_closed_at: null
  },
  report: {
    version: "v1.0",
    doc_url: null,
    signed_url: null,
    status: "draft",
    preview: null
  },
  audit: {
    events: [],
    ip: null,
    explanation_shown: false,
    educ_pack_sent: false,
    guardrail_triggers: [],
    report_hash: null
  },
  educational_requests: [],
  extra_questions: [],
  investment_research: [],
  additional_notes: ""
});

export const createSession = ({ ip } = {}) => {
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  const session = {
    id,
    stage: CONVERSATION_STAGES[0],
    createdAt: timestamp,
    updatedAt: timestamp,
    data: createEmptySessionData(id),
    events: [],
    context: {
      onboardingStep: 0,
      requireRiskOverride: false,
      consentStep: 0,
      education: {
        acknowledged: false,
        summaryOffered: false,
        summarised: false
      },
      options: {
        preferenceLevel: null,
        step: 0,
        pendingExclusions: false,
        pendingImpactDetails: false
      },
      confirmationAwaiting: false,
      reportReady: false
    }
  };

  if (ip) {
    session.data.audit.ip = ip;
  }

  persistSession(session);
  
  // Monitor session lifecycle
  monitorSessionLifecycle.created(id);
  logger.logSession('created', id, { ip });
  
  // Notify WebSocket monitor of new session
  if (sessionMonitor) {
    sessionMonitor.notifySessionCreated(id);
  }
  
  return session;
};

export const listSessions = () => fetchSessions();

export const getSession = (id) => {
  // Try cache first
  const cached = cacheManager.getSession(id);
  if (cached) {
    return cached;
  }
  
  // Fallback to database
  const session = fetchSession(id);
  if (session) {
    // Cache for future requests
    cacheManager.setSession(id, session);
  }
  
  return session ?? null;
};

const touchSession = (session) => {
  session.updatedAt = new Date().toISOString();
  return session;
};

export const saveSession = (session) => {
  if (!session || typeof session !== 'object') {
    console.error('Cannot save invalid session');
    throw new Error('Invalid session object');
  }
  
  try {
    touchSession(session);
    persistSession(session);
    
    // Update cache
    cacheManager.setSession(session.id, session);
    
    // Notify WebSocket monitor of session update
    if (sessionMonitor) {
      sessionMonitor.notifySessionUpdate(session.id, 'data_update');
    }
    
    return session;
  } catch (error) {
    console.error('Failed to save session:', error.message);
    throw new Error(`Session save failed: ${error.message}`);
  }
};

export const setStage = (session, stage) => {
  if (!CONVERSATION_STAGES.includes(stage)) {
    return session;
  }

  const oldStage = session.stage;
  session.stage = stage;
  touchSession(session);
  persistSession(session);
  
  // Update cache
  cacheManager.setSession(session.id, session);
  
  // Notify WebSocket monitor of stage change
  if (sessionMonitor && oldStage !== stage) {
    sessionMonitor.notifySessionStageChange(session.id, stage, oldStage);
  }
  
  return session;
};

const deepMerge = (target, patch) => {
  if (!patch || typeof patch !== "object") {
    return target;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value);
    } else {
      target[key] = structuredClone(value);
    }
  }

  return target;
};

export const applyDataPatch = (session, patch) => {
  if (!session || typeof session !== 'object') {
    console.error('Cannot apply patch to invalid session');
    throw new Error('Invalid session object');
  }
  
  if (!patch || typeof patch !== "object") {
    return session;
  }

  try {
    deepMerge(session.data, patch);
    touchSession(session);
    persistSession(session);
    
    // Update cache
    cacheManager.setSession(session.id, session);
    
    return session;
  } catch (error) {
    console.error('Failed to apply data patch:', error.message);
    throw new Error(`Data patch failed: ${error.message}`);
  }
};

export const appendEvent = (session, event) => {
  if (!session || typeof session !== 'object') {
    console.error('Cannot append event to invalid session');
    throw new Error('Invalid session object');
  }
  
  if (!event || typeof event !== 'object') {
    console.error('Cannot append invalid event');
    throw new Error('Invalid event object');
  }
  
  try {
    // Ensure events array exists
    if (!Array.isArray(session.events)) {
      session.events = [];
    }
    
    // Ensure audit structure exists
    if (!session.data.audit || typeof session.data.audit !== 'object') {
      session.data.audit = { events: [], guardrail_triggers: [] };
    }
    
    if (!Array.isArray(session.data.audit.events)) {
      session.data.audit.events = [];
    }
    
    // Limit event history to prevent memory issues
    if (session.events.length >= 1000) {
      session.events = session.events.slice(-500); // Keep last 500 events
    }
    
    if (session.data.audit.events.length >= 1000) {
      session.data.audit.events = session.data.audit.events.slice(-500);
    }
    
    session.events.push(event);
    session.data.audit.events.push({
      id: event.id,
      author: event.author,
      type: event.type,
      createdAt: event.createdAt
    });
    
    touchSession(session);
    persistSession(session);
    return session;
  } catch (error) {
    console.error('Failed to append event:', error.message);
    throw new Error(`Event append failed: ${error.message}`);
  }
};

export const toPublicSession = (session) => {
  const clone = structuredClone(session);
  return clone;
};

export const resetSessions = () => {
  clearSessions();
  // Clear cache as well
  cacheManager.clear();
};

// Advanced querying capabilities for task 5.1

/**
 * Filter sessions based on criteria
 * @param {Object} filters - Filter criteria
 * @param {string} filters.stage - Filter by conversation stage
 * @param {string} filters.dateFrom - Filter sessions created after this date (ISO string)
 * @param {string} filters.dateTo - Filter sessions created before this date (ISO string)
 * @param {string} filters.clientType - Filter by client type
 * @param {string} filters.status - Filter by session status (active, completed, archived)
 * @param {number} filters.limit - Maximum number of results
 * @param {number} filters.offset - Number of results to skip
 * @returns {Array} Filtered sessions
 */
export const filterSessions = (filters = {}) => {
  try {
    // Generate cache key for this query
    const queryHash = cacheManager.constructor.generateHash({ type: 'filter', filters });
    
    // Try cache first
    const cached = cacheManager.getQueryResult(queryHash);
    if (cached) {
      return cached;
    }
    
    let sessions = fetchSessions();
    
    // Apply stage filter
    if (filters.stage) {
      sessions = sessions.filter(session => session.stage === filters.stage);
    }
    
    // Apply date range filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      sessions = sessions.filter(session => new Date(session.createdAt) >= fromDate);
    }
    
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      sessions = sessions.filter(session => new Date(session.createdAt) <= toDate);
    }
    
    // Apply client type filter
    if (filters.clientType) {
      sessions = sessions.filter(session => 
        session.data?.client_profile?.client_type === filters.clientType
      );
    }
    
    // Apply status filter
    if (filters.status) {
      sessions = sessions.filter(session => {
        switch (filters.status) {
          case 'active':
            return !session.data?.timestamps?.session_closed_at && 
                   !session.data?.archived;
          case 'completed':
            return session.data?.timestamps?.session_closed_at && 
                   !session.data?.archived;
          case 'archived':
            return session.data?.archived === true;
          default:
            return true;
        }
      });
    }
    
    // Sort by creation date (newest first)
    sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    if (filters.offset) {
      sessions = sessions.slice(filters.offset);
    }
    
    if (filters.limit) {
      sessions = sessions.slice(0, filters.limit);
    }
    
    // Cache the result
    cacheManager.setQueryResult(queryHash, sessions);
    
    return sessions;
  } catch (error) {
    console.error('Failed to filter sessions:', error.message);
    throw new Error(`Session filtering failed: ${error.message}`);
  }
};

/**
 * Search sessions by text content
 * @param {string} searchTerm - Text to search for
 * @param {Object} options - Search options
 * @param {Array} options.fields - Fields to search in (default: all text fields)
 * @param {boolean} options.caseSensitive - Case sensitive search (default: false)
 * @param {number} options.limit - Maximum number of results
 * @returns {Array} Matching sessions with relevance scores
 */
export const searchSessions = (searchTerm, options = {}) => {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return [];
  }
  
  try {
    const sessions = fetchSessions();
    const results = [];
    const term = options.caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    const searchFields = options.fields || [
      'data.client_profile.objectives',
      'data.client_profile.liquidity_needs',
      'data.client_profile.knowledge_experience.summary',
      'data.sustainability_preferences.themes',
      'data.advice_outcome.recommendation',
      'data.advice_outcome.rationale',
      'data.additional_notes',
      'events'
    ];
    
    sessions.forEach(session => {
      let relevanceScore = 0;
      const matchedFields = [];
      
      // Search in specified fields
      searchFields.forEach(fieldPath => {
        const value = getNestedValue(session, fieldPath);
        if (value) {
          const searchValue = options.caseSensitive ? 
            JSON.stringify(value) : 
            JSON.stringify(value).toLowerCase();
          
          if (searchValue.includes(term)) {
            relevanceScore += 1;
            matchedFields.push(fieldPath);
          }
        }
      });
      
      if (relevanceScore > 0) {
        results.push({
          session,
          relevanceScore,
          matchedFields
        });
      }
    });
    
    // Sort by relevance score (highest first)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Apply limit
    if (options.limit) {
      return results.slice(0, options.limit);
    }
    
    return results;
  } catch (error) {
    console.error('Failed to search sessions:', error.message);
    throw new Error(`Session search failed: ${error.message}`);
  }
};

/**
 * Archive sessions older than specified days
 * @param {number} daysOld - Archive sessions older than this many days
 * @param {boolean} dryRun - If true, return sessions that would be archived without archiving
 * @returns {Array} Archived session IDs
 */
export const archiveOldSessions = (daysOld = 90, dryRun = false) => {
  if (typeof daysOld !== 'number' || daysOld < 0) {
    throw new Error('daysOld must be a non-negative number');
  }
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const sessions = fetchSessions();
    const toArchive = sessions.filter(session => {
      const sessionDate = new Date(session.updatedAt || session.createdAt);
      return sessionDate < cutoffDate && !session.data?.archived;
    });
    
    if (dryRun) {
      return toArchive.map(session => session.id);
    }
    
    const archivedIds = [];
    toArchive.forEach(session => {
      session.data.archived = true;
      session.data.archived_at = new Date().toISOString();
      saveSession(session);
      archivedIds.push(session.id);
    });
    
    return archivedIds;
  } catch (error) {
    console.error('Failed to archive sessions:', error.message);
    throw new Error(`Session archiving failed: ${error.message}`);
  }
};

/**
 * Cleanup archived sessions by permanently deleting them
 * @param {number} daysOld - Delete archived sessions older than this many days
 * @param {boolean} dryRun - If true, return sessions that would be deleted without deleting
 * @returns {Array} Deleted session IDs
 */
export const cleanupArchivedSessions = (daysOld = 365, dryRun = false) => {
  if (typeof daysOld !== 'number' || daysOld < 0) {
    throw new Error('daysOld must be a non-negative number');
  }
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const sessions = fetchSessions();
    const toDelete = sessions.filter(session => {
      if (!session.data?.archived) return false;
      
      const archivedDate = new Date(session.data.archived_at || session.updatedAt);
      return archivedDate < cutoffDate;
    });
    
    if (dryRun) {
      return toDelete.map(session => session.id);
    }
    
    const deletedIds = [];
    
    toDelete.forEach(session => {
      if (deleteSession(session.id)) {
        deletedIds.push(session.id);
      }
    });
    
    return deletedIds;
  } catch (error) {
    console.error('Failed to cleanup archived sessions:', error.message);
    throw new Error(`Session cleanup failed: ${error.message}`);
  }
};

/**
 * Bulk update sessions matching criteria
 * @param {Object} criteria - Selection criteria (same as filterSessions)
 * @param {Object} updates - Updates to apply to matching sessions
 * @param {boolean} dryRun - If true, return sessions that would be updated without updating
 * @returns {Array} Updated session IDs
 */
export const bulkUpdateSessions = (criteria = {}, updates = {}, dryRun = false) => {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Updates object is required');
  }
  
  try {
    const matchingSessions = filterSessions(criteria);
    
    if (dryRun) {
      return matchingSessions.map(session => session.id);
    }
    
    const updatedIds = [];
    matchingSessions.forEach(session => {
      applyDataPatch(session, updates);
      updatedIds.push(session.id);
    });
    
    return updatedIds;
  } catch (error) {
    console.error('Failed to bulk update sessions:', error.message);
    throw new Error(`Bulk update failed: ${error.message}`);
  }
};

/**
 * Get session statistics
 * @returns {Object} Statistics about sessions
 */
export const getSessionStatistics = () => {
  try {
    // Generate cache key for statistics
    const queryHash = cacheManager.constructor.generateHash({ type: 'statistics' });
    
    // Try cache first (shorter TTL for stats)
    const cached = cacheManager.getQueryResult(queryHash);
    if (cached) {
      return cached;
    }
    
    const sessions = fetchSessions();
    const stats = {
      total: sessions.length,
      active: 0,
      completed: 0,
      archived: 0,
      byStage: {},
      byClientType: {},
      averageSessionDuration: 0,
      oldestSession: null,
      newestSession: null
    };
    
    let totalDuration = 0;
    let durationsCount = 0;
    
    sessions.forEach(session => {
      // Count by status
      if (session.data?.archived) {
        stats.archived++;
      } else if (session.data?.timestamps?.session_closed_at) {
        stats.completed++;
      } else {
        stats.active++;
      }
      
      // Count by stage
      const stage = session.stage || 'unknown';
      stats.byStage[stage] = (stats.byStage[stage] || 0) + 1;
      
      // Count by client type
      const clientType = session.data?.client_profile?.client_type || 'unknown';
      stats.byClientType[clientType] = (stats.byClientType[clientType] || 0) + 1;
      
      // Calculate duration for completed sessions
      if (session.data?.timestamps?.session_closed_at) {
        const start = new Date(session.createdAt);
        const end = new Date(session.data.timestamps.session_closed_at);
        totalDuration += (end - start);
        durationsCount++;
      }
      
      // Track oldest and newest
      const sessionDate = new Date(session.createdAt);
      if (!stats.oldestSession || sessionDate < new Date(stats.oldestSession.createdAt)) {
        stats.oldestSession = { id: session.id, createdAt: session.createdAt };
      }
      if (!stats.newestSession || sessionDate > new Date(stats.newestSession.createdAt)) {
        stats.newestSession = { id: session.id, createdAt: session.createdAt };
      }
    });
    
    // Calculate average duration in minutes
    if (durationsCount > 0) {
      stats.averageSessionDuration = Math.round(totalDuration / durationsCount / 1000 / 60);
    }
    
    // Cache the result with shorter TTL for frequently changing data
    cacheManager.setQueryResult(queryHash, stats);
    
    return stats;
  } catch (error) {
    console.error('Failed to get session statistics:', error.message);
    throw new Error(`Statistics calculation failed: ${error.message}`);
  }
};

// Helper function to get nested object values
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

/**
 * Enhanced session retrieval with automatic migration and validation
 * @param {string} id - Session ID
 * @returns {Object} Session with validation results
 */
export const getSessionEnhanced = (id) => {
  const session = fetchSession(id);
  if (!session) {
    return null;
  }
  
  // Automatically migrate and validate
  const result = validateAndMigrateSession(session);
  
  // Save migrated session if changes were made
  if (result.migrated) {
    persistSession(result.session);
  }
  
  return {
    session: result.session,
    validation: {
      valid: result.valid,
      issues: result.issues,
      warnings: result.warnings,
      cobs9aCompliant: result.cobs9aCompliant,
      consistencyValid: result.consistencyValid
    },
    migrated: result.migrated
  };
};

/**
 * Enhanced session saving with validation
 * @param {Object} session - Session to save
 * @param {Object} options - Save options
 * @param {boolean} options.skipValidation - Skip validation before saving
 * @param {boolean} options.allowInvalid - Allow saving invalid sessions with warnings
 * @returns {Object} Save result with validation info
 */
export const saveSessionEnhanced = (session, options = {}) => {
  if (!session || typeof session !== 'object') {
    throw new Error('Invalid session object');
  }
  
  try {
    // Migrate session data if needed
    const migratedSession = migrateSessionData(session);
    
    // Validate unless skipped
    let validation = null;
    if (!options.skipValidation) {
      const validationResult = validateAndMigrateSession(migratedSession);
      validation = {
        valid: validationResult.valid,
        issues: validationResult.issues,
        warnings: validationResult.warnings,
        cobs9aCompliant: validationResult.cobs9aCompliant,
        consistencyValid: validationResult.consistencyValid
      };
      
      // Notify WebSocket monitor of compliance issues
      if (sessionMonitor && (!validation.valid || !validation.cobs9aCompliant)) {
        if (!validation.valid) {
          sessionMonitor.notifyComplianceIssue(migratedSession.id, 'validation_failure', {
            message: `Session validation failed: ${validation.issues.slice(0, 3).join(', ')}`,
            issues: validation.issues,
            warnings: validation.warnings
          });
        }
        
        if (!validation.cobs9aCompliant) {
          sessionMonitor.notifyComplianceIssue(migratedSession.id, 'cobs9a_non_compliance', {
            message: 'Session does not meet COBS 9A suitability requirements',
            issues: validation.issues,
            warnings: validation.warnings
          });
        }
      }
      
      // Prevent saving invalid sessions unless explicitly allowed
      if (!validation.valid && !options.allowInvalid) {
        throw new Error(`Session validation failed: ${validation.issues.join(', ')}`);
      }
    }
    
    // Save the session
    touchSession(migratedSession);
    persistSession(migratedSession);
    
    return {
      session: migratedSession,
      validation,
      saved: true
    };
  } catch (error) {
    console.error('Failed to save session with validation:', error.message);
    throw new Error(`Enhanced session save failed: ${error.message}`);
  }
};

/**
 * Validate all sessions and return compliance report
 * @param {Object} options - Validation options
 * @param {boolean} options.includeWarnings - Include warnings in results
 * @param {boolean} options.autoMigrate - Automatically migrate sessions
 * @returns {Object} Compliance report
 */
export const validateAllSessions = (options = {}) => {
  try {
    const sessions = fetchSessions();
    const report = {
      total: sessions.length,
      valid: 0,
      invalid: 0,
      cobs9aCompliant: 0,
      migrated: 0,
      issues: [],
      warnings: [],
      sessionResults: []
    };
    
    sessions.forEach(session => {
      const result = validateAndMigrateSession(session);
      
      // Update counters
      if (result.valid) {
        report.valid++;
      } else {
        report.invalid++;
      }
      
      if (result.cobs9aCompliant) {
        report.cobs9aCompliant++;
      }
      
      if (result.migrated) {
        report.migrated++;
        
        // Save migrated session if auto-migrate is enabled
        if (options.autoMigrate) {
          persistSession(result.session);
        }
      }
      
      // Collect issues and warnings
      report.issues.push(...result.issues.map(issue => ({
        sessionId: session.id,
        issue
      })));
      
      if (options.includeWarnings) {
        report.warnings.push(...result.warnings.map(warning => ({
          sessionId: session.id,
          warning
        })));
      }
      
      // Store individual session results
      report.sessionResults.push({
        sessionId: session.id,
        valid: result.valid,
        cobs9aCompliant: result.cobs9aCompliant,
        consistencyValid: result.consistencyValid,
        migrated: result.migrated,
        issueCount: result.issues.length,
        warningCount: result.warnings.length
      });
    });
    
    return report;
  } catch (error) {
    console.error('Failed to validate all sessions:', error.message);
    throw new Error(`Session validation report failed: ${error.message}`);
  }
};

/**
 * Get sessions that require attention (invalid or with warnings)
 * @param {Object} criteria - Filter criteria
 * @param {boolean} criteria.includeWarnings - Include sessions with warnings
 * @param {boolean} criteria.cobs9aOnly - Only include COBS 9A compliance issues
 * @returns {Array} Sessions requiring attention
 */
export const getSessionsRequiringAttention = (criteria = {}) => {
  try {
    const sessions = fetchSessions();
    const results = [];
    
    sessions.forEach(session => {
      const validation = validateAndMigrateSession(session);
      
      const hasIssues = validation.issues.length > 0;
      const hasWarnings = validation.warnings.length > 0;
      const cobs9aIssues = !validation.cobs9aCompliant;
      
      let requiresAttention = false;
      
      if (criteria.cobs9aOnly) {
        requiresAttention = cobs9aIssues;
      } else {
        requiresAttention = hasIssues || (criteria.includeWarnings && hasWarnings);
      }
      
      if (requiresAttention) {
        results.push({
          session,
          validation: {
            valid: validation.valid,
            issues: validation.issues,
            warnings: validation.warnings,
            cobs9aCompliant: validation.cobs9aCompliant,
            consistencyValid: validation.consistencyValid
          },
          priority: hasIssues ? 'high' : 'medium'
        });
      }
    });
    
    // Sort by priority (high first) then by creation date (newest first)
    results.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'high' ? -1 : 1;
      }
      return new Date(b.session.createdAt) - new Date(a.session.createdAt);
    });
    
    return results;
  } catch (error) {
    console.error('Failed to get sessions requiring attention:', error.message);
    throw new Error(`Attention query failed: ${error.message}`);
  }
};