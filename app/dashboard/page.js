"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import {
  addItem,
  buildId,
  deleteItem,
  ensureSeedData,
  getCurrentUser,
  getList,
  updateItem
} from "@/lib/storage";
import PasswordField from "@/components/PasswordField";

function KeyValue({ label, value }) {
  return (
    <p>
      <strong>{label}:</strong> {value || "-"}
    </p>
  );
}

function ImageThumb({ src, alt }) {
  if (!src) return <span>-</span>;
  return <img className="table-image" src={src} alt={alt} />;
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

  useEffect(() => {
    ensureSeedData();
    const active = getCurrentUser();
    if (!active) {
      router.push("/login");
      return;
    }
    setCurrentUserState(active);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function refresh() {
    setPlayers(getList("players"));
    setTeamOwners(getList("teamOwners"));
    setSuperAdmins(getList("superAdmins"));
  }

  const me = useMemo(() => {
    if (!currentUser) return null;
    if (currentUser.role === "player") {
      return players.find((item) => item.id === currentUser.id);
    }
    if (currentUser.role === "team_owner") {
      return teamOwners.find((item) => item.id === currentUser.id);
    }
    return superAdmins.find((item) => item.id === currentUser.id);
  }, [currentUser, players, teamOwners, superAdmins]);

  function startEdit(type, entry) {
    setEditType(type);
    setEditId(entry.id);
    setEditDraft(entry);
    setMessage("");
  }

  function saveEdit(event) {
    event.preventDefault();
    if (!editType || !editId) return;
    const key = editType === "player" ? "players" : editType === "team_owner" ? "teamOwners" : "superAdmins";
    updateItem(key, editId, editDraft);
    refresh();
    setEditType("");
    setEditId("");
    setEditDraft({});
    setMessage("Record updated.");
  }

  function remove(type, id) {
    const key = type === "player" ? "players" : type === "team_owner" ? "teamOwners" : "superAdmins";
    deleteItem(key, id);
    refresh();
    setMessage("Record deleted.");
  }

  function createByAdmin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    if (createRole === "player") {
      if (!createPlayerPhoto) {
        setMessage("Upload player photo before creating player.");
        return;
      }

      addItem("players", {
        id: buildId("player"),
        role: "player",
        personId: buildId("person"),
        name: form.get("name")?.toString().trim(),
        photo: createPlayerPhoto,
        email: "",
        mobile: form.get("mobile")?.toString().trim(),
        jerseySize: form.get("jerseySize")?.toString().trim(),
        jerseyName: form.get("jerseyName")?.toString().trim(),
        village: form.get("village")?.toString().trim(),
        password: form.get("password")?.toString().trim(),
        feePaid: 310,
        paymentRef: "ADMIN_CREATED",
        registeredAt: new Date().toISOString()
      });
    } else if (createRole === "team_owner") {
      if (!createTeamLogo) {
        setMessage("Upload team logo before creating team owner.");
        return;
      }

      addItem("teamOwners", {
        id: buildId("owner"),
        role: "team_owner",
        personId: buildId("person"),
        ownerName: form.get("ownerName")?.toString().trim(),
        teamName: form.get("teamName")?.toString().trim(),
        logo: createTeamLogo,
        email: "",
        jerseyPattern: form.get("jerseyPattern")?.toString().trim(),
        ownerMobile: form.get("ownerMobile")?.toString().trim(),
        password: form.get("password")?.toString().trim(),
        feePaid: 5100,
        paymentRef: "ADMIN_CREATED",
        registeredAt: new Date().toISOString()
      });
    } else {
      addItem("superAdmins", {
        id: buildId("admin"),
        role: "super_admin",
        name: form.get("adminName")?.toString().trim(),
        email: form.get("email")?.toString().trim(),
        password: form.get("password")?.toString().trim(),
        createdAt: new Date().toISOString()
      });
    }

    event.currentTarget.reset();
    setCreatePlayerPhoto("");
    setCreateTeamLogo("");
    refresh();
    setMessage("Record created.");
  }

  function updateSelf(event, role) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!currentUser || !me) return;

    if (role === "player") {
      updateItem("players", currentUser.id, {
        name: form.get("name")?.toString().trim(),
        photo: selfPlayerPhoto || me.photo,
        mobile: form.get("mobile")?.toString().trim(),
        jerseySize: form.get("jerseySize")?.toString().trim(),
        jerseyName: form.get("jerseyName")?.toString().trim(),
        village: form.get("village")?.toString().trim(),
        password: form.get("password")?.toString().trim()
      });
      setSelfPlayerPhoto("");
    }

    if (role === "team_owner") {
      updateItem("teamOwners", currentUser.id, {
        ownerName: form.get("ownerName")?.toString().trim(),
        teamName: form.get("teamName")?.toString().trim(),
        logo: selfTeamLogo || me.logo,
        jerseyPattern: form.get("jerseyPattern")?.toString().trim(),
        ownerMobile: form.get("ownerMobile")?.toString().trim(),
        password: form.get("password")?.toString().trim()
      });
      setSelfTeamLogo("");
    }

    refresh();
    setMessage("Profile updated.");
  }

  if (!currentUser) return null;

  return (
    <main>
      <AppHeader />
      <div className="container">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Dashboard" }
          ]}
        />

        <section className="card">
          <div className="row space-between">
            <div>
              <h2>Dashboard ({currentUser.role.replace("_", " ")})</h2>
              <p className="muted">Logged in as ID: {currentUser.id}</p>
            </div>
          </div>
          {message ? <p className="message">{message}</p> : null}
        </section>

        {currentUser.role === "super_admin" ? (
          <>
            <section className="card">
              <h3>Create Users</h3>
              <div className="switch-row">
                <button
                  className={`chip ${createRole === "player" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setCreateRole("player");
                    setCreateTeamLogo("");
                  }}
                >
                  Player
                </button>
                <button
                  className={`chip ${createRole === "team_owner" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setCreateRole("team_owner");
                    setCreatePlayerPhoto("");
                  }}
                >
                  Team Owner
                </button>
                <button
                  className={`chip ${createRole === "super_admin" ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setCreateRole("super_admin");
                    setCreatePlayerPhoto("");
                    setCreateTeamLogo("");
                  }}
                >
                  Super Admin
                </button>
              </div>

              <form className="form-grid" onSubmit={createByAdmin}>
                {createRole === "player" ? (
                  <>
                    <label>Name<input name="name" required /></label>
                    <label>
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
                    {createPlayerPhoto ? (
                      <div className="preview-card">
                        <img className="preview-image" src={createPlayerPhoto} alt="Player photo preview" />
                      </div>
                    ) : null}
                    <label>Mobile<input name="mobile" required /></label>
                    <label>Jersey Size<input name="jerseySize" required /></label>
                    <label>Jersey Name<input name="jerseyName" required /></label>
                    <label>Village<input name="village" required /></label>
                    <label>Password<PasswordField name="password" required /></label>
                  </>
                ) : null}
                {createRole === "team_owner" ? (
                  <>
                    <label>Owner Name<input name="ownerName" required /></label>
                    <label>Team Name<input name="teamName" required /></label>
                    <label>
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
                    {createTeamLogo ? (
                      <div className="preview-card">
                        <img className="preview-image" src={createTeamLogo} alt="Team logo preview" />
                      </div>
                    ) : null}
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
                <button className="btn" type="submit">Create</button>
              </form>
            </section>

            <section className="card">
              <h3>Players Table</h3>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th><th>Person ID</th><th>Email</th><th>Photo</th><th>Mobile</th><th>Jersey Size</th><th>Jersey Name</th><th>Village</th><th>Password</th><th>Fee</th><th>Payment Ref</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td><td>{p.personId || "-"}</td><td>{p.email || "-"}</td><td><ImageThumb src={p.photo} alt={`${p.name} photo`} /></td><td>{p.mobile}</td><td>{p.jerseySize}</td><td>{p.jerseyName}</td><td>{p.village}</td><td>{p.password}</td><td>{p.feePaid}</td><td>{p.paymentRef}</td>
                        <td className="actions-cell">
                          <button className="btn mini" onClick={() => startEdit("player", p)}>Edit</button>
                          <button className="btn mini danger" onClick={() => remove("player", p.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards">
                {players.map((p) => (
                  <article className="card soft" key={p.id}>
                    <KeyValue label="Name" value={p.name} />
                    <KeyValue label="Person ID" value={p.personId || "-"} />
                    <KeyValue label="Email" value={p.email || "-"} />
                    <p><strong>Photo:</strong> <ImageThumb src={p.photo} alt={`${p.name} photo`} /></p>
                    <KeyValue label="Mobile" value={p.mobile} />
                    <KeyValue label="Jersey Size" value={p.jerseySize} />
                    <KeyValue label="Jersey Name" value={p.jerseyName} />
                    <KeyValue label="Village" value={p.village} />
                    <KeyValue label="Password" value={p.password} />
                    <KeyValue label="Fee" value={p.feePaid} />
                    <KeyValue label="Payment Ref" value={p.paymentRef} />
                    <div className="actions-row">
                      <button className="btn mini" onClick={() => startEdit("player", p)}>Edit</button>
                      <button className="btn mini danger" onClick={() => remove("player", p.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <h3>Team Owners Table</h3>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr>
                      <th>Owner Name</th><th>Person ID</th><th>Email</th><th>Team Name</th><th>Logo</th><th>Jersey Pattern</th><th>Mobile</th><th>Password</th><th>Fee</th><th>Payment Ref</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamOwners.map((t) => (
                      <tr key={t.id}>
                        <td>{t.ownerName}</td><td>{t.personId || "-"}</td><td>{t.email || "-"}</td><td>{t.teamName}</td><td><ImageThumb src={t.logo} alt={`${t.teamName} logo`} /></td><td>{t.jerseyPattern}</td><td>{t.ownerMobile}</td><td>{t.password}</td><td>{t.feePaid}</td><td>{t.paymentRef}</td>
                        <td className="actions-cell">
                          <button className="btn mini" onClick={() => startEdit("team_owner", t)}>Edit</button>
                          <button className="btn mini danger" onClick={() => remove("team_owner", t.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards">
                {teamOwners.map((t) => (
                  <article className="card soft" key={t.id}>
                    <KeyValue label="Owner Name" value={t.ownerName} />
                    <KeyValue label="Person ID" value={t.personId || "-"} />
                    <KeyValue label="Email" value={t.email || "-"} />
                    <KeyValue label="Team Name" value={t.teamName} />
                    <p><strong>Logo:</strong> <ImageThumb src={t.logo} alt={`${t.teamName} logo`} /></p>
                    <KeyValue label="Jersey Pattern" value={t.jerseyPattern} />
                    <KeyValue label="Mobile" value={t.ownerMobile} />
                    <KeyValue label="Password" value={t.password} />
                    <KeyValue label="Fee" value={t.feePaid} />
                    <KeyValue label="Payment Ref" value={t.paymentRef} />
                    <div className="actions-row">
                      <button className="btn mini" onClick={() => startEdit("team_owner", t)}>Edit</button>
                      <button className="btn mini danger" onClick={() => remove("team_owner", t.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="card">
              <h3>Super Admins Table</h3>
              <div className="desktop-table">
                <table>
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Password</th><th>Created At</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {superAdmins.map((a) => (
                      <tr key={a.id}>
                        <td>{a.name}</td><td>{a.email}</td><td>{a.password}</td><td>{new Date(a.createdAt).toLocaleString()}</td>
                        <td className="actions-cell">
                          <button className="btn mini" onClick={() => startEdit("super_admin", a)}>Edit</button>
                          <button className="btn mini danger" onClick={() => remove("super_admin", a.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mobile-cards">
                {superAdmins.map((a) => (
                  <article className="card soft" key={a.id}>
                    <KeyValue label="Name" value={a.name} />
                    <KeyValue label="Email" value={a.email} />
                    <KeyValue label="Password" value={a.password} />
                    <KeyValue label="Created At" value={new Date(a.createdAt).toLocaleString()} />
                    <div className="actions-row">
                      <button className="btn mini" onClick={() => startEdit("super_admin", a)}>Edit</button>
                      <button className="btn mini danger" onClick={() => remove("super_admin", a.id)}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {editType ? (
              <section className="card">
                <h3>Edit Record ({editType.replace("_", " ")})</h3>
                <form className="form-grid" onSubmit={saveEdit}>
                  {Object.keys(editDraft)
                    .filter((key) => key !== "id" && key !== "role")
                    .map((key) => (
                      <label key={key}>
                        {key}
                        {key === "password" ? (
                          <PasswordField
                            name={key}
                            value={editDraft[key] ?? ""}
                            onChange={(event) =>
                              setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))
                            }
                          />
                        ) : key === "photo" || key === "logo" ? (
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
                          <input
                            value={editDraft[key] ?? ""}
                            onChange={(event) =>
                              setEditDraft((prev) => ({ ...prev, [key]: event.target.value }))
                            }
                          />
                        )}
                      </label>
                    ))}
                  <div className="actions-row">
                    <button className="btn" type="submit">Save</button>
                    <button className="btn ghost" type="button" onClick={() => setEditType("")}>Cancel</button>
                  </div>
                </form>
              </section>
            ) : null}
          </>
        ) : null}

        {currentUser.role === "player" && me ? (
          <section className="card">
            <h3>Player Profile</h3>
            <form className="form-grid" onSubmit={(event) => updateSelf(event, "player")}>
              <label>Name<input name="name" defaultValue={me.name} required /></label>
              <label>
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
              <label>Jersey Size<input name="jerseySize" defaultValue={me.jerseySize} required /></label>
              <label>Jersey Name<input name="jerseyName" defaultValue={me.jerseyName} required /></label>
              <label>Village<input name="village" defaultValue={me.village} required /></label>
              <label>Password<PasswordField name="password" defaultValue={me.password} required /></label>
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
              <label>
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
              <label>Password<PasswordField name="password" defaultValue={me.password} required /></label>
              <button className="btn" type="submit">Update Team Profile</button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}



