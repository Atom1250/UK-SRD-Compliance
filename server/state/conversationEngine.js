import { randomUUID } from "node:crypto";
import {
  CAPACITY_FOR_LOSS_VALUES,
  CLIENT_TYPES,
  OBJECTIVE_OPTIONS,
  PATHWAY_NAMES,
  PREFERENCE_LEVELS,
  REPORTING_FREQUENCY_OPTIONS,
  RISK_SCALE,
  STAGE_PROMPTS
} from "./constants.js";
import {
  processMultiModalInput,
  detectClientSophistication,
  generateAdaptivePrompt,
  shouldOfferAlternativeInput,
  generateInputModeSuggestions,
  SOPHISTICATION_LEVELS,
  INPUT_MODES
} from "./inputProcessor.js";
import {
  ConversationContextStack,
  analyzeSentiment,
  trackClientEngagement,
  adaptConversationStyle,
  personalizeResponse,
  manageConversationRecovery,
  CONTEXT_TYPES,
  SENTIMENT_CATEGORIES,
  ENGAGEMENT_LEVELS
} from "./contextManager.js";
import {
  performComprehensiveNLP,
  personalizeResponseWithNLP,
  INTENT_CATEGORIES,
  LANGUAGE_COMPLEXITY
} from "./enhancedNLP.js";
import {
  trackAnalyticsEvent,
  analyzeConversationEffectiveness,
  generateConversationSummary,
  ANALYTICS_EVENT_TYPES
} from "./conversationAnalytics.js";
import { 
  EDUCATION_MODULES, 
  trackEducationalProgress, 
  recordComprehensionResponse, 
  trackPdfDownload,
  getEducationalRecommendations,
  generateEducationalSummary
} from './educationModules.js';
import {
  ENHANCED_COMPLIANCE_REASONS,
  createComplianceAuditEntry,
  validateComplianceCheckpoint,
  generateComplianceSummary
} from './complianceSystem.js';
import {
  evaluateSessionGuardrails,
  getSessionRiskAssessment,
  requiresEscalation,
  ENHANCED_GUARDRAIL_CONFIG
} from './enhancedGuardrails.js';
import {
  validateSessionRegulatoryCompliance,
  getRegulatoryComplianceStatus
} from './regulatoryChangeManager.js';
import {
  appendEvent,
  applyDataPatch,
  saveSession,
  setStage
} from "./sessionStore.js";

// Import session monitor for real-time notifications
let sessionMonitor = null;
try {
  const { sessionMonitor: monitor } = await import("../websocket/sessionMonitor.js");
  sessionMonitor = monitor;
} catch (error) {
  // WebSocket monitor not available, continue without real-time features
}
import { validateSessionData } from "./validateSession.js";
import {
  AUTHORIZED_INVESTMENTS,
  MARKET_ALTERNATIVES
} from "./investmentUniverse.js";
import { generateReportArtifacts } from "../report/reportGenerator.js";
import { storeReportArtifacts } from "../report/reportStore.js";
import openAiClient from "../integrations/openAiClient.js";

const { callComplianceResponder, COMPLIANCE_SYSTEM_PROMPT } = openAiClient;

const yesPatterns =
  /\b(yes|yep|i (consent|agree|understand|accept)|sure|ok(ay)?|ready|understood)\b/i;
const noPatterns = /\b(no|nope|not (yet|now)|decline|refuse)\b/i;

// Enhanced input sanitization and validation
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potentially harmful characters and normalize whitespace
  return input
    .replace(/[<>]/g, '') // Remove angle brackets to prevent XSS
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 10000); // Limit input length to prevent DoS
};

// Enhanced guardrail evaluation and risk management
export const evaluateEnhancedGuardrails = (session) => {
  try {
    // Run enhanced guardrail evaluation
    const guardrailResults = evaluateSessionGuardrails(session);
    
    // Get regulatory compliance status
    const regulatoryStatus = getRegulatoryComplianceStatus(session);
    
    // Combine results
    const combinedResults = {
      timestamp: new Date().toISOString(),
      session_id: session.id,
      guardrail_evaluation: guardrailResults,
      regulatory_compliance: regulatoryStatus,
      overall_risk_level: determineOverallRiskLevel(guardrailResults, regulatoryStatus),
      escalation_required: guardrailResults.escalation_required || !regulatoryStatus.compliant,
      required_actions: [
        ...guardrailResults.required_actions,
        ...(regulatoryStatus.critical_issues > 0 ? ['Address regulatory compliance issues'] : [])
      ],
      recommendations: guardrailResults.recommendations
    };
    
    // Notify WebSocket monitor if escalation required
    if (sessionMonitor && combinedResults.escalation_required) {
      sessionMonitor.notifyGuardrailTrigger(session.id, 'enhanced_guardrail_escalation', {
        message: `Enhanced guardrail evaluation requires escalation`,
        riskLevel: combinedResults.overall_risk_level,
        escalationLevel: guardrailResults.highest_escalation_level,
        triggeredGuardrails: guardrailResults.triggered_guardrails.length,
        regulatoryIssues: regulatoryStatus.critical_issues + regulatoryStatus.warnings
      });
    }
    
    // Create audit entry
    createComplianceAuditEntry(session, 'enhanced_guardrail_evaluation', {
      overall_risk_level: combinedResults.overall_risk_level,
      triggered_guardrails: guardrailResults.triggered_guardrails.length,
      escalation_required: combinedResults.escalation_required,
      regulatory_compliant: regulatoryStatus.compliant,
      applicable_rules: ['enhanced_guardrails', 'regulatory_compliance']
    });
    
    return combinedResults;
  } catch (error) {
    console.error('Error in enhanced guardrail evaluation:', error);
    
    // Fallback to basic evaluation
    return {
      timestamp: new Date().toISOString(),
      session_id: session.id,
      error: 'Enhanced guardrail evaluation failed',
      fallback_used: true,
      escalation_required: false,
      overall_risk_level: 'unknown'
    };
  }
};

// Determine overall risk level from multiple assessments
const determineOverallRiskLevel = (guardrailResults, regulatoryStatus) => {
  // Critical if regulatory non-compliance or critical guardrails
  if (!regulatoryStatus.compliant || 
      guardrailResults.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.CRITICAL) {
    return 'critical';
  }
  
  // High if high risk score or multiple warnings
  if (guardrailResults.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.HIGH ||
      regulatoryStatus.warnings >= 3) {
    return 'high';
  }
  
  // Medium if medium risk score or some warnings
  if (guardrailResults.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.MEDIUM ||
      regulatoryStatus.warnings >= 1) {
    return 'medium';
  }
  
  // Low if low risk score
  if (guardrailResults.overall_risk_score >= ENHANCED_GUARDRAIL_CONFIG.RISK_THRESHOLDS.LOW) {
    return 'low';
  }
  
  return 'minimal';
};

const normalise = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return sanitizeInput(value).toLowerCase();
};

const splitList = (text) => {
  if (typeof text !== 'string') {
    return [];
  }
  
  const sanitized = sanitizeInput(text);
  return sanitized
    .split(/[,\n]|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50); // Limit number of items to prevent abuse
};

const parseInteger = (value) => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return NaN;
  }
  
  const sanitized = typeof value === 'string' ? sanitizeInput(value) : String(value);
  const parsed = Number.parseInt(sanitized, 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseMoneyValue = (text, keyword) => {
  if (typeof text !== 'string' || typeof keyword !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeInput(text);
  const sanitizedKeyword = sanitizeInput(keyword);
  
  try {
    const pattern = new RegExp(`${sanitizedKeyword}[^\n\r\d]*([\d,.]+)`, "i");
    const match = sanitized.match(pattern);
    if (!match) return null;
    
    const numeric = Number(match[1].replace(/,/g, ""));
    // Validate reasonable money values (0 to 1 billion)
    return Number.isFinite(numeric) && numeric >= 0 && numeric <= 1000000000 ? numeric : null;
  } catch (error) {
    console.warn('Error parsing money value:', error.message);
    return null;
  }
};

const ONBOARDING_QUESTIONS = {
  0: "Are you investing as an individual, joint, trust, or company?",
  1: "What’s your main investment goal? (growth, income, preservation, impact, or other)",
  2: "How long do you expect to keep this money invested? Please provide the number of years.",
  3: "On a scale of 1 (very low) to 7 (very high), how comfortable are you with investment risk?",
  4: "If markets fall, how much loss could you afford without affecting your lifestyle? (low, medium, high)",
  5: "Will you need to withdraw funds at specific times?",
  6: "Have you invested before? Please describe which instruments, how often, and for how long.",
  7: "Would you like to record income, assets, and liabilities for context?",
  8: "Please share any income, assets, and liabilities you’d like recorded (for example: Income £60k, Assets £250k, Liabilities £40k)."
};

const CONSENT_QUESTIONS = {
  0: "Do you consent to us processing your data for this advice session?",
  1: "Do you consent to receive documents electronically (e-delivery)?",
  2: "Can we contact you in the future with relevant updates?",
  3: "What purpose should we note for future contact (for example, annual review or product updates)?"
};

const OPTIONS_QUESTIONS = {
  preferenceLevel: "Do you have sustainability preferences? Choose from: none, high_level, or detailed.",
  1: "Which FCA SDR labels interest you?",
  2: "Are there particular sustainability themes you want to focus on? (e.g. climate, biodiversity, social equity)",
  3: "Please list any exclusions and thresholds (for example: Fossil fuels under 5%, Tobacco 0%).",
  4: "Do you have any specific impact goals (for example: SDG 7 affordable clean energy)?",
  5: "How important is active stewardship or engagement from managers?",
  6: "How often would you like sustainability reporting updates? (none, quarterly, semiannual, annual)",
  7: "How much investment performance trade-off are you willing to accept for sustainability outcomes?"
};

const COMPLIANCE_REASONS = {
  SEGMENT_B_ONBOARDING: {
    0: "I record whether you’re investing as an individual, joint client, trust, or company so Consumer Duty and PROD checks line up with the right permissions.",
    1: "Understanding your main goal helps me evidence suitability against COBS 9A – advice must reflect what you’re trying to achieve.",
    2: "Knowing your investment horizon lets me check that any strategy remains suitable over time, which the rules require.",
    3: "Capturing your risk tolerance ensures recommendations match the level of volatility you can handle under COBS 9A.",
    4: "Capacity for loss is a mandatory field so we understand how much downside you can absorb before your lifestyle is affected.",
    5: "Liquidity needs stop us from locking money away when you might need access – that’s part of the PROD governance checks.",
    6: "Your knowledge and experience guide me toward products that are appropriate for you.",
    7: "Financial context helps an adviser check affordability and Consumer Duty outcomes, even if you opt to keep it high level.",
    8: "Those financial notes give the adviser evidence for affordability and ongoing suitability reviews.",
    risk_override:
      "Because you selected a higher risk level than your loss capacity, I must double-check you’re comfortable proceeding to satisfy COBS 9A."
  },
  SEGMENT_C_CONSENT: {
    0: "Data processing consent is required before we can store or use the information you share.",
    1: "E-delivery consent confirms you’re happy to receive disclosures digitally, which we must evidence.",
    2: "Future contact permissions make sure we respect marketing rules and your preferences.",
    3: "Recording the purpose of future contact shows we’ll only reach out for the reasons you agree to."
  },
  SEGMENT_D_EDUCATION: {
    acknowledgement:
      "The FCA’s Anti-Greenwashing and SDR rules expect us to show you how sustainability claims are evidenced before we continue.",
    summary:
      "Making sure you understand the difference between SDR labels helps keep any recommendation fair, clear, and not misleading."
  },
  SEGMENT_E_OPTIONS: {
    preferenceLevel:
      "Capturing your preference level lets me map you to the right SDR sustainability pathway.",
    1: "Label interests show which SDR categories align with your goals so we only shortlist suitable options.",
    2: "Themes help us prioritise the ESG outcomes you care about when reviewing products.",
    3: "Exclusions need clear thresholds so we avoid funds that would conflict with your values and Anti-Greenwashing commitments.",
    4: "Impact goals are required evidence if we pursue Impact-labelled investments.",
    5: "Stewardship preferences guide how actively managers should engage on your behalf.",
    6: "Reporting frequency ensures we deliver updates often enough to evidence sustainability outcomes.",
    7: "Understanding trade-off tolerance helps balance sustainability aims with performance expectations."
  },
  SEGMENT_F_CONFIRMATION: {
    0: "I’ll replay everything so you can confirm it’s accurate before we generate any reports."
  }
};

// EDUCATION_MODULES now imported from educationModules.js
const OLD_EDUCATION_MODULES_REMOVED = [
  {
    title: "ESG basics",
    keywords: [/\bwhat is esg\b/i, /\besg basics\b/i, /tell me more about esg/i],
    summary:
      "ESG stands for Environmental, Social, and Governance factors – it’s a framework for understanding how companies behave, not a guarantee of positive outcomes."
  },
  {
    title: "Impact investing",
    keywords: [/impact investing/i],
    summary:
      "Impact investing aims for measurable environmental or social outcomes alongside returns. Under the FCA’s Impact label we must evidence those outcomes through stewardship and transparent reporting."
  },
  {
    title: "FCA SDR labels",
    keywords: [/sdr labels?/i, /tell me more about labels/i],
    summary:
      "The FCA SDR labels include Focus, Improvers, Impact, and Mixed Goals. Each label signals how a product pursues sustainability outcomes and what evidence it must provide."
  },
  {
    title: "Anti-Greenwashing",
    keywords: [/anti[- ]?greenwashing/i],
    summary:
      "The Anti-Greenwashing Rule means any sustainability claim we make must be fair, clear, and backed by evidence. We attach disclosures so you can verify what’s promised."
  },
  {
    title: "Risks & trade-offs",
    keywords: [/sustainability risks/i, /trade[- ]?offs/i, /risks of esg/i],
    summary:
      "Sustainable investing can involve tracking error, sector concentration, or short-term underperformance. We weigh those trade-offs so you know where outcomes might differ from the broad market."
  },
  {
    title: "Product governance",
    keywords: [/product governance/i, /prod 3/i],
    summary:
      "Product governance (PROD 3) requires us to match you with solutions designed for your target market and to document how the manufacturer supports those outcomes."
  },
  {
    title: "Switching considerations",
    keywords: [/switching/i, /move my investments/i],
    summary:
      "When switching investments we compare costs, exit penalties, and whether the new product genuinely improves sustainability outcomes before recommending a change."
  },
  {
    title: "Focus vs Improvers",
    keywords: [/focus vs improvers/i, /difference between focus and improvers/i],
    summary:
      "Focus funds back companies already leading on sustainability, while Improvers support firms with credible plans to get better through engagement."
  },
  {
    title: "Exclusions examples",
    keywords: [/examples of exclusions/i, /what exclusions/i],
    summary:
      "Common exclusions include fossil fuels above a set revenue threshold, tobacco, controversial weapons, and severe human-rights breaches."
  },
  {
    title: "Stewardship",
    keywords: [/what does stewardship mean/i, /tell me about stewardship/i, /engagement mean/i],
    summary:
      "Stewardship means fund managers using voting rights and engagement to push companies toward better sustainability practices."
  }
];

const whyNeedPattern = /why do you need( to know)?/i;

const ensureStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(item => typeof item === 'string').slice(0, 100); // Limit array size
};

const appendSessionArrayEntry = (session, key, entry) => {
  if (!entry || typeof entry !== 'string') return;
  
  // Validate session structure
  if (!session || !session.data || typeof session.data !== 'object') {
    console.warn('Invalid session structure in appendSessionArrayEntry');
    return;
  }
  
  if (!Array.isArray(session.data[key])) {
    session.data[key] = [];
  }
  
  // Sanitize entry and limit array size
  const sanitizedEntry = sanitizeInput(entry);
  if (sanitizedEntry && session.data[key].length < 1000) {
    session.data[key].push(sanitizedEntry);
  }
};

const appendAdditionalNote = (session, note) => {
  if (!note || typeof note !== 'string') return;
  
  // Validate session structure
  if (!session || !session.data || typeof session.data !== 'object') {
    console.warn('Invalid session structure in appendAdditionalNote');
    return;
  }
  
  const sanitizedNote = sanitizeInput(note);
  if (!sanitizedNote) return;
  
  const existing = session.data.additional_notes ?? "";
  const newNote = existing ? `${existing}\n${sanitizedNote}` : sanitizedNote;
  
  // Limit total notes length to prevent memory issues
  session.data.additional_notes = newNote.slice(0, 50000);
};

// Enhanced investment research logging with comprehensive audit trails
const appendInvestmentResearchLog = (session, entry) => {
  if (!entry || typeof entry !== 'object') return;
  
  // Validate session structure
  if (!session || !session.data || typeof session.data !== 'object') {
    console.warn('Invalid session structure in appendInvestmentResearchLog');
    return;
  }
  
  if (!Array.isArray(session.data.investment_research)) {
    session.data.investment_research = [];
  }
  
  // Enhanced entry with comprehensive audit information
  const sanitizedEntry = {
    id: randomUUID(),
    at: entry.at || new Date().toISOString(),
    query: typeof entry.query === 'string' ? sanitizeInput(entry.query) : '',
    query_type: entry.query_type || 'general_exploration',
    client_context: {
      stage: session.stage,
      risk_tolerance: session.data?.client_profile?.risk_tolerance,
      objectives: session.data?.client_profile?.objectives,
      horizon_years: session.data?.client_profile?.horizon_years,
      preference_level: session.data?.sustainability_preferences?.preference_level,
      labels_interest: session.data?.sustainability_preferences?.labels_interest || [],
      themes: session.data?.sustainability_preferences?.themes || [],
      exclusions: session.data?.sustainability_preferences?.exclusions || []
    },
    // Maintain backward compatibility for tests
    authorised_matches: Array.isArray(entry.authorised_matches) ? entry.authorised_matches.slice(0, 50) : [],
    alternative_matches: Array.isArray(entry.alternative_matches) ? entry.alternative_matches.slice(0, 50) : [],
    search_results: {
      authorised_matches: Array.isArray(entry.authorised_matches) ? 
        entry.authorised_matches.slice(0, 50).map(matchId => ({
          investment_id: matchId,
          timestamp: new Date().toISOString()
        })) : [],
      alternative_matches: Array.isArray(entry.alternative_matches) ? 
        entry.alternative_matches.slice(0, 50).map(matchId => ({
          investment_id: matchId,
          timestamp: new Date().toISOString()
        })) : [],
      total_universe_size: {
        authorised: AUTHORIZED_INVESTMENTS.length,
        alternatives: MARKET_ALTERNATIVES.length
      }
    },
    match_quality: {
      authorised_count: Array.isArray(entry.authorised_matches) ? entry.authorised_matches.length : 0,
      alternative_count: Array.isArray(entry.alternative_matches) ? entry.alternative_matches.length : 0,
      no_matches: (!entry.authorised_matches?.length && !entry.alternative_matches?.length)
    },
    advisor_flags: {
      requires_review: (!entry.authorised_matches?.length && !entry.alternative_matches?.length),
      complex_preferences: session.data?.sustainability_preferences?.preference_level === 'detailed',
      risk_capacity_mismatch: checkRiskCapacityMismatch(session),
      high_exclusion_requirements: (session.data?.sustainability_preferences?.exclusions?.length || 0) > 3
    },
    session_metadata: {
      session_id: session.id,
      client_ip: session.context?.client_ip,
      user_agent: session.context?.user_agent
    }
  };
  
  if (session.data.investment_research.length < 100) {
    session.data.investment_research.push(sanitizedEntry);
  }
  
  // Trigger advisor notifications if needed
  triggerAdvisorNotifications(session, sanitizedEntry);
};

// Helper function to check risk-capacity mismatch
const checkRiskCapacityMismatch = (session) => {
  const profile = session.data?.client_profile;
  if (!profile?.risk_tolerance || !profile?.capacity_for_loss) return false;
  
  const capacityRiskMap = { 'low': 3, 'medium': 5, 'high': 7 };
  const maxCapacityRisk = capacityRiskMap[normalise(profile.capacity_for_loss)] || 7;
  
  return profile.risk_tolerance > maxCapacityRisk;
};

// Enhanced risk assessment with comprehensive guardrail evaluation
const performEnhancedRiskAssessment = (session) => {
  try {
    // Run enhanced guardrail evaluation
    const enhancedResults = evaluateEnhancedGuardrails(session);
    
    // Store results in session for advisor review
    if (!session.data.risk_assessments) {
      session.data.risk_assessments = [];
    }
    
    session.data.risk_assessments.push({
      timestamp: new Date().toISOString(),
      assessment_type: 'enhanced_guardrails',
      results: enhancedResults,
      triggered_by: 'conversation_flow'
    });
    
    // Return assessment summary
    return {
      riskLevel: enhancedResults.overall_risk_level,
      escalationRequired: enhancedResults.escalation_required,
      criticalIssues: enhancedResults.guardrail_evaluation?.triggered_guardrails?.filter(
        g => g.escalation_level === ENHANCED_GUARDRAIL_CONFIG.ESCALATION_LEVELS.IMMEDIATE
      ) || [],
      recommendations: enhancedResults.recommendations
    };
  } catch (error) {
    console.error('Enhanced risk assessment failed:', error);
    return {
      riskLevel: 'unknown',
      escalationRequired: false,
      criticalIssues: [],
      recommendations: [],
      error: error.message
    };
  }
};

// Enhanced advisor notification system
const triggerAdvisorNotifications = (session, researchEntry) => {
  if (!session.data.advisor_notifications) {
    session.data.advisor_notifications = [];
  }
  
  const notifications = [];
  
  // No matches found - requires manual review
  if (researchEntry.match_quality.no_matches) {
    notifications.push({
      id: randomUUID(),
      type: 'investment_research_no_matches',
      priority: 'high',
      title: 'Investment Research: No Matches Found',
      message: `Client query "${researchEntry.query}" returned no suitable investments. Manual review required.`,
      client_context: researchEntry.client_context,
      created_at: new Date().toISOString(),
      requires_action: true,
      session_id: session.id
    });
  }
  
  // Complex preferences requiring advisor input
  if (researchEntry.advisor_flags.complex_preferences && researchEntry.match_quality.authorised_count > 0) {
    notifications.push({
      id: randomUUID(),
      type: 'investment_research_complex_preferences',
      priority: 'medium',
      title: 'Investment Research: Complex Preferences',
      message: `Client with detailed ESG preferences explored investments. ${researchEntry.match_quality.authorised_count} matches found requiring advisor review.`,
      client_context: researchEntry.client_context,
      created_at: new Date().toISOString(),
      requires_action: true,
      session_id: session.id
    });
  }
  
  // Risk-capacity mismatch detected
  if (researchEntry.advisor_flags.risk_capacity_mismatch) {
    notifications.push({
      id: randomUUID(),
      type: 'investment_research_risk_mismatch',
      priority: 'high',
      title: 'Investment Research: Risk-Capacity Mismatch',
      message: `Client risk tolerance exceeds capacity for loss. Investment recommendations require careful advisor review.`,
      client_context: researchEntry.client_context,
      created_at: new Date().toISOString(),
      requires_action: true,
      session_id: session.id
    });
  }
  
  // High exclusion requirements
  if (researchEntry.advisor_flags.high_exclusion_requirements) {
    notifications.push({
      id: randomUUID(),
      type: 'investment_research_high_exclusions',
      priority: 'medium',
      title: 'Investment Research: Extensive Exclusion Criteria',
      message: `Client has ${researchEntry.client_context.exclusions.length} exclusion criteria. Limited investment universe may require bespoke solutions.`,
      client_context: researchEntry.client_context,
      created_at: new Date().toISOString(),
      requires_action: false,
      session_id: session.id
    });
  }
  
  // Add notifications to session
  notifications.forEach(notification => {
    if (session.data.advisor_notifications.length < 50) {
      session.data.advisor_notifications.push(notification);
    }
  });
  
  // Log advisor notification summary
  if (notifications.length > 0) {
    appendAdditionalNote(session, 
      `Generated ${notifications.length} advisor notification(s): ${notifications.map(n => n.type).join(', ')}`
    );
  }
};

const INVESTMENT_EXPLORER_PATTERNS = [
  /\b(show|list|suggest|recommend)\b.*\b(funds?|portfolios?|securities)\b/i,
  /\b(funds?|portfolios?)\b.*\b(options?|ideas|matches)\b/i,
  /\b(sustainable|esg|impact)\b.*\b(funds?|portfolios?)\b/i,
  /\binvestment options?\b/i,
  /\bmarket scan\b.*\b(funds?|portfolios?|securities)\b/i
];

const pickExactMatches = (preferred, available) => {
  const preferredSet = new Set(
    ensureArray(preferred).map((value) => normalise(value))
  );
  if (preferredSet.size === 0) {
    return [];
  }
  return ensureArray(available).filter((item) =>
    preferredSet.has(normalise(item))
  );
};

// Enhanced exclusion criteria validation
const validateExclusionCriteria = (clientExclusions, investmentExclusions) => {
  if (!clientExclusions || !Array.isArray(clientExclusions) || !investmentExclusions) {
    return { valid: true, reasons: [] };
  }

  const violations = [];
  const satisfied = [];

  for (const clientExclusion of clientExclusions) {
    const sector = normalise(clientExclusion.sector || '');
    const clientThreshold = clientExclusion.threshold || 0;
    
    // Find matching exclusion in investment
    const matchingExclusion = Object.entries(investmentExclusions).find(([key]) => 
      normalise(key.replace(/_/g, ' ')) === sector ||
      normalise(key) === normalise(clientExclusion.sector)
    );

    if (matchingExclusion) {
      const [exclusionKey, exclusionData] = matchingExclusion;
      const investmentThreshold = exclusionData.threshold || 0;
      
      if (investmentThreshold <= clientThreshold) {
        satisfied.push(`${clientExclusion.sector} exposure ${investmentThreshold}% (limit ${clientThreshold}%)`);
      } else {
        violations.push(`${clientExclusion.sector} exposure ${investmentThreshold}% exceeds limit ${clientThreshold}%`);
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
    satisfied,
    reasons: satisfied
  };
};

// Enhanced investment scoring with sophisticated weighting
const evaluateInvestmentMatch = (session, investment) => {
  const profile = session.data?.client_profile ?? {};
  const prefs = session.data?.sustainability_preferences ?? {};
  let score = 0;
  const reasons = [];
  const warnings = [];

  // Core suitability checks (mandatory - return null if failed)
  
  // Risk tolerance alignment (weighted by precision of match)
  if (
    Number.isInteger(profile.risk_tolerance) &&
    Array.isArray(investment.risk_band) &&
    investment.risk_band.length === 2
  ) {
    const [minRisk, maxRisk] = investment.risk_band;
    if (profile.risk_tolerance < minRisk || profile.risk_tolerance > maxRisk) {
      return null; // Hard exclusion
    }
    
    // Bonus for being in the sweet spot of the risk band
    const riskRange = maxRisk - minRisk;
    const riskPosition = (profile.risk_tolerance - minRisk) / riskRange;
    const riskBonus = riskPosition >= 0.3 && riskPosition <= 0.7 ? 0.5 : 0;
    
    score += 2 + riskBonus;
    reasons.push(`Risk level ${profile.risk_tolerance} within range ${minRisk}-${maxRisk}`);
  }

  // Time horizon alignment
  if (
    Number.isInteger(profile.horizon_years) &&
    Number.isFinite(investment.min_horizon_years)
  ) {
    if (profile.horizon_years < investment.min_horizon_years) {
      return null; // Hard exclusion
    }
    
    // Bonus for longer horizons with appropriate investments
    const horizonBonus = profile.horizon_years >= investment.min_horizon_years * 1.5 ? 0.3 : 0;
    score += 1 + horizonBonus;
    reasons.push(`${profile.horizon_years}-year horizon suitable for ${investment.min_horizon_years}+ year investment`);
  }

  // Objectives alignment (enhanced weighting)
  const objectives = ensureArray(investment.objectives);
  if (profile.objectives) {
    const primaryMatch = objectives.some((objective) => 
      normalise(objective) === normalise(profile.objectives)
    );
    
    if (primaryMatch) {
      score += 3; // Increased weight for primary objective match
      reasons.push(`Primary objective alignment: ${profile.objectives}`);
    } else {
      // Check for compatible secondary objectives
      const compatibleObjectives = {
        'growth': ['impact'],
        'income': ['preservation'],
        'preservation': ['income'],
        'impact': ['growth']
      };
      
      const secondaryMatch = objectives.some((objective) =>
        compatibleObjectives[normalise(profile.objectives)]?.includes(normalise(objective))
      );
      
      if (secondaryMatch) {
        score += 1;
        reasons.push(`Compatible secondary objective match`);
      }
    }
  }

  // Sustainability preference level compatibility
  const preferenceLevel = prefs.preference_level ?? "none";
  if (preferenceLevel !== "none") {
    const supportedLevels = ensureArray(investment.preference_levels);
    if (
      supportedLevels.length > 0 &&
      !supportedLevels.some((level) => normalise(level) === normalise(preferenceLevel))
    ) {
      return null; // Hard exclusion
    }
    if (supportedLevels.length > 0) {
      score += 1;
      reasons.push(`Suitable for ${preferenceLevel.replace(/_/g, " ")} preferences`);
    }
  }

  // Enhanced exclusion criteria validation
  if (prefs.exclusions && Array.isArray(prefs.exclusions)) {
    const exclusionCheck = validateExclusionCriteria(prefs.exclusions, investment.exclusions);
    
    if (!exclusionCheck.valid) {
      return null; // Hard exclusion for violations
    }
    
    if (exclusionCheck.satisfied.length > 0) {
      score += exclusionCheck.satisfied.length * 0.5;
      reasons.push(`Exclusion criteria satisfied: ${exclusionCheck.satisfied.join(', ')}`);
    }
  }

  // SDR label alignment (enhanced scoring)
  const matchedLabels = pickExactMatches(prefs.labels_interest, investment.labels);
  if (matchedLabels.length > 0) {
    // Higher weight for Impact and Focus labels
    const impactWeight = matchedLabels.some(label => 
      normalise(label).includes('impact')
    ) ? 2.5 : 2;
    
    score += impactWeight;
    reasons.push(`SDR label alignment: ${matchedLabels.join(", ")}`);
  }

  // Theme alignment (enhanced with weighting)
  const matchedThemes = pickExactMatches(prefs.themes, investment.themes);
  if (matchedThemes.length > 0) {
    const themeBonus = Math.min(matchedThemes.length * 0.7, 2); // Cap at 2 points
    score += themeBonus;
    reasons.push(`Theme alignment: ${matchedThemes.join(", ")}`);
  }

  // Capacity for loss alignment
  if (profile.capacity_for_loss && investment.risk_band) {
    const [minRisk, maxRisk] = investment.risk_band;
    const capacityRiskMap = { 'low': 3, 'medium': 5, 'high': 7 };
    const maxCapacityRisk = capacityRiskMap[normalise(profile.capacity_for_loss)] || 7;
    
    if (maxRisk > maxCapacityRisk) {
      warnings.push(`Investment risk may exceed capacity for loss (${profile.capacity_for_loss})`);
      score -= 0.5; // Small penalty but not exclusion
    } else {
      score += 0.3;
      reasons.push(`Appropriate for ${profile.capacity_for_loss} capacity for loss`);
    }
  }

  // Liquidity needs consideration
  if (profile.liquidity_needs && investment.liquidity) {
    if (normalise(profile.liquidity_needs).includes('immediate') && 
        normalise(investment.liquidity) === 'daily') {
      score += 0.5;
      reasons.push(`Daily liquidity meets immediate access needs`);
    }
  }

  // Minimum investment threshold check
  if (profile.financial_situation?.assets && investment.minimum_investment) {
    const affordabilityRatio = investment.minimum_investment / (profile.financial_situation.assets || 1);
    if (affordabilityRatio > 0.1) { // More than 10% of assets
      warnings.push(`Minimum investment £${investment.minimum_investment} may be significant relative to assets`);
    }
  }

  // Cost efficiency bonus for low-cost options
  if (investment.charges) {
    const chargeMatch = investment.charges.match(/(\d+\.?\d*)%/);
    if (chargeMatch) {
      const annualCharge = parseFloat(chargeMatch[1]);
      if (annualCharge <= 0.3) {
        score += 0.5;
        reasons.push(`Low-cost option (${investment.charges})`);
      } else if (annualCharge >= 1.0) {
        score -= 0.2;
        reasons.push(`Higher cost structure (${investment.charges})`);
      }
    }
  }

  // Impact metrics bonus for impact-focused clients
  if (prefs.labels_interest?.some(label => normalise(label).includes('impact')) && 
      investment.impact_metrics) {
    score += 0.8;
    reasons.push(`Provides measurable impact metrics`);
  }

  if (score === 0) {
    return null;
  }

  return { 
    investment, 
    score: Math.round(score * 10) / 10, // Round to 1 decimal place
    reasons,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

const rankInvestmentMatches = (session, universe, limit = 3) => {
  const matches = ensureArray(universe)
    .map((item) => evaluateInvestmentMatch(session, item))
    .filter(Boolean);

  // Enhanced sorting with tie-breaking
  return matches
    .sort((a, b) => {
      // Primary sort by score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      
      // Tie-breaker 1: Prefer investments with fewer warnings
      const aWarnings = a.warnings?.length || 0;
      const bWarnings = b.warnings?.length || 0;
      if (aWarnings !== bWarnings) {
        return aWarnings - bWarnings;
      }
      
      // Tie-breaker 2: Prefer lower cost investments
      const getCost = (investment) => {
        const chargeMatch = investment.charges?.match(/(\d+\.?\d*)%/);
        return chargeMatch ? parseFloat(chargeMatch[1]) : 999;
      };
      
      const aCost = getCost(a.investment);
      const bCost = getCost(b.investment);
      if (aCost !== bCost) {
        return aCost - bCost;
      }
      
      // Tie-breaker 3: Prefer larger, more established funds
      const aSize = a.investment.fund_size || 0;
      const bSize = b.investment.fund_size || 0;
      return bSize - aSize;
    })
    .slice(0, limit);
};

const summariseInvestmentMatch = ({ investment, score, reasons, warnings }) => {
  const reasonText = reasons.length
    ? `${reasons.join("; ")}.`
    : "Matches the captured objectives and sustainability profile.";
  
  let warningText = "";
  if (warnings && warnings.length > 0) {
    warningText = ` ⚠️ Note: ${warnings.join("; ")}.`;
  }
  
  const scoreText = score ? ` (Match score: ${score})` : "";
  
  return `**${investment.name}** (${investment.provider})${scoreText}\n${investment.summary}\n${reasonText}${warningText}`;
  return `• ${investment.name} (${investment.type}, ${investment.provider}, ${investment.charges}) – ${reasonText}`;
};

const hasPreferenceProfile = (session) => {
  const prefs = session.data?.sustainability_preferences ?? {};
  if (!prefs || prefs.preference_level === "none") {
    return false;
  }
  return ensureArray(prefs.labels_interest).length > 0;
};

const shouldTriggerInvestmentExplorer = (text) =>
  INVESTMENT_EXPLORER_PATTERNS.some((pattern) => pattern.test(text));

const captureProgressSnapshot = (session) => {
  // Enhanced session recovery with validation
  if (!session || !session.context || typeof session.context !== 'object') {
    console.warn('Invalid session structure in captureProgressSnapshot');
    return {
      stage: 'SEGMENT_A_EXPLANATION',
      onboardingStep: null,
      consentStep: null,
      education: { acknowledged: false, summaryOffered: false, summarised: false },
      options: { preferenceLevel: null, step: null },
      confirmationAwaiting: false,
      reportReady: false,
      recoveryNeeded: true
    };
  }
  
  const education = session.context.education ?? {};
  const options = session.context.options ?? {};
  
  return {
    stage: session.stage || 'SEGMENT_A_EXPLANATION',
    onboardingStep: typeof session.context.onboardingStep === 'number' ? session.context.onboardingStep : null,
    consentStep: typeof session.context.consentStep === 'number' ? session.context.consentStep : null,
    education: {
      acknowledged: Boolean(education.acknowledged),
      summaryOffered: Boolean(education.summaryOffered),
      summarised: Boolean(education.summarised)
    },
    options: {
      preferenceLevel: options.preferenceLevel ?? null,
      step: typeof options.step === 'number' ? options.step : null
    },
    confirmationAwaiting: Boolean(session.context.confirmationAwaiting),
    reportReady: Boolean(session.context.reportReady),
    recoveryNeeded: false
  };
};

const hasProgressed = (before, after) => {
  if (!before || !after) return true;
  
  // Handle recovery scenarios
  if (before.recoveryNeeded || after.recoveryNeeded) return true;
  
  if (before.stage !== after.stage) return true;
  if (before.onboardingStep !== after.onboardingStep) return true;
  if (before.consentStep !== after.consentStep) return true;
  if (before.confirmationAwaiting !== after.confirmationAwaiting) return true;
  if (before.reportReady !== after.reportReady) return true;
  
  // Safe comparison of nested objects
  try {
    if (
      before.education.acknowledged !== after.education.acknowledged ||
      before.education.summaryOffered !== after.education.summaryOffered ||
      before.education.summarised !== after.education.summarised
    ) {
      return true;
    }
    if (
      before.options.preferenceLevel !== after.options.preferenceLevel ||
      before.options.step !== after.options.step
    ) {
      return true;
    }
  } catch (error) {
    console.warn('Error comparing progress snapshots:', error.message);
    return true; // Assume progress to be safe
  }
  
  return false;
};

const summariseSessionForLLM = (session) => {
  const profile = session.data?.client_profile ?? {};
  const prefs = session.data?.sustainability_preferences ?? {};
  const consent = session.data?.consent ?? {};
  const summaryLines = [
    `Current stage: ${session.stage}`,
    `Client type: ${profile.client_type || "unspecified"}`,
    `Objective: ${profile.objectives || "unspecified"}`,
    `Horizon: ${profile.horizon_years ?? "—"} years`,
    `Risk tolerance: ${profile.risk_tolerance ?? "—"}`,
    `Capacity for loss: ${profile.capacity_for_loss || "unspecified"}`,
    `Liquidity needs: ${profile.liquidity_needs || "unspecified"}`,
    `Knowledge summary: ${profile.knowledge_experience?.summary || "—"}`,
    `Financial context provided: ${profile.financial_situation?.provided ? "yes" : "no"}`,
    `Preference level: ${prefs.preference_level || "none"}`,
    `Label interests: ${(prefs.labels_interest ?? []).join(", ") || "None"}`,
    `Impact goals: ${(prefs.impact_goals ?? []).join(", ") || "None"}`,
    `Reporting preference: ${prefs.reporting_frequency_pref || "none"}`,
    `Consent to data processing: ${
      consent?.data_processing?.granted === true ? "granted" : "pending"
    }`
  ];
  return `Session summary:\n${summaryLines.join("\n")}`;
};

const mapEventToChatMessage = (event) => {
  if (!event) return null;
  if (event.type === "message" && typeof event.content?.text === "string") {
    if (event.author === "client") {
      return { role: "user", content: event.content.text };
    }
    if (event.author === "assistant") {
      return { role: "assistant", content: event.content.text };
    }
  }
  if (event.author === "client" && event.type === "data_update") {
    const payload = JSON.stringify(event.content ?? {});
    return {
      role: "user",
      content: `Client submitted structured data: ${payload}`
    };
  }
  return null;
};

const buildChatHistory = (session) =>
  ensureArray(session.events)
    .map((event) => mapEventToChatMessage(event))
    .filter(Boolean);

const persistComplianceData = (session, compliance = {}) => {
  if (!compliance || typeof compliance !== "object") return;

  ensureStringArray(compliance.educational_requests).forEach((entry) => {
    appendSessionArrayEntry(session, "educational_requests", entry);
  });
  ensureStringArray(compliance.extra_questions).forEach((entry) => {
    appendSessionArrayEntry(session, "extra_questions", entry);
  });
  ensureStringArray(compliance.notes).forEach((note) => {
    appendAdditionalNote(session, note);
  });
};

export const handleFreeFormQuery = async (
  session,
  text,
  additionalMessages = []
) => {
  // Enhanced input validation and error handling
  if (!session || !session.data || typeof session.data !== 'object') {
    console.error('Invalid session structure in handleFreeFormQuery');
    return {
      messages: ["I'm experiencing technical difficulties. Please try again or contact support."]
    };
  }
  
  const trimmed = sanitizeInput(String(text ?? ""));
  if (!trimmed) {
    return {
      messages: Array.isArray(additionalMessages) ? additionalMessages : []
    };
  }

  try {
    const history = buildChatHistory(session);
    const sessionSummary = summariseSessionForLLM(session);
    
    const messages = [
      {
        role: "system",
        content: `${COMPLIANCE_SYSTEM_PROMPT}\n\n${sessionSummary}`
      },
      ...history,
      { role: "user", content: trimmed }
    ];

    const aiPayload = await callComplianceResponder({ messages });
    
    // Enhanced validation of AI response
    if (!aiPayload || typeof aiPayload !== 'object') {
      throw new Error("Compliance assistant returned invalid response structure");
    }
    
    if (typeof aiPayload.reply !== "string" || !aiPayload.reply.trim()) {
      throw new Error("Compliance assistant returned empty or invalid reply");
    }

    const compliance = aiPayload.compliance ?? {};
    persistComplianceData(session, compliance);

    // Safe event appending with error handling
    try {
      appendEvent(session, {
        id: randomUUID(),
        sessionId: session.id,
        author: "assistant",
        type: "message",
        content: {
          text: aiPayload.reply,
          source: "openai",
          compliance
        },
        createdAt: new Date().toISOString()
      });
    } catch (eventError) {
      console.warn('Failed to append event:', eventError.message);
      // Continue without failing the entire operation
    }

    const tail = Array.isArray(additionalMessages)
      ? additionalMessages.filter((item) => typeof item === "string" && item.trim())
      : [];

    return {
      messages: [aiPayload.reply, ...tail],
      compliance
    };
    
  } catch (error) {
    console.error('Error in handleFreeFormQuery:', error.message);
    
    // Graceful fallback when OpenAI service is unavailable
    const fallbackMessage = "I'm unable to process that question right now due to a technical issue. " +
      "An advisor will review your query and follow up with you directly.";
    
    // Log the failed query for advisor review
    try {
      appendSessionArrayEntry(session, "extra_questions", 
        `Failed query (${new Date().toISOString()}): ${trimmed}`);
      appendAdditionalNote(session, 
        `Technical error processing query: ${error.message}`);
    } catch (logError) {
      console.warn('Failed to log error details:', logError.message);
    }
    
    const tail = Array.isArray(additionalMessages)
      ? additionalMessages.filter((item) => typeof item === "string" && item.trim())
      : [];
    
    return {
      messages: [fallbackMessage, ...tail],
      error: true
    };
  }
};

const removeTrailingQuestionMark = (question = "") => {
  const trimmed = question.trim();
  return trimmed.endsWith("?") ? trimmed.slice(0, -1) : trimmed;
};

const getActiveQuestion = (session) => {
  if (session.context?.requireRiskOverride) {
    return "Please confirm you wish to proceed with a higher risk tolerance despite a low capacity for loss.";
  }

  switch (session.stage) {
    case "SEGMENT_B_ONBOARDING": {
      const step = session.context.onboardingStep ?? 0;
      return ONBOARDING_QUESTIONS[step] ?? null;
    }
    case "SEGMENT_C_CONSENT": {
      const step = session.context.consentStep ?? 0;
      return CONSENT_QUESTIONS[step] ?? null;
    }
    case "SEGMENT_D_EDUCATION": {
      const education = session.context.education ?? {};
      if (!education.acknowledged) {
        return "Please let me know once you’ve reviewed the ESG education points so we can continue.";
      }
      if (education.summaryOffered && !education.summarised) {
        return "Would you like me to summarise the difference between Focus and Improvers labels?";
      }
      return null;
    }
    case "SEGMENT_E_OPTIONS": {
      const options = session.context.options ?? {};
      if (!options.preferenceLevel) {
        return OPTIONS_QUESTIONS.preferenceLevel;
      }
      const step = options.step ?? 1;
      return OPTIONS_QUESTIONS[step] ?? null;
    }
    case "SEGMENT_F_CONFIRMATION":
      return "Shall I walk through your summary so you can confirm everything is correct?";
    default:
      return null;
  }
};

const buildResumePrompt = (session) => {
  const question = getActiveQuestion(session);
  if (!question) {
    return "Would you like to continue where we left off?";
  }
  const base = removeTrailingQuestionMark(question);
  return `Would you like to continue where we left off and answer "${base}?"`;
};

const getComplianceRationale = (session) => {
  // Create audit entry for compliance rationale request
  createComplianceAuditEntry(session, 'compliance_rationale_requested', {
    stage: session.stage,
    applicable_rules: ['Consumer Duty', 'COBS 9A', 'FCA SDR']
  });

  if (session.context?.requireRiskOverride) {
    const complianceInfo = ENHANCED_COMPLIANCE_REASONS.SEGMENT_B_ONBOARDING.risk_override;
    return typeof complianceInfo === 'object' ? complianceInfo.reason : complianceInfo;
  }

  const reasons = ENHANCED_COMPLIANCE_REASONS[session.stage];
  if (!reasons) {
    return "I ask so we can keep the conversation compliant with the FCA’s Consumer Duty and SDR requirements.";
  }

  if (session.stage === "SEGMENT_D_EDUCATION") {
    const education = session.context.education ?? {};
    const reasonKey = !education.acknowledged ? 'acknowledgement' : 'summary';
    const complianceInfo = reasons[reasonKey];
    return typeof complianceInfo === 'object' ? complianceInfo.reason : complianceInfo;
  }

  if (session.stage === "SEGMENT_E_OPTIONS") {
    const options = session.context.options ?? {};
    const reasonKey = !options.preferenceLevel ? 'preferenceLevel' : (options.step ?? 1);
    const complianceInfo = reasons[reasonKey];
    return typeof complianceInfo === 'object' ? complianceInfo.reason : complianceInfo;
  }

  if (session.stage === "SEGMENT_F_CONFIRMATION") {
    const complianceInfo = reasons[0];
    return typeof complianceInfo === 'object' ? complianceInfo.reason : complianceInfo;
  }

  const stepKey = session.stage === "SEGMENT_B_ONBOARDING"
    ? session.context.onboardingStep ?? 0
    : session.stage === "SEGMENT_C_CONSENT"
      ? session.context.consentStep ?? 0
      : null;

  return (stepKey != null && reasons[stepKey])
    ? reasons[stepKey]
    : "I ask so we can keep the conversation compliant with the FCA’s Consumer Duty and SDR requirements.";
};

const findEducationModule = (text) =>
  EDUCATION_MODULES.find((module) =>
    module.keywords.some((pattern) => pattern.test(text))
  ) ?? null;

const logEducationalRequest = (session, text, moduleTitle) => {
  const entry = `Answered: ${moduleTitle} ("${text.trim()}")`;
  appendSessionArrayEntry(session, "educational_requests", entry);
  appendAdditionalNote(session, `${moduleTitle} summary shared.`);
  
  // Enhanced educational progress tracking
  trackEducationalProgress(session, moduleTitle, 'summary_provided');
};

const logExtraQuestion = (session, text) => {
  const entry = `Answered (${session.stage}): ${text.trim()}`;
  appendSessionArrayEntry(session, "extra_questions", entry);
  appendAdditionalNote(session, `Explained compliance rationale for "${text.trim()}".`);
};

// Enhanced investment exploration with comprehensive logging and advisor integration
const handleInvestmentExplorer = (session, text) => {
  if (!shouldTriggerInvestmentExplorer(text)) {
    return null;
  }

  // Determine query type for better categorization
  const queryType = categorizeInvestmentQuery(text);

  if (!hasPreferenceProfile(session)) {
    const resumePrompt = buildResumePrompt(session);
    
    // Log incomplete exploration attempt
    appendInvestmentResearchLog(session, {
      at: new Date().toISOString(),
      query: text,
      query_type: queryType,
      authorised_matches: [],
      alternative_matches: [],
      incomplete_reason: 'missing_preferences'
    });
    
    return {
      messages: [
        "Once we've captured your sustainability preferences I can search our authorised investment list for matches.",
        resumePrompt
      ]
    };
  }

  // Perform enhanced investment matching
  const authorisedMatches = rankInvestmentMatches(session, AUTHORIZED_INVESTMENTS);
  const alternativeMatches = rankInvestmentMatches(session, MARKET_ALTERNATIVES);
  
  // Create investment recommendation workflow entry
  const recommendationWorkflow = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    client_query: text,
    query_type: queryType,
    client_profile_snapshot: {
      objectives: session.data?.client_profile?.objectives,
      risk_tolerance: session.data?.client_profile?.risk_tolerance,
      capacity_for_loss: session.data?.client_profile?.capacity_for_loss,
      horizon_years: session.data?.client_profile?.horizon_years
    },
    sustainability_preferences_snapshot: {
      preference_level: session.data?.sustainability_preferences?.preference_level,
      labels_interest: session.data?.sustainability_preferences?.labels_interest || [],
      themes: session.data?.sustainability_preferences?.themes || [],
      exclusions: session.data?.sustainability_preferences?.exclusions || []
    },
    search_results: {
      authorised_matches: authorisedMatches.map(match => ({
        investment_id: match.investment.id,
        investment_name: match.investment.name,
        score: match.score,
        reasons: match.reasons,
        warnings: match.warnings
      })),
      alternative_matches: alternativeMatches.map(match => ({
        investment_id: match.investment.id,
        investment_name: match.investment.name,
        score: match.score,
        reasons: match.reasons,
        warnings: match.warnings
      }))
    },
    advisor_review_required: true,
    status: 'pending_advisor_review'
  };
  
  // Store recommendation workflow
  if (!session.data.investment_recommendations) {
    session.data.investment_recommendations = [];
  }
  if (session.data.investment_recommendations.length < 20) {
    session.data.investment_recommendations.push(recommendationWorkflow);
  }

  if (authorisedMatches.length === 0 && alternativeMatches.length === 0) {
    const resumePrompt = buildResumePrompt(session);
    
    // Enhanced logging for no matches scenario
    appendInvestmentResearchLog(session, {
      at: new Date().toISOString(),
      query: text,
      query_type: queryType,
      authorised_matches: [],
      alternative_matches: [],
      no_matches_reason: 'criteria_too_restrictive'
    });
    
    appendAdditionalNote(
      session,
      `Investment explorer run for "${text}" (${queryType}) but no aligned investments were found. Advisor review flagged.`
    );
    
    return {
      messages: [
        "I couldn't find any close matches for your specific requirements. This suggests your preferences may need a bespoke investment solution.",
        "I've flagged this for an adviser to review manually and explore additional options outside our standard universe.",
        resumePrompt
      ]
    };
  }

  // Enhanced logging with detailed match information
  appendInvestmentResearchLog(session, {
    at: new Date().toISOString(),
    query: text,
    query_type: queryType,
    authorised_matches: authorisedMatches.map((match) => match.investment.id),
    alternative_matches: alternativeMatches.map((match) => match.investment.id),
    match_scores: {
      authorised: authorisedMatches.map(m => ({ id: m.investment.id, score: m.score })),
      alternatives: alternativeMatches.map(m => ({ id: m.investment.id, score: m.score }))
    },
    recommendation_workflow_id: recommendationWorkflow.id
  });
  
  appendAdditionalNote(
    session,
    `Investment explorer run for "${text}" (${queryType}) with ${authorisedMatches.length} authorised and ${alternativeMatches.length} alternative match(es). Recommendation workflow ${recommendationWorkflow.id} created.`
  );

  const authorisedSummary = authorisedMatches.length
    ? authorisedMatches.map(summariseInvestmentMatch).join("\n\n")
    : "No on-panel investments matched these preferences. I'll flag this for adviser review.";
    
  const alternativeSummary = alternativeMatches.length
    ? alternativeMatches.map(summariseInvestmentMatch).join("\n\n")
    : "The wider market scan did not surface close alternatives right now.";
    
  const resumePrompt = buildResumePrompt(session);

  const messages = [
    `Here are on-panel investments that align with your preferences (adviser sign-off still required):\n\n${authorisedSummary}`,
    alternativeMatches.length > 0 
      ? `Market scan alternatives meeting similar criteria (not currently on our panel):\n\n${alternativeSummary}`
      : "The wider market scan did not surface close alternatives right now.",
    `Any selection will need an adviser recommendation before you invest. I've created a recommendation workflow (ID: ${recommendationWorkflow.id.slice(0, 8)}) for review. ${resumePrompt}`
  ];

  return { messages };
};

// Helper function to categorize investment queries
const categorizeInvestmentQuery = (text) => {
  const normalizedText = normalise(text);
  
  if (normalizedText.includes('climate') || normalizedText.includes('environment')) {
    return 'climate_focused';
  } else if (normalizedText.includes('social') || normalizedText.includes('governance')) {
    return 'social_governance_focused';
  } else if (normalizedText.includes('impact') || normalizedText.includes('outcome')) {
    return 'impact_focused';
  } else if (normalizedText.includes('exclude') || normalizedText.includes('avoid')) {
    return 'exclusion_focused';
  } else if (normalizedText.includes('income') || normalizedText.includes('dividend')) {
    return 'income_focused';
  } else if (normalizedText.includes('growth') || normalizedText.includes('capital')) {
    return 'growth_focused';
  } else if (normalizedText.includes('risk') || normalizedText.includes('volatility')) {
    return 'risk_focused';
  } else if (normalizedText.includes('cost') || normalizedText.includes('fee') || normalizedText.includes('charge')) {
    return 'cost_focused';
  } else {
    return 'general_exploration';
  }
};

const handleDetours = (session, text) => {
  if (!text) return null;

  const investmentResult = handleInvestmentExplorer(session, text);
  if (investmentResult) {
    return investmentResult;
  }

  const module = findEducationModule(text);
  if (module) {
    logEducationalRequest(session, text, module.title);
    const resumePrompt = buildResumePrompt(session);
    
    // Check for requests for detailed explanation or PDF
    const wantsDetailed = /detailed|more detail|explain more|full explanation/i.test(text);
    const wantsPdf = /pdf|document|download|full.*explainer/i.test(text);
    
    const messages = [`Happy to help. ${module.summary}`];
    
    if (wantsDetailed && module.detailed_explanation) {
      messages.push(`Here's more detail: ${module.detailed_explanation}`);
      trackEducationalProgress(session, module.title, 'detailed_explanation_provided');
    }
    
    if (module.pdf_available) {
      if (wantsPdf) {
        messages.push(`I've prepared the ${module.title} PDF explainer for download. An advisor will attach it to your session.`);
        trackPdfDownload(session, module.title, 'detailed_explanation');
      } else {
        messages.push(`Would you like the full ${module.title} explainer PDF?`);
      }
    }
    
    // Add comprehension check if available
    if (module.comprehension_check && !wantsPdf) {
      messages.push(`Quick check: ${module.comprehension_check}`);
    }
    
    messages.push(resumePrompt);
    
    return { messages };
  }

  if (whyNeedPattern.test(text)) {
    logExtraQuestion(session, text);
    const resumePrompt = buildResumePrompt(session);
    return {
      messages: [
        "Thanks for asking—that’s a thoughtful question.",
        getComplianceRationale(session),
        resumePrompt
      ]
    };
  }

  return null;
};

export const extractHorizonYears = (text) => {
  if (typeof text !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeInput(text);
  if (!sanitized) return null;
  
  try {
    const match = sanitized.match(/(\d{1,3})\s*(years?|yrs?)/i);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      // Validate reasonable investment horizon (1-100 years)
      if (Number.isInteger(value) && value > 0 && value <= 100) {
        return value;
      }
    }
    
    const trimmed = sanitized.trim();
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number.parseInt(trimmed, 10);
      if (Number.isInteger(numeric) && numeric > 0 && numeric <= 100) {
        return numeric;
      }
    }
  } catch (error) {
    console.warn('Error extracting horizon years:', error.message);
  }
  
  return null;
};

const riskWordMap = {
  "very low": 1,
  low: 2,
  moderate: 4,
  medium: 4,
  balanced: 4,
  high: 6,
  "very high": 7
};

export const extractRiskTolerance = (text) => {
  if (typeof text !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeInput(text);
  if (!sanitized) return null;
  
  try {
    const direct = sanitized.match(/risk(?: tolerance| level)?[^0-9]*([1-7])/i);
    if (direct) {
      const value = Number.parseInt(direct[1], 10);
      return (value >= 1 && value <= 7) ? value : null;
    }

    if (/^\s*[1-7]\s*$/.test(sanitized)) {
      const value = Number.parseInt(sanitized.trim(), 10);
      return (value >= 1 && value <= 7) ? value : null;
    }

    const wordMatch = sanitized.match(/(very\s+low|very\s+high|low|medium|moderate|balanced|high)\s+risk/i);
    if (wordMatch) {
      const mapped = riskWordMap[wordMatch[1].toLowerCase()];
      return (mapped >= 1 && mapped <= 7) ? mapped : null;
    }

    const trailingMatch = sanitized.match(/risk[^a-z]*(low|medium|moderate|balanced|high|very\s+low|very\s+high)/i);
    if (trailingMatch) {
      const mapped = riskWordMap[trailingMatch[1].toLowerCase()];
      return (mapped >= 1 && mapped <= 7) ? mapped : null;
    }
  } catch (error) {
    console.warn('Error extracting risk tolerance:', error.message);
  }

  return null;
};

export const extractCapacityForLoss = (text) => {
  if (typeof text !== 'string') {
    return null;
  }
  
  const sanitized = sanitizeInput(text);
  if (!sanitized) return null;
  
  try {
    if (/^\s*(low|medium|high)\s*$/i.test(sanitized)) {
      const value = sanitized.trim().toLowerCase();
      return ['low', 'medium', 'high'].includes(value) ? value : null;
    }

    const prefix = sanitized.match(/(low|medium|high)\s+(capacity|capacity for loss|loss capacity|loss tolerance)/i);
    if (prefix) {
      const value = prefix[1].toLowerCase();
      return ['low', 'medium', 'high'].includes(value) ? value : null;
    }

    const suffix = sanitized.match(/(capacity for loss|loss capacity|loss tolerance)[^a-z]*(low|medium|high)/i);
    if (suffix) {
      const value = suffix[2].toLowerCase();
      return ['low', 'medium', 'high'].includes(value) ? value : null;
    }
  } catch (error) {
    console.warn('Error extracting capacity for loss:', error.message);
  }

  return null;
};

const handleCapacitySelection = (session, capacity) => {
  const profile = session.data.client_profile;
  const responses = [];

  profile.capacity_for_loss = capacity;
  responses.push(`Thanks for sharing that your capacity for loss is ${capacity}.`);
  session.context.onboardingStep = 5;

  if (profile.risk_tolerance >= 5 && capacity === "low") {
    session.context.requireRiskOverride = true;
    const guardrails = Array.isArray(session.data.audit.guardrail_triggers)
      ? session.data.audit.guardrail_triggers
      : (session.data.audit.guardrail_triggers = []);
    if (!guardrails.some((item) => item?.type === "risk_capacity_override" && !item?.confirmed_at)) {
      guardrails.push({
        type: "risk_capacity_override",
        triggered_at: new Date().toISOString(),
        confirmed_at: null
      });
      
      // Notify WebSocket monitor of guardrail trigger
      if (sessionMonitor) {
        sessionMonitor.notifyGuardrailTrigger(session.id, 'risk_capacity_override', {
          message: `Client has high risk tolerance (${profile.risk_tolerance}) but low capacity for loss`,
          riskTolerance: profile.risk_tolerance,
          capacityForLoss: capacity,
          requiresConfirmation: true
        });
      }
    }
    responses.push(
      "Because you’ve chosen a higher risk tolerance with a low capacity for loss, please confirm you still wish to proceed."
    );
    return responses;
  }

  responses.push("Will you need to withdraw funds at specific times?");
  return responses;
};

const handleRiskSelection = (session, risk, originalText) => {
  const profile = session.data.client_profile;
  const responses = [];

  profile.risk_tolerance = risk;
  responses.push(`Thanks, I’ll note a risk tolerance of ${risk} on the 1–7 scale.`);

  if (profile.horizon_years && profile.horizon_years < 3 && risk >= 5) {
    const guardrails = Array.isArray(session.data.audit.guardrail_triggers)
      ? session.data.audit.guardrail_triggers
      : (session.data.audit.guardrail_triggers = []);
    if (!guardrails.some((item) => item?.type === "risk_horizon_warning")) {
      guardrails.push({
        type: "risk_horizon_warning",
        triggered_at: new Date().toISOString(),
        notes: "High risk with short horizon"
      });
      
      // Notify WebSocket monitor of guardrail trigger
      if (sessionMonitor) {
        sessionMonitor.notifyGuardrailTrigger(session.id, 'risk_horizon_warning', {
          message: `Client has high risk tolerance (${risk}) with short investment horizon (${profile.horizon_years} years)`,
          riskTolerance: risk,
          horizonYears: profile.horizon_years,
          requiresConfirmation: false
        });
      }
    }
    responses.push(
      "⚠️ You’ve chosen a higher risk level with a shorter time horizon. I’ll flag this so your adviser can make sure it remains suitable."
    );
  }

  const capacity = extractCapacityForLoss(originalText);
  if (capacity && CAPACITY_FOR_LOSS_VALUES.includes(capacity)) {
    const capacityResponses = handleCapacitySelection(session, capacity);
    return responses.concat(capacityResponses);
  }

  session.context.onboardingStep = 4;
  responses.push(
    "If markets fall, how much loss could you afford without affecting your lifestyle? (low, medium, high)"
  );
  return responses;
};

const stageResponse = (session, stage, additionalMessages = []) => {
  if (session.stage !== stage) {
    setStage(session, stage);
  }

  if (
    stage === "SEGMENT_A_EXPLANATION" &&
    !session.data.audit.explanation_shown
  ) {
    applyDataPatch(session, {
      audit: {
        explanation_shown: true
      },
      timestamps: {
        explanation_shown_at: new Date().toISOString()
      }
    });
  }

  const prompt = STAGE_PROMPTS[stage];
  return prompt ? [prompt, ...additionalMessages] : additionalMessages;
};

const moveToStage = (session, stage, extraMessages = []) => {
  const messages = stageResponse(session, stage, extraMessages);
  
  // Add compliance validation checkpoints when moving between stages
  createComplianceAuditEntry(session, 'stage_transition', {
    from_stage: session.stage,
    to_stage: stage,
    applicable_rules: ['Consumer Duty', 'COBS 9A'],
    compliance_status: 'compliant'
  });
  
  // Validate compliance checkpoints based on stage
  if (stage === 'SEGMENT_C_CONSENT') {
    validateComplianceCheckpoint(session, 'suitability_information_complete');
  } else if (stage === 'SEGMENT_D_EDUCATION') {
    validateComplianceCheckpoint(session, 'consent_obtained');
  } else if (stage === 'SEGMENT_E_OPTIONS') {
    validateComplianceCheckpoint(session, 'education_delivered');
  } else if (stage === 'SEGMENT_F_CONFIRMATION') {
    validateComplianceCheckpoint(session, 'sustainability_preferences_captured');
  } else if (stage === 'SEGMENT_G_REPORT') {
    validateComplianceCheckpoint(session, 'guardrails_checked');
    
    // Run enhanced guardrail evaluation before report generation
    const enhancedGuardrailResults = evaluateEnhancedGuardrails(session);
    
    // Store enhanced guardrail results in session
    if (!session.data.enhanced_guardrails) {
      session.data.enhanced_guardrails = {};
    }
    session.data.enhanced_guardrails.last_evaluation = enhancedGuardrailResults;
    
    // If critical issues found, prevent report generation
    if (enhancedGuardrailResults.overall_risk_level === 'critical') {
      return {
        reply: "I've identified some critical compliance issues that need to be addressed before we can generate your report. An advisor will review your session and contact you shortly to resolve these matters.",
        stage: session.stage, // Stay in current stage
        requiresAdvisorReview: true,
        criticalIssues: enhancedGuardrailResults.required_actions
      };
    }
    
    // If high risk, add warning to report
    if (enhancedGuardrailResults.overall_risk_level === 'high') {
      if (!session.data.advisor_notes) {
        session.data.advisor_notes = [];
      }
      session.data.advisor_notes.push({
        type: 'high_risk_warning',
        timestamp: new Date().toISOString(),
        message: 'High risk level detected during enhanced guardrail evaluation',
        details: enhancedGuardrailResults.required_actions
      });
    }
  }
  
  saveSession(session);
  return { messages };
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const parseExclusions = (input) => {
  if (/\b(none|no exclusions)\b/i.test(input)) {
    return [];
  }

  return splitList(input).map((item) => {
    const match = item.match(/(-?\d+(?:\.\d+)?)%?/);
    const threshold = match ? Number.parseFloat(match[1]) : null;
    const sector = item.replace(/(-?\d+(?:\.\d+)?)%?/g, "").trim();
    return {
      sector: sector || item.trim(),
      threshold
    };
  });
};

const last = (items, predicate) => {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i])) return items[i];
  }
  return null;
};

const handleExplanation = (session, text) => {
  if (!yesPatterns.test(text)) {
    return {
      messages: [
        "When you're ready to continue, reply with 'Ready' or 'Yes' so I can start the onboarding questions."
      ]
    };
  }

  session.context.onboardingStep = 0;
  return moveToStage(session, "SEGMENT_B_ONBOARDING", [
    "Are you investing as an individual, joint, trust, or company?"
  ]);
};

const handleStructuredExplanation = (session, content) => {
  if (!content?.ready) {
    return {
      messages: [
        "Let me know when you're ready to begin and I'll open the onboarding form."
      ]
    };
  }

  applyDataPatch(session, {
    audit: {
      explanation_shown: true
    },
    timestamps: {
      explanation_shown_at: new Date().toISOString()
    }
  });

  session.context.onboardingStep = 0;
  return moveToStage(session, "SEGMENT_B_ONBOARDING", [
    "Let's start with your suitability information."
  ]);
};

const handleRiskOverride = (session, text) => {
  if (!session.context.requireRiskOverride) {
    return null;
  }

  if (!yesPatterns.test(text) && !/accept|proceed|override/i.test(text)) {
    return {
      messages: [
        "Please explicitly confirm that you wish to proceed with a higher risk tolerance despite indicating a low capacity for loss."
      ]
    };
  }

  session.context.requireRiskOverride = false;
  const guardrail = last(
    ensureArray(session.data.audit.guardrail_triggers),
    (item) => item?.type === "risk_capacity_override" && !item?.confirmed_at
  );
  if (guardrail) {
    guardrail.confirmed_at = new Date().toISOString();
  }

  session.context.onboardingStep = Math.max(session.context.onboardingStep, 5);
  return {
    messages: [
      "Thank you for confirming. Will you need to withdraw funds at specific times?"
    ]
  };
};

const handleOnboarding = (session, text) => {
  const overrideResult = handleRiskOverride(session, text);
  if (overrideResult) {
    return overrideResult;
  }

  const profile = session.data.client_profile;
  const step = session.context.onboardingStep ?? 0;

  if (step === 0) {
    const choice = CLIENT_TYPES.find(
      (type) => normalise(type) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose from individual, joint, trust, or company so I can log the correct client type."
        ]
      };
    }

    profile.client_type = choice;
    session.context.onboardingStep = 1;
    return {
      messages: [
        `Great, I'll note you're investing in a ${choice} capacity.`,
        "What’s your main investment goal? (growth, income, preservation, impact, or other)"
      ]
    };
  }

  if (step === 1) {
    const raw = text.trim();
    const option = OBJECTIVE_OPTIONS.find(
      (item) => normalise(item) === normalise(raw)
    );
    profile.objectives = option ?? raw;
    session.context.onboardingStep = 2;
    return {
      messages: [
        `Thanks for sharing that your main goal is ${profile.objectives}.`,
        "How long do you expect to keep this money invested? Please provide the number of years."
      ]
    };
  }

  if (step === 2) {
    const years = extractHorizonYears(text);
    if (!Number.isInteger(years) || years <= 0) {
      return {
        messages: [
          "Please provide your investment horizon as a positive whole number of years."
        ]
      };
    }

    profile.horizon_years = years;
    const messages = [
      `That makes sense — planning for around ${years} years helps me map the right strategy horizon.`,
      `So, your main goal is ${profile.objectives} with a ${years}-year horizon, correct?`
    ];

    const inferredRisk = extractRiskTolerance(text);
    if (Number.isInteger(inferredRisk) && RISK_SCALE.includes(inferredRisk)) {
      messages.push(...handleRiskSelection(session, inferredRisk, text));
      return { messages };
    }

    session.context.onboardingStep = 3;
    messages.push(
      "On a scale of 1 (very low) to 7 (very high), how comfortable are you with investment risk?"
    );
    return { messages };
  }

  if (step === 3) {
    let risk = extractRiskTolerance(text);
    if (!Number.isInteger(risk) || !RISK_SCALE.includes(risk)) {
      const parsed = parseInteger(text);
      if (Number.isInteger(parsed) && RISK_SCALE.includes(parsed)) {
        risk = parsed;
      }
    }

    if (!Number.isInteger(risk) || !RISK_SCALE.includes(risk)) {
      return {
        messages: [
          "Please choose a risk level from 1 to 7, where 1 is very low risk and 7 is very high risk."
        ]
      };
    }

    const responses = handleRiskSelection(session, risk, text);
    return { messages: responses };
  }

  if (step === 4) {
    const capacity = extractCapacityForLoss(text);
    if (!capacity || !CAPACITY_FOR_LOSS_VALUES.includes(capacity)) {
      return {
        messages: [
          "Please let me know if your capacity for loss is low, medium, or high."
        ]
      };
    }

    const responses = handleCapacitySelection(session, capacity);
    return { messages: responses };
  }

  if (step === 5) {
    const detail = text.trim();
    if (!detail) {
      return {
        messages: [
          "Even if you have no planned withdrawals, let me know so I can record it as part of suitability."
        ]
      };
    }

    profile.liquidity_needs = detail;
    session.context.onboardingStep = 6;
    return {
      messages: [
        "Thanks, I’ll note those liquidity needs for the record.",
        "Have you invested before? Please describe which instruments, how often, and for how long."
      ]
    };
  }

  if (step === 6) {
    const experience = text.trim();
    if (!experience) {
      return {
        messages: [
          "Please share a short note on your investment experience so I can evidence suitability."
        ]
      };
    }

    profile.knowledge_experience.summary = experience;
    profile.knowledge_experience.instruments = splitList(text);
    profile.knowledge_experience.frequency = /monthly|quarterly|annual|weekly/i.test(text)
      ? (text.match(/(daily|weekly|monthly|quarterly|annual)/i)?.[1] ?? "")
      : "";
    profile.knowledge_experience.duration = text.match(/\b(\d+\s*(years?|months?))\b/i)?.[0] ?? "";
    session.context.onboardingStep = 7;
    return {
      messages: [
        "Thanks for outlining your experience — that helps me tailor the conversation.",
        "Would you like to record income, assets, and liabilities for context?"
      ]
    };
  }

  if (step === 7) {
    if (noPatterns.test(text)) {
      profile.financial_situation = {
        provided: false,
        income: null,
        assets: null,
        liabilities: null,
        notes: ""
      };
      session.context.onboardingStep = 9;
      session.context.consentStep = 0;
      return moveToStage(session, "SEGMENT_C_CONSENT", [
        "No problem, I'll note that you prefer not to share detailed financial figures.",
        "We need your permission to record your answers for regulatory reporting.",
        "Do you consent to us processing your data for this advice session?"
      ]);
    }

    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "Please let me know 'Yes' or 'No' so I can record whether to capture your financial details."
        ]
      };
    }

    profile.financial_situation.provided = true;
    session.context.onboardingStep = 8;
    return {
      messages: [
        "Thanks. Share whatever level of detail you’re comfortable with and I’ll note it for context.",
        "Please share any income, assets, and liabilities you’d like recorded (for example: Income £60k, Assets £250k, Liabilities £40k)."
      ]
    };
  }

  if (step === 8) {
    const details = text.trim();
    if (!details) {
      return {
        messages: [
          "Could you provide a short summary of your income, assets, and liabilities?"
        ]
      };
    }

    profile.financial_situation.notes = details;
    profile.financial_situation.income = parseMoneyValue(details, "income");
    profile.financial_situation.assets = parseMoneyValue(details, "asset");
    profile.financial_situation.liabilities = parseMoneyValue(details, "liabilit");
    session.context.onboardingStep = 9;
   session.context.consentStep = 0;
    return moveToStage(session, "SEGMENT_C_CONSENT", [
      "Thank you for sharing that context — I’ll log it carefully for your adviser.",
      "We need your permission to record your answers for regulatory reporting.",
      "Do you consent to us processing your data for this advice session?"
    ]);
  }

  return {
    messages: [
      "Let me summarise before we continue."
    ]
  };
};

const handleStructuredOnboarding = (session, content) => {
  const answers = content?.answers ?? {};
  const profile = session.data.client_profile;
  const messages = [];
  const missing = [];

  if (!CLIENT_TYPES.some((type) => normalise(type) === normalise(answers.client_type))) {
    missing.push("Select a client type (individual, joint, trust, or company).");
  }
  if (!answers.objectives || !answers.objectives.trim()) {
    missing.push("Investment objective is required.");
  }

  const horizon = Number.parseInt(answers.horizon_years, 10);
  if (!Number.isInteger(horizon) || horizon <= 0) {
    missing.push("Provide the investment horizon in whole years.");
  }

  const risk = Number.parseInt(answers.risk_tolerance, 10);
  if (!RISK_SCALE.includes(risk)) {
    missing.push("Select a risk tolerance between 1 and 7.");
  }

  if (
    !CAPACITY_FOR_LOSS_VALUES.some(
      (value) => normalise(value) === normalise(answers.capacity_for_loss)
    )
  ) {
    missing.push("Capacity for loss must be low, medium, or high.");
  }

  if (!answers.liquidity_needs || !answers.liquidity_needs.trim()) {
    missing.push("Liquidity needs must be recorded.");
  }

  if (!answers.knowledge_summary || !answers.knowledge_summary.trim()) {
    missing.push("Provide a brief summary of the client's knowledge and experience.");
  }

  if (answers.financial?.provided && (!answers.financial.notes || !answers.financial.notes.trim())) {
    missing.push("Include context notes for the financial situation.");
  }

  if (missing.length > 0) {
    return { messages: missing };
  }

  profile.client_type = CLIENT_TYPES.find(
    (type) => normalise(type) === normalise(answers.client_type)
  );
  profile.objectives = answers.objectives.trim();
  profile.horizon_years = horizon;
  profile.risk_tolerance = risk;
  profile.capacity_for_loss = answers.capacity_for_loss.trim().toLowerCase();
  profile.liquidity_needs = answers.liquidity_needs.trim();
  profile.knowledge_experience.summary = answers.knowledge_summary.trim();
  profile.knowledge_experience.instruments = Array.isArray(answers.knowledge_instruments)
    ? answers.knowledge_instruments
    : splitList(answers.knowledge_summary);
  profile.knowledge_experience.frequency = answers.knowledge_frequency ?? "";
  profile.knowledge_experience.duration = answers.knowledge_duration ?? "";

  if (answers.financial?.provided) {
    profile.financial_situation = {
      provided: true,
      income: answers.financial.income ?? null,
      assets: answers.financial.assets ?? null,
      liabilities: answers.financial.liabilities ?? null,
      notes: answers.financial.notes.trim()
    };
  } else {
    profile.financial_situation = {
      provided: false,
      income: null,
      assets: null,
      liabilities: null,
      notes: ""
    };
  }

  if (profile.horizon_years < 3 && profile.risk_tolerance >= 5) {
    session.data.audit.guardrail_triggers.push({
      type: "risk_horizon_warning",
      triggered_at: new Date().toISOString(),
      notes: "High risk with short horizon"
    });
    messages.push(
      "⚠️ High risk with a short horizon has been logged for adviser review."
    );
  }

  if (profile.risk_tolerance >= 5 && profile.capacity_for_loss === "low") {
    // Perform enhanced risk assessment
    const riskAssessment = performEnhancedRiskAssessment(session);
    
    // Store assessment results
    session.data.current_risk_assessment = riskAssessment;
    
    if (!content?.confirm_override) {
      session.context.requireRiskOverride = true;
      return {
        messages: [
          "Because you've chosen a high risk tolerance with a low capacity for loss, please confirm you wish to proceed."
        ]
      };
    }

    session.context.requireRiskOverride = false;
    session.data.audit.guardrail_triggers.push({
      type: "risk_capacity_override",
      triggered_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString()
    });
  }

  session.context.onboardingStep = 9;
  session.context.consentStep = 0;

  messages.push(
    "We need your permission to record your answers for regulatory reporting."
  );
  messages.push("Do you consent to us processing your data for this advice session?");

  return moveToStage(session, "SEGMENT_C_CONSENT", messages);
};

const handleConsent = (session, text) => {
  const consent = session.data.consent;
  const step = session.context.consentStep ?? 0;

  if (step === 0) {
    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "I’m unable to proceed without your consent to process this information. Please reply 'Yes' if you agree."
        ]
      };
    }

    const timestamp = new Date().toISOString();
    consent.data_processing = { granted: true, timestamp };
    session.data.timestamps.consent_recorded_at = timestamp;
    session.context.consentStep = 1;
    return {
      messages: [
        "Thank you. Do you consent to receive documents electronically (e-delivery)?"
      ]
    };
  }

  if (step === 1) {
    const granted = yesPatterns.test(text) ? true : noPatterns.test(text) ? false : null;
    if (granted === null) {
      return {
        messages: [
          "Please reply with 'Yes' or 'No' so I can record your e-delivery preference."
        ]
      };
    }

    consent.e_delivery = {
      granted,
      timestamp: new Date().toISOString()
    };
    session.context.consentStep = 2;
    return {
      messages: [
        "Can we contact you in the future with relevant updates?"
      ]
    };
  }

  if (step === 2) {
    if (noPatterns.test(text)) {
      consent.future_contact = { granted: false, purpose: "" };
      session.context.consentStep = 4;
      return moveToStage(session, "SEGMENT_D_EDUCATION", [
        "Here’s a quick ESG education pack covering key regulatory points:",
        "• ESG stands for Environmental, Social, and Governance – it highlights factors, not guaranteed outcomes.",
        "• UK SDR labels include Focus, Improvers, Impact, and Mixed Goals.",
        "• The Anti-Greenwashing Rule means we only make evidence-backed sustainability claims.",
        "• Product disclosures will always be attached for you to review.",
        "Reply 'Understood' when you’re ready to continue."
      ]);
    }

    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "Please let me know 'Yes' or 'No' so I can record your future contact preference."
        ]
      };
    }

    consent.future_contact = { granted: true, purpose: "" };
    session.context.consentStep = 3;
    return {
      messages: [
        "Thanks. What purpose should we note for future contact (for example, annual review or product updates)?"
      ]
    };
  }

  if (step === 3) {
    consent.future_contact.purpose = text.trim();
    session.context.consentStep = 4;
    return moveToStage(session, "SEGMENT_D_EDUCATION", [
      "Here’s a quick ESG education pack covering key regulatory points:",
      "• ESG stands for Environmental, Social, and Governance – it highlights factors, not guaranteed outcomes.",
      "• UK SDR labels include Focus, Improvers, Impact, and Mixed Goals.",
      "• The Anti-Greenwashing Rule means we only make evidence-backed sustainability claims.",
      "• Product disclosures will always be attached for you to review.",
      "Reply 'Understood' when you’re ready to continue."
    ]);
  }

  return { messages: [] };
};

const handleStructuredConsent = (session, content) => {
  const payload = content?.consent ?? {};
  if (!payload.data_processing) {
    return {
      messages: [
        "We need your explicit permission to process this information before continuing."
      ]
    };
  }

  const timestamp = payload.timestamp ?? new Date().toISOString();
  session.data.consent = {
    data_processing: { granted: true, timestamp },
    e_delivery: {
      granted: payload.e_delivery === true,
      timestamp
    },
    future_contact: {
      granted: payload.future_contact?.granted === true,
      purpose: payload.future_contact?.purpose ?? ""
    }
  };

  if (session.data.consent.future_contact.granted === false) {
    session.data.consent.future_contact.purpose = "";
  }

  session.data.timestamps.consent_recorded_at = timestamp;
  session.context.education = {
    acknowledged: false,
    summaryOffered: false,
    summarised: false
  };

  return moveToStage(session, "SEGMENT_D_EDUCATION", [
    "Here’s a quick ESG education pack covering key regulatory points:",
    "• ESG stands for Environmental, Social, and Governance – it highlights factors, not guaranteed outcomes.",
    "• UK SDR labels include Focus, Improvers, Impact, and Mixed Goals.",
    "• The Anti-Greenwashing Rule means we only make evidence-backed sustainability claims.",
    "• Product disclosures will always be attached for you to review.",
    "Reply 'Understood' when you’re ready to continue."
  ]);
};

const handleEducation = (session, text) => {
  const education = session.context.education ?? {
    acknowledged: false,
    summaryOffered: false,
    summarised: false
  };

  if (!education.acknowledged) {
    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "Take your time reviewing the education pack. Reply with 'Understood' once you’re ready to continue."
        ]
      };
    }
    education.acknowledged = true;
    education.summaryOffered = true;
    session.data.sustainability_preferences.educ_pack_sent = true;
    session.data.audit.educ_pack_sent = true;
    session.data.disclosures.agr_disclaimer_presented = true;
    session.data.timestamps.education_completed_at = new Date().toISOString();
    session.context.education = education;
    saveSession(session);
    return {
      messages: [
        "Would you like me to summarise the difference between Focus and Improvers labels?"
      ]
    };
  }

  if (education.summaryOffered && !education.summarised) {
    if (yesPatterns.test(text)) {
      education.summarised = true;
      session.context.education = education;
      return moveToStage(session, "SEGMENT_E_OPTIONS", [
        "Focus funds invest in companies already leading on sustainability factors, whereas Improvers target companies with credible plans to improve.",
        "We're halfway through. Just a few more questions about your ESG preferences.",
        "Do you have sustainability preferences? Choose from: none, high_level, or detailed."
      ]);
    }

    if (!noPatterns.test(text)) {
      return {
        messages: [
          "Please reply with 'Yes' if you’d like the summary or 'No' if you’re happy to move on."
        ]
      };
    }

    education.summarised = true;
    session.context.education = education;
    return moveToStage(session, "SEGMENT_E_OPTIONS", [
      "We're halfway through. Just a few more questions about your ESG preferences.",
      "No problem. Do you have sustainability preferences? Choose from: none, high_level, or detailed."
    ]);
  }

  return {
    messages: [
      "Let’s capture your sustainability preferences."
    ]
  };
};

const handleStructuredEducation = (session, content) => {
  if (!content?.acknowledged) {
    return {
      messages: [
        "Please review the education pack and confirm when you’re ready to continue."
      ]
    };
  }

  const wantsSummary = Boolean(content?.wants_summary);
  session.context.education = {
    acknowledged: true,
    summaryOffered: true,
    summarised: true
  };
  session.data.sustainability_preferences.educ_pack_sent = true;
  session.data.audit.educ_pack_sent = true;
  session.data.disclosures.agr_disclaimer_presented = true;
  session.data.timestamps.education_completed_at = new Date().toISOString();

  const messages = [];
  if (wantsSummary) {
    messages.push(
      "Focus funds invest in companies already leading on sustainability factors, whereas Improvers target companies with credible plans to improve."
    );
  }

  messages.push("We're halfway through. Just a few more questions about your ESG preferences.");
  messages.push(
    "Do you have sustainability preferences? Choose from: none, high_level, or detailed."
  );

  return moveToStage(session, "SEGMENT_E_OPTIONS", messages);
};

const impactChosen = (labels) =>
  ensureArray(labels).some((label) => /impact/i.test(label));

const parseLabels = (text) =>
  splitList(text).map((label) => {
    const match = PATHWAY_NAMES.find((name) =>
      normalise(name).includes(normalise(label)) ||
      normalise(label).includes(normalise(name))
    );
    return match ?? label.trim();
  });

const handleOptions = (session, text) => {
  const prefs = session.data.sustainability_preferences;
  const optionsContext = session.context.options ?? {
    preferenceLevel: null,
    step: 0,
    pendingExclusions: false,
    pendingImpactDetails: false
  };

  if (!optionsContext.preferenceLevel) {
    const choice = PREFERENCE_LEVELS.find(
      (item) => normalise(item) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose from: none, high_level, or detailed."
        ]
      };
    }

    prefs.preference_level = choice;
    optionsContext.preferenceLevel = choice;
    session.context.options = optionsContext;
    
    // Perform enhanced risk assessment when sustainability preferences are set
    if (choice !== 'none') {
      const riskAssessment = performEnhancedRiskAssessment(session);
      
      // Check for sustainability-specific guardrails
      if (riskAssessment.criticalIssues.length > 0) {
        // Add warning about critical sustainability issues
        session.data.sustainability_warnings = session.data.sustainability_warnings || [];
        session.data.sustainability_warnings.push({
          timestamp: new Date().toISOString(),
          type: 'critical_guardrail_trigger',
          issues: riskAssessment.criticalIssues.map(issue => issue.description),
          recommendations: riskAssessment.recommendations
        });
      }
    }

    if (choice === "none") {
      prefs.labels_interest = [];
      prefs.themes = [];
      prefs.exclusions = [];
      prefs.impact_goals = [];
      prefs.engagement_importance = "";
      prefs.reporting_frequency_pref = "none";
      prefs.tradeoff_tolerance = "";
      return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
        "I’ll note that you have no specific sustainability preferences. I’ll summarise everything next."
      ]);
    }

    optionsContext.step = 1;
    saveSession(session);
    return {
      messages: [
        "Which FCA SDR labels interest you?"
      ]
    };
  }

  const step = optionsContext.step ?? 0;

  if (step === 1) {
    const labels = parseLabels(text);
    if (labels.length === 0) {
      return {
        messages: [
          "Please list at least one label or say 'none' if you wish to skip."
        ]
      };
    }
    prefs.labels_interest = labels;

    if (optionsContext.preferenceLevel === "high_level") {
      return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
        "Thanks, I’ve noted those label interests. I’ll recap everything for you now."
      ]);
    }

    optionsContext.step = 2;
    session.context.options = optionsContext;
    return {
      messages: [
        "Are there particular sustainability themes you want to focus on? (e.g. climate, biodiversity, social equity)"
      ]
    };
  }

  if (step === 2) {
    prefs.themes = /\b(none|not at this time)\b/i.test(text)
      ? []
      : splitList(text);
    optionsContext.step = 3;
    session.context.options = optionsContext;
    return {
      messages: [
        "Please list any exclusions and thresholds (for example: Fossil fuels under 5%, Tobacco 0%)."
      ]
    };
  }

  if (step === 3) {
    const exclusions = parseExclusions(text);
    const fossil = exclusions.find((item) => /fossil/i.test(item.sector));
    if (fossil && (fossil.threshold === null || Number.isNaN(fossil.threshold))) {
      return {
        messages: [
          "For fossil fuels, should I exclude all exposure, or set a revenue threshold such as under 10%? Please let me know the percentage you'd prefer."
        ]
      };
    }

    prefs.exclusions = exclusions.map((item) => ({
      sector: item.sector,
      threshold: item.threshold
    }));
    optionsContext.step = 4;
    session.context.options = optionsContext;
    return {
      messages: [
        "Do you have any specific impact goals (for example: SDG 7 affordable clean energy)?"
      ]
    };
  }

  if (step === 4) {
    if (impactChosen(prefs.labels_interest) && /\b(none|not at this time)\b/i.test(text)) {
      return {
        messages: [
          "Impact-labelled investments require at least one goal. Please list the outcomes that matter to you."
        ]
      };
    }

    prefs.impact_goals = /\b(none|not at this time)\b/i.test(text)
      ? []
      : splitList(text);
    optionsContext.step = 5;
    session.context.options = optionsContext;
    return {
      messages: [
        "How important is active stewardship or engagement from managers?"
      ]
    };
  }

  if (step === 5) {
    prefs.engagement_importance = text.trim();
    optionsContext.step = 6;
    session.context.options = optionsContext;
    return {
      messages: [
        "How often would you like sustainability reporting updates? (none, quarterly, semiannual, annual)"
      ]
    };
  }

  if (step === 6) {
    const choice = REPORTING_FREQUENCY_OPTIONS.find(
      (value) => normalise(value) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose a reporting frequency: none, quarterly, semiannual, or annual."
        ]
      };
    }

    if (impactChosen(prefs.labels_interest) && choice === "none") {
      return {
        messages: [
          "Impact-focused solutions require a reporting preference so we can evidence outcomes. Please choose quarterly, semiannual, or annual."
        ]
      };
    }

    prefs.reporting_frequency_pref = choice;
    optionsContext.step = 7;
    session.context.options = optionsContext;
    return {
      messages: [
        "How much investment performance trade-off are you willing to accept for sustainability outcomes?"
      ]
    };
  }

  if (step === 7) {
    prefs.tradeoff_tolerance = text.trim();
    session.context.options = optionsContext;
    return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
      "Thanks, I’ve captured those details. Let me summarise everything back to you."
    ]);
  }

  return { messages: [] };
};

const handleStructuredOptions = (session, content) => {
  const prefs = content?.preferences ?? {};
  const level = prefs.preference_level ?? "none";

  if (!PREFERENCE_LEVELS.includes(level)) {
    return { messages: ["Preference level must be none, high_level, or detailed."] };
  }

  const labels = Array.isArray(prefs.labels_interest) ? prefs.labels_interest : [];
  if (level !== "none" && labels.length === 0) {
    return { messages: ["Please choose at least one SDR label when providing preferences."] };
  }

  if (
    level !== "none" &&
    !labels.every((label) =>
      PATHWAY_NAMES.some((name) => normalise(name) === normalise(label))
    )
  ) {
    return { messages: ["One or more selected labels are not recognised SDR pathways."] };
  }

  const exclusions = Array.isArray(prefs.exclusions) ? prefs.exclusions : [];
  for (const exclusion of exclusions) {
    if (!exclusion || typeof exclusion !== "object" || !exclusion.sector) {
      return { messages: ["Each exclusion must include a sector name."] };
    }
    if (exclusion.threshold != null && Number.isNaN(Number.parseFloat(exclusion.threshold))) {
      return { messages: ["Exclusion thresholds must be numeric when provided."] };
    }
    if (
      /fossil/i.test(exclusion.sector) &&
      (exclusion.threshold == null || Number.isNaN(Number(exclusion.threshold)))
    ) {
      return { messages: ["Fossil fuel exclusions require a numeric threshold."] };
    }
  }

  const impact = ensureArray(labels).some((label) => /impact/i.test(label));
  if (impact) {
    if (!Array.isArray(prefs.impact_goals) || prefs.impact_goals.length === 0) {
      return { messages: ["Impact-labelled selections require at least one impact goal."] };
    }
    if (!prefs.reporting_frequency_pref || prefs.reporting_frequency_pref === "none") {
      return { messages: ["Impact-labelled selections require a reporting frequency other than 'none'."] };
    }
  }

  if (!REPORTING_FREQUENCY_OPTIONS.includes(prefs.reporting_frequency_pref ?? "none")) {
    return {
      messages: ["Reporting frequency must be none, quarterly, semiannual, or annual."]
    };
  }

  session.data.sustainability_preferences = {
    preference_level: level,
    labels_interest: labels,
    themes: Array.isArray(prefs.themes) ? prefs.themes : [],
    exclusions,
    impact_goals: Array.isArray(prefs.impact_goals) ? prefs.impact_goals : [],
    engagement_importance: prefs.engagement_importance ?? "",
    reporting_frequency_pref: prefs.reporting_frequency_pref ?? "none",
    tradeoff_tolerance: prefs.tradeoff_tolerance ?? "",
    educ_pack_sent: true
  };

  session.data.disclosures.agr_disclaimer_presented = true;
  session.context.options = {
    preferenceLevel: level,
    step: 5,
    pendingExclusions: false,
    pendingImpactDetails: false
  };

  return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
    "Here’s what you told me. Please confirm the summary when you're ready."
  ]);
};

const buildSummary = (session) => {
  const profile = session.data.client_profile;
  const prefs = session.data.sustainability_preferences;
  const consent = session.data.consent;

  const lines = [];
  lines.push("Here’s what you told me:");
  lines.push(
    `• Client type: ${profile.client_type}`
  );
  lines.push(
    `• Objectives: ${profile.objectives}`
  );
  lines.push(
    `• Horizon: ${profile.horizon_years ?? "—"} years`
  );
  lines.push(
    `• Risk tolerance: ${profile.risk_tolerance} / 7`
  );
  lines.push(
    `• Capacity for loss: ${profile.capacity_for_loss}`
  );
  lines.push(
    `• Liquidity needs: ${profile.liquidity_needs}`
  );
  lines.push(
    `• Knowledge & experience: ${profile.knowledge_experience.summary}`
  );
  if (profile.financial_situation.provided) {
    lines.push(
      `• Financial context: ${profile.financial_situation.notes}`
    );
  }
  if (prefs.preference_level !== "none") {
    lines.push(
      `• Sustainability preference level: ${prefs.preference_level}`
    );
    lines.push(
      `• Label interests: ${prefs.labels_interest.join(", ") || "None"}`
    );
    if (prefs.themes.length) {
      lines.push(`• Themes: ${prefs.themes.join(", ")}`);
    }
    if (prefs.exclusions.length) {
      lines.push(
        `• Exclusions: ${prefs.exclusions
          .map((item) =>
            item.threshold != null
              ? `${item.sector} (<${item.threshold}%)`
              : item.sector
          )
          .join(", ")}`
      );
    }
    if (prefs.impact_goals.length) {
      lines.push(`• Impact goals: ${prefs.impact_goals.join(", ")}`);
    }
    lines.push(
      `• Engagement importance: ${prefs.engagement_importance || "Not specified"}`
    );
    lines.push(
      `• Reporting frequency preference: ${prefs.reporting_frequency_pref}`
    );
    lines.push(
      `• Trade-off tolerance: ${prefs.tradeoff_tolerance || "Not specified"}`
    );
  }
  lines.push(
    `• Consent to data processing recorded: ${consent.data_processing?.granted ? "Yes" : "No"}`
  );
  return lines.join("\n");
};

const handleConfirmation = (session, text) => {
  if (!session.context.confirmationAwaiting) {
    session.context.confirmationAwaiting = true;
    return {
      messages: [
        buildSummary(session),
        "Is this correct? Reply 'Yes' to confirm or tell me what needs updating."
      ]
    };
  }

  if (!yesPatterns.test(text)) {
    if (/edit|change|update/i.test(text)) {
      return {
        messages: [
          "Please let me know the details that need updating and an adviser will follow up, or restart the session to re-run the questionnaire."
        ]
      };
    }

    return {
      messages: [
        "I’ll need a 'Yes' to confirm accuracy. If anything is incorrect, please tell me what should be amended."
      ]
    };
  }

  session.data.summary_confirmation.client_summary_confirmed = true;
  session.data.summary_confirmation.confirmed_at = new Date().toISOString();
  session.context.confirmationAwaiting = false;
  setStage(session, "SEGMENT_G_REPORT");
  return handleReport(session);
};

const handleStructuredConfirmation = (session, content) => {
  const confirmation = content?.confirmation ?? {};
  if (!confirmation.confirmed) {
    return {
      messages: [
        "Please confirm the captured summary before I can generate your report."
      ]
    };
  }

  session.data.summary_confirmation = {
    client_summary_confirmed: true,
    confirmed_at: confirmation.confirmed_at ?? new Date().toISOString(),
    edits_requested: confirmation.edits_requested ?? ""
  };

  session.context.confirmationAwaiting = false;
  session.context.reportReady = true;
  setStage(session, "SEGMENT_G_REPORT");
  return handleReport(session);
};

const enrichAdviceOutcome = (session) => {
  const profile = session.data.client_profile;
  const prefs = session.data.sustainability_preferences;

  session.data.advice_outcome.recommendation =
    session.data.advice_outcome.recommendation ||
    "Recommendation to be finalised by adviser following compliance review.";
  session.data.advice_outcome.rationale =
    session.data.advice_outcome.rationale ||
    `Client objective ${profile.objectives} with horizon ${profile.horizon_years} years and risk level ${profile.risk_tolerance}/7.`;
  session.data.advice_outcome.sust_fit =
    session.data.advice_outcome.sust_fit ||
    (prefs.preference_level === "none"
      ? "No explicit sustainability preferences recorded."
      : `Captured sustainability preferences include ${
          prefs.labels_interest.join(", ") || "general ESG awareness"
        }.`);
  session.data.advice_outcome.costs_summary =
    session.data.advice_outcome.costs_summary ||
    "Detailed costs and charges will be attached with product disclosures.";
};

const handleReport = (session) => {
  enrichAdviceOutcome(session);
  const validation = validateSessionData(session);
  if (!validation.valid) {
    return {
      messages: [
        "We're missing some information before I can generate the report:",
        ...validation.issues
      ]
    };
  }

  const artifacts = generateReportArtifacts(session);
  storeReportArtifacts(session.id, artifacts.pdfBuffer);
  session.data.audit.report_hash = artifacts.hash;
  session.data.timestamps.report_generated_at = new Date().toISOString();
  session.data.report.preview = artifacts.preview;
  session.data.report.doc_url = `/api/sessions/${session.id}/report.pdf`;
  session.data.report.status = "draft";
  session.context.reportReady = true;

  return moveToStage(session, "SEGMENT_H_DELIVERY", [
    "Great, I’m generating your personalised suitability pack now.",
    "I’ve prepared your personalised pack. You can download the summary, ESG explainer, and disclosure bundle from the dashboard.",
    `Report preview:\n${artifacts.preview}`,
    "If you need anything else, let me know and an adviser will follow up."
  ]);
};

const handleDelivery = () => ({
  messages: [
    "This session is complete. Your adviser will review everything and attach any product disclosures shortly."
  ]
});

const handleComplete = () => ({
  messages: [
    "This session is already archived. If you need changes, please start a new one."
  ]
});

export const handleClientTurn = async (session, text) => {
  const trimmed = String(text ?? "").trim();
  const detour = handleDetours(session, trimmed);
  if (detour) {
    saveSession(session);
    return detour;
  }

  const stageHandlers = {
    SEGMENT_A_EXPLANATION: handleExplanation,
    SEGMENT_B_ONBOARDING: handleOnboarding,
    SEGMENT_C_CONSENT: handleConsent,
    SEGMENT_D_EDUCATION: handleEducation,
    SEGMENT_E_OPTIONS: handleOptions,
    SEGMENT_F_CONFIRMATION: handleConfirmation,
    SEGMENT_G_REPORT: handleReport,
    SEGMENT_H_DELIVERY: handleDelivery,
    SEGMENT_COMPLETE: handleComplete
  };

  const handler = stageHandlers[session.stage] ?? (() => ({ messages: [] }));
  const before = captureProgressSnapshot(session);
  const response = handler(session, trimmed);
  const after = captureProgressSnapshot(session);

  const progressed = hasProgressed(before, after);
  if (progressed || !trimmed) {
    saveSession(session);
    return response;
  }

  let finalResponse;
  try {
    finalResponse = await handleFreeFormQuery(
      session,
      trimmed,
      response?.messages ?? []
    );
  } catch (error) {
    const fallback = Array.isArray(response?.messages)
      ? response.messages
      : [];
    finalResponse = {
      messages: [
        ...fallback,
        "I’m unable to escalate this question to the compliance assistant right now. Please try again later or clarify your response."
      ]
    };
  }

  saveSession(session);
  return finalResponse;
};

export const handleAssistantMessage = (session, content) => {
  applyDataPatch(session, content?.stageData ?? {});
  saveSession(session);
  return { messages: [] };
};

// Enhanced multi-modal input handler
export const handleMultiModalInput = async (session, input) => {
  try {
    const processedInput = processMultiModalInput(session, input);
    
    if (processedInput.error) {
      return {
        messages: [processedInput.error],
        error: true
      };
    }

    const { processedInput: processed } = processedInput;
    
    // Route to appropriate handler based on input type
    switch (processed.type) {
      case 'text':
        return await handleEnhancedClientTurn(session, processed.content);
      case 'structured':
        return await handleStructuredInput(session, processed.data);
      case 'guided':
        return await handleGuidedInput(session, processed.selection);
      case 'extracted_structured':
        return await handleExtractedStructuredInput(session, processed);
      default:
        return { messages: ["Unsupported input type"], error: true };
    }
  } catch (error) {
    console.error('Error in handleMultiModalInput:', error);
    return {
      messages: ["I encountered an error processing your input. Please try again."],
      error: true
    };
  }
};

// Enhanced client turn handler with context management and personalization
const handleEnhancedClientTurn = async (session, text) => {
  const trimmed = String(text ?? "").trim();
  
  // Initialize context stack if needed
  const contextStack = new ConversationContextStack(session);
  
  // Perform comprehensive NLP analysis
  const nlpAnalysis = performComprehensiveNLP(trimmed, {
    stage: session.stage,
    sophistication: session.context?.clientSophistication?.level,
    conversationHistory: session.events?.slice(-5) || []
  });
  
  // Analyze sentiment and track engagement (legacy support)
  const sentimentAnalysis = analyzeSentiment(trimmed, session.events);
  const engagementLevel = trackClientEngagement(session, trimmed, sentimentAnalysis);
  
  // Adapt conversation style based on comprehensive analysis
  const conversationAdaptations = {
    ...adaptConversationStyle(session, engagementLevel, sentimentAnalysis),
    ...nlpAnalysis.responseAdaptations
  };
  
  // Store NLP analysis in session for future reference
  if (!session.data.analytics) session.data.analytics = {};
  if (!session.data.analytics.nlp_history) session.data.analytics.nlp_history = [];
  
  session.data.analytics.nlp_history.push({
    timestamp: new Date().toISOString(),
    text: trimmed,
    analysis: nlpAnalysis,
    stage: session.stage
  });
  
  // Keep only last 20 NLP analyses to prevent memory bloat
  if (session.data.analytics.nlp_history.length > 20) {
    session.data.analytics.nlp_history = session.data.analytics.nlp_history.slice(-20);
  }

  // Track personalization analytics
  trackAnalyticsEvent(session, ANALYTICS_EVENT_TYPES.PERSONALIZATION_APPLIED, {
    adaptations: conversationAdaptations,
    nlpIntent: nlpAnalysis.intent?.intent,
    languageComplexity: nlpAnalysis.languageComplexity?.complexity,
    engagementLevel
  });
  
  // Detect client sophistication and update input preferences
  const sophisticationLevel = detectClientSophistication(session);
  if (!session.context.clientSophistication || 
      session.context.clientSophistication.level !== sophisticationLevel) {
    session.context.clientSophistication = {
      level: sophisticationLevel,
      lastUpdated: new Date().toISOString(),
      inputMode: session.context.clientSophistication?.inputMode || INPUT_MODES.FREE_TEXT,
      branchingStrategy: session.context.clientSophistication?.branchingStrategy || 'adaptive'
    };
  }

  // Handle detours with context preservation
  const detour = handleDetours(session, trimmed);
  if (detour) {
    // Push detour context onto stack
    const detourType = shouldTriggerInvestmentExplorer(trimmed) 
      ? CONTEXT_TYPES.INVESTMENT_EXPLORATION 
      : findEducationModule(trimmed) 
        ? CONTEXT_TYPES.EDUCATIONAL 
        : CONTEXT_TYPES.COMPLIANCE_QUERY;
    
    contextStack.pushContext(detourType, { query: trimmed });
    
    // Track detour analytics
    trackAnalyticsEvent(session, ANALYTICS_EVENT_TYPES.DETOUR_TAKEN, {
      detourType,
      query: trimmed,
      intent: nlpAnalysis.intent?.intent,
      contextDepth: contextStack.getContextDepth()
    });
    
    // Personalize detour response using enhanced NLP
    const personalizedDetour = {
      ...detour,
      messages: detour.messages.map(msg => {
        const legacyPersonalized = personalizeResponse(msg, conversationAdaptations, session);
        return personalizeResponseWithNLP(legacyPersonalized, conversationAdaptations, nlpAnalysis);
      })
    };
    
    saveSession(session);
    return personalizedDetour;
  }

  const stageHandlers = {
    SEGMENT_A_EXPLANATION: handleExplanation,
    SEGMENT_B_ONBOARDING: handleOnboarding,
    SEGMENT_C_CONSENT: handleConsent,
    SEGMENT_D_EDUCATION: handleEducation,
    SEGMENT_E_OPTIONS: handleOptions,
    SEGMENT_F_CONFIRMATION: handleConfirmation,
    SEGMENT_G_REPORT: handleReport,
    SEGMENT_H_DELIVERY: handleDelivery,
    SEGMENT_COMPLETE: handleComplete
  };

  const handler = stageHandlers[session.stage] ?? (() => ({ messages: [] }));
  const before = captureProgressSnapshot(session);
  
  let response;
  try {
    response = handler(session, trimmed);
    
    // Personalize stage handler response using enhanced NLP
    if (response?.messages) {
      response.messages = response.messages.map(msg => {
        // Apply both legacy and enhanced personalization
        const legacyPersonalized = personalizeResponse(msg, conversationAdaptations, session);
        return personalizeResponseWithNLP(legacyPersonalized, conversationAdaptations, nlpAnalysis);
      });
    }
  } catch (error) {
    // Track error analytics
    trackAnalyticsEvent(session, ANALYTICS_EVENT_TYPES.ERROR_ENCOUNTERED, {
      errorType: 'handler_error',
      errorMessage: error.message,
      stage: session.stage,
      intent: nlpAnalysis.intent?.intent
    });

    // Handle errors with conversation recovery
    const recoveryResult = manageConversationRecovery(session, {
      type: 'handler_error',
      message: error.message,
      action: 'stage_handling'
    });
    
    // Track recovery attempt
    trackAnalyticsEvent(session, ANALYTICS_EVENT_TYPES.RECOVERY_ATTEMPTED, {
      recoveryStrategy: recoveryResult.recoveryStrategy.approach,
      errorContext: 'stage_handling'
    });
    
    response = {
      messages: [recoveryResult.recoveryStrategy.message],
      error: true,
      recovery: recoveryResult.recoveryStrategy
    };
  }
  
  const after = captureProgressSnapshot(session);

  const progressed = hasProgressed(before, after);
  if (progressed || !trimmed) {
    // Check if we should offer alternative input methods
    if (shouldOfferAlternativeInput(session, session.context.inputAttempts || 0)) {
      const suggestions = generateInputModeSuggestions(session);
      if (suggestions.length > 0) {
        response.inputSuggestions = suggestions;
        response.messages = response.messages || [];
        response.messages.push("Would you prefer to use a different input method? I can offer structured forms or guided selections.");
      }
    }
    
    saveSession(session);
    return response;
  }

  let finalResponse;
  try {
    finalResponse = await handleFreeFormQuery(
      session,
      trimmed,
      response?.messages ?? []
    );
    
    // Personalize free-form response using enhanced NLP
    if (finalResponse?.messages) {
      finalResponse.messages = finalResponse.messages.map(msg => {
        const legacyPersonalized = personalizeResponse(msg, conversationAdaptations, session);
        return personalizeResponseWithNLP(legacyPersonalized, conversationAdaptations, nlpAnalysis);
      });
    }
  } catch (error) {
    // Handle free-form query errors with recovery
    const recoveryResult = manageConversationRecovery(session, {
      type: 'ai_service_error',
      message: error.message,
      action: 'free_form_query'
    });
    
    const fallback = Array.isArray(response?.messages) ? response.messages : [];
    finalResponse = {
      messages: [
        ...fallback,
        recoveryResult.recoveryStrategy.message
      ],
      error: true,
      recovery: recoveryResult.recoveryStrategy
    };
  }

  saveSession(session);
  return finalResponse;
};

// Handler for structured input data
const handleStructuredInput = async (session, data) => {
  const structuredHandlers = {
    SEGMENT_A_EXPLANATION: handleStructuredExplanation,
    SEGMENT_B_ONBOARDING: handleStructuredOnboarding,
    SEGMENT_C_CONSENT: handleStructuredConsent,
    SEGMENT_D_EDUCATION: handleStructuredEducation,
    SEGMENT_E_OPTIONS: handleStructuredOptions,
    SEGMENT_F_CONFIRMATION: handleStructuredConfirmation
  };

  const handler = structuredHandlers[session.stage];
  if (handler) {
    return handler(session, { ...data });
  }

  return { messages: ["Structured input not supported for this stage."] };
};

// Handler for guided selection input
const handleGuidedInput = async (session, selection) => {
  // Convert guided selection to appropriate format for current stage
  const convertedInput = convertGuidedSelectionToStageInput(session, selection);
  
  if (convertedInput.type === 'text') {
    return await handleEnhancedClientTurn(session, convertedInput.content);
  } else if (convertedInput.type === 'structured') {
    return await handleStructuredInput(session, convertedInput.data);
  }

  return { messages: ["Unable to process guided selection for this stage."] };
};

// Handler for extracted structured input from free text
const handleExtractedStructuredInput = async (session, processed) => {
  const { originalText, extractedData, extractionConfidence } = processed;
  
  if (extractionConfidence < 0.6) {
    // Low confidence - fall back to text processing
    return await handleEnhancedClientTurn(session, originalText);
  }

  // High confidence - use extracted structured data
  const response = await handleStructuredInput(session, extractedData);
  
  // Add confirmation message about extraction
  if (response.messages) {
    response.messages.unshift(
      `I extracted the following information from your message: ${Object.entries(extractedData)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')}. Let me know if this looks correct.`
    );
  }

  return response;
};

// Utility function to convert guided selections to stage-appropriate input
const convertGuidedSelectionToStageInput = (session, selection) => {
  const stage = session.stage;
  
  switch (stage) {
    case 'SEGMENT_B_ONBOARDING':
      return {
        type: 'structured',
        data: {
          client_type: selection.clientType,
          objectives: selection.objectives,
          horizon_years: selection.horizonYears,
          risk_tolerance: selection.riskTolerance,
          capacity_for_loss: selection.capacityForLoss
        }
      };
    
    case 'SEGMENT_E_OPTIONS':
      return {
        type: 'structured',
        data: {
          preference_level: selection.preferenceLevel,
          labels_interest: selection.labelsInterest,
          themes: selection.themes,
          exclusions: selection.exclusions
        }
      };
    
    default:
      return {
        type: 'text',
        content: selection.textEquivalent || JSON.stringify(selection)
      };
  }
};

export const handleEvent = async (session, event) => {
  if (event.author === "client" && event.type === "message") {
    return handleClientTurn(session, event.content?.text ?? "");
  }

  if (event.author === "assistant" && event.type === "message") {
    return handleAssistantMessage(session, event.content ?? {});
  }

  if (event.author === "client" && event.type === "data_update") {
    const structuredHandlers = {
      SEGMENT_A_EXPLANATION: handleStructuredExplanation,
      SEGMENT_B_ONBOARDING: handleStructuredOnboarding,
      SEGMENT_C_CONSENT: handleStructuredConsent,
      SEGMENT_D_EDUCATION: handleStructuredEducation,
      SEGMENT_E_OPTIONS: handleStructuredOptions,
      SEGMENT_F_CONFIRMATION: handleStructuredConfirmation
    };

    const handler = structuredHandlers[session.stage];
    if (handler) {
      return handler(session, event.content ?? {});
    }
  }

  // Handle multi-modal input events
  if (event.author === "client" && event.type === "multi_modal_input") {
    return await handleMultiModalInput(session, event.content);
  }

  return { messages: [] };
};

// Enhanced error handling and session recovery functions
export const recoverSession = (session) => {
  if (!session || typeof session !== 'object') {
    console.error('Cannot recover null or invalid session');
    return null;
  }
  
  // Ensure basic session structure
  session.data = session.data || {};
  session.context = session.context || {};
  session.stage = session.stage || 'SEGMENT_A_EXPLANATION';
  session.events = session.events || [];
  
  // Ensure data structure
  if (!session.data.client_profile) {
    session.data.client_profile = {
      client_type: "",
      objectives: "",
      horizon_years: null,
      risk_tolerance: null,
      capacity_for_loss: "",
      liquidity_needs: "",
      knowledge_experience: { summary: "", instruments: [], frequency: "", duration: "" },
      financial_situation: { provided: false, income: null, assets: null, liabilities: null, notes: "" }
    };
  }
  
  if (!session.data.sustainability_preferences) {
    session.data.sustainability_preferences = {
      preference_level: "none",
      labels_interest: [],
      themes: [],
      exclusions: [],
      impact_goals: [],
      engagement_importance: "",
      reporting_frequency_pref: "none",
      tradeoff_tolerance: "",
      educ_pack_sent: false
    };
  }
  
  if (!session.data.consent) {
    session.data.consent = {
      data_processing: null,
      e_delivery: null,
      future_contact: { granted: null, purpose: "" }
    };
  }
  
  if (!session.data.audit) {
    session.data.audit = {
      events: [],
      ip: null,
      explanation_shown: false,
      educ_pack_sent: false,
      guardrail_triggers: [],
      report_hash: null
    };
  }
  
  // Ensure context structure
  if (!session.context.education) {
    session.context.education = {
      acknowledged: false,
      summaryOffered: false,
      summarised: false
    };
  }
  
  if (!session.context.options) {
    session.context.options = {
      preferenceLevel: null,
      step: 0,
      pendingExclusions: false,
      pendingImpactDetails: false
    };
  }
  
  return session;
};

export const validateSessionStructure = (session) => {
  if (!session || typeof session !== 'object') {
    return { valid: false, error: 'Session is null or not an object' };
  }
  
  const required = ['id', 'stage', 'data', 'context', 'events'];
  for (const field of required) {
    if (!(field in session)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  if (typeof session.data !== 'object' || session.data === null) {
    return { valid: false, error: 'Session data is not an object' };
  }
  
  if (typeof session.context !== 'object' || session.context === null) {
    return { valid: false, error: 'Session context is not an object' };
  }
  
  if (!Array.isArray(session.events)) {
    return { valid: false, error: 'Session events is not an array' };
  }
  
  return { valid: true };
};

export const handleErrorWithFallback = (error, context, fallbackMessage) => {
  console.error(`Error in ${context}:`, error.message);
  
  return {
    messages: [fallbackMessage || "I encountered a technical issue. An advisor will follow up with you."],
    error: true,
    errorContext: context,
    errorMessage: error.message
  };
};