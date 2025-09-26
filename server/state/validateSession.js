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

  return {
    valid: issues.length === 0,
    issues
  };
};
