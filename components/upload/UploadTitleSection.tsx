"use client";

import React from "react";
import Link from "next/link";

interface UploadTitleSectionProps {
  currentStep?: "upload" | "mapping";
  title?: string;
  description?: string;
}

export function UploadTitleSection({
  currentStep = "upload",
  title = "Upload your data",
  description = "Upload a CSV or Excel file to map its columns.",
}: UploadTitleSectionProps) {
  const isMapping = currentStep === "mapping";

  return (
    <div className="mb-8 flex shrink-0 flex-col gap-6 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-medium leading-tight tracking-tight text-app-ink sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-app-muted">{description}</p>
      </div>

      <ol
        aria-label="Import progress"
        className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:self-center"
      >
        <li
          aria-current={isMapping ? undefined : "step"}
          className="flex items-center gap-2 font-semibold text-app-ink"
        >
          {isMapping ? (
            <Link
              href="/upload"
              className="inline-flex min-h-11 items-center gap-2 rounded-md text-app-muted underline-offset-4 transition-colors hover:text-app-ink hover:underline active:text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-app-line bg-app-surface text-app-ink">
                1
              </span>
              Upload file
            </Link>
          ) : (
            <>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app-ink text-white">
                1
              </span>
              Upload file
            </>
          )}
        </li>
        <li aria-hidden="true" className="h-px w-6 bg-app-line sm:w-10" />
        <li aria-current={isMapping ? "step" : undefined} className="flex items-center gap-2">
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              isMapping
                ? "bg-app-ink font-semibold text-white"
                : "border border-app-line bg-app-surface text-app-muted"
            }`}
          >
            2
          </span>
          <span className={isMapping ? "font-semibold text-app-ink" : "text-app-muted"}>
            Map columns
          </span>
        </li>
      </ol>
    </div>
  );
}
