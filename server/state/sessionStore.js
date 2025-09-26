import { randomUUID } from "node:crypto";
import { CONVERSATION_STAGES } from "./constants.js";

const sessions = new Map();

const createEmptySessionData = () => ({
  client: null,
  acknowledgements: null,
  preferences: {
    pathways: [],
    ethical: {
      enabled: false,
      exclusions: []
    },
    stewardship: {
      discretion: "fund_manager"
    }
  },
  questionnaire_used: false,
  products: [],
  adviser_notes: "",
  fees: {
    bespoke: false,
    explanation: ""
  },
  audit: {
    events: [],
    ip: null
  },
  report: {
    version: "v1.0",
    doc_url: null,
    signed_url: null,
    status: "draft",
    preview: null
  }
});

export const createSession = ({ ip } = {}) => {
  const id = randomUUID();
  const timestamp = new Date().toISOString();

  const session = {
    id,
    stage: CONVERSATION_STAGES[0],
    createdAt: timestamp,
    updatedAt: timestamp,
    data: createEmptySessionData(),
    events: [],
    context: {
      profileStep: 0,
      educationAcknowledged: false,
      preference: {
        allocationsCaptured: false,
        needImpactThemes: false,
        needEthicalDetail: false,
        stewardshipAnswered: false
      }
    }
  };

  if (ip) {
    session.data.audit.ip = ip;
  }

  sessions.set(id, session);
  return session;
};

export const listSessions = () => Array.from(sessions.values());

export const getSession = (id) => sessions.get(id) ?? null;

const touchSession = (session) => {
  session.updatedAt = new Date().toISOString();
  return session;
};

export const saveSession = (session) => {
  touchSession(session);
  sessions.set(session.id, session);
  return session;
};

export const setStage = (session, stage) => {
  if (!CONVERSATION_STAGES.includes(stage)) {
    return session;
  }

  session.stage = stage;
  touchSession(session);
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
  return session;
};

export const toPublicSession = (session) => {
  const clone = structuredClone(session);
  return clone;
};
