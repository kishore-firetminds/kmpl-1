import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { fromPlayerRow, fromSuperAdminRow, fromTeamOwnerRow } from "@/lib/server/models";
import { loadAppSettings } from "@/lib/server/settings";
import { selectRows } from "@/lib/server/supabase";

const FALLBACK_LIMIT = 10;
const MAX_LIMIT = 25;
const MAX_PLAYERS_LIMIT = 20000;
const DEFAULT_LIMIT = 10;

function isTimeoutError(error) {
  return String(error?.message || "").toLowerCase().includes("statement timeout");
}

function isMissingColumnError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("column") && message.includes("does not exist");
}

function toInt(value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function includesOnly(only, value) {
  return !only || only === value;
}

async function selectRowsResilient({
  table,
  select,
  order,
  limit,
  offset,
  fallbackSelect,
  where = {}
}) {
  try {
    return await selectRows(table, { select, order, limit, offset, ...where });
  } catch (error) {
    if (!isTimeoutError(error) && !isMissingColumnError(error)) throw error;
  }

  return selectRows(table, {
    select: fallbackSelect || select,
    limit: Math.max(1, Math.min(FALLBACK_LIMIT, limit || FALLBACK_LIMIT)),
    offset,
    ...where
  });
}

async function selectRowsPage({
  table,
  select,
  order,
  offset,
  limit,
  fallbackSelect,
  where = {},
  map = (row) => row
}) {
  try {
    const rows = await selectRowsResilient({
      table,
      select,
      order,
      offset,
      limit: limit + 1,
      fallbackSelect,
      where
    });
    const sliced = rows.slice(0, limit).map(map);
    return {
      rows: sliced,
      hasMore: rows.length > limit,
      nextOffset: offset + sliced.length
    };
  } catch (error) {
    if (isTimeoutError(error)) {
      return { rows: [], hasMore: false, nextOffset: offset };
    }
    throw error;
  }
}

export async function GET(request) {
  try {
    const currentUser = await getSessionUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await loadAppSettings();
    const { searchParams } = new URL(request.url);
    const only = searchParams.get("only");

    const envDefaultLimit = toInt(process.env.DASHBOARD_MAX_ROWS || DEFAULT_LIMIT, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const envPlayersDefaultLimit = toInt(
      process.env.DASHBOARD_PLAYERS_MAX_ROWS || process.env.DASHBOARD_MAX_ROWS || DEFAULT_LIMIT,
      DEFAULT_LIMIT,
      1,
      MAX_PLAYERS_LIMIT
    );
    const playersLimit = toInt(searchParams.get("playersLimit"), envPlayersDefaultLimit, 1, MAX_PLAYERS_LIMIT);
    const teamOwnersLimit = toInt(searchParams.get("teamOwnersLimit"), envDefaultLimit, 1, MAX_LIMIT);
    const superAdminsLimit = toInt(searchParams.get("superAdminsLimit"), envDefaultLimit, 1, MAX_LIMIT);

    const playersOffset = toInt(searchParams.get("playersOffset"), 0, 0);
    const teamOwnersOffset = toInt(searchParams.get("teamOwnersOffset"), 0, 0);
    const superAdminsOffset = toInt(searchParams.get("superAdminsOffset"), 0, 0);

    const playersSelect = [
      "id",
      "person_id",
      "role",
      "name",
      "photo",
      "email",
      "mobile",
      "jersey_number",
      "jersey_size",
      "jersey_name",
      "village",
      "fee_paid",
      "payment_ref",
      "registered_at"
    ].join(",");
    const playersFastSelect = [
      "id",
      "person_id",
      "role",
      "name",
      "email",
      "mobile",
      "jersey_number",
      "jersey_size",
      "jersey_name",
      "village",
      "fee_paid",
      "payment_ref",
      "registered_at"
    ].join(",");
    const ownersSelect = [
      "id",
      "person_id",
      "role",
      "owner_name",
      "team_name",
      "logo",
      "jersey_design",
      "email",
      "jersey_pattern",
      "owner_mobile",
      "fee_paid",
      "payment_ref",
      "registered_at"
    ].join(",");
    const ownersFastSelect = [
      "id",
      "person_id",
      "role",
      "owner_name",
      "team_name",
      "email",
      "jersey_pattern",
      "owner_mobile",
      "fee_paid",
      "payment_ref",
      "registered_at"
    ].join(",");
    const adminsSelect = ["id", "person_id", "role", "name", "email", "created_at"].join(",");
    const teamOwnerVisiblePlayersSelect = ["id", "name", "photo", "mobile", "village", "registered_at"].join(",");

    let players = [];
    let teamOwners = [];
    let superAdmins = [];

    const pagination = {
      players: { offset: playersOffset, limit: playersLimit, hasMore: false },
      teamOwners: { offset: teamOwnersOffset, limit: teamOwnersLimit, hasMore: false },
      superAdmins: { offset: superAdminsOffset, limit: superAdminsLimit, hasMore: false }
    };

    if (currentUser.role === "super_admin") {
      if (includesOnly(only, "players")) {
        const result = await selectRowsPage({
          table: "players",
          select: playersSelect,
          fallbackSelect: playersFastSelect,
          order: "registered_at.desc",
          offset: playersOffset,
          limit: playersLimit,
          map: fromPlayerRow
        });
        players = result.rows;
        pagination.players = { offset: result.nextOffset, limit: playersLimit, hasMore: result.hasMore };
      }

      if (includesOnly(only, "team_owners")) {
        const result = await selectRowsPage({
          table: "team_owners",
          select: ownersSelect,
          fallbackSelect: ownersFastSelect,
          order: "registered_at.desc",
          offset: teamOwnersOffset,
          limit: teamOwnersLimit,
          map: fromTeamOwnerRow
        });
        teamOwners = result.rows;
        pagination.teamOwners = { offset: result.nextOffset, limit: teamOwnersLimit, hasMore: result.hasMore };
      }

      if (includesOnly(only, "super_admins")) {
        const result = await selectRowsPage({
          table: "super_admins",
          select: adminsSelect,
          order: "created_at.desc",
          offset: superAdminsOffset,
          limit: superAdminsLimit,
          map: fromSuperAdminRow
        });
        superAdmins = result.rows;
        pagination.superAdmins = { offset: result.nextOffset, limit: superAdminsLimit, hasMore: result.hasMore };
      }
    } else if (currentUser.role === "player") {
      const rows = await selectRowsResilient({
        table: "players",
        select: playersSelect,
        fallbackSelect: playersFastSelect,
        limit: 1,
        where: {
          id: `eq.${currentUser.id}`
        }
      });
      players = rows.map(fromPlayerRow);
      pagination.players = { offset: players.length, limit: 1, hasMore: false };
    } else if (currentUser.role === "team_owner") {
      const ownerRows = await selectRowsResilient({
        table: "team_owners",
        select: ownersSelect,
        fallbackSelect: ownersFastSelect,
        limit: 1,
        where: {
          id: `eq.${currentUser.id}`
        }
      });
      teamOwners = ownerRows.map(fromTeamOwnerRow);

      if (settings.showTeamOwnerPlayerList && includesOnly(only, "players")) {
        const rows = await selectRowsResilient({
          table: "players",
          select: teamOwnerVisiblePlayersSelect,
          fallbackSelect: "id,name,mobile,village,registered_at",
          order: "registered_at.desc",
          limit: MAX_PLAYERS_LIMIT,
          offset: 0
        });
        players = rows.map((row) => ({
          id: row.id,
          name: row.name,
          photo: row.photo,
          mobile: row.mobile,
          village: row.village,
          registeredAt: row.registered_at
        }));
        pagination.players = { offset: players.length, limit: players.length || playersLimit, hasMore: false };
      } else {
        pagination.players = { offset: 0, limit: playersLimit, hasMore: false };
      }
    }

    let me = null;
    if (currentUser.role === "player") {
      me = players.find((item) => item.id === currentUser.id) || null;
    } else if (currentUser.role === "team_owner") {
      me = teamOwners.find((item) => item.id === currentUser.id) || null;
    } else if (superAdmins.length) {
      me = superAdmins.find((item) => item.id === currentUser.id) || null;
    }

    return NextResponse.json({ currentUser, players, teamOwners, superAdmins, me, settings, pagination });
  } catch (error) {
    const message = String(error?.message || "Unable to load dashboard.");
    const isTimeout = message.toLowerCase().includes("statement timeout");
    return NextResponse.json(
      { error: isTimeout ? "Dashboard query timed out. Please refresh or reduce loaded rows." : message },
      { status: 500 }
    );
  }
}
