import { randomUUID } from "node:crypto";
import { CONVERSATION_STAGES } from "./constants.js";
import {
  persistSession,
  fetchSession,
  fetchSessions,
  clearSessions
} from "../db/sqlite.js";

const createEmptySessionData = (sessionId) => ({
  session_id: sessionId,
  client_profile: {
    client_type: "",
    objectives: "",
    horizon_years: null,
    risk_tolerance: null,
    capacity_for_loss: "",
    liquidity_needs: "",
    knowledge_experience: {
      summary: "",
      instruments: [],
      frequency: "",
      duration: ""
    },
    financial_situation: {
      provided: false,
      income: null,
      assets: null,
      liabilities: null,
      notes: ""
    }
  },
  sustainability_preferences: {
    preference_level: "none",
    labels_interest: [],
    themes: [],
    exclusions: [],
    impact_goals: [],
    engagement_importance: "",
    reporting_frequency_pref: "none",
    tradeoff_tolerance: "",
    educ_pack_sent: false
  },
  consent: {
    data_processing: null,
    e_delivery: null,
    future_contact: {
      granted: null,
      purpose: ""
    }
  },
  summary_confirmation: {
    client_summary_confirmed: false,
    confirmed_at: null,
    edits_requested: ""
  },
  advice_outcome: {
    recommendation: "",
    rationale: "",
    sust_fit: "",
    costs_summary: "",
    adviser_notes: "",
    fee_details: {
      bespoke: false,
      explanation: ""
    }
  },
  disclosures: {
    documents: [],
    agr_disclaimer_presented: false
  },
  prod_governance: {
    target_market_match: null,
    manufacturer_info_complete: true
  },
  timestamps: {
    explanation_shown_at: null,
    consent_recorded_at: null,
    education_completed_at: null,
    report_generated_at: null,
    session_closed_at: null
  },
  report: {
    version: "v1.0",
    doc_url: null,
    signed_url: null,
    status: "draft",
    preview: null
  },
  audit: {
    events: [],
    ip: null,
    explanation_shown: false,
    educ_pack_sent: false,
    guardrail_triggers: [],
    report_hash: null
  },
  educational_requests: [],
  extra_questions: [],
  investment_research: [],
  additional_notes: ""
});

export const createSession = ({ ip } = {}) => {
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  const session = {
    id,
    stage: CONVERSATION_STAGES[0],
    createdAt: timestamp,
    updatedAt: timestamp,
    data: createEmptySessionData(id),
    events: [],
    context: {
      onboardingStep: 0,
      requireRiskOverride: false,
      consentStep: 0,
      education: {
        acknowledged: false,
        summaryOffered: false,
        summarised: false
      },
      options: {
        preferenceLevel: null,
        step: 0,
        pendingExclusions: false,
        pendingImpactDetails: false
      },
      confirmationAwaiting: false,
      reportReady: false
    }
  };

  if (ip) {
    session.data.audit.ip = ip;
  }

  persistSession(session);
  return session;
};

export const listSessions = () => fetchSessions();

export const getSession = (id) => fetchSession(id) ?? null;

const touchSession = (session) => {
  session.updatedAt = new Date().toISOString();
  return session;
};

export const saveSession = (session) => {
  touchSession(session);
  persistSession(session);
  return session;
};

export const setStage = (session, stage) => {
  if (!CONVERSATION_STAGES.includes(stage)) {
    return session;
  }

  session.stage = stage;
  touchSession(session);
  persistSession(session);
  return session;
};

const deepMerge = (target, patch) => {
  if (!patch || typeof patch !== "object") {
    return target;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key], value);
    } else {
      target[key] = structuredClone(value);
    }
  }

  return target;
};

export const applyDataPatch = (session, patch) => {
  if (!patch || typeof patch !== "object") {
    return session;
  }

  deepMerge(session.data, patch);
  touchSession(session);
  persistSession(session);
  return session;
};

export const appendEvent = (session, event) => {
  session.events.push(event);
  session.data.audit.events.push({
    id: event.id,
    author: event.author,
    type: event.type,
    createdAt: event.createdAt
  });
  touchSession(session);
  persistSession(session);
  return session;
};

export const toPublicSession = (session) => {
  const clone = structuredClone(session);
  return clone;
};

export const resetSessions = () => {
  clearSessions();
};
