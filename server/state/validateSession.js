import {
  ATR_VALUES,
  CFL_VALUES,
  PATHWAY_NAMES,
  STEWARDSHIP_OPTIONS
} from "./constants.js";

const uuidPattern =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;

const isEmail = (value) =>
  typeof value === "string" && /.+@.+\..+/.test(value.trim());

const normaliseNumber = (value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
};

export const validateSessionData = (session) => {
  const issues = [];
  const data = session?.data ?? {};

  // Consent acknowledgement
  if (!data.acknowledgements || data.acknowledgements.read_informed_choice !== true) {
    issues.push("Client must confirm that they read and understood the explainer content.");
  }

  if (
    data.acknowledgements &&
    !isNonEmptyString(data.acknowledgements.timestamp)
  ) {
    issues.push("Consent acknowledgement requires an ISO timestamp.");
  }

  // Client profile
  if (!data.client) {
    issues.push("Client profile (name, contact, risk) is missing.");
  } else {
    if (!uuidPattern.test(data.client.id ?? "")) {
      issues.push("Client ID must be a UUID.");
    }
    if (!isNonEmptyString(data.client.name)) {
      issues.push("Client name is required.");
    }
    if (!data.client.contact || !isEmail(data.client.contact.email)) {
      issues.push("Client email address is required.");
    }
    if (
      !data.client.risk ||
      !ATR_VALUES.includes(data.client.risk.atr) ||
      !CFL_VALUES.includes(data.client.risk.cfl)
    ) {
      issues.push("Client risk profile must include ATR and CfL selections.");
    }
    const horizonYears = normaliseNumber(data.client.risk?.horizon_years);
    if (!Number.isInteger(horizonYears) || horizonYears < 1) {
      issues.push("Investment horizon must be a positive integer.");
    }
  }

  // Preferences and allocations
  const preferences = data.preferences ?? {};
  const pathways = Array.isArray(preferences.pathways)
    ? preferences.pathways
    : [];

  if (pathways.length === 0) {
    issues.push("Select at least one Preference Pathway and allocation.");
  }

  const allocationTotal = pathways.reduce((sum, pathway) => {
    const allocation = normaliseNumber(pathway.allocation_pct);
    return sum + (Number.isFinite(allocation) ? allocation : 0);
  }, 0);

  if (Math.round(allocationTotal) !== 100) {
    issues.push("Pathway allocations must add up to 100%.");
  }

  const sdgSensitivePathways = new Set([
    "Sustainability: Focus",
    "Sustainability: Impact",
    "Sustainability: Mixed Goals"
  ]);

  pathways.forEach((pathway, index) => {
    if (!PATHWAY_NAMES.includes(pathway.name)) {
      issues.push(`Pathway at position ${index + 1} has an invalid name.`);
    }
    const allocation = normaliseNumber(pathway.allocation_pct);
    if (!Number.isFinite(allocation) || allocation < 0 || allocation > 100) {
      issues.push(`Allocation for ${pathway.name ?? "pathway"} must be between 0 and 100.`);
    }

    if (sdgSensitivePathways.has(pathway.name) && pathway.uses_sdgs) {
      const hasThemes = Array.isArray(pathway.themes) && pathway.themes.length > 0;
      const hasImpactGoals =
        Array.isArray(pathway.impact_goals) && pathway.impact_goals.length > 0;
      if (!hasThemes && !hasImpactGoals) {
        issues.push(`Provide SDG themes or impact goals for ${pathway.name}.`);
      }
    }
  });

  if (preferences.ethical?.enabled) {
    const exclusions = Array.isArray(preferences.ethical.exclusions)
      ? preferences.ethical.exclusions.filter(isNonEmptyString)
      : [];
    if (exclusions.length === 0) {
      issues.push("Ethical screens must include at least one exclusion when enabled.");
    }
  }

  if (
    preferences.stewardship &&
    !STEWARDSHIP_OPTIONS.includes(preferences.stewardship.discretion)
  ) {
    issues.push("Stewardship discretion must be set to fund_manager or client_questionnaire.");
  }

  if (data.fees?.bespoke && !isNonEmptyString(data.fees.explanation)) {
    issues.push("Provide a fee explanation whenever bespoke fees are flagged.");
  }

  if (!data.report || !isNonEmptyString(data.report.version)) {
    issues.push("Report metadata must specify a version before generation.");
  }

  return {
    valid: issues.length === 0,
    issues
  };
};
