import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const conversation = await import("../server/state/conversationEngine.js");
const openAi = await import("../server/integrations/openAiClient.js");

const createEvent = (stage, content) => ({
  id: "event",
  sessionId: stage,
  author: "client",
  type: "data_update",
  content
});

// Mock OpenAI responder for integration tests
const mockOpenAiResponder = async (messages) => ({
  reply: "This is a mock compliance response for testing purposes.",
  compliance: {
    educational_requests: ["Mock educational request"],
    extra_questions: [],
    notes: ["Integration test response"]
  }
});

test("complete conversation flow from explanation to delivery", async () => {
  sessionStore.resetSessions();
  openAi.setComplianceResponder(mockOpenAiResponder);
  
  try {
    const session = sessionStore.createSession();
    
    // Stage A: Explanation
    assert.strictEqual(session.stage, "SEGMENT_A_EXPLANATION");
    await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
    assert.strictEqual(session.stage, "SEGMENT_B_ONBOARDING");
    
    // Stage B: Onboarding - Complete suitability assessment
    await conversation.handleEvent(session, createEvent(session.stage, {
      answers: {
        client_type: "individual",
        objectives: "growth",
        horizon_years: 10,
        risk_tolerance: 5,
        capacity_for_loss: "medium",
        liquidity_needs: "No immediate needs",
        knowledge_summary: "Experienced with equity investments for 5+ years",
        financial: {
          provided: true,
          income: 80000,
          assets: 400000,
          liabilities: 60000,
          notes: "Stable financial position"
        }
      }
    }));
    assert.strictEqual(session.stage, "SEGMENT_C_CONSENT");
    
    // Stage C: Consent
    await conversation.handleEvent(session, createEvent(session.stage, {
      consent: {
        data_processing: true,
        e_delivery: true,
        future_contact: { granted: true, purpose: "Annual reviews" }
      }
    }));
    assert.strictEqual(session.stage, "SEGMENT_D_EDUCATION");
    
    // Stage D: Education
    await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
    assert.strictEqual(session.stage, "SEGMENT_E_OPTIONS");
    
    // Stage E: Options - Sustainability preferences
    await conversation.handleEvent(session, createEvent(session.stage, {
      preferences: {
        preference_level: "detailed",
        labels_interest: ["Sustainability: Focus"],
        themes: ["Climate", "Social equity"],
        exclusions: [{ sector: "Tobacco", threshold: 0 }],
        impact_goals: ["Carbon reduction"],
        engagement_importance: "High",
        reporting_frequency_pref: "quarterly",
        tradeoff_tolerance: "Moderate"
      }
    }));
    assert.strictEqual(session.stage, "SEGMENT_F_CONFIRMATION");
    
    // Stage F: Confirmation
    await conversation.handleClientTurn(session, "Yes, that summary is correct");
    assert.strictEqual(session.stage, "SEGMENT_G_REPORT");
    
    // Stage G: Report Generation
    await conversation.handleEvent(session, createEvent(session.stage, { generate: true }));
    assert.strictEqual(session.stage, "SEGMENT_H_DELIVERY");
    
    // Verify complete session data
    assert.ok(session.data.client_profile.client_type === "individual");
    assert.ok(session.data.sustainability_preferences.preference_level === "detailed");
    assert.ok(session.data.consent.data_processing.granted === true);
    assert.ok(session.data.summary_confirmation.client_summary_confirmed === true);
    assert.ok(session.data.report_artifacts, "Should have generated report artifacts");
    assert.ok(session.data.timestamps.explanation_shown_at, "Should have explanation timestamp");
    assert.ok(session.data.timestamps.consent_recorded_at, "Should have consent timestamp");
    assert.ok(session.data.timestamps.education_completed_at, "Should have education timestamp");
    
  } finally {
    openAi.setComplianceResponder(undefined);
  }
});

test("conversation flow with high-level sustainability preferences", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Complete flow with high-level preferences
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "joint",
      objectives: "income",
      horizon_years: 5,
      risk_tolerance: 3,
      capacity_for_loss: "low",
      liquidity_needs: "Quarterly withdrawals needed",
      knowledge_summary: "Some experience with bond funds",
      financial: { provided: false }
    }
  }));
  
  await conversation.handleEvent(session, createEvent(session.stage, {
    consent: {
      data_processing: true,
      e_delivery: false,
      future_contact: { granted: false }
    }
  }));
  
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
  
  await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "high_level",
      labels_interest: ["Sustainability: Improvers"],
      themes: ["Governance"],
      exclusions: [],
      engagement_importance: "Moderate",
      reporting_frequency_pref: "annual",
      tradeoff_tolerance: "Balanced"
    }
  }));
  
  await conversation.handleClientTurn(session, "Yes, proceed with the report");
  await conversation.handleEvent(session, createEvent(session.stage, { generate: true }));
  
  assert.strictEqual(session.stage, "SEGMENT_H_DELIVERY");
  assert.strictEqual(session.data.client_profile.client_type, "joint");
  assert.strictEqual(session.data.sustainability_preferences.preference_level, "high_level");
  assert.ok(session.data.report_artifacts, "Should generate report for high-level preferences");
});

test("conversation flow with no sustainability preferences", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Complete flow with no sustainability preferences
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "company",
      objectives: "preservation",
      horizon_years: 3,
      risk_tolerance: 2,
      capacity_for_loss: "low",
      liquidity_needs: "High liquidity required",
      knowledge_summary: "Limited investment experience",
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
  
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));
  
  await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "none"
    }
  }));
  
  await conversation.handleClientTurn(session, "Confirmed");
  await conversation.handleEvent(session, createEvent(session.stage, { generate: true }));
  
  assert.strictEqual(session.stage, "SEGMENT_H_DELIVERY");
  assert.strictEqual(session.data.sustainability_preferences.preference_level, "none");
  assert.ok(session.data.report_artifacts, "Should generate report even with no sustainability preferences");
});

test("conversation flow handles educational detours and resumes", async () => {
  sessionStore.resetSessions();
  openAi.setComplianceResponder(mockOpenAiResponder);
  
  try {
    const session = sessionStore.createSession();
    
    await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
    
    // Educational detour during onboarding
    await conversation.handleClientTurn(session, "What does ESG mean?");
    assert.strictEqual(session.stage, "SEGMENT_B_ONBOARDING"); // Should stay in same stage
    assert.ok(session.data.educational_requests.length > 0, "Should log educational request");
    
    // Resume normal flow
    await conversation.handleClientTurn(session, "individual");
    await conversation.handleClientTurn(session, "growth");
    
    // Complete remaining flow
    await conversation.handleEvent(session, createEvent(session.stage, {
      answers: {
        client_type: "individual",
        objectives: "growth",
        horizon_years: 8,
        risk_tolerance: 4,
        capacity_for_loss: "medium",
        liquidity_needs: "Low",
        knowledge_summary: "Moderate experience",
        financial: { provided: false }
      }
    }));
    
    assert.strictEqual(session.stage, "SEGMENT_C_CONSENT");
    assert.ok(session.data.educational_requests.length > 0, "Should preserve educational requests");
    
  } finally {
    openAi.setComplianceResponder(undefined);
  }
});

test("conversation flow with risk override scenario", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  // Create risk-capacity mismatch scenario
  await conversation.handleEvent(session, createEvent(session.stage, {
    answers: {
      client_type: "individual",
      objectives: "growth",
      horizon_years: 2, // Short horizon
      risk_tolerance: 6, // High risk
      capacity_for_loss: "low", // Low capacity
      liquidity_needs: "May need access within 2 years",
      knowledge_summary: "Limited experience with high-risk investments",
      financial: { provided: false }
    },
    confirm_override: true // Client confirms override
  }));
  
  assert.strictEqual(session.stage, "SEGMENT_C_CONSENT");
  assert.ok(session.data.audit.guardrail_triggers.some(g => g.type === "risk_capacity_override"));
  assert.ok(session.data.audit.guardrail_triggers.some(g => g.confirmed_at));
});

test("session persistence across conversation stages", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  const originalId = session.id;
  
  // Progress through multiple stages
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleClientTurn(session, "individual");
  
  // Verify session is persisted
  const retrievedSession = sessionStore.getSession(originalId);
  assert.ok(retrievedSession, "Session should be persisted");
  assert.strictEqual(retrievedSession.id, originalId, "Session ID should be preserved");
  assert.strictEqual(retrievedSession.stage, "SEGMENT_B_ONBOARDING", "Session stage should be preserved");
  assert.strictEqual(retrievedSession.data.client_profile.client_type, "individual", "Session data should be preserved");
});