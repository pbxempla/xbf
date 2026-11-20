import { NextRequest, NextResponse } from "next/server";
import { accountExists } from "@/lib/auth";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 10;
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { detail: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim() : "";
  } catch {
    // fall through to validation
  }
  if (!email || email.length > 320 || !email.includes("@")) {
    return NextResponse.json({ detail: "A valid email is required." }, { status: 400 });
  }

  try {
    return NextResponse.json({ exists: await accountExists(email) });
  } catch (error) {
    console.error("Account lookup failed.", error);
    return NextResponse.json({ detail: "Could not check your account right now." }, { status: 503 });
  }
}
