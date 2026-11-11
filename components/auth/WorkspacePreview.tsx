"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { LogOut, CheckCircle2, Coins, Sparkles, Building, User } from "lucide-react";
import { AuthSessionResponse } from "@/types/auth";
import { authApi } from "@/lib/api";
import { XemplaLogo } from "@/components/icons/Icons";

interface WorkspacePreviewProps {
  session: AuthSessionResponse;
  onLogout: () => void;
}

export function WorkspacePreview({ session, onLogout }: WorkspacePreviewProps) {
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
    await authApi.logout();
    onLogout();
  };

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
              ? `You have been awarded ${credits_awarded} initial credits for your ${user.email_type} account.`
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
                {user.email_type === "work" ? (
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
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#1E1B4B] to-[#312E81] text-white flex items-center justify-between shadow-lg shadow-indigo-900/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-indigo-200 uppercase tracking-wider">
                Available Credits
              </div>
              <div className="text-2xl font-black text-white">
                {user.credit_balance} <span className="text-sm font-medium text-indigo-200">Credits</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-semibold text-amber-300 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready to use</span>
          </div>
        </div>

        <div className="text-xs text-slate-400 leading-relaxed">
          Your workspace environment is provisioned with passwordless security. Credits can be used for team collaboration, automation agents, and AI tasks.
        </div>
      </div>

      {/* Log out Action */}
      <div className="mt-8">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full h-[46px] rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-slate-500" />
          <span>Sign out and return to signup</span>
        </button>
      </div>
    </div>
  );
}
