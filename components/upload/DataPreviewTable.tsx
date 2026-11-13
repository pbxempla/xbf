"use client";

import React from "react";
import { Table as TableIcon } from "lucide-react";
import { ParsedFileData } from "@/types/upload";

interface DataPreviewTableProps {
  data: ParsedFileData | null;
  isLoading?: boolean;
}

export function DataPreviewTable({ data, isLoading }: DataPreviewTableProps) {
  return (
    <section className="flex min-h-[220px] w-full flex-1 flex-col">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#191c1f]">Data preview</h3>
        <span className="rounded-full bg-[#f4f4f4] px-3 py-1 text-xs text-[#5c5e60]">
          First 5 rows
        </span>
      </div>

      {data && data.headers.length > 0 ? (
        <div className="flex min-h-[200px] flex-1 overflow-hidden rounded-xl border border-[#e2e2e7] bg-white">
          <div className="w-full overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-[#f4f4f4]">
                <tr className="border-b border-[#e2e2e7]">
                  {data.headers.map((header, index) => (
                    <th
                      key={index}
                      className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#191c1f]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e2e7]">
                {data.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-[#f4f4f4]">
                    {data.headers.map((header, columnIndex) => {
                      const value = row[header];
                      const displayValue = value !== null && value !== undefined ? String(value) : "";

                      return (
                        <td
                          key={columnIndex}
                          title={displayValue}
                          className="max-w-56 truncate whitespace-nowrap px-3 py-2.5 text-[#3a3d40]"
                        >
                          {displayValue || <span className="italic text-[#8d969e]">null</span>}
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
          className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[#e2e2e7] bg-[#f4f4f4] text-[#505a63]"
        >
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#494fdf] border-t-transparent" />
          <span className="text-sm">Preparing your preview…</span>
        </div>
      ) : (
        <div className="flex min-h-[200px] flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#c9c9cd] bg-[#f4f4f4] px-5 text-center text-[#5c5e60]">
          <TableIcon aria-hidden="true" className="h-6 w-6" />
          <p className="max-w-xs text-sm leading-5">
            Your first rows will appear here once a file is selected.
          </p>
        </div>
      )}
    </section>
  );
}
