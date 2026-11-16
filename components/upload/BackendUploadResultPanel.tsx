"use client";

import React from "react";
import { AlertTriangle, Check } from "lucide-react";
import { BackendUploadResponse } from "@/types/upload";

interface BackendUploadResultPanelProps {
  upload: BackendUploadResponse;
}

export function BackendUploadResultPanel({ upload }: BackendUploadResultPanelProps) {
  const isWarning = upload.validation_status === "warning";
  const findings = Array.from(
    new Set([...upload.security_findings, ...upload.validation_report.findings]),
  );
  const visibleFindings = findings.slice(0, 3);

  return (
    <section
      aria-labelledby="file-validation-heading"
      className={`rounded-xl border p-3 ${
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-[#00a87e]/20 bg-[#00a87e]/5 text-[#006400]"
      }`}
    >
      <div className="flex items-center gap-2">
        {isWarning ? (
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
        ) : (
          <Check aria-hidden="true" className="h-4 w-4 shrink-0" />
        )}
        <h3 id="file-validation-heading" className="text-sm font-semibold">
          File validation {isWarning ? "accepted with warnings" : "passed"}
        </h3>
      </div>
      <p className="mt-1 text-xs leading-5">
        The file is held in private quarantine. These checks cover file format, not viruses.
      </p>
      {visibleFindings.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-5">
          {visibleFindings.map((finding) => (
            <li key={finding}>{finding}</li>
          ))}
        </ul>
      )}
      {findings.length > visibleFindings.length && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-medium">
            Show all {findings.length} backend findings
          </summary>
          <ul className="mt-2 list-inside list-disc space-y-1 leading-5">
            {findings.slice(visibleFindings.length).map((finding) => (
              <li key={finding}>{finding}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
