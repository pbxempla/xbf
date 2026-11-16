"use client";

import React from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { BackendUploadResponse, ParsedFileData } from "@/types/upload";

interface UploadedFileCardProps {
  data: ParsedFileData | null;
  backendUpload?: BackendUploadResponse | null;
}

export function UploadedFileCard({ data, backendUpload }: UploadedFileCardProps) {
  const isExcel =
    (backendUpload &&
      (backendUpload.detected_file_type === "xls" ||
        backendUpload.detected_file_type === "xlsx")) ||
    (data && (data.fileType === "xls" || data.fileType === "xlsx"));

  const fileName = backendUpload?.original_filename ?? data?.fileName;
  const formattedSize = data?.formattedSize;
  const rowCount = backendUpload?.preview?.total_rows ?? data?.rowCount;
  const columnCount = backendUpload?.preview?.total_columns ?? data?.columnCount;

  if (!data) return null;

  return (
    <section className="flex w-full shrink-0 flex-col">
      <h3 className="mb-2 text-sm font-semibold text-app-ink">Uploaded file</h3>

      <div className="flex w-full items-center gap-3 rounded-xl border border-app-line bg-app-canvas p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-app-line bg-app-surface text-app-ink">
            {isExcel ? (
              <FileSpreadsheet aria-hidden="true" className="h-5 w-5" />
            ) : (
              <FileText aria-hidden="true" className="h-5 w-5" />
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-app-ink">{fileName}</span>
            <span className="mt-1 text-xs text-app-muted">
              {formattedSize} · {rowCount?.toLocaleString()} rows · {columnCount} columns
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
