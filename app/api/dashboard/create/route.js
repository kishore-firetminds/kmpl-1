import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { buildId } from "@/lib/server/models";
import { toRowByRole, tableByRole } from "@/lib/server/dashboard";
import { insertRows, selectRows } from "@/lib/server/supabase";
import { hashPassword } from "@/lib/server/session";

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
      const payload = {
        id: buildId("player"),
        role: "player",
        personId: buildId("person"),
        name: data.name,
        photo: data.photo,
        email: data.email || "",
        mobile: data.mobile,
        jerseyNumber: data.jerseyNumber,
        jerseySize: data.jerseySize,
        jerseyName: data.jerseyName,
        village: data.village,
        password: hashPassword(data.password),
        feePaid: 310,
        paymentRef: "ADMIN_CREATED",
        registeredAt: now
      };
      const inserted = await insertRows(tableByRole(createRole), toRowByRole(createRole, payload));
      return NextResponse.json({ ok: true, item: inserted[0] });
    }

    if (createRole === "team_owner") {
      const payload = {
        id: buildId("owner"),
        role: "team_owner",
        personId: buildId("person"),
        ownerName: data.ownerName,
        teamName: data.teamName,
        logo: data.logo,
        email: data.email || "",
        jerseyPattern: data.jerseyPattern,
        ownerMobile: data.ownerMobile,
        password: hashPassword(data.password),
        feePaid: 5100,
        paymentRef: "ADMIN_CREATED",
        registeredAt: now
      };
      const inserted = await insertRows(tableByRole(createRole), toRowByRole(createRole, payload));
      return NextResponse.json({ ok: true, item: inserted[0] });
    }

    const payload = {
      id: buildId("admin"),
      role: "super_admin",
      personId: buildId("person"),
      name: data.name,
      email: data.email,
      password: hashPassword(data.password),
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

