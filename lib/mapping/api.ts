import type {
  AnalyticsSubmitResult,
  CanonicalWorkOrderField,
  ImportResult,
  JevSuggestion,
  JevRunMetadata,
  MappingDecisionMetadata,
  MappingProposal,
} from "./contracts";

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
    throw new Error(detail);
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
  return result;
}

export async function confirmMapping(
  uploadId: string,
  proposal: MappingProposal,
  mappings: Record<CanonicalWorkOrderField, string | null>,
  decisionMetadata: Record<CanonicalWorkOrderField, MappingDecisionMetadata>,
  jevMetadata: JevRunMetadata | null,
): Promise<ImportResult> {
  const result = await requestJson<ImportResult>(
    `/api/backend/uploads/${encodeURIComponent(uploadId)}/mapping/confirm`,
    {
      method: "POST",
      body: JSON.stringify({
        schema_version: proposal.schema_version,
        header_fingerprint: proposal.header_fingerprint,
        mappings,
        decision_metadata: decisionMetadata,
        jev_metadata: jevMetadata,
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

export async function requestJevSuggestions(
  proposal: MappingProposal,
  targets: CanonicalWorkOrderField[],
): Promise<{
  model: string;
  suggestions: JevSuggestion[];
  usage: { input_tokens: number | null; cost: number | null } | null;
}> {
  const result = await requestJson<{
    model: string;
    suggestions: JevSuggestion[];
    usage: { input_tokens: number | null; cost: number | null } | null;
  }>("/api/mapping/suggest", {
    method: "POST",
    body: JSON.stringify({ proposal, targets }),
  });
  if (
    result.model !== "typesafe/jev-1.14" ||
    !Array.isArray(result.suggestions) ||
    !result.suggestions.every(
      (suggestion) =>
        typeof suggestion.target === "string" &&
        typeof suggestion.confidence === "number" &&
        typeof suggestion.probability_margin === "number" &&
        suggestion.needs_review === true,
    )
  ) {
    throw new Error("The Jev API returned an invalid mapping suggestion.");
  }
  return result;
}

export async function submitAnalytics(uploadId: string): Promise<AnalyticsSubmitResult> {
  const result = await requestJson<AnalyticsSubmitResult>(
    `/api/backend/uploads/${encodeURIComponent(uploadId)}/analytics/submit`,
    { method: "POST" },
  );
  if (
    typeof result.import_job_id !== "string" ||
    typeof result.submitted !== "number" ||
    typeof result.failed !== "number"
  ) {
    throw new Error("The analytics API returned an invalid submission result.");
  }
  return result;
}
