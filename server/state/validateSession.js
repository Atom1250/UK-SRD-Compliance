import {
  CAPACITY_FOR_LOSS_VALUES,
  CLIENT_TYPES,
  PATHWAY_NAMES,
  PREFERENCE_LEVELS,
  REPORTING_FREQUENCY_OPTIONS,
  RISK_SCALE
} from "./constants.js";

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const normalise = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const isBoolean = (value) => typeof value === "boolean";

const impactChosen = (labels) =>
  Array.isArray(labels) && labels.some((label) => /impact/i.test(label));

const validateExclusions = (exclusions = []) => {
  const issues = [];
  exclusions.forEach((item, index) => {
    if (!item || typeof item !== "object") {
      issues.push(`Exclusion at position ${index + 1} must be an object.`);
      return;
    }
    if (!isNonEmptyString(item.sector)) {
      issues.push(`Exclusion ${index + 1} requires a sector description.`);
    }
    if (item.threshold != null && !Number.isFinite(Number(item.threshold))) {
      issues.push(`Exclusion for ${item.sector || `item ${index + 1}`} must use a numeric threshold when provided.`);
    }
    if (/fossil/i.test(item.sector ?? "") && (item.threshold == null || Number.isNaN(Number(item.threshold)))) {
      issues.push("Fossil fuel exclusions require a numeric threshold (e.g. under 5%).");
    }
  });
  return issues;
};

export const validateSessionData = (session) => {
  const issues = [];
  const data = session?.data ?? {};

  if (!data.audit?.explanation_shown) {
    issues.push("Client must be shown the introductory explanation before continuing.");
  }

  const profile = data.client_profile ?? {};
  if (!CLIENT_TYPES.some((type) => normalise(type) === normalise(profile.client_type))) {
    issues.push("Client type must be individual, joint, trust, or company.");
  }
  if (!isNonEmptyString(profile.objectives)) {
    issues.push("Investment objectives are required.");
  }
  if (!Number.isInteger(profile.horizon_years) || profile.horizon_years <= 0) {
    issues.push("Investment horizon must be a positive whole number of years.");
  }
  if (!RISK_SCALE.includes(profile.risk_tolerance)) {
    issues.push("Risk tolerance must be set on the 1–7 scale.");
  }
  if (!CAPACITY_FOR_LOSS_VALUES.some((value) => normalise(value) === normalise(profile.capacity_for_loss))) {
    issues.push("Capacity for loss must be recorded as low, medium, or high.");
  }
  if (!isNonEmptyString(profile.liquidity_needs)) {
    issues.push("Liquidity needs must be captured, even if the client has none.");
  }
  if (!isNonEmptyString(profile.knowledge_experience?.summary)) {
    issues.push("Knowledge and experience summary is required.");
  }
  if (profile.financial_situation?.provided && !isNonEmptyString(profile.financial_situation?.notes)) {
    issues.push("Financial situation notes must be recorded when the client opts to share details.");
  }

  const consent = data.consent ?? {};
  if (!consent.data_processing?.granted) {
    issues.push("Data processing consent (with timestamp) is required to proceed.");
  }
  if (consent.data_processing?.granted && !isNonEmptyString(consent.data_processing?.timestamp)) {
    issues.push("Consent timestamp is required for audit.");
  }
  if (consent.e_delivery && !isBoolean(consent.e_delivery.granted)) {
    issues.push("E-delivery preference must be recorded as granted or declined.");
  }
  if (consent.future_contact && consent.future_contact.granted && !isNonEmptyString(consent.future_contact.purpose)) {
    issues.push("Future contact consent requires a stated purpose.");
  }

  const prefs = data.sustainability_preferences ?? {};
  if (!PREFERENCE_LEVELS.includes(prefs.preference_level ?? "none")) {
    issues.push("Preference level must be one of none, high_level, or detailed.");
  }
  if (prefs.preference_level !== "none") {
    if (!Array.isArray(prefs.labels_interest) || prefs.labels_interest.length === 0) {
      issues.push("At least one SDR label interest must be recorded when preferences are provided.");
    } else {
      prefs.labels_interest.forEach((label, index) => {
        if (!PATHWAY_NAMES.some((name) => normalise(name) === normalise(label))) {
          issues.push(`Label interest at position ${index + 1} is not recognised as an FCA SDR option.`);
        }
      });
    }
  }

  if (prefs.preference_level === "detailed") {
    if (!Array.isArray(prefs.themes)) {
      issues.push("Detailed preferences should include thematic interests (use an empty list if none).");
    }
    if (!isNonEmptyString(prefs.engagement_importance)) {
      issues.push("Engagement importance must be captured for detailed preferences.");
    }
    if (!isNonEmptyString(prefs.tradeoff_tolerance)) {
      issues.push("Please record the client’s trade-off tolerance for sustainability versus performance.");
    }
  }

  if (prefs.exclusions) {
    issues.push(...validateExclusions(prefs.exclusions));
  }

  if (!REPORTING_FREQUENCY_OPTIONS.includes(prefs.reporting_frequency_pref ?? "none")) {
    issues.push("Reporting frequency preference must be none, quarterly, semiannual, or annual.");
  }

  if (impactChosen(prefs.labels_interest) && (!prefs.impact_goals || prefs.impact_goals.length === 0)) {
    issues.push("Impact-labelled selections require at least one impact goal.");
  }
  if (impactChosen(prefs.labels_interest) && prefs.reporting_frequency_pref === "none") {
    issues.push("Impact-labelled selections require a reporting cadence for outcome evidence.");
  }

  if (prefs.preference_level !== "none" && data.disclosures?.agr_disclaimer_presented !== true) {
    issues.push("Anti-Greenwashing disclaimer must be presented when sustainability preferences are captured.");
  }

  if (!data.summary_confirmation?.client_summary_confirmed) {
    issues.push("Client must confirm the captured summary before report generation.");
  }

  if (data.prod_governance && data.prod_governance.manufacturer_info_complete === false) {
    issues.push("Manufacturer target market information must be complete before proceeding (PROD 3).");
  }

  // Enhanced validation integration
  const cobs9aIssues = validateCOBS9ACompliance(data);
  const consistencyIssues = validateDataConsistency(data);
  
  issues.push(...cobs9aIssues.critical);
  const warnings = [...cobs9aIssues.warnings];
  issues.push(...consistencyIssues);

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    cobs9aCompliant: cobs9aIssues.critical.length === 0
  };
};

/**
 * Enhanced COBS 9A compliance validation
 * @param {Object} data - Session data to validate
 * @returns {Object} Validation results with critical issues and warnings
 */
export const validateCOBS9ACompliance = (data) => {
  const critical = [];
  const warnings = [];
  
  // COBS 9A.2.1 - Suitability assessment requirements
  const profile = data.client_profile ?? {};
  
  // Knowledge and experience assessment (COBS 9A.2.2)
  if (!profile.knowledge_experience?.summary) {
    critical.push("COBS 9A.2.2: Knowledge and experience assessment is mandatory");
  }
  
  if (!Array.isArray(profile.knowledge_experience?.instruments) || 
      profile.knowledge_experience.instruments.length === 0) {
    warnings.push("COBS 9A.2.2: Specific instrument experience should be documented");
  }
  
  if (!profile.knowledge_experience?.frequency) {
    warnings.push("COBS 9A.2.2: Trading frequency should be documented");
  }
  
  if (!profile.knowledge_experience?.duration) {
    warnings.push("COBS 9A.2.2: Experience duration should be documented");
  }
  
  // Financial situation assessment (COBS 9A.2.3)
  if (!profile.financial_situation?.provided) {
    warnings.push("COBS 9A.2.3: Financial situation assessment recommended for comprehensive suitability");
  }
  
  // Investment objectives assessment (COBS 9A.2.4)
  if (!profile.objectives) {
    critical.push("COBS 9A.2.4: Investment objectives must be clearly identified");
  }
  
  if (!Number.isInteger(profile.horizon_years) || profile.horizon_years <= 0) {
    critical.push("COBS 9A.2.4: Investment time horizon must be specified");
  }
  
  if (!RISK_SCALE.includes(profile.risk_tolerance)) {
    critical.push("COBS 9A.2.4: Risk tolerance must be assessed and documented");
  }
  
  // Risk-capacity mismatch validation
  const riskCapacityMismatch = validateRiskCapacityAlignment(profile);
  if (riskCapacityMismatch.critical) {
    critical.push(`COBS 9A.2.4: ${riskCapacityMismatch.message}`);
  } else if (riskCapacityMismatch.warning) {
    warnings.push(`COBS 9A.2.4: ${riskCapacityMismatch.message}`);
  }
  
  // Liquidity needs assessment
  if (!profile.liquidity_needs) {
    critical.push("COBS 9A.2.4: Liquidity needs must be assessed");
  }
  
  // Consent and disclosure requirements (COBS 9A.3)
  const consent = data.consent ?? {};
  if (!consent.data_processing?.granted) {
    critical.push("COBS 9A.3: Client consent for data processing is required");
  }
  
  if (!consent.data_processing?.timestamp) {
    critical.push("COBS 9A.3: Consent timestamp required for audit trail");
  }
  
  // Suitability report requirements (COBS 9A.4)
  // Only validate recommendation requirements if report has been generated
  if (data.timestamps?.report_generated_at) {
    if (!data.advice_outcome?.recommendation) {
      critical.push("COBS 9A.4: Suitability report must include specific recommendation");
    }
    
    if (data.advice_outcome?.recommendation && !data.advice_outcome?.rationale) {
      critical.push("COBS 9A.4: Suitability report must include rationale for recommendation");
    }
  }
  
  // Consumer Duty considerations
  const consumerDutyIssues = validateConsumerDuty(data);
  critical.push(...consumerDutyIssues.critical);
  warnings.push(...consumerDutyIssues.warnings);
  
  return { critical, warnings };
};

/**
 * Validate Consumer Duty compliance
 * @param {Object} data - Session data
 * @returns {Object} Consumer Duty validation results
 */
export const validateConsumerDuty = (data) => {
  const critical = [];
  const warnings = [];
  
  // Consumer understanding (Consumer Duty Outcome 1)
  if (!data.audit?.explanation_shown) {
    critical.push("Consumer Duty: Client must receive clear explanation of the process");
  }
  
  if (data.sustainability_preferences?.preference_level !== "none" && 
      !data.disclosures?.agr_disclaimer_presented) {
    critical.push("Consumer Duty: Anti-greenwashing disclaimer must be presented for sustainability preferences");
  }
  
  // Fair value (Consumer Duty Outcome 2)
  if (data.advice_outcome?.recommendation && !data.advice_outcome?.costs_summary) {
    warnings.push("Consumer Duty: Cost summary should be provided with recommendations");
  }
  
  // Consumer support (Consumer Duty Outcome 3)
  if (data.educational_requests?.length > 0 && !data.sustainability_preferences?.educ_pack_sent) {
    warnings.push("Consumer Duty: Educational support should be provided when requested");
  }
  
  return { critical, warnings };
};

/**
 * Validate risk tolerance and capacity for loss alignment
 * @param {Object} profile - Client profile data
 * @returns {Object} Risk-capacity validation result
 */
export const validateRiskCapacityAlignment = (profile) => {
  const riskTolerance = profile.risk_tolerance;
  const capacityForLoss = normalise(profile.capacity_for_loss);
  
  if (!riskTolerance || !capacityForLoss) {
    return { critical: false, warning: false, message: "" };
  }
  
  // High risk tolerance (6-7) with low capacity for loss
  if (riskTolerance >= 6 && capacityForLoss === "low") {
    return {
      critical: true,
      warning: false,
      message: "High risk tolerance with low capacity for loss requires explicit client override and additional documentation"
    };
  }
  
  // Medium-high risk tolerance (5) with low capacity for loss
  if (riskTolerance === 5 && capacityForLoss === "low") {
    return {
      critical: false,
      warning: true,
      message: "Medium-high risk tolerance with low capacity for loss should be carefully considered"
    };
  }
  
  // Very high risk tolerance (7) with medium capacity
  if (riskTolerance === 7 && capacityForLoss === "medium") {
    return {
      critical: false,
      warning: true,
      message: "Very high risk tolerance with medium capacity for loss may require additional justification"
    };
  }
  
  return { critical: false, warning: false, message: "" };
};

/**
 * Validate data consistency across session updates
 * @param {Object} data - Session data to validate
 * @returns {Array} Array of consistency issues
 */
export const validateDataConsistency = (data) => {
  const issues = [];
  
  // Timestamp consistency
  const timestamps = data.timestamps ?? {};
  const createdAt = new Date(data.session_id ? "2024-01-01" : Date.now()); // Fallback for missing creation date
  
  Object.entries(timestamps).forEach(([key, timestamp]) => {
    if (timestamp) {
      const eventDate = new Date(timestamp);
      if (eventDate < createdAt) {
        issues.push(`Timestamp inconsistency: ${key} cannot be before session creation`);
      }
    }
  });
  
  // Logical flow consistency
  if (timestamps.education_completed_at && timestamps.consent_recorded_at &&
      new Date(timestamps.education_completed_at) < new Date(timestamps.consent_recorded_at)) {
    issues.push("Flow inconsistency: Education should typically occur after consent");
  }
  
  if (timestamps.report_generated_at && !data.summary_confirmation?.client_summary_confirmed) {
    issues.push("Flow inconsistency: Report generated without client confirmation");
  }
  
  // Preference consistency
  const prefs = data.sustainability_preferences ?? {};
  if (prefs.preference_level === "none" && 
      (prefs.labels_interest?.length > 0 || prefs.themes?.length > 0)) {
    issues.push("Preference inconsistency: Labels or themes specified with 'none' preference level");
  }
  
  if (prefs.preference_level === "detailed" && 
      (!prefs.engagement_importance || !prefs.tradeoff_tolerance)) {
    issues.push("Preference inconsistency: Detailed level requires engagement importance and trade-off tolerance");
  }
  
  // Impact label consistency
  if (impactChosen(prefs.labels_interest)) {
    if (!prefs.impact_goals || prefs.impact_goals.length === 0) {
      issues.push("Impact consistency: Impact labels require specific impact goals");
    }
    if (prefs.reporting_frequency_pref === "none") {
      issues.push("Impact consistency: Impact labels require reporting frequency preference");
    }
  }
  
  // Consent consistency
  const consent = data.consent ?? {};
  if (consent.data_processing?.granted && !consent.data_processing?.timestamp) {
    issues.push("Consent inconsistency: Granted consent must have timestamp");
  }
  
  if (consent.future_contact?.granted && !consent.future_contact?.purpose) {
    issues.push("Consent inconsistency: Future contact consent requires purpose");
  }
  
  // Audit trail consistency
  const audit = data.audit ?? {};
  if (audit.events?.length > 0 && !audit.ip) {
    issues.push("Audit inconsistency: Session events exist but no IP address recorded");
  }
  
  return issues;
};

/**
 * Enhanced session validation with comprehensive COBS 9A compliance
 * @param {Object} session - Complete session object
 * @returns {Object} Enhanced validation results
 */
export const validateSessionDataEnhanced = (session) => {
  const issues = [];
  const warnings = [];
  const data = session?.data ?? {};

  // Enhanced COBS 9A compliance validation
  const cobs9aIssues = validateCOBS9ACompliance(data);
  issues.push(...cobs9aIssues.critical);
  warnings.push(...cobs9aIssues.warnings);

  // Data consistency validation
  const consistencyIssues = validateDataConsistency(data);
  issues.push(...consistencyIssues);

  // Original validation logic (preserved for backward compatibility)
  const originalValidation = validateSessionData(session);
  issues.push(...originalValidation.issues);

  return {
    valid: issues.length === 0,
    issues,
    warnings,
    cobs9aCompliant: cobs9aIssues.critical.length === 0,
    consistencyValid: consistencyIssues.length === 0,
    originalValid: originalValidation.valid
  };
};

/**
 * Data migration utilities for schema changes
 */
export const migrateSessionData = (session) => {
  if (!session || !session.data) {
    return session;
  }

  const data = session.data;
  let migrated = false;

  // Migration 1: Add missing audit structure
  if (!data.audit) {
    data.audit = {
      events: [],
      ip: null,
      explanation_shown: false,
      educ_pack_sent: false,
      guardrail_triggers: [],
      report_hash: null
    };
    migrated = true;
  }

  // Migration 2: Add missing timestamps structure
  if (!data.timestamps) {
    data.timestamps = {
      explanation_shown_at: null,
      consent_recorded_at: null,
      education_completed_at: null,
      report_generated_at: null,
      session_closed_at: null
    };
    migrated = true;
  }

  // Migration 3: Add missing knowledge_experience structure
  if (data.client_profile && !data.client_profile.knowledge_experience) {
    data.client_profile.knowledge_experience = {
      summary: "",
      instruments: [],
      frequency: "",
      duration: ""
    };
    migrated = true;
  }

  // Migration 4: Add missing financial_situation structure
  if (data.client_profile && !data.client_profile.financial_situation) {
    data.client_profile.financial_situation = {
      provided: false,
      income: null,
      assets: null,
      liabilities: null,
      notes: ""
    };
    migrated = true;
  }

  // Migration 5: Add missing consent structure
  if (!data.consent) {
    data.consent = {
      data_processing: null,
      e_delivery: null,
      future_contact: {
        granted: null,
        purpose: ""
      }
    };
    migrated = true;
  }

  // Migration 6: Add missing sustainability_preferences structure
  if (!data.sustainability_preferences) {
    data.sustainability_preferences = {
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
    migrated = true;
  }

  // Migration 7: Add version tracking
  if (!data.schema_version) {
    data.schema_version = "1.0";
    migrated = true;
  }

  // Update session timestamp if migrated
  if (migrated) {
    session.updatedAt = new Date().toISOString();
    session.data.migrated_at = new Date().toISOString();
  }

  return session;
};

/**
 * Validate and migrate session data automatically
 * @param {Object} session - Session to validate and migrate
 * @returns {Object} Validation results with migration info
 */
export const validateAndMigrateSession = (session) => {
  // First migrate the session
  const migratedSession = migrateSessionData(session);
  
  // Then validate the migrated session
  const validation = validateSessionDataEnhanced(migratedSession);
  
  return {
    ...validation,
    migrated: !!migratedSession.data.migrated_at,
    session: migratedSession
  };
};