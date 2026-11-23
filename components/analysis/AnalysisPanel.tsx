"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, Mail } from "lucide-react";
import {
  fetchAnalyticsStatus,
  fetchLatestInsights,
  MappingApiError,
  submitAnalytics,
} from "@/lib/mapping/api";
import type { AnalyticsSubmitResult } from "@/lib/mapping/contracts";
import { AnalysisResults } from "@/components/analysis/AnalysisResults";

const POLL_MS = 3000;

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.max(totalSeconds, 1)} seconds`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 || minutes >= 10
    ? `${minutes} min`
    : `${minutes} min ${seconds}s`;
}

/**
 * Collapsible "Latest analysis" card for the dashboard: progress and ETA while the engine
 * works, then the insights and per-work-order results. Renders nothing before any upload.
 */
export function AnalysisPanel({ email }: { email: string }) {
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [lookedUp, setLookedUp] = useState(false);
  const [status, setStatus] = useState<AnalyticsSubmitResult | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pollKey, setPollKey] = useState(0);
  const [open, setOpen] = useState(true);
  const finished = useRef(false);
  const counting = remaining !== null && remaining > 0;

  useEffect(() => {
    let active = true;
    fetchLatestInsights()
      .then((result) => {
        if (active) setUploadId(result.upload_id);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (!(reason instanceof MappingApiError && reason.status === 404))
          setPageError(
            reason instanceof Error ? reason.message : "Unable to load your analysis.",
          );
      })
      .finally(() => {
        if (active) setLookedUp(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const apply = useCallback((next: AnalyticsSubmitResult) => {
    setStatus(next);
    setRemaining(next.remaining_seconds);
    finished.current =
      next.analysis_state === "completed" || next.analysis_state === "failed";
  }, []);

  useEffect(() => {
    if (!uploadId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const next = await fetchAnalyticsStatus(uploadId);
        if (!active) return;
        apply(next);
        setPageError(null);
      } catch (error) {
        if (!active) return;
        setPageError(
          error instanceof Error ? error.message : "Unable to check the analysis.",
        );
      }
      if (active && !finished.current)
        timer = setTimeout(() => void tick(), POLL_MS);
    };
    void tick();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [uploadId, apply, pollKey]);

  useEffect(() => {
    if (!counting) return;
    const id = setInterval(
      () => setRemaining((value) => (value && value > 0 ? value - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [counting]);

  const handleRetry = async () => {
    if (!uploadId) return;
    setRetrying(true);
    try {
      apply(await submitAnalytics(uploadId));
      setPageError(null);
      setPollKey((key) => key + 1);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to retry.");
    } finally {
      setRetrying(false);
    }
  };

  if (!lookedUp) {
    return (
      <div
        role="status"
        aria-label="Loading latest analysis"
        className="mt-4 h-20 animate-pulse rounded-3xl bg-white"
      />
    );
  }
  if (!uploadId && !pageError) return null;

  const state = status?.analysis_state;
  const eta = status?.eta_seconds ?? null;
  const elapsedShare =
    eta && remaining !== null
      ? Math.min(100, Math.max(4, Math.round(((eta - remaining) / eta) * 100)))
      : 4;
  const sendShare =
    status && status.total > 0
      ? Math.round(((status.submitted + status.failed) / status.total) * 100)
      : 0;
  const fileLabel = status?.file_name ? `“${status.file_name}”` : "your file";
  const running =
    state === "sending" || state === "analysing" || state === "not_started";
  const summary =
    state === "completed"
      ? "Ready"
      : state === "failed"
        ? "Needs attention"
        : status
          ? remaining !== null && remaining > 0
            ? `About ${formatDuration(remaining)} left`
            : "Almost done"
          : "Checking…";

  return (
    <section
      aria-label="Latest analysis"
      className="mt-4 rounded-3xl bg-white p-6"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="latest-analysis-body"
        className="flex w-full items-center justify-between gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-app-accent"
      >
        <span>
          <span className="block text-lg font-medium tracking-tight">
            Latest analysis
          </span>
          <span className="mt-0.5 block text-sm text-app-muted">
            {status?.file_name ?? "Your most recent upload"}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="rounded-full bg-app-canvas px-3 py-1.5 text-xs font-semibold">
            {summary}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 text-app-muted transition-transform motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </span>
      </button>

      {open && (
        <div id="latest-analysis-body" className="mt-5">
          {pageError && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {pageError}
            </p>
          )}

          {!status && !pageError && (
            <div role="status" aria-label="Loading analysis" className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded bg-app-canvas" />
              <div className="h-3 w-full animate-pulse rounded-full bg-app-canvas" />
            </div>
          )}

          {status && running && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Loader2
                  aria-hidden="true"
                  className="h-5 w-5 animate-spin text-app-accent"
                />
                <h3 className="text-base font-medium">
                  {state === "sending"
                    ? "Sending your work orders…"
                    : "Analysing your data…"}
                </h3>
              </div>
              <p className="text-sm leading-6 text-app-muted">
                {state === "sending"
                  ? `${(status.submitted + status.failed).toLocaleString()} of ${status.total.toLocaleString()} work orders sent.`
                  : `${remaining !== null && remaining > 0 ? `This will take about ${formatDuration(remaining)}.` : "Almost done…"} ${status.results_ready.toLocaleString()} of ${status.total.toLocaleString()} processed so far from ${fileLabel}.`}
              </p>
              <div
                role="progressbar"
                aria-label="Analysis progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={state === "sending" ? sendShare : elapsedShare}
                className="h-3 w-full overflow-hidden rounded-full bg-app-canvas"
              >
                <div
                  className="h-full rounded-full bg-app-accent transition-all duration-1000"
                  style={{
                    width: `${state === "sending" ? sendShare : elapsedShare}%`,
                  }}
                />
              </div>
              {status.credits_charged ? (
                <p className="text-sm text-app-muted">
                  {status.credits_charged.toLocaleString()} credit
                  {status.credits_charged === 1 ? "" : "s"} used for this analysis.
                </p>
              ) : null}
              <div className="flex items-start gap-3 rounded-2xl bg-app-canvas p-4 text-sm leading-6 text-app-muted">
                <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  You can carry on with your work. It keeps running without you,
                  and we’ll email you at{" "}
                  <strong className="text-app-ink">{email}</strong> when it’s done.
                </p>
              </div>
            </div>
          )}

          {status && state === "failed" && (
            <div className="flex flex-col gap-3">
              <h3 className="text-base font-medium">Some rows couldn’t be sent</h3>
              <p className="text-sm leading-6 text-app-muted">
                {status.failed} of {status.total} work orders failed to reach the
                engine. Retrying sends only those.
              </p>
              <button
                type="button"
                onClick={() => void handleRetry()}
                disabled={retrying}
                className="h-12 self-start rounded-full bg-black px-6 text-sm font-semibold text-white disabled:opacity-60"
              >
                {retrying ? "Retrying…" : "Retry failed rows"}
              </button>
            </div>
          )}

          {status && state === "completed" && uploadId && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2
                  aria-hidden="true"
                  className="h-6 w-6 text-[#00a87e]"
                />
                <h3 className="text-base font-medium">Your analysis is ready</h3>
              </div>
              <p className="text-sm leading-6 text-app-muted">
                We finished analysing {fileLabel}. We’ve also emailed you at{" "}
                {email}.
              </p>
              <WorkOrderDetails uploadId={uploadId} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** The per-work-order table is long, so it stays closed (and unloaded) until asked for. */
function WorkOrderDetails({ uploadId }: { uploadId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-app-line">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
      >
        Work order details
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-app-muted transition-transform motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open ? (
        <div className="px-4 pb-4">
          <AnalysisResults uploadId={uploadId} />
        </div>
      ) : null}
    </div>
  );
}
