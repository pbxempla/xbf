"use client";

import React from "react";
import { Bell } from "lucide-react";
import { XemplaLogo } from "@/components/icons/Icons";

interface UploadHeaderProps {
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
}

export function UploadHeader({ userEmail, userName }: UploadHeaderProps) {
  const getInitials = (): string => {
    if (userName && userName.trim()) {
      const parts = userName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (userEmail && userEmail.trim()) {
      const namePart = userEmail.split("@")[0];
      const parts = namePart.split(/[._-]/);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return namePart.slice(0, 2).toUpperCase();
    }
    return "AP";
  };

  const initials = getInitials();

  return (
    <header className="shrink-0 w-full h-14 sm:h-15 px-6 sm:px-8 lg:px-10 flex items-center justify-between border-b border-[#E8E2FF]/80 bg-white/40 backdrop-blur-xs select-none z-10">
      {/* Left: Brand Logo */}
      <div className="flex items-center">
        <XemplaLogo />
      </div>

      {/* Right: Notification Bell & User Initials Avatar */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          aria-label="Notifications"
          className="relative p-1.5 text-[#101744]/70 hover:text-[#101744] transition-colors rounded-full hover:bg-white/60 cursor-pointer"
        >
          <Bell className="w-5 h-5 stroke-[1.8]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#3024D8] ring-2 ring-white" />
        </button>

        <div
          title={userEmail || "Signed in"}
          className="w-8.5 h-8.5 rounded-full bg-[#101744] text-white flex items-center justify-center font-bold text-xs tracking-wide shadow-2xs select-none cursor-default"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
