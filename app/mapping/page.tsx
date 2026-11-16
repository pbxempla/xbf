"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MappingFieldCombobox } from "@/components/mapping/MappingFieldCombobox";
import { UploadHeader } from "@/components/upload/UploadHeader";
import { UploadTitleSection } from "@/components/upload/UploadTitleSection";
import { authClient } from "@/lib/auth-client";
import { ApiError, getCurrentUser } from "@/lib/api";
import {
  confirmMapping,
  prepareMapping,
  requestJevSuggestions,
  submitAnalytics,
} from "@/lib/mapping/api";
import {
  CANONICAL_FIELD_LABELS,
  CANONICAL_WORK_ORDER_FIELDS,
} from "@/lib/mapping/contracts";
import type {
  AnalyticsSubmitResult,
  CanonicalWorkOrderField,
  ImportResult,
  JevRunMetadata,
  JevSuggestion,
  MappingDecisionMetadata,
  MappingProposal,
} from "@/lib/mapping/contracts";
import { UserProfile } from "@/types/auth";

interface CachedDatasetInfo {
  fileName: string;
  fileSize: number;
  formattedSize: string;
  fileType: string;
  headers: string[];
  rowCount: number;
  columnCount: number;
  columns?: { index: number; name: string; detected_type: string }[] | null;
  sheetName?: string | null;
  backendUploadId?: string;
  backendValidationStatus?: "passed" | "warning";
  backendSecurityFindings?: string[];
}

type FieldSelections = Record<CanonicalWorkOrderField, string | null>;

function selectionsFromProposal(proposal: MappingProposal): FieldSelections {
  const mapped = new Map(
    proposal.mappings.map((mapping) => [mapping.target, mapping.source_column_id]),
  );
  return Object.fromEntries(
    CANONICAL_WORK_ORDER_FIELDS.map((field) => [field, mapped.get(field) ?? null]),
  ) as FieldSelections;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function MappingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [profileRetryCount, setProfileRetryCount] = useState(0);
  const [mappingError, setMappingError] = useState<string | null>(null);
  const [dataset] = useState<CachedDatasetInfo | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem("xempla_current_dataset");
      return stored ? (JSON.parse(stored) as CachedDatasetInfo) : null;
    } catch {
      return null;
    }
  });
  const [isLoadingMapping, setIsLoadingMapping] = useState(
    Boolean(dataset?.backendUploadId),
  );
  const [mappingRetryCount, setMappingRetryCount] = useState(0);
  const [proposal, setProposal] = useState<MappingProposal | null>(null);
  const [fieldSelections, setFieldSelections] = useState<FieldSelections | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [analyticsResult, setAnalyticsResult] = useState<AnalyticsSubmitResult | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jevSuggestions, setJevSuggestions] = useState<
    Map<CanonicalWorkOrderField, JevSuggestion>
  >(new Map());
  const [jevAttempted, setJevAttempted] = useState(false);
  const [jevUsage, setJevUsage] = useState<{
    input_tokens: number | null;
    cost: number | null;
  } | null>(null);
  const automaticJevStarted = useRef(false);

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

  useEffect(() => {
    const uploadId = dataset?.backendUploadId;
    if (isPending || !session || !uploadId) return;
    let active = true;
    prepareMapping(uploadId)
      .then((nextProposal) => {
        if (!active) return;
        setMappingError(null);
        setProposal(nextProposal);
        setFieldSelections(selectionsFromProposal(nextProposal));
      })
      .catch((error: unknown) => {
        if (active) {
          setMappingError(getErrorMessage(error, "Unable to prepare the mapping proposal."));
        }
      })
      .finally(() => {
        if (active) setIsLoadingMapping(false);
      });
    return () => {
      active = false;
    };
  }, [dataset?.backendUploadId, isPending, mappingRetryCount, session]);

  const aiEligibleFields = useMemo(
    () =>
      proposal?.mappings.filter(
        (mapping) =>
          mapping.source_column_id === null &&
          fieldSelections?.[mapping.target] === null &&
          (mapping.candidate_source_column_ids.length > 0 ||
            mapping.target === "facility_id" ||
            mapping.target === "wo_id"),
      ) ?? [],
    [fieldSelections, proposal],
  );

  const handleLogout = async () => {
    try {
      const { error } = await authClient.signOut();
      if (error) throw new Error(error.message || "Unable to sign out.");
      router.replace("/");
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to sign out."));
    }
  };

  const handleJevSuggestions = useCallback(async () => {
    if (!proposal || aiEligibleFields.length === 0) return;
    automaticJevStarted.current = true;
    setIsSuggesting(true);
    setJevAttempted(true);
    setMappingError(null);
    try {
      const result = await requestJevSuggestions(
        proposal,
        aiEligibleFields.map((mapping) => mapping.target),
      );
      setJevSuggestions((current) => {
        const next = new Map(current);
        for (const suggestion of result.suggestions) {
          next.set(suggestion.target, suggestion);
        }
        return next;
      });
      setJevUsage(result.usage);
      setFieldSelections((current) => {
        if (!current) return current;
        const next = { ...current };
        for (const suggestion of result.suggestions) {
          next[suggestion.target] = suggestion.source_column_id;
        }
        return next;
      });
    } catch (error: unknown) {
      setMappingError(getErrorMessage(error, "Jev could not suggest a mapping."));
    } finally {
      setIsSuggesting(false);
    }
  }, [aiEligibleFields, proposal]);

  useEffect(() => {
    if (!proposal || !fieldSelections || aiEligibleFields.length === 0) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active && !automaticJevStarted.current) {
        void handleJevSuggestions();
      }
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [aiEligibleFields.length, fieldSelections, handleJevSuggestions, proposal]);

  const handleConfirmMapping = async () => {
    if (!dataset?.backendUploadId || !proposal || !fieldSelections) return;
    const selected = Object.values(fieldSelections).filter(
      (columnId): columnId is string => columnId !== null,
    );
    if (new Set(selected).size !== selected.length) {
      setMappingError("A source column is selected more than once. Resolve the duplicate before continuing.");
      return;
    }
    if (!fieldSelections.facility_id || !fieldSelections.wo_id) {
      setMappingError("Map both the facility/site ID and work order ID before extracting records.");
      return;
    }

    const decisionMetadata = Object.fromEntries(
      CANONICAL_WORK_ORDER_FIELDS.map((field) => {
        const selection = fieldSelections[field];
        const suggestion = jevSuggestions.get(field);
        if (suggestion && suggestion.source_column_id === selection) {
          return [
            field,
            {
              method: "jev",
              confidence: suggestion.confidence,
              probability_margin: suggestion.probability_margin,
            },
          ];
        }
        const deterministic = proposal.mappings.find((mapping) => mapping.target === field);
        if (deterministic?.source_column_id === selection) {
          return [
            field,
            {
              method: deterministic.method,
              confidence: deterministic.confidence,
              rule_id: deterministic.rule_id,
            },
          ];
        }
        return [
          field,
          {
            method: selection ? "manual" : "unmapped",
            confidence: null,
          },
        ];
      }),
    ) as Record<CanonicalWorkOrderField, MappingDecisionMetadata>;
    const jevMetadata: JevRunMetadata | null = jevSuggestions.size
      ? {
          model: "typesafe/jev-1.14",
          prompt_version: "csv-mapping/v1",
          input_tokens: jevUsage?.input_tokens ?? null,
          cost: jevUsage?.cost ?? null,
        }
      : null;

    setIsConfirming(true);
    setMappingError(null);
    try {
      const result = await confirmMapping(
        dataset.backendUploadId,
        proposal,
        fieldSelections,
        decisionMetadata,
        jevMetadata,
      );
      setImportResult(result);
      setAnalyticsResult(null);
    } catch (error: unknown) {
      setMappingError(getErrorMessage(error, "The mapping could not be confirmed."));
    } finally {
      setIsConfirming(false);
    }
  };

  const handleSubmitAnalytics = async () => {
    if (!dataset?.backendUploadId) return;
    setIsSubmitting(true);
    setMappingError(null);
    try {
      setAnalyticsResult(await submitAnalytics(dataset.backendUploadId));
    } catch (error: unknown) {
      setMappingError(getErrorMessage(error, "Work orders could not be submitted."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleColumnSelection = (
    sourceColumnId: string,
    currentField: CanonicalWorkOrderField | undefined,
    value: CanonicalWorkOrderField | null,
  ) => {
    const selected = value;
    setFieldSelections((current) => {
      if (!current) return current;
      const next = { ...current };
      for (const field of CANONICAL_WORK_ORDER_FIELDS) {
        if (next[field] === sourceColumnId) next[field] = null;
      }
      if (selected) next[selected] = sourceColumnId;
      return next;
    });
    setJevSuggestions((current) => {
      if (!selected && !currentField) return current;
      const next = new Map(current);
      if (currentField) next.delete(currentField);
      if (selected) next.delete(selected);
      return next;
    });
  };

  if (isPending || (session && !profile && !pageError)) {
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

        {!dataset?.backendUploadId ? (
          <div className="rounded-2xl border border-dashed border-app-line bg-app-surface p-8 text-center">
              <p className="text-sm text-app-muted">Upload a file to start mapping its columns.</p>
              <Link
                href="/upload"
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-app-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-app-accent-strong active:bg-[#204d9c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
              >
                Upload a file
              </Link>
          </div>
        ) : (
          <section className="flex flex-col gap-6 rounded-2xl border border-app-line bg-app-surface p-4 sm:p-6">
            <div className="flex min-w-0 flex-col gap-1 border-b border-app-line pb-4 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 title={dataset.fileName} className="truncate text-sm font-semibold text-app-ink">
                {dataset.fileName}
              </h2>
              <p className="text-xs text-app-muted">
                {dataset.formattedSize} · {dataset.rowCount.toLocaleString()} rows · {dataset.columnCount} columns
              </p>
            </div>

              {isLoadingMapping && (
                <p role="status" className="text-sm text-app-muted">Preparing column matches…</p>
              )}
              {mappingError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <p>{mappingError}</p>
                  {!proposal && dataset.backendUploadId && !isLoadingMapping && (
                    <button
                      type="button"
                      onClick={() => {
                        setMappingError(null);
                        setIsLoadingMapping(true);
                        setMappingRetryCount((count) => count + 1);
                      }}
                      className="min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold text-red-800 transition-colors hover:bg-red-100 active:bg-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                    >
                      Retry mapping
                    </button>
                  )}
                </div>
              )}

              {proposal && fieldSelections && (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-2xl font-semibold text-app-ink">Match columns</h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleJevSuggestions}
                        disabled={isSuggesting || aiEligibleFields.length === 0}
                        className="min-h-11 rounded-lg border border-[#737b82] bg-white px-4 text-sm font-semibold text-app-ink transition-colors hover:bg-app-canvas active:bg-app-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSuggesting
                          ? "Finding matches…"
                          : jevAttempted
                            ? "Try suggestions again"
                            : "Suggest matches"}
                      </button>
                    </div>
                    <p className="text-xs leading-5 text-app-muted">
                      Column names and up to three sample values are sent to OpenRouter for suggestions.
                      {" "}Email addresses and phone numbers in samples are redacted first.
                    </p>
                    <p role="status" className="text-xs text-app-muted">
                      {jevSuggestions.size > 0
                        ? "Suggestions are ready. Review each match before continuing."
                        : isSuggesting
                          ? "Finding matches for unmatched columns..."
                          : jevAttempted
                            ? "No suggestions were available. Choose fields manually."
                            : aiEligibleFields.length > 0
                              ? "Suggestions are available for unmatched columns."
                              : "No further suggestions are needed."}
                    </p>
                    <div className="hidden overflow-x-auto rounded-xl border border-app-line lg:block">
                      <table className="w-full min-w-[880px] text-left text-sm">
                        <thead className="bg-app-canvas text-app-muted">
                          <tr>
                            <th className="sticky left-0 z-20 bg-app-canvas px-4 py-3 font-semibold">
                              Your column
                            </th>
                            <th className="px-4 py-3 font-semibold">Work-order field</th>
                            <th className="px-4 py-3 font-semibold">Match</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-line">
                          {proposal.columns.map((column) => {
                            const sampleValues = column.sample_values.filter(
                              (value): value is string => Boolean(value?.trim()),
                            );
                            const selectedFields = CANONICAL_WORK_ORDER_FIELDS.filter(
                              (field) => fieldSelections[field] === column.source_column_id,
                            );
                            const selectedField = selectedFields[0];
                            const mapping = proposal.mappings.find(
                              (item) => item.target === selectedField,
                            );
                            const jevSuggestion = selectedField
                              ? jevSuggestions.get(selectedField)
                              : undefined;
                            const isJevSelection =
                              jevSuggestion?.source_column_id === column.source_column_id;
                            const candidateFields = proposal.mappings.filter(
                              (item) =>
                                item.source_column_id === null &&
                                item.candidate_source_column_ids.includes(column.source_column_id),
                            );
                            return (
                              <tr key={column.source_column_id}>
                                <td className="sticky left-0 z-10 min-w-[280px] bg-white px-4 py-3 align-top text-app-ink">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-sm font-semibold">
                                      {column.index + 1}. {column.name || "(blank header)"}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-app-canvas px-2.5 py-1 text-xs font-medium text-app-muted">
                                      {column.detected_type}
                                    </span>
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {sampleValues.length > 0 ? (
                                      sampleValues.map((sample, index) => (
                                        <span
                                          key={`${column.source_column_id}-sample-${index}`}
                                          className="max-w-full break-all rounded-md border border-app-line bg-app-canvas px-2 py-1 text-sm font-normal text-app-ink"
                                        >
                                          {sample}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-sm font-normal text-app-muted">
                                        No sample values
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <MappingFieldCombobox
                                    id={`desktop-map-${column.source_column_id}`}
                                    label={`Work-order field for ${column.name || `column ${column.index + 1}`}`}
                                    value={selectedField ?? null}
                                    disabled={isSuggesting}
                                    onChange={(field) =>
                                      handleColumnSelection(
                                        column.source_column_id,
                                        selectedField,
                                        field,
                                      )
                                    }
                                  />
                                </td>
                                <td className="px-4 py-3 align-top text-app-muted">
                                  {selectedFields.length > 1 ? (
                                    <span className="font-semibold text-red-700">
                                      More than one field uses this column:{" "}
                                      {selectedFields
                                        .map((field) => CANONICAL_FIELD_LABELS[field])
                                        .join(", ")}
                                    </span>
                                  ) : isJevSelection ? (
                                    <span>Suggested match. Review before continuing.</span>
                                  ) : mapping?.source_column_id === column.source_column_id ? (
                                    <span>Matched automatically</span>
                                  ) : selectedField ? (
                                    <span>Selected manually</span>
                                  ) : candidateFields.length > 0 ? (
                                    <span>
                                      Possible match:{" "}
                                      {candidateFields
                                        .map((candidate) => CANONICAL_FIELD_LABELS[candidate.target])
                                        .join(", ")}
                                    </span>
                                  ) : (
                                    <span>Not mapped</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid gap-3 lg:hidden">
                      {proposal.columns.map((column) => {
                        const sampleValues = column.sample_values.filter(
                          (value): value is string => Boolean(value?.trim()),
                        );
                        const selectedFields = CANONICAL_WORK_ORDER_FIELDS.filter(
                          (field) => fieldSelections[field] === column.source_column_id,
                        );
                        const selectedField = selectedFields[0];
                        const mapping = proposal.mappings.find(
                          (item) => item.target === selectedField,
                        );
                        const suggestion = selectedField
                          ? jevSuggestions.get(selectedField)
                          : undefined;
                        const candidateFields = proposal.mappings.filter(
                          (item) =>
                            item.source_column_id === null &&
                            item.candidate_source_column_ids.includes(column.source_column_id),
                        );
                        return (
                          <article
                            key={column.source_column_id}
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
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {sampleValues.length > 0 ? (
                                sampleValues.map((sample, index) => (
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
                            <label
                              htmlFor={`mobile-map-${column.source_column_id}`}
                              className="mt-4 block text-sm font-medium text-app-ink"
                            >
                              Work-order field
                            </label>
                            <MappingFieldCombobox
                              id={`mobile-map-${column.source_column_id}`}
                              label={`Work-order field for ${column.name || `column ${column.index + 1}`}`}
                              value={selectedField ?? null}
                              className="mt-2"
                              disabled={isSuggesting}
                              onChange={(field) =>
                                handleColumnSelection(
                                  column.source_column_id,
                                  selectedField,
                                  field,
                                )
                              }
                            />
                            <p className="mt-3 text-xs text-app-muted">
                              {selectedFields.length > 1
                                ? `More than one field uses this column: ${selectedFields
                                    .map((field) => CANONICAL_FIELD_LABELS[field])
                                    .join(", ")}`
                                : suggestion?.source_column_id === column.source_column_id
                                  ? "Suggested match. Review before continuing."
                                  : mapping?.source_column_id === column.source_column_id
                                    ? "Matched automatically"
                                    : selectedField
                                      ? "Selected manually"
                                      : candidateFields.length > 0
                                        ? `Possible match: ${candidateFields
                                            .map((candidate) => CANONICAL_FIELD_LABELS[candidate.target])
                                            .join(", ")}`
                                        : "Not mapped"}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 border-t border-app-line pt-4 sm:flex-row sm:items-center sm:justify-end">
                    <Link
                      href="/upload"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#737b82] bg-white px-5 text-sm font-semibold text-app-ink transition-colors hover:bg-app-canvas active:bg-app-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
                    >
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                      Back to upload
                    </Link>
                    <button
                      type="button"
                      onClick={handleConfirmMapping}
                      disabled={isConfirming || isSuggesting || isLoadingMapping}
                      className="min-h-11 rounded-lg bg-app-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-app-accent-strong active:bg-[#204d9c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isConfirming ? "Extracting and validating…" : "Confirm mapping and extract"}
                    </button>
                  </div>
                </>
              )}

              {importResult && (
                <section className="rounded-xl border border-app-line bg-app-canvas p-4 sm:p-5">
                  <h2 className="text-sm font-bold text-app-ink">Import validation</h2>
                  <p className="mt-2 text-sm text-app-muted">
                    {importResult.valid_rows.toLocaleString()} valid · {importResult.invalid_rows.toLocaleString()} invalid · {importResult.total_rows.toLocaleString()} total
                  </p>
                  {importResult.error_preview.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                      <ul className="space-y-1">
                        {importResult.error_preview.slice(0, 10).map((error, index) => (
                          <li key={`${error.row_number}-${error.field}-${index}`}>
                            Row {error.row_number}{error.field ? ` • ${error.field}` : ""}: {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {importResult.valid_rows > 0 && (
                    <button
                      type="button"
                      onClick={handleSubmitAnalytics}
                      disabled={isSubmitting}
                      className="mt-4 min-h-11 rounded-lg bg-app-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-app-accent-strong active:bg-[#204d9c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting…" : "Submit valid work orders"}
                    </button>
                  )}
                  {analyticsResult && (
                    <p role="status" className="mt-3 text-sm text-app-muted">
                      {analyticsResult.message} ({analyticsResult.submitted} submitted, {analyticsResult.failed} failed)
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
