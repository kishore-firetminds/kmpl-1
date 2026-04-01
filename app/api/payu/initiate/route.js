import crypto from "crypto";

const ROLE_TO_AMOUNT = {
  player: 310,
  team_owner: 5100
};

const ROLE_TO_PRODUCT = {
  player: "KMPL Season-1 Player Registration",
  team_owner: "KMPL Season-1 Team Owner Registration"
};

function formatAmount(amount) {
  return Number(amount).toFixed(2);
}

function buildTxnId() {
  return `KMPL${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function getBaseUrl(request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  if (envBase) return envBase.replace(/\/$/, "");

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

function getPayUActionUrl() {
  const explicitUrl = process.env.PAYU_PAYMENT_URL;
  if (explicitUrl) return explicitUrl;

  const mode = (process.env.PAYU_MODE || "test").toLowerCase();
  return mode === "live"
    ? "https://secure.payu.in/_payment"
    : "https://test.payu.in/_payment";
}

function validatePayload(role, amount) {
  const expected = ROLE_TO_AMOUNT[role];
  if (!expected) return false;
  return Number(amount) === expected;
}

export async function POST(request) {
  try {
    const key = process.env.PAYU_KEY;
    const salt = process.env.PAYU_SALT;

    if (!key || !salt) {
      return Response.json(
        { error: "PayU key/salt are missing. Set PAYU_KEY and PAYU_SALT." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    const role = payload.role;
    const amount = payload.amount;
    const firstname = (payload.firstname || "").trim();
    const email = (payload.email || "").trim();
    const phone = (payload.phone || "").trim();

    if (!validatePayload(role, amount)) {
      return Response.json({ error: "Invalid role/amount." }, { status: 400 });
    }

    if (!firstname || !email || !phone) {
      return Response.json(
        { error: "Firstname, email, and phone are required." },
        { status: 400 }
      );
    }

    const txnid = buildTxnId();
    const amountText = formatAmount(amount);
    const productinfo = ROLE_TO_PRODUCT[role];
    const baseUrl = getBaseUrl(request);
    const callbackUrl = `${baseUrl}/api/payu/callback`;

    const hashString = `${key}|${txnid}|${amountText}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    const fields = {
      key,
      txnid,
      amount: amountText,
      productinfo,
      firstname,
      email,
      phone,
      surl: callbackUrl,
      furl: callbackUrl,
      hash,
      udf1: role
    };

    return Response.json({
      action: getPayUActionUrl(),
      method: "POST",
      fields
    });
  } catch (error) {
    return Response.json(
      { error: `Failed to initiate PayU payment: ${error.message}` },
      { status: 500 }
    );
  }
}
