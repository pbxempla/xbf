"use client";

import React from "react";

export function UploadTitleSection() {
  return (
    <div className="flex shrink-0 flex-col gap-6 pb-7 sm:flex-row sm:items-end sm:justify-between lg:pb-5">
      <div>
        <h1 className="text-[36px] font-medium leading-[1.05] tracking-[-0.04em] text-[#191c1f] sm:text-[40px]">
          Upload your data
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#505a63] sm:text-base">
          Bring your facility data into Xempla to prepare it for mapping.
        </p>
      </div>

      <ol aria-label="Import progress" className="flex items-center gap-3 text-xs sm:gap-4">
        <li aria-current="step" className="flex items-center gap-2 font-semibold text-[#191c1f]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white">
            1
          </span>
          Upload
        </li>
        <li aria-hidden="true" className="h-px w-8 bg-[#e2e2e7] sm:w-12" />
        <li className="flex items-center gap-2 text-[#8d969e]">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#e2e2e7] bg-white">
            2
          </span>
          Map data
        </li>
      </ol>
    </div>
  );
}
