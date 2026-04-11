import { insertRows, selectRows, updateRows } from "@/lib/server/supabase";

export const DEFAULT_APP_SETTINGS = {
  showTeamOwnerPlayerList: false,
  auctionDate: null
};

function fromSettingsRow(row) {
  return {
    showTeamOwnerPlayerList: Boolean(row?.show_team_owner_player_list),
    auctionDate: row?.auction_date || null
  };
}

function isMissingTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("relation") && message.includes("does not exist");
}

function isTimeoutError(error) {
  return String(error?.message || "").toLowerCase().includes("statement timeout");
}

export async function loadAppSettings() {
  try {
    const rows = await selectRows("app_settings", { id: "eq.global", limit: 1 });
    if (!rows.length) return { ...DEFAULT_APP_SETTINGS };
    return fromSettingsRow(rows[0]);
  } catch (error) {
    if (isMissingTableError(error) || isTimeoutError(error)) return { ...DEFAULT_APP_SETTINGS };
    throw error;
  }
}

export async function saveAppSettings(input = {}) {
  const next = {
    show_team_owner_player_list: Boolean(input.showTeamOwnerPlayerList),
    auction_date: input.auctionDate || null,
    updated_at: new Date().toISOString()
  };

  const existing = await selectRows("app_settings", { id: "eq.global", limit: 1 });
  if (existing.length) {
    const updated = await updateRows("app_settings", { id: "global" }, next);
    return fromSettingsRow(updated?.[0] || { ...existing[0], ...next });
  }

  const inserted = await insertRows("app_settings", {
    id: "global",
    ...next,
    created_at: new Date().toISOString()
  });
  return fromSettingsRow(inserted?.[0] || { id: "global", ...next });
}
