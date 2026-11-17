"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MappingFieldCombobox } from "@/components/mapping/MappingFieldCombobox";
import {
  ConflictBanner,
  RequiredFieldsPanel,
  ReviewList,
  StatusBadge,
} from "@/components/mapping/MappingReview";
import { UploadHeader } from "@/components/upload/UploadHeader";
import { UploadTitleSection } from "@/components/upload/UploadTitleSection";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import {
  confirmMapping,
  getAiConsent,
  getAnalysisStatus,
  grantAiConsent,
  prepareMapping,
  requestJevSuggestions,
  startAnalysis,
  submitAnalytics,
  withdrawAiConsent,
} from "@/lib/mapping/api";
import { CANONICAL_FIELD_LABELS } from "@/lib/mapping/contracts";
import type { CanonicalWorkOrderField } from "@/lib/mapping/contracts";
import {
  createMappingController,
  displayCategory,
  holderOf,
  readUploadId,
  validate,
} from "@/lib/mapping/review";
import { UserProfile } from "@/types/auth";

const DATASET_KEY = "xempla_current_dataset";

interface CachedDatasetInfo {
  fileName: string;
  formattedSize: string;
}

function readStoredRaw(): string | null {
  try {
    return sessionStorage.getItem(DATASET_KEY);
  } catch {
    return null;
  }
}

/**
 * The upload screen's stored dataset as an external store. It is re-read on browser
 * back/forward (bfcache `pageshow`), tab focus/visibility and cross-tab storage events, so
 * the page never keeps showing a previous upload.
 */
function subscribeDataset(onChange: () => void) {
  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };
  window.addEventListener("pageshow", onChange);
  window.addEventListener("focus", onChange);
  window.addEventListener("storage", onChange);
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    window.removeEventListener("pageshow", onChange);
    window.removeEventListener("focus", onChange);
    window.removeEventListener("storage", onChange);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
const subscribeNothing = () => () => {};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const secondaryButton =
  "min-h-11 rounded-lg border border-[#737b82] bg-white px-4 text-sm font-semibold text-app-ink transition-colors hover:bg-app-canvas active:bg-app-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50";
const primaryButton =
  "min-h-11 rounded-lg bg-app-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-app-accent-strong active:bg-[#204d9c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50";

export default function MappingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const hydrated = useSyncExternalStore(subscribeNothing, () => true, () => false);
  const rawDataset = useSyncExternalStore(subscribeDataset, readStoredRaw, () => null);
  const dataset = useMemo<CachedDatasetInfo | null>(() => {
    try {
      return rawDataset ? (JSON.parse(rawDataset) as CachedDatasetInfo) : null;
    } catch {
      return null;
    }
  }, [rawDataset]);

  // All mapping workflow logic (and its tests) lives in lib/mapping/review.ts.
  const [controller] = useState(() =>
    createMappingController({
      prepareMapping,
      requestJevSuggestions,
      confirmMapping,
      submitAnalytics,
      getAiConsent,
      grantAiConsent,
      withdrawAiConsent,
      startAnalysis,
      getAnalysisStatus,
    }),
  );
  const view = useSyncExternalStore(controller.subscribe, controller.getState, controller.getState);
  const loadedFor = useRef<string | null>(null);

  // A different stored upload id resets all mapping state and invalidates in-flight work.
  const storedUploadId = hydrated ? readUploadId(rawDataset) : null;
  useEffect(() => {
    if (hydrated) controller.setUpload(storedUploadId);
  }, [controller, hydrated, storedUploadId]);

  useEffect(() => {
    if (!isPending && !session) router.replace("/");
  }, [isPending, session, router]);

  useEffect(() => {
    if (isPending || !session) return;
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (active) setProfile(user);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/");
          return;
        }
        setPageError(getErrorMessage(error, "Unable to load your account profile."));
      });
    return () => {
      active = false;
    };
  }, [isPending, profileRetryCount, session, router]);

  // Load the backend proposal once per upload. This never calls the AI provider.
  useEffect(() => {
    if (isPending || !session || !view.uploadId) return;
    if (loadedFor.current === view.uploadId) return;
    loadedFor.current = view.uploadId;
    void controller.load();
  }, [controller, isPending, session, view.uploadId]);

  /** Refuse to act on a stale page: the stored upload must still be the one on screen. */
  const uploadStillCurrent = useCallback(() => {
    const current = readUploadId(readStoredRaw());
    if (current === controller.getState().uploadId) return true;
    controller.setUpload(current);
    return false;
  }, [controller]);

  const handleLogout = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message || "Unable to sign out.");
      router.replace("/");
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to sign out."));
    }
  };

  const retryLoad = () => {
    loadedFor.current = view.uploadId;
    void controller.load();
  };

  if (isPending || !hydrated || (session && !profile && !pageError)) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-app-canvas">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-app-accent border-t-transparent" />
        <p role="status" className="text-sm text-app-muted">Loading mapping workspace…</p>
      </div>
    );
  }
  if (!session) return null;
  if (pageError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-app-canvas px-6 text-center">
        <p role="alert" className="max-w-md text-sm leading-6 text-[#8b0000]">{pageError}</p>
        <button
          type="button"
          onClick={() => {
            setPageError(null);
            setProfileRetryCount((count) => count + 1);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-app-ink px-5 text-sm font-semibold text-white transition-colors hover:bg-[#30363b] active:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
        >
          Retry
        </button>
      </main>
    );
  }
  if (!profile) return null;

  const { proposal, review, phase, ai } = view;
  const isConfirmed = phase === "confirmed";
  const locked = phase !== "ready";
  const issues = proposal ? validate(proposal, review) : [];
  const canConfirm = phase === "ready" && issues.length === 0;

  // The only entry points to the AI provider, both user clicks. The backend decides whether
  // consent is active (a stored, versioned, server-checked record).
  const handleRequestSuggestions = () => {
    if (!uploadStillCurrent()) return;
    void controller.startSuggestions();
  };
  const handleAgreeAndRequest = () => {
    if (!uploadStillCurrent()) return;
    void controller.agreeAndRequest();
  };
  const handleConfirm = () => {
    if (!uploadStillCurrent()) return;
    void controller.confirm();
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-app-canvas text-app-ink">
      <UploadHeader
        userEmail={profile.email}
        userName={profile.full_name || undefined}
        creditBalance={profile.credit_balance}
        onLogout={handleLogout}
      />
      <main className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <UploadTitleSection
          currentStep="mapping"
          title="Map work-order columns"
          description="Facility ID and work order ID are required."
        />

        {phase === "no_upload" ? (
          <div className="rounded-2xl border border-dashed border-app-line bg-app-surface p-8 text-center">
            <p className="text-sm text-app-muted">Upload a file to start mapping its columns.</p>
            <Link href="/upload" className={`${primaryButton} mt-4 inline-flex items-center justify-center`}>
              Upload a file
            </Link>
          </div>
        ) : (
          <section className="flex flex-col gap-6 rounded-2xl border border-app-line bg-app-surface p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-1 border-b border-app-line pb-4 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 title={dataset?.fileName} className="truncate text-sm font-semibold text-app-ink">
                {dataset?.fileName ?? "Uploaded file"}
              </h2>
              {proposal && (
                <p className="text-xs text-app-muted">
                  {proposal.total_rows.toLocaleString()} rows · {proposal.columns.length} columns
                </p>
              )}
            </div>

            {phase === "loading" && (
              <p role="status" className="text-sm text-app-muted">Preparing column matches…</p>
            )}

            {phase === "error" && (
              <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <p>{view.loadError}</p>
                <button type="button" onClick={retryLoad} className={secondaryButton}>
                  Retry mapping
                </button>
              </div>
            )}

            {proposal && proposal.columns.length === 0 && phase !== "loading" && (
              <p role="status" className="text-sm text-app-muted">
                No columns were found in this file. Go back and upload a different file.
              </p>
            )}

            {proposal && proposal.columns.length > 0 && (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-app-ink">Match columns</h2>
                    {(ai.mode === "manual" ||
                      (ai.mode === "auto" && ai.status === "idle" && ai.consent?.is_active === false)) && (
                      <button
                        type="button"
                        onClick={handleRequestSuggestions}
                        disabled={
                          locked ||
                          ai.status === "checking" ||
                          ai.status === "requesting" ||
                          ai.status === "analysing" ||
                          ai.status === "consent"
                        }
                        className={secondaryButton}
                      >
                        {ai.mode === "auto"
                          ? "Turn on AI analysis"
                          : ai.attempted
                            ? "Get AI suggestions again"
                            : "Get AI suggestions"}
                      </button>
                    )}
                  </div>

                  {ai.status === "consent" && (
                    <div
                      role="region"
                      aria-label="AI suggestion disclosure"
                      className="rounded-xl border border-app-line bg-app-canvas p-4 text-sm text-app-ink"
                    >
                      <p className="font-semibold">Allow external AI processing for your account?</p>
                      <p className="mt-2 text-xs leading-5 text-app-muted">
                        {ai.consent?.disclosure_text}
                      </p>
                      {ai.error && (
                        <p role="alert" className="mt-2 text-xs text-red-800">{ai.error}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-3">
                        <button type="button" onClick={handleAgreeAndRequest} className={primaryButton}>
                          Agree and get suggestions
                        </button>
                        <button type="button" onClick={() => controller.cancelConsent()} className={secondaryButton}>
                          Not now
                        </button>
                      </div>
                    </div>
                  )}

                  <p role="status" className="text-xs text-app-muted">
                    {ai.status === "analysing"
                      ? "AI is analysing your columns in the background. Keep mapping; suggestions will appear here."
                      : ai.status === "checking"
                      ? "Checking your AI consent…"
                      : ai.status === "requesting"
                      ? "Finding matches for unmatched columns…"
                      : ai.status === "error"
                        ? "AI suggestions are unavailable. You can still map every column manually."
                        : ai.status === "done"
                          ? "AI suggestions are ready. Accept or reject each one; nothing is applied automatically."
                          : ai.mode === "auto"
                            ? "AI analysis runs automatically once you have allowed it. Nothing is applied without your review."
                            : "AI suggestions are optional and are only requested when you ask for them."}
                  </p>
                  {ai.consent?.is_active && (
                    <p className="text-xs text-app-muted">
                      External AI processing is allowed for your account.{" "}
                      <button
                        type="button"
                        onClick={() => void controller.withdrawConsent()}
                        className="font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
                      >
                        Withdraw permission
                      </button>
                    </p>
                  )}
                  {ai.mode === "auto" && ai.status === "error" && !ai.needsAcknowledgement && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (uploadStillCurrent()) void controller.retryAnalysis();
                        }}
                        className={secondaryButton}
                      >
                        Try AI analysis again
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (uploadStillCurrent()) void controller.refreshAnalysis();
                        }}
                        className={secondaryButton}
                      >
                        Check status
                      </button>
                    </div>
                  )}
                  {ai.needsAcknowledgement && (
                    <button
                      type="button"
                      onClick={() => {
                        if (uploadStillCurrent()) void controller.retryAcknowledged();
                      }}
                      className={secondaryButton}
                    >
                      Retry anyway (the earlier request may already have been billed)
                    </button>
                  )}
                  {ai.status === "error" && ai.error && (
                    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {ai.error}
                    </p>
                  )}
                  {ai.status === "done" && ai.withheld.length > 0 && (
                    <p className="text-xs text-app-muted">
                      {ai.withheld.length} AI suggestion{ai.withheld.length === 1 ? " was" : "s were"} not
                      offered because the backend rules do not allow guessing them.
                    </p>
                  )}
                </div>

                {view.conflict && (
                  <ConflictBanner
                    conflict={view.conflict}
                    columns={proposal.columns}
                    onMove={() => controller.resolveConflictByMoving()}
                    onDismiss={() => controller.dismissConflict()}
                  />
                )}

                <RequiredFieldsPanel
                  proposal={proposal}
                  review={review}
                  disabled={locked}
                  onAccept={(target) => controller.acceptSuggestion(target)}
                  onReject={(target) => controller.rejectSuggestion(target)}
                  onPick={(target, columnId) => controller.assign(target, columnId)}
                />
                <ReviewList
                  proposal={proposal}
                  review={review}
                  disabled={locked}
                  onAccept={(target) => controller.acceptSuggestion(target)}
                  onReject={(target) => controller.rejectSuggestion(target)}
                  onPick={(target, columnId) => controller.assign(target, columnId)}
                />

                <section aria-labelledby="source-columns-heading">
                  <h2 id="source-columns-heading" className="text-base font-semibold text-app-ink">
                    Columns in your file
                  </h2>
                  <ul className="mt-3 grid gap-3 lg:grid-cols-2">
                    {proposal.columns.map((column) => {
                      const assigned = holderOf(review, column.source_column_id);
                      const samples = column.sample_values.filter(
                        (value): value is string => Boolean(value?.trim()),
                      );
                      return (
                        <li
                          key={column.source_column_id}
                          data-column-id={column.source_column_id}
                          className="min-w-0 rounded-xl border border-app-line bg-white p-4"
                        >
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="break-words text-sm font-semibold text-app-ink">
                              {column.index + 1}. {column.name || "(blank header)"}
                            </h3>
                            <span className="shrink-0 rounded-full bg-app-canvas px-2.5 py-1 text-xs font-medium text-app-muted">
                              {column.detected_type}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {samples.length > 0 ? (
                              samples.map((sample, index) => (
                                <span
                                  key={`${column.source_column_id}-sample-${index}`}
                                  className="max-w-full break-all rounded-md border border-app-line bg-app-canvas px-2 py-1 text-sm text-app-ink"
                                >
                                  {sample}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-app-muted">No sample values</span>
                            )}
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-3">
                            <div className="min-w-[220px] flex-1">
                              <MappingFieldCombobox
                                id={`map-${column.source_column_id}`}
                                label={`Work-order field for ${column.name || `column ${column.index + 1}`}`}
                                value={assigned as CanonicalWorkOrderField | null}
                                disabled={locked}
                                onChange={(field) => controller.assignColumn(column.source_column_id, field)}
                              />
                            </div>
                            {assigned ? (
                              <StatusBadge category={displayCategory(proposal, review, assigned)} />
                            ) : (
                              <span className="text-xs text-app-muted">Not mapped</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                {issues.length > 0 && !isConfirmed && (
                  <div role="status" aria-label="Before you can continue" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-semibold">Before you can continue</p>
                    <ul className="mt-1 list-disc pl-5">
                      {issues.map((issue, index) => (
                        <li key={`${issue.code}-${issue.target ?? ""}-${index}`}>
                          {issue.target && issue.code === "required_missing"
                            ? `${CANONICAL_FIELD_LABELS[issue.target as CanonicalWorkOrderField] ?? issue.target} must be mapped.`
                            : issue.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {view.actionError && (
                  <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {view.actionError}
                  </p>
                )}

                <div className="flex flex-col gap-3 border-t border-app-line pt-4 sm:flex-row sm:items-center sm:justify-end">
                  <Link href="/upload" className={`${secondaryButton} inline-flex items-center justify-center gap-2`}>
                    <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                    Back to upload
                  </Link>
                  {isConfirmed ? (
                    <button type="button" onClick={() => void controller.reopen()} className={secondaryButton}>
                      Edit mapping
                    </button>
                  ) : (
                    <button type="button" onClick={handleConfirm} disabled={!canConfirm} className={primaryButton}>
                      {phase === "confirming" ? "Extracting and validating…" : "Confirm mapping and extract"}
                    </button>
                  )}
                </div>
              </>
            )}

            {view.importResult && (
              <section aria-label="Import validation" className="rounded-xl border border-app-line bg-app-canvas p-4 sm:p-5">
                <h2 className="text-sm font-bold text-app-ink">Mapping confirmed</h2>
                <p role="status" className="mt-2 text-sm text-app-muted">
                  {view.importResult.valid_rows.toLocaleString()} valid · {view.importResult.invalid_rows.toLocaleString()} invalid · {view.importResult.total_rows.toLocaleString()} total
                </p>
                {view.importResult.error_preview.length > 0 && (
                  <div className="mt-3 max-h-48 overflow-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                    <ul className="space-y-1">
                      {view.importResult.error_preview.slice(0, 10).map((error, index) => (
                        <li key={`${error.row_number}-${error.field}-${index}`}>
                          Row {error.row_number}{error.field ? ` • ${error.field}` : ""}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {view.importResult.valid_rows > 0 && (
                  <button
                    type="button"
                    onClick={() => void controller.submitAnalytics()}
                    disabled={view.analytics.status === "submitting"}
                    className={`${primaryButton} mt-4`}
                  >
                    {view.analytics.status === "submitting" ? "Submitting…" : "Submit valid work orders"}
                  </button>
                )}
                {view.analytics.result && (
                  <p role="status" className="mt-3 text-sm text-app-muted">
                    {view.analytics.result.message} ({view.analytics.result.submitted} submitted, {view.analytics.result.failed} failed)
                  </p>
                )}
              </section>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

