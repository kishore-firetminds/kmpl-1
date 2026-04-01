import { NextResponse } from "next/server";
import { createSessionToken, getSessionCookieConfig, getSessionCookieName, verifyPassword } from "@/lib/server/session";
import { ensureDefaultAdmin, selectRows } from "@/lib/server/supabase";
import { fromPlayerRow, fromSuperAdminRow, fromTeamOwnerRow, normalize } from "@/lib/server/models";

export async function POST(request) {
  try {
    await ensureDefaultAdmin();

    const { identity, password } = await request.json();
    const normalizedIdentity = normalize(identity);

    if (!normalizedIdentity || !password) {
      return NextResponse.json({ error: "Identity and password are required." }, { status: 400 });
    }

    const [adminsRaw, playersRaw, ownersRaw] = await Promise.all([
      selectRows("super_admins", { limit: 1000 }),
      selectRows("players", { limit: 5000 }),
      selectRows("team_owners", { limit: 5000 })
    ]);

    const admins = adminsRaw.map(fromSuperAdminRow);
    const players = playersRaw.map(fromPlayerRow);
    const owners = ownersRaw.map(fromTeamOwnerRow);

    const admin = admins.find(
      (item) => normalize(item.email) === normalizedIdentity && verifyPassword(password, item.password)
    );

    if (admin) {
      const user = { id: admin.id, role: "super_admin", personId: admin.personId || admin.id };
      const response = NextResponse.json({ authenticated: true, user });
      response.cookies.set(getSessionCookieName(), createSessionToken(user), getSessionCookieConfig());
      return response;
    }

    const player = players.find(
      (item) =>
        verifyPassword(password, item.password) &&
        (normalize(item.mobile) === normalizedIdentity || normalize(item.email) === normalizedIdentity)
    );

    const owner = owners.find(
      (item) =>
        verifyPassword(password, item.password) &&
        (normalize(item.ownerMobile) === normalizedIdentity || normalize(item.email) === normalizedIdentity)
    );

    const matches = [];
    if (player) {
      matches.push({
        id: player.id,
        role: "player",
        personId: player.personId || player.id,
        displayName: player.name || "Player"
      });
    }

    if (owner) {
      matches.push({
        id: owner.id,
        role: "team_owner",
        personId: owner.personId || owner.id,
        displayName: owner.ownerName || owner.teamName || "Team Owner"
      });
    }

    if (!matches.length) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    if (matches.length === 1) {
      const only = matches[0];
      const user = { id: only.id, role: only.role, personId: only.personId };
      const response = NextResponse.json({ authenticated: true, user });
      response.cookies.set(getSessionCookieName(), createSessionToken(user), getSessionCookieConfig());
      return response;
    }

    return NextResponse.json({ authenticated: false, requiresRoleSelection: true, choices: matches });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Login failed." }, { status: 500 });
  }
}
