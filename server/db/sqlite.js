import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resolveStorePath = () => {
  const customPath = process.env.SESSION_DB_PATH;
  if (customPath) {
    if (customPath === ":memory:") {
      return ":memory:";
    }
    return path.isAbsolute(customPath)
      ? customPath
      : path.join(process.cwd(), customPath);
  }

  const baseDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../data");
  return path.join(baseDir, "sessions.json");
};

const storePath = resolveStorePath();
const useMemoryStore = storePath === ":memory:";
if (!useMemoryStore) {
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
}

let cache = null;

const loadStore = () => {
  if (cache) {
    return cache;
  }

  if (!useMemoryStore) {
    try {
      const content = fs.readFileSync(storePath, "utf8");
      cache = JSON.parse(content);
    } catch (error) {
      cache = {};
    }
  } else {
    cache = {};
  }

  return cache;
};

const persistStore = () => {
  if (!cache) {
    cache = {};
  }
  if (!useMemoryStore) {
    fs.writeFileSync(storePath, JSON.stringify(cache, null, 2), "utf8");
  }
};

export const persistSession = (session) => {
  const store = loadStore();
  store[session.id] = session;
  cache = store;
  persistStore();
  return session;
};

export const fetchSession = (id) => {
  const store = loadStore();
  const record = store[id];
  return record ? structuredClone(record) : null;
};

export const fetchSessions = () => {
  const store = loadStore();
  return Object.values(store).map((session) => structuredClone(session));
};

export const clearSessions = () => {
  cache = {};
  persistStore();
};

export const closeDatabase = () => {
  cache = null;
};
