"use client";

import React from "react";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  FileText,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { XemplaLogo } from "@/components/icons/Icons";
import { CreditsBadge } from "@/components/ui/CreditsBadge";

interface DashboardShellProps {
  title?: string;
  current?: "overview" | "profile" | "upload";
  userEmail: string;
  userName?: string;
  creditBalance: number;
  onLogout: () => void;
  children: React.ReactNode;
}

interface RailItem {
  label: string;
  icon: LucideIcon;
  href?: string;
}

const RAIL: RailItem[] = [
  { label: "Overview", icon: LayoutGrid, href: "/dashboard" },
  { label: "Upload data", icon: Upload, href: "/upload" },
  { label: "Reports", icon: FileText },
  { label: "History", icon: CalendarDays },
  { label: "Profile", icon: UserRound, href: "/profile" },
];

const CURRENT_HREF = {
  overview: "/dashboard",
  profile: "/profile",
  upload: "/upload",
} as const;

const railBase =
  "flex h-11 w-full items-center gap-3 rounded-full pl-[13px] pr-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";

export function DashboardShell({
  title,
  current = "overview",
  userEmail,
  userName,
  creditBalance,
  onLogout,
  children,
}: DashboardShellProps) {
  const [expanded, setExpanded] = React.useState(true);
  const toggleSidebar = () => setExpanded((value) => !value);

  const displayName = userName?.trim() || userEmail;
  const initials =
    displayName
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "X";

  return (
    <div className="min-h-screen bg-app-canvas text-app-ink">
      <header className="sticky top-0 z-20 bg-app-canvas/90 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 justify-center md:w-[60px]">
            <XemplaLogo iconOnly />
          </div>

          {title ? (
            <h1 className="min-w-0 flex-1 truncate text-xl font-medium tracking-tight sm:text-2xl">
              {title}
            </h1>
          ) : (
            <div className="min-w-0 flex-1" />
          )}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <CreditsBadge balance={creditBalance} />
            <button
              type="button"
              disabled
              aria-label="Notifications"
              className="hidden h-11 w-11 items-center justify-center rounded-full bg-white text-app-ink/60 sm:flex"
            >
              <Bell aria-hidden="true" className="h-4 w-4" />
            </button>
            <Link
              href="/profile"
              aria-label="Your profile"
              title={displayName}
              className="hidden h-11 w-11 items-center justify-center rounded-full bg-black text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent sm:flex"
            >
              {initials}
            </Link>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-app-ink/60 transition-colors hover:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-76px)] gap-4 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8">
        <aside
          aria-label="Primary"
          className={`sticky top-[76px] z-10 hidden h-[calc(100vh-76px-1.5rem)] shrink-0 self-start transition-[width] duration-200 ease-out motion-reduce:transition-none md:block ${
            expanded ? "w-52" : "w-[60px]"
          }`}
        >
          <div className="flex h-full w-full flex-col gap-3 overflow-hidden rounded-[30px] bg-white p-2">
            {RAIL.map(({ label, icon: Icon, href }) => {
              const active = href === CURRENT_HREF[current];
              const cls = `${railBase} ${active ? "bg-black text-white" : "text-app-ink/60"}`;
              return href ? (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`${cls} ${active ? "" : "hover:bg-app-canvas hover:text-app-ink"}`}
                >
                  <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                  <RailLabel visible={expanded}>{label}</RailLabel>
                </Link>
              ) : (
                <button
                  key={label}
                  type="button"
                  disabled
                  aria-label={label}
                  className={`${cls} disabled:cursor-default`}
                >
                  <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
                  <RailLabel visible={expanded}>{label}</RailLabel>
                </button>
              );
            })}

            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              aria-expanded={expanded}
              className={`${railBase} mt-auto text-app-ink/60 hover:bg-app-canvas hover:text-app-ink`}
            >
              {expanded ? (
                <PanelLeftClose aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <PanelLeftOpen aria-hidden="true" className="h-[18px] w-[18px] shrink-0" />
              )}
              <RailLabel visible={expanded}>Collapse</RailLabel>
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

function RailLabel({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`whitespace-nowrap text-sm font-medium transition-opacity duration-150 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {children}
    </span>
  );
}
