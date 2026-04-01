const BASE_HEADERS = {
  "Content-Type": "application/json",
  Prefer: "return=representation"
};

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Supabase env missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url, serviceRole };
}

function buildHeaders() {
  const { serviceRole } = getConfig();
  return {
    ...BASE_HEADERS,
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`
  };
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  const out = query.toString();
  return out ? `?${out}` : "";
}

async function request(path, { method = "GET", body } = {}) {
  const { url } = getConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: buildHeaders(),
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store"
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.hint || payload?.details || "Supabase request failed.";
    throw new Error(detail);
  }

  return payload;
}

export async function selectRows(table, params = {}) {
  const query = buildQuery({ select: "*", ...params });
  return request(`${table}${query}`);
}

export async function insertRows(table, rows) {
  const payload = Array.isArray(rows) ? rows : [rows];
  return request(table, { method: "POST", body: payload });
}

export async function updateRows(table, match = {}, values = {}) {
  const queryParams = { select: "*" };
  for (const [key, value] of Object.entries(match)) {
    queryParams[key] = `eq.${value}`;
  }
  const query = buildQuery(queryParams);
  return request(`${table}${query}`, { method: "PATCH", body: values });
}

export async function deleteRows(table, match = {}) {
  const queryParams = { select: "*" };
  for (const [key, value] of Object.entries(match)) {
    queryParams[key] = `eq.${value}`;
  }
  const query = buildQuery(queryParams);
  return request(`${table}${query}`, { method: "DELETE" });
}

export async function ensureDefaultAdmin() {
  const existing = await selectRows("super_admins", { email: "eq.7981067942", limit: 1 });
  if (existing.length) return;

  const now = new Date().toISOString();
  await insertRows("super_admins", {
    id: `admin-${Date.now()}`,
    person_id: `person-admin-${Date.now()}`,
    role: "super_admin",
    name: "Default Admin",
    email: "7981067942",
    password: "Admin@123",
    created_at: now
  });
}
