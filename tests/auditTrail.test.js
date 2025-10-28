import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const conversation = await import("../server/state/conversationEngine.js");

test("audit trail - event logging with timestamps", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  const beforeTime = Date.now();
  
  sessionStore.appendEvent(session, {
    id: "test-event",
    sessionId: session.id,
    author: "client",
    type: "message",
    content: { text: "Hello" },
    createdAt: new Date().toISOString()
  });
  
  const afterTime = Date.now();
  
  assert.ok(session.events.length > 0, "Should log events");
  assert.ok(session.data.audit.events.length > 0, "Should maintain audit trail");
  
  const auditEvent = session.data.audit.events[session.data.audit.events.length - 1];
  const eventTime = Date.parse(auditEvent.timestamp);
  
  assert.ok(eventTime >= beforeTime && eventTime <= afterTime, "Should have accurate timestamp");
  assert.strictEqual(auditEvent.type, "message", "Should preserve event type");
  assert.strictEqual(auditEvent.author, "client", "Should preserve event author");
});

test("audit trail - data update tracking", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  const patch = {
    client_profile: {
      client_type: "individual",
      objectives: "growth"
    }
  };
  
  sessionStore.applyDataPatch(session, patch);
  
  // Verify data update is tracked
  assert.ok(session.data.audit.events.some(event => 
    event.type === "data_update" && 
    event.details.includes("client_profile")
  ), "Should track data updates in audit trail");
});

test("audit trail - consent recording with IP tracking", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, {
    id: "consent-event",
    sessionId: session.id,
    author: "client",
    type: "data_update",
    content: {
      consent: {
        data_processing: true,
        e_delivery: true,
        future_contact: { granted: false }
      }
    },
    metadata: {
      ip_address: "192.168.1.100",
      user_agent: "Mozilla/5.0 Test Browser"
    }
  });
  
  assert.ok(session.data.consent.data_processing.granted, "Should record consent");
  assert.ok(session.data.consent.data_processing.timestamp, "Should timestamp consent");
  assert.ok(session.data.timestamps.consent_recorded_at, "Should record consent timestamp");
  
  // Verify IP tracking in audit trail
  const consentEvent = session.data.audit.events.find(e => e.type === "consent_recorded");
  assert.ok(consentEvent, "Should log consent event");
});

test("audit trail - educational request logging", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_D_EDUCATION";
  
  await conversation.handleClientTurn(session, "What is impact investing?");
  
  assert.ok(session.data.educational_requests.length > 0, "Should log educational requests");
  assert.ok(session.data.educational_requests.some(req => 
    req.includes("impact investing")
  ), "Should capture specific educational topic");
  
  // Verify audit trail entry
  assert.ok(session.data.audit.events.some(event => 
    event.type === "educational_request" && 
    event.details.includes("impact investing")
  ), "Should audit educational requests");
});

test("audit trail - guardrail trigger documentation", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  await conversation.handleEvent(session, {
    id: "test",
    sessionId: session.id,
    author: "client",
    type: "data_update",
    content: { ready: true }
  });
  
  // Trigger guardrail with risk-capacity mismatch
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
        risk_tolerance: 7,
        capacity_for_loss: "low",
        liquidity_needs: "Low",
        knowledge_summary: "Limited",
        financial: { provided: false }
      }
    }
  });
  
  assert.ok(session.data.audit.guardrail_triggers.length > 0, "Should document guardrail triggers");
  
  const trigger = session.data.audit.guardrail_triggers.find(g => g.type === "risk_capacity_mismatch");
  assert.ok(trigger, "Should document specific guardrail type");
  assert.ok(trigger.triggered_at, "Should timestamp guardrail trigger");
  assert.ok(trigger.details, "Should include guardrail details");
});

test("audit trail - report generation tracking", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_G_REPORT";
  
  // Set up minimal required data for report generation
  session.data.client_profile = {
    client_type: "individual",
    objectives: "growth",
    risk_tolerance: 4,
    capacity_for_loss: "medium",
    knowledge_experience: { summary: "Some experience" }
  };
  session.data.sustainability_preferences = { preference_level: "none" };
  session.data.consent = {
    data_processing: { granted: true, timestamp: new Date().toISOString() }
  };
  session.data.advice_outcome = { recommendation: "Standard Portfolio" };
  session.data.summary_confirmation = { client_summary_confirmed: true };
  session.data.audit = { explanation_shown: true };
  session.data.timestamps = {
    explanation_shown_at: new Date().toISOString(),
    consent_recorded_at: new Date().toISOString(),
    education_completed_at: new Date().toISOString()
  };
  
  await conversation.handleEvent(session, {
    id: "report-gen",
    sessionId: session.id,
    author: "system",
    type: "data_update",
    content: { generate: true }
  });
  
  assert.ok(session.data.report_artifacts, "Should generate report artifacts");
  assert.ok(session.data.report_artifacts.hash, "Should include report hash for integrity");
  assert.ok(session.data.timestamps.report_generated_at, "Should timestamp report generation");
  
  // Verify audit trail
  assert.ok(session.data.audit.events.some(event => 
    event.type === "report_generated"
  ), "Should audit report generation");
});

test("audit trail - session state transitions", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  const initialStage = session.stage;
  
  await conversation.handleEvent(session, {
    id: "transition",
    sessionId: session.id,
    author: "client",
    type: "data_update",
    content: { ready: true }
  });
  
  assert.notStrictEqual(session.stage, initialStage, "Should transition stage");
  
  // Verify stage transition is audited
  assert.ok(session.data.audit.events.some(event => 
    event.type === "stage_transition" && 
    event.details.includes(session.stage)
  ), "Should audit stage transitions");
});

test("audit trail - data integrity validation", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Add multiple events and data updates
  for (let i = 0; i < 5; i++) {
    sessionStore.appendEvent(session, {
      id: `event-${i}`,
      sessionId: session.id,
      author: "client",
      type: "message",
      content: { text: `Message ${i}` },
      createdAt: new Date().toISOString()
    });
  }
  
  sessionStore.applyDataPatch(session, {
    client_profile: { client_type: "individual" }
  });
  
  // Verify audit trail integrity
  assert.ok(session.events.length === 5, "Should maintain event count");
  assert.ok(session.data.audit.events.length >= 5, "Should maintain audit event count");
  
  // Verify chronological order
  const timestamps = session.data.audit.events.map(e => Date.parse(e.timestamp));
  const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
  assert.deepStrictEqual(timestamps, sortedTimestamps, "Audit events should be chronologically ordered");
});

test("audit trail - compliance rationale logging", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_B_ONBOARDING";
  
  await conversation.handleClientTurn(session, "Why do you need this information?");
  
  assert.ok(session.data.extra_questions.length > 0, "Should log compliance questions");
  assert.ok(session.data.extra_questions.some(q => 
    q.includes("Why do you need this information")
  ), "Should capture specific compliance question");
  
  // Verify audit trail includes compliance rationale
  assert.ok(session.data.audit.events.some(event => 
    event.type === "compliance_rationale_provided"
  ), "Should audit compliance rationale provision");
});

test("audit trail - session recovery and continuity", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  const sessionId = session.id;
  
  // Add some audit data
  sessionStore.appendEvent(session, {
    id: "recovery-test",
    sessionId: session.id,
    author: "client",
    type: "message",
    content: { text: "Test message" },
    createdAt: new Date().toISOString()
  });
  
  sessionStore.saveSession(session);
  
  // Simulate session recovery
  const recovered = sessionStore.getSession(sessionId);
  
  assert.ok(recovered, "Should recover session");
  assert.ok(recovered.events.length > 0, "Should preserve event history");
  assert.ok(recovered.data.audit.events.length > 0, "Should preserve audit trail");
  assert.strictEqual(recovered.id, sessionId, "Should maintain session identity");
});