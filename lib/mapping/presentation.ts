import type { DisplayCategory } from "./review";

/** Display copy for backend reason codes. Unknown codes fall back to the raw code. */
const REASON_TEXT: Record<string, string> = {
  exact_canonical_name: "The column name matches the field name.",
  approved_alias: "The column name matches an approved alias.",
  approved_pattern: "The column name matches an approved naming pattern.",
  saved_confirmed_profile: "You confirmed this mapping for the same headers before.",
  multiple_candidate_columns: "More than one column could match.",
  column_competes_for_fields: "This column could belong to more than one field.",
  candidate_not_selected: "A possible column was found but not selected automatically.",
  competing_ai_suggestions: "The AI suggested the same column for several fields.",
  ai_conflicts_with_deterministic_mapping: "The AI suggested a column that is already matched by name.",
  generic_header_not_guessed:
    "The header is too generic to guess (for example Reference, Number or Code).",
  ai_candidate_only: "Only the AI suggests this match.",
  required_field_unmapped: "Required: no column was matched. Choose one.",
  no_header_evidence: "No column name matches this field.",
};

export function reasonText(code: string): string {
  return REASON_TEXT[code] ?? code;
}

export const CATEGORY_LABEL: Record<DisplayCategory, string> = {
  deterministic_match: "Matched by name",
  ai_suggestion: "AI suggestion: review",
  ambiguous: "Needs your choice",
  unmapped: "Not mapped",
  manual: "Chosen by you",
  ai_accepted: "AI suggestion accepted by you",
  ai_rejected: "AI suggestion rejected",
};

/** Non-colour cue prefix so state is never conveyed by colour alone. */
export const CATEGORY_TONE: Record<DisplayCategory, string> = {
  deterministic_match: "border-emerald-300 bg-emerald-50 text-emerald-900",
  ai_suggestion: "border-blue-300 bg-blue-50 text-blue-900",
  ambiguous: "border-amber-300 bg-amber-50 text-amber-900",
  unmapped: "border-app-line bg-app-canvas text-app-muted",
  manual: "border-app-line bg-white text-app-ink",
  ai_accepted: "border-blue-300 bg-white text-blue-900",
  ai_rejected: "border-app-line bg-app-canvas text-app-muted",
};
