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

test("structured onboarding persists suitability answers and advances to consent", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();

  conversation.handleEvent(session, createEvent(session.stage, { ready: true }));

  const result = conversation.handleEvent(
    session,
    createEvent(session.stage, {
      answers: {
        client_type: "individual",
        objectives: "growth",
        horizon_years: 2,
        risk_tolerance: 6,
        capacity_for_loss: "low",
        liquidity_needs: "No withdrawals planned",
        knowledge_summary: "Invested monthly in equity funds for 5 years.",
        financial: {
          provided: true,
          income: 65000,
          assets: 250000,
          liabilities: 40000,
          notes: "Income £65k, Assets £250k, Liabilities £40k"
        }
      },
      confirm_override: true
    })
  );

  assert.strictEqual(session.stage, "SEGMENT_C_CONSENT");
  assert.strictEqual(session.data.client_profile.risk_tolerance, 6);
  assert.ok(
    session.data.audit.guardrail_triggers.some(
      (entry) => entry.type === "risk_horizon_warning"
    ),
    "risk horizon guardrail should be recorded"
  );
  assert.ok(
    session.data.audit.guardrail_triggers.some(
      (entry) => entry.type === "risk_capacity_override" && entry.confirmed_at
    ),
    "risk override should be confirmed"
  );
  assert.ok(
    Array.isArray(result.messages) && result.messages.length >= 1,
    "structured handler should return follow-up messaging"
  );
});

test("structured consent flow records timestamps and advances to education", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  conversation.handleEvent(
    session,
    createEvent(session.stage, {
      answers: {
        client_type: "individual",
        objectives: "income",
        horizon_years: 5,
        risk_tolerance: 4,
        capacity_for_loss: "medium",
        liquidity_needs: "Quarterly withdrawals",
        knowledge_summary: "Experienced with bond funds.",
        financial: { provided: false }
      }
    })
  );

  const before = Date.now();
  conversation.handleEvent(
    session,
    createEvent(session.stage, {
      consent: {
        data_processing: true,
        e_delivery: true,
        future_contact: { granted: true, purpose: "Annual review" }
      }
    })
  );

  assert.strictEqual(session.stage, "SEGMENT_D_EDUCATION");
  assert.ok(session.data.consent.data_processing?.granted);
  assert.ok(session.data.timestamps.consent_recorded_at);
  assert.ok(Date.parse(session.data.timestamps.consent_recorded_at) >= before);
});

test("structured options require impact goals when Impact label is chosen", () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  conversation.handleEvent(
    session,
    createEvent(session.stage, {
      answers: {
        client_type: "company",
        objectives: "impact",
        horizon_years: 10,
        risk_tolerance: 5,
        capacity_for_loss: "medium",
        liquidity_needs: "No planned withdrawals",
        knowledge_summary: "Occasional impact fund investments.",
        financial: { provided: false }
      }
    })
  );
  conversation.handleEvent(
    session,
    createEvent(session.stage, {
      consent: {
        data_processing: true,
        e_delivery: false,
        future_contact: { granted: false }
      }
    })
  );
  conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));

  const result = conversation.handleEvent(
    session,
    createEvent(session.stage, {
      preferences: {
        preference_level: "detailed",
        labels_interest: ["Sustainability: Impact"],
        themes: ["Climate"],
        exclusions: [{ sector: "Fossil fuels", threshold: 5 }],
        impact_goals: [],
        engagement_importance: "High",
        reporting_frequency_pref: "none",
        tradeoff_tolerance: "Moderate"
      }
    })
  );

  assert.strictEqual(session.stage, "SEGMENT_E_OPTIONS");
  assert.ok(
    Array.isArray(result.messages) &&
      result.messages.some((message) => /impact/i.test(message)),
    "should prompt for missing impact details"
  );
});
