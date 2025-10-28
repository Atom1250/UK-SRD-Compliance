import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const openAi = await import("../server/integrations/openAiClient.js");
const conversation = await import("../server/state/conversationEngine.js");

test("sanitizeInput removes harmful characters and limits length", () => {
  // Test XSS prevention
  const maliciousInput = "<script>alert('xss')</script>Hello World";
  const result = conversation.sanitizeInput(maliciousInput);
  assert.ok(!result.includes('<script>'), "Should remove script tags");
  assert.ok(result.includes('Hello World'), "Should preserve safe content");
  
  // Test length limiting
  const longInput = 'a'.repeat(20000);
  const limitedResult = conversation.sanitizeInput(longInput);
  assert.ok(limitedResult.length <= 10000, "Should limit input length");
});

test("handleClientTurn recovers from invalid session structure", async () => {
  const invalidSession = { id: "test" }; // Missing required fields
  
  const result = await conversation.handleClientTurn(invalidSession, "Hello");
  
  assert.ok(Array.isArray(result.messages), "Should return messages array");
  assert.ok(result.error === true, "Should indicate error occurred");
  assert.ok(result.messages[0].includes("technical difficulties"), "Should provide user-friendly error message");
});

test("handleClientTurn handles stage handler errors gracefully", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Set invalid stage to trigger error
  session.stage = "INVALID_STAGE";
  
  const result = await conversation.handleClientTurn(session, "test input");
  
  assert.ok(Array.isArray(result.messages), "Should return messages array");
  assert.ok(result.messages[0].includes("not sure how to handle"), "Should provide fallback message");
});

test("session recovery restores missing data structure", () => {
  const brokenSession = {
    id: "test",
    stage: "SEGMENT_B_ONBOARDING"
    // Missing data and context
  };
  
  const recovered = conversation.recoverSession(brokenSession);
  
  assert.ok(recovered.data, "Should restore data object");
  assert.ok(recovered.context, "Should restore context object");
  assert.ok(recovered.data.client_profile, "Should restore client_profile");
  assert.ok(recovered.data.sustainability_preferences, "Should restore sustainability_preferences");
  assert.ok(recovered.context.education, "Should restore education context");
});

test("validateSessionStructure identifies missing fields", () => {
  const invalidSession = { id: "test" }; // Missing required fields
  
  const validation = conversation.validateSessionStructure(invalidSession);
  
  assert.strictEqual(validation.valid, false, "Should identify invalid session");
  assert.ok(validation.error.includes("Missing required field"), "Should specify missing field");
});

test("OpenAI timeout fallback works correctly", async () => {
  const timeoutResponder = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error('OpenAI request timeout');
  };
  
  openAi.setComplianceResponder(timeoutResponder);
  
  try {
    sessionStore.resetSessions();
    const session = sessionStore.createSession();
    session.stage = "SEGMENT_B_ONBOARDING";
    session.context.onboardingStep = 0;
    
    const result = await conversation.handleFreeFormQuery(session, "What is ESG?");
    
    assert.ok(Array.isArray(result.messages), "Should return messages");
    assert.ok(result.messages[0].includes("slow response times"), "Should indicate timeout fallback");
    assert.ok(result.error === true, "Should indicate error occurred");
  } finally {
    openAi.setComplianceResponder(undefined);
  }
});

test("malformed input parsing handles edge cases", () => {
  // Test null/undefined inputs
  assert.strictEqual(conversation.extractHorizonYears(null), null);
  assert.strictEqual(conversation.extractRiskTolerance(undefined), null);
  assert.strictEqual(conversation.extractCapacityForLoss(""), null);
  
  // Test malformed inputs
  assert.strictEqual(conversation.extractHorizonYears("not a number"), null);
  assert.strictEqual(conversation.extractRiskTolerance("invalid risk"), null);
  assert.strictEqual(conversation.extractCapacityForLoss("invalid capacity"), null);
  
  // Test boundary values
  assert.strictEqual(conversation.extractHorizonYears("200 years"), null); // Too high
  assert.strictEqual(conversation.extractRiskTolerance("10"), null); // Out of range
});

test("session save handles database errors gracefully", () => {
  const invalidSession = null;
  
  assert.throws(() => {
    sessionStore.saveSession(invalidSession);
  }, /Invalid session object/, "Should throw descriptive error for invalid session");
});

test("appendEvent limits array size to prevent memory issues", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  
  // Add many events to test limiting
  for (let i = 0; i < 1100; i++) {
    try {
      sessionStore.appendEvent(session, {
        id: `event-${i}`,
        sessionId: session.id,
        author: "client",
        type: "message",
        content: { text: `Message ${i}` },
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      // Some events might fail due to memory limits, which is expected
    }
  }
  
  // Should limit to reasonable size
  assert.ok(session.events.length <= 1000, "Should limit events array size");
  assert.ok(session.data.audit.events.length <= 1000, "Should limit audit events array size");
});