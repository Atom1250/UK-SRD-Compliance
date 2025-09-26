import {
  ATR_VALUES,
  CFL_VALUES,
  PATHWAY_ALIASES,
  PATHWAY_DETAILS,
  PATHWAY_NAMES,
  STEWARDSHIP_OPTIONS,
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

const yesPatterns = /\b(yes|yep|i (consent|agree|understand)|sure|ok(ay)?)\b/i;

const normalise = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const PATHWAY_ALIAS_INDEX = PATHWAY_NAMES.flatMap((name) => {
  const aliases = [name, ...(PATHWAY_ALIASES[name] ?? [])];
  return aliases
    .map((alias) => normalise(alias))
    .filter(Boolean)
    .map((alias) => ({ alias, name }));
}).sort((a, b) => b.alias.length - a.alias.length);

const findPathwayByAlias = (fragment) => {
  const normalisedFragment = normalise(fragment);
  if (!normalisedFragment) {
    return null;
  }

  const padded = ` ${normalisedFragment} `;
  const match = PATHWAY_ALIAS_INDEX.find(({ alias }) =>
    padded.includes(` ${alias} `)
  );

  return match?.name ?? null;
};

const findPathwaysInText = (text) => {
  const normalisedText = normalise(text);
  if (!normalisedText) {
    return [];
  }

  const padded = ` ${normalisedText} `;
  const results = [];

  for (const entry of PATHWAY_ALIAS_INDEX) {
    if (padded.includes(` ${entry.alias} `) && !results.includes(entry.name)) {
      results.push(entry.name);
    }
  }

  return results;
};

const splitList = (text) =>
  text
    .split(/[,\n]|\band\b/gi)
    .map((item) => item.trim())
    .filter(Boolean);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseAllocations = (input) => {
  const chunks = splitList(input.replace(/percent|%/gi, "%"));
  const allocations = [];

  for (const chunk of chunks) {
    const percentMatch = chunk.match(/(-?\d{1,3})/);
    if (!percentMatch) {
      continue;
    }

    const percent = Number.parseInt(percentMatch[1], 10);
    if (Number.isNaN(percent)) {
      continue;
    }

    let pathway = findPathwayByAlias(chunk);
    if (!pathway) {
      for (const name of PATHWAY_NAMES) {
        const pattern = new RegExp(escapeRegex(name), "i");
        if (pattern.test(chunk)) {
          pathway = name;
          break;
        }
      }
    }

    if (!pathway) {
      continue;
    }

    allocations.push({ name: pathway, allocation_pct: percent });
  }

  return allocations;
};

const ensureClientShape = (session) => {
  if (!session.data.client) {
    session.data.client = {
      id: session.data.client?.id ?? session.id,
      name: "",
      contact: { email: "", phone: "" },
      risk: { atr: "", cfl: "", horizon_years: 0 }
    };
  }
};

const ensurePreferenceDefaults = (session) => {
  if (!session.data.preferences) {
    session.data.preferences = {
      pathways: [],
      ethical: { enabled: false, exclusions: [] },
      stewardship: { discretion: "fund_manager" }
    };
  }
};

const stageResponse = (session, stage, additionalMessages = []) => {
  if (session.stage !== stage) {
    setStage(session, stage);
  }

  const prompt = STAGE_PROMPTS[stage];
  return prompt ? [prompt, ...additionalMessages] : additionalMessages;
};

const moveToStage = (session, stage, extraMessages = []) => {
  const messages = stageResponse(session, stage, extraMessages);
  saveSession(session);
  return { messages };
};

const handleConsent = (session, text) => {
  if (!yesPatterns.test(text)) {
    return {
      messages: [
        "I need your explicit consent to continue. Please reply with 'Yes' if you agree to proceed." 
      ]
    };
  }

  applyDataPatch(session, {
    acknowledgements: {
      read_informed_choice: false,
      timestamp: new Date().toISOString()
    },
    audit: {
      events: session.data.audit.events,
      ip: session.data.audit.ip
    }
  });

  session.context.profileStep = 0;

  return moveToStage(session, "S1_IDENTITY_PROFILE", [
    "Thank you. Let's begin with a few details about you.",
    "What is your full name?"
  ]);
};

const handleProfile = (session, text) => {
  ensureClientShape(session);
  const client = session.data.client;
  const step = session.context.profileStep ?? 0;

  if (step === 0) {
    client.name = text.trim();
    session.context.profileStep = 1;
    saveSession(session);
    return { messages: ["Thanks, " + client.name + ". What is your email address?"] };
  }

  if (step === 1) {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(text.trim())) {
      return { messages: ["That email doesn't look valid. Could you double-check and resend it?"] };
    }
    client.contact.email = text.trim();
    session.context.profileStep = 2;
    saveSession(session);
    return {
      messages: [
        "Got it. Which attitude to risk (ATR) best describes you? Choose from: " +
          ATR_VALUES.join(", ") + "."
      ]
    };
  }

  if (step === 2) {
    const choice = ATR_VALUES.find(
      (value) => normalise(value) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose one of the ATR options: " + ATR_VALUES.join(", ") + "."
        ]
      };
    }
    client.risk.atr = choice;
    session.context.profileStep = 3;
    saveSession(session);
    return {
      messages: [
        "Thank you. What is your capacity for loss (CfL)? Options: " +
          CFL_VALUES.join(", ") + "."
      ]
    };
  }

  if (step === 3) {
    const choice = CFL_VALUES.find(
      (value) => normalise(value) === normalise(text)
    );
    if (!choice) {
      return {
        messages: [
          "Please choose one of the CfL options: " + CFL_VALUES.join(", ") + "."
        ]
      };
    }
    client.risk.cfl = choice;
    session.context.profileStep = 4;
    saveSession(session);
    return {
      messages: [
        "Understood. What is your investment horizon in years? (Please enter a number.)"
      ]
    };
  }

  if (step === 4) {
    const years = Number.parseInt(text.trim(), 10);
    if (!Number.isFinite(years) || years <= 0) {
      return {
        messages: ["Please provide the number of years as a positive whole number."]
      };
    }
    client.risk.horizon_years = years;
    session.context.profileStep = 5;
    saveSession(session);
    return {
      messages: [
        "Thanks. Which product wrappers are you considering? (For example: ISA, Pension)."
      ]
    };
  }

  if (step === 5) {
    const wrappers = splitList(text);
    applyDataPatch(session, {
      products: wrappers.map((wrapper) => ({ wrapper }))
    });
    session.context.profileStep = 6;
    session.context.educationAcknowledged = false;

    return moveToStage(session, "S2_EDUCATION", [
      "Great. Here's a quick overview of each pathway: Conventional, Conventional incl. ESG, Improvers, Focus, Impact, Mixed Goals, Ethical, and Philanthropy. None is ranked above the others—they simply suit different objectives.",
      "If you'd like more detail about any pathway, just mention its name (for example, 'Tell me about Focus') and I'll expand.",
      "Please confirm once you've read this summary so we can record your informed choice acknowledgment."
    ]);
  }

  return { messages: ["Let me summarise before we continue."] };
};

const handleEducation = (session, text) => {
  const requestedPathways = findPathwaysInText(text);
  const wantsMoreDetail = /\b(more|tell|learn|detail|explain|about)\b/i.test(text);

  if (
    requestedPathways.length > 0 &&
    (!yesPatterns.test(text) || wantsMoreDetail)
  ) {
    const details = requestedPathways
      .map((name) => PATHWAY_DETAILS[name])
      .filter(Boolean);
    return {
      messages: [
        ...details,
        "Let me know when you're comfortable to proceed by replying with 'I understand'."
      ]
    };
  }

  if (!yesPatterns.test(text)) {
    return {
      messages: [
        "Take your time. When you're ready, reply with 'I understand' so I can log your acknowledgment."
      ]
    };
  }

  applyDataPatch(session, {
    acknowledgements: {
      read_informed_choice: true,
      timestamp: new Date().toISOString()
    }
  });

  session.context.preference = {
    allocationsCaptured: false,
    needImpactThemes: false,
    needEthicalDetail: false,
    stewardshipAnswered: false
  };

  return moveToStage(session, "S3_PREFERENCE_CAPTURE", [
    "Which pathways would you like to select and how would you allocate percentages between them? You can reply for example: 'Focus 50%, Impact 30%, Conventional incl. ESG 20%'."
  ]);
};

const applyPreferenceAllocations = (session, allocations) => {
  ensurePreferenceDefaults(session);
  const unique = new Map();
  for (const allocation of allocations) {
    unique.set(allocation.name, allocation);
  }
  session.data.preferences.pathways = Array.from(unique.values());
};

const handlePreferenceCapture = (session, text) => {
  ensurePreferenceDefaults(session);
  const prefContext = session.context.preference ?? {
    allocationsCaptured: false,
    needImpactThemes: false,
    needEthicalDetail: false,
    stewardshipAnswered: false
  };

  if (!prefContext.allocationsCaptured) {
    const allocations = parseAllocations(text);
    const total = allocations.reduce((sum, item) => sum + item.allocation_pct, 0);

    if (allocations.length === 0 || total !== 100) {
      return {
        messages: [
          "I couldn't record that. Please list each pathway with its percentage so the total equals 100."
        ]
      };
    }

    applyPreferenceAllocations(session, allocations);

    prefContext.allocationsCaptured = true;
    prefContext.needImpactThemes = session.data.preferences.pathways.some((pathway) =>
      [
        "Sustainability: Focus",
        "Sustainability: Impact",
        "Sustainability: Mixed Goals"
      ].includes(pathway.name)
    );
    prefContext.needEthicalDetail = session.data.preferences.pathways.some(
      (pathway) => pathway.name === "Ethical"
    );

    session.context.preference = prefContext;
    saveSession(session);

    if (prefContext.needImpactThemes) {
      return {
        messages: [
          "Thanks. Which SDG themes or impact goals should we highlight for your Focus/Impact/Mixed Goals pathways?"
        ]
      };
    }

    if (prefContext.needEthicalDetail) {
      return {
        messages: [
          "Please list any ethical screens, inclusions, or exclusions you'd like noted."
        ]
      };
    }

    return {
      messages: [
        "Would you like to leave stewardship discretion with the fund manager or complete a questionnaire yourself?"
      ]
    };
  }

  if (prefContext.needImpactThemes) {
    const items = splitList(text);
    for (const pathway of session.data.preferences.pathways) {
      if (pathway.name === "Sustainability: Focus") {
        pathway.themes = items;
        pathway.uses_sdgs = true;
      }
      if (pathway.name === "Sustainability: Impact") {
        pathway.impact_goals = items;
        pathway.uses_sdgs = true;
      }
      if (pathway.name === "Sustainability: Mixed Goals") {
        pathway.themes = items;
        pathway.impact_goals = items;
        pathway.uses_sdgs = true;
      }
    }
    prefContext.needImpactThemes = false;
    session.context.preference = prefContext;
    saveSession(session);

    if (prefContext.needEthicalDetail) {
      return {
        messages: [
          "Noted. Please list any ethical screens, inclusions, or exclusions you'd like documented."
        ]
      };
    }

    return {
      messages: [
        "Would you like to leave stewardship discretion with the fund manager or complete a questionnaire yourself?"
      ]
    };
  }

  if (prefContext.needEthicalDetail) {
    const noPreference = /\b(no|none|not at this time)\b/i;
    if (noPreference.test(text)) {
      session.data.preferences.ethical = {
        enabled: false,
        exclusions: []
      };
    } else {
      session.data.preferences.ethical = {
        enabled: true,
        exclusions: splitList(text)
      };
    }
    prefContext.needEthicalDetail = false;
    session.context.preference = prefContext;
    saveSession(session);

    return {
      messages: [
        "Would you like to leave stewardship discretion with the fund manager or complete a questionnaire yourself?"
      ]
    };
  }

  if (!prefContext.stewardshipAnswered) {
    const answer = normalise(text);
    const option = STEWARDSHIP_OPTIONS.find((item) => answer.includes(item.replace("_", " ")));

    if (!option) {
      return {
        messages: [
          "Please let me know if the discretion should stay with the fund manager or if you'd prefer to complete a questionnaire."
        ]
      };
    }

    session.data.preferences.stewardship = { discretion: option };
    session.context.preference.stewardshipAnswered = true;
    session.context.preference.allocationsCaptured = true;
    session.context.preference.needEthicalDetail = false;
    session.context.preference.needImpactThemes = false;

    return moveToStage(session, "S4_ADVISER_VALIDATION", [
      "Perfect. I'll package this for your adviser to review the suitability narrative.",
      "When you're ready, type 'preview' and I'll build a draft report for you to check before signature."
    ]);
  }

  return { messages: ["Let me know when you'd like the preview."] };
};

const summarisePreferences = (session) => {
  const lines = [];
  const clientName = session.data.client?.name ?? "Client";
  lines.push(`Preference Pathway Summary for ${clientName}`);
  lines.push("Allocations:");
  for (const pathway of session.data.preferences.pathways) {
    const details = [];
    if (pathway.themes?.length) {
      details.push(`Themes: ${pathway.themes.join(", ")}`);
    }
    if (pathway.impact_goals?.length) {
      details.push(`Impact goals: ${pathway.impact_goals.join(", ")}`);
    }
    lines.push(`- ${pathway.name}: ${pathway.allocation_pct}%${
      details.length ? ` (${details.join("; ")})` : ""
    }`);
  }
  if (session.data.preferences.ethical?.enabled) {
    lines.push(
      `Ethical exclusions: ${session.data.preferences.ethical.exclusions.join(", ")}`
    );
  }
  lines.push(
    `Stewardship discretion: ${session.data.preferences.stewardship?.discretion}`
  );
  return lines.join("\n");
};

const handleAdviserValidation = (session, text) => {
  if (!/preview|ready|build/i.test(text)) {
    return {
      messages: [
        "Once you're ready for the preview, reply with 'Preview' or 'Ready'."
      ]
    };
  }

  const validation = validateSessionData(session);
  if (!validation.valid) {
    return {
      messages: [
        "We're missing a few details before I can produce the report:",
        ...validation.issues
      ]
    };
  }

  session.data.adviser_notes =
    session.data.adviser_notes ||
    `Session ${session.id} auto-generated narrative. ATR ${session.data.client?.risk?.atr}, CfL ${session.data.client?.risk?.cfl}.`;

  return moveToStage(session, "S5_PREVIEW_APPROVAL", [
    "Here's a summary of what we've captured:",
    summarisePreferences(session),
    "Reply with 'Approve' when this looks right and I'll generate the PDF report."
  ]);
};

const handlePreviewApproval = (session, text) => {
  if (!/approve|looks good|confirm/i.test(text)) {
    return {
      messages: [
        "Let me know once you approve the draft so I can create the final report."
      ]
    };
  }

  const validation = validateSessionData(session);
  if (!validation.valid) {
    return {
      messages: [
        "A validation check failed right before report generation:",
        ...validation.issues
      ]
    };
  }

  const artifacts = generateReportArtifacts(session);
  storeReportArtifacts(session.id, artifacts.pdfBuffer);

  applyDataPatch(session, {
    report: {
      status: "draft",
      doc_url: `/api/sessions/${session.id}/report.pdf`,
      preview: artifacts.preview,
      version: session.data.report.version,
      signed_url: session.data.report.signed_url ?? null
    }
  });

  return moveToStage(session, "S6_E_SIGNATURE", [
    "I've generated your report. You can review it below and download the PDF when you're ready.",
    "We'll keep the e-signature step static for now, but everything is ready for adviser review."
  ]);
};

const handleESignature = () => ({
  messages: [
    "The report is available in your downloads. An adviser will trigger the e-signature request when appropriate."
  ]
});

export const handleClientTurn = (session, text) => {
  const stageHandlers = {
    S0_CONSENT: handleConsent,
    S1_IDENTITY_PROFILE: handleProfile,
    S2_EDUCATION: handleEducation,
    S3_PREFERENCE_CAPTURE: handlePreferenceCapture,
    S4_ADVISER_VALIDATION: handleAdviserValidation,
    S5_PREVIEW_APPROVAL: handlePreviewApproval,
    S6_E_SIGNATURE: handleESignature,
    S7_ARCHIVE: () => ({
      messages: [
        "This session is already archived. If you need changes, please start a new one."
      ]
    })
  };

  const handler = stageHandlers[session.stage] ?? (() => ({ messages: [] }));
  const response = handler(session, text.trim());
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
