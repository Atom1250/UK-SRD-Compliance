// Regulatory Change Management System
// Framework for incorporating FCA rule updates and automated compliance validation

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createComplianceAuditEntry } from './complianceSystem.js';

/**
 * Regulatory change management configuration
 */
export const REGULATORY_CONFIG = {
  // FCA rule categories that affect the system
  RULE_CATEGORIES: {
    COBS: 'Conduct of Business Sourcebook',
    PROD: 'Product Governance',
    SDR: 'Sustainability Disclosure Requirements',
    CONSUMER_DUTY: 'Consumer Duty',
    ANTI_GREENWASHING: 'Anti-Greenwashing Rule',
    GDPR: 'Data Protection',
    PECR: 'Privacy and Electronic Communications'
  },
  
  // Impact levels for regulatory changes
  IMPACT_LEVELS: {
    CRITICAL: 'critical',      // Immediate system changes required
    HIGH: 'high',             // Changes required within 30 days
    MEDIUM: 'medium',         // Changes required within 90 days
    LOW: 'low',               // Monitoring required, no immediate changes
    INFORMATIONAL: 'info'     // No changes required, awareness only
  },
  
  // Change types
  CHANGE_TYPES: {
    NEW_RULE: 'new_rule',
    RULE_AMENDMENT: 'rule_amendment',
    GUIDANCE_UPDATE: 'guidance_update',
    INTERPRETATION: 'interpretation',
    ENFORCEMENT_NOTICE: 'enforcement_notice',
    CONSULTATION: 'consultation'
  }
};

/**
 * Current regulatory rule set with version tracking
 */
export const CURRENT_REGULATORY_RULES = {
  version: '2024.1.0',
  last_updated: '2024-01-15T00:00:00Z',
  rules: {
    // COBS 9A Suitability Rules
    'COBS_9A_2_1': {
      id: 'COBS_9A_2_1',
      title: 'Suitability assessment requirements',
      category: 'COBS',
      effective_date: '2018-01-03',
      last_reviewed: '2024-01-15',
      requirements: [
        'Investment objectives assessment',
        'Financial situation assessment',
        'Knowledge and experience assessment',
        'Risk tolerance and capacity for loss',
        'Investment time horizon',
        'Liquidity needs assessment'
      ],
      validation_rules: [
        'client_type_mandatory',
        'objectives_mandatory',
        'horizon_years_mandatory',
        'risk_tolerance_mandatory',
        'capacity_for_loss_mandatory',
        'liquidity_needs_mandatory',
        'knowledge_experience_mandatory'
      ],
      system_impact: 'critical'
    },
    
    // Consumer Duty Rules
    'CONSUMER_DUTY_OUTCOME_1': {
      id: 'CONSUMER_DUTY_OUTCOME_1',
      title: 'Consumer Understanding',
      category: 'CONSUMER_DUTY',
      effective_date: '2023-07-31',
      last_reviewed: '2024-01-15',
      requirements: [
        'Clear communication in plain language',
        'Comprehension checks where appropriate',
        'Accessible information format',
        'Timely provision of information'
      ],
      validation_rules: [
        'explanation_shown_mandatory',
        'education_acknowledgment_required',
        'plain_language_compliance'
      ],
      system_impact: 'high'
    },
    
    // SDR Rules
    'SDR_LABELLING': {
      id: 'SDR_LABELLING',
      title: 'Sustainability Disclosure Requirements - Labelling',
      category: 'SDR',
      effective_date: '2024-05-31',
      last_reviewed: '2024-01-15',
      requirements: [
        'Accurate use of sustainability labels',
        'Evidence-based sustainability claims',
        'Clear explanation of label meanings',
        'Appropriate client categorization'
      ],
      validation_rules: [
        'label_explanation_required',
        'preference_level_mapping',
        'impact_goals_for_impact_labels',
        'reporting_frequency_for_impact'
      ],
      system_impact: 'high'
    },
    
    // Anti-Greenwashing Rule
    'ANTI_GREENWASHING': {
      id: 'ANTI_GREENWASHING',
      title: 'Anti-Greenwashing Rule',
      category: 'ANTI_GREENWASHING',
      effective_date: '2024-05-31',
      last_reviewed: '2024-01-15',
      requirements: [
        'Fair and clear sustainability claims',
        'Evidence-based claims',
        'Not misleading presentation',
        'Proportionate prominence of disclaimers'
      ],
      validation_rules: [
        'agr_disclaimer_presented',
        'evidence_based_claims',
        'clear_exclusion_thresholds'
      ],
      system_impact: 'high'
    }
  }
};

/**
 * Regulatory change tracking and management
 */
export class RegulatoryChangeManager {
  constructor() {
    this.changeLog = this.loadChangeLog();
    this.pendingChanges = [];
    this.validationRules = new Map();
    this.initializeValidationRules();
  }
  
  /**
   * Load regulatory change log from persistent storage
   */
  loadChangeLog() {
    const changeLogPath = join(process.cwd(), 'server/data/regulatory_changes.json');
    
    if (existsSync(changeLogPath)) {
      try {
        const data = readFileSync(changeLogPath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.warn('Failed to load regulatory change log:', error.message);
      }
    }
    
    // Initialize empty change log
    return {
      version: '1.0.0',
      created_at: new Date().toISOString(),
      changes: [],
      last_review_date: new Date().toISOString()
    };
  }
  
  /**
   * Save regulatory change log to persistent storage
   */
  saveChangeLog() {
    const changeLogPath = join(process.cwd(), 'server/data/regulatory_changes.json');
    
    try {
      writeFileSync(changeLogPath, JSON.stringify(this.changeLog, null, 2));
    } catch (error) {
      console.error('Failed to save regulatory change log:', error.message);
    }
  }
  
  /**
   * Initialize validation rules from current regulatory requirements
   */
  initializeValidationRules() {
    Object.values(CURRENT_REGULATORY_RULES.rules).forEach(rule => {
      rule.validation_rules.forEach(validationRule => {
        this.validationRules.set(validationRule, {
          rule_id: rule.id,
          category: rule.category,
          requirement: validationRule,
          system_impact: rule.system_impact
        });
      });
    });
  }
  
  /**
   * Register a new regulatory change
   * @param {Object} change - Regulatory change details
   */
  registerRegulatoryChange(change) {
    const changeRecord = {
      id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      source: change.source || 'manual',
      category: change.category,
      change_type: change.change_type,
      title: change.title,
      description: change.description,
      effective_date: change.effective_date,
      impact_level: change.impact_level,
      affected_rules: change.affected_rules || [],
      system_changes_required: change.system_changes_required || [],
      validation_changes: change.validation_changes || [],
      status: 'pending_review',
      reviewed_by: null,
      reviewed_at: null,
      implemented_at: null,
      implementation_notes: null
    };
    
    this.changeLog.changes.push(changeRecord);
    this.pendingChanges.push(changeRecord);
    this.saveChangeLog();
    
    // Trigger impact assessment
    const impactAssessment = this.assessRegulatoryImpact(changeRecord);
    changeRecord.impact_assessment = impactAssessment;
    
    return changeRecord;
  }
  
  /**
   * Assess the impact of a regulatory change on the system
   * @param {Object} change - Regulatory change record
   * @returns {Object} Impact assessment
   */
  assessRegulatoryImpact(change) {
    const assessment = {
      timestamp: new Date().toISOString(),
      impact_level: change.impact_level,
      affected_components: [],
      required_changes: [],
      estimated_effort: 'unknown',
      compliance_risk: 'low',
      implementation_priority: 'normal'
    };
    
    // Analyze affected rules and map to system components
    change.affected_rules.forEach(ruleId => {
      const rule = CURRENT_REGULATORY_RULES.rules[ruleId];
      if (rule) {
        // Map rule to system components
        const components = this.mapRuleToComponents(rule);
        assessment.affected_components.push(...components);
        
        // Determine required changes
        const requiredChanges = this.determineRequiredChanges(rule, change);
        assessment.required_changes.push(...requiredChanges);
      }
    });
    
    // Assess compliance risk
    assessment.compliance_risk = this.assessComplianceRisk(change);
    
    // Determine implementation priority
    assessment.implementation_priority = this.determineImplementationPriority(change, assessment);
    
    // Estimate effort
    assessment.estimated_effort = this.estimateImplementationEffort(assessment);
    
    return assessment;
  }
  
  /**
   * Map regulatory rule to system components
   * @param {Object} rule - Regulatory rule
   * @returns {Array} Affected system components
   */
  mapRuleToComponents(rule) {
    const componentMap = {
      'COBS': [
        'conversationEngine.js',
        'validateSession.js',
        'complianceSystem.js'
      ],
      'CONSUMER_DUTY': [
        'conversationEngine.js',
        'educationModules.js',
        'complianceSystem.js'
      ],
      'SDR': [
        'conversationEngine.js',
        'investmentUniverse.js',
        'complianceSystem.js'
      ],
      'ANTI_GREENWASHING': [
        'conversationEngine.js',
        'educationModules.js',
        'complianceSystem.js'
      ],
      'GDPR': [
        'sessionStore.js',
        'complianceSystem.js'
      ],
      'PROD': [
        'conversationEngine.js',
        'investmentUniverse.js'
      ]
    };
    
    return componentMap[rule.category] || [];
  }
  
  /**
   * Determine required changes for a regulatory update
   * @param {Object} rule - Affected rule
   * @param {Object} change - Regulatory change
   * @returns {Array} Required system changes
   */
  determineRequiredChanges(rule, change) {
    const changes = [];
    
    if (change.change_type === REGULATORY_CONFIG.CHANGE_TYPES.NEW_RULE) {
      changes.push({
        type: 'add_validation_rule',
        component: 'validateSession.js',
        description: `Add validation for new rule: ${rule.title}`
      });
      
      changes.push({
        type: 'update_compliance_reasons',
        component: 'complianceSystem.js',
        description: `Add compliance explanations for: ${rule.title}`
      });
    }
    
    if (change.change_type === REGULATORY_CONFIG.CHANGE_TYPES.RULE_AMENDMENT) {
      changes.push({
        type: 'modify_validation_rule',
        component: 'validateSession.js',
        description: `Update validation for amended rule: ${rule.title}`
      });
    }
    
    if (change.validation_changes && change.validation_changes.length > 0) {
      change.validation_changes.forEach(validationChange => {
        changes.push({
          type: 'update_validation',
          component: 'validateSession.js',
          description: `Update validation: ${validationChange}`
        });
      });
    }
    
    return changes;
  }
  
  /**
   * Assess compliance risk level
   * @param {Object} change - Regulatory change
   * @returns {string} Risk level
   */
  assessComplianceRisk(change) {
    if (change.impact_level === REGULATORY_CONFIG.IMPACT_LEVELS.CRITICAL) {
      return 'critical';
    }
    
    if (change.change_type === REGULATORY_CONFIG.CHANGE_TYPES.ENFORCEMENT_NOTICE) {
      return 'high';
    }
    
    if (change.category === 'CONSUMER_DUTY' || change.category === 'COBS') {
      return 'high';
    }
    
    if (change.impact_level === REGULATORY_CONFIG.IMPACT_LEVELS.HIGH) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * Determine implementation priority
   * @param {Object} change - Regulatory change
   * @param {Object} assessment - Impact assessment
   * @returns {string} Implementation priority
   */
  determineImplementationPriority(change, assessment) {
    if (assessment.compliance_risk === 'critical') {
      return 'urgent';
    }
    
    if (change.impact_level === REGULATORY_CONFIG.IMPACT_LEVELS.CRITICAL) {
      return 'urgent';
    }
    
    if (assessment.compliance_risk === 'high' || 
        change.impact_level === REGULATORY_CONFIG.IMPACT_LEVELS.HIGH) {
      return 'high';
    }
    
    if (change.impact_level === REGULATORY_CONFIG.IMPACT_LEVELS.MEDIUM) {
      return 'normal';
    }
    
    return 'low';
  }
  
  /**
   * Estimate implementation effort
   * @param {Object} assessment - Impact assessment
   * @returns {string} Effort estimate
   */
  estimateImplementationEffort(assessment) {
    const componentCount = assessment.affected_components.length;
    const changeCount = assessment.required_changes.length;
    
    if (componentCount >= 5 || changeCount >= 10) {
      return 'large';
    }
    
    if (componentCount >= 3 || changeCount >= 5) {
      return 'medium';
    }
    
    if (componentCount >= 1 || changeCount >= 1) {
      return 'small';
    }
    
    return 'minimal';
  }
  
  /**
   * Validate current system against regulatory requirements
   * @param {Object} session - Session to validate
   * @returns {Object} Regulatory compliance validation results
   */
  validateRegulatoryCompliance(session) {
    const results = {
      timestamp: new Date().toISOString(),
      overall_compliance: true,
      rule_validations: [],
      critical_issues: [],
      warnings: [],
      recommendations: []
    };
    
    // Validate against each current regulatory rule
    Object.values(CURRENT_REGULATORY_RULES.rules).forEach(rule => {
      const ruleValidation = this.validateAgainstRule(session, rule);
      results.rule_validations.push(ruleValidation);
      
      if (!ruleValidation.compliant) {
        results.overall_compliance = false;
        
        if (rule.system_impact === 'critical') {
          results.critical_issues.push(...ruleValidation.issues);
        } else {
          results.warnings.push(...ruleValidation.issues);
        }
      }
      
      results.recommendations.push(...ruleValidation.recommendations);
    });
    
    // Add audit entry for regulatory validation
    if (session) {
      createComplianceAuditEntry(session, 'regulatory_compliance_check', {
        overall_compliance: results.overall_compliance,
        critical_issues_count: results.critical_issues.length,
        warnings_count: results.warnings.length,
        applicable_rules: Object.keys(CURRENT_REGULATORY_RULES.rules),
        compliance_status: results.overall_compliance ? 'compliant' : 'non_compliant'
      });
    }
    
    return results;
  }
  
  /**
   * Validate session against a specific regulatory rule
   * @param {Object} session - Session to validate
   * @param {Object} rule - Regulatory rule
   * @returns {Object} Rule-specific validation results
   */
  validateAgainstRule(session, rule) {
    const validation = {
      rule_id: rule.id,
      rule_title: rule.title,
      category: rule.category,
      compliant: true,
      issues: [],
      recommendations: [],
      validated_at: new Date().toISOString()
    };
    
    const data = session?.data || {};
    
    // Apply rule-specific validation logic
    rule.validation_rules.forEach(validationRule => {
      const ruleResult = this.applyValidationRule(data, validationRule, rule);
      
      if (!ruleResult.passed) {
        validation.compliant = false;
        validation.issues.push(ruleResult.issue);
      }
      
      if (ruleResult.recommendation) {
        validation.recommendations.push(ruleResult.recommendation);
      }
    });
    
    return validation;
  }
  
  /**
   * Apply a specific validation rule
   * @param {Object} data - Session data
   * @param {string} validationRule - Validation rule name
   * @param {Object} rule - Parent regulatory rule
   * @returns {Object} Validation result
   */
  applyValidationRule(data, validationRule, rule) {
    const result = {
      rule: validationRule,
      passed: true,
      issue: null,
      recommendation: null
    };
    
    switch (validationRule) {
      case 'client_type_mandatory':
        if (!data.client_profile?.client_type) {
          result.passed = false;
          result.issue = `${rule.id}: Client type is mandatory for suitability assessment`;
        }
        break;
        
      case 'objectives_mandatory':
        if (!data.client_profile?.objectives) {
          result.passed = false;
          result.issue = `${rule.id}: Investment objectives must be captured`;
        }
        break;
        
      case 'explanation_shown_mandatory':
        if (!data.audit?.explanation_shown) {
          result.passed = false;
          result.issue = `${rule.id}: Client must receive clear explanation of the process`;
        }
        break;
        
      case 'agr_disclaimer_presented':
        if (data.sustainability_preferences?.preference_level !== 'none' && 
            !data.disclosures?.agr_disclaimer_presented) {
          result.passed = false;
          result.issue = `${rule.id}: Anti-greenwashing disclaimer must be presented for sustainability preferences`;
        }
        break;
        
      case 'impact_goals_for_impact_labels':
        const labels = data.sustainability_preferences?.labels_interest || [];
        const hasImpactLabel = labels.some(label => /impact/i.test(label));
        if (hasImpactLabel && (!data.sustainability_preferences?.impact_goals || 
            data.sustainability_preferences.impact_goals.length === 0)) {
          result.passed = false;
          result.issue = `${rule.id}: Impact labels require specific impact goals`;
        }
        break;
        
      // Add more validation rules as needed
      default:
        result.recommendation = `Validation rule '${validationRule}' not implemented yet`;
    }
    
    return result;
  }
  
  /**
   * Get pending regulatory changes requiring review
   * @returns {Array} Pending changes
   */
  getPendingChanges() {
    return this.changeLog.changes.filter(change => 
      change.status === 'pending_review' || change.status === 'approved'
    );
  }
  
  /**
   * Mark a regulatory change as reviewed
   * @param {string} changeId - Change ID
   * @param {string} reviewedBy - Reviewer identifier
   * @param {string} status - New status
   * @param {string} notes - Review notes
   */
  reviewRegulatoryChange(changeId, reviewedBy, status, notes = null) {
    const change = this.changeLog.changes.find(c => c.id === changeId);
    
    if (change) {
      change.status = status;
      change.reviewed_by = reviewedBy;
      change.reviewed_at = new Date().toISOString();
      change.review_notes = notes;
      
      this.saveChangeLog();
    }
    
    return change;
  }
  
  /**
   * Mark a regulatory change as implemented
   * @param {string} changeId - Change ID
   * @param {string} implementedBy - Implementer identifier
   * @param {string} notes - Implementation notes
   */
  markChangeImplemented(changeId, implementedBy, notes = null) {
    const change = this.changeLog.changes.find(c => c.id === changeId);
    
    if (change) {
      change.status = 'implemented';
      change.implemented_by = implementedBy;
      change.implemented_at = new Date().toISOString();
      change.implementation_notes = notes;
      
      // Remove from pending changes
      this.pendingChanges = this.pendingChanges.filter(c => c.id !== changeId);
      
      this.saveChangeLog();
    }
    
    return change;
  }
  
  /**
   * Generate regulatory compliance report
   * @param {Array} sessions - Sessions to analyze
   * @returns {Object} Compliance report
   */
  generateComplianceReport(sessions = []) {
    const report = {
      generated_at: new Date().toISOString(),
      regulatory_version: CURRENT_REGULATORY_RULES.version,
      sessions_analyzed: sessions.length,
      overall_compliance_rate: 0,
      rule_compliance: {},
      pending_changes: this.getPendingChanges().length,
      recommendations: []
    };
    
    if (sessions.length === 0) {
      return report;
    }
    
    let compliantSessions = 0;
    const ruleCompliance = {};
    
    // Initialize rule compliance tracking
    Object.keys(CURRENT_REGULATORY_RULES.rules).forEach(ruleId => {
      ruleCompliance[ruleId] = {
        total_sessions: 0,
        compliant_sessions: 0,
        compliance_rate: 0,
        common_issues: []
      };
    });
    
    // Analyze each session
    sessions.forEach(session => {
      const validation = this.validateRegulatoryCompliance(session);
      
      if (validation.overall_compliance) {
        compliantSessions++;
      }
      
      // Track rule-specific compliance
      validation.rule_validations.forEach(ruleValidation => {
        const ruleStats = ruleCompliance[ruleValidation.rule_id];
        if (ruleStats) {
          ruleStats.total_sessions++;
          if (ruleValidation.compliant) {
            ruleStats.compliant_sessions++;
          } else {
            ruleStats.common_issues.push(...ruleValidation.issues);
          }
        }
      });
    });
    
    // Calculate compliance rates
    report.overall_compliance_rate = (compliantSessions / sessions.length) * 100;
    
    Object.keys(ruleCompliance).forEach(ruleId => {
      const stats = ruleCompliance[ruleId];
      if (stats.total_sessions > 0) {
        stats.compliance_rate = (stats.compliant_sessions / stats.total_sessions) * 100;
      }
    });
    
    report.rule_compliance = ruleCompliance;
    
    // Generate recommendations
    Object.entries(ruleCompliance).forEach(([ruleId, stats]) => {
      if (stats.compliance_rate < 95 && stats.total_sessions > 0) {
        report.recommendations.push({
          type: 'compliance_improvement',
          rule_id: ruleId,
          current_rate: stats.compliance_rate,
          description: `Rule ${ruleId} compliance rate is ${stats.compliance_rate.toFixed(1)}% - review common issues`
        });
      }
    });
    
    return report;
  }
}

// Export singleton instance
export const regulatoryChangeManager = new RegulatoryChangeManager();

/**
 * Utility functions for regulatory change management
 */

/**
 * Register a new FCA rule update
 * @param {Object} ruleUpdate - FCA rule update details
 */
export const registerFCARuleUpdate = (ruleUpdate) => {
  return regulatoryChangeManager.registerRegulatoryChange({
    source: 'FCA',
    category: ruleUpdate.category || 'COBS',
    change_type: REGULATORY_CONFIG.CHANGE_TYPES.RULE_AMENDMENT,
    title: ruleUpdate.title,
    description: ruleUpdate.description,
    effective_date: ruleUpdate.effective_date,
    impact_level: ruleUpdate.impact_level || REGULATORY_CONFIG.IMPACT_LEVELS.MEDIUM,
    affected_rules: ruleUpdate.affected_rules || [],
    system_changes_required: ruleUpdate.system_changes_required || [],
    validation_changes: ruleUpdate.validation_changes || []
  });
};

/**
 * Validate session against current regulatory requirements
 * @param {Object} session - Session to validate
 * @returns {Object} Validation results
 */
export const validateSessionRegulatoryCompliance = (session) => {
  return regulatoryChangeManager.validateRegulatoryCompliance(session);
};

/**
 * Get regulatory compliance status for a session
 * @param {Object} session - Session to check
 * @returns {Object} Compliance status
 */
export const getRegulatoryComplianceStatus = (session) => {
  const validation = regulatoryChangeManager.validateRegulatoryCompliance(session);
  
  return {
    compliant: validation.overall_compliance,
    critical_issues: validation.critical_issues.length,
    warnings: validation.warnings.length,
    last_checked: validation.timestamp,
    applicable_rules: validation.rule_validations.map(rv => rv.rule_id)
  };
};