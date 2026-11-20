export const CANONICAL_WORK_ORDER_FIELDS = [
  "facility_id",
  "wo_id",
  "wo_type",
  "priority",
  "status",
  "asset_id",
  "asset_name",
  "location_id",
  "location_name",
  "asset_class",
  "asset_criticality",
  "trade",
  "wo_title",
  "fault_description",
  "resolution_notes",
  "root_cause",
  "outcome",
  "parts_used",
  "visit_count",
  "linked_wo_id",
  "statutory_flag",
  "cost_total",
  "cost_labour",
  "cost_parts",
  "reported_date",
  "completed_date",
] as const;

export type CanonicalWorkOrderField = (typeof CANONICAL_WORK_ORDER_FIELDS)[number];

export const CANONICAL_FIELD_LABELS: Record<CanonicalWorkOrderField, string> = {
  facility_id: "Facility / site ID",
  wo_id: "Work order ID",
  wo_type: "Work order type",
  priority: "Priority",
  status: "Status",
  asset_id: "Asset ID",
  asset_name: "Asset name",
  location_id: "Location ID",
  location_name: "Location name",
  asset_class: "Asset class",
  asset_criticality: "Asset criticality",
  trade: "Trade / discipline",
  wo_title: "Work order title",
  fault_description: "Fault description",
  resolution_notes: "Resolution notes",
  root_cause: "Root cause",
  outcome: "Outcome",
  parts_used: "Parts used",
  visit_count: "Visit count",
  linked_wo_id: "Linked work order ID",
  statutory_flag: "Statutory work",
  cost_total: "Total cost",
  cost_labour: "Labour cost",
  cost_parts: "Parts cost",
  reported_date: "Reported date",
  completed_date: "Completed date",
};

export interface MappingSourceColumn {
  source_column_id: string;
  index: number;
  name: string;
  original_name: string | null;
  normalized_name: string;
  detected_type: string;
  sample_values: Array<string | null>;
  /** Profiling statistics computed by the backend (Stage 4a); informational. */
  stats?: Record<string, unknown> | null;
}

/** Decision categories computed by the backend Mapping Decision Engine (authoritative). */
export type MappingDecision =
  | "deterministic_match"
  | "ai_suggestion"
  | "ambiguous"
  | "unmapped"
  | "manual";

/** JEV evidence for one field. Never a selection; `actionable` is decided by the backend. */
export interface AiCandidate {
  source_column_id: string;
  confidence: number;
  probability_margin: number;
  actionable: boolean;
  withheld_reasons: string[];
  /** Backend-decided: the candidate passed the structural auto-selection gates. */
  auto_selected?: boolean;
}

export interface MappingField {
  target: CanonicalWorkOrderField;
  source_column_id: string | null;
  candidate_source_column_ids: string[];
  method: "exact" | "alias" | "vendor_profile" | "regex" | "jev" | "manual" | "unmapped";
  confidence: number | null;
  rule_id: string | null;
  needs_review: boolean;
  decision?: MappingDecision | null;
  reasons?: string[];
  ai_candidate?: AiCandidate | null;
  /** Stage 4b: true only for deterministic matches the backend allows to preselect. */
  preselected?: boolean;
  basis?: string | null;
  evidence?: string[];
}

export interface MappingProposal {
  upload_id: string;
  import_job_id: string;
  schema_version: "work-order/v1";
  header_fingerprint: string;
  delimiter: string;
  header_row_index: number;
  columns: MappingSourceColumn[];
  mappings: MappingField[];
  unresolved_fields: CanonicalWorkOrderField[];
  status: "automatic" | "review_required" | "blocked";
  profile_version: number | null;
  total_rows: number;
}

export interface ImportResult {
  import_job_id: string;
  upload_id: string;
  status: "mapping_review" | "extracting" | "validated" | "validated_with_errors" | "failed";
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  error_preview: Array<{
    row_number: number;
    field: string | null;
    code: string;
    message: string;
  }>;
}

export interface AnalyticsSubmitResult {
  import_job_id: string;
  total: number;
  submitted: number;
  failed: number;
  pending: number;
  status: "sending" | "submitted" | "partially_submitted" | "failed" | "nothing_to_send";
  message: string;
}

export interface MappingDecisionMetadata {
  method: MappingField["method"];
  confidence: number | null;
  probability_margin?: number | null;
  rule_id?: string | null;
}

/** Account-level consent for external AI processing; enforced by the backend. */
export interface AiConsentInfo {
  purpose: string;
  is_active: boolean;
  status: "none" | "granted" | "withdrawn";
  consent_version: string | null;
  required_version: string;
  is_current_version: boolean;
  granted_at: string | null;
  withdrawn_at: string | null;
  disclosure_text: string;
  disclosure_sha256: string;
}

/** Persisted status of the automatic background analysis (server-decided; never client-derived). */
export type AnalysisState =
  | "none"
  | "auto_disabled"
  | "disabled"
  | "consent_required"
  | "skipped"
  | "limit_reached"
  | "rate_limited"
  | "unavailable"
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface AnalysisStatus {
  status: AnalysisState;
  mode: "auto" | "manual";
  run_id: string | null;
  stage: string | null;
  error_code: string | null;
  retry_after_seconds: number | null;
  required_version: string | null;
  attempt_count: number | null;
  cached: boolean;
}

export interface JevSuggestion {
  target: CanonicalWorkOrderField;
  source_column_id: string | null;
  confidence: number;
  probability_margin: number;
  status: "suggested";
  decision?: "ai_suggestion" | "ambiguous";
  reasons?: string[];
}

export interface AiWithheldSuggestion {
  target: CanonicalWorkOrderField;
  source_column_id: string;
  confidence: number;
  reasons: string[];
}
