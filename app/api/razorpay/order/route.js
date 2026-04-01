import crypto from "crypto";

const ROLE_TO_AMOUNT = {
  player: 310,
  team_owner: 5100
};

function buildReceipt() {
  return `reg_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export async function POST(request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return Response.json(
        { error: "Razorpay keys are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    const role = payload.role;
    const amount = Number(payload.amount);

    if (!ROLE_TO_AMOUNT[role] || ROLE_TO_AMOUNT[role] !== amount) {
      return Response.json({ error: "Invalid role or amount." }, { status: 400 });
    }

    const body = {
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: buildReceipt()
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(body)
    });

    const order = await razorpayResponse.json();

    if (!razorpayResponse.ok) {
      return Response.json(
        { error: order.error?.description || "Failed to create Razorpay order." },
        { status: razorpayResponse.status }
      );
    }

    return Response.json({
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });
  } catch (error) {
    return Response.json(
      { error: `Razorpay order creation failed: ${error.message}` },
      { status: 500 }
    );
  }
}


