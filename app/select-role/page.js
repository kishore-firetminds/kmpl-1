"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import {
  clearPendingRoleChoices,
  getPendingRoleChoices,
  setCurrentUser
} from "@/lib/storage";

export default function SelectRolePage() {
  const router = useRouter();
  const [choices, setChoices] = useState([]);

  useEffect(() => {
    const pending = getPendingRoleChoices();
    if (!pending.length) {
      router.push("/login");
      return;
    }
    setChoices(pending);
  }, [router]);

  function continueAs(choice) {
    setCurrentUser({ id: choice.id, role: choice.role, personId: choice.personId });
    clearPendingRoleChoices();
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
        </section>
      </div>
    </main>
  );
}
