"use client";

import React, { useState, useEffect } from "react";
import { SignupForm } from "./SignupForm";
import { OtpVerification } from "./OtpVerification";
import { AuthIllustration } from "./AuthIllustration";
import { WorkspacePreview } from "./WorkspacePreview";
import { AuthSessionResponse, OtpRequestResponse, UserProfile } from "@/types/auth";
import { authClient } from "@/lib/auth-client";
import { clearAuthToken } from "@/lib/api";

type ScreenState = "form" | "otp" | "authenticated";

export function SignupSplitScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("form");
  const [otpData, setOtpData] = useState<OtpRequestResponse | null>(null);
  const [authSession, setAuthSession] = useState<AuthSessionResponse | null>(null);

  // Check for existing Better Auth session on mount
  useEffect(() => {
    authClient
      .getSession()
      .then(({ data }) => {
        if (data?.session && data?.user) {
          const userRaw = data.user as {
            id: string;
            email: string;
            emailType?: string | null;
            creditBalance?: number;
            isVerified?: boolean;
            emailVerified?: boolean;
            name?: string | null;
            createdAt?: Date | string | number;
          };
          const emailType: "work" | "personal" =
            userRaw.emailType === "work" ? "work" : "personal";

          const profile: UserProfile = {
            id: userRaw.id,
            email: userRaw.email,
            normalized_email: userRaw.email.toLowerCase(),
            email_type: emailType,
            emailType: emailType,
            credit_balance: typeof userRaw.creditBalance === "number" ? userRaw.creditBalance : 0,
            creditBalance: typeof userRaw.creditBalance === "number" ? userRaw.creditBalance : 0,
            is_verified: Boolean(userRaw.isVerified ?? userRaw.emailVerified),
            isVerified: Boolean(userRaw.isVerified ?? userRaw.emailVerified),
            auth_provider: "email_otp",
            full_name: userRaw.name || null,
            created_at: new Date(
              userRaw.createdAt instanceof Date
                ? userRaw.createdAt.getTime()
                : userRaw.createdAt || Date.now(),
            ).toISOString(),
          };

          setAuthSession({
            access_token: data.session.token || "better-auth-session",
            token_type: "bearer",
            is_new_user: false,
            credits_awarded: 0,
            user: profile,
          });
          setScreenState("authenticated");
        }
      })
      .catch(() => {
        // No active session
      });
  }, []);

  const handleOtpRequested = (data: OtpRequestResponse) => {
    setOtpData(data);
    setScreenState("otp");
  };

  const handleOtpSuccess = (session: AuthSessionResponse) => {
    setAuthSession(session);
    setScreenState("authenticated");
  };

  const handleChangeEmail = () => {
    setScreenState("form");
  };

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore
    }
    clearAuthToken();
    setAuthSession(null);
    setOtpData(null);
    setScreenState("form");
  };

  return (
    <div className="flex h-full max-h-full w-full overflow-hidden bg-white lg:flex-row">
      <section className="z-10 flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-white px-6 py-4 sm:px-12 lg:w-[60%] lg:px-14 lg:py-2 xl:px-20">
        <div className="w-full max-w-[420px]">
          {screenState === "form" && (
            <SignupForm onOtpRequested={handleOtpRequested} />
          )}

          {screenState === "otp" && otpData && (
            <OtpVerification
              email={otpData.email}
              eligibleCredits={otpData.eligible_credits}
              initialCooldown={otpData.cooldown_seconds}
              onSuccess={handleOtpSuccess}
              onChangeEmail={handleChangeEmail}
            />
          )}

          {screenState === "authenticated" && authSession && (
            <WorkspacePreview
              session={authSession}
              onLogout={handleLogout}
            />
          )}
        </div>
      </section>

      <section className="hidden h-full min-h-0 w-[40%] lg:block">
        <AuthIllustration />
      </section>
    </div>
  );
}
