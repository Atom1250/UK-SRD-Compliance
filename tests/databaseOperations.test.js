import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");

test("database operations - session creation and retrieval", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  const sessionId = session.id;
  
  assert.ok(sessionId, "Should create session with ID");
  assert.ok(session.stage, "Should have initial stage");
  assert.ok(session.data, "Should have data object");
  assert.ok(session.context, "Should have context object");
  
  const retrieved = sessionStore.getSession(sessionId);
  assert.ok(retrieved, "Should retrieve created session");
  assert.strictEqual(retrieved.id, sessionId, "Retrieved session should have same ID");
});

test("database operations - session persistence across updates", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  const originalId = session.id;
  
  // Update session data
  session.data.client_profile.client_type = "individual";
  session.stage = "SEGMENT_B_ONBOARDING";
  sessionStore.saveSession(session);
  
  // Retrieve and verify persistence
  const retrieved = sessionStore.getSession(originalId);
  assert.strictEqual(retrieved.data.client_profile.client_type, "individual");
  assert.strictEqual(retrieved.stage, "SEGMENT_B_ONBOARDING");
});

test("database operations - data patch application", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  
  const patch = {
    client_profile: {
      client_type: "joint",
      objectives: "growth"
    },
    sustainability_preferences: {
      preference_level: "detailed",
      labels_interest: ["Focus"]
    }
  };
  
  sessionStore.applyDataPatch(session, patch);
  
  assert.strictEqual(session.data.client_profile.client_type, "joint");
  assert.strictEqual(session.data.client_profile.objectives, "growth");
  assert.strictEqual(session.data.sustainability_preferences.preference_level, "detailed");
  assert.ok(Array.isArray(session.data.sustainability_preferences.labels_interest));
});

test("database operations - event logging and retrieval", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  
  const event = {
    id: "test-event-1",
    sessionId: session.id,
    author: "client",
    type: "message",
    content: { text: "Hello" },
    createdAt: new Date().toISOString()
  };
  
  sessionStore.appendEvent(session, event);
  
  assert.ok(session.events.length > 0, "Should have events in session");
  assert.strictEqual(session.events[session.events.length - 1].content.text, "Hello");
  assert.ok(session.data.audit.events.length > 0, "Should log events in audit trail");
});

test("database operations - session listing and filtering", () => {
  sessionStore.resetSessions();
  
  // Create multiple sessions
  const session1 = sessionStore.createSession();
  session1.data.client_profile.client_type = "individual";
  sessionStore.saveSession(session1);
  
  const session2 = sessionStore.createSession();
  session2.data.client_profile.client_type = "company";
  sessionStore.saveSession(session2);
  
  const allSessions = sessionStore.listSessions();
  assert.ok(allSessions.length >= 2, "Should list all created sessions");
  
  const individualSessions = allSessions.filter(s => s.data.client_profile.client_type === "individual");
  assert.strictEqual(individualSessions.length, 1, "Should filter sessions by client type");
});

test("database operations - session deletion and cleanup", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  const sessionId = session.id;
  
  // Verify session exists
  assert.ok(sessionStore.getSession(sessionId), "Session should exist before deletion");
  
  // Delete session
  sessionStore.deleteSession(sessionId);
  
  // Verify session is deleted
  assert.strictEqual(sessionStore.getSession(sessionId), null, "Session should not exist after deletion");
});

test("database operations - concurrent session access", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  const sessionId = session.id;
  
  // Simulate concurrent updates
  const session1 = sessionStore.getSession(sessionId);
  const session2 = sessionStore.getSession(sessionId);
  
  session1.data.client_profile.client_type = "individual";
  session2.data.client_profile.objectives = "growth";
  
  sessionStore.saveSession(session1);
  sessionStore.saveSession(session2);
  
  const final = sessionStore.getSession(sessionId);
  // Last save should win
  assert.strictEqual(final.data.client_profile.objectives, "growth");
});

test("database operations - large session data handling", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  
  // Add large amount of event data
  for (let i = 0; i < 100; i++) {
    sessionStore.appendEvent(session, {
      id: `event-${i}`,
      sessionId: session.id,
      author: "client",
      type: "message",
      content: { text: `Message ${i}` },
      createdAt: new Date().toISOString()
    });
  }
  
  sessionStore.saveSession(session);
  const retrieved = sessionStore.getSession(session.id);
  
  assert.ok(retrieved.events.length > 0, "Should handle large event arrays");
  assert.ok(retrieved.data.audit.events.length > 0, "Should maintain audit trail");
});

test("database operations - session data validation", () => {
  sessionStore.resetSessions();
  
  const session = sessionStore.createSession();
  
  // Test invalid data patch
  assert.throws(() => {
    sessionStore.applyDataPatch(session, null);
  }, "Should reject null patch");
  
  // Test invalid event
  assert.throws(() => {
    sessionStore.appendEvent(session, null);
  }, "Should reject null event");
});

test("database operations - session search and querying", () => {
  sessionStore.resetSessions();
  
  // Create sessions with different characteristics
  const session1 = sessionStore.createSession();
  session1.stage = "SEGMENT_C_CONSENT";
  session1.data.client_profile.client_type = "individual";
  sessionStore.saveSession(session1);
  
  const session2 = sessionStore.createSession();
  session2.stage = "SEGMENT_G_REPORT";
  session2.data.client_profile.client_type = "company";
  sessionStore.saveSession(session2);
  
  const allSessions = sessionStore.listSessions();
  
  // Filter by stage
  const consentSessions = allSessions.filter(s => s.stage === "SEGMENT_C_CONSENT");
  assert.strictEqual(consentSessions.length, 1, "Should find sessions by stage");
  
  // Filter by client type
  const companySessions = allSessions.filter(s => s.data.client_profile.client_type === "company");
  assert.strictEqual(companySessions.length, 1, "Should find sessions by client type");
});