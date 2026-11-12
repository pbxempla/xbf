"use client";

import React from "react";
import { Check, X, Loader2 } from "lucide-react";
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
    <div className="shrink-0 w-full flex flex-col">
      <h3 className="text-xs font-bold text-[#101744] mb-1.5">
        Validation
      </h3>

      <div className="w-full bg-[#F4F1FF] rounded-xl p-3 sm:p-3.5 flex flex-col gap-2 border border-[#EBE6FF]">
        {items.map((item) => {
          return (
            <div key={item.id} className="flex items-center gap-2.5">
              {/* Checkmark Circle Icon */}
              {item.passed ? (
                <div className="w-4 h-4 rounded-full bg-[#16B85A] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-3" />
                </div>
              ) : hasFile && isValidating ? (
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[#3024D8]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                </div>
              ) : hasFile && item.message ? (
                <div className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                  <X className="w-2.5 h-2.5 stroke-3" />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full border border-[#DDD7FE] bg-white/70 flex items-center justify-center shrink-0" />
              )}

              {/* Validation Label */}
              <span
                className={`text-xs font-medium ${
                  item.passed
                    ? "text-[#101744]"
                    : item.message
                    ? "text-red-600"
                    : "text-[#64749A]"
                }`}
              >
                {item.label}
              </span>
            </div>
          );
        })}

        {/* Global Error banner if parsing failed */}
        {error && (
          <div className="mt-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
