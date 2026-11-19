"use client";

import React from "react";
import { PreviewTableSkeleton } from "@/components/ui/Skeleton";
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

  if (!isLoading && !isBackend && !data) return null;

  return (
    <section className="flex min-h-[220px] w-full flex-1 flex-col gap-2 lg:min-h-0">
      {showQuickOverview && (data || isBackend) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5c5e60]">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-md bg-app-canvas px-2 py-1 text-[11px] font-medium text-app-ink"
            >
              File preview
            </span>
            {isBackend && backendPreview?.sheet_name && (
              <span className="text-[11px] text-app-muted">
                Sheet: <strong className="text-app-ink">{backendPreview.sheet_name}</strong>
              </span>
            )}
          </div>
          <span className="text-[11px] text-app-muted">
            <strong className="text-app-ink">{totalRowCount.toLocaleString()}</strong> rows ·{" "}
            <strong>{totalColCount}</strong> columns
          </span>
        </div>
      )}

      {(isBackend || (data && data.headers.length > 0)) && rowCount > 0 ? (
        <div className="flex min-h-[200px] flex-1 overflow-hidden rounded-xl border border-app-line bg-white lg:min-h-0">
          <div className="w-full overflow-auto">
            <table className="w-full min-w-max border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-app-canvas">
                <tr className="border-b border-app-line">
                  {headers.map((header, index) => {
                    const detectedType = columns ? columns[index]?.detected_type : null;
                    return (
                      <th
                        key={index}
                        className="whitespace-nowrap px-3 py-2.5 font-semibold text-app-ink"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{header}</span>
                          {detectedType && (
                            <span
                              title={`Inferred type: ${detectedType}`}
                              className="inline-block rounded border border-app-line bg-white px-1.5 py-0.5 font-mono text-[10px] font-normal text-app-muted"
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
              <tbody className="divide-y divide-app-line">
                {isBackend
                  ? backendPreview!.preview_rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-app-canvas">
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
                                <span className="italic text-[#5c5e60]">null</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  : data!.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-app-canvas">
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
                                <span className="italic text-[#5c5e60]">null</span>
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
        <PreviewTableSkeleton />
      ) : (
        <div
          role="status"
          className="flex min-h-[200px] flex-1 items-center justify-center rounded-xl border border-app-line bg-app-canvas px-4 text-center text-sm text-app-muted lg:min-h-0"
        >
          No rows to preview.
        </div>
      )}
    </section>
  );
}
