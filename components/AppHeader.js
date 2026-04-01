"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AUTH_CHANGED_EVENT,
  clearCurrentUser,
  ensureSeedData,
  getCurrentUser
} from "@/lib/storage";

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    ensureSeedData();

    const syncAuth = () => {
      setCurrentUser(getCurrentUser());
    };

    syncAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);

    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  function logout() {
    clearCurrentUser();
    router.push("/login");
  }

  return (
    <header className="topbar">
      <Link href="/" className="brand">KMPL Season-1</Link>

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
