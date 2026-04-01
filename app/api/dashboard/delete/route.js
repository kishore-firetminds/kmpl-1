import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { tableByRole } from "@/lib/server/dashboard";
import { deleteRows } from "@/lib/server/supabase";

export async function POST(request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type, id } = await request.json();
    if (!type || !id) {
      return NextResponse.json({ error: "Invalid delete payload." }, { status: 400 });
    }

    await deleteRows(tableByRole(type), { id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to delete record." }, { status: 500 });
  }
}
