import type {
  AnalyticsSubmitResult,
  CanonicalWorkOrderField,
  ImportResult,
  AiConsentInfo,
  AnalysisStatus,
  AiWithheldSuggestion,
  JevSuggestion,
  MappingDecisionMetadata,
  MappingProposal,
} from "./contracts";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Error carrying the backend's machine-readable `detail.code`, when present. */
export class MappingApiError extends Error {
  code: string | null;
  constructor(message: string, code: string | null) {
    super(message);
    this.name = "MappingApiError";
    this.code = code;
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const detail =
      isRecord(body) && typeof body.detail === "string"
        ? body.detail
        : isRecord(body) && isRecord(body.detail) && typeof body.detail.message === "string"
          ? body.detail.message
          : `The mapping request failed (HTTP ${response.status}).`;
    throw new MappingApiError(
      detail,
      isRecord(body) && isRecord(body.detail) && typeof body.detail.code === "string"
        ? body.detail.code
        : null,
    );
  }
  if (!body || !isRecord(body)) {
    throw new Error("The mapping API returned an invalid response.");
  }
  return body as T;
}

export async function prepareMapping(uploadId: string): Promise<MappingProposal> {
  const result = await requestJson<MappingProposal>(
    `/api/backend/uploads/${encodeURIComponent(uploadId)}/mapping/proposal`,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (
    result.schema_version !== "work-order/v1" ||
    !Array.isArray(result.columns) ||
    !Array.isArray(result.mappings) ||
    !Array.isArray(result.unresolved_fields)
  ) {
    throw new Error("The backend returned an invalid mapping proposal.");
  }
  // The proposal must belong to the upload that was requested; never render another file's columns.
  if (result.upload_id !== uploadId) {
    throw new Error("The mapping proposal does not belong to the uploaded file. Re-upload the file.");
  }
  return result;
}

export async function confirmMapping(
  uploadId: string,
  proposal: MappingProposal,
  mappings: Record<CanonicalWorkOrderField, string | null>,
  decisionMetadata: Record<string, MappingDecisionMetadata>,
): Promise<ImportResult> {
  const result = await requestJson<ImportResult>(
    `/api/backend/uploads/${encodeURIComponent(uploadId)}/mapping/confirm`,
    {
      method: "POST",
      body: JSON.stringify({
        schema_version: proposal.schema_version,
        header_fingerprint: proposal.header_fingerprint,
        mappings,
        // Only the claim "the user accepted a suggestion" is sent; the backend
        // verifies it against its own record and ignores client confidence/model.
        decision_metadata: decisionMetadata,
        save_profile: true,
      }),
    },
  );
  if (
    result.upload_id !== uploadId ||
    typeof result.import_job_id !== "string" ||
    typeof result.total_rows !== "number" ||
    typeof result.valid_rows !== "number" ||
    typeof result.invalid_rows !== "number" ||
    !Array.isArray(result.error_preview)
  ) {
    throw new Error("The backend returned an invalid import result.");
  }
  return result;
}

export interface AiSuggestionResult {
  model: string;
  prompt_version: string;
  suggestions: JevSuggestion[];
  withheld: AiWithheldSuggestion[];
  cached: boolean;
}

/**
 * Explicit, user-initiated AI suggestion request. The backend (not the browser) calls the
 * provider and decides which fields are eligible; the consent flag is required by the API.
 * Callers must only invoke this from a user action after the disclosure.
 */
export async function requestJevSuggestions(
  uploadId: string,
  options: { acknowledgePossibleDuplicate?: boolean } = {},
): Promise<AiSuggestionResult> {
  const result = await requestJson<AiSuggestionResult>(
    `/api/backend/uploads/${encodeURIComponent(uploadId)}/mapping/ai-suggestions`,
    {
      method: "POST",
      body: JSON.stringify({
        consent_to_external_processing: true,
        ...(options.acknowledgePossibleDuplicate ? { acknowledge_possible_duplicate: true } : {}),
      }),
    },
  );
  if (
    typeof result.model !== "string" ||
    !Array.isArray(result.suggestions) ||
    !result.suggestions.every(
      (suggestion) =>
        typeof suggestion.target === "string" &&
        typeof suggestion.confidence === "number" &&
        typeof suggestion.probability_margin === "number" &&
        (suggestion.source_column_id === null || typeof suggestion.source_column_id === "string"),
    )
  ) {
    throw new Error("The AI suggestion service returned an invalid response.");
  }
  return { ...result, withheld: Array.isArray(result.withheld) ? result.withheld : [] };
}

function parseConsent(value: unknown): AiConsentInfo {
  if (
    !isRecord(value) ||
    typeof value.is_active !== "boolean" ||
    typeof value.required_version !== "string" ||
    typeof value.disclosure_text !== "string" ||
    typeof value.disclosure_sha256 !== "string"
  ) {
    throw new Error("The consent service returned an invalid response.");
  }
  return value as unknown as AiConsentInfo;
}

const ANALYSIS_STATES = new Set([
  "none", "auto_disabled", "disabled", "consent_required", "skipped", "limit_reached",
  "rate_limited", "unavailable", "queued", "running", "succeeded", "failed", "cancelled",
]);

function parseAnalysis(value: unknown): AnalysisStatus {
  if (
    !isRecord(value) ||
    typeof value.status !== "string" ||
    !ANALYSIS_STATES.has(value.status) ||
    (value.mode !== "auto" && value.mode !== "manual")
  ) {
    throw new Error("The analysis service returned an invalid response.");
  }
  return value as unknown as AnalysisStatus;
}

/**
 * Idempotent start of the automatic background analysis. The server decides everything
 * (switches, consent, limits); this never sends consent, targets or provenance. `retry` is
 * only ever set by an explicit user action.
 */
export async function startAnalysis(
  uploadId: string,
  options: { retry?: boolean; acknowledgePossibleDuplicate?: boolean } = {},
): Promise<AnalysisStatus> {
  return parseAnalysis(
    await requestJson<unknown>(
      `/api/backend/uploads/${encodeURIComponent(uploadId)}/mapping/analysis`,
      {
        method: "POST",
        body: JSON.stringify({
          ...(options.retry ? { retry: true } : {}),
          ...(options.retry && options.acknowledgePossibleDuplicate
            ? { acknowledge_possible_duplicate: true }
            : {}),
        }),
      },
    ),
  );
}

export async function getAnalysisStatus(uploadId: string): Promise<AnalysisStatus> {
  return parseAnalysis(
    await requestJson<unknown>(
      `/api/backend/uploads/${encodeURIComponent(uploadId)}/mapping/analysis`,
    ),
  );
}

export async function getAiConsent(): Promise<AiConsentInfo> {
  return parseConsent(await requestJson<unknown>("/api/backend/users/me/ai-consent"));
}

/** One-time grant. The backend only accepts the version and disclosure hash it requires. */
export async function grantAiConsent(info: AiConsentInfo): Promise<AiConsentInfo> {
  return parseConsent(
    await requestJson<unknown>("/api/backend/users/me/ai-consent/grant", {
      method: "POST",
      body: JSON.stringify({
        consent_version: info.required_version,
        disclosure_sha256: info.disclosure_sha256,
        source: "mapping_ui",
      }),
    }),
  );
}

export async function withdrawAiConsent(): Promise<void> {
  await requestJson<unknown>("/api/backend/users/me/ai-consent/withdraw", { method: "POST" });
}

function assertAnalyticsResult(result: AnalyticsSubmitResult): AnalyticsSubmitResult {
  if (
    typeof result.import_job_id !== "string" ||
    typeof result.total !== "number" ||
    typeof result.submitted !== "number" ||
    typeof result.failed !== "number" ||
    typeof result.pending !== "number"
  ) {
    throw new Error("The analytics API returned an invalid submission result.");
  }
  return result;
}

export async function submitAnalytics(uploadId: string): Promise<AnalyticsSubmitResult> {
  return assertAnalyticsResult(
    await requestJson<AnalyticsSubmitResult>(
      `/api/backend/uploads/${encodeURIComponent(uploadId)}/analytics/submit`,
      { method: "POST" },
    ),
  );
}

export async function fetchAnalyticsStatus(uploadId: string): Promise<AnalyticsSubmitResult> {
  return assertAnalyticsResult(
    await requestJson<AnalyticsSubmitResult>(
      `/api/backend/uploads/${encodeURIComponent(uploadId)}/analytics/status`,
    ),
  );
}
