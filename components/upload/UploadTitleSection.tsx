"use client";

import React from "react";

export function UploadTitleSection() {
  return (
    <div className="shrink-0 w-full flex items-start justify-between pb-3 sm:pb-4 pt-1 z-10">
      {/* Title & Subtitle on Upper Left */}
      <div className="flex flex-col gap-1 max-w-xl">
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-[#101744] tracking-tight leading-tight">
          Upload Your Data
        </h1>
        <p className="text-xs sm:text-sm text-[#64749A] font-normal">
          Import your dataset to start mapping and processing in Xempla.
        </p>
      </div>
    </div>
  );
}
