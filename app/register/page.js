"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  FaCheckCircle,
  FaCreditCard,
  FaEnvelope,
  FaPhoneAlt,
  FaUser,
  FaUserShield,
  FaUsers
} from "react-icons/fa";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import PasswordField from "@/components/PasswordField";

const ROLE_CONFIG = {
  player: { label: "Player", fee: 310 },
  team_owner: { label: "Team Owner", fee: 5100 }
};

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected file."));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function PreviewCard({ src, alt, fileName, fileSize }) {
  if (!src) return null;
  return (
    <div className="preview-card">
      <img className="preview-image" src={src} alt={alt} />
      <div className="preview-meta">
        <p>{fileName || "Selected image"}</p>
        <span>{formatFileSize(fileSize)}</span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState("player");
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [paying, setPaying] = useState(false);

  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState("");
  const [teamLogoPreview, setTeamLogoPreview] = useState("");
  const [playerPhotoMeta, setPlayerPhotoMeta] = useState({ fileName: "", fileSize: 0 });
  const [teamLogoMeta, setTeamLogoMeta] = useState({ fileName: "", fileSize: 0 });

  const selected = useMemo(() => ROLE_CONFIG[role], [role]);

  async function startRazorpay() {
    if (!payerName.trim() || !payerEmail.trim() || !payerPhone.trim()) {
      toast.error("Enter name, email, and mobile before payment.");
      return;
    }

    setPaying(true);

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        toast.error("Unable to load Razorpay SDK. Check network and try again.");
        return;
      }

      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, amount: selected.fee })
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        toast.error(orderData.error || "Unable to create payment order.");
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Registration Payment",
        description: `${selected.label} Registration`,
        order_id: orderData.orderId,
        prefill: {
          name: payerName,
          email: payerEmail,
          contact: payerPhone
        },
        theme: {
          color: "#0d7a5f"
        },
        handler: async function (response) {
          const verifyResponse = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response)
          });

          const verifyData = await verifyResponse.json();
          if (!verifyResponse.ok || !verifyData.verified) {
            setPaymentDone(false);
            setPaymentRef("");
            toast.error(verifyData.error || "Payment verification failed.");
            return;
          }

          setPaymentDone(true);
          setPaymentRef(verifyData.paymentRef);
          toast.success("Payment successful. Fill the form below.");
        },
        modal: {
          ondismiss: function () {
            toast.error("Payment cancelled. Please try again.");
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      toast.error(`Payment initiation failed: ${error.message}`);
    } finally {
      setPaying(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();

    if (!paymentDone) {
      toast.error("Payment is required before registration.");
      return;
    }

    if (role === "player" && !playerPhotoPreview) {
      toast.error("Upload player photo before submitting registration.");
      return;
    }

    if (role === "team_owner" && !teamLogoPreview) {
      toast.error("Upload team logo before submitting registration.");
      return;
    }

    const formData = new FormData(event.currentTarget);

    const profile = role === "player"
      ? {
          name: formData.get("name")?.toString().trim(),
          photo: playerPhotoPreview,
          mobile: formData.get("mobile")?.toString().trim(),
          jerseySize: formData.get("jerseySize")?.toString().trim(),
          jerseyName: formData.get("jerseyName")?.toString().trim(),
          village: formData.get("village")?.toString().trim(),
          password: formData.get("password")?.toString().trim()
        }
      : {
          ownerName: formData.get("ownerName")?.toString().trim(),
          teamName: formData.get("teamName")?.toString().trim(),
          logo: teamLogoPreview,
          jerseyPattern: formData.get("jerseyPattern")?.toString().trim(),
          ownerMobile: formData.get("ownerMobile")?.toString().trim(),
          password: formData.get("password")?.toString().trim()
        };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, payerEmail, payerPhone, paymentRef, profile })
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error || "Registration failed.");
      return;
    }

    toast.success("Registration successful.");
    router.push("/dashboard");
  }

  return (
    <main>
      <AppHeader />
      <div className="container">
        <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Register" }]} />

        <section className="card">
          <h2 className="section-title">
            <FaUsers aria-hidden="true" />
            <span>Register for KMPL Mangegaaru Premier League Season-1</span>
          </h2>

          <div className="switch-row">
            <button className={`chip ${role === "player" ? "active" : ""}`} onClick={() => { setRole("player"); setPaymentDone(false); setPaymentRef(""); }} type="button">
              <span className="icon-inline"><FaUser aria-hidden="true" /><span>Register as Player</span></span>
            </button>
            <button className={`chip ${role === "team_owner" ? "active" : ""}`} onClick={() => { setRole("team_owner"); setPaymentDone(false); setPaymentRef(""); }} type="button">
              <span className="icon-inline"><FaUserShield aria-hidden="true" /><span>Register as Team Owner</span></span>
            </button>
          </div>

          <div className="payment-box">
            <p>Selected: <strong>{selected.label}</strong></p>
            <p>Fee: <strong>INR {selected.fee}</strong></p>
            <div className="form-grid">
              <label><span className="icon-inline"><FaUser aria-hidden="true" /><span>Name for Payment</span></span><input value={payerName} onChange={(event) => setPayerName(event.target.value)} /></label>
              <label><span className="icon-inline"><FaEnvelope aria-hidden="true" /><span>Email for Payment</span></span><input type="email" value={payerEmail} onChange={(event) => setPayerEmail(event.target.value)} /></label>
              <label><span className="icon-inline"><FaPhoneAlt aria-hidden="true" /><span>Mobile for Payment</span></span><input type="tel" value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} /></label>
            </div>
            {!paymentDone ? (
              <button className="btn icon-btn" type="button" onClick={startRazorpay} disabled={paying}>
                <FaCreditCard aria-hidden="true" />
                <span>{paying ? "Opening Checkout..." : "Pay with Razorpay"}</span>
              </button>
            ) : (
              <p className="muted">Payment completed. You can submit registration below.</p>
            )}
          </div>

          {paymentDone ? (
            <form onSubmit={onSubmit} className="form-grid">
              {role === "player" ? (
                <>
                  <label>Name<input required name="name" defaultValue={payerName} /></label>
                  <label>
                    Photo Upload
                    <input
                      required
                      name="photoFile"
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          setPlayerPhotoPreview("");
                          setPlayerPhotoMeta({ fileName: "", fileSize: 0 });
                          return;
                        }
                        try {
                          const encoded = await fileToDataUrl(file);
                          setPlayerPhotoPreview(encoded);
                          setPlayerPhotoMeta({ fileName: file.name, fileSize: file.size });
                        } catch (error) {
                          toast.error(error.message);
                        }
                      }}
                    />
                  </label>
                  <PreviewCard src={playerPhotoPreview} alt="Player preview" fileName={playerPhotoMeta.fileName} fileSize={playerPhotoMeta.fileSize} />
                  <label>Mobile Number<input required name="mobile" defaultValue={payerPhone} /></label>
                  <label>Jersey Size<input required name="jerseySize" /></label>
                  <label>Jersey Name<input required name="jerseyName" /></label>
                  <label>Village<input required name="village" /></label>
                  <label>Password<PasswordField name="password" required /></label>
                </>
              ) : (
                <>
                  <label>Owner Name<input required name="ownerName" defaultValue={payerName} /></label>
                  <label>Team Name<input required name="teamName" /></label>
                  <label>
                    Logo Upload
                    <input
                      required
                      name="logoFile"
                      type="file"
                      accept="image/*"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          setTeamLogoPreview("");
                          setTeamLogoMeta({ fileName: "", fileSize: 0 });
                          return;
                        }
                        try {
                          const encoded = await fileToDataUrl(file);
                          setTeamLogoPreview(encoded);
                          setTeamLogoMeta({ fileName: file.name, fileSize: file.size });
                        } catch (error) {
                          toast.error(error.message);
                        }
                      }}
                    />
                  </label>
                  <PreviewCard src={teamLogoPreview} alt="Team logo preview" fileName={teamLogoMeta.fileName} fileSize={teamLogoMeta.fileSize} />
                  <label>Jersey Pattern<input required name="jerseyPattern" /></label>
                  <label>Owner Mobile Number<input required name="ownerMobile" defaultValue={payerPhone} /></label>
                  <label>Password<PasswordField name="password" required /></label>
                </>
              )}
              <button className="btn icon-btn" type="submit">
                <FaCheckCircle aria-hidden="true" />
                <span>Submit Registration</span>
              </button>
            </form>
          ) : (
            <p className="muted">Complete payment to unlock the registration form.</p>
          )}
        </section>
      </div>
    </main>
  );
}
