"use client";

import React, { useEffect, useState } from "react";

/** Shimmer base shared by every skeleton block. Text stays transparent so real
 *  font classes give the placeholder its exact size. */
export const shimmer =
  "animate-shimmer rounded-sm bg-linear-to-r from-app-line via-app-surface to-app-line bg-size-[200%_100%] text-transparent select-none";

/** A plain shimmering block; give it its own size and radius. */
const block =
  "animate-shimmer bg-linear-to-r from-app-line via-app-surface to-app-line bg-size-[200%_100%]";

/** Returns true only after `ms`, so fast loads never flash a skeleton. */
export function useDelayedReveal(ms = 200): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return show;
}

type WorkspaceVariant = "dashboard" | "upload" | "profile" | "reports" | "mapping";

const SIDEBAR_ITEMS = 5;

/** Header and sidebar are static chrome, so they render immediately. */
function ChromeSkeleton({ titled }: { titled: boolean }) {
  return (
    <>
      <div aria-hidden="true" className="px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex shrink-0 justify-center md:w-[60px]">
            <div className={`size-7 rounded-md ${block}`} />
          </div>
          {titled ? (
            <div className={`h-7 w-56 rounded-md ${block}`} />
          ) : null}
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className={`h-11 w-28 rounded-full ${block}`} />
            <div className={`hidden size-11 rounded-full sm:block ${block}`} />
            <div className={`hidden size-11 rounded-full sm:block ${block}`} />
            <div className={`size-11 rounded-full ${block}`} />
          </div>
        </div>
      </div>
    </>
  );
}

function Card({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-3xl bg-white ${className}`}>{children}</div>;
}

function Lines({ widths }: { widths: string[] }) {
  return (
    <div className="space-y-3">
      {widths.map((width, i) => (
        <div key={i} className={`h-3.5 rounded ${block}`} style={{ width }} />
      ))}
    </div>
  );
}

function DashboardBody() {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="p-5">
            <div className={`h-3.5 w-24 rounded ${block}`} />
            <div className={`mt-3 h-8 w-28 rounded ${block}`} />
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <div className={`h-5 w-40 rounded ${block}`} />
        <div className={`mt-2 h-3.5 w-64 rounded ${block}`} />
      </Card>
      <Card className="p-6">
        <div className={`h-5 w-32 rounded ${block}`} />
        <div className={`mt-2 h-3.5 w-72 rounded ${block}`} />
        <div className={`mt-5 h-36 rounded-2xl ${block}`} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-32 rounded-2xl ${block}`} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function UploadBody() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-4 sm:mb-5">
        <div className={`h-8 w-56 rounded-md ${block}`} />
        <div className={`mt-3 h-3.5 w-72 rounded ${block}`} />
      </div>
      <Card className="min-h-[280px] flex-1 border border-dashed border-app-line sm:min-h-[320px] lg:min-h-[360px]">
        <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-4 p-8">
          <div className={`size-14 rounded-xl ${block}`} />
          <div className={`h-6 w-64 rounded ${block}`} />
          <div className={`h-3.5 w-48 rounded ${block}`} />
          <div className="mt-2 flex gap-3">
            <div className={`h-12 w-36 rounded-full ${block}`} />
            <div className={`h-12 w-36 rounded-full ${block}`} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ProfileBody() {
  return (
    <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
      <Card className="flex flex-col items-center gap-3 p-6 pt-8 sm:p-8">
        <div className={`size-24 rounded-full ${block}`} />
        <div className={`h-7 w-44 rounded ${block}`} />
        <div className={`h-3.5 w-52 rounded ${block}`} />
        <div className="my-3 h-px w-full bg-app-line" />
        <div className="grid w-full grid-cols-2 gap-x-6 gap-y-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className={`h-3 w-16 rounded ${block}`} />
              <div className={`mt-2 h-4 w-28 rounded ${block}`} />
            </div>
          ))}
        </div>
      </Card>
      <div aria-hidden="true" className="hidden lg:block" />
    </div>
  );
}

function ReportsBody() {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <Card className="p-6 sm:p-8">
        <div className={`h-3.5 w-48 rounded ${block}`} />
        <div className={`mt-3 h-8 w-80 max-w-full rounded ${block}`} />
        <div className={`mt-3 h-3.5 w-64 rounded ${block}`} />
      </Card>
      <Card className="p-6 sm:p-8">
        <div className={`h-5 w-24 rounded ${block}`} />
        <div className="mt-4">
          <Lines widths={["90%", "75%", "82%", "60%"]} />
        </div>
      </Card>
      {[0, 1].map((i) => (
        <Card key={i} className="p-6">
          <div className={`h-5 w-36 rounded ${block}`} />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className={`h-14 rounded-xl ${block}`} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MappingBody() {
  return (
    <>
      <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className={`h-8 w-72 max-w-full rounded-md ${block}`} />
          <div className={`mt-3 h-3.5 w-64 rounded ${block}`} />
        </div>
        <div className="flex items-center gap-3">
          <div className={`size-7 rounded-full ${block}`} />
          <div className={`h-3 w-20 rounded ${block}`} />
          <div className={`size-7 rounded-full ${block}`} />
          <div className={`h-3 w-20 rounded ${block}`} />
        </div>
      </div>
      <Card className="flex flex-col gap-6 p-4 sm:p-6">
        <div className="flex items-baseline justify-between border-b border-app-line pb-4">
          <div className={`h-4 w-40 rounded ${block}`} />
          <div className={`h-3 w-32 rounded ${block}`} />
        </div>
        <MappingRowsSkeleton />
      </Card>
    </>
  );
}

/** Full-page placeholder that mirrors the real page shell: header, sidebar and the page's own
 *  cards. The mapping page has no sidebar, so its placeholder has none either. */
export function WorkspaceSkeleton({
  label = "Loading your workspace",
  variant = "upload",
}: {
  label?: string;
  variant?: WorkspaceVariant;
}) {
  const show = useDelayedReveal();
  const sidebar = variant !== "mapping";
  const titled = variant === "dashboard" || variant === "profile" || variant === "reports";

  return (
    <div className="min-h-screen bg-app-canvas" aria-busy="true">
      <span role="status" className="sr-only">{label}</span>
      <ChromeSkeleton titled={titled} />
      <div
        className={`flex gap-4 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 ${
          sidebar ? "min-h-[calc(100vh-76px)]" : ""
        }`}
      >
        {sidebar ? <ChromeSidebar /> : null}
        <main aria-hidden="true" className="flex min-w-0 flex-1 flex-col">
          {show && variant === "dashboard" ? <DashboardBody /> : null}
          {show && variant === "upload" ? <UploadBody /> : null}
          {show && variant === "profile" ? <ProfileBody /> : null}
          {show && variant === "reports" ? <ReportsBody /> : null}
          {show && variant === "mapping" ? <MappingBody /> : null}
        </main>
      </div>
    </div>
  );
}

function ChromeSidebar() {
  return (
    <aside
      aria-hidden="true"
      className="sticky top-[76px] hidden h-[calc(100vh-76px-1.5rem)] w-52 shrink-0 self-start rounded-[30px] bg-white p-2 md:block"
    >
      <div className="flex h-full flex-col gap-3">
        {Array.from({ length: SIDEBAR_ITEMS }, (_, i) => (
          <div key={i} className={`h-11 rounded-full ${block}`} />
        ))}
        <div className={`mt-auto h-11 rounded-full ${block}`} />
      </div>
    </aside>
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
