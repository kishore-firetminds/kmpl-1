import { NextResponse } from "next/server";
import { createSessionToken, getSessionCookieConfig, getSessionCookieName, hashPassword } from "@/lib/server/session";
import { buildId, fromPlayerRow, fromTeamOwnerRow, normalize, toPlayerRow, toTeamOwnerRow } from "@/lib/server/models";
import { ensureDefaultAdmin, insertRows, selectRows } from "@/lib/server/supabase";

const ROLE_CONFIG = {
  player: { fee: 310 },
  team_owner: { fee: 5100 }
};

function findPersonId(players, owners, mobile, email) {
  const m = normalize(mobile);
  const e = normalize(email);

  const inPlayers = players.find(
    (item) => normalize(item.mobile) === m || (e && normalize(item.email) === e)
  );
  if (inPlayers?.personId) return inPlayers.personId;

  const inOwners = owners.find(
    (item) => normalize(item.ownerMobile) === m || (e && normalize(item.email) === e)
  );
  if (inOwners?.personId) return inOwners.personId;

  return buildId("person");
}

export async function POST(request) {
  try {
    await ensureDefaultAdmin();

    const payload = await request.json();
    const { role, payerEmail, payerPhone, paymentRef, profile } = payload;

    if (!ROLE_CONFIG[role]) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (!paymentRef) {
      return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
    }

    const [playersRaw, ownersRaw] = await Promise.all([
      selectRows("players", { limit: 5000 }),
      selectRows("team_owners", { limit: 5000 })
    ]);

    const players = playersRaw.map(fromPlayerRow);
    const owners = ownersRaw.map(fromTeamOwnerRow);

    const email = String(payerEmail || "").trim();

    if (role === "player") {
      const mobile = String(profile.mobile || payerPhone || "").trim();
      const duplicate = players.find(
        (item) => normalize(item.mobile) === normalize(mobile) || normalize(item.email) === normalize(email)
      );
      if (duplicate) {
        return NextResponse.json(
          { error: "Player profile already exists for this mobile/email. Please login or register as Team Owner." },
          { status: 409 }
        );
      }

      const player = {
        id: buildId("player"),
        personId: findPersonId(players, owners, mobile, email),
        role: "player",
        name: String(profile.name || "").trim(),
        photo: String(profile.photo || "").trim(),
        email,
        mobile,
        jerseyNumber: String(profile.jerseyNumber || "").trim(),
        jerseySize: String(profile.jerseySize || "").trim(),
        jerseyName: String(profile.jerseyName || "").trim(),
        village: String(profile.village || "").trim(),
        password: hashPassword(String(profile.password || "")),
        feePaid: ROLE_CONFIG.player.fee,
        paymentRef,
        registeredAt: new Date().toISOString()
      };

      await insertRows("players", toPlayerRow(player));

      const user = { id: player.id, role: "player", personId: player.personId };
      const response = NextResponse.json({ ok: true, user });
      response.cookies.set(getSessionCookieName(), createSessionToken(user), getSessionCookieConfig());
      return response;
    }

    const ownerMobile = String(profile.ownerMobile || payerPhone || "").trim();
    const duplicate = owners.find(
      (item) => normalize(item.ownerMobile) === normalize(ownerMobile) || normalize(item.email) === normalize(email)
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "Team Owner profile already exists for this mobile/email. Please login or register as Player." },
        { status: 409 }
      );
    }

    const owner = {
      id: buildId("owner"),
      personId: findPersonId(players, owners, ownerMobile, email),
      role: "team_owner",
      ownerName: String(profile.ownerName || "").trim(),
      teamName: String(profile.teamName || "").trim(),
      logo: String(profile.logo || "").trim(),
      email,
      jerseyPattern: String(profile.jerseyPattern || "").trim(),
      ownerMobile,
      password: hashPassword(String(profile.password || "")),
      feePaid: ROLE_CONFIG.team_owner.fee,
      paymentRef,
      registeredAt: new Date().toISOString()
    };

    await insertRows("team_owners", toTeamOwnerRow(owner));

    const user = { id: owner.id, role: "team_owner", personId: owner.personId };
    const response = NextResponse.json({ ok: true, user });
    response.cookies.set(getSessionCookieName(), createSessionToken(user), getSessionCookieConfig());
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Registration failed." }, { status: 500 });
  }
}

