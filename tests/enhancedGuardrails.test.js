// Enhanced Guardrail System Tests
// Tests for the enhanced guardrail and risk management functionality

import { test } from 'node:test';
import assert from 'node:assert';
import { 
  evaluateSessionGuardrails, 
  getSessionRiskAssessment,
  ENHANCED_GUARDRAIL_CONFIG,
  ENHANCED_GUARDRAIL_RULES
} from '../server/state/enhancedGuardrails.js';
import {
  validateSessionRegulatoryCompliance,
  CURRENT_REGULATORY_RULES
} from '../server/state/regulatoryChangeManager.js';

const createMockSession = () => {
  return {
    id: 'test-session-123',
    stage: 'SEGMENT_B_ONBOARDING',
    data: {
      client_profile: {
        client_type: 'individual',
        objectives: 'growth',
        horizon_years: 5,
        risk_tolerance: 6,
        capacity_for_loss: 'low',
        liquidity_needs: 'minimal',
        knowledge_experience: {
          summary: 'Limited experience with investments',
          instruments: ['stocks'],
          frequency: 'rarely',
          duration: 'less than 1 year'
        }
      },
      sustainability_preferences: {
        preference_level: 'detailed',
        labels_interest: ['Impact'],
        themes: ['climate'],
        exclusions: [],
        impact_goals: [],
        engagement_importance: 'high',
        reporting_frequency_pref: 'quarterly',
        tradeoff_tolerance: 'moderate'
      },
      consent: {
        data_processing: {
          granted: true,
          timestamp: new Date().toISOString()
        }
      },
      audit: {
        explanation_shown: true,
        events: []
      }
    }
  };
};

test('Enhanced Guardrail System - should detect critical risk-capacity mismatch', () => {
  const mockSession = createMockSession();
  const results = evaluateSessionGuardrails(mockSession);
  
  assert.ok(results.triggered_guardrails, 'Should have triggered guardrails');
  assert.ok(results.overall_risk_score > 0, 'Should have risk score greater than 0');
  
  // Should trigger risk-capacity mismatch guardrail
  const riskCapacityTrigger = results.triggered_guardrails.find(
    g => g.rule_id === 'RISK_CAPACITY_CRITICAL_MISMATCH'
  );
  assert.ok(riskCapacityTrigger, 'Should trigger risk-capacity mismatch guardrail');
  assert.strictEqual(riskCapacityTrigger.escalation_level, ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.IMMEDIATE);
});

test('Enhanced Guardrail System - should detect impact investment without clear goals', () => {
  const mockSession = createMockSession();
  const results = evaluateSessionGuardrails(mockSession);
  
  // Should trigger impact without understanding guardrail
  const impactTrigger = results.triggered_guardrails.find(
    g => g.rule_id === 'IMPACT_WITHOUT_UNDERSTANDING'
  );
  assert.ok(impactTrigger, 'Should trigger impact without understanding guardrail');
  assert.strictEqual(impactTrigger.escalation_level, ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.ADVISOR_REVIEW);
});

test('Enhanced Guardrail System - should require escalation for critical issues', () => {
  const mockSession = createMockSession();
  const results = evaluateSessionGuardrails(mockSession);
  
  assert.strictEqual(results.escalation_required, true, 'Should require escalation');
  assert.strictEqual(results.highest_escalation_level, ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.IMMEDIATE);
});

test('Enhanced Guardrail System - should provide risk assessment summary', () => {
  const mockSession = createMockSession();
  const riskAssessment = getSessionRiskAssessment(mockSession);
  
  assert.ok(riskAssessment.risk_score !== undefined, 'Should have risk score');
  assert.ok(riskAssessment.escalation_level !== undefined, 'Should have escalation level');
  assert.ok(riskAssessment.triggered_guardrails !== undefined, 'Should have triggered guardrails count');
  assert.ok(riskAssessment.last_assessed !== undefined, 'Should have last assessed timestamp');
});

test('Enhanced Guardrail System - should validate regulatory compliance', () => {
  const mockSession = createMockSession();
  const complianceResults = validateSessionRegulatoryCompliance(mockSession);
  
  assert.ok(complianceResults.overall_compliance !== undefined, 'Should have overall compliance status');
  assert.ok(complianceResults.rule_validations !== undefined, 'Should have rule validations');
  assert.ok(complianceResults.rule_validations.length > 0, 'Should have at least one rule validation');
  
  // Check that COBS 9A rules are validated
  const cobs9aValidation = complianceResults.rule_validations.find(
    rv => rv.rule_id === 'COBS_9A_2_1'
  );
  assert.ok(cobs9aValidation, 'Should validate COBS 9A rules');
});

test('Enhanced Guardrail System - should validate guardrail rule configuration', () => {
  // Ensure all guardrail rules have required properties
  Object.values(ENHANCED_GUARDRAIL_RULES).forEach(rule => {
    assert.ok(rule.id, `Rule ${rule.id || 'unknown'} should have id`);
    assert.ok(rule.category, `Rule ${rule.id} should have category`);
    assert.ok(rule.name, `Rule ${rule.id} should have name`);
    assert.ok(rule.description, `Rule ${rule.id} should have description`);
    assert.ok(rule.risk_score !== undefined, `Rule ${rule.id} should have risk_score`);
    assert.ok(rule.escalation_level, `Rule ${rule.id} should have escalation_level`);
    assert.ok(rule.trigger_condition, `Rule ${rule.id} should have trigger_condition`);
    assert.strictEqual(typeof rule.trigger_condition, 'function', `Rule ${rule.id} trigger_condition should be function`);
    assert.ok(rule.required_actions, `Rule ${rule.id} should have required_actions`);
    assert.ok(Array.isArray(rule.required_actions), `Rule ${rule.id} required_actions should be array`);
    assert.ok(rule.regulatory_basis, `Rule ${rule.id} should have regulatory_basis`);
  });
});

test('Enhanced Guardrail System - should validate regulatory rules configuration', () => {
  // Ensure all regulatory rules have required properties
  Object.values(CURRENT_REGULATORY_RULES.rules).forEach(rule => {
    assert.ok(rule.id, `Rule ${rule.id || 'unknown'} should have id`);
    assert.ok(rule.title, `Rule ${rule.id} should have title`);
    assert.ok(rule.category, `Rule ${rule.id} should have category`);
    assert.ok(rule.effective_date, `Rule ${rule.id} should have effective_date`);
    assert.ok(rule.requirements, `Rule ${rule.id} should have requirements`);
    assert.ok(Array.isArray(rule.requirements), `Rule ${rule.id} requirements should be array`);
    assert.ok(rule.validation_rules, `Rule ${rule.id} should have validation_rules`);
    assert.ok(Array.isArray(rule.validation_rules), `Rule ${rule.id} validation_rules should be array`);
    assert.ok(rule.system_impact, `Rule ${rule.id} should have system_impact`);
  });
});