"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FaClock, FaGavel } from "react-icons/fa";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";

function formatCountdown(ms) {
  if (ms <= 0) return "00:00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export default function AuctionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [auctionDate, setAuctionDate] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meResponse.json();
        if (!meResponse.ok || !meData?.user) {
          router.replace("/login");
          return;
        }
        if (meData.user.role !== "team_owner") {
          router.replace("/dashboard");
          return;
        }

        const settingsResponse = await fetch("/api/settings", { cache: "no-store" });
        const settingsData = await settingsResponse.json();
        if (!settingsResponse.ok) {
          throw new Error(settingsData.error || "Unable to load auction settings.");
        }

        if (!active) return;
        setAuctionDate(settingsData.settings?.auctionDate || null);
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Unable to load auction details.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdownText = useMemo(() => {
    if (!auctionDate) return null;
    const target = new Date(auctionDate).getTime();
    if (Number.isNaN(target)) return null;
    return formatCountdown(target - now);
  }, [auctionDate, now]);

  return (
    <main>
      <AppHeader />
      <div className="container narrow">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard", href: "/dashboard" }, { label: "Auction" }]} />

        <section className="card">
          <h2 className="section-title">
            <FaGavel aria-hidden="true" />
            <span>Auction Participation</span>
          </h2>

          {loading ? <p className="muted">Loading auction details...</p> : null}
          {error ? <p className="message">{error}</p> : null}

          {!loading && !error ? (
            auctionDate ? (
              <>
                <h3>Auction will start soon</h3>
                <p className="muted">
                  Scheduled Date: {new Date(auctionDate).toLocaleString()}
                </p>
                <p className="icon-inline">
                  <FaClock aria-hidden="true" />
                  <strong>{countdownText || "00:00:00:00"}</strong>
                </p>
                <p className="muted">Countdown format: DD:HH:MM:SS</p>
              </>
            ) : (
              <p className="muted">Auction date is not configured by admin yet.</p>
            )
          ) : null}
        </section>
      </div>
    </main>
  );
}

