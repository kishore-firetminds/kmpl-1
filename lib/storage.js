"use client";

const KEYS = {
  players: "kmpl_players",
  teamOwners: "kmpl_team_owners",
  superAdmins: "kmpl_super_admins",
  currentUser: "kmpl_current_user",
  pendingRoles: "kmpl_pending_roles"
};

export const AUTH_CHANGED_EVENT = "kmpl_auth_changed";

const DEFAULT_ADMIN = {
  id: "admin-1",
  role: "super_admin",
  name: "Default Admin",
  email: "admin@kmpl.com",
  password: "admin123",
  createdAt: new Date().toISOString()
};

function parseList(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function ensureSeedData() {
  if (typeof window === "undefined") return;
  const admins = parseList(localStorage.getItem(KEYS.superAdmins));
  if (admins.length === 0) {
    localStorage.setItem(KEYS.superAdmins, JSON.stringify([DEFAULT_ADMIN]));
  }
  if (!localStorage.getItem(KEYS.players)) {
    localStorage.setItem(KEYS.players, JSON.stringify([]));
  }
  if (!localStorage.getItem(KEYS.teamOwners)) {
    localStorage.setItem(KEYS.teamOwners, JSON.stringify([]));
  }
}

export function getList(key) {
  if (typeof window === "undefined") return [];
  return parseList(localStorage.getItem(KEYS[key]));
}

export function setList(key, list) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS[key], JSON.stringify(list));
}

export function addItem(key, item) {
  const list = getList(key);
  list.push(item);
  setList(key, list);
}

export function updateItem(key, id, updater) {
  const updated = getList(key).map((entry) =>
    entry.id === id ? { ...entry, ...updater } : entry
  );
  setList(key, updated);
}

export function deleteItem(key, id) {
  const filtered = getList(key).filter((entry) => entry.id !== id);
  setList(key, filtered);
}

export function setCurrentUser(user) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.currentUser, JSON.stringify(user));
  emitAuthChanged();
}

export function getCurrentUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEYS.currentUser);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.currentUser);
  emitAuthChanged();
}

export function setPendingRoleChoices(choices) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.pendingRoles, JSON.stringify(choices || []));
}

export function getPendingRoleChoices() {
  if (typeof window === "undefined") return [];
  return parseList(localStorage.getItem(KEYS.pendingRoles));
}

export function clearPendingRoleChoices() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.pendingRoles);
}

export function findPersonIdByIdentity(mobile, email) {
  const m = normalize(mobile);
  const e = normalize(email);
  const players = getList("players");
  const teamOwners = getList("teamOwners");

  const playerMatch = players.find(
    (item) => normalize(item.mobile) === m || (e && normalize(item.email) === e)
  );
  if (playerMatch?.personId) return playerMatch.personId;

  const ownerMatch = teamOwners.find(
    (item) => normalize(item.ownerMobile) === m || (e && normalize(item.email) === e)
  );
  if (ownerMatch?.personId) return ownerMatch.personId;

  return null;
}

export function buildId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
