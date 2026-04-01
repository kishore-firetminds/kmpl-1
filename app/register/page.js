"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Breadcrumb from "@/components/Breadcrumb";
import {
  addItem,
  buildId,
  ensureSeedData,
  findPersonIdByIdentity,
  getList,
  normalize,
  setCurrentUser
} from "@/lib/storage";
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
  const [message, setMessage] = useState("");
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
      setMessage("Enter name, email, and mobile before payment.");
      return;
    }

    const contactForPayment = payerPhone;

    setPaying(true);
    setMessage("");

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        setMessage("Unable to load Razorpay SDK. Check network and try again.");
        return;
      }

      const orderResponse = await fetch("/api/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          amount: selected.fee
        })
      });

      const orderData = await orderResponse.json();
      if (!orderResponse.ok) {
        setMessage(orderData.error || "Unable to create payment order.");
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
          contact: contactForPayment
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
            setMessage(verifyData.error || "Payment verification failed.");
            return;
          }

          setPaymentDone(true);
          setPaymentRef(verifyData.paymentRef);
          setMessage(`Payment successful. Reference: ${verifyData.paymentRef}. Fill the form below.`);
        },
        modal: {
          ondismiss: function () {
            setMessage("Payment cancelled. Please try again.");
          }
        }
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      setMessage(`Payment initiation failed: ${error.message}`);
    } finally {
      setPaying(false);
    }
  }

  function buildPersonId() {
    return findPersonIdByIdentity(payerPhone, payerEmail) || buildId("person");
  }

  function registerPlayer(formData) {
    const mobile = formData.get("mobile")?.toString().trim();
    const email = payerEmail.trim();
    const existingPlayer = getList("players").find(
      (item) => normalize(item.mobile) === normalize(mobile) || normalize(item.email) === normalize(email)
    );
    if (existingPlayer) {
      setMessage("Player profile already exists for this mobile/email. Please login or register as Team Owner.");
      return false;
    }

    const player = {
      id: buildId("player"),
      personId: buildPersonId(),
      role: "player",
      name: formData.get("name")?.toString().trim(),
      photo: playerPhotoPreview,
      email,
      mobile,
      jerseySize: formData.get("jerseySize")?.toString().trim(),
      jerseyName: formData.get("jerseyName")?.toString().trim(),
      village: formData.get("village")?.toString().trim(),
      password: formData.get("password")?.toString().trim(),
      feePaid: ROLE_CONFIG.player.fee,
      paymentRef,
      registeredAt: new Date().toISOString()
    };
    addItem("players", player);
    setCurrentUser({ id: player.id, role: player.role, personId: player.personId });
    return true;
  }

  function registerTeamOwner(formData) {
    const ownerMobile = formData.get("ownerMobile")?.toString().trim();
    const email = payerEmail.trim();
    const existingOwner = getList("teamOwners").find(
      (item) => normalize(item.ownerMobile) === normalize(ownerMobile) || normalize(item.email) === normalize(email)
    );
    if (existingOwner) {
      setMessage("Team Owner profile already exists for this mobile/email. Please login or register as Player.");
      return false;
    }

    const owner = {
      id: buildId("owner"),
      personId: buildPersonId(),
      role: "team_owner",
      ownerName: formData.get("ownerName")?.toString().trim(),
      teamName: formData.get("teamName")?.toString().trim(),
      logo: teamLogoPreview,
      email,
      jerseyPattern: formData.get("jerseyPattern")?.toString().trim(),
      ownerMobile,
      password: formData.get("password")?.toString().trim(),
      feePaid: ROLE_CONFIG.team_owner.fee,
      paymentRef,
      registeredAt: new Date().toISOString()
    };
    addItem("teamOwners", owner);
    setCurrentUser({ id: owner.id, role: owner.role, personId: owner.personId });
    return true;
  }

  function onSubmit(event) {
    event.preventDefault();
    ensureSeedData();

    if (!paymentDone) {
      setMessage("Payment is required before registration.");
      return;
    }

    if (role === "player" && !playerPhotoPreview) {
      setMessage("Upload player photo before submitting registration.");
      return;
    }

    if (role === "team_owner" && !teamLogoPreview) {
      setMessage("Upload team logo before submitting registration.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const success = role === "player" ? registerPlayer(formData) : registerTeamOwner(formData);

    if (success) {
      router.push("/dashboard");
    }
  }

  return (
    <main>
      <AppHeader />
      <div className="container">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Register" }
          ]}
        />

        <section className="card">
          <h2>Register for KMPL Season-1</h2>

          <div className="switch-row">
            <button
              className={`chip ${role === "player" ? "active" : ""}`}
              onClick={() => {
                setRole("player");
                setPaymentDone(false);
                setPaymentRef("");
                setMessage("");
              }}
              type="button"
            >
              Register as Player
            </button>
            <button
              className={`chip ${role === "team_owner" ? "active" : ""}`}
              onClick={() => {
                setRole("team_owner");
                setPaymentDone(false);
                setPaymentRef("");
                setMessage("");
              }}
              type="button"
            >
              Register as Team Owner
            </button>
          </div>

          <div className="payment-box">
            <p>
              Selected: <strong>{selected.label}</strong>
            </p>
            <p>
              Fee: <strong>INR {selected.fee}</strong>
            </p>
            <div className="form-grid">
              <label>
                Name for Payment
                <input value={payerName} onChange={(event) => setPayerName(event.target.value)} />
              </label>
              <label>
                Email for Payment
                <input
                  type="email"
                  value={payerEmail}
                  onChange={(event) => setPayerEmail(event.target.value)}
                />
              </label>
              <label>
                Mobile for Payment
                <input type="tel" value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} />
              </label>
            </div>
            <button className="btn" type="button" onClick={startRazorpay} disabled={paying}>
              {paying ? "Opening Checkout..." : "Pay with Razorpay"}
            </button>
            <p className="muted">
              If you already registered as one role, you can use the same mobile/email to add the other role.
            </p>
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
                          setMessage(error.message);
                        }
                      }}
                    />
                  </label>
                  <PreviewCard
                    src={playerPhotoPreview}
                    alt="Player preview"
                    fileName={playerPhotoMeta.fileName}
                    fileSize={playerPhotoMeta.fileSize}
                  />
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
                          setMessage(error.message);
                        }
                      }}
                    />
                  </label>
                  <PreviewCard
                    src={teamLogoPreview}
                    alt="Team logo preview"
                    fileName={teamLogoMeta.fileName}
                    fileSize={teamLogoMeta.fileSize}
                  />
                  <label>Jersey Pattern<input required name="jerseyPattern" /></label>
                  <label>Owner Mobile Number<input required name="ownerMobile" defaultValue={payerPhone} /></label>
                  <label>Password<PasswordField name="password" required /></label>
                </>
              )}
              <button className="btn" type="submit">
                Submit Registration
              </button>
            </form>
          ) : (
            <p className="muted">Complete payment to unlock the registration form.</p>
          )}

          {message ? <p className="message">{message}</p> : null}
        </section>
      </div>
    </main>
  );
}

