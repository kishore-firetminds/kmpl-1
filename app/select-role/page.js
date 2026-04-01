"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";

export default function SelectRolePage() {
  const router = useRouter();
  const [choices, setChoices] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("kmpl_pending_roles");
    const pending = raw ? JSON.parse(raw) : [];
    if (!pending.length) {
      router.push("/login");
      return;
    }
    setChoices(pending);
  }, [router]);

  async function continueAs(choice) {
    setMessage("");
    const response = await fetch("/api/auth/select-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: choice.id, role: choice.role })
    });

    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error || "Unable to continue.");
      return;
    }

    sessionStorage.removeItem("kmpl_pending_roles");
    router.push("/dashboard");
  }

  return (
    <main>
      <AppHeader />
      <div className="container narrow">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Login", href: "/login" },
            { label: "Select Role" }
          ]}
        />

        <section className="card">
          <h2>Select Role</h2>
          <p className="muted">This account has multiple profiles. Choose which dashboard to open.</p>
          <div className="form-grid">
            {choices.map((choice) => (
              <button
                key={`${choice.role}-${choice.id}`}
                type="button"
                className="btn ghost"
                onClick={() => continueAs(choice)}
              >
                Continue as {choice.role === "team_owner" ? "Team Owner" : "Player"} ({choice.displayName})
              </button>
            ))}
          </div>
          {message ? <p className="message">{message}</p> : null}
        </section>
      </div>
    </main>
  );
}
