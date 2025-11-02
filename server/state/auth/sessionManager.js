import { randomUUID } from "node:crypto";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
export const SESSION_COOKIE_NAME = "auth_token";
export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

const sessions = new Map();

export const createAuthSession = (user) => {
  const token = randomUUID();
  const expiresAt = Date.now() + SESSION_TTL_MS;

  sessions.set(token, {
    userId: user.id,
    role: user.role,
    expiresAt
  });

  return { token, expiresAt };
};

export const getSession = (token) => {
  if (!token) return null;
  const record = sessions.get(token);
  if (!record) return null;

  if (record.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return record;
};

export const touchSession = (token) => {
  const record = sessions.get(token);
  if (!record) return null;
  record.expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, record);
  return record;
};

export const destroySession = (token) => {
  if (!token) return;
  sessions.delete(token);
};

export const purgeExpiredSessions = () => {
  const now = Date.now();
  for (const [token, record] of sessions.entries()) {
    if (record.expiresAt <= now) {
      sessions.delete(token);
    }
  }
};
