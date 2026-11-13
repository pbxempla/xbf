"use client";

import React from "react";
import { AlertTriangle, Check, CircleHelp, ShieldAlert, X } from "lucide-react";
import { FileSecurityInspection, SecurityCheckStatus } from "@/types/upload";

interface SecurityInspectionPanelProps {
  inspection: FileSecurityInspection | null;
  isInspecting: boolean;
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
  not_applicable: "bg-[#f4f4f4] text-[#737b82]",
  not_inspected: "bg-[#f4f4f4] text-[#737b82]",
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
  const outcome = inspection?.outcome;
  const summary = isInspecting
    ? "Security inspection is running locally in your browser."
    : outcome === "passed"
      ? "File validation completed. No issues were detected by the available checks."
      : outcome === "warning"
        ? "Some potentially risky content was detected. Review the findings before proceeding."
        : outcome === "blocked"
          ? "This file cannot be accepted because it failed mandatory validation checks."
          : "Select a file to begin local inspection.";
  const summaryStyles = isInspecting
    ? "border-[#e2e2e7] bg-[#f4f4f4] text-[#505a63]"
    : outcome === "passed"
      ? "border-[#00a87e]/20 bg-[#00a87e]/5 text-[#006400]"
      : outcome === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : outcome === "blocked"
          ? "border-[#e23b4a]/20 bg-[#e23b4a]/5 text-[#8b0000]"
          : "border-[#e2e2e7] bg-[#f4f4f4] text-[#505a63]";

  return (
    <section aria-labelledby="security-inspection-heading" className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert aria-hidden="true" className="h-4 w-4 text-[#494fdf]" />
        <h3 id="security-inspection-heading" className="text-sm font-semibold text-[#191c1f]">
          Security inspection
        </h3>
        {isInspecting && (
          <span role="status" className="text-xs text-[#5c5e60]">
            Inspecting locally…
          </span>
        )}
      </div>

      {inspection && (
        <ul className="space-y-2">
          {inspection.checks.map((check) => (
            <li
              key={check.id}
              className="flex items-start justify-between gap-3 text-xs"
              title={check.details}
            >
              <span className="min-w-0 text-[#3a3d40]">{check.label}</span>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 font-medium ${STATUS_STYLES[check.status]}`}
              >
                <StatusIcon status={check.status} />
                {STATUS_LABELS[check.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p
        role={!isInspecting && outcome === "blocked" ? "alert" : "status"}
        className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${summaryStyles}`}
      >
        {summary}
      </p>
    </section>
  );
}
