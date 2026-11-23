import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const allowedPaths = new Set([
  "users/me",
  "users/me/avatar",
  "users/me/credits",
  "users/me/credits/transactions",
  "users/me/ai-consent",
  "users/me/ai-consent/grant",
  "users/me/ai-consent/withdraw",
  "users/me/ai-usage",
  "uploads",
  "insights/latest",
]);

function isAllowedBackendPath(path: string[], method: string): boolean {
  const joined = path.join("/");
  if (allowedPaths.has(joined)) return true;
  if (
    (path.length !== 3 && path.length !== 4) ||
    path[0] !== "uploads" ||
    !/^[0-9a-f-]{36}$/i.test(path[1])
  ) {
    return false;
  }
  const route = path.slice(2).join("/");
  return (
    (route === "import" && method === "GET") ||
    (route === "mapping/proposal" && method === "POST") ||
    (route === "mapping/ai-suggestions" && method === "POST") ||
    (route === "mapping/analysis" && (method === "POST" || method === "GET")) ||
    (route === "mapping/confirm" && method === "POST") ||
    (route === "analytics/submit" && method === "POST") ||
    (route === "analytics/status" && method === "GET") ||
    (route === "insights" && method === "GET") ||
    (route === "analytics/summary" && method === "GET") ||
    (route === "analytics/results" && method === "GET")
  );
}

function createAuthAssertion(
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    creditBalance?: number | null;
    creditGrantEligible?: boolean | null;
    name?: string | null;
    createdAt: Date;
  },
  sessionId: string,
): string {
  const secret = process.env.AUTH_BRIDGE_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_BRIDGE_SECRET must contain at least 32 characters.");
  }

  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = encode({
    sub: user.id,
    sid: sessionId,
    email: user.email,
    email_verified: user.emailVerified,
    credit_grant_eligible: user.creditGrantEligible === true,
    legacy_credit_balance:
      typeof user.creditBalance === "number" ? user.creditBalance : 0,
    name: user.name ?? null,
    created_at: user.createdAt.toISOString(),
    iss: (
      process.env.BETTER_AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://localhost:${process.env.PORT || "3000"}`
    ).replace(/\/+$/, ""),
    aud: "xempla-api",
    iat: now,
    exp: now + 60,
  });
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${payload}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const method = request.method.toUpperCase();

  if (!isAllowedBackendPath(path, method)) {
    return NextResponse.json({ detail: "Not found." }, { status: 404 });
  }

  if (method !== "GET") {
    const origin = request.headers.get("origin");
    // Compare with the origin this request actually reached, so the check follows the
    // port in use. Production additionally accepts the configured public URL (proxies).
    const requestOrigin = request.nextUrl.origin;
    const configured = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
    const allowedOrigins = new Set([requestOrigin]);
    if (configured) {
      try {
        allowedOrigins.add(new URL(configured).origin);
      } catch {
        // ignore a malformed configured URL; the request origin still applies
      }
    }
    if (!origin || !allowedOrigins.has(origin)) {
      return NextResponse.json({ detail: "Invalid request origin." }, { status: 403 });
    }
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>>;
  try {
    session = await auth.api.getSession({ headers: request.headers });
  } catch (error) {
    console.error("Could not validate the Better Auth session.", error);
    return NextResponse.json(
      { detail: "Authentication is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!session?.user) {
    return NextResponse.json({ detail: "An authenticated session is required." }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ detail: "A verified email is required." }, { status: 403 });
  }

  const backendUrl = process.env.BACKEND_API_URL?.trim();
  if (!backendUrl) {
    return NextResponse.json(
      { detail: "Backend API is not configured." },
      { status: 503 },
    );
  }

  let assertion: string;
  try {
    assertion = createAuthAssertion(session.user, session.session.id);
  } catch (error) {
    console.error("Could not issue backend authentication assertion.", error);
    return NextResponse.json(
      { detail: "Backend authentication is not configured." },
      { status: 503 },
    );
  }

  const target = `${backendUrl.replace(/\/+$/, "")}/${path
    .map((segment) => encodeURIComponent(segment))
    .join("/")}${new URL(request.url).search}`;
  const headers = new Headers({
    Authorization: `Bearer ${assertion}`,
    Accept: "application/json",
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  try {
    const requestInit: RequestInit & { duplex?: "half" } = {
      method,
      headers,
      body: method === "GET" ? undefined : request.body,
      cache: "no-store",
      signal: request.signal,
    };
    if (method !== "GET" && request.body) requestInit.duplex = "half";

    const response = await fetch(target, requestInit);
    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control":
          method === "GET" && path.join("/") === "users/me/avatar"
            ? response.headers.get("cache-control") || "no-store"
            : "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Backend API request failed.", error);
    return NextResponse.json(
      { detail: "The backend API is unavailable." },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const PATCH = proxyRequest;
export const POST = proxyRequest;
