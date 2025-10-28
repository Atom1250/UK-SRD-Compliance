import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const analytics = await import("../server/state/conversationAnalytics.js");

const createEvent = (session, overrides = {}) => ({
  id: overrides.id ?? `evt_${Math.random().toString(36).slice(2)}`,
  sessionId: session.id,
  author: overrides.author ?? "client",
  type: overrides.type ?? "message",
  content: overrides.content ?? { text: "Hello" },
  createdAt: overrides.createdAt ?? new Date().toISOString()
});

test("conversation summary includes participants and timeline details", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  const firstEvent = createEvent(session, {
    author: "client",
    type: "message",
    content: { text: "Initial question" }
  });
  sessionStore.appendEvent(session, firstEvent);
  const followUp = createEvent(session, {
    author: "assistant",
    type: "message",
    content: { text: "Guidance response" }
  });
  sessionStore.appendEvent(session, followUp);

  const summary = analytics.generateConversationSummary(session);

  assert.strictEqual(summary.eventCount, 2);
  assert.strictEqual(summary.participants.client, 1);
  assert.strictEqual(summary.participants.assistant, 1);
  assert.strictEqual(summary.eventTypes.message, 2);
  assert.strictEqual(summary.stageProgress.currentStage, session.stage);
  assert.ok(summary.timeline.startedAt);
  assert.ok(summary.timeline.lastInteractionAt);
  assert.ok(summary.timeline.durationMinutes !== null);
});

test("conversation effectiveness highlights pending actions and completion ratio", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_E_OPTIONS";
  session.context.education.acknowledged = true;
  sessionStore.appendEvent(session, createEvent(session));

  let effectiveness = analytics.analyzeConversationEffectiveness(session);

  assert.ok(effectiveness.pendingActions.includes("Record data processing consent"));
  assert.ok(effectiveness.pendingActions.includes("Confirm suitability summary with client"));
  assert.ok(effectiveness.pendingActions.includes("Generate client suitability report"));
  assert.ok(effectiveness.pendingActions.includes("Capture recommendation outcome"));
  assert.ok(effectiveness.completionRatio > 0);
  assert.ok(effectiveness.timeline.durationMinutes !== null);

  sessionStore.applyDataPatch(session, {
    consent: { data_processing: true },
    summary_confirmation: { client_summary_confirmed: true },
    report: { status: "completed", doc_url: "memory://reports/demo.docx" },
    advice_outcome: { recommendation: "Proceed" }
  });
  effectiveness = analytics.analyzeConversationEffectiveness(session);

  assert.strictEqual(effectiveness.pendingActions.length, 0);
  assert.ok(effectiveness.consentRecorded);
  assert.ok(effectiveness.educationCompleted);
  assert.ok(effectiveness.reportReady);
});
