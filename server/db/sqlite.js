import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cacheManager from "../cache/cacheManager.js";

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
let indexes = {
  byStage: new Map(),
  byClientType: new Map(),
  byCreatedAt: new Map(),
  byUpdatedAt: new Map()
};

const loadStore = () => {
  if (cache) {
    return cache;
  }

  if (!useMemoryStore) {
    try {
      const content = fs.readFileSync(storePath, "utf8");
      cache = JSON.parse(content);
      
      // Rebuild indexes after loading
      rebuildIndexes();
    } catch (error) {
      cache = {};
    }
  } else {
    cache = {};
  }

  return cache;
};

const rebuildIndexes = () => {
  // Clear existing indexes
  indexes.byStage.clear();
  indexes.byClientType.clear();
  indexes.byCreatedAt.clear();
  indexes.byUpdatedAt.clear();
  
  if (!cache) return;
  
  // Rebuild indexes from current data
  Object.values(cache).forEach(session => {
    if (!session || !session.id) return;
    
    // Index by stage
    const stage = session.stage || 'unknown';
    if (!indexes.byStage.has(stage)) {
      indexes.byStage.set(stage, new Set());
    }
    indexes.byStage.get(stage).add(session.id);
    
    // Index by client type
    const clientType = session.data?.client_profile?.client_type || 'unknown';
    if (!indexes.byClientType.has(clientType)) {
      indexes.byClientType.set(clientType, new Set());
    }
    indexes.byClientType.get(clientType).add(session.id);
    
    // Index by creation date (by day for efficient range queries)
    const createdDate = new Date(session.createdAt).toISOString().split('T')[0];
    if (!indexes.byCreatedAt.has(createdDate)) {
      indexes.byCreatedAt.set(createdDate, new Set());
    }
    indexes.byCreatedAt.get(createdDate).add(session.id);
    
    // Index by update date
    const updatedDate = new Date(session.updatedAt || session.createdAt).toISOString().split('T')[0];
    if (!indexes.byUpdatedAt.has(updatedDate)) {
      indexes.byUpdatedAt.set(updatedDate, new Set());
    }
    indexes.byUpdatedAt.get(updatedDate).add(session.id);
  });
};

const updateIndexes = (session) => {
  if (!session || !session.id) return;
  
  // Update stage index
  const stage = session.stage || 'unknown';
  if (!indexes.byStage.has(stage)) {
    indexes.byStage.set(stage, new Set());
  }
  indexes.byStage.get(stage).add(session.id);
  
  // Update client type index
  const clientType = session.data?.client_profile?.client_type || 'unknown';
  if (!indexes.byClientType.has(clientType)) {
    indexes.byClientType.set(clientType, new Set());
  }
  indexes.byClientType.get(clientType).add(session.id);
  
  // Update date indexes
  const createdDate = new Date(session.createdAt).toISOString().split('T')[0];
  if (!indexes.byCreatedAt.has(createdDate)) {
    indexes.byCreatedAt.set(createdDate, new Set());
  }
  indexes.byCreatedAt.get(createdDate).add(session.id);
  
  const updatedDate = new Date(session.updatedAt || session.createdAt).toISOString().split('T')[0];
  if (!indexes.byUpdatedAt.has(updatedDate)) {
    indexes.byUpdatedAt.set(updatedDate, new Set());
  }
  indexes.byUpdatedAt.get(updatedDate).add(session.id);
};

const removeFromIndexes = (sessionId, session) => {
  if (!session) return;
  
  // Remove from stage index
  const stage = session.stage || 'unknown';
  if (indexes.byStage.has(stage)) {
    indexes.byStage.get(stage).delete(sessionId);
    if (indexes.byStage.get(stage).size === 0) {
      indexes.byStage.delete(stage);
    }
  }
  
  // Remove from client type index
  const clientType = session.data?.client_profile?.client_type || 'unknown';
  if (indexes.byClientType.has(clientType)) {
    indexes.byClientType.get(clientType).delete(sessionId);
    if (indexes.byClientType.get(clientType).size === 0) {
      indexes.byClientType.delete(clientType);
    }
  }
  
  // Remove from date indexes
  const createdDate = new Date(session.createdAt).toISOString().split('T')[0];
  if (indexes.byCreatedAt.has(createdDate)) {
    indexes.byCreatedAt.get(createdDate).delete(sessionId);
    if (indexes.byCreatedAt.get(createdDate).size === 0) {
      indexes.byCreatedAt.delete(createdDate);
    }
  }
  
  const updatedDate = new Date(session.updatedAt || session.createdAt).toISOString().split('T')[0];
  if (indexes.byUpdatedAt.has(updatedDate)) {
    indexes.byUpdatedAt.get(updatedDate).delete(sessionId);
    if (indexes.byUpdatedAt.get(updatedDate).size === 0) {
      indexes.byUpdatedAt.delete(updatedDate);
    }
  }
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
  
  // Update indexes
  updateIndexes(session);
  
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
  
  // Clear indexes
  indexes.byStage.clear();
  indexes.byClientType.clear();
  indexes.byCreatedAt.clear();
  indexes.byUpdatedAt.clear();
  
  persistStore();
};

export const deleteSession = (id) => {
  const store = loadStore();
  if (store[id]) {
    const session = store[id];
    
    // Remove from indexes
    removeFromIndexes(id, session);
    
    // Remove from cache
    cacheManager.invalidateSession(id);
    
    delete store[id];
    cache = store;
    persistStore();
    return true;
  }
  return false;
};

export const closeDatabase = () => {
  cache = null;
  
  // Clear indexes
  indexes.byStage.clear();
  indexes.byClientType.clear();
  indexes.byCreatedAt.clear();
  indexes.byUpdatedAt.clear();
};

// Export optimized query functions that use indexes
export const getSessionsByStage = (stage) => {
  const store = loadStore();
  const sessionIds = indexes.byStage.get(stage);
  
  if (!sessionIds) {
    return [];
  }
  
  return Array.from(sessionIds)
    .map(id => store[id])
    .filter(Boolean)
    .map(session => structuredClone(session));
};

export const getSessionsByClientType = (clientType) => {
  const store = loadStore();
  const sessionIds = indexes.byClientType.get(clientType);
  
  if (!sessionIds) {
    return [];
  }
  
  return Array.from(sessionIds)
    .map(id => store[id])
    .filter(Boolean)
    .map(session => structuredClone(session));
};

export const getSessionsByDateRange = (fromDate, toDate, useUpdatedAt = false) => {
  const store = loadStore();
  const indexToUse = useUpdatedAt ? indexes.byUpdatedAt : indexes.byCreatedAt;
  const results = new Set();
  
  const from = new Date(fromDate);
  const to = new Date(toDate);
  
  // Iterate through date index
  for (const [dateStr, sessionIds] of indexToUse.entries()) {
    const date = new Date(dateStr);
    
    if (date >= from && date <= to) {
      sessionIds.forEach(id => results.add(id));
    }
  }
  
  return Array.from(results)
    .map(id => store[id])
    .filter(Boolean)
    .map(session => structuredClone(session));
};

export const getIndexStatistics = () => {
  return {
    stages: Object.fromEntries(
      Array.from(indexes.byStage.entries()).map(([stage, ids]) => [stage, ids.size])
    ),
    clientTypes: Object.fromEntries(
      Array.from(indexes.byClientType.entries()).map(([type, ids]) => [type, ids.size])
    ),
    dateRanges: {
      createdAt: {
        earliest: Math.min(...Array.from(indexes.byCreatedAt.keys()).map(d => new Date(d).getTime())),
        latest: Math.max(...Array.from(indexes.byCreatedAt.keys()).map(d => new Date(d).getTime())),
        totalDays: indexes.byCreatedAt.size
      },
      updatedAt: {
        earliest: Math.min(...Array.from(indexes.byUpdatedAt.keys()).map(d => new Date(d).getTime())),
        latest: Math.max(...Array.from(indexes.byUpdatedAt.keys()).map(d => new Date(d).getTime())),
        totalDays: indexes.byUpdatedAt.size
      }
    }
  };
};
