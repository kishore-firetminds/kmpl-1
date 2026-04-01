import { NextResponse } from "next/server";

function getBaseUrl(request) {
  const envBase = process.env.NEXT_PUBLIC_APP_URL;
  if (envBase) return envBase.replace(/\/$/, "");

  const host = request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "http";
  return `${proto}://${host}`;
}

function buildRedirectUrl(request, status, payload) {
  const baseUrl = getBaseUrl(request);
  const redirect = new URL(`${baseUrl}/register`);
  redirect.searchParams.set("payment", status);

  if (payload.txnid) redirect.searchParams.set("txnid", payload.txnid);
  if (payload.mihpayid) redirect.searchParams.set("mihpayid", payload.mihpayid);
  if (payload.udf1) redirect.searchParams.set("role", payload.udf1);
  if (payload.amount) redirect.searchParams.set("amount", payload.amount);

  return redirect;
}

export async function POST(request) {
  const formData = await request.formData();
  const payload = {
    status: String(formData.get("status") || "failure"),
    txnid: String(formData.get("txnid") || ""),
    mihpayid: String(formData.get("mihpayid") || ""),
    udf1: String(formData.get("udf1") || ""),
    amount: String(formData.get("amount") || "")
  };

  const status = payload.status === "success" ? "success" : "failure";
  const redirectUrl = buildRedirectUrl(request, status, payload);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function GET(request) {
  const redirectUrl = buildRedirectUrl(request, "failure", {});
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
