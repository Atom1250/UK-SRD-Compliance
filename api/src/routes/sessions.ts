import { Router } from "express";
import { randomUUID } from "crypto";
import {
  advanceStage,
  createInitialState,
  getStagePrompt
} from "../conversation/stateMachine.js";
import { sessionStore } from "../utils/inMemoryStore.js";
import { validateSessionPayload } from "../schemas/session.js";

export const sessionsRouter = Router();

sessionsRouter.post("/", (_req, res) => {
  const id = randomUUID();
  const state = createInitialState(id);
  sessionStore.save(state);

  return res.status(201).json({
    session: state,
    messages: [getStagePrompt(state.stage)]
  });
});

sessionsRouter.get("/:id", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  return res.json({ session, messages: [getStagePrompt(session.stage)] });
});

sessionsRouter.post("/:id/advance", (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const result = advanceStage(session);
  sessionStore.save(result.session);
  return res.json(result);
});

sessionsRouter.post("/:id/payload", (req, res) => {
  try {
    const parsed = validateSessionPayload(req.body);
    return res.json({ valid: true, data: parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return res.status(400).json({ valid: false, error: message });
  }
});
