import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { loadAppSettings, saveAppSettings } from "@/lib/server/settings";

export async function GET() {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await loadAppSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load settings." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser || currentUser.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    let auctionDate = null;
    if (body.auctionDate) {
      const parsed = new Date(body.auctionDate);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid auction date." }, { status: 400 });
      }
      auctionDate = parsed.toISOString();
    }

    const settings = await saveAppSettings({
      showTeamOwnerPlayerList: Boolean(body.showTeamOwnerPlayerList),
      auctionDate
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to save settings." }, { status: 500 });
  }
}
