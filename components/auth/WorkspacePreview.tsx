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
    <div className="w-full flex flex-col animate-fade-in">
      <div className="mb-8">
        <XemplaLogo />
      </div>

      {/* Success Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-start gap-3.5 mb-6">
        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-950">
            {is_new_user ? "Account Successfully Created!" : "Welcome Back!"}
          </h3>
          <p className="text-xs text-emerald-700 mt-0.5">
            {is_new_user
              ? `You have been awarded ${credits_awarded} initial credits for your ${user.email_type || user.emailType} account.`
              : `Signed in as ${user.email}.`}
          </p>
        </div>
      </div>

      {/* User Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-500/20">
              {user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">{user.email}</div>
              <div className="text-xs text-slate-400 capitalize flex items-center gap-1.5 mt-0.5">
                {isWork ? (
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <Building className="w-3 h-3" /> Work Email Account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                    <User className="w-3 h-3" /> Personal Email Account
                  </span>
                )}
              </div>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
            Verified
          </span>
        </div>

        {/* Live Credit Balance Display */}
        <div className="p-4 rounded-xl bg-linear-to-br from-[#1E1B4B] to-[#312E81] text-white flex items-center justify-between shadow-lg shadow-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider">
                Available Credits
              </div>
              <div className="text-2xl font-black text-white">
                {creditBalance} <span className="text-sm font-medium text-indigo-200">Credits</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/15 text-white text-xs font-semibold backdrop-blur-xs">
              <Sparkles className="w-3 h-3 text-amber-300" />
              {isWork ? "+200 Tier" : "+150 Tier"}
            </span>
          </div>
        </div>

        {/* Account Details Metadata */}
        <div className="flex flex-col gap-2.5 text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="flex justify-between items-center">
            <span>Account Type</span>
            <span className="font-semibold text-slate-800 capitalize">
              {user.email_type || user.emailType} Email
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span>Authentication</span>
            <span className="font-semibold text-slate-800">Passwordless OTP (Better Auth)</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Initial Reward</span>
            <span className="font-semibold text-emerald-600">
              +{isWork ? "200" : "150"} Credits Granted
            </span>
          </div>
        </div>

        {/* Continue to Upload Action */}
        <button
          type="button"
          onClick={() => router.push("/upload")}
          className="w-full h-11 rounded-xl bg-[#2B26C7] hover:bg-[#201CB0] active:scale-[0.99] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-600/20"
        >
          <span>Continue to Data Upload</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Sign Out Action Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-11 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>Sign out of Xempla</span>
        </button>
      </div>
    </div>
  );
}
