import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { buildId } from "@/lib/server/models";
import { toRowByRole, tableByRole } from "@/lib/server/dashboard";
import { insertRows, selectRows } from "@/lib/server/supabase";
import { hashPassword } from "@/lib/server/session";

function requiredText(value) {
  return String(value || "").trim();
}

export async function POST(request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { createRole, data } = await request.json();
    if (!["player", "team_owner", "super_admin"].includes(createRole)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    if (createRole === "super_admin") {
      const email = String(data.email || "").trim();
      if (!email) {
        return NextResponse.json({ error: "Email is required for super admin." }, { status: 400 });
      }

      const existing = await selectRows("super_admins", { email: `eq.${email}`, limit: 1 });
      if (existing.length) {
        return NextResponse.json({ error: "Super admin already exists with this email." }, { status: 409 });
      }
    }

    const now = new Date().toISOString();

    if (createRole === "player") {
      const name = requiredText(data.name);
      const photo = requiredText(data.photo);
      const mobile = requiredText(data.mobile);
      const jerseySize = requiredText(data.jerseySize);
      const jerseyName = requiredText(data.jerseyName);
      const village = requiredText(data.village);
      const password = requiredText(data.password);
      const email = requiredText(data.email);

      if (!name || !photo || !mobile || !jerseySize || !jerseyName || !village || !password) {
        return NextResponse.json({ error: "Missing required player fields." }, { status: 400 });
      }

      const payload = {
        id: buildId("player"),
        role: "player",
        personId: buildId("person"),
        name,
        photo,
        email,
        mobile,
        jerseyNumber: requiredText(data.jerseyNumber),
        jerseySize,
        jerseyName,
        village,
        password: hashPassword(password),
        feePaid: 310,
        paymentRef: "ADMIN_CREATED",
        registeredAt: now
      };
      const inserted = await insertRows(tableByRole(createRole), toRowByRole(createRole, payload));
      return NextResponse.json({ ok: true, item: inserted[0] });
    }

    if (createRole === "team_owner") {
      const ownerName = requiredText(data.ownerName);
      const teamName = requiredText(data.teamName);
      const logo = requiredText(data.logo);
      const ownerMobile = requiredText(data.ownerMobile);
      const password = requiredText(data.password);
      const jerseyDesign = requiredText(data.jerseyDesign);
      const jerseyPattern = requiredText(data.jerseyPattern);
      const email = requiredText(data.email);

      if (!ownerName || !teamName || !logo || !ownerMobile || !password || !jerseyPattern || !jerseyDesign) {
        return NextResponse.json({ error: "Missing required team owner fields." }, { status: 400 });
      }

      const payload = {
        id: buildId("owner"),
        role: "team_owner",
        personId: buildId("person"),
        ownerName,
        teamName,
        logo,
        jerseyDesign,
        email,
        jerseyPattern,
        ownerMobile,
        password: hashPassword(password),
        feePaid: 5100,
        paymentRef: "ADMIN_CREATED",
        registeredAt: now
      };
      let inserted;
      try {
        inserted = await insertRows(tableByRole(createRole), toRowByRole(createRole, payload));
      } catch (error) {
        const message = String(error?.message || "");
        if (!message.toLowerCase().includes("jersey_design")) throw error;
        const legacyPayload = { ...payload };
        delete legacyPayload.jerseyDesign;
        inserted = await insertRows(tableByRole(createRole), toRowByRole(createRole, legacyPayload));
      }
      return NextResponse.json({ ok: true, item: inserted[0] });
    }

    const name = requiredText(data.name);
    const email = requiredText(data.email);
    const password = requiredText(data.password);
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required super admin fields." }, { status: 400 });
    }

    const payload = {
      id: buildId("admin"),
      role: "super_admin",
      personId: buildId("person"),
      name,
      email,
      password: hashPassword(password),
      createdAt: now
    };
    const inserted = await insertRows(tableByRole(createRole), toRowByRole(createRole, payload));
    return NextResponse.json({ ok: true, item: inserted[0] });
  } catch (error) {
    const message = String(error?.message || "Unable to create record.");
    if (message.includes("super_admins_email_key") || message.includes("duplicate key value")) {
      return NextResponse.json({ error: "Super admin already exists with this email." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

