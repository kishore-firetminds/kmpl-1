import { cookies } from "next/headers";
import { getSessionCookieConfig, getSessionCookieName, verifySessionToken } from "@/lib/server/session";

export async function getSessionUser() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(getSessionCookieName())?.value;
  const payload = verifySessionToken(raw);
  if (!payload) return null;
  return {
    id: payload.id,
    role: payload.role,
    personId: payload.personId
  };
}

export async function setSessionCookie(response, userPayload, createSessionToken) {
  response.cookies.set(getSessionCookieName(), createSessionToken(userPayload), getSessionCookieConfig());
}

export async function clearSessionCookie(response) {
  response.cookies.set(getSessionCookieName(), "", {
    ...getSessionCookieConfig(),
    maxAge: 0
  });
}
