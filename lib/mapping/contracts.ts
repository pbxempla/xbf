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
}

export interface MappingField {
  target: CanonicalWorkOrderField;
  source_column_id: string | null;
  candidate_source_column_ids: string[];
  method: "exact" | "alias" | "vendor_profile" | "regex" | "jev" | "manual" | "unmapped";
  confidence: number | null;
  rule_id: string | null;
  needs_review: boolean;
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
  submitted: number;
  failed: number;
  status: "submitted" | "partially_submitted" | "failed";
  message: string;
}

export interface MappingDecisionMetadata {
  method: MappingField["method"];
  confidence: number | null;
  probability_margin?: number | null;
  rule_id?: string | null;
}

export interface JevRunMetadata {
  model: "typesafe/jev-1.14";
  prompt_version: "csv-mapping/v1";
  input_tokens: number | null;
  cost: number | null;
}

export interface JevSuggestion {
  target: CanonicalWorkOrderField;
  source_column_id: string | null;
  confidence: number;
  probability_margin: number;
  needs_review: true;
}
