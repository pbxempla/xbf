/**
 * Mapping review workflow (Phase 5, Stage 3).
 *
 * React-free so it is testable on its own. The backend Mapping Decision Engine is
 * authoritative: this module never classifies columns, scores candidates or invents
 * confidence. It only tracks what the *user* has selected, accepted or rejected, and
 * reports it back. Suggestions (`ai_candidate`) and selections stay separate: a
 * suggestion becomes a selection only through an explicit user action.
 *
 * Only type imports are used so the module runs unchanged under Node's type stripping
 * (tests) and Next.js.
 */
import type {
  AiWithheldSuggestion,
  AnalyticsSubmitResult,
  CanonicalWorkOrderField,
  ImportResult,
  MappingDecision,
  MappingDecisionMetadata,
  MappingField,
  MappingProposal,
} from "./contracts";

/** Display-only copy of the backend's requirement (the backend enforces it on confirm). */
export const REQUIRED_TARGETS: readonly CanonicalWorkOrderField[] = ["facility_id", "wo_id"];

export type SelectionOrigin = "deterministic" | "manual" | "ai_accepted";

export interface ReviewState {
  /** target -> source column id the user (or a deterministic match) has selected */
  selections: Record<string, string | null>;
  /** how each current selection came about */
  origins: Record<string, SelectionOrigin>;
  /** target -> AI-suggested column the user rejected */
  rejected: Record<string, string>;
}

export interface AssignmentConflict {
  target: CanonicalWorkOrderField;
  columnId: string;
  heldBy: CanonicalWorkOrderField;
  origin: SelectionOrigin;
}

export interface ValidationIssue {
  code: "required_missing" | "duplicate_column" | "unknown_column";
  target?: string;
  columnId?: string;
  message: string;
}

export function initialReview(proposal: MappingProposal): ReviewState {
  const review: ReviewState = { selections: {}, origins: {}, rejected: {} };
  for (const mapping of proposal.mappings) {
    review.selections[mapping.target] = mapping.source_column_id;
    // Only a backend-provided source_column_id is preselected (deterministic matches).
    if (mapping.source_column_id !== null) review.origins[mapping.target] = "deterministic";
  }
  return review;
}

export function mappingFor(proposal: MappingProposal, target: string): MappingField | undefined {
  return proposal.mappings.find((mapping) => mapping.target === target);
}

export function holderOf(
  review: ReviewState,
  columnId: string,
  exceptTarget?: string,
): CanonicalWorkOrderField | null {
  for (const [target, selected] of Object.entries(review.selections)) {
    if (selected === columnId && target !== exceptTarget) return target as CanonicalWorkOrderField;
  }
  return null;
}

/** An AI candidate is shown for review only while the field has no selection. */
export function pendingSuggestion(
  proposal: MappingProposal,
  review: ReviewState,
  target: string,
) {
  const candidate = mappingFor(proposal, target)?.ai_candidate;
  if (!candidate || !candidate.actionable) return null;
  if (review.selections[target] != null) return null; // user already chose: suggestion superseded
  if (review.rejected[target] === candidate.source_column_id) return null;
  return candidate;
}

export function rejectedSuggestion(proposal: MappingProposal, review: ReviewState, target: string) {
  const candidate = mappingFor(proposal, target)?.ai_candidate;
  return candidate && review.rejected[target] === candidate.source_column_id ? candidate : null;
}

export interface AssignResult {
  review: ReviewState;
  conflict: AssignmentConflict | null;
}

/**
 * Select (or clear, with `columnId === null`) a column for a field. A column already used
 * by another field is never silently taken: a conflict is returned unless `move` is set.
 */
export function assign(
  review: ReviewState,
  target: CanonicalWorkOrderField,
  columnId: string | null,
  origin: SelectionOrigin = "manual",
  options: { move?: boolean } = {},
): AssignResult {
  const next: ReviewState = {
    selections: { ...review.selections },
    origins: { ...review.origins },
    rejected: { ...review.rejected },
  };
  if (columnId === null) {
    next.selections[target] = null;
    delete next.origins[target];
    return { review: next, conflict: null };
  }
  const holder = holderOf(review, columnId, target);
  if (holder !== null) {
    if (!options.move) return { review, conflict: { target, columnId, heldBy: holder, origin } };
    next.selections[holder] = null;
    delete next.origins[holder];
  }
  next.selections[target] = columnId;
  next.origins[target] = origin;
  return { review: next, conflict: null };
}

export function acceptSuggestion(
  proposal: MappingProposal,
  review: ReviewState,
  target: CanonicalWorkOrderField,
  options: { move?: boolean } = {},
): AssignResult {
  const candidate = pendingSuggestion(proposal, review, target);
  if (!candidate) return { review, conflict: null };
  return assign(review, target, candidate.source_column_id, "ai_accepted", options);
}

export function rejectSuggestion(
  proposal: MappingProposal,
  review: ReviewState,
  target: CanonicalWorkOrderField,
): ReviewState {
  const candidate = mappingFor(proposal, target)?.ai_candidate;
  if (!candidate) return review;
  return { ...review, rejected: { ...review.rejected, [target]: candidate.source_column_id } };
}

export type DisplayCategory = MappingDecision | "ai_accepted" | "ai_rejected";

/** What to show for a field: the user's selection origin wins, else the backend decision. */
export function displayCategory(
  proposal: MappingProposal,
  review: ReviewState,
  target: string,
): DisplayCategory {
  const selected = review.selections[target];
  if (selected != null) {
    const origin = review.origins[target];
    if (origin === "deterministic") return "deterministic_match";
    if (origin === "ai_accepted") return "ai_accepted";
    return "manual";
  }
  if (rejectedSuggestion(proposal, review, target)) return "ai_rejected";
  return mappingFor(proposal, target)?.decision ?? "unmapped";
}

export function validate(proposal: MappingProposal, review: ReviewState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const known = new Set(proposal.columns.map((column) => column.source_column_id));
  for (const required of REQUIRED_TARGETS) {
    if (!review.selections[required]) {
      issues.push({
        code: "required_missing",
        target: required,
        message: `${required} must be mapped before you can continue.`,
      });
    }
  }
  const seen = new Map<string, string>();
  for (const [target, columnId] of Object.entries(review.selections)) {
    if (!columnId) continue;
    if (!known.has(columnId)) {
      issues.push({ code: "unknown_column", target, columnId, message: `${target} refers to a column that is not in this file.` });
      continue;
    }
    const other = seen.get(columnId);
    if (other) {
      issues.push({
        code: "duplicate_column",
        target,
        columnId,
        message: `One column cannot be used for both ${other} and ${target}.`,
      });
    }
    seen.set(columnId, target);
  }
  return issues;
}

export interface ConfirmPayload {
  mappings: Record<CanonicalWorkOrderField, string | null>;
  decisionMetadata: Record<string, MappingDecisionMetadata>;
}

/**
 * Payload for the confirm call. `mappings` is the user's selection. The only provenance
 * sent is the *claim* that an AI suggestion was accepted; confidence and model are never
 * client-supplied (the backend verifies the claim against its own record).
 */
export function buildConfirmPayload(proposal: MappingProposal, review: ReviewState): ConfirmPayload {
  const mappings = {} as Record<CanonicalWorkOrderField, string | null>;
  const decisionMetadata: Record<string, MappingDecisionMetadata> = {};
  for (const mapping of proposal.mappings) {
    const selected = review.selections[mapping.target] ?? null;
    mappings[mapping.target] = selected;
    const candidate = mapping.ai_candidate;
    if (
      selected !== null &&
      review.origins[mapping.target] === "ai_accepted" &&
      candidate &&
      candidate.source_column_id === selected
    ) {
      decisionMetadata[mapping.target] = { method: "jev", confidence: null };
    }
  }
  return { mappings, decisionMetadata };
}

/** Upload id stored by the upload screen, or null when absent/corrupt. */
export function readUploadId(rawDataset: string | null): string | null {
  if (!rawDataset) return null;
  try {
    const parsed: unknown = JSON.parse(rawDataset);
    if (typeof parsed === "object" && parsed !== null) {
      const id = (parsed as Record<string, unknown>).backendUploadId;
      return typeof id === "string" && id.length > 0 ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------------------
// Workflow controller (framework independent)
// ---------------------------------------------------------------------------------------

export interface MappingApi {
  prepareMapping(uploadId: string): Promise<MappingProposal>;
  requestJevSuggestions(uploadId: string): Promise<{
    model: string;
    cached: boolean;
    withheld: AiWithheldSuggestion[];
  }>;
  confirmMapping(
    uploadId: string,
    proposal: MappingProposal,
    mappings: ConfirmPayload["mappings"],
    decisionMetadata: Record<string, MappingDecisionMetadata>,
  ): Promise<ImportResult>;
  submitAnalytics(uploadId: string): Promise<AnalyticsSubmitResult>;
}

export type Phase = "no_upload" | "loading" | "error" | "ready" | "confirming" | "confirmed";
export type AiStatus = "idle" | "consent" | "requesting" | "done" | "error";

export interface MappingViewState {
  uploadId: string | null;
  phase: Phase;
  proposal: MappingProposal | null;
  review: ReviewState;
  loadError: string | null;
  actionError: string | null;
  conflict: AssignmentConflict | null;
  ai: { status: AiStatus; attempted: boolean; model: string | null; withheld: AiWithheldSuggestion[]; error: string | null };
  importResult: ImportResult | null;
  analytics: { status: "idle" | "submitting" | "done" | "error"; result: AnalyticsSubmitResult | null };
}

const emptyReview = (): ReviewState => ({ selections: {}, origins: {}, rejected: {} });

function initialState(uploadId: string | null): MappingViewState {
  return {
    uploadId,
    phase: uploadId ? "loading" : "no_upload",
    proposal: null,
    review: emptyReview(),
    loadError: null,
    actionError: null,
    conflict: null,
    ai: { status: "idle", attempted: false, model: null, withheld: [], error: null },
    importResult: null,
    analytics: { status: "idle", result: null },
  };
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function createMappingController(api: MappingApi) {
  let state = initialState(null);
  let generation = 0;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<MappingViewState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  /** True while the given upload/generation is still the current one. */
  const isCurrent = (gen: number, uploadId: string) => gen === generation && state.uploadId === uploadId;

  const controller = {
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Bind to the current upload. A different id resets everything and invalidates in-flight work. */
    setUpload(uploadId: string | null) {
      if (state.uploadId === uploadId && state.phase !== "no_upload") return;
      generation += 1;
      state = initialState(uploadId);
      listeners.forEach((listener) => listener());
    },

    /** Loads the backend proposal. Never calls the AI provider. */
    async load() {
      const uploadId = state.uploadId;
      if (!uploadId) return;
      const gen = ++generation;
      set({ phase: "loading", loadError: null, actionError: null });
      try {
        const proposal = await api.prepareMapping(uploadId);
        if (!isCurrent(gen, uploadId)) return;
        set({ phase: "ready", proposal, review: initialReview(proposal), conflict: null, importResult: null });
      } catch (error) {
        if (!isCurrent(gen, uploadId)) return;
        set({ phase: "error", loadError: messageOf(error, "Unable to prepare the mapping proposal.") });
      }
    },

    openConsent() {
      if (state.phase === "ready" && state.ai.status !== "requesting") {
        set({ ai: { ...state.ai, status: "consent", error: null } });
      }
    },
    cancelConsent() {
      if (state.ai.status === "consent") set({ ai: { ...state.ai, status: "idle" } });
    },

    /**
     * Requests AI suggestions. Only valid after the disclosure was opened by the user
     * (`openConsent`); otherwise it is a no-op so nothing can be sent implicitly.
     */
    async requestSuggestions() {
      const uploadId = state.uploadId;
      if (!uploadId || state.phase !== "ready" || state.ai.status !== "consent") return;
      const gen = generation;
      set({ ai: { ...state.ai, status: "requesting", attempted: true, error: null } });
      try {
        const result = await api.requestJevSuggestions(uploadId);
        if (!isCurrent(gen, uploadId)) return;
        // The proposal is the single authority for suggestions; re-read it so the
        // backend decisions (and withheld reasons) are what the user sees.
        const proposal = await api.prepareMapping(uploadId);
        if (!isCurrent(gen, uploadId)) return;
        set({
          proposal,
          ai: { status: "done", attempted: true, model: result.model, withheld: result.withheld, error: null },
        });
      } catch (error) {
        if (!isCurrent(gen, uploadId)) return;
        // Selections and the existing proposal are untouched by a failed request.
        set({ ai: { ...state.ai, status: "error", error: messageOf(error, "AI suggestions could not be retrieved.") } });
      }
    },

    acceptSuggestion(target: CanonicalWorkOrderField, options: { move?: boolean } = {}) {
      if (!state.proposal || state.phase !== "ready") return;
      const result = acceptSuggestion(state.proposal, state.review, target, options);
      set({ review: result.review, conflict: result.conflict, actionError: null });
    },
    rejectSuggestion(target: CanonicalWorkOrderField) {
      if (!state.proposal || state.phase !== "ready") return;
      set({ review: rejectSuggestion(state.proposal, state.review, target), conflict: null });
    },
    /** Column-centric selection (the per-column field picker). One column, one field. */
    assignColumn(columnId: string, target: CanonicalWorkOrderField | null) {
      if (state.phase !== "ready") return;
      let review = state.review;
      const current = holderOf(review, columnId);
      if (current) review = assign(review, current, null).review;
      if (target) review = assign(review, target, columnId, "manual").review;
      set({ review, conflict: null, actionError: null });
    },
    assign(target: CanonicalWorkOrderField, columnId: string | null, options: { move?: boolean } = {}) {
      if (state.phase !== "ready") return;
      const result = assign(state.review, target, columnId, "manual", options);
      set({ review: result.review, conflict: result.conflict, actionError: null });
    },
    /** User chose "use it here instead": repeat the blocked assignment with the move option. */
    resolveConflictByMoving() {
      const conflict = state.conflict;
      if (!conflict || state.phase !== "ready") return;
      const result = assign(state.review, conflict.target, conflict.columnId, conflict.origin, { move: true });
      set({ review: result.review, conflict: null });
    },
    dismissConflict() {
      set({ conflict: null });
    },

    validate: () => (state.proposal ? validate(state.proposal, state.review) : []),

    async confirm() {
      const uploadId = state.uploadId;
      const proposal = state.proposal;
      if (!uploadId || !proposal || state.phase !== "ready") return;
      const issues = validate(proposal, state.review);
      if (issues.length > 0) {
        set({ actionError: issues[0].message });
        return;
      }
      const gen = generation;
      const payload = buildConfirmPayload(proposal, state.review);
      set({ phase: "confirming", actionError: null });
      try {
        const result = await api.confirmMapping(uploadId, proposal, payload.mappings, payload.decisionMetadata);
        if (!isCurrent(gen, uploadId)) return;
        set({ phase: "confirmed", importResult: result });
      } catch (error) {
        if (!isCurrent(gen, uploadId)) return;
        set({ phase: "ready", actionError: messageOf(error, "The mapping could not be confirmed.") });
      }
    },

    /** Re-open editing after a confirmation: loads a fresh proposal (new job). */
    async reopen() {
      if (state.phase !== "confirmed") return;
      set({ importResult: null, analytics: { status: "idle", result: null } });
      await controller.load();
    },

    async submitAnalytics() {
      const uploadId = state.uploadId;
      if (!uploadId || state.phase !== "confirmed") return;
      const gen = generation;
      set({ analytics: { status: "submitting", result: null }, actionError: null });
      try {
        const result = await api.submitAnalytics(uploadId);
        if (!isCurrent(gen, uploadId)) return;
        set({ analytics: { status: "done", result } });
      } catch (error) {
        if (!isCurrent(gen, uploadId)) return;
        set({ analytics: { status: "error", result: null }, actionError: messageOf(error, "Work orders could not be submitted.") });
      }
    },
  };
  return controller;
}

export type MappingController = ReturnType<typeof createMappingController>;
