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
    <div className="flex-1 min-h-35 lg:min-h-0 flex flex-col w-full">
      <h3 className="text-xs font-bold text-[#101744] mb-1.5 shrink-0">
        Preview (First 5 Rows)
      </h3>

      {data && data.headers.length > 0 ? (
        <div className="flex-1 min-h-0 w-full border border-[#E9E5FF] rounded-xl overflow-hidden bg-white shadow-2xs flex flex-col">
          <div className="w-full flex-1 min-h-0 overflow-auto scrollbar-thin">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-[#EEF1FF] border-b border-[#E3DEFF] sticky top-0 z-10">
                  {data.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-3 py-1.5 text-[#101744] font-semibold whitespace-nowrap select-none bg-[#EEF1FF]"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F1FF]">
                {data.rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-[#F9F8FF] transition-colors"
                  >
                    {data.headers.map((header, colIdx) => {
                      const val = row[header];
                      const displayVal =
                        val !== null && val !== undefined ? String(val) : "";
                      return (
                        <td
                          key={colIdx}
                          className="px-3 py-1.5 text-[#101744] whitespace-nowrap max-w-xs truncate font-normal"
                          title={displayVal}
                        >
                          {displayVal || <span className="text-slate-300 italic">null</span>}
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
        <div className="flex-1 min-h-30 w-full border border-[#E9E5FF] rounded-xl p-6 bg-white flex flex-col items-center justify-center text-[#64749A] gap-2 shadow-2xs">
          <div className="w-5 h-5 border-2 border-[#3024D8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Parsing dataset preview...</span>
        </div>
      ) : (
        <div className="flex-1 min-h-30 w-full border border-dashed border-[#DDD7FE] rounded-xl p-4 bg-[#F8F7FF] flex flex-col items-center justify-center text-[#64749A] gap-1.5 shadow-2xs">
          <TableIcon className="w-5 h-5 stroke-[1.5] text-indigo-400" />
          <span className="text-xs">No dataset preview to display yet. Upload a CSV or Excel file to preview data.</span>
        </div>
      )}
    </div>
  );
}
