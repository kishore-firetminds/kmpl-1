import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { loadAllData } from "@/lib/server/dashboard";

export async function GET() {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { players, teamOwners, superAdmins } = await loadAllData();

    players = players.map(({ password, ...rest }) => rest);
    teamOwners = teamOwners.map(({ password, ...rest }) => rest);
    superAdmins = superAdmins.map(({ password, ...rest }) => rest);

    let me = null;
    if (currentUser.role === "player") {
      me = players.find((item) => item.id === currentUser.id) || null;
    } else if (currentUser.role === "team_owner") {
      me = teamOwners.find((item) => item.id === currentUser.id) || null;
    } else {
      me = superAdmins.find((item) => item.id === currentUser.id) || null;
    }

    return NextResponse.json({ currentUser, players, teamOwners, superAdmins, me });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load dashboard." }, { status: 500 });
  }
}
