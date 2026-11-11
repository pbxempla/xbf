"use client";

import React, { useState } from "react";
import { SignupForm } from "./SignupForm";
import { OtpVerification } from "./OtpVerification";
import { AuthIllustration } from "./AuthIllustration";
import { WorkspacePreview } from "./WorkspacePreview";
import { AuthSessionResponse, OtpRequestResponse } from "@/types/auth";

type ScreenState = "form" | "otp" | "authenticated";

export function SignupSplitScreen() {
  const [screenState, setScreenState] = useState<ScreenState>("form");
  const [otpData, setOtpData] = useState<OtpRequestResponse | null>(null);
  const [authSession, setAuthSession] = useState<AuthSessionResponse | null>(null);

  // Check for existing session on mount
  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("xempla_auth_token") : null;
    if (token) {
      import("@/lib/api").then(({ authApi }) => {
        authApi.getCurrentUser().then((user) => {
          setAuthSession({
            access_token: token,
            token_type: "bearer",
            is_new_user: false,
            credits_awarded: 0,
            user,
          });
          setScreenState("authenticated");
        }).catch(() => {
          // Token expired or invalid
          localStorage.removeItem("xempla_auth_token");
        });
      });
    }
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

  const handleLogout = () => {
    setAuthSession(null);
    setOtpData(null);
    setScreenState("form");
  };

  return (
    <div className="w-full min-h-screen flex flex-col lg:flex-row bg-white">
      {/* LEFT SECTION — AUTHENTICATION FORM (~48-50% width) */}
      <section className="w-full lg:w-[49%] xl:w-[48%] flex items-center justify-center py-10 px-6 sm:px-12 md:px-16 xl:px-24 bg-white z-10">
        <div className="w-full max-w-110">
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

      {/* RIGHT SECTION — ILLUSTRATION SECTION (~50-52% width) */}
      <section className="w-full lg:w-[51%] xl:w-[52%] min-h-125 lg:min-h-screen flex items-center justify-center">
        <AuthIllustration />
      </section>
    </div>
  );
}
