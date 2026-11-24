"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SignupForm } from "./SignupForm";
import { OtpVerification } from "./OtpVerification";
import { AuthIllustration } from "./AuthIllustration";
import { WorkspacePreview } from "./WorkspacePreview";
import { AuthSessionResponse, OtpRequestResponse } from "@/types/auth";
import { authClient } from "@/lib/auth-client";
import { getCurrentUser } from "@/lib/api";

type ScreenState = "checking" | "form" | "otp" | "authenticated" | "profile-error";

export function SignupSplitScreen() {
  const router = useRouter();
  const [screenState, setScreenState] = useState<ScreenState>("checking");
  const [otpData, setOtpData] = useState<OtpRequestResponse | null>(null);
  const [authSession, setAuthSession] = useState<AuthSessionResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // The welcome screen is for first-time account setup only. Anyone who already has an
  // account goes straight to the dashboard.
  const proceed = useCallback(
    (session: AuthSessionResponse) => {
      if (session.is_new_user) {
        setAuthSession(session);
        setScreenState("authenticated");
        return;
      }
      setScreenState("checking");
      router.replace("/dashboard");
    },
    [router],
  );

  // The form is only shown once we know nobody is signed in, so a signed-in user can never
  // request a sign-in code. A session with a failing profile load stays off the form.
  const loadSession = useCallback(async (isActive: () => boolean = () => true) => {
    let hasSession = false;
    try {
      const { data, error } = await authClient.getSession();
      if (error) throw new Error(error.message || "Unable to validate your session.");
      if (!data?.session || !data.user) {
        if (isActive()) setScreenState("form");
        return;
      }
      hasSession = true;

      const user = await getCurrentUser();
      if (!isActive()) return;
      proceed({
        is_new_user: user.is_new_user ?? false,
        credits_awarded: user.credits_awarded ?? 0,
        user,
      });
    } catch (error) {
      if (!isActive()) return;
      setAuthError(
        error instanceof Error ? error.message : "Unable to load your account profile.",
      );
      setScreenState(hasSession ? "profile-error" : "form");
    }
  }, [proceed]);

  useEffect(() => {
    let active = true;
    // State is only set after the awaited session request resolves, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSession(() => active);
    return () => {
      active = false;
    };
  }, [loadSession]);

  const reloadSession = () => {
    setScreenState("checking");
    setAuthError(null);
    void loadSession();
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    setAuthSession(null);
    reloadSession();
  };

  const handleOtpRequested = (data: OtpRequestResponse) => {
    setOtpData(data);
    setScreenState("otp");
  };

  const handleOtpSuccess = (session: AuthSessionResponse) => {
    setAuthError(null);
    proceed(session);
  };

  const handleChangeEmail = () => {
    setScreenState("form");
  };

  return (
    <div className="flex h-full max-h-full w-full overflow-hidden bg-white lg:flex-row">
      <section className="z-10 flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-white px-6 py-4 sm:px-12 lg:w-1/2 lg:px-14 lg:py-2 xl:px-20">
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
          {screenState === "checking" && (
            <div role="status" aria-label="Checking your session" className="flex flex-col gap-4">
              <div className="h-8 w-32 animate-pulse rounded-lg bg-[#f4f4f4]" />
              <div className="h-12 w-3/4 animate-pulse rounded-lg bg-[#f4f4f4]" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-[#f4f4f4]" />
              <div className="h-12 w-full animate-pulse rounded-full bg-[#f4f4f4]" />
            </div>
          )}

          {screenState === "form" && (
            <SignupForm
              onOtpRequested={handleOtpRequested}
              onAlreadySignedIn={reloadSession}
            />
          )}

          {screenState === "profile-error" && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={reloadSession}
                className="h-11 rounded-full bg-black px-6 text-sm font-semibold text-white"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="h-11 rounded-full border border-[#e2e2e7] px-6 text-sm font-semibold text-[#191c1f]"
              >
                Sign out
              </button>
            </div>
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

      <section className="hidden h-full min-h-0 w-1/2 lg:block">
        <AuthIllustration />
      </section>
    </div>
  );
}
