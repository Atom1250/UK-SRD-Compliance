import { randomUUID } from "node:crypto";
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
  appendEvent,
  applyDataPatch,
  saveSession,
  setStage
} from "./sessionStore.js";
import { validateSessionData } from "./validateSession.js";
import {
  AUTHORIZED_INVESTMENTS,
  MARKET_ALTERNATIVES
} from "./investmentUniverse.js";
import { generateReportArtifacts } from "../report/reportGenerator.js";
import { storeReportArtifacts } from "../report/reportStore.js";
import {
  callComplianceResponder,
  COMPLIANCE_SYSTEM_PROMPT
} from "../integrations/openAiClient.js";

const yesPatterns =
  /\b(yes|yep|i (consent|agree|understand|accept)|sure|ok(ay)?|ready|understood)\b/i;
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

const ONBOARDING_QUESTIONS = {
  0: "Are you investing as an individual, joint, trust, or company?",
  1: "What’s your main investment goal? (growth, income, preservation, impact, or other)",
  2: "How long do you expect to keep this money invested? Please provide the number of years.",
  3: "On a scale of 1 (very low) to 7 (very high), how comfortable are you with investment risk?",
  4: "If markets fall, how much loss could you afford without affecting your lifestyle? (low, medium, high)",
  5: "Will you need to withdraw funds at specific times?",
  6: "Have you invested before? Please describe which instruments, how often, and for how long.",
  7: "Would you like to record income, assets, and liabilities for context?",
  8: "Please share any income, assets, and liabilities you’d like recorded (for example: Income £60k, Assets £250k, Liabilities £40k)."
};

const CONSENT_QUESTIONS = {
  0: "Do you consent to us processing your data for this advice session?",
  1: "Do you consent to receive documents electronically (e-delivery)?",
  2: "Can we contact you in the future with relevant updates?",
  3: "What purpose should we note for future contact (for example, annual review or product updates)?"
};

const OPTIONS_QUESTIONS = {
  preferenceLevel: "Do you have sustainability preferences? Choose from: none, high_level, or detailed.",
  1: "Which FCA SDR labels interest you?",
  2: "Are there particular sustainability themes you want to focus on? (e.g. climate, biodiversity, social equity)",
  3: "Please list any exclusions and thresholds (for example: Fossil fuels under 5%, Tobacco 0%).",
  4: "Do you have any specific impact goals (for example: SDG 7 affordable clean energy)?",
  5: "How important is active stewardship or engagement from managers?",
  6: "How often would you like sustainability reporting updates? (none, quarterly, semiannual, annual)",
  7: "How much investment performance trade-off are you willing to accept for sustainability outcomes?"
};

const COMPLIANCE_REASONS = {
  SEGMENT_B_ONBOARDING: {
    0: "I record whether you’re investing as an individual, joint client, trust, or company so Consumer Duty and PROD checks line up with the right permissions.",
    1: "Understanding your main goal helps me evidence suitability against COBS 9A – advice must reflect what you’re trying to achieve.",
    2: "Knowing your investment horizon lets me check that any strategy remains suitable over time, which the rules require.",
    3: "Capturing your risk tolerance ensures recommendations match the level of volatility you can handle under COBS 9A.",
    4: "Capacity for loss is a mandatory field so we understand how much downside you can absorb before your lifestyle is affected.",
    5: "Liquidity needs stop us from locking money away when you might need access – that’s part of the PROD governance checks.",
    6: "Your knowledge and experience guide me toward products that are appropriate for you.",
    7: "Financial context helps an adviser check affordability and Consumer Duty outcomes, even if you opt to keep it high level.",
    8: "Those financial notes give the adviser evidence for affordability and ongoing suitability reviews.",
    risk_override:
      "Because you selected a higher risk level than your loss capacity, I must double-check you’re comfortable proceeding to satisfy COBS 9A."
  },
  SEGMENT_C_CONSENT: {
    0: "Data processing consent is required before we can store or use the information you share.",
    1: "E-delivery consent confirms you’re happy to receive disclosures digitally, which we must evidence.",
    2: "Future contact permissions make sure we respect marketing rules and your preferences.",
    3: "Recording the purpose of future contact shows we’ll only reach out for the reasons you agree to."
  },
  SEGMENT_D_EDUCATION: {
    acknowledgement:
      "The FCA’s Anti-Greenwashing and SDR rules expect us to show you how sustainability claims are evidenced before we continue.",
    summary:
      "Making sure you understand the difference between SDR labels helps keep any recommendation fair, clear, and not misleading."
  },
  SEGMENT_E_OPTIONS: {
    preferenceLevel:
      "Capturing your preference level lets me map you to the right SDR sustainability pathway.",
    1: "Label interests show which SDR categories align with your goals so we only shortlist suitable options.",
    2: "Themes help us prioritise the ESG outcomes you care about when reviewing products.",
    3: "Exclusions need clear thresholds so we avoid funds that would conflict with your values and Anti-Greenwashing commitments.",
    4: "Impact goals are required evidence if we pursue Impact-labelled investments.",
    5: "Stewardship preferences guide how actively managers should engage on your behalf.",
    6: "Reporting frequency ensures we deliver updates often enough to evidence sustainability outcomes.",
    7: "Understanding trade-off tolerance helps balance sustainability aims with performance expectations."
  },
  SEGMENT_F_CONFIRMATION: {
    0: "I’ll replay everything so you can confirm it’s accurate before we generate any reports."
  }
};

const EDUCATION_MODULES = [
  {
    title: "ESG basics",
    keywords: [/\bwhat is esg\b/i, /\besg basics\b/i, /tell me more about esg/i],
    summary:
      "ESG stands for Environmental, Social, and Governance factors – it’s a framework for understanding how companies behave, not a guarantee of positive outcomes."
  },
  {
    title: "Impact investing",
    keywords: [/impact investing/i],
    summary:
      "Impact investing aims for measurable environmental or social outcomes alongside returns. Under the FCA’s Impact label we must evidence those outcomes through stewardship and transparent reporting."
  },
  {
    title: "FCA SDR labels",
    keywords: [/sdr labels?/i, /tell me more about labels/i],
    summary:
      "The FCA SDR labels include Focus, Improvers, Impact, and Mixed Goals. Each label signals how a product pursues sustainability outcomes and what evidence it must provide."
  },
  {
    title: "Anti-Greenwashing",
    keywords: [/anti[- ]?greenwashing/i],
    summary:
      "The Anti-Greenwashing Rule means any sustainability claim we make must be fair, clear, and backed by evidence. We attach disclosures so you can verify what’s promised."
  },
  {
    title: "Risks & trade-offs",
    keywords: [/sustainability risks/i, /trade[- ]?offs/i, /risks of esg/i],
    summary:
      "Sustainable investing can involve tracking error, sector concentration, or short-term underperformance. We weigh those trade-offs so you know where outcomes might differ from the broad market."
  },
  {
    title: "Product governance",
    keywords: [/product governance/i, /prod 3/i],
    summary:
      "Product governance (PROD 3) requires us to match you with solutions designed for your target market and to document how the manufacturer supports those outcomes."
  },
  {
    title: "Switching considerations",
    keywords: [/switching/i, /move my investments/i],
    summary:
      "When switching investments we compare costs, exit penalties, and whether the new product genuinely improves sustainability outcomes before recommending a change."
  },
  {
    title: "Focus vs Improvers",
    keywords: [/focus vs improvers/i, /difference between focus and improvers/i],
    summary:
      "Focus funds back companies already leading on sustainability, while Improvers support firms with credible plans to get better through engagement."
  },
  {
    title: "Exclusions examples",
    keywords: [/examples of exclusions/i, /what exclusions/i],
    summary:
      "Common exclusions include fossil fuels above a set revenue threshold, tobacco, controversial weapons, and severe human-rights breaches."
  },
  {
    title: "Stewardship",
    keywords: [/what does stewardship mean/i, /tell me about stewardship/i, /engagement mean/i],
    summary:
      "Stewardship means fund managers using voting rights and engagement to push companies toward better sustainability practices."
  }
];

const whyNeedPattern = /why do you need( to know)?/i;

const ensureStringArray = (value) => (Array.isArray(value) ? value : []);

const appendSessionArrayEntry = (session, key, entry) => {
  if (!entry) return;
  if (!Array.isArray(session.data[key])) {
    session.data[key] = [];
  }
  session.data[key].push(entry);
};

const appendAdditionalNote = (session, note) => {
  if (!note) return;
  const existing = session.data.additional_notes ?? "";
  session.data.additional_notes = existing ? `${existing}\n${note}` : note;
};

const appendInvestmentResearchLog = (session, entry) => {
  if (!entry) return;
  if (!Array.isArray(session.data.investment_research)) {
    session.data.investment_research = [];
  }
  session.data.investment_research.push(entry);
};

const INVESTMENT_EXPLORER_PATTERNS = [
  /\b(show|list|suggest|recommend)\b.*\b(funds?|portfolios?|securities)\b/i,
  /\b(funds?|portfolios?)\b.*\b(options?|ideas|matches)\b/i,
  /\b(sustainable|esg|impact)\b.*\b(funds?|portfolios?)\b/i,
  /\binvestment options?\b/i,
  /\bmarket scan\b.*\b(funds?|portfolios?|securities)\b/i
];

const pickExactMatches = (preferred, available) => {
  const preferredSet = new Set(
    ensureArray(preferred).map((value) => normalise(value))
  );
  if (preferredSet.size === 0) {
    return [];
  }
  return ensureArray(available).filter((item) =>
    preferredSet.has(normalise(item))
  );
};

const evaluateInvestmentMatch = (session, investment) => {
  const profile = session.data?.client_profile ?? {};
  const prefs = session.data?.sustainability_preferences ?? {};
  let score = 0;
  const reasons = [];

  const objectives = ensureArray(investment.objectives);
  if (
    profile.objectives &&
    objectives.some((objective) => normalise(objective) === normalise(profile.objectives))
  ) {
    score += 2;
    reasons.push(`Supports your ${profile.objectives} objective`);
  }

  if (
    Number.isInteger(profile.risk_tolerance) &&
    Array.isArray(investment.risk_band) &&
    investment.risk_band.length === 2
  ) {
    const [minRisk, maxRisk] = investment.risk_band;
    if (profile.risk_tolerance < minRisk || profile.risk_tolerance > maxRisk) {
      return null;
    }
    score += 1;
    reasons.push(
      `Aligned to risk level ${profile.risk_tolerance} within range ${minRisk}-${maxRisk}`
    );
  }

  if (
    Number.isInteger(profile.horizon_years) &&
    Number.isFinite(investment.min_horizon_years)
  ) {
    if (profile.horizon_years < investment.min_horizon_years) {
      return null;
    }
    score += 0.5;
    reasons.push(`Designed for ${investment.min_horizon_years}+ year horizons`);
  }

  const preferenceLevel = prefs.preference_level ?? "none";
  if (preferenceLevel !== "none") {
    const supportedLevels = ensureArray(investment.preference_levels);
    if (
      supportedLevels.length > 0 &&
      !supportedLevels.some((level) => normalise(level) === normalise(preferenceLevel))
    ) {
      return null;
    }
    if (supportedLevels.length > 0) {
      score += 0.5;
      reasons.push(
        `Suitable for ${preferenceLevel.replace(/_/g, " ")} preference profiles`
      );
    }
  }

  const matchedLabels = pickExactMatches(prefs.labels_interest, investment.labels);
  if (matchedLabels.length > 0) {
    score += 1.5;
    reasons.push(`Carries ${matchedLabels.join(", ")} label alignment`);
  }

  const matchedThemes = pickExactMatches(prefs.themes, investment.themes);
  if (matchedThemes.length > 0) {
    score += 0.5;
    reasons.push(`Covers ${matchedThemes.join(", ")} themes`);
  }

  if (score === 0) {
    return null;
  }

  return { investment, score, reasons };
};

const rankInvestmentMatches = (session, universe, limit = 3) =>
  ensureArray(universe)
    .map((item) => evaluateInvestmentMatch(session, item))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

const summariseInvestmentMatch = ({ investment, reasons }) => {
  const reasonText = reasons.length
    ? `${reasons.join("; ")}.`
    : "Matches the captured objectives and sustainability profile.";
  return `• ${investment.name} (${investment.type}, ${investment.provider}, ${investment.charges}) – ${reasonText}`;
};

const hasPreferenceProfile = (session) => {
  const prefs = session.data?.sustainability_preferences ?? {};
  if (!prefs || prefs.preference_level === "none") {
    return false;
  }
  return ensureArray(prefs.labels_interest).length > 0;
};

const shouldTriggerInvestmentExplorer = (text) =>
  INVESTMENT_EXPLORER_PATTERNS.some((pattern) => pattern.test(text));

const captureProgressSnapshot = (session) => {
  const education = session.context.education ?? {};
  const options = session.context.options ?? {};
  return {
    stage: session.stage,
    onboardingStep:
      session.context.onboardingStep ?? null,
    consentStep: session.context.consentStep ?? null,
    education: {
      acknowledged: Boolean(education.acknowledged),
      summaryOffered: Boolean(education.summaryOffered),
      summarised: Boolean(education.summarised)
    },
    options: {
      preferenceLevel: options.preferenceLevel ?? null,
      step: options.step ?? null
    },
    confirmationAwaiting: Boolean(session.context.confirmationAwaiting),
    reportReady: Boolean(session.context.reportReady)
  };
};

const hasProgressed = (before, after) => {
  if (!before) return true;
  if (before.stage !== after.stage) return true;
  if (before.onboardingStep !== after.onboardingStep) return true;
  if (before.consentStep !== after.consentStep) return true;
  if (before.confirmationAwaiting !== after.confirmationAwaiting) return true;
  if (before.reportReady !== after.reportReady) return true;
  if (
    before.education.acknowledged !== after.education.acknowledged ||
    before.education.summaryOffered !== after.education.summaryOffered ||
    before.education.summarised !== after.education.summarised
  ) {
    return true;
  }
  if (
    before.options.preferenceLevel !== after.options.preferenceLevel ||
    before.options.step !== after.options.step
  ) {
    return true;
  }
  return false;
};

const summariseSessionForLLM = (session) => {
  const profile = session.data?.client_profile ?? {};
  const prefs = session.data?.sustainability_preferences ?? {};
  const consent = session.data?.consent ?? {};
  const summaryLines = [
    `Current stage: ${session.stage}`,
    `Client type: ${profile.client_type || "unspecified"}`,
    `Objective: ${profile.objectives || "unspecified"}`,
    `Horizon: ${profile.horizon_years ?? "—"} years`,
    `Risk tolerance: ${profile.risk_tolerance ?? "—"}`,
    `Capacity for loss: ${profile.capacity_for_loss || "unspecified"}`,
    `Liquidity needs: ${profile.liquidity_needs || "unspecified"}`,
    `Knowledge summary: ${profile.knowledge_experience?.summary || "—"}`,
    `Financial context provided: ${profile.financial_situation?.provided ? "yes" : "no"}`,
    `Preference level: ${prefs.preference_level || "none"}`,
    `Label interests: ${(prefs.labels_interest ?? []).join(", ") || "None"}`,
    `Impact goals: ${(prefs.impact_goals ?? []).join(", ") || "None"}`,
    `Reporting preference: ${prefs.reporting_frequency_pref || "none"}`,
    `Consent to data processing: ${
      consent?.data_processing?.granted === true ? "granted" : "pending"
    }`
  ];
  return `Session summary:\n${summaryLines.join("\n")}`;
};

const mapEventToChatMessage = (event) => {
  if (!event) return null;
  if (event.type === "message" && typeof event.content?.text === "string") {
    if (event.author === "client") {
      return { role: "user", content: event.content.text };
    }
    if (event.author === "assistant") {
      return { role: "assistant", content: event.content.text };
    }
  }
  if (event.author === "client" && event.type === "data_update") {
    const payload = JSON.stringify(event.content ?? {});
    return {
      role: "user",
      content: `Client submitted structured data: ${payload}`
    };
  }
  return null;
};

const buildChatHistory = (session) =>
  ensureArray(session.events)
    .map((event) => mapEventToChatMessage(event))
    .filter(Boolean);

const persistComplianceData = (session, compliance = {}) => {
  if (!compliance || typeof compliance !== "object") return;

  ensureStringArray(compliance.educational_requests).forEach((entry) => {
    appendSessionArrayEntry(session, "educational_requests", entry);
  });
  ensureStringArray(compliance.extra_questions).forEach((entry) => {
    appendSessionArrayEntry(session, "extra_questions", entry);
  });
  ensureStringArray(compliance.notes).forEach((note) => {
    appendAdditionalNote(session, note);
  });
};

export const handleFreeFormQuery = async (
  session,
  text,
  additionalMessages = []
) => {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return {
      messages: Array.isArray(additionalMessages) ? additionalMessages : []
    };
  }

  const history = buildChatHistory(session);
  const messages = [
    {
      role: "system",
      content: `${COMPLIANCE_SYSTEM_PROMPT}\n\n${summariseSessionForLLM(session)}`
    },
    ...history,
    { role: "user", content: trimmed }
  ];

  const aiPayload = await callComplianceResponder({ messages });
  if (!aiPayload || typeof aiPayload.reply !== "string") {
    throw new Error("Compliance assistant returned an unexpected payload");
  }

  const compliance = aiPayload.compliance ?? {};
  persistComplianceData(session, compliance);

  appendEvent(session, {
    id: randomUUID(),
    sessionId: session.id,
    author: "assistant",
    type: "message",
    content: {
      text: aiPayload.reply,
      source: "openai",
      compliance
    },
    createdAt: new Date().toISOString()
  });

  const tail = Array.isArray(additionalMessages)
    ? additionalMessages.filter((item) => typeof item === "string" && item.trim())
    : [];

  return {
    messages: [aiPayload.reply, ...tail],
    compliance
  };
};

const removeTrailingQuestionMark = (question = "") => {
  const trimmed = question.trim();
  return trimmed.endsWith("?") ? trimmed.slice(0, -1) : trimmed;
};

const getActiveQuestion = (session) => {
  if (session.context?.requireRiskOverride) {
    return "Please confirm you wish to proceed with a higher risk tolerance despite a low capacity for loss.";
  }

  switch (session.stage) {
    case "SEGMENT_B_ONBOARDING": {
      const step = session.context.onboardingStep ?? 0;
      return ONBOARDING_QUESTIONS[step] ?? null;
    }
    case "SEGMENT_C_CONSENT": {
      const step = session.context.consentStep ?? 0;
      return CONSENT_QUESTIONS[step] ?? null;
    }
    case "SEGMENT_D_EDUCATION": {
      const education = session.context.education ?? {};
      if (!education.acknowledged) {
        return "Please let me know once you’ve reviewed the ESG education points so we can continue.";
      }
      if (education.summaryOffered && !education.summarised) {
        return "Would you like me to summarise the difference between Focus and Improvers labels?";
      }
      return null;
    }
    case "SEGMENT_E_OPTIONS": {
      const options = session.context.options ?? {};
      if (!options.preferenceLevel) {
        return OPTIONS_QUESTIONS.preferenceLevel;
      }
      const step = options.step ?? 1;
      return OPTIONS_QUESTIONS[step] ?? null;
    }
    case "SEGMENT_F_CONFIRMATION":
      return "Shall I walk through your summary so you can confirm everything is correct?";
    default:
      return null;
  }
};

const buildResumePrompt = (session) => {
  const question = getActiveQuestion(session);
  if (!question) {
    return "Would you like to continue where we left off?";
  }
  const base = removeTrailingQuestionMark(question);
  return `Would you like to continue where we left off and answer "${base}?"`;
};

const getComplianceRationale = (session) => {
  if (session.context?.requireRiskOverride) {
    return COMPLIANCE_REASONS.SEGMENT_B_ONBOARDING.risk_override;
  }

  const reasons = COMPLIANCE_REASONS[session.stage];
  if (!reasons) {
    return "I ask so we can keep the conversation compliant with the FCA’s Consumer Duty and SDR requirements.";
  }

  if (session.stage === "SEGMENT_D_EDUCATION") {
    const education = session.context.education ?? {};
    if (!education.acknowledged) {
      return reasons.acknowledgement ?? reasons.summary;
    }
    if (education.summaryOffered && !education.summarised) {
      return reasons.summary;
    }
  }

  if (session.stage === "SEGMENT_E_OPTIONS") {
    const options = session.context.options ?? {};
    if (!options.preferenceLevel) {
      return reasons.preferenceLevel;
    }
    const step = options.step ?? 1;
    return reasons[step] ?? reasons.preferenceLevel;
  }

  if (session.stage === "SEGMENT_F_CONFIRMATION") {
    return reasons[0];
  }

  const stepKey = session.stage === "SEGMENT_B_ONBOARDING"
    ? session.context.onboardingStep ?? 0
    : session.stage === "SEGMENT_C_CONSENT"
      ? session.context.consentStep ?? 0
      : null;

  return (stepKey != null && reasons[stepKey])
    ? reasons[stepKey]
    : "I ask so we can keep the conversation compliant with the FCA’s Consumer Duty and SDR requirements.";
};

const findEducationModule = (text) =>
  EDUCATION_MODULES.find((module) =>
    module.keywords.some((pattern) => pattern.test(text))
  ) ?? null;

const logEducationalRequest = (session, text, moduleTitle) => {
  const entry = `Answered: ${moduleTitle} ("${text.trim()}")`;
  appendSessionArrayEntry(session, "educational_requests", entry);
  appendAdditionalNote(session, `${moduleTitle} summary shared.`);
};

const logExtraQuestion = (session, text) => {
  const entry = `Answered (${session.stage}): ${text.trim()}`;
  appendSessionArrayEntry(session, "extra_questions", entry);
  appendAdditionalNote(session, `Explained compliance rationale for "${text.trim()}".`);
};

const handleInvestmentExplorer = (session, text) => {
  if (!shouldTriggerInvestmentExplorer(text)) {
    return null;
  }

  if (!hasPreferenceProfile(session)) {
    const resumePrompt = buildResumePrompt(session);
    return {
      messages: [
        "Once we've captured your sustainability preferences I can search our authorised investment list for matches.",
        resumePrompt
      ]
    };
  }

  const authorisedMatches = rankInvestmentMatches(session, AUTHORIZED_INVESTMENTS);
  const alternativeMatches = rankInvestmentMatches(session, MARKET_ALTERNATIVES);

  if (authorisedMatches.length === 0 && alternativeMatches.length === 0) {
    const resumePrompt = buildResumePrompt(session);
    appendInvestmentResearchLog(session, {
      at: new Date().toISOString(),
      query: text,
      authorised_matches: [],
      alternative_matches: []
    });
    appendAdditionalNote(
      session,
      `Investment explorer run for "${text}" but no aligned investments were found.`
    );
    return {
      messages: [
        "I couldn't find any close matches yet. I'll flag this for an adviser to review manually.",
        resumePrompt
      ]
    };
  }

  appendInvestmentResearchLog(session, {
    at: new Date().toISOString(),
    query: text,
    authorised_matches: authorisedMatches.map((match) => match.investment.id),
    alternative_matches: alternativeMatches.map((match) => match.investment.id)
  });
  appendAdditionalNote(
    session,
    `Investment explorer run for "${text}" with ${authorisedMatches.length} authorised match(es).`
  );

  const authorisedSummary = authorisedMatches.length
    ? authorisedMatches.map(summariseInvestmentMatch).join("\n")
    : "No on-panel investments matched these preferences. I'll flag this for adviser review.";
  const alternativeSummary = alternativeMatches.length
    ? alternativeMatches.map(summariseInvestmentMatch).join("\n")
    : "The wider market scan did not surface close alternatives right now.";
  const resumePrompt = buildResumePrompt(session);

  return {
    messages: [
      `Here are on-panel investments that align with your preferences (adviser sign-off still required):\n${authorisedSummary}`,
      `Market scan alternatives meeting similar criteria (not currently on our panel):\n${alternativeSummary}`,
      `Any selection will need an adviser recommendation before you invest. ${resumePrompt}`
    ]
  };
};

const handleDetours = (session, text) => {
  if (!text) return null;

  const investmentResult = handleInvestmentExplorer(session, text);
  if (investmentResult) {
    return investmentResult;
  }

  const module = findEducationModule(text);
  if (module) {
    logEducationalRequest(session, text, module.title);
    const resumePrompt = buildResumePrompt(session);
    return {
      messages: [
        `Happy to help. ${module.summary}`,
        `Would you like the full ${module.title} explainer PDF?`,
        resumePrompt
      ]
    };
  }

  if (whyNeedPattern.test(text)) {
    logExtraQuestion(session, text);
    const resumePrompt = buildResumePrompt(session);
    return {
      messages: [
        "Thanks for asking—that’s a thoughtful question.",
        getComplianceRationale(session),
        resumePrompt
      ]
    };
  }

  return null;
};

const extractHorizonYears = (text) => {
  const match = text.match(/(\d{1,3})\s*(years?|yrs?)/i);
  if (match) {
    const value = Number.parseInt(match[1], 10);
    if (Number.isInteger(value) && value > 0) {
      return value;
    }
  }
  const trimmed = text.trim();
  if (/^\d+$/.test(trimmed)) {
    const numeric = Number.parseInt(trimmed, 10);
    if (Number.isInteger(numeric) && numeric > 0) {
      return numeric;
    }
  }
  return null;
};

const riskWordMap = {
  "very low": 1,
  low: 2,
  moderate: 4,
  medium: 4,
  balanced: 4,
  high: 6,
  "very high": 7
};

const extractRiskTolerance = (text) => {
  const direct = text.match(/risk(?: tolerance| level)?[^0-9]*([1-7])/i);
  if (direct) {
    return Number.parseInt(direct[1], 10);
  }

  if (/^\s*[1-7]\s*$/.test(text)) {
    return Number.parseInt(text.trim(), 10);
  }

  const wordMatch = text.match(/(very\s+low|very\s+high|low|medium|moderate|balanced|high)\s+risk/i);
  if (wordMatch) {
    return riskWordMap[wordMatch[1].toLowerCase()] ?? null;
  }

  const trailingMatch = text.match(/risk[^a-z]*(low|medium|moderate|balanced|high|very\s+low|very\s+high)/i);
  if (trailingMatch) {
    return riskWordMap[trailingMatch[1].toLowerCase()] ?? null;
  }

  return null;
};

const extractCapacityForLoss = (text) => {
  if (/^\s*(low|medium|high)\s*$/i.test(text)) {
    return text.trim().toLowerCase();
  }

  const prefix = text.match(/(low|medium|high)\s+(capacity|capacity for loss|loss capacity|loss tolerance)/i);
  if (prefix) {
    return prefix[1].toLowerCase();
  }

  const suffix = text.match(/(capacity for loss|loss capacity|loss tolerance)[^a-z]*(low|medium|high)/i);
  if (suffix) {
    return suffix[2].toLowerCase();
  }

  return null;
};

const handleCapacitySelection = (session, capacity) => {
  const profile = session.data.client_profile;
  const responses = [];

  profile.capacity_for_loss = capacity;
  responses.push(`Thanks for sharing that your capacity for loss is ${capacity}.`);
  session.context.onboardingStep = 5;

  if (profile.risk_tolerance >= 5 && capacity === "low") {
    session.context.requireRiskOverride = true;
    const guardrails = Array.isArray(session.data.audit.guardrail_triggers)
      ? session.data.audit.guardrail_triggers
      : (session.data.audit.guardrail_triggers = []);
    if (!guardrails.some((item) => item?.type === "risk_capacity_override" && !item?.confirmed_at)) {
      guardrails.push({
        type: "risk_capacity_override",
        triggered_at: new Date().toISOString(),
        confirmed_at: null
      });
    }
    responses.push(
      "Because you’ve chosen a higher risk tolerance with a low capacity for loss, please confirm you still wish to proceed."
    );
    return responses;
  }

  responses.push("Will you need to withdraw funds at specific times?");
  return responses;
};

const handleRiskSelection = (session, risk, originalText) => {
  const profile = session.data.client_profile;
  const responses = [];

  profile.risk_tolerance = risk;
  responses.push(`Thanks, I’ll note a risk tolerance of ${risk} on the 1–7 scale.`);

  if (profile.horizon_years && profile.horizon_years < 3 && risk >= 5) {
    const guardrails = Array.isArray(session.data.audit.guardrail_triggers)
      ? session.data.audit.guardrail_triggers
      : (session.data.audit.guardrail_triggers = []);
    if (!guardrails.some((item) => item?.type === "risk_horizon_warning")) {
      guardrails.push({
        type: "risk_horizon_warning",
        triggered_at: new Date().toISOString(),
        notes: "High risk with short horizon"
      });
    }
    responses.push(
      "⚠️ You’ve chosen a higher risk level with a shorter time horizon. I’ll flag this so your adviser can make sure it remains suitable."
    );
  }

  const capacity = extractCapacityForLoss(originalText);
  if (capacity && CAPACITY_FOR_LOSS_VALUES.includes(capacity)) {
    const capacityResponses = handleCapacitySelection(session, capacity);
    return responses.concat(capacityResponses);
  }

  session.context.onboardingStep = 4;
  responses.push(
    "If markets fall, how much loss could you afford without affecting your lifestyle? (low, medium, high)"
  );
  return responses;
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

const handleStructuredExplanation = (session, content) => {
  if (!content?.ready) {
    return {
      messages: [
        "Let me know when you're ready to begin and I'll open the onboarding form."
      ]
    };
  }

  applyDataPatch(session, {
    audit: {
      explanation_shown: true
    },
    timestamps: {
      explanation_shown_at: new Date().toISOString()
    }
  });

  session.context.onboardingStep = 0;
  return moveToStage(session, "SEGMENT_B_ONBOARDING", [
    "Let's start with your suitability information."
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
        `Great, I'll note you're investing in a ${choice} capacity.`,
        "What’s your main investment goal? (growth, income, preservation, impact, or other)"
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
        `Thanks for sharing that your main goal is ${profile.objectives}.`,
        "How long do you expect to keep this money invested? Please provide the number of years."
      ]
    };
  }

  if (step === 2) {
    const years = extractHorizonYears(text);
    if (!Number.isInteger(years) || years <= 0) {
      return {
        messages: [
          "Please provide your investment horizon as a positive whole number of years."
        ]
      };
    }

    profile.horizon_years = years;
    const messages = [
      `That makes sense — planning for around ${years} years helps me map the right strategy horizon.`,
      `So, your main goal is ${profile.objectives} with a ${years}-year horizon, correct?`
    ];

    const inferredRisk = extractRiskTolerance(text);
    if (Number.isInteger(inferredRisk) && RISK_SCALE.includes(inferredRisk)) {
      messages.push(...handleRiskSelection(session, inferredRisk, text));
      return { messages };
    }

    session.context.onboardingStep = 3;
    messages.push(
      "On a scale of 1 (very low) to 7 (very high), how comfortable are you with investment risk?"
    );
    return { messages };
  }

  if (step === 3) {
    let risk = extractRiskTolerance(text);
    if (!Number.isInteger(risk) || !RISK_SCALE.includes(risk)) {
      const parsed = parseInteger(text);
      if (Number.isInteger(parsed) && RISK_SCALE.includes(parsed)) {
        risk = parsed;
      }
    }

    if (!Number.isInteger(risk) || !RISK_SCALE.includes(risk)) {
      return {
        messages: [
          "Please choose a risk level from 1 to 7, where 1 is very low risk and 7 is very high risk."
        ]
      };
    }

    const responses = handleRiskSelection(session, risk, text);
    return { messages: responses };
  }

  if (step === 4) {
    const capacity = extractCapacityForLoss(text);
    if (!capacity || !CAPACITY_FOR_LOSS_VALUES.includes(capacity)) {
      return {
        messages: [
          "Please let me know if your capacity for loss is low, medium, or high."
        ]
      };
    }

    const responses = handleCapacitySelection(session, capacity);
    return { messages: responses };
  }

  if (step === 5) {
    const detail = text.trim();
    if (!detail) {
      return {
        messages: [
          "Even if you have no planned withdrawals, let me know so I can record it as part of suitability."
        ]
      };
    }

    profile.liquidity_needs = detail;
    session.context.onboardingStep = 6;
    return {
      messages: [
        "Thanks, I’ll note those liquidity needs for the record.",
        "Have you invested before? Please describe which instruments, how often, and for how long."
      ]
    };
  }

  if (step === 6) {
    const experience = text.trim();
    if (!experience) {
      return {
        messages: [
          "Please share a short note on your investment experience so I can evidence suitability."
        ]
      };
    }

    profile.knowledge_experience.summary = experience;
    profile.knowledge_experience.instruments = splitList(text);
    profile.knowledge_experience.frequency = /monthly|quarterly|annual|weekly/i.test(text)
      ? (text.match(/(daily|weekly|monthly|quarterly|annual)/i)?.[1] ?? "")
      : "";
    profile.knowledge_experience.duration = text.match(/\b(\d+\s*(years?|months?))\b/i)?.[0] ?? "";
    session.context.onboardingStep = 7;
    return {
      messages: [
        "Thanks for outlining your experience — that helps me tailor the conversation.",
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
        "No problem, I'll note that you prefer not to share detailed financial figures.",
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
        "Thanks. Share whatever level of detail you’re comfortable with and I’ll note it for context.",
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
      "Thank you for sharing that context — I’ll log it carefully for your adviser.",
      "We need your permission to record your answers for regulatory reporting.",
      "Do you consent to us processing your data for this advice session?"
    ]);
  }

  return {
    messages: [
      "Let me summarise before we continue."
    ]
  };
};

const handleStructuredOnboarding = (session, content) => {
  const answers = content?.answers ?? {};
  const profile = session.data.client_profile;
  const messages = [];
  const missing = [];

  if (!CLIENT_TYPES.some((type) => normalise(type) === normalise(answers.client_type))) {
    missing.push("Select a client type (individual, joint, trust, or company).");
  }
  if (!answers.objectives || !answers.objectives.trim()) {
    missing.push("Investment objective is required.");
  }

  const horizon = Number.parseInt(answers.horizon_years, 10);
  if (!Number.isInteger(horizon) || horizon <= 0) {
    missing.push("Provide the investment horizon in whole years.");
  }

  const risk = Number.parseInt(answers.risk_tolerance, 10);
  if (!RISK_SCALE.includes(risk)) {
    missing.push("Select a risk tolerance between 1 and 7.");
  }

  if (
    !CAPACITY_FOR_LOSS_VALUES.some(
      (value) => normalise(value) === normalise(answers.capacity_for_loss)
    )
  ) {
    missing.push("Capacity for loss must be low, medium, or high.");
  }

  if (!answers.liquidity_needs || !answers.liquidity_needs.trim()) {
    missing.push("Liquidity needs must be recorded.");
  }

  if (!answers.knowledge_summary || !answers.knowledge_summary.trim()) {
    missing.push("Provide a brief summary of the client's knowledge and experience.");
  }

  if (answers.financial?.provided && (!answers.financial.notes || !answers.financial.notes.trim())) {
    missing.push("Include context notes for the financial situation.");
  }

  if (missing.length > 0) {
    return { messages: missing };
  }

  profile.client_type = CLIENT_TYPES.find(
    (type) => normalise(type) === normalise(answers.client_type)
  );
  profile.objectives = answers.objectives.trim();
  profile.horizon_years = horizon;
  profile.risk_tolerance = risk;
  profile.capacity_for_loss = answers.capacity_for_loss.trim().toLowerCase();
  profile.liquidity_needs = answers.liquidity_needs.trim();
  profile.knowledge_experience.summary = answers.knowledge_summary.trim();
  profile.knowledge_experience.instruments = Array.isArray(answers.knowledge_instruments)
    ? answers.knowledge_instruments
    : splitList(answers.knowledge_summary);
  profile.knowledge_experience.frequency = answers.knowledge_frequency ?? "";
  profile.knowledge_experience.duration = answers.knowledge_duration ?? "";

  if (answers.financial?.provided) {
    profile.financial_situation = {
      provided: true,
      income: answers.financial.income ?? null,
      assets: answers.financial.assets ?? null,
      liabilities: answers.financial.liabilities ?? null,
      notes: answers.financial.notes.trim()
    };
  } else {
    profile.financial_situation = {
      provided: false,
      income: null,
      assets: null,
      liabilities: null,
      notes: ""
    };
  }

  if (profile.horizon_years < 3 && profile.risk_tolerance >= 5) {
    session.data.audit.guardrail_triggers.push({
      type: "risk_horizon_warning",
      triggered_at: new Date().toISOString(),
      notes: "High risk with short horizon"
    });
    messages.push(
      "⚠️ High risk with a short horizon has been logged for adviser review."
    );
  }

  if (profile.risk_tolerance >= 5 && profile.capacity_for_loss === "low") {
    if (!content?.confirm_override) {
      session.context.requireRiskOverride = true;
      return {
        messages: [
          "Because you've chosen a high risk tolerance with a low capacity for loss, please confirm you wish to proceed."
        ]
      };
    }

    session.context.requireRiskOverride = false;
    session.data.audit.guardrail_triggers.push({
      type: "risk_capacity_override",
      triggered_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString()
    });
  }

  session.context.onboardingStep = 9;
  session.context.consentStep = 0;

  messages.push(
    "We need your permission to record your answers for regulatory reporting."
  );
  messages.push("Do you consent to us processing your data for this advice session?");

  return moveToStage(session, "SEGMENT_C_CONSENT", messages);
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

const handleStructuredConsent = (session, content) => {
  const payload = content?.consent ?? {};
  if (!payload.data_processing) {
    return {
      messages: [
        "We need your explicit permission to process this information before continuing."
      ]
    };
  }

  const timestamp = payload.timestamp ?? new Date().toISOString();
  session.data.consent = {
    data_processing: { granted: true, timestamp },
    e_delivery: {
      granted: payload.e_delivery === true,
      timestamp
    },
    future_contact: {
      granted: payload.future_contact?.granted === true,
      purpose: payload.future_contact?.purpose ?? ""
    }
  };

  if (session.data.consent.future_contact.granted === false) {
    session.data.consent.future_contact.purpose = "";
  }

  session.data.timestamps.consent_recorded_at = timestamp;
  session.context.education = {
    acknowledged: false,
    summaryOffered: false,
    summarised: false
  };

  return moveToStage(session, "SEGMENT_D_EDUCATION", [
    "Here’s a quick ESG education pack covering key regulatory points:",
    "• ESG stands for Environmental, Social, and Governance – it highlights factors, not guaranteed outcomes.",
    "• UK SDR labels include Focus, Improvers, Impact, and Mixed Goals.",
    "• The Anti-Greenwashing Rule means we only make evidence-backed sustainability claims.",
    "• Product disclosures will always be attached for you to review.",
    "Reply 'Understood' when you’re ready to continue."
  ]);
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
        "We're halfway through. Just a few more questions about your ESG preferences.",
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
      "We're halfway through. Just a few more questions about your ESG preferences.",
      "No problem. Do you have sustainability preferences? Choose from: none, high_level, or detailed."
    ]);
  }

  return {
    messages: [
      "Let’s capture your sustainability preferences."
    ]
  };
};

const handleStructuredEducation = (session, content) => {
  if (!content?.acknowledged) {
    return {
      messages: [
        "Please review the education pack and confirm when you’re ready to continue."
      ]
    };
  }

  const wantsSummary = Boolean(content?.wants_summary);
  session.context.education = {
    acknowledged: true,
    summaryOffered: true,
    summarised: true
  };
  session.data.sustainability_preferences.educ_pack_sent = true;
  session.data.audit.educ_pack_sent = true;
  session.data.disclosures.agr_disclaimer_presented = true;
  session.data.timestamps.education_completed_at = new Date().toISOString();

  const messages = [];
  if (wantsSummary) {
    messages.push(
      "Focus funds invest in companies already leading on sustainability factors, whereas Improvers target companies with credible plans to improve."
    );
  }

  messages.push("We're halfway through. Just a few more questions about your ESG preferences.");
  messages.push(
    "Do you have sustainability preferences? Choose from: none, high_level, or detailed."
  );

  return moveToStage(session, "SEGMENT_E_OPTIONS", messages);
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
          "For fossil fuels, should I exclude all exposure, or set a revenue threshold such as under 10%? Please let me know the percentage you'd prefer."
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

const handleStructuredOptions = (session, content) => {
  const prefs = content?.preferences ?? {};
  const level = prefs.preference_level ?? "none";

  if (!PREFERENCE_LEVELS.includes(level)) {
    return { messages: ["Preference level must be none, high_level, or detailed."] };
  }

  const labels = Array.isArray(prefs.labels_interest) ? prefs.labels_interest : [];
  if (level !== "none" && labels.length === 0) {
    return { messages: ["Please choose at least one SDR label when providing preferences."] };
  }

  if (
    level !== "none" &&
    !labels.every((label) =>
      PATHWAY_NAMES.some((name) => normalise(name) === normalise(label))
    )
  ) {
    return { messages: ["One or more selected labels are not recognised SDR pathways."] };
  }

  const exclusions = Array.isArray(prefs.exclusions) ? prefs.exclusions : [];
  for (const exclusion of exclusions) {
    if (!exclusion || typeof exclusion !== "object" || !exclusion.sector) {
      return { messages: ["Each exclusion must include a sector name."] };
    }
    if (exclusion.threshold != null && Number.isNaN(Number.parseFloat(exclusion.threshold))) {
      return { messages: ["Exclusion thresholds must be numeric when provided."] };
    }
    if (
      /fossil/i.test(exclusion.sector) &&
      (exclusion.threshold == null || Number.isNaN(Number(exclusion.threshold)))
    ) {
      return { messages: ["Fossil fuel exclusions require a numeric threshold."] };
    }
  }

  const impact = ensureArray(labels).some((label) => /impact/i.test(label));
  if (impact) {
    if (!Array.isArray(prefs.impact_goals) || prefs.impact_goals.length === 0) {
      return { messages: ["Impact-labelled selections require at least one impact goal."] };
    }
    if (!prefs.reporting_frequency_pref || prefs.reporting_frequency_pref === "none") {
      return { messages: ["Impact-labelled selections require a reporting frequency other than 'none'."] };
    }
  }

  if (!REPORTING_FREQUENCY_OPTIONS.includes(prefs.reporting_frequency_pref ?? "none")) {
    return {
      messages: ["Reporting frequency must be none, quarterly, semiannual, or annual."]
    };
  }

  session.data.sustainability_preferences = {
    preference_level: level,
    labels_interest: labels,
    themes: Array.isArray(prefs.themes) ? prefs.themes : [],
    exclusions,
    impact_goals: Array.isArray(prefs.impact_goals) ? prefs.impact_goals : [],
    engagement_importance: prefs.engagement_importance ?? "",
    reporting_frequency_pref: prefs.reporting_frequency_pref ?? "none",
    tradeoff_tolerance: prefs.tradeoff_tolerance ?? "",
    educ_pack_sent: true
  };

  session.data.disclosures.agr_disclaimer_presented = true;
  session.context.options = {
    preferenceLevel: level,
    step: 5,
    pendingExclusions: false,
    pendingImpactDetails: false
  };

  return moveToStage(session, "SEGMENT_F_CONFIRMATION", [
    "Here’s what you told me. Please confirm the summary when you're ready."
  ]);
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

const handleStructuredConfirmation = (session, content) => {
  const confirmation = content?.confirmation ?? {};
  if (!confirmation.confirmed) {
    return {
      messages: [
        "Please confirm the captured summary before I can generate your report."
      ]
    };
  }

  session.data.summary_confirmation = {
    client_summary_confirmed: true,
    confirmed_at: confirmation.confirmed_at ?? new Date().toISOString(),
    edits_requested: confirmation.edits_requested ?? ""
  };

  session.context.confirmationAwaiting = false;
  session.context.reportReady = true;
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
        "We're missing some information before I can generate the report:",
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

export const handleClientTurn = async (session, text) => {
  const trimmed = String(text ?? "").trim();
  const detour = handleDetours(session, trimmed);
  if (detour) {
    saveSession(session);
    return detour;
  }

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
  const before = captureProgressSnapshot(session);
  const response = handler(session, trimmed);
  const after = captureProgressSnapshot(session);

  const progressed = hasProgressed(before, after);
  if (progressed || !trimmed) {
    saveSession(session);
    return response;
  }

  let finalResponse;
  try {
    finalResponse = await handleFreeFormQuery(
      session,
      trimmed,
      response?.messages ?? []
    );
  } catch (error) {
    const fallback = Array.isArray(response?.messages)
      ? response.messages
      : [];
    finalResponse = {
      messages: [
        ...fallback,
        "I’m unable to escalate this question to the compliance assistant right now. Please try again later or clarify your response."
      ]
    };
  }

  saveSession(session);
  return finalResponse;
};

export const handleAssistantMessage = (session, content) => {
  applyDataPatch(session, content?.stageData ?? {});
  saveSession(session);
  return { messages: [] };
};

export const handleEvent = async (session, event) => {
  if (event.author === "client" && event.type === "message") {
    return handleClientTurn(session, event.content?.text ?? "");
  }

  if (event.author === "assistant" && event.type === "message") {
    return handleAssistantMessage(session, event.content ?? {});
  }

  if (event.author === "client" && event.type === "data_update") {
    const structuredHandlers = {
      SEGMENT_A_EXPLANATION: handleStructuredExplanation,
      SEGMENT_B_ONBOARDING: handleStructuredOnboarding,
      SEGMENT_C_CONSENT: handleStructuredConsent,
      SEGMENT_D_EDUCATION: handleStructuredEducation,
      SEGMENT_E_OPTIONS: handleStructuredOptions,
      SEGMENT_F_CONFIRMATION: handleStructuredConfirmation
    };

    const handler = structuredHandlers[session.stage];
    if (handler) {
      return handler(session, event.content ?? {});
    }
  }

  return { messages: [] };
};
