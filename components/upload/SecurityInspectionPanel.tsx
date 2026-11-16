"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Check,
  CircleHelp,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import { FileSecurityInspection, SecurityCheckStatus } from "@/types/upload";

interface SecurityInspectionPanelProps {
  inspection: FileSecurityInspection | null;
  isInspecting: boolean;
}

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
}

const STATUS_LABELS: Record<SecurityCheckStatus, string> = {
  passed: "Passed",
  warning: "Warning",
  blocked: "Blocked",
  not_applicable: "Not applicable",
  not_inspected: "Not inspected",
};

const STATUS_STYLES: Record<SecurityCheckStatus, string> = {
  passed: "bg-[#00a87e]/10 text-[#006400]",
  warning: "bg-amber-100 text-amber-800",
  blocked: "bg-[#e23b4a]/10 text-[#b42332]",
  not_applicable: "bg-app-canvas text-app-muted",
  not_inspected: "bg-app-canvas text-app-muted",
};

function StatusIcon({ status }: { status: SecurityCheckStatus }) {
  if (status === "passed") return <Check aria-hidden="true" className="h-3.5 w-3.5" />;
  if (status === "warning") return <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />;
  if (status === "blocked") return <X aria-hidden="true" className="h-3.5 w-3.5" />;
  return <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" />;
}

export function SecurityInspectionPanel({
  inspection,
  isInspecting,
}: SecurityInspectionPanelProps) {
  const detailsId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressFocusOpenRef = useRef(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 32);
    const height = Math.min(360, window.innerHeight - 32);
    const left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16));
    const below = rect.bottom + 8;
    const top =
      below + height > window.innerHeight - 16
        ? Math.max(16, rect.top - height - 8)
        : below;

    setPosition({ top, left, width });
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeDetails = useCallback(
    (restoreFocus = false) => {
      clearCloseTimer();
      setIsDetailsOpen(false);
      if (restoreFocus && document.activeElement !== triggerRef.current) {
        suppressFocusOpenRef.current = true;
        triggerRef.current?.focus();
      }
    },
    [clearCloseTimer],
  );

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setIsDetailsOpen(false), 180);
  }, [clearCloseTimer]);

  const openDetails = useCallback(() => {
    if (!inspection) return;
    clearCloseTimer();
    setIsDetailsOpen(true);
    requestAnimationFrame(updatePosition);
  }, [clearCloseTimer, inspection, updatePosition]);

  useEffect(() => {
    if (!isDetailsOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !triggerRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        closeDetails();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetails(true);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [closeDetails, isDetailsOpen, updatePosition]);

  useEffect(
    () => () => {
      clearCloseTimer();
    },
    [clearCloseTimer],
  );

  const passedCount =
    inspection?.checks.filter((check) => check.status === "passed").length ?? 0;
  const totalCount = inspection?.checks.length ?? 0;
  const statusLabel = isInspecting
    ? "Inspecting"
    : !inspection
      ? "Waiting for a file"
      : inspection.outcome === "passed"
        ? "Passed"
        : inspection.outcome === "warning"
          ? "Review needed"
          : "Blocked";
  const summaryStyles =
    isInspecting || !inspection
      ? "border-app-line bg-app-canvas text-app-ink"
      : inspection.outcome === "passed"
        ? "border-[#00a87e]/20 bg-[#00a87e]/5 text-[#006400]"
        : inspection.outcome === "warning"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-[#e23b4a]/20 bg-[#e23b4a]/5 text-[#8b0000]";

  return (
    <section aria-labelledby="security-inspection-heading" className="w-full">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldAlert aria-hidden="true" className="h-4 w-4 text-app-muted" />
          <h3 id="security-inspection-heading" className="text-sm font-semibold text-app-ink">
            Security inspection
          </h3>
        </div>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Show security inspection details"
          aria-describedby={isDetailsOpen ? detailsId : undefined}
          aria-expanded={isDetailsOpen}
          aria-controls={detailsId}
          disabled={!inspection}
          onMouseEnter={openDetails}
          onMouseLeave={scheduleClose}
          onFocus={() => {
            if (suppressFocusOpenRef.current) {
              suppressFocusOpenRef.current = false;
              return;
            }
            openDetails();
          }}
          onBlur={scheduleClose}
          onClick={openDetails}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-app-muted transition-colors hover:bg-app-canvas hover:text-app-ink active:bg-app-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Info aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <p
        role={!isInspecting && inspection?.outcome === "blocked" ? "alert" : "status"}
        className={`flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${summaryStyles}`}
      >
        <span className="font-semibold">{statusLabel}</span>
        <span className="shrink-0 text-right">
          {inspection ? `${passedCount} of ${totalCount} checks passed` : "No checks run"}
        </span>
      </p>

      {isDetailsOpen &&
        position &&
        typeof document !== "undefined" &&
        inspection &&
        createPortal(
          <div
            ref={popoverRef}
            id={detailsId}
            role="tooltip"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: "min(70vh, 360px)",
              zIndex: 50,
            }}
            className="overflow-y-auto rounded-xl border border-app-line bg-white p-4 shadow-lg"
          >
            <ul className="space-y-3">
              {inspection.checks.map((check) => (
                <li key={check.id} className="border-b border-app-line pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-app-ink">{check.label}</span>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[check.status]}`}
                    >
                      <StatusIcon status={check.status} />
                      {STATUS_LABELS[check.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-app-ink">{check.details}</p>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </section>
  );
}
