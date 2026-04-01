import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { buildId } from "@/lib/server/models";
import { toRowByRole, tableByRole } from "@/lib/server/dashboard";
import { insertRows } from "@/lib/server/supabase";
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
    return NextResponse.json({ error: error.message || "Unable to create record." }, { status: 500 });
  }
}
