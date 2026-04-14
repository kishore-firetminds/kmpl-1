import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

async function loadEnvFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, value] = match;
      if (process.env[key] !== undefined) continue;
      let nextValue = value.trim();
      if (
        (nextValue.startsWith("\"") && nextValue.endsWith("\"")) ||
        (nextValue.startsWith("'") && nextValue.endsWith("'"))
      ) {
        nextValue = nextValue.slice(1, -1);
      }
      process.env[key] = nextValue;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function loadEnv() {
  const cwd = process.cwd();
  await loadEnvFile(path.join(cwd, ".env"));
  await loadEnvFile(path.join(cwd, ".env.local"));
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function buildId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function parseCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  out.push(current);
  return out.map((item) => item.trim());
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);

  return lines.slice(1).map((line, rowIndex) => {
    const values = parseCsvLine(line);
    const row = { __row: rowIndex + 2 };
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function firstValue(row, keys) {
  for (const key of keys) {
    const direct = row[key];
    if (String(direct || "").trim()) return String(direct).trim();

    const match = Object.keys(row).find((candidate) => normalize(candidate) === normalize(key));
    if (match && String(row[match] || "").trim()) {
      return String(row[match]).trim();
    }
  }
  return "";
}

function looksLikeEmail(value) {
  return /\S+@\S+\.\S+/.test(String(value || "").trim());
}

function toPlayerPayload(row, defaultPassword) {
  const name = firstValue(row, ["Name", "Player Name"]);
  const mobileCandidate = firstValue(row, ["Mobile Number", "Mobile", "Phone", "Contact"]);
  const emailCandidate = firstValue(row, ["Email", "Email Address", "Mail"]);
  const village = firstValue(row, ["Village"]);
  const photo = firstValue(row, ["Photo", "Photo Url", "Photo URL", "Image"]);
  const jerseyName = firstValue(row, ["Jersey Name", "Jesrsey Name"]);
  const jerseySize = firstValue(row, ["Jersey Size", "Jeysey Size", "Size"]);
  const jerseyNumber = firstValue(row, ["Jersey Number", "Number"]);
  const password = firstValue(row, ["Password"]) || defaultPassword;

  let email = emailCandidate;
  let mobile = mobileCandidate;
  if (!email && looksLikeEmail(mobileCandidate)) {
    email = mobileCandidate;
  }
  if (!mobile) {
    mobile = email || "";
  }

  if (!name || !mobile) {
    throw new Error(`Row ${row.__row}: name and mobile/email are required.`);
  }

  return {
    id: buildId("player"),
    person_id: buildId("person"),
    role: "player",
    name,
    photo,
    email,
    mobile,
    jersey_number: jerseyNumber,
    jersey_size: jerseySize,
    jersey_name: jerseyName,
    village,
    assigned_team_owner_id: null,
    assigned_team_name: null,
    player_points: 0,
    password: hashPassword(password),
    fee_paid: 310,
    payment_ref: "IMPORTED",
    registered_at: new Date().toISOString()
  };
}

function getConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return { url, serviceRole };
}

async function supabaseRequest(path, { method = "GET", body } = {}) {
  const { url, serviceRole } = getConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`
    },
    body: body ? JSON.stringify(body) : undefined
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

async function loadExistingPlayers() {
  return supabaseRequest("players?select=id,name,email,mobile&limit=5000");
}

async function insertPlayers(rows) {
  return supabaseRequest("players", { method: "POST", body: rows });
}

async function main() {
  await loadEnv();
  const inputPath = process.argv[2] || "data/player-import.csv";
  const defaultPassword = process.env.KMPL_IMPORT_DEFAULT_PASSWORD || "KMPL@123";
  const csvText = await fs.readFile(inputPath, "utf8");
  const importedRows = parseCsv(csvText);
  if (!importedRows.length) {
    throw new Error(`No rows found in ${inputPath}.`);
  }

  const existingPlayers = await loadExistingPlayers();
  const existingKeys = new Set(
    existingPlayers.flatMap((player) => [normalize(player.mobile), normalize(player.email)]).filter(Boolean)
  );

  const rowsToInsert = [];
  const skipped = [];

  for (const row of importedRows) {
    const payload = toPlayerPayload(row, defaultPassword);
    const mobileKey = normalize(payload.mobile);
    const emailKey = normalize(payload.email);
    if ((mobileKey && existingKeys.has(mobileKey)) || (emailKey && existingKeys.has(emailKey))) {
      skipped.push({ row: row.__row, name: payload.name, reason: "duplicate mobile/email" });
      continue;
    }
    rowsToInsert.push(payload);
    if (mobileKey) existingKeys.add(mobileKey);
    if (emailKey) existingKeys.add(emailKey);
  }

  if (!rowsToInsert.length) {
    console.log("No new players to import.");
    if (skipped.length) {
      console.log(JSON.stringify({ skipped }, null, 2));
    }
    return;
  }

  const inserted = await insertPlayers(rowsToInsert);
  console.log(
    JSON.stringify(
      {
        inserted: inserted.length,
        skipped: skipped.length,
        defaultPassword,
        source: inputPath
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
