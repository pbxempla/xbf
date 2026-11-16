"use client";

import React, { useState, useEffect } from "react";
import { SignupForm } from "./SignupForm";
import { OtpVerification } from "./OtpVerification";
import { AuthIllustration } from "./AuthIllustration";
import { WorkspacePreview } from "./WorkspacePreview";
import { AuthSessionResponse, OtpRequestResponse } from "@/types/auth";
import { authClient } from "@/lib/auth-client";
import { getCurrentUser } from "@/lib/api";

type ScreenState = "form" | "otp" | "authenticated";

export function SignupSplitScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("form");
  const [otpData, setOtpData] = useState<OtpRequestResponse | null>(null);
  const [authSession, setAuthSession] = useState<AuthSessionResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      try {
        const { data, error } = await authClient.getSession();
        if (error) throw new Error(error.message || "Unable to validate your session.");
        if (!data?.session || !data.user) return;

        const user = await getCurrentUser();
        if (!active) return;
        setAuthSession({
          is_new_user: user.is_new_user ?? false,
          credits_awarded: user.credits_awarded ?? 0,
          user,
        });
        setScreenState("authenticated");
      } catch (error) {
        if (active) {
          setAuthError(
            error instanceof Error ? error.message : "Unable to load your account profile.",
          );
        }
      }
    };

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  const handleOtpRequested = (data: OtpRequestResponse) => {
    setOtpData(data);
    setScreenState("otp");
  };

  const handleOtpSuccess = (session: AuthSessionResponse) => {
    setAuthError(null);
    setAuthSession(session);
    setScreenState("authenticated");
  };

  const handleChangeEmail = () => {
    setScreenState("form");
  };

  return (
    <div className="flex h-full max-h-full w-full overflow-hidden bg-white lg:flex-row">
      <section className="z-10 flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-white px-6 py-4 sm:px-12 lg:w-[60%] lg:px-14 lg:py-2 xl:px-20">
        <div
          className={`w-full ${
            screenState === "authenticated" ? "max-w-[540px]" : "max-w-[420px]"
          }`}
        >
          {authError && (
            <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {authError}
            </div>
          )}
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
            <WorkspacePreview session={authSession} />
          )}
        </div>
      </section>

      <section className="hidden h-full min-h-0 w-[40%] lg:block">
        <AuthIllustration />
      </section>
    </div>
  );
}
