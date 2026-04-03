"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import {
  FaDownload,
  FaEdit,
  FaPlusCircle,
  FaTable,
  FaTachometerAlt,
  FaTrashAlt,
  FaUserShield,
  FaUsers
} from "react-icons/fa";
import PasswordField from "@/components/PasswordField";
import toast from "react-hot-toast";

function ImageThumb({ src, alt }) {
  if (!src) return <span>-</span>;
  return <img className="table-image" src={src} alt={alt} />;
}

function getPaymentStatus(paymentRef) {
  if (!paymentRef) return "PENDING";
  if (paymentRef === "ADMIN_CREATED") return "ADMIN_CREATED";
  return "PAID";
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
  const [message, setMessage] = useState("");

  const [createRole, setCreateRole] = useState("player");
  const [createPlayerPhoto, setCreatePlayerPhoto] = useState("");
  const [createTeamLogo, setCreateTeamLogo] = useState("");
  const [selfPlayerPhoto, setSelfPlayerPhoto] = useState("");
  const [selfTeamLogo, setSelfTeamLogo] = useState("");

  const [editType, setEditType] = useState("");
  const [editId, setEditId] = useState("");
  const [editDraft, setEditDraft] = useState({});
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  async function refresh(firstLoad = false) {
    const response = await fetch("/api/dashboard/data", { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      const data = await response.json();
      setMessage(data.error || "Unable to load dashboard data.");
      return;
    }

    const data = await response.json();
    setCurrentUserState(data.currentUser || null);
    setPlayers(data.players || []);
    setTeamOwners(data.teamOwners || []);
    setSuperAdmins(data.superAdmins || []);

    if (!data.currentUser && firstLoad) router.push("/login");
  }

  const me = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === "player") return players.find((item) => item.id === currentUser.id);
    if (currentUser.role === "team_owner") return teamOwners.find((item) => item.id === currentUser.id);
    return superAdmins.find((item) => item.id === currentUser.id);
  }, [currentUser, players, teamOwners, superAdmins]);

  function openCreateModal(role) {
    setCreateRole(role);
    setCreatePlayerPhoto("");
    setCreateTeamLogo("");
    setMessage("");
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (creating) return;
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

  async function saveEdit(event) {
    event.preventDefault();
    if (!editType || !editId) return;

    const response = await fetch("/api/dashboard/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editType, editId, editDraft })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Unable to update record.");
      return;
    }

    await refresh();
    closeEditModal();
    setMessage("Record updated.");
  }

  async function remove(type, id) {
    const response = await fetch("/api/dashboard/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Unable to delete record.");
      return;
    }

    await refresh();
    setMessage("Record deleted.");
  }

  function downloadPlayersCsv() {
    if (!players.length) {
      setMessage("No players found to download.");
      return;
    }

    const headers = [
      "id",
      "personId",
      "name",
      "email",
      "mobile",
      "jerseyNumber",
      "jerseySize",
      "jerseyName",
      "village",
      "feePaid",
      "paymentRef",
      "paymentStatus",
      "registeredAt"
    ];

    const escapeCsv = (value) => {
      const text = String(value ?? "").replace(/"/g, '""');
      return `"${text}"`;
    };

    const rows = players.map((player) =>
      [
        player.id,
        player.personId,
        player.name,
        player.email,
        player.mobile,
        player.jerseyNumber,
        player.jerseySize,
        player.jerseyName,
        player.village,
        player.feePaid,
        player.paymentRef,
        getPaymentStatus(player.paymentRef),
        player.registeredAt
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

      data = {
        ownerName: form.get("ownerName")?.toString().trim(),
        teamName: form.get("teamName")?.toString().trim(),
        logo: createTeamLogo,
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

    const response = await fetch("/api/dashboard/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ createRole, data })
    });

    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to create record.");
      setCreating(false);
      return;
    }

    event.currentTarget.reset();
    setCreatePlayerPhoto("");
    setCreateTeamLogo("");
    await refresh();
    setMessage("Record created.");
    setCreating(false);
    setShowCreateModal(false);
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
            jerseyPattern: form.get("jerseyPattern")?.toString().trim(),
            ownerMobile: form.get("ownerMobile")?.toString().trim(),
            password: form.get("password")?.toString().trim()
          };

    const response = await fetch("/api/dashboard/update-self", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, data })
    });

    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to update profile.");
      return;
    }

    setSelfPlayerPhoto("");
    setSelfTeamLogo("");
    await refresh();
    setMessage("Profile updated.");
  }

  if (!currentUser) return null;

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
              <div className="row space-between">
                <h3 className="section-title"><FaUsers aria-hidden="true" /><span>Players Table ({players.length})</span></h3>
                <div className="actions-row">
                  <button className="btn" type="button" onClick={() => openCreateModal("player")}>Create Player</button>
                  <button className="btn ghost icon-btn" type="button" onClick={downloadPlayersCsv}><FaDownload aria-hidden="true" /><span>Download Players CSV</span></button>
                </div>
              </div>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Photo</th><th>Mobile</th><th>Person ID</th><th>Email</th><th>Jersey Number</th><th>Jersey Size</th><th>Jersey Name</th><th>Village</th><th>Fee</th><th>Payment Ref</th><th>Payment Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td><td><ImageThumb src={p.photo} alt={`${p.name} photo`} /></td><td>{p.mobile}</td><td>{p.personId || "-"}</td><td>{p.email || "-"}</td><td>{p.jerseyNumber || "-"}</td><td>{p.jerseySize}</td><td>{p.jerseyName}</td><td>{p.village}</td><td>{p.feePaid}</td><td>{p.paymentRef}</td><td>{getPaymentStatus(p.paymentRef)}</td>
                        <td className="actions-cell">
                          <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit player" onClick={() => startEdit("player", p)}><FaEdit aria-hidden="true" /></button>
                          <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete player" onClick={() => remove("player", p.id)}><FaTrashAlt aria-hidden="true" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mobile-cards">
                {players.map((p) => (
                  <article className="card soft" key={p.id}>
                    <p><strong>Name:</strong> {p.name}</p>
                    <p><strong>Photo:</strong> <ImageThumb src={p.photo} alt={`${p.name} photo`} /></p>
                    <p><strong>Mobile:</strong> {p.mobile}</p>
                    <p><strong>Person ID:</strong> {p.personId || "-"}</p>
                    <p><strong>Email:</strong> {p.email || "-"}</p>
                    <p><strong>Jersey Number:</strong> {p.jerseyNumber || "-"}</p>
                    <p><strong>Jersey Size:</strong> {p.jerseySize}</p>
                    <p><strong>Jersey Name:</strong> {p.jerseyName}</p>
                    <p><strong>Village:</strong> {p.village}</p>
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
                <h3 className="section-title"><FaUserShield aria-hidden="true" /><span>Team Owners Table ({teamOwners.length})</span></h3>
                <button className="btn" type="button" onClick={() => openCreateModal("team_owner")}>Create Team Owner</button>
              </div>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Owner Name</th><th>Logo</th><th>Mobile</th><th>Person ID</th><th>Email</th><th>Team Name</th><th>Jersey Pattern</th><th>Fee</th><th>Payment Ref</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamOwners.map((t) => (
                      <tr key={t.id}>
                        <td>{t.ownerName}</td><td><ImageThumb src={t.logo} alt={`${t.teamName} logo`} /></td><td>{t.ownerMobile}</td><td>{t.personId || "-"}</td><td>{t.email || "-"}</td><td>{t.teamName}</td><td>{t.jerseyPattern}</td><td>{t.feePaid}</td><td>{t.paymentRef}</td>
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
                {teamOwners.map((t) => (
                  <article className="card soft" key={t.id}>
                    <p><strong>Owner Name:</strong> {t.ownerName}</p>
                    <p><strong>Logo:</strong> <ImageThumb src={t.logo} alt={`${t.teamName} logo`} /></p>
                    <p><strong>Mobile:</strong> {t.ownerMobile}</p>
                    <p><strong>Person ID:</strong> {t.personId || "-"}</p>
                    <p><strong>Email:</strong> {t.email || "-"}</p>
                    <p><strong>Team Name:</strong> {t.teamName}</p>
                    <p><strong>Jersey Pattern:</strong> {t.jerseyPattern}</p>
                    <p><strong>Fee:</strong> {t.feePaid}</p>
                    <p><strong>Payment Ref:</strong> {t.paymentRef}</p>
                    <div className="actions-row">
                      <button className="btn mini icon-only-btn" title="Edit" aria-label="Edit team owner" onClick={() => startEdit("team_owner", t)}><FaEdit aria-hidden="true" /></button>
                      <button className="btn mini danger icon-only-btn" title="Delete" aria-label="Delete team owner" onClick={() => remove("team_owner", t.id)}><FaTrashAlt aria-hidden="true" /></button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <div className="row space-between">
                <h3 className="section-title"><FaTable aria-hidden="true" /><span>Super Admins Table ({superAdmins.length})</span></h3>
                <button className="btn" type="button" onClick={() => openCreateModal("super_admin")}>Create Admin</button>
              </div>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Created At</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {superAdmins.map((a) => (
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
                {superAdmins.map((a) => (
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
            </section>

            {editType ? (
              <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closeEditModal}>
                <section className="modal-card" onClick={(event) => event.stopPropagation()}>
                  <div className="row space-between modal-head">
                    <h3>Edit Record ({editType.replace("_", " ")})</h3>
                    <button className="btn ghost" type="button" onClick={closeEditModal}>Close</button>
                  </div>
                  <form className="form-grid modal-form-grid" onSubmit={saveEdit}>
                    {Object.keys(editDraft)
                      .filter((key) => key !== "id" && key !== "role")
                      .map((key) => (
                        <label key={key}>
                          {key}
                          {key === "photo" || key === "logo" ? (
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
                    <div className="actions-row field-full">
                      <button className="btn" type="submit">Save</button>
                      <button className="btn ghost" type="button" onClick={closeEditModal}>Cancel</button>
                    </div>
                  </form>
                </section>
              </div>
            ) : null}
          </>
        ) : null}

        {currentUser.role === "player" && me ? (
          <section className="card">
            <h3>Player Profile</h3>
            <form className="form-grid" onSubmit={(event) => updateSelf(event, "player")}>
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
              <div className="preview-card">
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
          <section className="card">
            <h3>Team Owner Profile</h3>
            <form className="form-grid" onSubmit={(event) => updateSelf(event, "team_owner")}>
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
              <div className="preview-card">
                <img className="preview-image" src={selfTeamLogo || me.logo} alt="Team logo" />
              </div>
              <label>Jersey Pattern<input name="jerseyPattern" defaultValue={me.jerseyPattern} required /></label>
              <label>Owner Mobile<input name="ownerMobile" defaultValue={me.ownerMobile} required /></label>
              <label>Password<PasswordField name="password" required /></label>
              <button className="btn" type="submit">Update Team Profile</button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}





