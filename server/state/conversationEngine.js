import {
  CAPACITY_FOR_LOSS_VALUES,
  CLIENT_TYPES,
  OBJECTIVE_OPTIONS,
  PATHWAY_NAMES,
  PREFERENCE_LEVELS,
  REPORTING_FREQUENCY_OPTIONS,
  RISK_SCALE,
  STAGE_PROMPTS
} from "./constants.js";
import {
  applyDataPatch,
  saveSession,
  setStage
} from "./sessionStore.js";
import { validateSessionData } from "./validateSession.js";
import { generateReportArtifacts } from "../report/reportGenerator.js";
import { storeReportArtifacts } from "../report/reportStore.js";

const yesPatterns = /\b(yes|yep|i (consent|agree|understand|accept)|sure|ok(ay)?|ready)\b/i;
const noPatterns = /\b(no|nope|not (yet|now)|decline|refuse)\b/i;

const normalise = (value) => value.trim().toLowerCase();


const splitList = (text) =>
  text
    .split(/[,\n]|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean);

const parseInteger = (value) => {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const parseMoneyValue = (text, keyword) => {
  const pattern = new RegExp(`${keyword}[^\n\r\d]*([\d,.]+)`, "i");
  const match = text.match(pattern);
  if (!match) return null;
  const numeric = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const stageResponse = (session, stage, additionalMessages = []) => {
  if (session.stage !== stage) {
    setStage(session, stage);
  }

  if (
    stage === "SEGMENT_A_EXPLANATION" &&
    !session.data.audit.explanation_shown
  ) {
    applyDataPatch(session, {
      audit: {
        explanation_shown: true
      },
      timestamps: {
        explanation_shown_at: new Date().toISOString()
      }
    });
  }

  const prompt = STAGE_PROMPTS[stage];
  return prompt ? [prompt, ...additionalMessages] : additionalMessages;
};

const moveToStage = (session, stage, extraMessages = []) => {
  const messages = stageResponse(session, stage, extraMessages);
  saveSession(session);
  return { messages };
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const parseExclusions = (input) => {
  if (/\b(none|no exclusions)\b/i.test(input)) {
    return [];
  }

  return splitList(input).map((item) => {
    const match = item.match(/(-?\d+(?:\.\d+)?)%?/);
    const threshold = match ? Number.parseFloat(match[1]) : null;
    const sector = item.replace(/(-?\d+(?:\.\d+)?)%?/g, "").trim();
    return {
      sector: sector || item.trim(),
      threshold
    };
  });
};

const last = (items, predicate) => {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (predicate(items[i])) return items[i];
  }
  return null;
};

const handleExplanation = (session, text) => {
  if (!yesPatterns.test(text)) {
    return {
      messages: [
        "When you're ready to continue, reply with 'Ready' or 'Yes' so I can start the onboarding questions."
      ]
    };
  }

  session.context.onboardingStep = 0;
  return moveToStage(session, "SEGMENT_B_ONBOARDING", [
    "Are you investing as an individual, joint, trust, or company?"
  ]);
};

const handleRiskOverride = (session, text) => {
  if (!session.context.requireRiskOverride) {
    return null;
  }

  if (!yesPatterns.test(text) && !/accept|proceed|override/i.test(text)) {
    return {
      messages: [
        "Please explicitly confirm that you wish to proceed with a higher risk tolerance despite indicating a low capacity for loss."
      ]
    };
  }

  session.context.requireRiskOverride = false;
  const guardrail = last(
    ensureArray(session.data.audit.guardrail_triggers),
    (item) => item?.type === "risk_capacity_override" && !item?.confirmed_at
  );
  if (guardrail) {
    guardrail.confirmed_at = new Date().toISOString();
  }

  session.context.onboardingStep = Math.max(session.context.onboardingStep, 5);
  return {
    messages: [
      "Thank you for confirming. Will you need to withdraw funds at specific times?"
    ]
  };
};

const handleOnboarding = (session, text) => {
  const overrideResult = handleRiskOverride(session, text);
  if (overrideResult) {
    return overrideResult;
  }

  const profile = session.data.client_profile;
  const step = session.context.onboardingStep ?? 0;
  const responses = [];

  if (step === 0) {
    const choice = CLIENT_TYPES.find(
      (type) => normalise(type) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose from individual, joint, trust, or company so I can log the correct client type."
        ]
      };
    }

    profile.client_type = choice;
    session.context.onboardingStep = 1;
    return {
      messages: [
        "Thanks. What’s your main investment goal? (growth, income, preservation, impact, or other)"
      ]
    };
  }

  if (step === 1) {
    const raw = text.trim();
    const option = OBJECTIVE_OPTIONS.find(
      (item) => normalise(item) === normalise(raw)
    );
    profile.objectives = option ?? raw;
    session.context.onboardingStep = 2;
    return {
      messages: [
        "How long do you expect to keep this money invested? Please provide the number of years."
      ]
    };
  }

  if (step === 2) {
    const years = parseInteger(text);
    if (!Number.isInteger(years) || years <= 0) {
      return {
        messages: [
          "Please provide your investment horizon as a positive whole number of years."
        ]
      };
    }

    profile.horizon_years = years;
    session.context.onboardingStep = 3;
    return {
      messages: [
        "On a scale of 1 (very low) to 7 (very high), how comfortable are you with investment risk?"
      ]
    };
  }

  if (step === 3) {
    const risk = parseInteger(text);
    if (!RISK_SCALE.includes(risk)) {
      return {
        messages: [
          "Please choose a risk level from 1 to 7, where 1 is very low risk and 7 is very high risk."
        ]
      };
    }

    profile.risk_tolerance = risk;
    if (profile.horizon_years && profile.horizon_years < 3 && risk >= 5) {
      session.data.audit.guardrail_triggers.push({
        type: "risk_horizon_warning",
        triggered_at: new Date().toISOString(),
        notes: "High risk with short horizon"
      });
      responses.push(
        "⚠️ You’ve chosen a high risk level with a short time horizon. I’ll highlight this for your adviser so they can discuss whether it remains suitable."
      );
    }

    session.context.onboardingStep = 4;
    responses.push(
      "If markets fall, how much loss could you afford without affecting your lifestyle? (low, medium, high)"
    );
    return { messages: responses };
  }

  if (step === 4) {
    const choice = CAPACITY_FOR_LOSS_VALUES.find(
      (value) => normalise(value) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please let me know if your capacity for loss is low, medium, or high."
        ]
      };
    }

    profile.capacity_for_loss = choice;
    session.context.onboardingStep = 5;

    if (profile.risk_tolerance >= 5 && choice === "low") {
      session.context.requireRiskOverride = true;
      session.data.audit.guardrail_triggers.push({
        type: "risk_capacity_override",
        triggered_at: new Date().toISOString(),
        confirmed_at: null
      });
      return {
        messages: [
          "Because you’ve selected a high risk tolerance but a low capacity for loss, please explicitly confirm you wish to proceed with that combination."
        ]
      };
    }

    return {
      messages: [
        "Will you need to withdraw funds at specific times?"
      ]
    };
  }

  if (step === 5) {
    profile.liquidity_needs = text.trim();
    session.context.onboardingStep = 6;
    return {
      messages: [
        "Have you invested before? Please describe which instruments, how often, and for how long."
      ]
    };
  }

  if (step === 6) {
    profile.knowledge_experience.summary = text.trim();
    profile.knowledge_experience.instruments = splitList(text);
    profile.knowledge_experience.frequency = /monthly|quarterly|annual|weekly/i.test(text)
      ? (text.match(/(daily|weekly|monthly|quarterly|annual)/i)?.[1] ?? "")
      : "";
    profile.knowledge_experience.duration = text.match(/\b(\d+\s*(years?|months?))\b/i)?.[0] ?? "";
    session.context.onboardingStep = 7;
    return {
      messages: [
        "Would you like to record income, assets, and liabilities for context?"
      ]
    };
  }

  if (step === 7) {
    if (noPatterns.test(text)) {
      profile.financial_situation = {
        provided: false,
        income: null,
        assets: null,
        liabilities: null,
        notes: ""
      };
      session.context.onboardingStep = 9;
      session.context.consentStep = 0;
      return moveToStage(session, "SEGMENT_C_CONSENT", [
        "We need your permission to record your answers for regulatory reporting.",
        "Do you consent to us processing your data for this advice session?"
      ]);
    }

    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "Please let me know 'Yes' or 'No' so I can record whether to capture your financial details."
        ]
      };
    }

    profile.financial_situation.provided = true;
    session.context.onboardingStep = 8;
    return {
      messages: [
        "Please share any income, assets, and liabilities you’d like recorded (for example: Income £60k, Assets £250k, Liabilities £40k)."
      ]
    };
  }

  if (step === 8) {
    const details = text.trim();
    if (!details) {
      return {
        messages: [
          "Could you provide a short summary of your income, assets, and liabilities?"
        ]
      };
    }

    profile.financial_situation.notes = details;
    profile.financial_situation.income = parseMoneyValue(details, "income");
    profile.financial_situation.assets = parseMoneyValue(details, "asset");
    profile.financial_situation.liabilities = parseMoneyValue(details, "liabilit");
    session.context.onboardingStep = 9;
    session.context.consentStep = 0;
    return moveToStage(session, "SEGMENT_C_CONSENT", [
      "Thank you. We need your permission to record your answers for regulatory reporting.",
      "Do you consent to us processing your data for this advice session?"

    ]);
  }

  return {
    messages: [
      "Let me summarise before we continue."
    ]
  };
};

const handleConsent = (session, text) => {
  const consent = session.data.consent;
  const step = session.context.consentStep ?? 0;

  if (step === 0) {
    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "I’m unable to proceed without your consent to process this information. Please reply 'Yes' if you agree."
        ]
      };
    }

    const timestamp = new Date().toISOString();
    consent.data_processing = { granted: true, timestamp };
    session.data.timestamps.consent_recorded_at = timestamp;
    session.context.consentStep = 1;
    return {
      messages: [
        "Thank you. Do you consent to receive documents electronically (e-delivery)?"
      ]
    };
  }

  if (step === 1) {
    const granted = yesPatterns.test(text) ? true : noPatterns.test(text) ? false : null;
    if (granted === null) {
      return {
        messages: [
          "Please reply with 'Yes' or 'No' so I can record your e-delivery preference."
        ]
      };
    }

    consent.e_delivery = {
      granted,
      timestamp: new Date().toISOString()
    };
    session.context.consentStep = 2;
    return {
      messages: [
        "Can we contact you in the future with relevant updates?"
      ]
    };
  }

  if (step === 2) {
    if (noPatterns.test(text)) {
      consent.future_contact = { granted: false, purpose: "" };
      session.context.consentStep = 4;
      return moveToStage(session, "SEGMENT_D_EDUCATION", [
        "Here’s a quick ESG education pack covering key regulatory points:",
        "• ESG stands for Environmental, Social, and Governance – it highlights factors, not guaranteed outcomes.",
        "• UK SDR labels include Focus, Improvers, Impact, and Mixed Goals.",
        "• The Anti-Greenwashing Rule means we only make evidence-backed sustainability claims.",
        "• Product disclosures will always be attached for you to review.",
        "Reply 'Understood' when you’re ready to continue."
      ]);
    }

    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "Please let me know 'Yes' or 'No' so I can record your future contact preference."
        ]
      };
    }

    consent.future_contact = { granted: true, purpose: "" };
    session.context.consentStep = 3;
    return {
      messages: [
        "Thanks. What purpose should we note for future contact (for example, annual review or product updates)?"
      ]
    };
  }

  if (step === 3) {
    consent.future_contact.purpose = text.trim();
    session.context.consentStep = 4;
    return moveToStage(session, "SEGMENT_D_EDUCATION", [
      "Here’s a quick ESG education pack covering key regulatory points:",
      "• ESG stands for Environmental, Social, and Governance – it highlights factors, not guaranteed outcomes.",
      "• UK SDR labels include Focus, Improvers, Impact, and Mixed Goals.",
      "• The Anti-Greenwashing Rule means we only make evidence-backed sustainability claims.",
      "• Product disclosures will always be attached for you to review.",
      "Reply 'Understood' when you’re ready to continue."
    ]);
  }

  return { messages: [] };
};

const handleEducation = (session, text) => {
  const education = session.context.education ?? {
    acknowledged: false,
    summaryOffered: false,
    summarised: false
  };

  if (!education.acknowledged) {
    if (!yesPatterns.test(text)) {
      return {
        messages: [
          "Take your time reviewing the education pack. Reply with 'Understood' once you’re ready to continue."
        ]
      };
    }

    education.acknowledged = true;
    education.summaryOffered = true;
    session.data.sustainability_preferences.educ_pack_sent = true;
    session.data.audit.educ_pack_sent = true;
    session.data.disclosures.agr_disclaimer_presented = true;
    session.data.timestamps.education_completed_at = new Date().toISOString();
    session.context.education = education;
    saveSession(session);
    return {
      messages: [
        "Would you like me to summarise the difference between Focus and Improvers labels?"
      ]
    };
  }

  if (education.summaryOffered && !education.summarised) {
    if (yesPatterns.test(text)) {
      education.summarised = true;
      session.context.education = education;
      return moveToStage(session, "SEGMENT_E_OPTIONS", [
        "Focus funds invest in companies already leading on sustainability factors, whereas Improvers target companies with credible plans to improve.",
        "Do you have sustainability preferences? Choose from: none, high_level, or detailed."
      ]);
    }

    if (!noPatterns.test(text)) {
      return {
        messages: [
          "Please reply with 'Yes' if you’d like the summary or 'No' if you’re happy to move on."
        ]
      };
    }

    education.summarised = true;
    session.context.education = education;
    return moveToStage(session, "SEGMENT_E_OPTIONS", [
      "No problem. Do you have sustainability preferences? Choose from: none, high_level, or detailed."
    ]);
  }

  return {
    messages: [
      "Let’s capture your sustainability preferences."
    ]
  };
};

const impactChosen = (labels) =>
  ensureArray(labels).some((label) => /impact/i.test(label));

const parseLabels = (text) =>
  splitList(text).map((label) => {
    const match = PATHWAY_NAMES.find((name) =>
      normalise(name).includes(normalise(label)) ||
      normalise(label).includes(normalise(name))
    );
    return match ?? label.trim();
  });

const handleOptions = (session, text) => {
  const prefs = session.data.sustainability_preferences;
  const optionsContext = session.context.options ?? {
    preferenceLevel: null,
    step: 0,
    pendingExclusions: false,
    pendingImpactDetails: false
  };

  if (!optionsContext.preferenceLevel) {
    const choice = PREFERENCE_LEVELS.find(
      (item) => normalise(item) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose from: none, high_level, or detailed."
        ]
      };
    }

    prefs.preference_level = choice;
    optionsContext.preferenceLevel = choice;
    session.context.options = optionsContext;

    if (choice === "none") {
      prefs.labels_interest = [];
      prefs.themes = [];
      prefs.exclusions = [];
      prefs.impact_goals = [];
      prefs.engagement_importance = "";
      prefs.reporting_frequency_pref = "none";
      prefs.tradeoff_tolerance = "";
      return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
        "I’ll note that you have no specific sustainability preferences. I’ll summarise everything next."
      ]);
    }

    optionsContext.step = 1;
    saveSession(session);
    return {
      messages: [
        "Which FCA SDR labels interest you?"
      ]
    };
  }

  const step = optionsContext.step ?? 0;

  if (step === 1) {
    const labels = parseLabels(text);
    if (labels.length === 0) {
      return {
        messages: [
          "Please list at least one label or say 'none' if you wish to skip."
        ]
      };
    }
    prefs.labels_interest = labels;

    if (optionsContext.preferenceLevel === "high_level") {
      return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
        "Thanks, I’ve noted those label interests. I’ll recap everything for you now."
      ]);
    }

    optionsContext.step = 2;
    session.context.options = optionsContext;
    return {
      messages: [
        "Are there particular sustainability themes you want to focus on? (e.g. climate, biodiversity, social equity)"
      ]
    };
  }

  if (step === 2) {
    prefs.themes = /\b(none|not at this time)\b/i.test(text)
      ? []
      : splitList(text);
    optionsContext.step = 3;
    session.context.options = optionsContext;
    return {
      messages: [
        "Please list any exclusions and thresholds (for example: Fossil fuels under 5%, Tobacco 0%)."
      ]
    };
  }

  if (step === 3) {
    const exclusions = parseExclusions(text);
    const fossil = exclusions.find((item) => /fossil/i.test(item.sector));
    if (fossil && (fossil.threshold === null || Number.isNaN(fossil.threshold))) {
      return {
        messages: [
          "For fossil fuels, please provide a numeric threshold (for example: Fossil fuels under 5%)."
        ]
      };
    }

    prefs.exclusions = exclusions.map((item) => ({
      sector: item.sector,
      threshold: item.threshold
    }));
    optionsContext.step = 4;
    session.context.options = optionsContext;
    return {
      messages: [
        "Do you have any specific impact goals (for example: SDG 7 affordable clean energy)?"
      ]
    };
  }

  if (step === 4) {
    if (impactChosen(prefs.labels_interest) && /\b(none|not at this time)\b/i.test(text)) {
      return {
        messages: [
          "Impact-labelled investments require at least one goal. Please list the outcomes that matter to you."
        ]
      };
    }

    prefs.impact_goals = /\b(none|not at this time)\b/i.test(text)
      ? []
      : splitList(text);
    optionsContext.step = 5;
    session.context.options = optionsContext;
    return {
      messages: [
        "How important is active stewardship or engagement from managers?"
      ]
    };
  }

  if (step === 5) {
    prefs.engagement_importance = text.trim();
    optionsContext.step = 6;
    session.context.options = optionsContext;
    return {
      messages: [
        "How often would you like sustainability reporting updates? (none, quarterly, semiannual, annual)"
      ]
    };
  }

  if (step === 6) {
    const choice = REPORTING_FREQUENCY_OPTIONS.find(
      (value) => normalise(value) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose a reporting frequency: none, quarterly, semiannual, or annual."
        ]
      };
    }

    if (impactChosen(prefs.labels_interest) && choice === "none") {
      return {
        messages: [
          "Impact-focused solutions require a reporting preference so we can evidence outcomes. Please choose quarterly, semiannual, or annual."
        ]
      };
    }

    prefs.reporting_frequency_pref = choice;
    optionsContext.step = 7;
    session.context.options = optionsContext;
    return {
      messages: [
        "How much investment performance trade-off are you willing to accept for sustainability outcomes?"
      ]
    };
  }

  if (step === 7) {
    prefs.tradeoff_tolerance = text.trim();
    session.context.options = optionsContext;
    return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
      "Thanks, I’ve captured those details. Let me summarise everything back to you."
    ]);
  }

  return { messages: [] };
};

const buildSummary = (session) => {
  const profile = session.data.client_profile;
  const prefs = session.data.sustainability_preferences;
  const consent = session.data.consent;

  const lines = [];
  lines.push("Here’s what you told me:");
  lines.push(
    `• Client type: ${profile.client_type}`
  );
  lines.push(
    `• Objectives: ${profile.objectives}`
  );
  lines.push(
    `• Horizon: ${profile.horizon_years ?? "—"} years`
  );
  lines.push(
    `• Risk tolerance: ${profile.risk_tolerance} / 7`
  );
  lines.push(
    `• Capacity for loss: ${profile.capacity_for_loss}`
  );
  lines.push(
    `• Liquidity needs: ${profile.liquidity_needs}`
  );
  lines.push(
    `• Knowledge & experience: ${profile.knowledge_experience.summary}`
  );
  if (profile.financial_situation.provided) {
    lines.push(
      `• Financial context: ${profile.financial_situation.notes}`
    );
  }
  if (prefs.preference_level !== "none") {
    lines.push(
      `• Sustainability preference level: ${prefs.preference_level}`
    );
    lines.push(
      `• Label interests: ${prefs.labels_interest.join(", ") || "None"}`
    );
    if (prefs.themes.length) {
      lines.push(`• Themes: ${prefs.themes.join(", ")}`);
    }
    if (prefs.exclusions.length) {
      lines.push(
        `• Exclusions: ${prefs.exclusions
          .map((item) =>
            item.threshold != null
              ? `${item.sector} (<${item.threshold}%)`
              : item.sector
          )
          .join(", ")}`
      );
    }
    if (prefs.impact_goals.length) {
      lines.push(`• Impact goals: ${prefs.impact_goals.join(", ")}`);
    }
    lines.push(
      `• Engagement importance: ${prefs.engagement_importance || "Not specified"}`
    );
    lines.push(
      `• Reporting frequency preference: ${prefs.reporting_frequency_pref}`
    );
    lines.push(
      `• Trade-off tolerance: ${prefs.tradeoff_tolerance || "Not specified"}`
    );
  }
  lines.push(
    `• Consent to data processing recorded: ${consent.data_processing?.granted ? "Yes" : "No"}`
  );
  return lines.join("\n");
};

const handleConfirmation = (session, text) => {
  if (!session.context.confirmationAwaiting) {
    session.context.confirmationAwaiting = true;
    return {
      messages: [
        buildSummary(session),
        "Is this correct? Reply 'Yes' to confirm or tell me what needs updating."
      ]
    };
  }

  if (!yesPatterns.test(text)) {
    if (/edit|change|update/i.test(text)) {
      return {
        messages: [
          "Please let me know the details that need updating and an adviser will follow up, or restart the session to re-run the questionnaire."
        ]
      };
    }

    return {
      messages: [
        "I’ll need a 'Yes' to confirm accuracy. If anything is incorrect, please tell me what should be amended."
      ]
    };
  }

  session.data.summary_confirmation.client_summary_confirmed = true;
  session.data.summary_confirmation.confirmed_at = new Date().toISOString();
  session.context.confirmationAwaiting = false;
  setStage(session, "SEGMENT_G_REPORT");
  return handleReport(session);
};

const enrichAdviceOutcome = (session) => {
  const profile = session.data.client_profile;
  const prefs = session.data.sustainability_preferences;

  session.data.advice_outcome.recommendation =
    session.data.advice_outcome.recommendation ||
    "Recommendation to be finalised by adviser following compliance review.";
  session.data.advice_outcome.rationale =
    session.data.advice_outcome.rationale ||
    `Client objective ${profile.objectives} with horizon ${profile.horizon_years} years and risk level ${profile.risk_tolerance}/7.`;
  session.data.advice_outcome.sust_fit =
    session.data.advice_outcome.sust_fit ||
    (prefs.preference_level === "none"
      ? "No explicit sustainability preferences recorded."
      : `Captured sustainability preferences include ${
          prefs.labels_interest.join(", ") || "general ESG awareness"
        }.`);
  session.data.advice_outcome.costs_summary =
    session.data.advice_outcome.costs_summary ||
    "Detailed costs and charges will be attached with product disclosures.";
};

const handleReport = (session) => {
  enrichAdviceOutcome(session);
  const validation = validateSessionData(session);
  if (!validation.valid) {
    return {
      messages: [
        "We’re missing some information before I can generate the report:",
        ...validation.issues
      ]
    };
  }

  const artifacts = generateReportArtifacts(session);
  storeReportArtifacts(session.id, artifacts.pdfBuffer);
  session.data.audit.report_hash = artifacts.hash;
  session.data.timestamps.report_generated_at = new Date().toISOString();
  session.data.report.preview = artifacts.preview;
  session.data.report.doc_url = `/api/sessions/${session.id}/report.pdf`;
  session.data.report.status = "draft";
  session.context.reportReady = true;

  return moveToStage(session, "SEGMENT_H_DELIVERY", [
    "Great, I’m generating your personalised suitability pack now.",
    "I’ve prepared your personalised pack. You can download the summary, ESG explainer, and disclosure bundle from the dashboard.",
    `Report preview:\n${artifacts.preview}`,
    "If you need anything else, let me know and an adviser will follow up."
  ]);
};

const handleDelivery = () => ({
  messages: [
    "This session is complete. Your adviser will review everything and attach any product disclosures shortly."
  ]
});

const handleComplete = () => ({
  messages: [
    "This session is already archived. If you need changes, please start a new one."
  ]
});

export const handleClientTurn = (session, text) => {
  const trimmed = text.trim();
  const stageHandlers = {
    SEGMENT_A_EXPLANATION: handleExplanation,
    SEGMENT_B_ONBOARDING: handleOnboarding,
    SEGMENT_C_CONSENT: handleConsent,
    SEGMENT_D_EDUCATION: handleEducation,
    SEGMENT_E_OPTIONS: handleOptions,
    SEGMENT_F_CONFIRMATION: handleConfirmation,
    SEGMENT_G_REPORT: handleReport,
    SEGMENT_H_DELIVERY: handleDelivery,
    SEGMENT_COMPLETE: handleComplete
  };

  const handler = stageHandlers[session.stage] ?? (() => ({ messages: [] }));
  const response = handler(session, trimmed);
  saveSession(session);
  return response;
};

export const handleAssistantMessage = (session, content) => {
  applyDataPatch(session, content?.stageData ?? {});
  saveSession(session);
  return { messages: [] };
};

export const handleEvent = (session, event) => {
  if (event.author === "client" && event.type === "message") {
    return handleClientTurn(session, event.content?.text ?? "");
  }

  if (event.author === "assistant" && event.type === "message") {
    return handleAssistantMessage(session, event.content ?? {});
  }

  return { messages: [] };
};
