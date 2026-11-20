import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { Pool } from "pg";
import { sendOtpEmail } from "./mailer";

const databaseUrl = process.env.DATABASE_URL?.trim();
const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
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

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for persistent Better Auth sessions.");
}

if (!authSecret || authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

const pool = new Pool({ connectionString: databaseUrl });

export async function accountExists(email: string): Promise<boolean> {
  const result = await pool.query('select 1 from "user" where lower(email) = $1 limit 1', [
    email.trim().toLowerCase(),
  ]);
  return (result.rowCount ?? 0) > 0;
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL,
  trustedOrigins: [baseURL, ...devTrustedOrigins],
  database: pool,
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

export type Auth = typeof auth;
