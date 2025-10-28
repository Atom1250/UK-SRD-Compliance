import test from "node:test";
import assert from "node:assert";
import { setComplianceResponder, callComplianceResponder } from "../server/integrations/openAiClient.js";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const conversation = await import("../server/state/conversationEngine.js");

test("OpenAI integration handles successful responses", async () => {
  const mockSuccessResponder = async (messages) => ({
    reply: "This is a successful compliance response about ESG investing.",
    compliance: {
      educational_requests: ["ESG investing basics"],
      extra_questions: [],
      notes: ["Provided educational content about ESG"]
    }
  });

  setComplianceResponder(mockSuccessResponder);

  try {
    sessionStore.resetSessions();
    const session = sessionStore.createSession();
    session.stage = "SEGMENT_B_ONBOARDING";
    
    const result = await conversation.handleFreeFormQuery(session, "What is ESG investing?");
    
    assert.ok(Array.isArray(result.messages), "Should return messages array");
    assert.ok(result.messages[0].includes("ESG investing"), "Should include OpenAI response");
    assert.ok(session.data.educational_requests.some(req => req.includes("ESG investing")), "Should log educational request");
    assert.ok(session.data.additional_notes.includes("educational content"), "Should log compliance notes");
    
  } finally {
    setComplianceResponder(undefined);
  }
});

test("OpenAI integration handles API errors gracefully", async () => {
  const mockErrorResponder = async () => {
    const error = new Error("API rate limit exceeded");
    error.status = 429;
    throw error;
  };

  setComplianceResponder(mockErrorResponder);

  try {
    sessionStore.resetSessions();
    const session = sessionStore.createSession();
    session.stage = "SEGMENT_B_ONBOARDING";
    
    const result = await conversation.handleFreeFormQuery(session, "Tell me about sustainable investing");
    
    assert.ok(Array.isArray(result.messages), "Should return messages array");
    assert.ok(result.error === true, "Should indicate error occurred");
    assert.ok(result.messages[0].includes("slow response times"), "Should provide fallback message");
    assert.ok(session.data.educational_requests.some(req => req.includes("sustainable investing")), "Should still log request");
    
  } finally {
    setComplianceResponder(undefined);
  }
});

test("OpenAI integration handles network timeouts", async () => {
  const mockTimeoutResponder = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    throw new Error("Request timeout");
  };

  setComplianceResponder(mockTimeoutResponder);

  try {
    sessionStore.resetSessions();
    const session = sessionStore.createSession();
    session.stage = "SEGMENT_D_EDUCATION";
    
    const result = await conversation.handleFreeFormQuery(session, "Explain impact investing");
    
    assert.ok(result.error === true, "Should handle timeout error");
    assert.ok(result.messages[0].includes("slow response times"), "Should provide timeout fallback");
    
  } finally {
    setComplianceResponder(undefined);
  }
});

test("OpenAI integration uses stub mode when configured", async () => {
  const previousStubFlag = process.env.OPENAI_STUB;
  process.env.OPENAI_STUB = "true";
  
  setComplianceResponder(undefined); // Clear any custom responder

  try {
    sessionStore.resetSessions();
    const session = sessionStore.createSession();
    session.stage = "SEGMENT_B_ONBOARDING";
    
    const result = await conversation.handleFreeFormQuery(session, "What are the risks?");
    
    assert.ok(result.messages[0].includes("stub is active"), "Should use stub response");
    assert.ok(session.data.educational_requests.some(req => req.includes("risks")), "Should log request in stub mode");
    assert.ok(session.data.additional_notes.includes("stub responder"), "Should note stub usage");
    
  } finally {
    if (previousStubFlag === undefined) {
      delete process.env.OPENAI_STUB;
    } else {
      process.env.OPENAI_STUB = previousStubFlag;
    }
    setComplianceResponder(undefined);
  }
});

test("OpenAI integration handles unauthorized errors in production", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  
  const mockUnauthorizedResponder = async () => {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  };

  setComplianceResponder(mockUnauthorizedResponder);

  try {
    sessionStore.resetSessions();
    const session = sessionStore.createSession();
    session.stage = "SEGMENT_E_OPTIONS";
    
    const result = await conversation.handleFreeFormQuery(session, "Compare ESG funds");
    
    assert.ok(result.messages[0].includes("authorization error"), "Should handle 401 error");
    assert.ok(session.data.additional_notes.includes("authorization failure"), "Should log auth failure");
    
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    setComplianceResponder(undefined);
  }
});

test("OpenAI integration preserves conversation context", async () => {
  const contextAwareResponder = async (messages) => {
    const lastMessage = messages[messages.length - 1];
    return {
      reply: `I understand you're asking about: ${lastMessage.content}`,
      compliance: {
        educational_requests: [`Context-aware response to: ${lastMessage.content}`],
        extra_questions: [],
        notes: ["Provided context-aware response"]
      }
    };
  };

  setComplianceResponder(contextAwareResponder);

  try {
    sessionStore.resetSessions();
    const session = sessionStore.createSession();
    session.stage = "SEGMENT_D_EDUCATION";
    
    // Add some conversation history
    sessionStore.appendEvent(session, {
      id: "prev-1",
      sessionId: session.id,
      author: "client",
      type: "message",
      content: { text: "I'm interested in climate investing" },
      createdAt: new Date().toISOString()
    });
    
    const result = await conversation.handleFreeFormQuery(session, "What are the performance implications?");
    
    assert.ok(result.messages[0].includes("performance implications"), "Should include context in response");
    assert.ok(session.data.educational_requests.some(req => req.includes("performance implications")), "Should log contextual request");
    
  } finally {
    setComplianceResponder(undefined);
  }
});

test("direct OpenAI client call handles malformed responses", async () => {
  const malformedResponder = async () => ({
    // Missing required fields
    reply: "Response without compliance object"
  });

  setComplianceResponder(malformedResponder);

  try {
    const messages = [{ role: "user", content: "Test question" }];
    const result = await callComplianceResponder(messages);
    
    // Should handle malformed response gracefully
    assert.ok(result.reply, "Should have reply field");
    assert.ok(result.compliance, "Should provide default compliance object");
    
  } finally {
    setComplianceResponder(undefined);
  }
});