import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { Pool } from "pg";
import { sendOtpEmail } from "./mailer";

const databaseUrl = process.env.DATABASE_URL?.trim();
const authSecret = process.env.BETTER_AUTH_SECRET?.trim();
const baseURL =
  process.env.BETTER_AUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "http://localhost:3000";

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required for persistent Better Auth sessions.");
}

if (!authSecret || authSecret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
}

export const auth = betterAuth({
  secret: authSecret,
  baseURL,
  database: new Pool({
    connectionString: databaseUrl,
  }),
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
