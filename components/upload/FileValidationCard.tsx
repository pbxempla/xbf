"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Circle, Loader2, X } from "lucide-react";
import { ValidationItem } from "@/types/upload";

interface FileValidationCardProps {
  items: ValidationItem[];
  isValidating?: boolean;
  hasFile: boolean;
  error?: string | null;
}

export function FileValidationCard({
  items,
  isValidating,
  hasFile,
  error,
}: FileValidationCardProps) {
  const [open, setOpen] = useState(false);
  const allPassed =
    hasFile && !isValidating && !error && items.length > 0 && items.every((item) => item.passed);
  const showList = !allPassed || open;

  return (
    <section className="w-full shrink-0">
      {allPassed ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-accent"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-app-ink">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00a87e]/10 text-[#006400]">
              <Check aria-hidden="true" className="h-3 w-3 stroke-[2.5]" />
            </span>
            All {items.length} file checks passed
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 text-app-muted transition-transform motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : (
        <h3 className="mb-3 text-sm font-semibold text-app-ink">File checks</h3>
      )}

      <ul className={`space-y-2.5 ${showList ? "" : "hidden"} ${allPassed ? "mt-3" : ""}`}>
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            {item.passed ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00a87e]/10 text-[#006400]">
                <Check aria-hidden="true" className="h-3 w-3 stroke-[2.5]" />
              </span>
            ) : hasFile && isValidating ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-app-accent" />
            ) : hasFile && item.message ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e23b4a]/10 text-[#e23b4a]">
                <X aria-hidden="true" className="h-3 w-3 stroke-[2.5]" />
              </span>
            ) : (
              <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-app-muted" />
            )}

            <span className={`text-sm ${item.message ? "text-[#8b0000]" : "text-[#3a3d40]"}`}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#e23b4a]/20 bg-[#e23b4a]/5 p-3 text-sm leading-5 text-[#8b0000]"
        >
          {error}
        </div>
      )}
    </section>
  );
}
