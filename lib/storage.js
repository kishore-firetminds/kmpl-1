// Legacy localStorage module has been replaced by server-backed APIs.
// Kept lightweight helpers for compatibility.

export function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
