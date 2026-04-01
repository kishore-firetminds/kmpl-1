"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaKey, FaSignInAlt, FaUserAlt } from "react-icons/fa";
import toast from "react-hot-toast";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import PasswordField from "@/components/PasswordField";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function login(event) {
    event.preventDefault();
    setLoading(true);

    try {
      sessionStorage.removeItem("kmpl_pending_roles");

      const formData = new FormData(event.currentTarget);
      const identity = formData.get("identity")?.toString().trim();
      const password = formData.get("password")?.toString().trim();

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password })
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Login failed.");
        return;
      }

      if (data.requiresRoleSelection) {
        sessionStorage.setItem("kmpl_pending_roles", JSON.stringify(data.choices || []));
        toast.success("Select your role to continue.");
        router.push("/select-role");
        return;
      }

      toast.success("Login successful.");
      router.push("/dashboard");
    } catch (error) {
      toast.error(error.message || "Login failed.");
    } finally {
      setLoading(false);
    }
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
          <h2 className="section-title">
            <FaSignInAlt aria-hidden="true" />
            <span>Login</span>
          </h2>
          <form onSubmit={login} className="form-grid">
            <label>
              <span className="icon-inline">
                <FaUserAlt aria-hidden="true" />
                <span>Email/Mobile</span>
              </span>
              <input required name="identity" />
            </label>
            <label>
              <span className="icon-inline">
                <FaKey aria-hidden="true" />
                <span>Password</span>
              </span>
              <PasswordField name="password" required />
            </label>
            <button className="btn icon-btn" type="submit" disabled={loading}>
              <FaSignInAlt aria-hidden="true" />
              <span>{loading ? "Please wait..." : "Login"}</span>
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
