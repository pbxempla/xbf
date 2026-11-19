"use client";

import React, { useEffect, useState } from "react";

/** Shimmer base shared by every skeleton block. Text stays transparent so real
 *  font classes give the placeholder its exact size. */
export const shimmer =
  "animate-shimmer rounded-sm bg-linear-to-r from-app-line via-app-surface to-app-line bg-size-[200%_100%] text-transparent select-none";

/** Returns true only after `ms`, so fast loads never flash a skeleton. */
export function useDelayedReveal(ms = 200): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return show;
}

type WorkspaceVariant = "dashboard" | "upload" | "mapping";

/** Full-page placeholder that mirrors the real page shell: black header bar,
 *  the page's own main padding/max-width, title block and primary container. */
export function WorkspaceSkeleton({
  label = "Loading your workspace",
  variant = "upload",
}: {
  label?: string;
  variant?: WorkspaceVariant;
}) {
  const show = useDelayedReveal();
  const mainClass =
    variant === "dashboard"
      ? "mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
      : "flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8";

  return (
    <div className="flex min-h-screen w-full flex-col bg-app-canvas" aria-busy="true">
      <span role="status" className="sr-only">{label}</span>
      {/* Header is static chrome, so it renders immediately. */}
      <div aria-hidden="true" className="flex h-16 w-full shrink-0 items-center justify-between bg-black px-4 sm:px-6 lg:px-8">
        <div className="h-6 w-28 animate-shimmer rounded-sm bg-linear-to-r from-white/10 via-white/25 to-white/10 bg-size-[200%_100%]" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-28 animate-shimmer rounded-lg bg-linear-to-r from-white/10 via-white/25 to-white/10 bg-size-[200%_100%]" />
          <div className="size-10 animate-shimmer rounded-full bg-linear-to-r from-white/10 via-white/25 to-white/10 bg-size-[200%_100%]" />
        </div>
      </div>
      {show && (
        <main aria-hidden="true" className={mainClass}>
          {variant === "dashboard" ? (
            <>
              <div className="mb-8 sm:mb-10">
                <h1 className={`w-fit text-3xl font-medium leading-tight tracking-tight sm:text-4xl ${shimmer}`}>
                  Welcome back, there.
                </h1>
              </div>
              <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:gap-14">
                <section className="rounded-2xl border border-app-line bg-app-surface p-6 sm:p-8">
                  <h2 className={`w-fit text-2xl font-medium tracking-tight ${shimmer}`}>Upload facility data</h2>
                  <p className={`mt-2 max-w-xl text-sm leading-6 ${shimmer}`}>
                    Choose a CSV or Excel file to map facility and work-order fields.
                  </p>
                  <div className={`mt-6 h-12 w-36 rounded-lg ${shimmer}`} />
                </section>
                <section>
                  <h2 className={`w-fit text-sm font-semibold ${shimmer}`}>Account details</h2>
                  <div className="mt-3 space-y-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex items-center justify-between gap-4">
                        <span className={`text-sm ${shimmer}`}>Account type</span>
                        <span className={`text-sm font-medium ${shimmer}`}>Verified</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8 flex shrink-0 flex-col gap-6 sm:mb-10 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className={`w-fit text-3xl font-medium leading-tight tracking-tight sm:text-4xl ${shimmer}`}>
                    {variant === "mapping" ? "Map work-order columns" : "Upload your data"}
                  </h1>
                  <p className={`mt-2 w-fit max-w-xl text-sm leading-6 ${shimmer}`}>
                    {variant === "mapping"
                      ? "Facility ID and work order ID are required."
                      : "Upload a CSV or Excel file to map its columns."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`size-7 rounded-full ${shimmer}`} />
                  <div className={`h-3 w-20 ${shimmer}`} />
                  <div className={`size-7 rounded-full ${shimmer}`} />
                  <div className={`h-3 w-20 ${shimmer}`} />
                </div>
              </div>
              {variant === "mapping" ? (
                <section className="flex flex-col gap-6 rounded-2xl border border-app-line bg-app-surface p-4 sm:p-6">
                  <div className="flex flex-col gap-1 border-b border-app-line pb-4 sm:flex-row sm:items-baseline sm:justify-between">
                    <h2 className={`w-fit text-sm font-semibold ${shimmer}`}>your-data-file.csv</h2>
                    <p className={`w-fit text-xs ${shimmer}`}>1,000 rows · 12 columns</p>
                  </div>
                  <MappingRowsSkeleton />
                </section>
              ) : (
                <div className="grid min-w-0 flex-1 items-stretch gap-5 lg:gap-6">
                  <div className="min-h-[280px] flex-1 animate-shimmer rounded-[20px] border border-dashed border-app-line bg-linear-to-r from-app-line via-app-surface to-app-line bg-size-[200%_100%] sm:min-h-[320px] lg:min-h-[360px]" />
                </div>
              )}
            </>
          )}
        </main>
      )}
    </div>
  );
}

/** Placeholder rows for the file preview table. */
export function PreviewTableSkeleton({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  const show = useDelayedReveal();
  return (
    <div
      aria-busy="true"
      className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-xl border border-app-line bg-app-surface lg:min-h-0"
    >
      <span role="status" className="sr-only">Preparing your preview</span>
      {show && (
        <table aria-hidden="true" className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-app-line bg-app-canvas">
              {Array.from({ length: columns }, (_, c) => (
                <th key={c} className="px-3 py-2.5 font-semibold">
                  <span className={`inline-block ${shimmer}`}>Column {c + 1}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r} className="border-b border-app-line last:border-0">
                {Array.from({ length: columns }, (_, c) => (
                  <td key={c} className="px-3 py-2.5">
                    <span className={`inline-block ${shimmer}`}>Sample value</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Placeholder for the mapping column-match list. */
export function MappingRowsSkeleton({ rows = 5 }: { rows?: number }) {
  const show = useDelayedReveal();
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <span role="status" className="sr-only">Preparing column matches</span>
      {show && (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 rounded-xl border border-app-line bg-app-surface p-3"
            >
              <p className={`text-sm font-medium ${shimmer}`}>Source column name</p>
              <div className={`h-10 w-48 rounded-lg ${shimmer}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Placeholder for the uploaded-file summary card while the file is being parsed. */
export function UploadedFileCardSkeleton() {
  const show = useDelayedReveal();
  return (
    <section aria-busy="true" className="flex w-full shrink-0 flex-col">
      <span role="status" className="sr-only">Reading your file</span>
      {show && (
        <div aria-hidden="true">
          <h3 className={`mb-2 w-fit text-sm font-semibold ${shimmer}`}>Uploaded file</h3>
          <div className="flex w-full items-center gap-3 rounded-xl border border-app-line bg-app-canvas p-3 sm:p-4">
            <div className={`size-11 shrink-0 rounded-lg ${shimmer}`} />
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`text-sm font-semibold ${shimmer}`}>your-data-file.csv</span>
              <span className={`text-xs ${shimmer}`}>1,000 rows · 12 columns · 2.4 MB</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
