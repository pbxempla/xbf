import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendAnalysisReadyEmail } from "@/lib/mailer";

// Server-to-server only: the FastAPI backend calls this when an analysis finishes. The body is
// authenticated with an HMAC using the shared AUTH_BRIDGE_SECRET; browsers cannot call it.
export async function POST(request: NextRequest) {
  const secret = process.env.AUTH_BRIDGE_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return NextResponse.json({ detail: "Not configured." }, { status: 503 });
  }

  const raw = await request.text();
  const expected = createHmac("sha256", secret).update(raw).digest();
  const provided = Buffer.from(request.headers.get("x-xempla-signature") ?? "", "hex");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ detail: "Invalid signature." }, { status: 401 });
  }

  let body: { email?: unknown; file_name?: unknown; rows?: unknown; upload_id?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ detail: "Invalid body." }, { status: 400 });
  }
  const { email, file_name: fileName, rows, upload_id: uploadId } = body;
  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof fileName !== "string" ||
    typeof rows !== "number" ||
    typeof uploadId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(uploadId)
  ) {
    return NextResponse.json({ detail: "Invalid body." }, { status: 400 });
  }

  const base = (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    request.nextUrl.origin
  ).replace(/\/+$/, "");
  try {
    await sendAnalysisReadyEmail({
      to: email,
      fileName: fileName.slice(0, 255),
      rows,
      link: `${base}/dashboard`,
    });
  } catch (error) {
    console.error("Could not send the analysis-ready email.", error);
    return NextResponse.json({ detail: "Email could not be sent." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
