"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, FileText } from "lucide-react";
import { fetchAnalysisHistory } from "@/lib/mapping/api";
import type { AnalysisHistoryItem } from "@/lib/mapping/contracts";

const PAGE_SIZE = 25;

const STATE: Record<AnalysisHistoryItem["state"], { label: string; tone: string }> = {
  completed: { label: "Completed", tone: "bg-[#00a87e]/10 text-[#006400]" },
  sending: { label: "In progress", tone: "bg-[#ec7e00]/10 text-[#8a4a00]" },
  analysing: { label: "In progress", tone: "bg-[#ec7e00]/10 text-[#8a4a00]" },
  not_started: { label: "Starting", tone: "bg-app-canvas text-app-muted" },
  failed: { label: "Needs attention", tone: "bg-[#e23b4a]/10 text-[#8b0000]" },
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable: the id stays visible and selectable */
    }
  };
  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={`Copy analysis ID ${id}`}
      aria-label={`Copy analysis ID ${id}`}
      className="inline-flex items-center gap-1.5 rounded-full bg-app-canvas px-2.5 py-1 font-mono text-xs text-app-ink transition-colors hover:bg-app-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
    >
      {id.slice(0, 8)}
      {copied ? (
        <Check aria-hidden="true" className="h-3 w-3 text-[#006400]" />
      ) : (
        <Copy aria-hidden="true" className="h-3 w-3 text-app-muted" />
      )}
      <span role="status" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}

function Row({ item }: { item: AnalysisHistoryItem }) {
  const state = STATE[item.state];
  const done = item.state === "completed";
  return (
    <li className="flex flex-col gap-4 rounded-3xl bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-app-canvas text-app-ink"
        >
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium tracking-tight">{item.file_name}</h3>
          <p className="mt-0.5 text-sm text-app-muted">
            {done && item.completed_at
              ? `Completed ${formatDate(item.completed_at)}`
              : `Started ${formatDate(item.started_at)}`}
            {` · ${item.valid_rows.toLocaleString()} of ${item.total_rows.toLocaleString()} rows`}
            {item.credits_charged ? ` · ${item.credits_charged.toLocaleString()} credits` : ""}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${state.tone}`}>
              {state.label}
            </span>
            <span className="text-xs text-app-muted">Analysis ID</span>
            <CopyId id={item.analysis_id} />
          </div>
        </div>
      </div>

      <Link
        href={done ? `/reports/${encodeURIComponent(item.upload_id)}` : "/dashboard"}
        className={`inline-flex h-11 shrink-0 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent ${
          done
            ? "bg-black text-white hover:bg-app-ink"
            : "border border-black hover:bg-app-canvas"
        }`}
      >
        {done ? "View report" : "View progress"}
      </Link>
    </li>
  );
}

/** Every analysis the signed-in user has run, newest first, each with its own id. */
export function HistoryList({ enabled }: { enabled: boolean }) {
  const [items, setItems] = useState<AnalysisHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchAnalysisHistory(PAGE_SIZE, 0)
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setTotal(page.total);
        setStatus("ready");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load your history.");
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await fetchAnalysisHistory(PAGE_SIZE, items.length);
      setItems((current) => [...current, ...page.items]);
      setTotal(page.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load more.");
    } finally {
      setLoadingMore(false);
    }
  };

  if (status === "loading") {
    return (
      <div role="status" aria-label="Loading history" className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-3xl bg-white" />
        ))}
      </div>
    );
  }
  if (status === "error") {
    return (
      <p role="alert" className="rounded-3xl bg-white p-6 text-sm text-[#8b0000]">
        {error}
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <section className="rounded-3xl bg-white p-8 text-center">
        <h2 className="text-lg font-medium tracking-tight">No analyses yet</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-app-muted">
          Every file you analyse is listed here with its report. Upload a work-order export to
          create your first one.
        </p>
        <Link
          href="/upload"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-sm font-semibold text-white hover:bg-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
        >
          Upload data
        </Link>
      </section>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-app-muted">
        {total.toLocaleString()} {total === 1 ? "analysis" : "analyses"}
      </p>
      <ul className="space-y-3">
        {items.map((item) => (
          <Row key={item.analysis_id} item={item} />
        ))}
      </ul>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-[#8b0000]">
          {error}
        </p>
      ) : null}
      {items.length < total ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="h-11 rounded-full border border-black px-6 text-sm font-semibold transition-colors hover:bg-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
          >
            {loadingMore ? "Loading…" : "Show more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
