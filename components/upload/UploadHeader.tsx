"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { XemplaLogo } from "@/components/icons/Icons";

interface UploadHeaderProps {
  userEmail?: string;
  userName?: string;
  creditBalance: number;
  onLogout?: () => void;
}

export function UploadHeader({
  userEmail,
  userName,
  creditBalance,
  onLogout,
}: UploadHeaderProps) {
  const displayName = userName?.trim() || userEmail || "Signed in";
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <header className="z-10 flex h-16 w-full shrink-0 items-center justify-between bg-black px-4 text-white sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center">
        <XemplaLogo onDark />
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div
          role="group"
          aria-label={`${creditBalance} credits available`}
          className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-white/35 px-2.5 text-xs font-semibold text-white sm:gap-2 sm:px-3 sm:text-sm"
        >
          <span>Credits</span>
          <span>{creditBalance}</span>
        </div>
        <p className="hidden max-w-56 truncate text-right text-sm font-semibold text-white sm:block">
          {displayName}
        </p>
        <div
          aria-hidden="true"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-app-ink sm:flex"
        >
          {initials || "X"}
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/40 text-white/75 transition-colors hover:bg-white/10 hover:text-white active:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
