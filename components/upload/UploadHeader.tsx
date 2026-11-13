"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { XemplaLogo } from "@/components/icons/Icons";

interface UploadHeaderProps {
  userEmail?: string;
  userName?: string;
  emailType?: "personal" | "work";
  creditBalance?: number;
  onLogout?: () => void;
}

export function UploadHeader({
  userEmail,
  userName,
  emailType,
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
    <header className="z-10 flex h-16 w-full shrink-0 items-center justify-between bg-black px-5 text-white sm:px-8 lg:px-10">
      <div className="flex items-center gap-8">
        <XemplaLogo onDark />
        <span className="hidden border-l border-white/15 pl-8 text-sm text-white/60 sm:block">
          Data workspace
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="max-w-36 text-right sm:max-w-64">
          <p className="truncate text-xs font-semibold text-white sm:text-sm">{displayName}</p>
          <p className="truncate text-[11px] text-white/60 sm:text-xs">
            {emailType ? `${emailType === "work" ? "Work" : "Personal"} account` : ""}
            {typeof creditBalance === "number"
              ? `${emailType ? " · " : ""}${creditBalance} credits`
              : ""}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#494fdf] text-xs font-semibold text-white"
        >
          {initials || "X"}
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
