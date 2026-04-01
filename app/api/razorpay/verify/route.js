import crypto from "crypto";

function safeEqual(a, b) {
  const first = Buffer.from(a || "", "utf8");
  const second = Buffer.from(b || "", "utf8");
  if (first.length !== second.length) return false;
  return crypto.timingSafeEqual(first, second);
}

export async function POST(request) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return Response.json(
        { error: "Razorpay secret is missing. Set RAZORPAY_KEY_SECRET." },
        { status: 500 }
      );
    }

    const payload = await request.json();
    const orderId = payload.razorpay_order_id;
    const paymentId = payload.razorpay_payment_id;
    const signature = payload.razorpay_signature;

    if (!orderId || !paymentId || !signature) {
      return Response.json({ error: "Missing payment verification fields." }, { status: 400 });
    }

    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac("sha256", keySecret).update(body).digest("hex");
    const verified = safeEqual(expected, signature);

    if (!verified) {
      return Response.json({ error: "Payment signature verification failed." }, { status: 400 });
    }

    return Response.json({ verified: true, paymentRef: paymentId, orderId });
  } catch (error) {
    return Response.json(
      { error: `Razorpay verification failed: ${error.message}` },
      { status: 500 }
    );
  }
}
