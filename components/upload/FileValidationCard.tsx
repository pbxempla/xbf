"use client";

import React from "react";
import { Check, Circle, Loader2, X } from "lucide-react";
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
  return (
    <section className="w-full shrink-0">
      <h3 className="mb-3 text-sm font-semibold text-[#191c1f]">Readiness checks</h3>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            {item.passed ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00a87e]/10 text-[#006400]">
                <Check aria-hidden="true" className="h-3 w-3 stroke-[2.5]" />
              </span>
            ) : hasFile && isValidating ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 shrink-0 animate-spin text-[#494fdf]" />
            ) : hasFile && item.message ? (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e23b4a]/10 text-[#e23b4a]">
                <X aria-hidden="true" className="h-3 w-3 stroke-[2.5]" />
              </span>
            ) : (
              <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-[#c9c9cd]" />
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
