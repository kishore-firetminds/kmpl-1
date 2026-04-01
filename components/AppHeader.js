"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadMe() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (mounted) setCurrentUser(null);
          return;
        }
        const data = await response.json();
        if (mounted) setCurrentUser(data.user || null);
      } catch {
        if (mounted) setCurrentUser(null);
      }
    }

    loadMe();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setCurrentUser(null);
    router.push("/login");
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand brand-logo" aria-label="Manegaaru Premier League">
        <span className="brand-main">Manegaaru</span>
        <span className="brand-sub">Premier League</span>
      </Link>

      <div className="actions">
        {currentUser ? (
          <>
            {pathname !== "/dashboard" ? (
              <Link href="/dashboard" className="btn ghost">
                Dashboard
              </Link>
            ) : null}
            <button className="btn" type="button" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            {pathname !== "/register" ? (
              <Link href="/register" className="btn">
                Register
              </Link>
            ) : null}
            {pathname !== "/login" ? (
              <Link href="/login" className="btn ghost">
                Login
              </Link>
            ) : null}
          </>
        )}
      </div>
    </header>
  );
}
