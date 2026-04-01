import crypto from "crypto";

const ALGO = "sha256";
const SESSION_COOKIE = "kmpl_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(input) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function getSecret() {
  return process.env.AUTH_SECRET || "dev-only-insecure-secret";
}

function sign(value) {
  return crypto.createHmac(ALGO, getSecret()).update(value).digest("base64url");
}

function safeEqualText(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password, stored) {
  if (!stored) return false;

  if (!stored.startsWith("scrypt$")) {
    return stored === password;
  }

  const [, salt, expected] = stored.split("$");
  if (!salt || !expected) return false;

  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(expected, "hex"));
}

export function createSessionToken(payload) {
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + MAX_AGE_SECONDS
  };
  const encoded = base64UrlEncode(JSON.stringify(body));
  const signature = sign(encoded);
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  if (!safeEqualText(signature, expected)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encoded));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionCookieConfig() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS
  };
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}
