"use client";

import React from "react";
import { BackendUploadPreview, ParsedFileData } from "@/types/upload";

interface DataPreviewTableProps {
  data?: ParsedFileData | null;
  backendPreview?: BackendUploadPreview | null;
  isLoading?: boolean;
  showQuickOverview?: boolean;
}

export function DataPreviewTable({
  data,
  backendPreview,
  isLoading,
  showQuickOverview = false,
}: DataPreviewTableProps) {
  const isBackend = Boolean(backendPreview && backendPreview.status === "ready");

  const headers: string[] = isBackend
    ? backendPreview!.columns.map((c) => c.name)
    : data?.headers ?? [];

  const columns = isBackend ? backendPreview!.columns : null;

  const rowCount = isBackend
    ? backendPreview!.preview_rows.length
    : data?.rows.length ?? 0;

  const totalRowCount = isBackend
    ? backendPreview!.total_rows
    : data?.rowCount ?? 0;

  const totalColCount = isBackend
    ? backendPreview!.total_columns
    : data?.columnCount ?? 0;

  return (
    <section className="flex min-h-[220px] w-full flex-1 flex-col gap-2 lg:min-h-0">
      {showQuickOverview && (data || isBackend) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5c5e60]">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${
                isBackend
                  ? "bg-[#e8e9ff] text-[#494fdf]"
                  : "bg-[#f4f4f4] text-[#5c5e60]"
              }`}
            >
              {isBackend ? "Backend preview (first 5 rows)" : "Local pre-upload preview"}
            </span>
            {isBackend && backendPreview?.sheet_name && (
              <span className="text-[11px] text-[#5c5e60]">
                Sheet: <strong className="text-[#191c1f]">{backendPreview.sheet_name}</strong>
              </span>
            )}
          </div>
          <span className="text-[11px]">
            Total: <strong>{totalRowCount.toLocaleString()}</strong> rows •{" "}
            <strong>{totalColCount}</strong> columns
          </span>
        </div>
      )}

      {(isBackend || (data && data.headers.length > 0)) && rowCount > 0 ? (
        <div className="flex min-h-[200px] flex-1 overflow-hidden rounded-xl border border-[#e2e2e7] bg-white lg:min-h-0">
          <div className="w-full overflow-auto">
            <table className="w-full min-w-max border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#f4f4f4]">
                <tr className="border-b border-[#e2e2e7]">
                  {headers.map((header, index) => {
                    const detectedType = columns ? columns[index]?.detected_type : null;
                    return (
                      <th
                        key={index}
                        className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#191c1f]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{header}</span>
                          {detectedType && (
                            <span
                              title={`Inferred type: ${detectedType}`}
                              className="inline-block rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-normal text-[#494fdf] border border-[#e2e2e7]"
                            >
                              {detectedType}
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e2e7]">
                {isBackend
                  ? backendPreview!.preview_rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-[#f4f4f4]">
                        {headers.map((_, colIndex) => {
                          const value = row[colIndex];
                          const displayValue =
                            value !== null && value !== undefined ? String(value) : "";
                          return (
                            <td
                              key={colIndex}
                              title={displayValue}
                              className="max-w-56 truncate whitespace-nowrap px-3 py-2.5 text-[#3a3d40]"
                            >
                              {displayValue || (
                                <span className="italic text-[#8d969e]">null</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  : data!.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-[#f4f4f4]">
                        {headers.map((header, columnIndex) => {
                          const value = row[header];
                          const displayValue =
                            value !== null && value !== undefined ? String(value) : "";

                          return (
                            <td
                              key={columnIndex}
                              title={displayValue}
                              className="max-w-56 truncate whitespace-nowrap px-3 py-2.5 text-[#3a3d40]"
                            >
                              {displayValue || (
                                <span className="italic text-[#8d969e]">null</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : isLoading ? (
        <div
          role="status"
          className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[#e2e2e7] bg-[#f4f4f4] text-[#505a63] lg:min-h-0"
        >
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#494fdf] border-t-transparent" />
          <span className="text-sm">Preparing your preview…</span>
        </div>
      ) : null}
    </section>
  );
}
