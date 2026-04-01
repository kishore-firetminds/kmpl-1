import { NextResponse } from "next/server";
import { createSessionToken, getSessionCookieConfig, getSessionCookieName } from "@/lib/server/session";
import { selectRows } from "@/lib/server/supabase";

const TABLE_BY_ROLE = {
  player: "players",
  team_owner: "team_owners"
};

export async function POST(request) {
  try {
    const { id, role } = await request.json();
    if (!id || !role || !TABLE_BY_ROLE[role]) {
      return NextResponse.json({ error: "Invalid role selection." }, { status: 400 });
    }

    const rows = await selectRows(TABLE_BY_ROLE[role], { id: `eq.${id}`, limit: 1 });
    if (!rows.length) {
      return NextResponse.json({ error: "Selected profile not found." }, { status: 404 });
    }

    const row = rows[0];
    const user = { id: row.id, role, personId: row.person_id || row.id };

    const response = NextResponse.json({ authenticated: true, user });
    response.cookies.set(getSessionCookieName(), createSessionToken(user), getSessionCookieConfig());
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to select role." }, { status: 500 });
  }
}
