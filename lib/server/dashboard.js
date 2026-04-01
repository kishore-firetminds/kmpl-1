import { fromPlayerRow, fromSuperAdminRow, fromTeamOwnerRow, toPlayerRow, toSuperAdminRow, toTeamOwnerRow } from "@/lib/server/models";
import { selectRows } from "@/lib/server/supabase";

export async function loadAllData() {
  const [playersRaw, ownersRaw, adminsRaw] = await Promise.all([
    selectRows("players", { limit: 5000 }),
    selectRows("team_owners", { limit: 5000 }),
    selectRows("super_admins", { limit: 1000 })
  ]);

  return {
    players: playersRaw.map(fromPlayerRow),
    teamOwners: ownersRaw.map(fromTeamOwnerRow),
    superAdmins: adminsRaw.map(fromSuperAdminRow)
  };
}

export function toRowByRole(role, payload) {
  if (role === "player") return toPlayerRow(payload);
  if (role === "team_owner") return toTeamOwnerRow(payload);
  return toSuperAdminRow(payload);
}

export function tableByRole(role) {
  if (role === "player") return "players";
  if (role === "team_owner") return "team_owners";
  return "super_admins";
}
