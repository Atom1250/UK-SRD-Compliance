// Enhanced Guardrail System and Risk Management
// Expanded guardrail triggers for additional regulatory scenarios with automated flagging and escalation

import { createComplianceAuditEntry } from './complianceSystem.js';
import { RISK_SCALE, CAPACITY_FOR_LOSS_VALUES } from './constants.js';

/**
 * Enhanced guardrail configuration
 */
export const ENHANCED_GUARDRAIL_CONFIG = {
  // Risk assessment scoring thresholds
  RISK_THRESHOLDS: {
    CRITICAL: 90,      // Immediate escalation required
    HIGH: 75,          // Senior advisor review required
    MEDIUM: 50,        // Standard advisor review
    LOW: 25,           // Monitoring only
    MINIMAL: 10        // No action required
  },
  
  // Escalation levels
  ESCALATION_LEVELS: {
    IMMEDIATE: 'immediate',           // Stop conversation, require supervisor
    SENIOR_REVIEW: 'senior_review',   // Flag for senior advisor review
    ADVISOR_REVIEW: 'advisor_review', // Standard advisor review
    MONITORING: 'monitoring',         // Log for monitoring
    NONE: 'none'                     // No escalation needed
  },
  
  // Guardrail categories
  CATEGORIES: {
    SUITABILITY: 'suitability',
    CONSUMER_DUTY: 'consumer_duty',
    RISK_CAPACITY: 'risk_capacity',
    KNOWLEDGE_EXPERIENCE: 'knowledge_experience',
    SUSTAINABILITY: 'sustainability',
    LIQUIDITY: 'liquidity',
    REGULATORY: 'regulatory',
    BEHAVIORAL: 'behavioral'
  }
};

/**
 * Enhanced guardrail rules with risk scoring
 */
export const ENHANCED_GUARDRAIL_RULES = {
  // Risk-Capacity Misalignment Rules
  'RISK_CAPACITY_CRITICAL_MISMATCH': {
    id: 'RISK_CAPACITY_CRITICAL_MISMATCH',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.RISK_CAPACITY,
    name: 'Critical Risk-Capacity Mismatch',
    description: 'High risk tolerance with low capacity for loss',
    risk_score: 95,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.IMMEDIATE,
    trigger_condition: (data) => {
      const profile = data.client_profile || {};
      return profile.risk_tolerance >= 6 && 
             profile.capacity_for_loss?.toLowerCase() === 'low';
    },
    required_actions: [
      'Stop conversation flow',
      'Require explicit client override with enhanced warnings',
      'Document detailed rationale',
      'Senior advisor approval required'
    ],
    regulatory_basis: 'COBS 9A.2.1 - Suitability assessment must consider ability to bear losses'
  },
  
  'RISK_CAPACITY_HIGH_MISMATCH': {
    id: 'RISK_CAPACITY_HIGH_MISMATCH',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.RISK_CAPACITY,
    name: 'High Risk-Capacity Mismatch',
    description: 'Medium-high risk tolerance with low capacity for loss',
    risk_score: 80,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.SENIOR_REVIEW,
    trigger_condition: (data) => {
      const profile = data.client_profile || {};
      return profile.risk_tolerance === 5 && 
             profile.capacity_for_loss?.toLowerCase() === 'low';
    },
    required_actions: [
      'Flag for senior advisor review',
      'Enhanced risk warnings required',
      'Document client understanding'
    ],
    regulatory_basis: 'COBS 9A.2.1 - Risk tolerance must align with capacity for loss'
  },
  
  // Time Horizon Rules
  'SHORT_HORIZON_HIGH_RISK': {
    id: 'SHORT_HORIZON_HIGH_RISK',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.SUITABILITY,
    name: 'Short Horizon High Risk',
    description: 'Short investment horizon with high risk tolerance',
    risk_score: 85,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.SENIOR_REVIEW,
    trigger_condition: (data) => {
      const profile = data.client_profile || {};
      return profile.horizon_years <= 2 && profile.risk_tolerance >= 6;
    },
    required_actions: [
      'Review investment horizon suitability',
      'Consider liquidity implications',
      'Document time horizon rationale'
    ],
    regulatory_basis: 'COBS 9A.2.1 - Investment period must be suitable for risk level'
  },
  
  'VERY_SHORT_HORIZON_MEDIUM_RISK': {
    id: 'VERY_SHORT_HORIZON_MEDIUM_RISK',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.SUITABILITY,
    name: 'Very Short Horizon Medium Risk',
    description: 'Very short investment horizon with medium+ risk',
    risk_score: 75,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.ADVISOR_REVIEW,
    trigger_condition: (data) => {
      const profile = data.client_profile || {};
      return profile.horizon_years <= 1 && profile.risk_tolerance >= 4;
    },
    required_actions: [
      'Review time horizon appropriateness',
      'Consider cash alternatives',
      'Document short-term investment rationale'
    ],
    regulatory_basis: 'COBS 9A.2.1 - Short horizons require conservative approaches'
  },
  
  // Knowledge and Experience Rules
  'COMPLEX_PRODUCT_LOW_EXPERIENCE': {
    id: 'COMPLEX_PRODUCT_LOW_EXPERIENCE',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.KNOWLEDGE_EXPERIENCE,
    name: 'Complex Product Low Experience',
    description: 'Limited experience with complex investment preferences',
    risk_score: 70,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.ADVISOR_REVIEW,
    trigger_condition: (data) => {
      const profile = data.client_profile || {};
      const prefs = data.sustainability_preferences || {};
      const hasLimitedExperience = !profile.knowledge_experience?.summary || 
                                  profile.knowledge_experience.summary.length < 50;
      const hasComplexPrefs = prefs.preference_level === 'detailed' ||
                             (prefs.exclusions && prefs.exclusions.length > 3);
      return hasLimitedExperience && hasComplexPrefs;
    },
    required_actions: [
      'Enhanced education required',
      'Simplify product recommendations',
      'Document appropriateness assessment'
    ],
    regulatory_basis: 'COBS 9A.2.2 - Products must match client knowledge and experience'
  },
  
  // Sustainability-Specific Rules
  'IMPACT_WITHOUT_UNDERSTANDING': {
    id: 'IMPACT_WITHOUT_UNDERSTANDING',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.SUSTAINABILITY,
    name: 'Impact Investment Without Understanding',
    description: 'Impact label interest without clear impact goals',
    risk_score: 65,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.ADVISOR_REVIEW,
    trigger_condition: (data) => {
      const prefs = data.sustainability_preferences || {};
      const hasImpactInterest = prefs.labels_interest?.some(label => 
        label.toLowerCase().includes('impact'));
      const lacksImpactGoals = !prefs.impact_goals || 
                              prefs.impact_goals.length === 0 ||
                              prefs.impact_goals.some(goal => goal.length < 20);
      return hasImpactInterest && lacksImpactGoals;
    },
    required_actions: [
      'Clarify impact investment understanding',
      'Define specific impact goals',
      'Explain impact measurement and reporting'
    ],
    regulatory_basis: 'FCA SDR - Impact labels require clear impact objectives'
  },
  
  'EXCLUSIONS_WITHOUT_THRESHOLDS': {
    id: 'EXCLUSIONS_WITHOUT_THRESHOLDS',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.SUSTAINABILITY,
    name: 'Exclusions Without Clear Thresholds',
    description: 'Exclusion preferences without specific thresholds',
    risk_score: 60,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.ADVISOR_REVIEW,
    trigger_condition: (data) => {
      const prefs = data.sustainability_preferences || {};
      const hasExclusions = prefs.exclusions && prefs.exclusions.length > 0;
      const hasVagueThresholds = prefs.exclusions?.some(exclusion => 
        !exclusion.threshold || exclusion.threshold === 0);
      return hasExclusions && hasVagueThresholds;
    },
    required_actions: [
      'Define specific exclusion thresholds',
      'Explain threshold implications',
      'Document exclusion rationale'
    ],
    regulatory_basis: 'FCA Anti-Greenwashing Rule - Exclusions must be clear and specific'
  },
  
  // Liquidity Rules
  'HIGH_LIQUIDITY_NEEDS_ILLIQUID_PRODUCTS': {
    id: 'HIGH_LIQUIDITY_NEEDS_ILLIQUID_PRODUCTS',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.LIQUIDITY,
    name: 'High Liquidity Needs with Illiquid Preferences',
    description: 'High liquidity needs with potentially illiquid investment preferences',
    risk_score: 80,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.SENIOR_REVIEW,
    trigger_condition: (data) => {
      const profile = data.client_profile || {};
      const hasHighLiquidityNeeds = profile.liquidity_needs?.toLowerCase().includes('high') ||
                                   profile.liquidity_needs?.toLowerCase().includes('immediate') ||
                                   profile.liquidity_needs?.toLowerCase().includes('emergency');
      const hasIlliquidPrefs = profile.horizon_years >= 10 || 
                              profile.risk_tolerance >= 6;
      return hasHighLiquidityNeeds && hasIlliquidPrefs;
    },
    required_actions: [
      'Review liquidity mismatch',
      'Consider liquid alternatives',
      'Document liquidity requirements'
    ],
    regulatory_basis: 'COBS 9A.2.1 - Liquidity needs must match product features'
  },
  
  // Consumer Duty Rules
  'INSUFFICIENT_UNDERSTANDING_INDICATORS': {
    id: 'INSUFFICIENT_UNDERSTANDING_INDICATORS',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.CONSUMER_DUTY,
    name: 'Insufficient Understanding Indicators',
    description: 'Indicators suggest client may not understand key concepts',
    risk_score: 70,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.ADVISOR_REVIEW,
    trigger_condition: (data) => {
      const audit = data.audit || {};
      const hasMultipleEducationalRequests = audit.events?.filter(event => 
        event.action === 'educational_request').length >= 3;
      const hasInconsistentResponses = data.sustainability_preferences?.preference_level === 'detailed' &&
                                     (!data.sustainability_preferences?.tradeoff_tolerance ||
                                      data.sustainability_preferences.tradeoff_tolerance.length < 20);
      return hasMultipleEducationalRequests || hasInconsistentResponses;
    },
    required_actions: [
      'Enhanced comprehension checks',
      'Additional education provision',
      'Consider simplifying recommendations'
    ],
    regulatory_basis: 'Consumer Duty - Ensure client understanding before proceeding'
  },
  
  // Behavioral Finance Rules
  'OVERCONFIDENCE_INDICATORS': {
    id: 'OVERCONFIDENCE_INDICATORS',
    category: ENHANCED_GUARDRAIL_CONFIG.CATEGORIES.BEHAVIORAL,
    name: 'Overconfidence Indicators',
    description: 'Client responses suggest potential overconfidence bias',
    risk_score: 55,
    escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.MONITORING,
    trigger_condition: (data) => {
      const profile = data.client_profile || {};
      const hasHighRiskTolerance = profile.risk_tolerance >= 6;
      const hasLimitedExperience = !profile.knowledge_experience?.duration ||
                                  profile.knowledge_experience.duration.toLowerCase().includes('less than') ||
                                  profile.knowledge_experience.duration.toLowerCase().includes('new');
      const hasHighConfidence = profile.knowledge_experience?.summary?.toLowerCase().includes('confident') ||
                               profile.knowledge_experience?.summary?.toLowerCase().includes('experienced');
      return hasHighRiskTolerance && hasLimitedExperience && hasHighConfidence;
    },
    required_actions: [
      'Monitor for overconfidence bias',
      'Provide balanced risk education',
      'Document experience assessment'
    ],
    regulatory_basis: 'Consumer Duty - Prevent foreseeable harm from behavioral biases'
  }
};

/**
 * Enhanced Guardrail System Class
 */
export class EnhancedGuardrailSystem {
  constructor() {
    this.activeGuardrails = new Map();
    this.escalationQueue = [];
    this.riskScoreCache = new Map();
  }
  
  /**
   * Evaluate all guardrails for a session
   * @param {Object} session - Session to evaluate
   * @returns {Object} Guardrail evaluation results
   */
  evaluateGuardrails(session) {
    const results = {
      timestamp: new Date().toISOString(),
      session_id: session.id,
      overall_risk_score: 0,
      triggered_guardrails: [],
      escalation_required: false,
      highest_escalation_level: ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.NONE,
      required_actions: [],
      recommendations: []
    };
    
    const data = session.data || {};
    let totalRiskScore = 0;
    let maxRiskScore = 0;
    
    // Evaluate each guardrail rule
    Object.values(ENHANCED_GUARDRAIL_RULES).forEach(rule => {
      try {
        if (rule.trigger_condition(data)) {
          const guardrailTrigger = {
            rule_id: rule.id,
            rule_name: rule.name,
            category: rule.category,
            description: rule.description,
            risk_score: rule.risk_score,
            escalation_level: rule.escalation_level,
            triggered_at: new Date().toISOString(),
            required_actions: rule.required_actions,
            regulatory_basis: rule.regulatory_basis,
            status: 'triggered'
          };
          
          results.triggered_guardrails.push(guardrailTrigger);
          totalRiskScore += rule.risk_score;
          maxRiskScore = Math.max(maxRiskScore, rule.risk_score);
          
          // Track highest escalation level
          if (this.getEscalationPriority(rule.escalation_level) > 
              this.getEscalationPriority(results.highest_escalation_level)) {
            results.highest_escalation_level = rule.escalation_level;
          }
          
          // Add required actions
          results.required_actions.push(...rule.required_actions);
          
          // Add to session audit
          this.addGuardrailToSession(session, guardrailTrigger);
        }
      } catch (error) {
        console.error(`Error evaluating guardrail ${rule.id}:`, error);
      }
    });
    
    // Calculate overall risk score
    results.overall_risk_score = results.triggered_guardrails.length > 0 ? 
      Math.min(100, totalRiskScore / results.triggered_guardrails.length) : 0;
    
    // Determine if escalation is required
    results.escalation_required = results.highest_escalation_level !== 
      ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.NONE;
    
    // Generate recommendations
    results.recommendations = this.generateRecommendations(results);
    
    // Add to escalation queue if needed
    if (results.escalation_required) {
      this.addToEscalationQueue(session, results);
    }
    
    // Cache risk score and assessment details
    this.riskScoreCache.set(session.id, {
      score: results.overall_risk_score,
      escalation_level: results.highest_escalation_level,
      triggered_guardrails: results.triggered_guardrails.length,
      timestamp: results.timestamp
    });
    
    // Create compliance audit entry
    createComplianceAuditEntry(session, 'guardrail_evaluation', {
      triggered_guardrails: results.triggered_guardrails.length,
      overall_risk_score: results.overall_risk_score,
      escalation_level: results.highest_escalation_level,
      applicable_rules: results.triggered_guardrails.map(g => g.rule_id),
      compliance_status: results.escalation_required ? 'requires_attention' : 'compliant'
    });
    
    return results;
  }
  
  /**
   * Add triggered guardrail to session audit trail
   * @param {Object} session - Session object
   * @param {Object} guardrailTrigger - Triggered guardrail details
   */
  addGuardrailToSession(session, guardrailTrigger) {
    if (!session.data.audit) {
      session.data.audit = { guardrail_triggers: [] };
    }
    
    if (!session.data.audit.guardrail_triggers) {
      session.data.audit.guardrail_triggers = [];
    }
    
    // Check if this guardrail is already triggered
    const existingTrigger = session.data.audit.guardrail_triggers.find(
      trigger => trigger.rule_id === guardrailTrigger.rule_id
    );
    
    if (!existingTrigger) {
      session.data.audit.guardrail_triggers.push(guardrailTrigger);
    } else {
      // Update existing trigger
      Object.assign(existingTrigger, guardrailTrigger);
    }
  }
  
  /**
   * Get escalation priority level (higher number = higher priority)
   * @param {string} escalationLevel - Escalation level
   * @returns {number} Priority number
   */
  getEscalationPriority(escalationLevel) {
    const priorities = {
      [ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.NONE]: 0,
      [ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.MONITORING]: 1,
      [ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.ADVISOR_REVIEW]: 2,
      [ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.SENIOR_REVIEW]: 3,
      [ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.IMMEDIATE]: 4
    };
    
    return priorities[escalationLevel] || 0;
  }
  
  /**
   * Generate recommendations based on guardrail results
   * @param {Object} results - Guardrail evaluation results
   * @returns {Array} Recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];
    
    if (results.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.CRITICAL) {
      recommendations.push({
        type: 'critical_action',
        priority: 'immediate',
        description: 'Critical risk level detected - immediate supervisor review required'
      });
    }
    
    if (results.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.HIGH) {
      recommendations.push({
        type: 'enhanced_documentation',
        priority: 'high',
        description: 'High risk level - enhanced documentation and rationale required'
      });
    }
    
    // Category-specific recommendations
    const categories = results.triggered_guardrails.reduce((acc, guardrail) => {
      acc[guardrail.category] = (acc[guardrail.category] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(categories).forEach(([category, count]) => {
      if (count >= 2) {
        recommendations.push({
          type: 'category_review',
          priority: 'medium',
          description: `Multiple ${category} issues detected - comprehensive review recommended`
        });
      }
    });
    
    return recommendations;
  }
  
  /**
   * Add session to escalation queue
   * @param {Object} session - Session requiring escalation
   * @param {Object} results - Guardrail evaluation results
   */
  addToEscalationQueue(session, results) {
    const escalationItem = {
      session_id: session.id,
      escalation_level: results.highest_escalation_level,
      risk_score: results.overall_risk_score,
      triggered_guardrails: results.triggered_guardrails.length,
      created_at: new Date().toISOString(),
      status: 'pending',
      assigned_to: null,
      resolved_at: null
    };
    
    this.escalationQueue.push(escalationItem);
    
    // Sort by priority (highest first)
    this.escalationQueue.sort((a, b) => {
      const priorityA = this.getEscalationPriority(a.escalation_level);
      const priorityB = this.getEscalationPriority(b.escalation_level);
      return priorityB - priorityA;
    });
  }
  
  /**
   * Get sessions requiring escalation
   * @param {string} escalationLevel - Optional filter by escalation level
   * @returns {Array} Sessions requiring escalation
   */
  getEscalationQueue(escalationLevel = null) {
    let queue = this.escalationQueue.filter(item => item.status === 'pending');
    
    if (escalationLevel) {
      queue = queue.filter(item => item.escalation_level === escalationLevel);
    }
    
    return queue;
  }
  
  /**
   * Resolve an escalation
   * @param {string} sessionId - Session ID
   * @param {string} resolvedBy - Who resolved the escalation
   * @param {string} resolution - Resolution notes
   */
  resolveEscalation(sessionId, resolvedBy, resolution) {
    const escalationItem = this.escalationQueue.find(
      item => item.session_id === sessionId && item.status === 'pending'
    );
    
    if (escalationItem) {
      escalationItem.status = 'resolved';
      escalationItem.resolved_by = resolvedBy;
      escalationItem.resolved_at = new Date().toISOString();
      escalationItem.resolution = resolution;
    }
    
    return escalationItem;
  }
  
  /**
   * Get risk assessment summary for a session
   * @param {Object} session - Session to assess
   * @returns {Object} Risk assessment summary
   */
  getRiskAssessmentSummary(session) {
    const cached = this.riskScoreCache.get(session.id);
    
    if (cached && (Date.now() - new Date(cached.timestamp).getTime()) < 300000) { // 5 minutes
      return {
        risk_score: cached.score,
        escalation_level: cached.escalation_level || ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.NONE,
        triggered_guardrails: cached.triggered_guardrails || 0,
        cached: true,
        last_assessed: cached.timestamp
      };
    }
    
    // Re-evaluate if not cached or stale
    const results = this.evaluateGuardrails(session);
    
    return {
      risk_score: results.overall_risk_score,
      escalation_level: results.highest_escalation_level,
      triggered_guardrails: results.triggered_guardrails.length,
      cached: false,
      last_assessed: results.timestamp
    };
  }
  
  /**
   * Generate guardrail compliance report
   * @param {Array} sessions - Sessions to analyze
   * @returns {Object} Compliance report
   */
  generateGuardrailReport(sessions = []) {
    const report = {
      generated_at: new Date().toISOString(),
      sessions_analyzed: sessions.length,
      overall_statistics: {
        sessions_with_triggers: 0,
        total_triggers: 0,
        average_risk_score: 0,
        escalations_required: 0
      },
      risk_distribution: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        minimal: 0
      },
      category_analysis: {},
      escalation_summary: {
        immediate: 0,
        senior_review: 0,
        advisor_review: 0,
        monitoring: 0
      },
      recommendations: []
    };
    
    if (sessions.length === 0) {
      return report;
    }
    
    let totalRiskScore = 0;
    let totalTriggers = 0;
    
    // Initialize category analysis
    Object.values(ENHANCED_GUARDRAIL_CONFIG.CATEGORIES).forEach(category => {
      report.category_analysis[category] = {
        triggers: 0,
        sessions_affected: 0,
        average_risk_score: 0
      };
    });
    
    // Analyze each session
    sessions.forEach(session => {
      const results = this.evaluateGuardrails(session);
      
      if (results.triggered_guardrails.length > 0) {
        report.overall_statistics.sessions_with_triggers++;
        totalTriggers += results.triggered_guardrails.length;
      }
      
      totalRiskScore += results.overall_risk_score;
      
      // Risk distribution
      if (results.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.CRITICAL) {
        report.risk_distribution.critical++;
      } else if (results.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.HIGH) {
        report.risk_distribution.high++;
      } else if (results.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.MEDIUM) {
        report.risk_distribution.medium++;
      } else if (results.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.LOW) {
        report.risk_distribution.low++;
      } else {
        report.risk_distribution.minimal++;
      }
      
      // Escalation summary
      if (results.escalation_required) {
        report.overall_statistics.escalations_required++;
        report.escalation_summary[results.highest_escalation_level]++;
      }
      
      // Category analysis
      const sessionCategories = new Set();
      results.triggered_guardrails.forEach(guardrail => {
        const category = guardrail.category;
        report.category_analysis[category].triggers++;
        sessionCategories.add(category);
      });
      
      sessionCategories.forEach(category => {
        report.category_analysis[category].sessions_affected++;
      });
    });
    
    // Calculate averages
    report.overall_statistics.total_triggers = totalTriggers;
    report.overall_statistics.average_risk_score = totalRiskScore / sessions.length;
    
    // Generate recommendations
    if (report.risk_distribution.critical > 0) {
      report.recommendations.push({
        type: 'critical_review',
        description: `${report.risk_distribution.critical} sessions have critical risk levels - immediate review required`
      });
    }
    
    if (report.overall_statistics.escalations_required / sessions.length > 0.2) {
      report.recommendations.push({
        type: 'process_review',
        description: 'High escalation rate suggests process review may be needed'
      });
    }
    
    return report;
  }
}

// Export singleton instance
export const enhancedGuardrailSystem = new EnhancedGuardrailSystem();

/**
 * Utility functions for enhanced guardrail system
 */

/**
 * Evaluate guardrails for a session
 * @param {Object} session - Session to evaluate
 * @returns {Object} Guardrail evaluation results
 */
export const evaluateSessionGuardrails = (session) => {
  return enhancedGuardrailSystem.evaluateGuardrails(session);
};

/**
 * Get risk assessment for a session
 * @param {Object} session - Session to assess
 * @returns {Object} Risk assessment
 */
export const getSessionRiskAssessment = (session) => {
  return enhancedGuardrailSystem.getRiskAssessmentSummary(session);
};

/**
 * Check if session requires escalation
 * @param {Object} session - Session to check
 * @returns {boolean} Whether escalation is required
 */
export const requiresEscalation = (session) => {
  const results = enhancedGuardrailSystem.evaluateGuardrails(session);
  return results.escalation_required;
};

/**
 * Get escalation queue
 * @param {string} level - Optional escalation level filter
 * @returns {Array} Escalation queue
 */
export const getEscalationQueue = (level = null) => {
  return enhancedGuardrailSystem.getEscalationQueue(level);
};

/**
 * Resolve an escalation
 * @param {string} sessionId - Session ID
 * @param {string} resolvedBy - Resolver
 * @param {string} resolution - Resolution notes
 * @returns {Object} Resolved escalation
 */
export const resolveEscalation = (sessionId, resolvedBy, resolution) => {
  return enhancedGuardrailSystem.resolveEscalation(sessionId, resolvedBy, resolution);
};