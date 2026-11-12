"use client";

import React from "react";
import { FileText } from "lucide-react";

export function SupportedFormats() {
  return (
    <div className="shrink-0 w-full bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-3.5 shadow-2xs grid grid-cols-3 divide-x divide-slate-100">
      {/* Format 1: CSV */}
      <div className="flex flex-col items-center justify-center text-center px-1 sm:px-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 border border-indigo-200/70 flex items-center justify-center text-indigo-600 mb-1 shadow-2xs">
          <FileText className="w-3.5 h-3.5 stroke-2" />
        </div>
        <span className="text-xs font-semibold text-slate-900 leading-tight">CSV</span>
        <span className="text-[10px] sm:text-[11px] text-slate-400">.csv</span>
      </div>

      {/* Format 2: Excel (XLS) */}
      <div className="flex flex-col items-center justify-center text-center px-1 sm:px-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700 font-black text-xs mb-1 shadow-2xs">
          <span className="bg-emerald-600 text-white rounded px-1 py-0.2 text-[9px] font-bold">X</span>
        </div>
        <span className="text-xs font-semibold text-slate-900 leading-tight">Excel (XLS)</span>
        <span className="text-[10px] sm:text-[11px] text-slate-400">.xls</span>
      </div>

      {/* Format 3: Excel (XLSX) */}
      <div className="flex flex-col items-center justify-center text-center px-1 sm:px-3">
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 border border-emerald-200/70 flex items-center justify-center text-emerald-700 font-black text-xs mb-1 shadow-2xs">
          <span className="bg-emerald-600 text-white rounded px-1 py-0.2 text-[9px] font-bold">X</span>
        </div>
        <span className="text-xs font-semibold text-slate-900 leading-tight">Excel (XLSX)</span>
        <span className="text-[10px] sm:text-[11px] text-slate-400">.xlsx</span>
      </div>
    </div>
  );
}
