import test from "node:test";
import assert from "node:assert";

process.env.SESSION_DB_PATH = ":memory:";

const sessionStore = await import("../server/state/sessionStore.js");
const openAi = await import("../server/integrations/openAiClient.js");
const conversation = await import("../server/state/conversationEngine.js");

const unexpectedOpenAiCall = async () => {
  throw new Error("OpenAI stub was not configured for this test");
};

openAi.setComplianceResponder(unexpectedOpenAiCall);

const createEvent = (stage, content) => ({
  id: "event",
  sessionId: stage,
  author: "client",
  type: "data_update",
  content
});

test("structured onboarding persists suitability answers and advances to consent", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();

  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));

  const result = await conversation.handleEvent(
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

test("structured consent flow records timestamps and advances to education", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(
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
  await conversation.handleEvent(
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

test("structured options require impact goals when Impact label is chosen", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  await conversation.handleEvent(session, createEvent(session.stage, { ready: true }));
  await conversation.handleEvent(
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
  await conversation.handleEvent(
    session,
    createEvent(session.stage, {
      consent: {
        data_processing: true,
        e_delivery: false,
        future_contact: { granted: false }
      }
    })
  );
  await conversation.handleEvent(session, createEvent(session.stage, { acknowledged: true }));

  const result = await conversation.handleEvent(
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

test("onboarding handles multi-field answers and confirms goals", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_B_ONBOARDING";
  session.context.onboardingStep = 2;
  session.data.client_profile.objectives = "growth";

  const response = await conversation.handleClientTurn(
    session,
    "Around 8 years and I'm medium risk"
  );

  assert.strictEqual(session.data.client_profile.horizon_years, 8);
  assert.strictEqual(session.data.client_profile.risk_tolerance, 4);
  assert.strictEqual(session.context.onboardingStep, 4);
  assert.ok(
    response.messages.some((message) => /8-year horizon/i.test(message)),
    "should restate the goal and horizon for confirmation"
  );
  assert.ok(
    response.messages.some((message) => /loss could you afford/i.test(message)),
    "should proceed to ask about capacity for loss"
  );
});

test("educational detours log requests and offer to resume", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_B_ONBOARDING";
  session.context.onboardingStep = 2;

  const response = await conversation.handleClientTurn(
    session,
    "Tell me more about Impact investing"
  );

  assert.strictEqual(session.stage, "SEGMENT_B_ONBOARDING");
  assert.ok(
    response.messages.some((message) => /Impact investing/i.test(message)),
    "should provide an Impact investing summary"
  );
  assert.ok(
    response.messages.some((message) => /continue where we left off/i.test(message)),
    "should offer to resume the main flow"
  );
  assert.ok(
    session.data.educational_requests.some((entry) => /Impact investing/i.test(entry)),
    "should log the educational request"
  );
});

test("compliance clarifications log extra questions", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_B_ONBOARDING";
  session.context.onboardingStep = 2;

  const response = await conversation.handleClientTurn(
    session,
    "Why do you need that?"
  );

  assert.strictEqual(session.stage, "SEGMENT_B_ONBOARDING");
  assert.ok(
    response.messages.some((message) => /suitable over time/i.test(message)),
    "should explain the regulatory rationale for the question"
  );
  assert.ok(
    session.data.extra_questions.some((entry) => /Why do you need that/i.test(entry)),
    "should capture the clarification in extra_questions"
  );
});

test("free-form fallback routes questions to the compliance assistant", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_B_ONBOARDING";
  session.context.onboardingStep = 0;

  const stub = async () => ({
    reply: "Here’s what to consider about fees and ESG reporting.",
    compliance: {
      educational_requests: ["Free-form question: fees and ESG reporting"],
      notes: ["Logged compliance assistant free-form response."]
    }
  });

  openAi.setComplianceResponder(stub);

  try {
    const result = await conversation.handleClientTurn(
      session,
      "I just want to check fees and reporting."
    );

    assert.ok(
      result.messages[0].includes("fees and ESG reporting"),
      "should return the OpenAI reply first"
    );
    assert.ok(
      result.messages.some((message) => /individual, joint, trust, or company/i.test(message)),
      "should retain the stage guidance after the assistant reply"
    );

    const lastEvent = session.events.at(-1);
    assert.strictEqual(lastEvent.author, "assistant");
    assert.strictEqual(lastEvent.content?.source, "openai");
    assert.ok(lastEvent.content?.text.includes("fees and ESG reporting"));

    assert.ok(
      session.data.educational_requests.some((entry) =>
        entry.includes("fees and ESG reporting")
      )
    );
    assert.ok(
      (session.data.additional_notes || "").includes(
        "Logged compliance assistant free-form response."
      )
    );
  } finally {
    openAi.setComplianceResponder(unexpectedOpenAiCall);
  }
});

test("investment explorer surfaces authorised funds and market scan alternatives", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_E_OPTIONS";
  session.context.options.preferenceLevel = "detailed";
  session.context.options.step = 4;

  session.data.client_profile.objectives = "growth";
  session.data.client_profile.risk_tolerance = 5;
  session.data.client_profile.horizon_years = 8;

  session.data.sustainability_preferences = {
    preference_level: "detailed",
    labels_interest: ["Sustainability: Impact"],
    themes: ["Climate"],
    exclusions: [],
    impact_goals: ["Energy transition"],
    engagement_importance: "High",
    reporting_frequency_pref: "quarterly",
    tradeoff_tolerance: "Moderate",
    educ_pack_sent: true
  };

  const response = await conversation.handleClientTurn(
    session,
    "Can you suggest some sustainable fund options?"
  );

  assert.ok(
    response.messages[0].includes("on-panel investments"),
    "should list authorised investments first"
  );
  assert.ok(
    response.messages[1].includes("Market scan alternatives"),
    "should include a wider market scan summary"
  );
  assert.ok(
    response.messages[2].includes("adviser recommendation"),
    "should remind the client that an adviser must approve any selection"
  );

  assert.ok(Array.isArray(session.data.investment_research));
  assert.strictEqual(session.data.investment_research.length, 1);
  const log = session.data.investment_research[0];
  assert.ok(
    log.authorised_matches.includes("aurora_green_growth"),
    "should capture authorised matches in the research log"
  );
  assert.ok(
    log.alternative_matches.includes("solstice_global_impact"),
    "should capture market alternatives in the research log"
  );
});

test("401 unauthorized falls back to the local stub in production", async () => {
  sessionStore.resetSessions();
  const session = sessionStore.createSession();
  session.stage = "SEGMENT_B_ONBOARDING";
  session.context.onboardingStep = 0;

  const previousNodeEnv = process.env.NODE_ENV;
  const previousStrict = process.env.OPENAI_STRICT;

  process.env.NODE_ENV = "production";
  delete process.env.OPENAI_STRICT;

  const unauthorizedResponder = async () => {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  };

  openAi.setComplianceResponder(unauthorizedResponder);

  try {
    const result = await conversation.handleClientTurn(
      session,
      "Could you outline the sustainability reporting fees?"
    );

    assert.ok(
      result.messages[0].includes("authorization error"),
      "should respond with the stub message when OpenAI is unauthorized"
    );
    assert.ok(
      session.data.educational_requests.some((entry) =>
        entry.includes("sustainability reporting fees")
      ),
      "should log the free-form question as an educational request"
    );
    assert.ok(
      (session.data.additional_notes || "").includes("authorization failure"),
      "should record that the fallback stub handled the response"
    );
  } finally {
    openAi.setComplianceResponder(unexpectedOpenAiCall);

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }

    if (previousStrict === undefined) {
      delete process.env.OPENAI_STRICT;
    } else {
      process.env.OPENAI_STRICT = previousStrict;
    }
  }
});
