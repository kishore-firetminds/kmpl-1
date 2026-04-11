import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { hashPassword } from "@/lib/server/session";
import { updateRows } from "@/lib/server/supabase";

function cleanPatch(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export async function POST(request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { role, data } = await request.json();
    if (!role || !data || role !== currentUser.role) {
      return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
    }

    if (role === "player") {
      const patch = cleanPatch({
        name: data.name,
        photo: data.photo,
        mobile: data.mobile,
        jersey_number: data.jerseyNumber,
        jersey_size: data.jerseySize,
        jersey_name: data.jerseyName,
        village: data.village,
        password: data.password ? (String(data.password).startsWith("scrypt$") ? data.password : hashPassword(data.password)) : undefined
      });
      await updateRows("players", { id: currentUser.id }, patch);
      return NextResponse.json({ ok: true });
    }

    if (role === "team_owner") {
      const patch = cleanPatch({
        owner_name: data.ownerName,
        team_name: data.teamName,
        logo: data.logo,
        jersey_design: data.jerseyDesign,
        jersey_pattern: data.jerseyPattern,
        owner_mobile: data.ownerMobile,
        password: data.password ? (String(data.password).startsWith("scrypt$") ? data.password : hashPassword(data.password)) : undefined
      });
      try {
        await updateRows("team_owners", { id: currentUser.id }, patch);
      } catch (error) {
        const message = String(error?.message || "");
        if (!message.toLowerCase().includes("jersey_design")) throw error;
        const legacyPatch = { ...patch };
        delete legacyPatch.jersey_design;
        await updateRows("team_owners", { id: currentUser.id }, legacyPatch);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Role not allowed." }, { status: 403 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update profile." }, { status: 500 });
  }
}

