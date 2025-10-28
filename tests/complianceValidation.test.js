import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const { validateSessionData } = await import("../server/state/validateSession.js");
const conversation = await import("../server/state/conversationEngine.js");

const createCompliantSession = () => {
  const session = sessionStore.createSession();
  
  // Apply complete COBS 9A compliant data
  sessionStore.applyDataPatch(session, {
    audit: { explanation_shown: true },
    timestamps: {
      explanation_shown_at: new Date().toISOString(),
      consent_recorded_at: new Date().toISOString(),
      education_completed_at: new Date().toISOString(),
      summary_confirmed_at: new Date().toISOString()
    },
    client_profile: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 8,
      risk_tolerance: 5,
      capacity_for_loss: "medium",
      liquidity_needs: "Low liquidity needs",
      knowledge_experience: {
        summary: "Experienced with equity investments for 5+ years",
        instruments: ["Funds", "Stocks"],
        frequency: "monthly",
        duration: "5+ years"
      },
      financial_situation: {
        provided: true,
        income: 75000,
        assets: 300000,
        liabilities: 50000,
        notes: "Stable financial position"
      }
    },
    consent: {
      data_processing: {
        granted: true,
        timestamp: new Date().toISOString()
      },
      e_delivery: {
        granted: true,
        timestamp: new Date().toISOString()
      },
      future_contact: {
        granted: true,
        purpose: "Annual reviews"
      }
    },
    sustainability_preferences: {
      preference_level: "detailed",
      labels_interest: ["Sustainability: Focus"],
      themes: ["Climate"],
      exclusions: [{ sector: "Tobacco", threshold: 0 }],
      impact_goals: ["Carbon reduction"],
      engagement_importance: "High",
      reporting_frequency_pref: "quarterly",
      tradeoff_tolerance: "Moderate",
      educ_pack_sent: true
    },
    disclosures: {
      agr_disclaimer_presented: true
    },
    summary_confirmation: {
      client_summary_confirmed: true
    },
    prod_governance: {
      manufacturer_info_complete: true
    },
    advice_outcome: {
      recommendation: "ESG Growth Portfolio",
      rationale: "Suitable for client's growth objectives and ESG preferences",
      sust_fit: "Strong alignment with climate themes",
      costs_summary: "0.75% annual management charge"
    }
  });
  
  return session;
};

test("COBS 9A validation - complete compliant session passes", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, true, `Validation failed: ${validation.issues.join('; ')}`);
  assert.strictEqual(validation.issues.length, 0, "Should have no validation issues");
});

test("COBS 9A validation - missing client type fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Remove required client type
  session.data.client_profile.client_type = null;
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /client type/i.test(issue)), "Should flag missing client type");
});

test("COBS 9A validation - missing investment objectives fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Remove required objectives
  session.data.client_profile.objectives = null;
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /objectives/i.test(issue)), "Should flag missing objectives");
});

test("COBS 9A validation - missing risk tolerance fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Remove required risk tolerance
  session.data.client_profile.risk_tolerance = null;
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /risk tolerance/i.test(issue)), "Should flag missing risk tolerance");
});

test("COBS 9A validation - missing capacity for loss fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Remove required capacity for loss
  session.data.client_profile.capacity_for_loss = null;
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /capacity for loss/i.test(issue)), "Should flag missing capacity for loss");
});

test("COBS 9A validation - missing knowledge and experience fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Remove required knowledge and experience
  session.data.client_profile.knowledge_experience = null;
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /knowledge.*experience/i.test(issue)), "Should flag missing knowledge and experience");
});

test("COBS 9A validation - missing data processing consent fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Remove required consent
  session.data.consent.data_processing.granted = false;
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /data processing consent/i.test(issue)), "Should flag missing data processing consent");
});

test("COBS 9A validation - Impact label without goals fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Set Impact label without impact goals
  session.data.sustainability_preferences.labels_interest = ["Sustainability: Impact"];
  session.data.sustainability_preferences.impact_goals = [];
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /impact goals/i.test(issue)), "Should flag missing impact goals for Impact label");
});

test("COBS 9A validation - Impact label without reporting frequency fails", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Set Impact label without reporting frequency
  session.data.sustainability_preferences.labels_interest = ["Sustainability: Impact"];
  session.data.sustainability_preferences.impact_goals = ["Carbon reduction"];
  session.data.sustainability_preferences.reporting_frequency_pref = "none";
  
  const validation = validateSessionData(session);
  
  assert.strictEqual(validation.valid, false);
  assert.ok(validation.issues.some(issue => /reporting cadence/i.test(issue)), "Should flag missing reporting frequency for Impact label");
});

test("guardrail triggers - risk capacity mismatch detection", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, { 
    id: "test", 
    sessionId: session.id, 
    author: "client", 
    type: "data_update", 
    content: { ready: true } 
  });
  
  // Create risk-capacity mismatch
  await conversation.handleEvent(session, {
    id: "test",
    sessionId: session.id,
    author: "client",
    type: "data_update",
    content: {
      answers: {
        client_type: "individual",
        objectives: "growth",
        horizon_years: 8,
        risk_tolerance: 7, // High risk
        capacity_for_loss: "low", // Low capacity - mismatch!
        liquidity_needs: "Low",
        knowledge_summary: "Limited experience",
        financial: { provided: false }
      }
    }
  });
  
  assert.ok(session.data.audit.guardrail_triggers.length > 0, "Should trigger guardrails");
  assert.ok(
    session.data.audit.guardrail_triggers.some(g => g.type === "risk_capacity_mismatch"),
    "Should detect risk-capacity mismatch"
  );
});

test("guardrail triggers - short horizon high risk detection", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, { 
    id: "test", 
    sessionId: session.id, 
    author: "client", 
    type: "data_update", 
    content: { ready: true } 
  });
  
  // Create short horizon + high risk scenario
  await conversation.handleEvent(session, {
    id: "test",
    sessionId: session.id,
    author: "client",
    type: "data_update",
    content: {
      answers: {
        client_type: "individual",
        objectives: "growth",
        horizon_years: 1, // Very short horizon
        risk_tolerance: 6, // High risk
        capacity_for_loss: "medium",
        liquidity_needs: "May need access soon",
        knowledge_summary: "Some experience",
        financial: { provided: false }
      }
    }
  });
  
  assert.ok(
    session.data.audit.guardrail_triggers.some(g => g.type === "risk_horizon_warning"),
    "Should detect short horizon + high risk combination"
  );
});

test("audit trail completeness - all required events logged", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Progress through conversation stages
  await conversation.handleEvent(session, { 
    id: "test", 
    sessionId: session.id, 
    author: "client", 
    type: "data_update", 
    content: { ready: true } 
  });
  
  await conversation.handleClientTurn(session, "individual");
  await conversation.handleClientTurn(session, "What is ESG?"); // Educational request
  
  // Verify audit trail
  assert.ok(session.data.audit.explanation_shown, "Should log explanation shown");
  assert.ok(session.data.timestamps.explanation_shown_at, "Should timestamp explanation");
  assert.ok(session.data.educational_requests.length > 0, "Should log educational requests");
  assert.ok(session.events.length > 0, "Should maintain event history");
  assert.ok(session.data.audit.events.length > 0, "Should maintain audit event log");
});

test("regulatory scenario - Consumer Duty plain language requirement", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Verify plain language explanations are provided
  assert.ok(session.data.audit.explanation_shown, "Should show regulatory explanation");
  assert.ok(session.data.timestamps.explanation_shown_at, "Should timestamp explanation");
  
  // Educational content should be provided in plain language
  assert.ok(session.data.sustainability_preferences.educ_pack_sent, "Should provide educational materials");
});

test("regulatory scenario - SDR label compliance", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Verify SDR label requirements are met
  const prefs = session.data.sustainability_preferences;
  
  if (prefs.labels_interest.includes("Sustainability: Impact")) {
    assert.ok(prefs.impact_goals.length > 0, "Impact label should have impact goals");
    assert.ok(prefs.reporting_frequency_pref !== "none", "Impact label should have reporting frequency");
  }
  
  if (prefs.labels_interest.includes("Sustainability: Focus")) {
    assert.ok(prefs.themes.length > 0, "Focus label should have sustainability themes");
  }
});

test("regulatory scenario - data retention and privacy compliance", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  // Verify consent is properly recorded
  assert.ok(session.data.consent.data_processing.granted, "Should have data processing consent");
  assert.ok(session.data.consent.data_processing.timestamp, "Should timestamp consent");
  
  // Verify audit trail for data processing
  assert.ok(session.data.audit.events.length > 0, "Should maintain audit trail");
  assert.ok(session.data.timestamps.consent_recorded_at, "Should timestamp consent recording");
});

test("regulatory scenario - suitability assessment completeness", () => {
  sessionStore.resetSessions();
  const session = createCompliantSession();
  
  const validation = validateSessionData(session);
  
  // All COBS 9A suitability requirements should be met
  assert.strictEqual(validation.valid, true, "Should meet all suitability requirements");
  
  // Verify all required suitability fields are present
  const profile = session.data.client_profile;
  assert.ok(profile.client_type, "Should have client type");
  assert.ok(profile.objectives, "Should have investment objectives");
  assert.ok(profile.risk_tolerance, "Should have risk tolerance");
  assert.ok(profile.capacity_for_loss, "Should have capacity for loss");
  assert.ok(profile.knowledge_experience, "Should have knowledge and experience");
  assert.ok(profile.liquidity_needs, "Should have liquidity needs");
});