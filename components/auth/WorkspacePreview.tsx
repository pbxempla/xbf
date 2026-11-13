"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { LogOut, CheckCircle2, Coins, Sparkles, Building, User, ArrowRight } from "lucide-react";
import { AuthSessionResponse } from "@/types/auth";
import { authClient } from "@/lib/auth-client";
import { clearAuthToken } from "@/lib/api";
import { XemplaLogo } from "@/components/icons/Icons";

interface WorkspacePreviewProps {
  session: AuthSessionResponse;
  onLogout: () => void;
}

export function WorkspacePreview({ session, onLogout }: WorkspacePreviewProps) {
  const router = useRouter();
  const { user, is_new_user, credits_awarded } = session;

  useEffect(() => {
    // Fire confetti celebration on successful signup
    if (is_new_user && typeof window !== "undefined") {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3B82F6", "#4F46E5", "#818CF8", "#F59E0B"],
      });
    }
  }, [is_new_user]);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore
    }
    clearAuthToken();
    onLogout();
  };

  const isWork = user.email_type === "work" || user.emailType === "work";
  const creditBalance =
    typeof user.credit_balance === "number"
      ? user.credit_balance
      : typeof user.creditBalance === "number"
      ? user.creditBalance
      : 0;

  return (
    <div className="auth-success-content w-full flex flex-col animate-fade-in">
      <div className="auth-success-brand mb-8">
        <XemplaLogo />
      </div>

      {/* Success Banner */}
      <div className="auth-success-banner mb-6 flex items-start gap-3.5 rounded-xl border border-[#00a87e]/20 bg-[#00a87e]/5 p-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00a87e]/10 text-[#006400]">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#191c1f]">
            {is_new_user ? "Account Successfully Created!" : "Welcome Back!"}
          </h3>
          <p className="mt-0.5 text-xs text-[#505a63]">
            {is_new_user
              ? `You have been awarded ${credits_awarded} initial credits for your ${user.email_type || user.emailType} account.`
              : `Signed in as ${user.email}.`}
          </p>
        </div>
      </div>

      {/* User Card */}
      <div className="auth-success-card flex flex-col gap-5 rounded-[20px] border border-[#e2e2e7] bg-white p-6">
        <div className="flex items-center justify-between border-b border-[#e2e2e7] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#494fdf] text-lg font-semibold text-white">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-semibold text-[#191c1f]">{user.email}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs capitalize text-[#505a63]">
                {isWork ? (
                  <span className="inline-flex items-center gap-1 font-medium text-[#376cd5]">
                    <Building className="w-3 h-3" /> Work Email Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-[#494fdf]">
                    <User className="w-3 h-3" /> Personal Email Account
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="rounded-full border border-[#00a87e]/20 bg-[#00a87e]/5 px-2.5 py-1 text-xs font-semibold text-[#006400]">
            Verified
          </span>
        </div>

        {/* Live Credit Balance Display */}
        <div className="flex items-center justify-between rounded-xl bg-black p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#ec7e00]">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-white/60">
                Available Credits
              </div>
              <div className="text-2xl font-medium text-white">
              {creditBalance} <span className="text-sm font-medium text-white/60">Credits</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white">
              <Sparkles className="h-3 w-3 text-[#ec7e00]" />
              {isWork ? "+200 Tier" : "+150 Tier"}
            </span>
          </div>
        </div>

        {/* Account Details Metadata */}
        <div className="flex flex-col gap-2.5 rounded-xl border border-[#e2e2e7] bg-[#f4f4f4] p-4 text-xs text-[#505a63]">
          <div className="flex justify-between items-center">
            <span>Account Type</span>
            <span className="font-semibold capitalize text-[#191c1f]">
              {user.email_type || user.emailType} Email
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Authentication</span>
            <span className="font-semibold text-[#191c1f]">Passwordless OTP (Better Auth)</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Initial Reward</span>
            <span className="font-semibold text-[#006400]">
              +{isWork ? "200" : "150"} Credits Granted
            </span>
          </div>
        </div>

        {/* Continue to Upload Action */}
        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
        >
          <span>Continue to Data Upload</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Sign Out Action Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#e2e2e7] text-sm font-semibold text-[#191c1f] transition-colors hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf]"
        >
          <LogOut className="h-4 w-4 text-[#505a63]" />
          <span>Sign out of Xempla</span>
        </button>
      </div>
    </div>
  );
}
