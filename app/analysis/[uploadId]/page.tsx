"use client";

import { WorkspaceSkeleton } from "@/components/ui/Skeleton";
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import { fetchAnalyticsStatus, submitAnalytics } from "@/lib/mapping/api";
import type { AnalyticsSubmitResult } from "@/lib/mapping/contracts";
import { UserProfile } from "@/types/auth";
import { UploadHeader } from "@/components/upload/UploadHeader";

const POLL_MS = 3000;

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${Math.max(totalSeconds, 1)} seconds`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 || minutes >= 10
    ? `${minutes} min`
    : `${minutes} min ${seconds}s`;
}

// useParams() is runtime-only data, so it must sit under a Suspense boundary.
export default function AnalysisPage() {
  return (
    <Suspense fallback={<WorkspaceSkeleton variant="dashboard" label="Loading your analysis" />}>
      <AnalysisContent />
    </Suspense>
  );
}

function AnalysisContent() {
  const routeParams = useParams<{ uploadId: string }>();
  const uploadId = routeParams.uploadId;
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<AnalyticsSubmitResult | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Seconds left, counted down locally between polls so the page feels live.
  const [remaining, setRemaining] = useState<number | null>(null);
  const finished = useRef(false);
  const [pollKey, setPollKey] = useState(0);
  const counting = remaining !== null && remaining > 0;

  useEffect(() => {
    if (!isPending && !session) router.replace("/");
  }, [isPending, session, router]);

  useEffect(() => {
    if (isPending || !session) return;
    let active = true;
    getCurrentUser()
      .then((user) => active && setProfile(user))
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401)
          router.replace("/");
        else
          setPageError(
            error instanceof Error
              ? error.message
              : "Unable to load your account.",
          );
      });
    return () => {
      active = false;
    };
  }, [isPending, session, router]);

  const apply = useCallback((next: AnalyticsSubmitResult) => {
    setStatus(next);
    setRemaining(next.remaining_seconds);
    finished.current =
      next.analysis_state === "completed" || next.analysis_state === "failed";
  }, []);

  useEffect(() => {
    if (isPending || !session) return;
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
        if (error instanceof ApiError && error.status === 404) {
          setPageError(
            "We couldn't find this analysis. It may belong to another account.",
          );
          return;
        }
        setPageError(
          error instanceof Error
            ? error.message
            : "Unable to check the analysis.",
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
  }, [isPending, session, uploadId, apply, pollKey]);

  useEffect(() => {
    if (!counting) return;
    const id = setInterval(
      () => setRemaining((value) => (value && value > 0 ? value - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [counting]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      apply(await submitAnalytics(uploadId));
      setPageError(null);
      setPollKey((key) => key + 1); // restart polling
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to retry.");
    } finally {
      setRetrying(false);
    }
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.replace("/");
  };

  if (isPending || (session && !profile && !pageError)) {
    return (
      <WorkspaceSkeleton variant="dashboard" label="Loading your analysis" />
    );
  }
  if (!session) return null;
  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-app-canvas px-6 text-center">
        <p role="alert" className="max-w-md text-sm text-[#8b0000]">
          {pageError}
        </p>
      </main>
    );
  }

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

  return (
    <div className="flex min-h-screen w-full flex-col bg-app-canvas text-app-ink">
      <UploadHeader
        userEmail={profile.email}
        userName={profile.full_name || undefined}
        creditBalance={profile.credit_balance}
        onLogout={handleLogout}
      />
      <main className="flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section
          aria-label="Analysis progress"
          className="w-full rounded-3xl bg-white p-6 sm:p-8"
        >
          {!status && !pageError && (
            <div
              role="status"
              aria-label="Loading analysis"
              className="space-y-4"
            >
              <div className="h-6 w-2/3 animate-pulse rounded bg-app-canvas" />
              <div className="h-4 w-full animate-pulse rounded bg-app-canvas" />
              <div className="h-3 w-full animate-pulse rounded-full bg-app-canvas" />
            </div>
          )}

          {pageError && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {pageError}
            </p>
          )}

          {status && state === "completed" && (
            <div className="flex flex-col gap-4">
              <CheckCircle2
                aria-hidden="true"
                className="h-10 w-10 text-[#00a87e]"
              />
              <h2 className="text-2xl font-medium tracking-tight">
                Your analysis is ready
              </h2>
              <p className="text-sm leading-6 text-app-muted">
                We finished analysing {fileLabel}. We’ve also emailed you at{" "}
                {profile.email}.
              </p>
            </div>
          )}

          {status && state === "failed" && (
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-medium tracking-tight">
                Some rows couldn’t be sent
              </h2>
              <p className="text-sm leading-6 text-app-muted">
                {status.failed} of {status.total} work orders failed to reach
                the engine. Retrying sends only those.
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

          {status &&
            (state === "sending" ||
              state === "analysing" ||
              state === "not_started") && (
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <Loader2
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin text-app-accent"
                  />
                  <h2 className="text-2xl font-medium tracking-tight">
                    {state === "sending"
                      ? "Sending your work orders…"
                      : "Analysing your data…"}
                  </h2>
                </div>

                {state === "sending" ? (
                  <p className="text-sm leading-6 text-app-muted">
                    {(status.submitted + status.failed).toLocaleString()} of{" "}
                    {status.total.toLocaleString()} work orders sent.
                  </p>
                ) : (
                  <p className="text-sm leading-6 text-app-muted">
                    {remaining !== null && remaining > 0
                      ? `This will take about ${formatDuration(remaining)}.`
                      : "Almost done…"}{" "}
                    {status.total.toLocaleString()} work orders from {fileLabel}
                    .
                  </p>
                )}

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
                {status.credits_charged.toLocaleString()} credit{status.credits_charged === 1 ? "" : "s"} used for this analysis.
              </p>
            ) : null}

            <div className="flex items-start gap-3 rounded-2xl bg-app-canvas p-4 text-sm leading-6 text-app-muted">
                  <Mail
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <p>
                    You can wait here or carry on with your work. It keeps
                    running without you, and we’ll email you at{" "}
                    <strong className="text-app-ink">{profile.email}</strong> as
                    soon as it’s done.
                  </p>
                </div>
              </div>
            )}

          <div className="mt-6 flex flex-col gap-3 border-t border-app-line pt-5 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-12 rounded-full bg-black px-6 text-sm font-semibold text-white"
            >
              Go to dashboard
            </button>
            <button
              type="button"
              onClick={() => router.push("/upload")}
              className="h-12 rounded-full border border-app-line px-6 text-sm font-semibold text-app-ink"
            >
              Upload another file
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
