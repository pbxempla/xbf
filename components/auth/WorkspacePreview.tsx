"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { LogOut, CheckCircle2, Coins, Sparkles, Building, User, ArrowRight } from "lucide-react";
import { AuthSessionResponse } from "@/types/auth";

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

  const isWork = user.email_type === "work";
  const creditBalance = user.credit_balance;

  return (
    <div className="auth-success-content w-full flex flex-col animate-fade-in">
      {/* Success Banner */}
      <div className="auth-success-banner mb-6 flex items-start gap-4 rounded-xl border border-[#00a87e]/20 bg-[#00a87e]/5 p-5 sm:p-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#00a87e]/10 text-[#006400]">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#191c1f]">
            {is_new_user ? "Account Successfully Created!" : "Welcome Back!"}
          </h3>
          <p className="mt-1 text-sm leading-5 text-[#505a63]">
            {is_new_user
            ? `You have been awarded ${credits_awarded} initial credits for your ${user.email_type} account.`
              : `Signed in as ${user.email}.`}
          </p>
        </div>
      </div>

      {/* User Card */}
      <div className="auth-success-card flex flex-col gap-5 rounded-[20px] border border-[#e2e2e7] bg-white p-5 sm:gap-6 sm:p-8 lg:p-10">
        <div className="flex items-center justify-between gap-4 border-b border-[#e2e2e7] pb-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#494fdf] text-xl font-semibold text-white sm:h-16 sm:w-16">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="break-all text-base font-semibold text-[#191c1f] sm:text-lg">{user.email}</div>
              <div className="mt-1 flex items-center gap-1.5 text-sm capitalize text-[#505a63]">
                {isWork ? (
                  <span className="inline-flex items-center gap-1 font-medium text-[#376cd5]">
                    <Building className="h-4 w-4" /> Work Email Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-medium text-[#494fdf]">
                    <User className="h-4 w-4" /> Personal Email Account
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="shrink-0 rounded-full border border-[#00a87e]/20 bg-[#00a87e]/5 px-3 py-1.5 text-sm font-semibold text-[#006400]">
            Verified
          </span>
        </div>

        {/* Live Credit Balance Display */}
        <div className="flex items-center justify-between gap-4 rounded-xl bg-black p-5 text-white sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-[#ec7e00]">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-white/60">
                Available Credits
              </div>
              <div className="text-3xl font-medium text-white">
                {creditBalance} <span className="text-base font-medium text-white/60">Credits</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm font-semibold text-white">
              <Sparkles className="h-4 w-4 text-[#ec7e00]" />
              {isWork ? "+200 Tier" : "+150 Tier"}
            </span>
          </div>
        </div>

        {/* Continue to Upload Action */}
        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white transition-colors hover:bg-[#191c1f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf] sm:h-14 sm:text-base"
        >
          <span>Continue to Data Upload</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Sign Out Action Button */}
        <button
          type="button"
          onClick={onLogout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#e2e2e7] text-sm font-semibold text-[#191c1f] transition-colors hover:bg-[#f4f4f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#494fdf] sm:h-14 sm:text-base"
        >
          <LogOut className="h-4 w-4 text-[#505a63]" />
          <span>Sign out of Xempla</span>
        </button>
      </div>
    </div>
  );
}
