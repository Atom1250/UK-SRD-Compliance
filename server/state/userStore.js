import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scryptSync, timingSafeEqual } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_PATH = path.join(__dirname, "../data/users.json");

let usersCache = null;

const loadUsers = () => {
  if (usersCache) {
    return usersCache;
  }

  try {
    const raw = fs.readFileSync(USERS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error("Invalid users file format");
    }
    usersCache = parsed;
  } catch (error) {
    if (error.code === "ENOENT") {
      usersCache = [];
    } else {
      throw error;
    }
  }

  return usersCache;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { passwordHash, salt, ...safe } = user;
  return safe;
};

export const listUsers = () => loadUsers().map((user) => sanitizeUser(user));

export const getUserById = (id) => {
  const user = loadUsers().find((candidate) => candidate.id === id);
  return sanitizeUser(user);
};

export const getUserByUsername = (username) => {
  const user = loadUsers().find(
    (candidate) => candidate.username.toLowerCase() === String(username).toLowerCase()
  );
  return sanitizeUser(user);
};

const getUserRecordByUsername = (username) => {
  return loadUsers().find(
    (candidate) => candidate.username.toLowerCase() === String(username).toLowerCase()
  );
};

export const authenticateUser = (username, password) => {
  const record = getUserRecordByUsername(username);
  if (!record) {
    return null;
  }

  try {
    const expectedHash = Buffer.from(record.passwordHash, "hex");
    const actualHash = scryptSync(password, record.salt, expectedHash.length);

    if (expectedHash.length !== actualHash.length) {
      return null;
    }

    if (!timingSafeEqual(expectedHash, actualHash)) {
      return null;
    }

    return sanitizeUser(record);
  } catch (error) {
    return null;
  }
};

export const refreshUsers = () => {
  usersCache = null;
  loadUsers();
};

export const getSafeUser = sanitizeUser;
