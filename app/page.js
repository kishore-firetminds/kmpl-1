import Link from "next/link";
import Image from "next/image";
import {
  FaCalendarAlt,
  FaCoins,
  FaSignInAlt,
  FaTrophy,
  FaUserCircle,
  FaUserPlus,
  FaUsers
} from "react-icons/fa";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import heroImage from "./assets/hero.png";

export default function HomePage() {
  return (
    <main>
      <AppHeader />
      <div className="container">
        <Breadcrumb items={[{ label: "" }]} />

        <section className="hero kmpl-hero">
          <div className="hero-copy">
            <p className="hero-tag icon-inline">
              <FaUsers aria-hidden="true" />
              <span>Tennis Ball Cricket Tournament</span>
            </p>
            <h1>Kammanapalli Premier League Season-1</h1>
            <p>
              Auction-based tournament with limited slots. Register as Player or Team Owner,
              complete payment, and get ready for match days.
            </p>
            <div className="actions-row hero-actions">
              <Link href="/register" className="btn icon-btn">
                <FaUserPlus aria-hidden="true" />
                <span>Register</span>
              </Link>
              <Link href="/login" className="btn ghost icon-btn">
                <FaSignInAlt aria-hidden="true" />
                <span>Login</span>
              </Link>
            </div>
          </div>

          <div className="hero-visual float-1" aria-hidden="true">
            <Image
              src={heroImage}
              alt="Tournament hero illustration"
              className="hero-svg-large"
              priority
            />
          </div>
        </section>

        <section className="home-info">
          <article className="info-band">
            <p className="info-label icon-inline">
              <FaCalendarAlt aria-hidden="true" />
              <span>Dates</span>
            </p>
            <h3>18 April 2026 to 20 April 2026</h3>
            <p>Auction-based tennis ball cricket tournament.</p>
          </article>

          <article className="info-band">
            <p className="info-label icon-inline">
              <FaTrophy aria-hidden="true" />
              <span>Prize Pool</span>
            </p>
            <div className="prize-row">
              <div className="prize-item">
                <span>1st Prize</span>
                <strong>INR 33,333 + Trophy</strong>
              </div>
              <div className="prize-item">
                <span>2nd Prize</span>
                <strong>INR 22,222 + Trophy</strong>
              </div>
            </div>
          </article>

          <div className="stat-strip">
            <div className="stat-chip">
              <span className="icon-inline center">
                <FaCoins aria-hidden="true" />
                <span>Player Fee</span>
              </span>
              <strong>INR 310</strong>
            </div>
            <div className="stat-chip">
              <span className="icon-inline center">
                <FaCoins aria-hidden="true" />
                <span>Team Fee</span>
              </span>
              <strong>INR 5,100</strong>
            </div>
            <div className="stat-chip">
              <span className="icon-inline center">
                <FaUsers aria-hidden="true" />
                <span>Player Slots</span>
              </span>
              <strong>130 Max</strong>
            </div>
            <div className="stat-chip">
              <span className="icon-inline center">
                <FaUsers aria-hidden="true" />
                <span>Team Slots</span>
              </span>
              <strong>10 Max</strong>
            </div>
          </div>
        </section>

        <section className="sponsors-section">
          <div className="section-head">
            <h2>Title Sponsors</h2>
            <p className="muted">Proud partners powering <Link href="/" className="brand brand-logo" aria-label="Manegaaru Premier League">
        <span className="brand-main">Manegaaru</span>
        <span className="brand-sub">Premier League</span>
      </Link></p>
          </div>
          <div className="sponsors-grid">
            <article className="sponsor-card">
              <div className="sponsor-icon-wrap"><FaUserCircle className="sponsor-icon" aria-hidden="true" /></div>
              <h4>K SIVA KUMAR</h4>
            </article>
            <article className="sponsor-card">
              <div className="sponsor-icon-wrap"><FaUserCircle className="sponsor-icon" aria-hidden="true" /></div>
              <h4>DINESH & JP (Brothers)</h4>
            </article>
            <article className="sponsor-card">
              <div className="sponsor-icon-wrap"><FaUserCircle className="sponsor-icon" aria-hidden="true" /></div>
              <h4>GIRI PRASAD(MLA)</h4>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
