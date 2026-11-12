import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins/email-otp";
import { Pool } from "pg";
import { sendOtpEmail } from "./mailer";
import { classifyEmail } from "./emailClassifier";

const databaseUrl = process.env.DATABASE_URL?.trim();

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET?.trim() ||
    "xempla-insecure-dev-secret-key-please-replace-min-32chars",
  baseURL:
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "http://localhost:3000",
  // Configure PostgreSQL connection if DATABASE_URL is provided; otherwise fallback to in-memory adapter
  database: databaseUrl
    ? new Pool({
        connectionString: databaseUrl,
      })
    : undefined,
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600, // 10 minutes
      sendVerificationOTP: async ({ email, otp, type }, ctx) => {
        // Synchronize OTP tokens across both "sign-in" and "email-verification" identifiers
        // to guarantee that both verifyEmail and signInEmailOTP resolve accurately
        if (ctx) {
          try {
            const normalizedEmail = email.toLowerCase();
            const alternateType = type === "sign-in" ? "email-verification" : "sign-in";
            const alternateIdentifier = `${alternateType}-otp-${normalizedEmail}`;
            const expiresAt = new Date(Date.now() + 600 * 1000);

            await ctx.context.internalAdapter
              .createVerificationValue({
                value: `${otp}:0`,
                identifier: alternateIdentifier,
                expiresAt,
              })
              .catch(async () => {
                await ctx.context.internalAdapter.deleteVerificationByIdentifier(alternateIdentifier);
                await ctx.context.internalAdapter.createVerificationValue({
                  value: `${otp}:0`,
                  identifier: alternateIdentifier,
                  expiresAt,
                });
              });
          } catch {
            // Non-critical fallback
          }
        }

        // Deliver OTP via company SMTP or console log
        await sendOtpEmail({ to: email, otp, type });
      },
    }),
  ],
  user: {
    additionalFields: {
      emailType: {
        type: "string",
        required: false,
        defaultValue: "personal",
        input: false,
      },
      creditBalance: {
        type: "number",
        required: false,
        defaultValue: 0,
        input: false,
      },
      isVerified: {
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
        before: async (user) => {
          // Automatic email detection & credit tiering:
          // Personal email -> 150 credits
          // Work email -> 200 credits
          const classification = classifyEmail(user.email);
          const emailType = classification.emailType === "work" ? "work" : "personal";
          const initialCredits = classification.credits || (emailType === "work" ? 200 : 150);

          return {
            data: {
              ...user,
              emailType,
              creditBalance: initialCredits,
              isVerified: true,
            },
          };
        },
      },
    },
  },
});

export type Auth = typeof auth;
