import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { DEFAULT_TEAM_OWNER_BUDGET, tableByRole, toRowByRole } from "@/lib/server/dashboard";
import { hashPassword } from "@/lib/server/session";
import { selectRows, updateRows } from "@/lib/server/supabase";

function normalizeAssignedTeamOwnerId(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizePlayerPoints(value) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Player points must be a valid non-negative number.");
  }
  return Math.trunc(parsed);
}

async function validatePlayerAssignment(editId, editDraft) {
  const assignedTeamOwnerId = normalizeAssignedTeamOwnerId(editDraft.assignedTeamOwnerId);
  const playerPoints = normalizePlayerPoints(editDraft.playerPoints);

  if (!assignedTeamOwnerId) {
    editDraft.assignedTeamOwnerId = "";
    editDraft.assignedTeamName = "";
    editDraft.playerPoints = 0;
    return;
  }

  const owners = await selectRows("team_owners", {
    id: `eq.${assignedTeamOwnerId}`,
    select: "id,team_name,auction_budget",
    limit: 1
  });
  const owner = owners[0];
  if (!owner) {
    throw new Error("Selected team owner was not found.");
  }

  const existingAssignedPlayers = await selectRows("players", {
    assigned_team_owner_id: `eq.${assignedTeamOwnerId}`,
    select: "id,player_points",
    limit: 5000
  });
  const nextSpentPoints = existingAssignedPlayers.reduce((sum, player) => {
    if (player.id === editId) return sum;
    return sum + Number(player.player_points || 0);
  }, playerPoints);

  const budget = Number(owner.auction_budget || DEFAULT_TEAM_OWNER_BUDGET);
  if (nextSpentPoints > budget) {
    throw new Error(`Assigned points exceed the team budget of ${budget}.`);
  }

  editDraft.assignedTeamOwnerId = owner.id;
  editDraft.assignedTeamName = owner.team_name || "";
  editDraft.playerPoints = playerPoints;
}

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

    if (editType === "player") {
      await validatePlayerAssignment(editId, editDraft);
    }

    const row = toRowByRole(editType, editDraft);
    delete row.id;
    delete row.role;

    if (row.password && !String(row.password).startsWith("scrypt$")) {
      row.password = hashPassword(row.password);
    }

    try {
      await updateRows(tableByRole(editType), { id: editId }, row);
    } catch (error) {
      const message = String(error?.message || "");
      if (editType !== "team_owner" || !message.toLowerCase().includes("jersey_design")) {
        throw error;
      }
      const legacyRow = { ...row };
      delete legacyRow.jersey_design;
      await updateRows(tableByRole(editType), { id: editId }, legacyRow);
    }

    if (editType === "team_owner" && row.team_name) {
      await updateRows("players", { assigned_team_owner_id: editId }, { assigned_team_name: row.team_name });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to update record." }, { status: 500 });
  }
}
