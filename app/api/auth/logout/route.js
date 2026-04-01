import { NextResponse } from "next/server";
import { getSessionCookieConfig, getSessionCookieName } from "@/lib/server/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSessionCookieName(), "", {
    ...getSessionCookieConfig(),
    maxAge: 0
  });
  return response;
}
