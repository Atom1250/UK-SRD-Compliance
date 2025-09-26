import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import {
  createSession,
  getSession,
  listSessions,
  saveSession,
  appendEvent,
  applyDataPatch,
  toPublicSession
} from "./state/sessionStore.js";
import { validateSessionData } from "./state/validateSession.js";
import {
  EVENT_AUTHORS,
  EVENT_TYPES,
  STAGE_PROMPTS
} from "./state/constants.js";
import {
  sendJSON,
  sendText,
  sendOptions,
  serveStaticFile
} from "./httpUtils.js";
import { handleEvent } from "./state/conversationEngine.js";
import { getReportArtifact } from "./report/reportStore.js";

const API_PREFIX = "/api";

const readBody = async (req) => {
  if (req.method === "GET" || req.method === "HEAD") {
    return {};
  }

  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) {
      throw new Error("Request body too large");
    }
  }

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }
};

const ensureSession = (res, id) => {
  const session = getSession(id);
  if (!session) {
    sendJSON(res, 404, { error: "Session not found" });
    return null;
  }
  return session;
};

const handleCreateSession = (req, res) => {
  const session = createSession({ ip: req.socket.remoteAddress });
  sendJSON(res, 201, {
    session: toPublicSession(session),
    messages: [STAGE_PROMPTS[session.stage]]
  });
};

const handleGetSession = (res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;
  sendJSON(res, 200, {
    session: toPublicSession(session),
    messages: [STAGE_PROMPTS[session.stage]]
  });
};

const handleAppendEvent = async (req, res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;

  const body = await readBody(req);
  const { author, type, content = {}, stageData } = body;

  if (!EVENT_AUTHORS.includes(author)) {
    sendJSON(res, 400, { error: "Invalid event author" });
    return;
  }

  if (!EVENT_TYPES.includes(type)) {
    sendJSON(res, 400, { error: "Invalid event type" });
    return;
  }

  if (typeof content !== "object") {
    sendJSON(res, 400, { error: "Event content must be an object" });
    return;
  }

  if (stageData && typeof stageData !== "object") {
    sendJSON(res, 400, { error: "stageData must be an object when provided" });
    return;
  }

  const event = {
    id: randomUUID(),
    sessionId: session.id,
    author,
    type,
    content,
    createdAt: new Date().toISOString()
  };

  appendEvent(session, event);
  if (stageData) {
    applyDataPatch(session, stageData);
  }

  const result = handleEvent(session, event);
  saveSession(session);

  sendJSON(res, 201, {
    event,
    session: toPublicSession(session),
    messages: result.messages
  });
};

const handleValidate = (res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;
  const validation = validateSessionData(session);
  sendJSON(res, 200, {
    session: toPublicSession(session),
    validation
  });
};

const handleReportGeneration = async (req, res) => {
  const body = await readBody(req);
  const sessionId = body.session_id;
  const session = ensureSession(res, sessionId);
  if (!session) return;

  const validation = validateSessionData(session);
  if (!validation.valid) {
    sendJSON(res, 422, {
      error: "Session is not ready for report generation",
      issues: validation.issues
    });
    return;
  }

  session.data.report.doc_url = `memory://reports/${session.id}.docx`;
  session.data.report.status = "draft";
  saveSession(session);

  sendJSON(res, 201, {
    report: session.data.report,
    session: toPublicSession(session)
  });
};

const handleCreateEnvelope = async (req, res) => {
  const body = await readBody(req);
  const sessionId = body.session_id;
  const session = ensureSession(res, sessionId);
  if (!session) return;

  const signUrl = `https://example.com/sign/${session.id}`;
  session.data.report.status = "awaiting_signature";
  session.data.report.signed_url = null;
  saveSession(session);

  sendJSON(res, 201, {
    envelope: {
      id: `env_${session.id}`,
      sign_url: signUrl
    },
    session: toPublicSession(session)
  });
};

const handleEnvelopeWebhook = async (req, res) => {
  const body = await readBody(req);
  const sessionId = body.session_id;
  const session = ensureSession(res, sessionId);
  if (!session) return;

  if (body.status === "completed" && body.signed_url) {
    session.data.report.status = "completed";
    session.data.report.signed_url = body.signed_url;
  }

  saveSession(session);
  sendText(res, 202, "Webhook received");
};

const handleListCases = (res) => {
  const cases = listSessions().map((session) => ({
    id: session.id,
    stage: session.stage,
    updatedAt: session.updatedAt,
    clientName: session.data.client?.name ?? null,
    pathwayCount: session.data.preferences?.pathways?.length ?? 0
  }));

  sendJSON(res, 200, { cases });
};

const handleGetCase = (res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;
  sendJSON(res, 200, { case: toPublicSession(session) });
};

const handlePatchCase = async (req, res, id) => {
  const session = ensureSession(res, id);
  if (!session) return;

  const body = await readBody(req);
  const { adviser_notes, fees, overrides } = body;

  const patch = {};
  if (typeof adviser_notes === "string") {
    patch.adviser_notes = adviser_notes;
  }
  if (fees && typeof fees === "object") {
    patch.fees = fees;
  }
  if (overrides && typeof overrides === "object") {
    Object.assign(patch, overrides);
  }

  applyDataPatch(session, patch);

  appendEvent(session, {
    id: randomUUID(),
    sessionId: session.id,
    author: "adviser",
    type: "note",
    content: {
      adviser_notes: adviser_notes ?? null
    },
    createdAt: new Date().toISOString()
  });

  saveSession(session);
  sendJSON(res, 200, { case: toPublicSession(session) });
};

export const handleRequest = async (req, res) => {
  if (req.method === "OPTIONS") {
    sendOptions(res);
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (!pathname.startsWith(API_PREFIX)) {
    await serveStaticFile(res, pathname);
    return;
  }

  const apiPath = pathname.slice(API_PREFIX.length) || "/";
  const segments = apiPath.split("/").filter(Boolean);

  try {
    if (req.method === "GET" && apiPath === "/health") {
      sendJSON(res, 200, { status: "ok" });
      return;
    }

    if (req.method === "POST" && apiPath === "/sessions") {
      handleCreateSession(req, res);
      return;
    }

    if (segments[0] === "sessions" && segments.length >= 2) {
      const sessionId = segments[1];
      const tail = segments.slice(2).join("/");

      if (req.method === "GET" && segments.length === 2) {
        handleGetSession(res, sessionId);
        return;
      }

      if (req.method === "POST" && tail === "events") {
        await handleAppendEvent(req, res, sessionId);
        return;
      }

      if ((req.method === "POST" || req.method === "GET") && tail === "validate") {
        handleValidate(res, sessionId);
        return;
      }

      if (req.method === "GET" && tail === "report.pdf") {
        const pdf = getReportArtifact(sessionId);
        if (!pdf) {
          sendJSON(res, 404, { error: "Report not generated yet" });
          return;
        }

        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="preference-pathway-${sessionId}.pdf"`,
          "Content-Length": pdf.length
        });
        res.end(pdf);
        return;
      }
    }

    if (req.method === "POST" && apiPath === "/reports") {
      await handleReportGeneration(req, res);
      return;
    }

    if (req.method === "POST" && apiPath === "/esign/envelopes") {
      await handleCreateEnvelope(req, res);
      return;
    }

    if (req.method === "POST" && apiPath === "/esign/webhook") {
      await handleEnvelopeWebhook(req, res);
      return;
    }

    if (segments[0] === "adviser" && segments[1] === "cases") {
      if (req.method === "GET" && segments.length === 2) {
        handleListCases(res);
        return;
      }

      if (segments.length === 3) {
        const caseId = segments[2];
        if (req.method === "GET") {
          handleGetCase(res, caseId);
          return;
        }
        if (req.method === "PATCH") {
          await handlePatchCase(req, res, caseId);
          return;
        }
      }
    }

    sendJSON(res, 404, { error: "Route not found" });
  } catch (error) {
    const status = error.status ?? 500;
    sendJSON(res, status, {
      error: error.message ?? "Unexpected error"
    });
  }
};
