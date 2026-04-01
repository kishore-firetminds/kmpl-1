import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { tableByRole, toRowByRole } from "@/lib/server/dashboard";
import { hashPassword } from "@/lib/server/session";
import { updateRows } from "@/lib/server/supabase";

export async function POST(request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { editType, editId, editDraft } = await request.json();
    if (!editType || !editId || !editDraft) {
      return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
    }

    const row = toRowByRole(editType, editDraft);
    delete row.id;
    delete row.role;

    if (row.password && !String(row.password).startsWith("scrypt$")) {
      row.password = hashPassword(row.password);
    }

    await updateRows(tableByRole(editType), { id: editId }, row);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update record." }, { status: 500 });
  }
}
