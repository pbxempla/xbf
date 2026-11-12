"use client";

import React from "react";
import { Trash2, FileText, UploadCloud } from "lucide-react";
import { ParsedFileData } from "@/types/upload";

interface UploadedFileCardProps {
  data: ParsedFileData | null;
  onRemove: () => void;
  disabled?: boolean;
}

export function UploadedFileCard({ data, onRemove, disabled }: UploadedFileCardProps) {
  const isExcel = data && (data.fileType === "xls" || data.fileType === "xlsx");

  return (
    <div className="shrink-0 w-full flex flex-col">
      <h3 className="text-xs font-bold text-[#101744] mb-1.5">
        Uploaded File
      </h3>

      {data ? (
        <div className="w-full bg-[#F8F7FF] border border-[#ECE8FF] rounded-xl p-2.5 sm:p-3 flex items-center justify-between transition-all">
          <div className="flex items-center gap-3 min-w-0">
            {/* File Icon */}
            {isExcel ? (
              <div className="w-9 h-9 rounded-lg bg-linear-to-br from-[#107C41] to-[#0A5C2F] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                X
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0 text-indigo-600 shadow-2xs">
                <FileText className="w-4.5 h-4.5 stroke-2" />
              </div>
            )}

            {/* File Details */}
            <div className="min-w-0 flex flex-col">
              <span className="text-xs font-semibold text-[#101744] truncate">
                {data.fileName}
              </span>
              <span className="text-[11px] text-[#64749A] mt-0.5">
                {data.formattedSize} • {data.rowCount.toLocaleString()} rows • {data.columnCount} columns
              </span>
            </div>
          </div>

          {/* Delete Action Button */}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label="Remove uploaded file"
            className="p-1.5 text-[#64749A] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
          >
            <Trash2 className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>
      ) : (
        <div className="w-full bg-[#F8F7FF] border border-dashed border-[#DDD7FE] rounded-xl p-3 flex items-center gap-3 text-[#64749A]">
          <UploadCloud className="w-4.5 h-4.5 stroke-[1.6] text-indigo-400 shrink-0" />
          <span className="text-xs">No file selected yet. Select or drop a dataset on the left.</span>
        </div>
      )}
    </div>
  );
}
