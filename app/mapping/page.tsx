"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Database } from "lucide-react";
import { UploadHeader } from "@/components/upload/UploadHeader";
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
  }, [isPending, session, router]);

  useEffect(() => {
    const uploadId = dataset?.backendUploadId;
    if (isPending || !session || !uploadId) return;
    let active = true;
    prepareMapping(uploadId)
      .then((nextProposal) => {
        if (!active) return;
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
  }, [dataset?.backendUploadId, isPending, session]);

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

  if (isPending || (session && !profile && !pageError)) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F6FE]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return null;
  if (pageError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F6FE] px-6 text-center">
        <p role="alert" className="text-sm text-red-700">{pageError}</p>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-[#F5F6FE] via-[#EDF0FE] to-[#F5F7FF] flex flex-col">
      <UploadHeader
        userEmail={profile.email}
        userName={profile.full_name || undefined}
        emailType={profile.email_type}
        creditBalance={profile.credit_balance}
        onLogout={handleLogout}
      />
      <main className="w-full px-6 sm:px-8 lg:px-12 py-8 flex flex-col flex-1">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-100 rounded-lg px-3 py-1.5 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Upload</span>
          </Link>
        </div>

        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100/90 flex flex-col gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Stage 2 • Schema Mapping
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] mt-1">
              Map work-order data
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Confirm how the CSV columns map to the canonical work-order fields. Required fields are marked; optional fields can remain unmapped.
            </p>
          </div>

          {!dataset?.backendUploadId ? (
            <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-sm">No uploaded dataset is available in this browser session.</p>
              <Link href="/upload" className="mt-3 inline-block text-sm font-semibold text-indigo-600">
                Go to Upload
              </Link>
            </div>
          ) : (
            <>
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{dataset.fileName}</h2>
                    <p className="text-xs text-slate-500">
                      {dataset.formattedSize} • {dataset.rowCount.toLocaleString()} rows • {dataset.columnCount} columns
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Quarantined
                </div>
              </div>

              {isLoadingMapping && (
                <p role="status" className="text-sm text-slate-500">Profiling the CSV and preparing deterministic suggestions…</p>
              )}
              {mappingError && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {mappingError}
                </p>
              )}

              {proposal && fieldSelections && (
                <>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">Source column mapping</h2>
                        <p className="text-xs text-slate-500">
                          {proposal.total_rows.toLocaleString()} CSV rows • schema {proposal.schema_version} • delimiter {proposal.delimiter === "\t" ? "tab" : proposal.delimiter}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleJevSuggestions}
                        disabled={isSuggesting || aiEligibleFields.length === 0}
                        className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSuggesting ? "Asking OpenRouter Jev…" : "Retry unresolved fields with Jev"}
                      </button>
                    </div>
                    <p className="text-xs leading-5 text-slate-500">
                      Source columns stay fixed on the left; choose a canonical field in the middle. Rules run first.                       When rules leave unresolved or ambiguous fields, OpenRouter Jev automatically suggests mappings for those fields only. Column names and up to three short sample values are sent, with email addresses and phone-like values redacted. You can retry suggestions, and must review every suggestion before confirming.
                    </p>
                    <p role="status" className="text-xs text-slate-600">
                      Automatic rule matches:{" "}
                      {proposal.mappings.filter(
                        (mapping) =>
                          mapping.source_column_id !== null &&
                          mapping.method !== "unmapped",
                      ).length}
                      {" · "}
                      OpenRouter decision layer:{" "}
                      {jevSuggestions.size > 0
                        ? `${jevSuggestions.size} suggestion(s) returned; review required`
                        : isSuggesting
                          ? "request in progress"
                          : jevAttempted
                            ? "no usable suggestions returned; review the message above"
                            : aiEligibleFields.length > 0
                              ? `${aiEligibleFields.length} unresolved field(s); not called yet`
                              : "not needed; no unresolved required or ambiguous fields"}
                    </p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[760px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600">
                          <tr>
                            <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 font-semibold">
                              Source (CSV column)
                            </th>
                            <th className="px-4 py-3 font-semibold">Canonical field</th>
                            <th className="px-4 py-3 font-semibold">Mapping decision</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {proposal.columns.map((column) => {
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
                                <td className="sticky left-0 z-10 bg-white px-4 py-3 align-top font-medium text-slate-800">
                                  <span className="block">
                                    {column.index + 1}. {column.name || "(blank header)"}
                                  </span>
                                  <span className="mt-1 block text-[10px] text-slate-500">
                                    Type: {column.detected_type}
                                  </span>
                                  <span className="mt-1 block font-normal text-slate-500">
                                    {column.sample_values.filter(Boolean).join(" · ") || "No sample values"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <select
                                    aria-label={`Canonical field for source column ${column.name || column.index + 1}`}
                                    value={selectedField ?? ""}
                                    disabled={isSuggesting}
                                    onChange={(event) => {
                                      const selected = CANONICAL_WORK_ORDER_FIELDS.find(
                                        (field) => field === event.target.value,
                                      ) ?? null;
                                      setFieldSelections((current) => {
                                        if (!current) return current;
                                        const next = { ...current };
                                        for (const field of CANONICAL_WORK_ORDER_FIELDS) {
                                          if (next[field] === column.source_column_id) {
                                            next[field] = null;
                                          }
                                        }
                                        if (selected) {
                                          next[selected] = column.source_column_id;
                                        }
                                        return next;
                                      });
                                      setJevSuggestions((current) => {
                                        if (!selected && !selectedField) return current;
                                        const next = new Map(current);
                                        if (selectedField) next.delete(selectedField);
                                        if (selected) next.delete(selected);
                                        return next;
                                      });
                                    }}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700"
                                  >
                                    <option value="">Not mapped</option>
                                    {CANONICAL_WORK_ORDER_FIELDS.map((field) => (
                                      <option key={field} value={field}>
                                        {CANONICAL_FIELD_LABELS[field]}
                                        {field === "facility_id" || field === "wo_id" ? " (required)" : ""}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-4 py-3 align-top text-slate-500">
                                  {selectedFields.length > 1 ? (
                                    <span className="font-semibold text-red-700">
                                      Conflict: multiple fields share this source —{" "}
                                      {selectedFields
                                        .map((field) => CANONICAL_FIELD_LABELS[field])
                                        .join(", ")}
                                    </span>
                                  ) : isJevSelection ? (
                                    <span>
                                      Jev suggestion · {Math.round(jevSuggestion.confidence * 100)}% confidence · review required
                                    </span>
                                  ) : mapping?.source_column_id === column.source_column_id ? (
                                    <span>
                                      Automatic rule: {mapping.method}
                                      {mapping.confidence !== null
                                        ? ` · ${Math.round(mapping.confidence * 100)}% confidence`
                                        : ""}
                                    </span>
                                  ) : selectedField ? (
                                    <span>Manual selection: {CANONICAL_FIELD_LABELS[selectedField]}</span>
                                  ) : candidateFields.length > 0 ? (
                                    <span>
                                      Candidate for{" "}
                                      {candidateFields
                                        .map((candidate) => CANONICAL_FIELD_LABELS[candidate.target])
                                        .join(", ")}{" "}
                                      · review needed
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
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      {proposal.columns.map((column) => (
                        <span key={column.source_column_id} className="rounded-lg bg-slate-100 px-2.5 py-1.5">
                          {column.index + 1}. {column.name} <span className="text-indigo-700">{column.detected_type}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleConfirmMapping}
                    disabled={isConfirming || isSuggesting || isLoadingMapping}
                    className="self-start rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#191c1f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isConfirming ? "Extracting and validating…" : "Confirm mapping and extract"}
                  </button>
                </>
              )}

              {importResult && (
                <section className="rounded-2xl border border-slate-200 p-5">
                  <h2 className="text-sm font-bold text-slate-900">Import validation</h2>
                  <p className="mt-2 text-sm text-slate-600">
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
                      className="mt-4 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmitting ? "Submitting…" : "Submit valid work orders"}
                    </button>
                  )}
                  {analyticsResult && (
                    <p role="status" className="mt-3 text-sm text-slate-600">
                      {analyticsResult.message} ({analyticsResult.submitted} submitted, {analyticsResult.failed} failed)
                    </p>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
