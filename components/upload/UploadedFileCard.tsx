"use client";

import React from "react";
import { FileSpreadsheet, FileText, UploadCloud } from "lucide-react";
import { ParsedFileData } from "@/types/upload";

interface UploadedFileCardProps {
  data: ParsedFileData | null;
}

export function UploadedFileCard({ data }: UploadedFileCardProps) {
  const isExcel = data && (data.fileType === "xls" || data.fileType === "xlsx");

  return (
    <section className="flex w-full shrink-0 flex-col">
      <h3 className="mb-2 text-sm font-semibold text-[#191c1f]">Uploaded file</h3>

      {data ? (
        <div className="flex w-full items-center gap-3 rounded-xl border border-[#e2e2e7] bg-[#f4f4f4] p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#e2e2e7] bg-white text-[#191c1f]">
              {isExcel ? (
                <FileSpreadsheet aria-hidden="true" className="h-5 w-5" />
              ) : (
                <FileText aria-hidden="true" className="h-5 w-5" />
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold text-[#191c1f]">{data.fileName}</span>
              <span className="mt-1 text-xs text-[#5c5e60]">
                {data.formattedSize} · {data.rowCount.toLocaleString()} rows · {data.columnCount} columns
              </span>
            </div>
          </div>

        </div>
      ) : (
        <div className="flex w-full items-center gap-3 rounded-xl border border-[#e2e2e7] bg-[#f4f4f4] p-4 text-[#5c5e60]">
          <UploadCloud aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="text-sm">Your selected file will appear here.</span>
        </div>
      )}
    </section>
  );
}
