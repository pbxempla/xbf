"use client";

import React from "react";

export function FolderUploadIllustration({ className = "" }: { className?: string }) {
  return (
    <div className={`relative w-64 h-44 sm:w-72 sm:h-48 flex items-center justify-center select-none pointer-events-none ${className}`}>
      {/* Soft purple radial glow behind the folder */}
      <div className="absolute w-44 h-32 bg-indigo-400/25 blur-2xl rounded-full -bottom-2" />

      {/* Sparkles and accent particles */}
      <span className="absolute top-2 left-6 text-indigo-300 text-xs animate-pulse">✦</span>
      <span className="absolute top-6 right-8 text-indigo-400 text-sm">✦</span>
      <span className="absolute bottom-6 left-10 text-indigo-200 text-xs">✦</span>
      <span className="absolute bottom-4 right-12 text-indigo-300 text-[10px]">✦</span>

      {/* Left Floating Mini Document */}
      <div className="absolute -left-1 sm:left-1 top-8 w-11 h-13 sm:w-12 sm:h-14 bg-white rounded-xl shadow-md border border-indigo-100/80 -rotate-12 flex flex-col p-1.5 justify-between z-0 transition-transform duration-300 hover:-translate-y-1">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-1 bg-indigo-200 rounded-full" />
          <div className="w-full h-0.5 bg-slate-100 rounded-full" />
          <div className="w-4/5 h-0.5 bg-slate-100 rounded-full" />
        </div>
        <div className="self-end w-4 h-3 rounded bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-[7px] text-indigo-600 font-bold">
          CSV
        </div>
      </div>

      {/* Right Floating Mini Document */}
      <div className="absolute -right-1 sm:right-1 top-10 w-11 h-13 sm:w-12 sm:h-14 bg-white rounded-xl shadow-md border border-emerald-100/80 rotate-12 flex flex-col p-1.5 justify-between z-0 transition-transform duration-300 hover:-translate-y-1">
        <div className="flex flex-col gap-1">
          <div className="w-5 h-1 bg-emerald-200 rounded-full" />
          <div className="w-full h-0.5 bg-slate-100 rounded-full" />
          <div className="w-4/5 h-0.5 bg-slate-100 rounded-full" />
        </div>
        <div className="self-end w-4 h-3 rounded bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-[8px] text-emerald-700 font-black">
          X
        </div>
      </div>

      {/* Main 3D Purple Folder Composition */}
      <div className="relative z-10 w-44 h-34 sm:w-48 sm:h-36 flex items-center justify-center">
        {/* Back Folder Cover & Tab */}
        <div className="absolute top-2 w-40 h-28 sm:w-44 sm:h-30 bg-linear-to-br from-[#5A4BF5] to-[#4335E2] rounded-2xl shadow-lg border border-indigo-400/30 flex flex-col">
          {/* Tab */}
          <div className="w-16 h-3.5 bg-[#4F3FE5] rounded-t-lg -mt-2 ml-3 border-t border-indigo-300/40" />
        </div>

        {/* Papers inside Folder */}
        {/* Paper 1 (Back left) */}
        <div className="absolute top-0 left-6 w-28 h-22 sm:w-30 sm:h-24 bg-white/95 rounded-xl shadow-md border border-slate-200/80 -rotate-6 flex flex-col p-2 gap-1.5">
          <div className="w-8 h-1 bg-slate-300 rounded-full" />
          <div className="w-full h-0.5 bg-slate-100 rounded-full" />
          <div className="w-4/5 h-0.5 bg-slate-100 rounded-full" />
          <div className="w-full h-0.5 bg-slate-100 rounded-full" />
        </div>

        {/* Paper 2 (Front right) */}
        <div className="absolute top-1 right-6 w-28 h-22 sm:w-30 sm:h-24 bg-white rounded-xl shadow-md border border-slate-200/90 rotate-3 flex flex-col p-2 gap-1.5">
          <div className="w-10 h-1 bg-indigo-200 rounded-full" />
          <div className="w-full h-0.5 bg-slate-100 rounded-full" />
          <div className="w-5/6 h-0.5 bg-slate-100 rounded-full" />
          <div className="w-3/4 h-0.5 bg-slate-100 rounded-full" />
        </div>

        {/* Front Folder Flap (Angled with Inset Arrow) */}
        <div className="absolute bottom-1 w-42 h-23 sm:w-46 sm:h-25 bg-linear-to-b from-[#7261F8] via-[#614FF7] to-[#4E3CE8] rounded-2xl shadow-xl border-t border-white/35 flex items-center justify-center">
          {/* Subtle flap fold shadow */}
          <div className="absolute inset-x-0 top-0 h-1 bg-white/25 rounded-t-2xl" />

          {/* Upward Upload Arrow Icon */}
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/25 shadow-inner">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#101744"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-xs"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          </div>
        </div>

        {/* Soft shadow under front flap */}
        <div className="absolute -bottom-2 w-36 h-2 bg-indigo-950/20 blur-sm rounded-full" />
      </div>
    </div>
  );
}
