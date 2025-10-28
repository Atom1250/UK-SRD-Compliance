import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const conversation = await import("../server/state/conversationEngine.js");

const createEvent = (stage, content) => ({
  id: "event",
  sessionId: stage,
  author: "client",
  type: "data_update",
  content
});

test("explanation segment shows regulatory information and advances", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  assert.strictEqual(session.stage, "SEGMENT_A_EXPLANATION");
  
  const result = await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  assert.strictEqual(session.stage, "SEGMENT_B_ONBOARDING");
  assert.ok(session.data.audit.explanation_shown, "Should mark explanation as shown");
  assert.ok(session.data.timestamps.explanation_shown_at, "Should record timestamp");
  assert.ok(Array.isArray(result.messages), "Should return guidance messages");
});

test("onboarding segment validates client type selection", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  const result = await conversation.handleClientTurn(session, "individual");
  
  assert.strictEqual(session.data.client_profile.client_type, "individual");
  assert.strictEqual(session.context.onboardingStep, 1);
  assert.ok(result.messages.some(msg => /objectives/i.test(msg)), "Should ask about objectives");
});

test("onboarding segment handles invalid client type", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  
  const result = await conversation.handleClientTurn(session, "invalid_type");
  
  assert.strictEqual(session.data.client_profile.client_type, null);
  assert.strictEqual(session.context.onboardingStep, 0);
  assert.ok(result.messages.some(msg => /individual, joint, trust, or company/i.test(msg)), "Should re-prompt for valid type");
});

test("education segment tracks educational requests", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_D_EDUCATION";
  session.context.education = { acknowledged: false };
  
  const result = await conversation.handleClientTurn(session, "What is greenwashing?");
  
  assert.ok(session.data.educational_requests.some(req => /greenwashing/i.test(req)), "Should log educational request");
  assert.ok(result.messages.some(msg => /greenwashing/i.test(msg)), "Should provide educational response");
});

test("options segment validates impact goals when Impact label selected", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_E_OPTIONS";
  session.context.options = { preferenceLevel: "detailed", step: 0 };
  
  const result = await conversation.handleEvent(session, createEvent(session.stage, {
    preferences: {
      preference_level: "detailed",
      labels_interest: ["Sustainability: Impact"],
      impact_goals: [] // Empty impact goals
    }
  }));
  
  assert.strictEqual(session.stage, "SEGMENT_E_OPTIONS"); // Should not advance
  assert.ok(result.messages.some(msg => /impact goals/i.test(msg)), "Should request impact goals");
});

test("confirmation segment validates summary before advancing", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_F_CONFIRMATION";
  session.data.client_profile = {
    client_type: "individual",
    objectives: "growth",
    risk_tolerance: 5
  };
  session.data.sustainability_preferences = {
    preference_level: "high_level",
    labels_interest: ["Sustainability: Focus"]
  };
  
  const result = await conversation.handleClientTurn(session, "Yes, that's correct");
  
  assert.strictEqual(session.stage, "SEGMENT_G_REPORT");
  assert.ok(session.data.summary_confirmation.client_summary_confirmed, "Should mark summary as confirmed");
  assert.ok(session.data.timestamps.summary_confirmed_at, "Should record confirmation timestamp");
});

test("report segment generates PDF and advances to delivery", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_G_REPORT";
  
  // Set up complete session data
  session.data.client_profile = {
    client_type: "individual",
    objectives: "growth",
    horizon_years: 8,
    risk_tolerance: 5,
    capacity_for_loss: "medium",
    liquidity_needs: "Low",
    knowledge_experience: { summary: "Experienced" },
    financial_situation: { provided: false }
  };
  session.data.sustainability_preferences = {
    preference_level: "high_level",
    labels_interest: ["Sustainability: Focus"]
  };
  session.data.consent = {
    data_processing: { granted: true, timestamp: new Date().toISOString() }
  };
  session.data.advice_outcome = {
    recommendation: "ESG Portfolio",
    rationale: "Suitable for client"
  };
  session.data.summary_confirmation = { client_summary_confirmed: true };
  session.data.audit = { explanation_shown: true };
  session.data.timestamps = {
    explanation_shown_at: new Date().toISOString(),
    consent_recorded_at: new Date().toISOString(),
    education_completed_at: new Date().toISOString()
  };
  
  const result = await conversation.handleEvent(session, createEvent(session.stage, { generate: true }));
  
  assert.strictEqual(session.stage, "SEGMENT_H_DELIVERY");
  assert.ok(session.data.report_artifacts, "Should generate report artifacts");
  assert.ok(session.data.report_artifacts.hash, "Should include report hash");
  assert.ok(result.messages.some(msg => /report has been generated/i.test(msg)), "Should confirm report generation");
});

test("delivery segment provides download links and completion", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_H_DELIVERY";
  session.data.report_artifacts = {
    hash: "test-hash-123",
    downloadUrl: "/download/test-session"
  };
  
  const result = await conversation.handleClientTurn(session, "Thank you");
  
  assert.ok(result.messages.some(msg => /download/i.test(msg)), "Should provide download information");
  assert.ok(result.messages.some(msg => /adviser will be in touch/i.test(msg)), "Should mention adviser follow-up");
});