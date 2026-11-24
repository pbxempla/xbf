import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { Pool } from "pg";
import { sendOtpEmail } from "./mailer";

// The pool and the auth instance are created on first use, not at import time, so
// `next build` works in CI without DATABASE_URL / BETTER_AUTH_SECRET. Both are still
// required at runtime and fail loudly on the first request when missing.

let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required for persistent Better Auth sessions.");
    }
    pool = new Pool({ connectionString: databaseUrl });
  }
  return pool;
}

export async function accountExists(email: string): Promise<boolean> {
  const result = await getPool().query('select 1 from "user" where lower(email) = $1 limit 1', [
    email.trim().toLowerCase(),
  ]);
  return (result.rowCount ?? 0) > 0;
}

function createAuth() {
  const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
  if (!authSecret || authSecret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  const baseURL =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    `http://localhost:${process.env.PORT?.trim() || "3000"}`;

  // In development accept any localhost port so a different PORT does not trip Better Auth's
  // origin check. Production only trusts the configured base URL.
  const devTrustedOrigins =
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:*", "http://127.0.0.1:*"];

  return betterAuth({
    secret: authSecret,
    baseURL,
    trustedOrigins: [baseURL, ...devTrustedOrigins],
    database: getPool(),
    user: {
      additionalFields: {
        creditBalance: {
          type: "number",
          required: false,
          defaultValue: 0,
          input: false,
        },
        creditGrantEligible: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => ({
            data: {
              ...user,
              creditGrantEligible: true,
            },
          }),
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        storeOTP: "hashed",
        sendVerificationOTP: async ({ email, otp, type }) => {
          await sendOtpEmail({ to: email, otp, type });
        },
      }),
    ],
  });
}

let authInstance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  authInstance ??= createAuth();
  return authInstance;
}
