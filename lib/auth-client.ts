import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

const baseClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  plugins: [emailOTPClient()],
});

type EmailOtpApi = (typeof baseClient)["emailOtp"] & {
  sendVerificationOTP: (typeof baseClient)["emailOtp"]["sendVerificationOtp"];
};

const emailOtpMethods = (baseClient as unknown as { emailOtp: EmailOtpApi }).emailOtp;
const emailOtpProxy: EmailOtpApi = {
  ...emailOtpMethods,
  sendVerificationOTP: emailOtpMethods.sendVerificationOtp.bind(emailOtpMethods),
  sendVerificationOtp: emailOtpMethods.sendVerificationOtp.bind(emailOtpMethods),
  verifyEmail: emailOtpMethods.verifyEmail.bind(emailOtpMethods),
};

export const authClient = Object.assign(baseClient, {
  emailOTP: emailOtpProxy,
  emailOtp: emailOtpProxy,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;
