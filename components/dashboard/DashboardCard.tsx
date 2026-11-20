import React from "react";
import { ArrowUpRight } from "lucide-react";

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  emptyMessage: string;
  className?: string;
  /** Height of the empty chart area. */
  areaClassName?: string;
}

/** A titled card with a blank chart area, shown until the engine returns data. */
export function DashboardCard({
  title,
  subtitle,
  emptyMessage,
  className = "",
  areaClassName = "h-40",
}: DashboardCardProps) {
  return (
    <section
      aria-label={title}
      className={`rounded-3xl bg-white p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-medium tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-app-muted">{subtitle}</p>
          ) : null}
        </div>
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-canvas text-app-ink/30"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      <p className="mt-6 text-3xl font-medium tracking-tight text-app-ink/25">
        —
      </p>

      <div
        className={`mt-4 flex items-center justify-center rounded-2xl bg-app-canvas px-4 text-center text-sm text-app-muted ${areaClassName}`}
      >
        {emptyMessage}
      </div>
    </section>
  );
}
