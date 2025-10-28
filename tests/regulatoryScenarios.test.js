import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const conversation = await import("../server/state/conversationEngine.js");
const { validateSessionData } = await import("../server/state/validateSession.js");

const createEvent = (stage, content) => ({
  id: "event",
  sessionId: stage,
  author: "client",
  type: "data_update",
  content
});

test("regulatory scenario - Consumer Duty comprehension checks", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Progress to education stage
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 8,
      risk_tolerance: 5,
      capacity_for_loss: "medium",
      liquidity_needs: "Low",
      knowledge_summary: "Some experience",
      financial: { provided: false }
    }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    consent: {
      data_processing: true,
      e_delivery: true,
      future_contact: { granted: false }
    }
  }));
  
  assert.strictEqual(session.stage, "SEGMENT_D_EDUCATION");
  
  // Test comprehension requirement
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
  
  assert.ok(session.data.timestamps.education_completed_at, "Should record education completion");
  assert.strictEqual(session.stage, "SEGMENT_E_OPTIONS", "Should advance after education acknowledgment");
});

test("regulatory scenario - COBS 9A suitability assessment", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  // Complete suitability assessment with all required fields
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual", // Required
      objectives: "growth", // Required
      horizon_years: 10, // Required
      risk_tolerance: 5, // Required
      capacity_for_loss: "medium", // Required
      liquidity_needs: "No immediate needs", // Required
      knowledge_summary: "Experienced with equity investments", // Required
      financial: {
        provided: true,
        income: 75000,
        assets: 300000,
        liabilities: 50000,
        notes: "Stable position"
      }
    }
  }));
  
  // Verify all COBS 9A requirements are captured
  const profile = session.data.client_profile;
  assert.ok(profile.client_type, "Should capture client type");
  assert.ok(profile.objectives, "Should capture investment objectives");
  assert.ok(profile.horizon_years, "Should capture time horizon");
  assert.ok(profile.risk_tolerance, "Should capture risk tolerance");
  assert.ok(profile.capacity_for_loss, "Should capture capacity for loss");
  assert.ok(profile.liquidity_needs, "Should capture liquidity needs");
  assert.ok(profile.knowledge_experience, "Should capture knowledge and experience");
  assert.ok(profile.financial_situation, "Should capture financial situation");
});

test("regulatory scenario - SDR Impact label requirements", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Progress to options stage
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "impact",
      horizon_years: 10,
      risk_tolerance: 5,
      capacity_for_loss: "medium",
      liquidity_needs: "Low",
      knowledge_summary: "Experienced",
      financial: { provided: false }
    }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    consent: { data_processing: true, e_delivery: true, future_contact: { granted: false } }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
  
  // Test Impact label without required fields (should fail validation)
  await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "detailed",
      labels_interest: ["Sustainability: Impact"],
      themes: ["Climate"],
      exclusions: [],
      impact_goals: [], // Missing required impact goals
      engagement_importance: "High",
      reporting_frequency_pref: "none", // Missing required reporting frequency
      tradeoff_tolerance: "Moderate"
    }
  }));
  
  // Should not advance due to missing Impact requirements
  assert.strictEqual(session.stage, "SEGMENT_E_OPTIONS");
  
  // Now provide required Impact fields
  await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "detailed",
      labels_interest: ["Sustainability: Impact"],
      themes: ["Climate"],
      exclusions: [],
      impact_goals: ["Carbon reduction", "Clean energy transition"], // Required
      engagement_importance: "High",
      reporting_frequency_pref: "quarterly", // Required
      tradeoff_tolerance: "Moderate"
    }
  }));
  
  assert.strictEqual(session.stage, "SEGMENT_F_CONFIRMATION", "Should advance with complete Impact requirements");
});

test("regulatory scenario - SDR Focus label requirements", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Progress to options and select Focus label
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 8,
      risk_tolerance: 4,
      capacity_for_loss: "medium",
      liquidity_needs: "Low",
      knowledge_summary: "Some experience",
      financial: { provided: false }
    }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    consent: { data_processing: true, e_delivery: true, future_contact: { granted: false } }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
  
  await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "detailed",
      labels_interest: ["Sustainability: Focus"],
      themes: ["Climate", "Social equity"], // Required for Focus
      exclusions: [{ sector: "Tobacco", threshold: 0 }],
      engagement_importance: "High",
      reporting_frequency_pref: "annual",
      tradeoff_tolerance: "Moderate"
    }
  }));
  
  assert.strictEqual(session.stage, "SEGMENT_F_CONFIRMATION", "Should accept Focus label with themes");
  assert.ok(session.data.sustainability_preferences.themes.length > 0, "Should capture sustainability themes");
});

test("regulatory scenario - data processing consent requirements", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 5,
      risk_tolerance: 4,
      capacity_for_loss: "medium",
      liquidity_needs: "Low",
      knowledge_summary: "Some experience",
      financial: { provided: false }
    }
  }));
  
  // Test consent recording with timestamps
  const beforeConsent = Date.now();
  await conversation.handleEvent(session, createEvent(session.stage, {
    consent: {
      data_processing: true, // Required for GDPR compliance
      e_delivery: false,
      future_contact: { granted: true, purpose: "Annual reviews" }
    }
  }));
  const afterConsent = Date.now();
  
  assert.ok(session.data.consent.data_processing.granted, "Should record data processing consent");
  assert.ok(session.data.consent.data_processing.timestamp, "Should timestamp consent");
  
  const consentTime = Date.parse(session.data.consent.data_processing.timestamp);
  assert.ok(consentTime >= beforeConsent && consentTime <= afterConsent, "Should have accurate consent timestamp");
});

test("regulatory scenario - anti-greenwashing compliance", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Progress through conversation
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 8,
      risk_tolerance: 5,
      capacity_for_loss: "medium",
      liquidity_needs: "Low",
      knowledge_summary: "Experienced",
      financial: { provided: false }
    }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    consent: { data_processing: true, e_delivery: true, future_contact: { granted: false } }
  }));
  
  // Education stage should provide clear, evidence-based information
  assert.strictEqual(session.stage, "SEGMENT_D_EDUCATION");
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
  
  // Verify education completion is recorded (anti-greenwashing requirement)
  assert.ok(session.data.timestamps.education_completed_at, "Should record education completion for anti-greenwashing compliance");
  
  // Sustainability preferences should be clearly defined
  await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "detailed",
      labels_interest: ["Sustainability: Focus"],
      themes: ["Climate"], // Clear, specific themes
      exclusions: [{ sector: "Fossil fuels", threshold: 5 }], // Specific exclusions with thresholds
      engagement_importance: "High",
      reporting_frequency_pref: "quarterly",
      tradeoff_tolerance: "Moderate"
    }
  }));
  
  assert.ok(session.data.sustainability_preferences.themes.length > 0, "Should capture specific sustainability themes");
  assert.ok(session.data.sustainability_preferences.exclusions.length > 0, "Should capture specific exclusions");
});

test("regulatory scenario - vulnerable client protection", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  // Scenario: Client with limited knowledge and high risk tolerance
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 3, // Short horizon
      risk_tolerance: 7, // Very high risk
      capacity_for_loss: "low", // Low capacity
      liquidity_needs: "May need access within 2 years",
      knowledge_summary: "No previous investment experience", // Limited knowledge
      financial: { provided: false }
    }
  }));
  
  // Should trigger multiple guardrails for vulnerable client protection
  assert.ok(session.data.audit.guardrail_triggers.length > 0, "Should trigger guardrails for vulnerable client");
  assert.ok(
    session.data.audit.guardrail_triggers.some(g => g.type === "risk_capacity_mismatch"),
    "Should flag risk-capacity mismatch"
  );
  assert.ok(
    session.data.audit.guardrail_triggers.some(g => g.type === "risk_horizon_warning"),
    "Should flag risk-horizon mismatch"
  );
});

test("regulatory scenario - complete session validation before report", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Complete full conversation flow
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 10,
      risk_tolerance: 5,
      capacity_for_loss: "medium",
      liquidity_needs: "Low",
      knowledge_summary: "Experienced",
      financial: { provided: false }
    }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    consent: { data_processing: true, e_delivery: true, future_contact: { granted: false } }
  }));
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
  await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "high_level",
      labels_interest: ["Sustainability: Focus"],
      themes: ["Climate"],
      exclusions: [],
      engagement_importance: "Moderate",
      reporting_frequency_pref: "annual",
      tradeoff_tolerance: "Balanced"
    }
  }));
  await conversation.handleClientTurn(session, "Yes, that's correct");
  
  // Before report generation, validate complete regulatory compliance
  const validation = validateSessionData(session);
  assert.strictEqual(validation.valid, true, `Session should be compliant before report: ${validation.issues.join('; ')}`);
  
  // Generate report
  await conversation.handleEvent(session, createEvent(session.stage, { generate: true }));
  
  assert.strictEqual(session.stage, "SEGMENT_H_DELIVERY", "Should complete to delivery stage");
  assert.ok(session.data.report_artifacts, "Should generate compliant report");
});