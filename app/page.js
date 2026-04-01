import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";

export default function HomePage() {
  return (
    <main>
      <AppHeader />
      <div className="container">
        <Breadcrumb items={[{ label: "Home" }]} />

        <section className="hero">
          <h1>Kammanapalli Manegaaru Premier League Season-1</h1>
          <p>
            Register for KMPL as a Player (INR 310) or Team Owner (INR 5100),
            complete payment, and manage your profile from dashboard.
          </p>
          <div className="actions-row">
            <Link href="/register" className="btn">Register</Link>
            <Link href="/login" className="btn ghost">Login</Link>
          </div>
        </section>

        <section className="grid three">
          <article className="card">
            <h3>Player Registration</h3>
            <p>Fee: INR 310</p>
            <p>Fields: Name, Photo, Mobile, Jersey Size, Jersey Name, Village, Password</p>
          </article>
          <article className="card">
            <h3>Team Owner Registration</h3>
            <p>Fee: INR 5100</p>
            <p>Fields: Owner Name, Team Name, Logo, Jersey Pattern, Mobile, Password</p>
          </article>
          <article className="card">
            <h3>Super Admin Control</h3>
            <p>Manage Players, Team Owners, and Super Admins with full CRUD access.</p>
          </article>
        </section>
      </div>
    </main>
  );
}
