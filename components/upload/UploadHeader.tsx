"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { XemplaLogo } from "@/components/icons/Icons";
import { CreditsBadge } from "@/components/ui/CreditsBadge";

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
    <header className="sticky top-0 z-20 flex w-full shrink-0 items-center justify-between bg-app-canvas/90 px-4 py-3 text-app-ink backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center">
        <XemplaLogo iconOnly />
      </div>

      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <CreditsBadge balance={creditBalance} />
        <div
          aria-hidden="true"
          title={displayName}
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-xs font-semibold text-white sm:flex"
        >
          {initials || "X"}
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-app-ink/60 transition-colors hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
        >
          <LogOut aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
