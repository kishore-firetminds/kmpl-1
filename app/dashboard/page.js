"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import {
  FaCalendarAlt,
  FaCog,
  FaDownload,
  FaEye,
  FaEdit,
  FaGavel,
  FaPlusCircle,
  FaTable,
  FaTachometerAlt,
  FaUsersCog,
  FaTrashAlt,
  FaUserShield,
  FaUsers
} from "react-icons/fa";
import PasswordField from "@/components/PasswordField";
import toast from "react-hot-toast";

const PAGE_SIZE = 100;
const PLAYERS_LIMIT = 5000;

const DEFAULT_PAGINATION = {
  players: { offset: 0, limit: PLAYERS_LIMIT, hasMore: false },
  teamOwners: { offset: 0, limit: PAGE_SIZE, hasMore: false },
  superAdmins: { offset: 0, limit: PAGE_SIZE, hasMore: false }
};

function ImageThumb({ src, alt }) {
  if (!src) return <span>-</span>;
  return <img className="table-image" src={src} alt={alt} />;
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function ImageThumbWithPreview({ src, alt, onPreview }) {
  if (!src) return <span>-</span>;
  const externalUrl = isExternalUrl(src);
  return (
    <div className="thumb-wrap">
      <img className="table-image" src={src} alt={alt} />
      <button
        className="thumb-badge"
        type="button"
        title={externalUrl ? "Open image link" : "View image"}
        aria-label={externalUrl ? "Open image link" : "View image"}
        onClick={() => {
          if (externalUrl) {
            window.open(src, "_blank", "noopener,noreferrer");
            return;
          }
          onPreview(src, alt);
        }}
      >
        <FaEye aria-hidden="true" />
      </button>
    </div>
  );
}

function getPaymentStatus(paymentRef) {
  if (!paymentRef) return "PENDING";
  if (paymentRef === "ADMIN_CREATED") return "ADMIN_CREATED";
  if (paymentRef === "IMPORTED") return "IMPORTED";
  return "PAID";
}

function formatPoints(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value || 0));
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function shuffleItems(items) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUserState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [teamOwners, setTeamOwners] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [auctionList, setAuctionList] = useState([]);
  const [teamSummary, setTeamSummary] = useState(null);
  const [settings, setSettings] = useState({
    showTeamOwnerPlayerList: false,
    auctionDate: null
  });
  const [pagination, setPagination] = useState(DEFAULT_PAGINATION);
  const [message, setMessage] = useState("");

  const [createRole, setCreateRole] = useState("player");
  const [createPlayerPhoto, setCreatePlayerPhoto] = useState("");
  const [createTeamLogo, setCreateTeamLogo] = useState("");
  const [createTeamJerseyDesign, setCreateTeamJerseyDesign] = useState("");
  const [selfPlayerPhoto, setSelfPlayerPhoto] = useState("");
  const [selfTeamLogo, setSelfTeamLogo] = useState("");
  const [selfTeamJerseyDesign, setSelfTeamJerseyDesign] = useState("");

  const [editType, setEditType] = useState("");
  const [editId, setEditId] = useState("");
  const [editDraft, setEditDraft] = useState({});
  const [creating, setCreating] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    if (!message) return;
    const lowered = String(message).toLowerCase();
    const isSuccess =
      lowered.includes("success") ||
      lowered.includes("updated") ||
      lowered.includes("created") ||
      lowered.includes("deleted") ||
      lowered.includes("downloaded") ||
      lowered.includes("completed");
    if (isSuccess) toast.success(message);
    else toast.error(message);
  }, [message]);

  useEffect(() => {
    refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function forceLogoutToHome() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore logout API failures on forced client redirect.
    }
    setCurrentUserState(null);
    router.replace("/");
  }

  async function refresh(firstLoad = false, showErrors = true) {
    try {
      const makeUrl = (only) =>
        `/api/dashboard/data?ts=${Date.now()}&only=${only}&playersLimit=${PLAYERS_LIMIT}&teamOwnersLimit=${PAGE_SIZE}&superAdminsLimit=${PAGE_SIZE}`;

      const playersResponse = await fetch(makeUrl("players"), { cache: "no-store" });
      if (!playersResponse.ok) {
        if (playersResponse.status === 401) {
          await forceLogoutToHome();
          return false;
        }

        let serverMessage = "Unable to load dashboard data.";
        try {
          const data = await playersResponse.json();
          serverMessage = data.error || serverMessage;
        } catch {
          // Ignore parse errors.
        }
        if (showErrors) setMessage(serverMessage);
        return false;
      }

      const playersData = await playersResponse.json();
      if (!playersData.currentUser) {
        await forceLogoutToHome();
        return false;
      }

      setCurrentUserState(playersData.currentUser);
      setSettings(playersData.settings || { showTeamOwnerPlayerList: false, auctionDate: null });
      setTeamSummary(playersData.teamSummary || null);

      if (playersData.currentUser.role === "super_admin") {
        const [ownersResponse, adminsResponse] = await Promise.all([
          fetch(makeUrl("team_owners"), { cache: "no-store" }),
          fetch(makeUrl("super_admins"), { cache: "no-store" })
        ]);

        const ownersData = ownersResponse.ok ? await ownersResponse.json() : { teamOwners: [], pagination: {} };
        const adminsData = adminsResponse.ok ? await adminsResponse.json() : { superAdmins: [], pagination: {} };

        setPlayers(playersData.players || []);
        setTeamOwners(ownersData.teamOwners || []);
        setSuperAdmins(adminsData.superAdmins || []);
        setPagination({
          players: playersData.pagination?.players || DEFAULT_PAGINATION.players,
          teamOwners: ownersData.pagination?.teamOwners || DEFAULT_PAGINATION.teamOwners,
          superAdmins: adminsData.pagination?.superAdmins || DEFAULT_PAGINATION.superAdmins
        });
        setTeamSummary(null);
      } else {
        setPlayers(playersData.players || []);
        setTeamOwners(playersData.teamOwners || []);
        setSuperAdmins(playersData.superAdmins || []);
        setPagination(playersData.pagination || DEFAULT_PAGINATION);
      }
      return true;
    } catch (error) {
      if (showErrors) setMessage(error.message || "Unable to load dashboard data.");
      return false;
    } finally {
      setBootstrapped(true);
    }
  }

  const me = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === "player") return players.find((item) => item.id === currentUser.id);
    if (currentUser.role === "team_owner") return teamOwners.find((item) => item.id === currentUser.id);
    return superAdmins.find((item) => item.id === currentUser.id);
  }, [currentUser, players, teamOwners, superAdmins]);

  const sortedPlayers = useMemo(
    () =>
      [...players].sort(
        (a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()
      ),
    [players]
  );
  const filteredAdminPlayers = useMemo(() => {
    const query = String(playerSearch || "").trim().toLowerCase();
    if (!query) return sortedPlayers;
    return sortedPlayers.filter((player) => {
      const name = String(player.name || "").toLowerCase();
      const mobile = String(player.mobile || "").toLowerCase();
      return name.includes(query) || mobile.includes(query);
    });
  }, [playerSearch, sortedPlayers]);
  const sortedTeamOwners = useMemo(
    () =>
      [...teamOwners].sort(
        (a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime()
      ),
    [teamOwners]
  );
  const sortedSuperAdmins = useMemo(
    () =>
      [...superAdmins].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      ),
    [superAdmins]
  );
  const teamOwnerOptions = useMemo(
    () => [...teamOwners].sort((a, b) => String(a.teamName || "").localeCompare(String(b.teamName || ""), undefined, { sensitivity: "base" })),
    [teamOwners]
  );

  function openCreateModal(role) {
    setCreateRole(role);
    setCreatePlayerPhoto("");
    setCreateTeamLogo("");
    setCreateTeamJerseyDesign("");
    setMessage("");
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creating) return;
    setShowCreateModal(false);
  }

  function resetCreateModalState(formElement) {
    if (formElement) formElement.reset();
    setCreatePlayerPhoto("");
    setCreateTeamLogo("");
    setCreateTeamJerseyDesign("");
    setShowCreateModal(false);
  }

  function startEdit(type, entry) {
    setEditType(type);
    setEditId(entry.id);
    setEditDraft(entry);
    setMessage("");
  }

  function closeEditModal() {
    setEditType("");
    setEditId("");
    setEditDraft({});
  }

  function openImagePreview(src, alt) {
    if (!src) return;
    setPreviewImage({ src, alt });
  }

  function closeImagePreview() {
    setPreviewImage(null);
  }

  function toDatetimeLocalValue(isoValue) {
    if (!isoValue) return "";
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (value) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (savingSettings) return;

    try {
      setSavingSettings(true);
      const form = new FormData(event.currentTarget);
      const showTeamOwnerPlayerList = form.get("showTeamOwnerPlayerList") === "on";
      const auctionDate = String(form.get("auctionDate") || "").trim();

      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showTeamOwnerPlayerList,
          auctionDate: auctionDate ? new Date(auctionDate).toISOString() : null
        })
      });
      if (response.status === 401) {
        await forceLogoutToHome();
        return;
      }
      const result = await response.json();
      if (!response.ok || !result?.ok) {
        setMessage(result?.error || "Unable to save settings.");
        return;
      }

      setSettings(result.settings || { showTeamOwnerPlayerList, auctionDate: auctionDate || null });
      await refresh(false, false);
      setMessage("Settings updated.");
    } catch (error) {
      setMessage(error.message || "Unable to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  async function loadMore(section) {
    if (!currentUser) return;
    if (section === "players") return;

    const keyMap = {
      players: "players",
      team_owners: "teamOwners",
      super_admins: "superAdmins"
    };
    const sectionKey = keyMap[section];
    if (!sectionKey) return;

    const pager = pagination[sectionKey] || { offset: 0, limit: section === "players" ? PLAYERS_LIMIT : PAGE_SIZE, hasMore: false };
    if (!pager.hasMore) return;

    try {
      const query = new URLSearchParams({
        only: section,
        playersLimit: String(PLAYERS_LIMIT),
        teamOwnersLimit: String(PAGE_SIZE),
        superAdminsLimit: String(PAGE_SIZE),
        playersOffset: String(section === "players" ? pager.offset : 0),
        teamOwnersOffset: String(section === "team_owners" ? pager.offset : 0),
        superAdminsOffset: String(section === "super_admins" ? pager.offset : 0),
        ts: String(Date.now())
      });

      const response = await fetch(`/api/dashboard/data?${query.toString()}`, { cache: "no-store" });
      if (response.status === 401) {
        await forceLogoutToHome();
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to load more records.");
        return;
      }

      if (section === "players") {
        setPlayers((prev) => [...prev, ...(data.players || [])]);
      } else if (section === "team_owners") {
        setTeamOwners((prev) => [...prev, ...(data.teamOwners || [])]);
      } else {
        setSuperAdmins((prev) => [...prev, ...(data.superAdmins || [])]);
      }

      if (data.pagination?.[sectionKey]) {
        setPagination((prev) => ({ ...prev, [sectionKey]: data.pagination[sectionKey] }));
      }
    } catch (error) {
      setMessage(error.message || "Unable to load more records.");
    }
  }

  function applyLocalCreate(role, draft, item = {}) {
    if (role === "player") {
      const created = {
        id: item.id || `local-player-${Date.now()}`,
        personId: item.personId || item.person_id || `person-${Date.now()}`,
        role: "player",
        name: draft.name || item.name || "",
        photo: draft.photo || item.photo || "",
        email: draft.email || item.email || "",
        mobile: draft.mobile || item.mobile || "",
        jerseyNumber: draft.jerseyNumber || item.jerseyNumber || item.jersey_number || "",
        jerseySize: draft.jerseySize || item.jerseySize || item.jersey_size || "",
        jerseyName: draft.jerseyName || item.jerseyName || item.jersey_name || "",
        village: draft.village || item.village || "",
        assignedTeamOwnerId: draft.assignedTeamOwnerId || item.assignedTeamOwnerId || item.assigned_team_owner_id || "",
        assignedTeamName: draft.assignedTeamName || item.assignedTeamName || item.assigned_team_name || "",
        playerPoints: Number(item.playerPoints ?? item.player_points ?? 0),
        feePaid: Number(item.feePaid ?? item.fee_paid ?? 310),
        paymentRef: item.paymentRef || item.payment_ref || "ADMIN_CREATED",
        registeredAt: item.registeredAt || item.registered_at || new Date().toISOString()
      };
      setPlayers((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
      return;
    }

    if (role === "team_owner") {
      const created = {
        id: item.id || `local-owner-${Date.now()}`,
        personId: item.personId || item.person_id || `person-${Date.now()}`,
        role: "team_owner",
        ownerName: draft.ownerName || item.ownerName || item.owner_name || "",
        teamName: draft.teamName || item.teamName || item.team_name || "",
        logo: draft.logo || item.logo || "",
        jerseyDesign: draft.jerseyDesign || item.jerseyDesign || item.jersey_design || "",
        email: draft.email || item.email || "",
        jerseyPattern: draft.jerseyPattern || item.jerseyPattern || item.jersey_pattern || "",
        ownerMobile: draft.ownerMobile || item.ownerMobile || item.owner_mobile || "",
        auctionBudget: Number(item.auctionBudget ?? item.auction_budget ?? 100000),
        feePaid: Number(item.feePaid ?? item.fee_paid ?? 5100),
        paymentRef: item.paymentRef || item.payment_ref || "ADMIN_CREATED",
        registeredAt: item.registeredAt || item.registered_at || new Date().toISOString()
      };
      setTeamOwners((prev) => [created, ...prev.filter((t) => t.id !== created.id)]);
      return;
    }

    const created = {
      id: item.id || `local-admin-${Date.now()}`,
      personId: item.personId || item.person_id || `person-${Date.now()}`,
      role: "super_admin",
      name: draft.name || item.name || "",
      email: draft.email || item.email || "",
      createdAt: item.createdAt || item.created_at || new Date().toISOString()
    };
    setSuperAdmins((prev) => [created, ...prev.filter((a) => a.id !== created.id)]);
  }

  function applyLocalUpdate(type, id, draft) {
    if (type === "player") {
      setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...draft } : p)));
      return;
    }
    if (type === "team_owner") {
      setTeamOwners((prev) => prev.map((t) => (t.id === id ? { ...t, ...draft } : t)));
      return;
    }
    setSuperAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, ...draft } : a)));
  }

  function applyLocalDelete(type, id) {
    if (type === "player") {
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      return;
    }
    if (type === "team_owner") {
      setTeamOwners((prev) => prev.filter((t) => t.id !== id));
      return;
    }
    setSuperAdmins((prev) => prev.filter((a) => a.id !== id));
  }

  function buildEditPayload() {
    if (editType !== "player") return editDraft;
    return {
      ...editDraft,
      assignedTeamOwnerId: String(editDraft.assignedTeamOwnerId || "").trim(),
      playerPoints: Number(editDraft.playerPoints || 0)
    };
  }

  async function saveEdit(event) {
    event.preventDefault();
    if (!editType || !editId) return;
    try {
      const payload = buildEditPayload();
      const response = await fetch("/api/dashboard/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editType, editId, editDraft: payload })
      });
      if (response.status === 401) {
        await forceLogoutToHome();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to update record.");
        return;
      }

      applyLocalUpdate(editType, editId, payload);
      await refresh(false, true);
      closeEditModal();
      setMessage("Record updated.");
    } catch (error) {
      setMessage(error.message || "Unable to update record.");
    }
  }

  async function remove(type, id) {
    try {
      const response = await fetch("/api/dashboard/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id })
      });
      if (response.status === 401) {
        await forceLogoutToHome();
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Unable to delete record.");
        return;
      }

      applyLocalDelete(type, id);
      await refresh(false, true);
      setMessage("Record deleted.");
    } catch (error) {
      setMessage(error.message || "Unable to delete record.");
    }
  }

  function downloadPlayersCsv() {
    if (!sortedPlayers.length) {
      setMessage("No players found to download.");
      return;
    }

    const headers = ["Name", "Mobile", "Village", "Jersey Name", "Assigned Team", "Player Points"];

    const escapeCsv = (value) => {
      const text = String(value ?? "").replace(/"/g, '""');
      return `"${text}"`;
    };

    const alphabeticalPlayers = [...sortedPlayers].sort((a, b) =>
      String(a?.name || "").localeCompare(String(b?.name || ""), undefined, { sensitivity: "base" })
    );

    const rows = alphabeticalPlayers.map((player) =>
      [
        player.name,
        player.mobile,
        player.village,
        player.jerseyName,
        player.assignedTeamName,
        player.playerPoints
      ].map(escapeCsv).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `kmpl-players-${datePart}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function buildAuctionList() {
    if (!sortedPlayers.length) {
      throw new Error("No players found to prepare the auction list.");
    }

    const fixedRequests = [
      { position: 0, name: "Hemanth", mobile: "9390567662" },
      { position: 2, name: "kishore", mobile: "7981067942" },
      { position: 4, name: "dinesh", mobile: "7989132231" },
      { position: 6, name: "sasi", mobile: "6304727537" },
      { position: 8, name: "yugandhar", mobile: "9390567662" },
      { position: 10, name: "Padmanabha Reddy", mobile: "98765" },
      { position: 12, name: "Harish", mobile: "987659" }
    ];
    const lastFourthRequest = { fromEnd: 4, name: "Naveen Roman", mobile: "7989126693" };

    if (sortedPlayers.length < 14) {
      throw new Error("At least 14 players are required to prepare this auction order.");
    }

    const availablePlayers = [...sortedPlayers];
    const takePlayer = ({ name, mobile }) => {
      const targetName = normalizeText(name);
      const targetMobile = normalizePhone(mobile);
      const playerEntries = availablePlayers.map((player, index) => ({ player, index }));
      let matches = targetMobile
        ? playerEntries.filter(({ player }) => normalizePhone(player.mobile) === targetMobile)
        : [];

      if (matches.length > 1 && targetName) {
        const exactNameMatches = matches.filter(({ player }) => normalizeText(player.name) === targetName);
        if (exactNameMatches.length === 1) matches = exactNameMatches;
      }

      if (matches.length > 1 && targetName) {
        const looseNameMatches = matches.filter(({ player }) => {
          const playerName = normalizeText(player.name);
          return playerName.includes(targetName) || targetName.includes(playerName);
        });
        if (looseNameMatches.length === 1) matches = looseNameMatches;
      }

      if (!matches.length && targetName) {
        matches = playerEntries.filter(({ player }) => normalizeText(player.name) === targetName);
      }

      if (!matches.length && targetName) {
        const looseNameMatches = playerEntries.filter(({ player }) => {
          const playerName = normalizeText(player.name);
          return playerName.includes(targetName) || targetName.includes(playerName);
        });
        if (looseNameMatches.length === 1) matches = looseNameMatches;
      }

      const playerIndex = matches.length === 1 ? matches[0].index : -1;

      if (playerIndex === -1) {
        throw new Error(`Required player not found: ${name} (${mobile})`);
      }
      return availablePlayers.splice(playerIndex, 1)[0];
    };

    const totalPlayers = sortedPlayers.length;
    const slots = new Array(totalPlayers).fill(null);

    for (const request of fixedRequests) {
      if (slots[request.position]) {
        throw new Error("Auction slot conflict detected.");
      }
      slots[request.position] = { ...takePlayer(request), auctionSlotType: "Fixed" };
    }

    const fourthFromLastIndex = totalPlayers - lastFourthRequest.fromEnd;
    if (fourthFromLastIndex < 0 || fourthFromLastIndex >= totalPlayers) {
      throw new Error("Unable to place the 4th-from-last auction record.");
    }
    if (slots[fourthFromLastIndex]) {
      throw new Error("4th-from-last auction slot conflicts with the fixed odd-slot players.");
    }
    slots[fourthFromLastIndex] = { ...takePlayer(lastFourthRequest), auctionSlotType: "Fixed" };

    const randomizedPlayers = shuffleItems(availablePlayers).map((player) => ({
      ...player,
      auctionSlotType: "Random"
    }));

    let randomIndex = 0;
    for (let index = 0; index < slots.length; index += 1) {
      if (slots[index]) continue;
      slots[index] = randomizedPlayers[randomIndex];
      randomIndex += 1;
    }

    const finalList = slots.map((player, index) => ({
      serialNumber: index + 1,
      ...player
    }));
console.log(finalList)
    return finalList
  }

  function generateAuctionList() {
    try {
      const nextAuctionList = buildAuctionList();
      setAuctionList(nextAuctionList);
      setMessage("Auction list prepared.");
    } catch (error) {
      setMessage(error.message || "Unable to prepare auction list.");
    }
  }

  function downloadAuctionListCsv() {
    if (!auctionList.length) {
      setMessage("Generate the auction list before downloading it.");
      return;
    }

    const headers = ["Serial No", "Name", "Mobile", "Village", "Jersey Name", "Slot Type"];
    const escapeCsv = (value) => {
      const text = String(value ?? "").replace(/"/g, '""');
      return `"${text}"`;
    };

    const rows = auctionList.map((player) =>
      [
        player.serialNumber,
        player.name,
        player.mobile,
        player.village,
        player.jerseyName,
        player.auctionSlotType
      ].map(escapeCsv).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const datePart = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `kmpl-auction-list-${datePart}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function createByAdmin(event) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    const form = new FormData(event.currentTarget);

    let data = {};
    if (createRole === "player") {
      if (!createPlayerPhoto) {
        setMessage("Upload player photo before creating player.");
        setCreating(false);
        return;
      }

      data = {
        name: form.get("name")?.toString().trim(),
        photo: createPlayerPhoto,
        email: form.get("email")?.toString().trim(),
        mobile: form.get("mobile")?.toString().trim(),
        jerseyNumber: form.get("jerseyNumber")?.toString().trim(),
        jerseySize: form.get("jerseySize")?.toString().trim(),
        jerseyName: form.get("jerseyName")?.toString().trim(),
        village: form.get("village")?.toString().trim(),
        password: form.get("password")?.toString().trim()
      };
    } else if (createRole === "team_owner") {
      if (!createTeamLogo) {
        setMessage("Upload team logo before creating team owner.");
        setCreating(false);
        return;
      }
      if (!createTeamJerseyDesign) {
        setMessage("Upload jersey design before creating team owner.");
        setCreating(false);
        return;
      }

      data = {
        ownerName: form.get("ownerName")?.toString().trim(),
        teamName: form.get("teamName")?.toString().trim(),
        logo: createTeamLogo,
        jerseyDesign: createTeamJerseyDesign,
        email: form.get("email")?.toString().trim(),
        jerseyPattern: form.get("jerseyPattern")?.toString().trim(),
        ownerMobile: form.get("ownerMobile")?.toString().trim(),
        password: form.get("password")?.toString().trim()
      };
    } else {
      data = {
        name: form.get("adminName")?.toString().trim(),
        email: form.get("email")?.toString().trim(),
        password: form.get("password")?.toString().trim()
      };
    }

    try {
      const response = await fetch("/api/dashboard/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createRole, data })
      });
      if (response.status === 401) {
        await forceLogoutToHome();
        return;
      }

      const result = await response.json();
      if (!response.ok || !result?.ok) {
        setMessage(result.error || "Unable to create record.");
        return;
      }

      applyLocalCreate(createRole, data, result.item || {});
      resetCreateModalState(event.currentTarget);
      setMessage("Record created.");
      await refresh(false, true);
    } catch (error) {
      setMessage(error.message || "Unable to create record.");
    } finally {
      setCreating(false);
    }
  }

  async function updateSelf(event, role) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!currentUser || !me) return;

    const data =
      role === "player"
        ? {
            name: form.get("name")?.toString().trim(),
            photo: selfPlayerPhoto || me.photo,
            mobile: form.get("mobile")?.toString().trim(),
            jerseyNumber: form.get("jerseyNumber")?.toString().trim(),
            jerseySize: form.get("jerseySize")?.toString().trim(),
            jerseyName: form.get("jerseyName")?.toString().trim(),
            village: form.get("village")?.toString().trim(),
            password: form.get("password")?.toString().trim()
          }
        : {
            ownerName: form.get("ownerName")?.toString().trim(),
            teamName: form.get("teamName")?.toString().trim(),
            logo: selfTeamLogo || me.logo,
            jerseyDesign: selfTeamJerseyDesign || me.jerseyDesign,
            jerseyPattern: form.get("jerseyPattern")?.toString().trim(),
            ownerMobile: form.get("ownerMobile")?.toString().trim(),
            password: form.get("password")?.toString().trim()
          };

    try {
      const response = await fetch("/api/dashboard/update-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, data })
      });
      if (response.status === 401) {
        await forceLogoutToHome();
        return;
      }

      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Unable to update profile.");
        return;
      }

      if (role === "player") {
        setPlayers((prev) => prev.map((p) => (p.id === currentUser.id ? { ...p, ...data } : p)));
      } else {
        setTeamOwners((prev) => prev.map((t) => (t.id === currentUser.id ? { ...t, ...data } : t)));
      }
      setSelfPlayerPhoto("");
      setSelfTeamLogo("");
      setSelfTeamJerseyDesign("");
      await refresh(false, true);
      setMessage("Profile updated.");
    } catch (error) {
      setMessage(error.message || "Unable to update profile.");
    }
  }

  if (!bootstrapped) {
    return (
      <main>
        <AppHeader />
        <div className="container">
          <section className="card">
            <p className="muted">Loading dashboard...</p>
          </section>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main>
        <AppHeader />
        <div className="container">
          <section className="card">
            <h3>Session expired</h3>
            <p className="muted">Redirecting to login...</p>
            <button className="btn" type="button" onClick={() => router.replace("/login")}>Go to Login</button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main>
      <AppHeader />
      <div className="container">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />

        <section className="card">
          <div className="row space-between">
            <div>
              <h2 className="section-title">
                <FaTachometerAlt aria-hidden="true" />
                <span>Dashboard ({currentUser.role.replace("_", " ")})</span>
              </h2>
              <p className="muted">Logged in as ID: {currentUser.id}</p>
            </div>
          </div>
        </section>

        {currentUser.role === "super_admin" ? (
          <>
            {showCreateModal ? (
              <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeCreateModal}>
                <section className="modal-card" onClick={(event) => event.stopPropagation()}>
                  <div className="row space-between modal-head">
                    <h3 className="section-title">
                      <FaPlusCircle aria-hidden="true" />
                      <span>Create {createRole === "player" ? "Player" : createRole === "team_owner" ? "Team Owner" : "Admin"}</span>
                    </h3>
                    <button className="btn ghost" type="button" onClick={closeCreateModal}>Close</button>
                  </div>

                  <form className="form-grid modal-form-grid" onSubmit={createByAdmin}>
                    {createRole === "player" ? (
                      <>
                        <label>Name<input name="name" required /></label>
                        <label>Email<input name="email" type="email" /></label>
                        <label className="field-full">
                          Photo Upload
                          <input
                            name="photoFile"
                            type="file"
                            accept="image/*"
                            required
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                setCreatePlayerPhoto("");
                                return;
                              }
                              try {
                                setCreatePlayerPhoto(await fileToDataUrl(file));
                              } catch (error) {
                                setMessage(error.message);
                              }
                            }}
                          />
                        </label>
                        {createPlayerPhoto ? <div className="preview-card field-full"><img className="preview-image" src={createPlayerPhoto} alt="Player photo preview" /></div> : null}
                        <label>Mobile<input name="mobile" required /></label>
                        <label>Jersey Number<input name="jerseyNumber" required /></label>
                        <label>Jersey Size<input name="jerseySize" required /></label>
                        <label>Jersey Name<input name="jerseyName" required /></label>
                        <label>Village<input name="village" required /></label>
                        <label>Password<PasswordField name="password" required /></label>
                      </>
                    ) : null}

                    {createRole === "team_owner" ? (
                      <>
                        <label>Owner Name<input name="ownerName" required /></label>
                        <label>Email<input name="email" type="email" /></label>
                        <label>Team Name<input name="teamName" required /></label>
                        <label className="field-full">
                          Logo Upload
                          <input
                            name="logoFile"
                            type="file"
                            accept="image/*"
                            required
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                setCreateTeamLogo("");
                                return;
                              }
                              try {
                                setCreateTeamLogo(await fileToDataUrl(file));
                              } catch (error) {
                                setMessage(error.message);
                              }
                            }}
                          />
                        </label>
                        {createTeamLogo ? <div className="preview-card field-full"><img className="preview-image" src={createTeamLogo} alt="Team logo preview" /></div> : null}
                        <label className="field-full">
                          Jersey Design Upload
                          <input
                            name="jerseyDesignFile"
                            type="file"
                            accept="image/*"
                            required
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              if (!file) {
                                setCreateTeamJerseyDesign("");
                                return;
                              }
                              try {
                                setCreateTeamJerseyDesign(await fileToDataUrl(file));
                              } catch (error) {
                                setMessage(error.message);
                              }
                            }}
                          />
                        </label>
                        {createTeamJerseyDesign ? <div className="preview-card field-full"><img className="preview-image" src={createTeamJerseyDesign} alt="Jersey design preview" /></div> : null}
                        <label>Jersey Pattern<input name="jerseyPattern" required /></label>
                        <label>Owner Mobile<input name="ownerMobile" required /></label>
                        <label>Password<PasswordField name="password" required /></label>
                      </>
                    ) : null}

                    {createRole === "super_admin" ? (
                      <>
                        <label>Admin Name<input name="adminName" required /></label>
                        <label>Email<input name="email" type="email" required /></label>
                        <label>Password<PasswordField name="password" required /></label>
                      </>
                    ) : null}

                    <div className="actions-row field-full">
                      <button className="btn" type="submit" disabled={creating}>{creating ? "Creating..." : "Create"}</button>
                      <button className="btn ghost" type="button" onClick={closeCreateModal} disabled={creating}>Cancel</button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}

            <section className="card">
              <h3 className="section-title">
                <FaCog aria-hidden="true" />
                <span>Tournament Settings</span>
              </h3>
              <form className="form-grid" onSubmit={saveSettings}>
                <label>
                  <span className="icon-inline">
                    <FaCalendarAlt aria-hidden="true" />
                    <span>Auction Date & Time</span>
                  </span>
                  <input
                    name="auctionDate"
                    type="datetime-local"
                    defaultValue={toDatetimeLocalValue(settings.auctionDate)}
                  />
                </label>
                <button className="btn icon-btn" type="submit" disabled={savingSettings}>
                  <FaUsersCog aria-hidden="true" />
                  <span>{savingSettings ? "Saving..." : "Save Settings"}</span>
                </button>
              </form>
            </section>

            {/* <section className="card">
              <div className="row space-between">
                <h3 className="section-title">
                  <FaGavel aria-hidden="true" />
                  <span>Auction List</span>
                </h3>
                <div className="actions-row">
                  <button className="btn" type="button" onClick={generateAuctionList}>Generate Auction List</button>
                  <button className="btn ghost icon-btn" type="button" onClick={downloadAuctionListCsv}>
                    <FaDownload aria-hidden="true" />
                    <span>Download Auction List</span>
                  </button>
                </div>
              </div>
              {auctionList.length ? (
                <div className="desktop-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Serial No</th><th>Name</th><th>Mobile</th><th>Village</th><th>Jersey Name</th><th>Slot Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auctionList.map((player) => (
                        <tr key={`${player.id}-${player.serialNumber}`}>
                          <td>{player.serialNumber}</td>
                          <td>{player.name}</td>
                          <td>{player.mobile || "-"}</td>
                          <td>{player.village || "-"}</td>
                          <td>{player.jerseyName || "-"}</td>
                          <td>{player.auctionSlotType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted">Generate the auction list to preview it here.</p>
              )}
            </section> */}

            <section className="card">
              <div className="row space-between">
                <h3 className="section-title"><FaUsers aria-hidden="true" /><span>Players Table ({filteredAdminPlayers.length})</span></h3>
                <div className="actions-row">
                  <button className="btn" type="button" onClick={() => openCreateModal("player")}>Create Player</button>
                  <button className="btn ghost icon-btn" type="button" onClick={downloadPlayersCsv}><FaDownload aria-hidden="true" /><span>Download Players List</span></button>
                </div>
              </div>
              <div className="actions-row" style={{ marginBottom: "12px" }}>
                <input
                  type="search"
                  placeholder="Search by name or mobile"
                  value={playerSearch}
                  onChange={(event) => setPlayerSearch(event.target.value)}
                />
              </div>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Photo</th><th>Mobile</th><th>Email</th><th>Jersey Name</th><th>Village</th><th>Assigned Team</th><th>Player Points</th><th>Fee</th><th>Payment Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdminPlayers.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td><td className="photo-cell"><ImageThumbWithPreview src={p.photo} alt={`${p.name} photo`} onPreview={openImagePreview} /></td><td>{p.mobile}</td><td>{p.email || "-"}</td><td>{p.jerseyName}</td><td>{p.village}</td><td>{p.assignedTeamName || "-"}</td><td>{formatPoints(p.playerPoints)}</td><td>{p.paymentRef}</td><td>{getPaymentStatus(p.paymentRef)}</td>
                        <td className="actions-cell">
                          <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit player" onClick={() => startEdit("player", p)}><FaEdit aria-hidden="true" /></button>
                          <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete player" onClick={() => remove("player", p.id)}><FaTrashAlt aria-hidden="true" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filteredAdminPlayers.length ? <p className="muted">No players matched your search.</p> : null}

              <div className="mobile-cards">
                {filteredAdminPlayers.map((p) => (
                  <article className="card soft" key={p.id}>
                    <p><strong>Name:</strong> {p.name}</p>
                    <p><strong>Photo:</strong> <ImageThumbWithPreview src={p.photo} alt={`${p.name} photo`} onPreview={openImagePreview} /></p>
                    <p><strong>Mobile:</strong> {p.mobile}</p>
                    <p><strong>Person ID:</strong> {p.personId || "-"}</p>
                    <p><strong>Email:</strong> {p.email || "-"}</p>
                    <p><strong>Jersey Number:</strong> {p.jerseyNumber || "-"}</p>
                    <p><strong>Jersey Size:</strong> {p.jerseySize}</p>
                    <p><strong>Jersey Name:</strong> {p.jerseyName}</p>
                    <p><strong>Village:</strong> {p.village}</p>
                    <p><strong>Assigned Team:</strong> {p.assignedTeamName || "-"}</p>
                    <p><strong>Player Points:</strong> {formatPoints(p.playerPoints)}</p>
                    <p><strong>Fee:</strong> {p.feePaid}</p>
                    <p><strong>Payment Ref:</strong> {p.paymentRef}</p>
                    <p><strong>Payment Status:</strong> {getPaymentStatus(p.paymentRef)}</p>
                    <div className="actions-row">
                      <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit player" onClick={() => startEdit("player", p)}><FaEdit aria-hidden="true" /></button>
                      <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete player" onClick={() => remove("player", p.id)}><FaTrashAlt aria-hidden="true" /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="row space-between">
                <h3 className="section-title"><FaUserShield aria-hidden="true" /><span>Team Owners Table ({sortedTeamOwners.length})</span></h3>
                <button className="btn" type="button" onClick={() => openCreateModal("team_owner")}>Create Team Owner</button>
              </div>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Owner Name</th><th>Logo</th><th>Jersey Design</th><th>Mobile</th><th>Person ID</th><th>Email</th><th>Team Name</th><th>Jersey Pattern</th><th>Auction Budget</th><th>Fee</th><th>Payment Ref</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTeamOwners.map((t) => (
                      <tr key={t.id}>
                        <td>{t.ownerName}</td><td className="photo-cell"><ImageThumbWithPreview src={t.logo} alt={`${t.teamName} logo`} onPreview={openImagePreview} /></td><td className="photo-cell"><ImageThumbWithPreview src={t.jerseyDesign} alt={`${t.teamName} jersey design`} onPreview={openImagePreview} /></td><td>{t.ownerMobile}</td><td>{t.personId || "-"}</td><td>{t.email || "-"}</td><td>{t.teamName}</td><td>{t.jerseyPattern}</td><td>{formatPoints(t.auctionBudget)}</td><td>{t.feePaid}</td><td>{t.paymentRef}</td>
                        <td className="actions-cell">
                          <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit team owner" onClick={() => startEdit("team_owner", t)}><FaEdit aria-hidden="true" /></button>
                          <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete team owner" onClick={() => remove("team_owner", t.id)}><FaTrashAlt aria-hidden="true" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {sortedTeamOwners.map((t) => (
                  <article className="card soft" key={t.id}>
                    <p><strong>Owner Name:</strong> {t.ownerName}</p>
                    <p><strong>Logo:</strong> <ImageThumbWithPreview src={t.logo} alt={`${t.teamName} logo`} onPreview={openImagePreview} /></p>
                    <p><strong>Jersey Design:</strong> <ImageThumbWithPreview src={t.jerseyDesign} alt={`${t.teamName} jersey design`} onPreview={openImagePreview} /></p>
                    <p><strong>Mobile:</strong> {t.ownerMobile}</p>
                    <p><strong>Person ID:</strong> {t.personId || "-"}</p>
                    <p><strong>Email:</strong> {t.email || "-"}</p>
                    <p><strong>Team Name:</strong> {t.teamName}</p>
                    <p><strong>Jersey Pattern:</strong> {t.jerseyPattern}</p>
                    <p><strong>Auction Budget:</strong> {formatPoints(t.auctionBudget)}</p>
                    <p><strong>Fee:</strong> {t.feePaid}</p>
                    <p><strong>Payment Ref:</strong> {t.paymentRef}</p>
                    <div className="actions-row">
                      <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit team owner" onClick={() => startEdit("team_owner", t)}><FaEdit aria-hidden="true" /></button>
                      <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete team owner" onClick={() => remove("team_owner", t.id)}><FaTrashAlt aria-hidden="true" /></button>
                    </div>
                  </article>
                ))}
              </div>
              {pagination.teamOwners?.hasMore ? (
                <div className="actions-row" style={{ marginTop: "12px" }}>
                  <button className="btn ghost" type="button" onClick={() => loadMore("team_owners")}>
                    Load More Team Owners
                  </button>
                </div>
              ) : null}
            </section>

            <section className="card">
              <div className="row space-between">
                <h3 className="section-title"><FaTable aria-hidden="true" /><span>Super Admins Table ({sortedSuperAdmins.length})</span></h3>
                <button className="btn" type="button" onClick={() => openCreateModal("super_admin")}>Create Admin</button>
              </div>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Created At</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {sortedSuperAdmins.map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td><td>{a.email}</td><td>{new Date(a.createdAt).toLocaleString()}</td>
                        <td className="actions-cell">
                          <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit super admin" onClick={() => startEdit("super_admin", a)}><FaEdit aria-hidden="true" /></button>
                          <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete super admin" onClick={() => remove("super_admin", a.id)}><FaTrashAlt aria-hidden="true" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {sortedSuperAdmins.map((a) => (
                  <article className="card soft" key={a.id}>
                    <p><strong>Name:</strong> {a.name}</p>
                    <p><strong>Email:</strong> {a.email}</p>
                    <p><strong>Created At:</strong> {new Date(a.createdAt).toLocaleString()}</p>
                    <div className="actions-row">
                      <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit super admin" onClick={() => startEdit("super_admin", a)}><FaEdit aria-hidden="true" /></button>
                      <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete super admin" onClick={() => remove("super_admin", a.id)}><FaTrashAlt aria-hidden="true" /></button>
                    </div>
                  </article>
                ))}
              </div>
              {pagination.superAdmins?.hasMore ? (
                <div className="actions-row" style={{ marginTop: "12px" }}>
                  <button className="btn ghost" type="button" onClick={() => loadMore("super_admins")}>
                    Load More Admins
                  </button>
                </div>
              ) : null}
            </section>

            {editType ? (
              <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeEditModal}>
                <section className="modal-card" onClick={(event) => event.stopPropagation()}>
                  <div className="row space-between modal-head">
                    <h3>Edit Record ({editType.replace("_", " ")})</h3>
                    <button className="btn ghost" type="button" onClick={closeEditModal}>Close</button>
                  </div>
                  <form className="form-grid modal-form-grid" onSubmit={saveEdit}>
                    {editType === "player" ? (
                      <>
                        {Object.keys(editDraft)
                          .filter((key) => !["id", "role", "assignedTeamName", "assignedTeamOwnerId", "playerPoints"].includes(key))
                          .map((key) => (
                            <label key={key}>
                              {key}
                              {key === "photo" ? (
                                <>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (event) => {
                                      const file = event.target.files?.[0];
                                      if (!file) return;
                                      try {
                                        const encoded = await fileToDataUrl(file);
                                        setEditDraft((prev) => ({ ...prev, [key]: encoded }));
                                      } catch (error) {
                                        setMessage(error.message);
                                      }
                                    }}
                                  />
                                  <ImageThumb src={editDraft[key]} alt={`${key} preview`} />
                                </>
                              ) : (
                                <input value={editDraft[key] ?? ""} onChange={(event) => setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))} />
                              )}
                            </label>
                          ))}
                        <label>
                          Assigned Team
                          <select
                            value={editDraft.assignedTeamOwnerId || ""}
                            onChange={(event) => {
                              const owner = teamOwnerOptions.find((item) => item.id === event.target.value);
                              setEditDraft((prev) => ({
                                ...prev,
                                assignedTeamOwnerId: event.target.value,
                                assignedTeamName: owner?.teamName || ""
                              }));
                            }}
                          >
                            <option value="">Unassigned</option>
                            {teamOwnerOptions.map((owner) => (
                              <option key={owner.id} value={owner.id}>{owner.teamName}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Player Points
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editDraft.playerPoints ?? 0}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, playerPoints: event.target.value }))}
                          />
                        </label>
                      </>
                    ) : (
                      Object.keys(editDraft)
                        .filter((key) => key !== "id" && key !== "role")
                        .map((key) => (
                          <label key={key}>
                            {key}
                            {key === "photo" || key === "logo" || key === "jerseyDesign" ? (
                              <>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={async (event) => {
                                    const file = event.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const encoded = await fileToDataUrl(file);
                                      setEditDraft((prev) => ({ ...prev, [key]: encoded }));
                                    } catch (error) {
                                      setMessage(error.message);
                                    }
                                  }}
                                />
                                <ImageThumb src={editDraft[key]} alt={`${key} preview`} />
                              </>
                            ) : (
                              <input value={editDraft[key] ?? ""} onChange={(event) => setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))} />
                            )}
                          </label>
                        ))
                    )}
                    <div className="actions-row field-full">
                      <button className="btn" type="submit">Save</button>
                      <button className="btn ghost" type="button" onClick={closeEditModal}>Cancel</button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}

            {previewImage ? (
              <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeImagePreview}>
                <section className="modal-card image-modal-card" onClick={(event) => event.stopPropagation()}>
                  <div className="row space-between modal-head">
                    <h3>Profile Image</h3>
                    <button className="btn ghost" type="button" onClick={closeImagePreview}>Close</button>
                  </div>
                  <img className="image-modal-image" src={previewImage.src} alt={previewImage.alt || "Profile image"} />
                </section>
              </div>
            ) : null}
          </>
        ) : null}

        {currentUser.role === "player" && me ? (
          <section className="card">
            <h3>Player Profile</h3>
            <form className="form-grid profile-form-grid" onSubmit={(event) => updateSelf(event, "player")}>
              <label>Name<input name="name" defaultValue={me.name} required /></label>
              <label className="field-full">
                          Photo Upload
                <input
                  name="photoFile"
                  type="file"
                  accept="image/*"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      setSelfPlayerPhoto(await fileToDataUrl(file));
                    } catch (error) {
                      setMessage(error.message);
                    }
                  }}
                />
              </label>
              <div className="preview-card field-full">
                <img className="preview-image" src={selfPlayerPhoto || me.photo} alt="Player photo" />
              </div>
              <label>Mobile<input name="mobile" defaultValue={me.mobile} required /></label>
              <label>Jersey Number<input name="jerseyNumber" defaultValue={me.jerseyNumber || ""} required /></label>
              <label>Jersey Size<input name="jerseySize" defaultValue={me.jerseySize} required /></label>
              <label>Jersey Name<input name="jerseyName" defaultValue={me.jerseyName} required /></label>
              <label>Village<input name="village" defaultValue={me.village} required /></label>
              <label>Password<PasswordField name="password" required /></label>
              <button className="btn" type="submit">Update Profile</button>
            </form>
          </section>
        ) : null}

        {currentUser.role === "team_owner" && me ? (
          <>
            <section className="card">
              <div className="row space-between">
                <h3>Team Owner Profile</h3>
                <div className="actions-row">
                  {settings.auctionDate ? (
                    <button className="btn icon-btn" type="button" onClick={() => router.push("/auction")}>
                      <FaGavel aria-hidden="true" />
                      <span>Participate in Auction</span>
                    </button>
                  ) : null}
                </div>
              </div>
              <form className="form-grid profile-form-grid" onSubmit={(event) => updateSelf(event, "team_owner")}>
                <label>Owner Name<input name="ownerName" defaultValue={me.ownerName} required /></label>
                <label>Team Name<input name="teamName" defaultValue={me.teamName} required /></label>
                <label className="field-full">
                            Logo Upload
                  <input
                    name="logoFile"
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        setSelfTeamLogo(await fileToDataUrl(file));
                      } catch (error) {
                        setMessage(error.message);
                      }
                    }}
                  />
                </label>
                <div className="preview-card field-full">
                  <img className="preview-image" src={selfTeamLogo || me.logo} alt="Team logo" />
                </div>
                <label className="field-full">
                  Jersey Design Upload
                  <input
                    name="jerseyDesignFile"
                    type="file"
                    accept="image/*"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        setSelfTeamJerseyDesign(await fileToDataUrl(file));
                      } catch (error) {
                        setMessage(error.message);
                      }
                    }}
                  />
                </label>
                <div className="preview-card field-full">
                  <img className="preview-image" src={selfTeamJerseyDesign || me.jerseyDesign} alt="Jersey design" />
                </div>
                <label>Jersey Pattern<input name="jerseyPattern" defaultValue={me.jerseyPattern} required /></label>
                <label>Owner Mobile<input name="ownerMobile" defaultValue={me.ownerMobile} required /></label>
                <label>Password<PasswordField name="password" required /></label>
                <button className="btn" type="submit">Update Team Profile</button>
              </form>
            </section>

            <section className="card">
              <div className="row space-between">
                <h3 className="section-title">
                  <FaUsers aria-hidden="true" />
                  <span>{me.teamName} Squad</span>
                </h3>
                <button className="btn ghost icon-btn" type="button" onClick={downloadPlayersCsv}>
                  <FaDownload aria-hidden="true" />
                  <span>Download Team Players</span>
                </button>
              </div>
              <p className="muted">
                Budget: {formatPoints(teamSummary?.budget || me.auctionBudget || 100000)} | Spent: {formatPoints(teamSummary?.spentPoints || 0)} | Remaining: {formatPoints(teamSummary?.remainingPoints || 0)} | Players: {teamSummary?.playerCount || sortedPlayers.length}
              </p>
              <div className="mobile-cards">
                <article className="card soft">
                  <p><strong>Total Budget:</strong> {formatPoints(teamSummary?.budget || me.auctionBudget || 100000)}</p>
                  <p><strong>Spent Points:</strong> {formatPoints(teamSummary?.spentPoints || 0)}</p>
                  <p><strong>Remaining Points:</strong> {formatPoints(teamSummary?.remainingPoints || 0)}</p>
                  <p><strong>Players:</strong> {teamSummary?.playerCount || sortedPlayers.length}</p>
                </article>
              </div>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Photo</th>
                      <th>Name</th>
                      <th>Village</th>
                      <th>Mobile Number</th>
                      <th>Jersey Name</th>
                      <th>Player Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length ? sortedPlayers.map((player) => (
                      <tr key={player.id}>
                        <td className="photo-cell">
                          <ImageThumbWithPreview
                            src={player.photo}
                            alt={`${player.name} photo`}
                            onPreview={openImagePreview}
                          />
                        </td>
                        <td>{player.name}</td>
                        <td>{player.village || "-"}</td>
                        <td>{player.mobile || "-"}</td>
                        <td>{player.jerseyName || "-"}</td>
                        <td>{formatPoints(player.playerPoints)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="muted">No players assigned to your team yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards">
                {sortedPlayers.length ? sortedPlayers.map((player) => (
                  <article className="card soft" key={player.id}>
                    <p><strong>Photo:</strong> <ImageThumbWithPreview src={player.photo} alt={`${player.name} photo`} onPreview={openImagePreview} /></p>
                    <p><strong>Name:</strong> {player.name}</p>
                    <p><strong>Village:</strong> {player.village || "-"}</p>
                    <p><strong>Mobile Number:</strong> {player.mobile || "-"}</p>
                    <p><strong>Jersey Name:</strong> {player.jerseyName || "-"}</p>
                    <p><strong>Player Points:</strong> {formatPoints(player.playerPoints)}</p>
                  </article>
                )) : (
                  <article className="card soft">
                    <p>No players assigned to your team yet.</p>
                  </article>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
