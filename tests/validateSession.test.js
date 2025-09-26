import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const { applyDataPatch } = sessionStore;
const { validateSessionData } = await import("../server/state/validateSession.js");

const baseProfile = {
  client_type: "individual",
  objectives: "growth",
  horizon_years: 5,
  risk_tolerance: 4,
  capacity_for_loss: "medium",
  liquidity_needs: "No withdrawals planned",
  knowledge_experience: {
    summary: "Invested monthly in index funds for 3 years",
    instruments: ["Funds"],
    frequency: "monthly",
    duration: "3 years"
  },
  financial_situation: {
    provided: false,
    income: null,
    assets: null,
    liabilities: null,
    notes: ""
  }
};

const baseConsent = {
  data_processing: { granted: true, timestamp: new Date().toISOString() },
  e_delivery: { granted: true },
  future_contact: { granted: false, purpose: "" }
};

const basePrefs = {
  preference_level: "high_level",
  labels_interest: ["Sustainability: Focus"],
  themes: ["Climate"],
  exclusions: [],
  impact_goals: [],
  engagement_importance: "Moderate",
  reporting_frequency_pref: "annual",
  tradeoff_tolerance: "Balanced",
  educ_pack_sent: true
};

test("validation flags missing reporting frequency when impact label selected", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();

  applyDataPatch(session, {
    audit: { explanation_shown: true },
    timestamps: { explanation_shown_at: new Date().toISOString() },
    client_profile: baseProfile,
    consent: baseConsent,
    sustainability_preferences: {
      ...basePrefs,
      preference_level: "detailed",
      labels_interest: ["Sustainability: Impact"],
      impact_goals: ["Affordable clean energy"],
      reporting_frequency_pref: "none"
    },
    disclosures: { agr_disclaimer_presented: true },
    summary_confirmation: { client_summary_confirmed: true }
  });

  const result = validateSessionData(session);
  assert.strictEqual(result.valid, false);
  assert.ok(
    result.issues.some((issue) => /reporting cadence/i.test(issue)),
    "Expected reporting cadence validation error"
  );
});

test("validation passes when mandatory suitability fields are complete", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();

  applyDataPatch(session, {
    audit: { explanation_shown: true },
    timestamps: {
      explanation_shown_at: new Date().toISOString(),
      consent_recorded_at: new Date().toISOString(),
      education_completed_at: new Date().toISOString()
    },
    client_profile: baseProfile,
    consent: baseConsent,
    sustainability_preferences: {
      ...basePrefs,
      preference_level: "detailed",
      labels_interest: ["Sustainability: Focus"],
      themes: ["Climate"],
      exclusions: [{ sector: "Fossil fuels", threshold: 5 }],
      impact_goals: ["Lower emissions"],
      engagement_importance: "High",
      reporting_frequency_pref: "annual",
      tradeoff_tolerance: "Accept minor trade-offs"
    },
    disclosures: { agr_disclaimer_presented: true },
    summary_confirmation: { client_summary_confirmed: true },
    prod_governance: { manufacturer_info_complete: true }
  });

  const result = validateSessionData(session);
  assert.strictEqual(result.valid, true, result.issues.join("; "));
});
