"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import {
  clearPendingRoleChoices,
  ensureSeedData,
  getList,
  normalize,
  setCurrentUser,
  setPendingRoleChoices
} from "@/lib/storage";
import PasswordField from "@/components/PasswordField";

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState("");

  function login(event) {
    event.preventDefault();
    ensureSeedData();
    clearPendingRoleChoices();

    const formData = new FormData(event.currentTarget);
    const identity = formData.get("identity")?.toString().trim();
    const password = formData.get("password")?.toString().trim();
    const normalizedIdentity = normalize(identity);

    const admins = getList("superAdmins");
    const admin = admins.find(
      (item) => normalize(item.email) === normalizedIdentity && item.password === password
    );
    if (admin) {
      setCurrentUser({ id: admin.id, role: "super_admin", personId: admin.personId || admin.id });
      router.push("/dashboard");
      return;
    }

    const players = getList("players");
    const teamOwners = getList("teamOwners");

    const player = players.find(
      (item) =>
        item.password === password &&
        (normalize(item.mobile) === normalizedIdentity || normalize(item.email) === normalizedIdentity)
    );

    const owner = teamOwners.find(
      (item) =>
        item.password === password &&
        (normalize(item.ownerMobile) === normalizedIdentity || normalize(item.email) === normalizedIdentity)
    );

    const matches = [];
    if (player) {
      matches.push({
        id: player.id,
        role: "player",
        personId: player.personId || player.id,
        displayName: player.name || "Player"
      });
    }

    if (owner) {
      matches.push({
        id: owner.id,
        role: "team_owner",
        personId: owner.personId || owner.id,
        displayName: owner.ownerName || owner.teamName || "Team Owner"
      });
    }

    if (matches.length === 0) {
      setMessage("Invalid credentials.");
      return;
    }

    if (matches.length === 1) {
      const only = matches[0];
      setCurrentUser({ id: only.id, role: only.role, personId: only.personId });
      router.push("/dashboard");
      return;
    }

    setPendingRoleChoices(matches);
    router.push("/select-role");
  }

  return (
    <main>
      <AppHeader />
      <div className="container narrow">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Login" }
          ]}
        />

        <section className="card">
          <h2>Login</h2>
          <form onSubmit={login} className="form-grid">
            <label>
              Email/Mobile
              <input required name="identity" />
            </label>
            <label>
              Password
              <PasswordField name="password" required />
            </label>
            <button className="btn" type="submit">Login</button>
          </form>
          <p className="muted">Default super admin: admin@kmpl.com / admin123</p>
          {message ? <p className="message">{message}</p> : null}
        </section>
      </div>
    </main>
  );
}
