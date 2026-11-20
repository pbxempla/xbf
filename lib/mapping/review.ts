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
  AiConsentInfo,
  AnalysisStatus,
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

export type SelectionOrigin = "deterministic" | "manual" | "ai_accepted" | "ai_auto";

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

/**
 * Pre-selects the backend-approved AI candidates (`auto_selected`) for review. Only empty,
 * not-rejected fields whose column is free are touched; the user's own choices, deterministic
 * matches and rejections are never changed. Nothing here confirms anything.
 */
export function applyAutoSelections(proposal: MappingProposal, review: ReviewState): ReviewState {
  let next = review;
  for (const mapping of proposal.mappings) {
    const candidate = mapping.ai_candidate;
    if (!candidate || !candidate.auto_selected || !candidate.actionable) continue;
    if (next.selections[mapping.target] != null) continue;
    if (next.rejected[mapping.target] === candidate.source_column_id) continue;
    if (holderOf(next, candidate.source_column_id) !== null) continue;
    next = assign(next, mapping.target, candidate.source_column_id, "ai_auto").review;
  }
  return next;
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
  const forget = (field: string) => {
    const origin = next.origins[field];
    const held = next.selections[field];
    if ((origin === "ai_auto" || origin === "ai_accepted") && held) next.rejected[field] = held;
    next.selections[field] = null;
    delete next.origins[field];
  };
  if (columnId === null) {
    forget(target);
    return { review: next, conflict: null };
  }
  const holder = holderOf(review, columnId, target);
  if (holder !== null) {
    if (!options.move) return { review, conflict: { target, columnId, heldBy: holder, origin } };
    forget(holder);
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

export type DisplayCategory = MappingDecision | "ai_accepted" | "ai_auto" | "ai_rejected";

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
    if (origin === "ai_auto") return "ai_auto";
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
      (review.origins[mapping.target] === "ai_accepted" || review.origins[mapping.target] === "ai_auto") &&
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
  startAnalysis(
    uploadId: string,
    options?: { retry?: boolean; acknowledgePossibleDuplicate?: boolean },
  ): Promise<AnalysisStatus>;
  getAnalysisStatus(uploadId: string): Promise<AnalysisStatus>;
  getAiConsent(): Promise<AiConsentInfo>;
  grantAiConsent(info: AiConsentInfo): Promise<AiConsentInfo>;
  withdrawAiConsent(): Promise<void>;
  prepareMapping(uploadId: string): Promise<MappingProposal>;
  requestJevSuggestions(
    uploadId: string,
    options?: { acknowledgePossibleDuplicate?: boolean },
  ): Promise<{
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
  fetchAnalyticsStatus(uploadId: string): Promise<AnalyticsSubmitResult>;
}

export type Phase = "no_upload" | "loading" | "error" | "ready" | "confirming" | "confirmed";
export type AiStatus = "idle" | "checking" | "consent" | "analysing" | "requesting" | "done" | "error";

export interface MappingViewState {
  uploadId: string | null;
  phase: Phase;
  proposal: MappingProposal | null;
  review: ReviewState;
  loadError: string | null;
  actionError: string | null;
  conflict: AssignmentConflict | null;
  ai: {
    status: AiStatus;
    attempted: boolean;
    model: string | null;
    withheld: AiWithheldSuggestion[];
    error: string | null;
    /** Server-reported consent (never inferred client-side). Null until first checked. */
    consent: AiConsentInfo | null;
    /** A previous request was interrupted after it may have been sent: retrying needs an explicit OK. */
    needsAcknowledgement: boolean;
    /** `auto`: the server analyses in the background. `manual`: automatic analysis is off (explicit button). */
    mode: "unknown" | "auto" | "manual";
    /** Last server-reported analysis status (never inferred client-side). */
    analysis: AnalysisStatus | null;
  };
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
    ai: { status: "idle", attempted: false, model: null, withheld: [], error: null, consent: null, needsAcknowledgement: false, mode: "unknown", analysis: null },
    importResult: null,
    analytics: { status: "idle", result: null },
  };
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export interface ControllerOptions {
  /** Injectable for tests. */
  sleep?: (ms: number) => Promise<void>;
  /** Poll delays; the last value repeats. */
  pollDelaysMs?: number[];
  /** Give up polling after this many checks (the user can check again). */
  maxPolls?: number;
}

const FAILURE_COPY: Record<string, string> = {
  provider_timeout: "The AI service took too long to respond.",
  provider_unavailable: "The AI service is temporarily unavailable.",
  provider_rate_limited: "The AI service is busy.",
  provider_malformed_response: "The AI service returned an unusable answer.",
  provider_missing_target: "The AI service returned an incomplete answer.",
  provider_not_configured: "AI analysis is not set up on this server.",
  consent_withdrawn: "AI analysis was stopped because permission was withdrawn.",
  queue_abandoned: "The analysis did not start.",
  lease_expired_before_dispatch: "The analysis was interrupted before anything was sent.",
  lease_expired_after_dispatch: "The analysis was interrupted and may already have been sent.",
  stale_proposal: "The file mapping changed while the analysis was waiting.",
  ai_disabled: "AI analysis is switched off.",
  user_busy: "Another analysis is already running for your account.",
};

export function describeAnalysisFailure(status: AnalysisStatus): string {
  const base = (status.error_code && FAILURE_COPY[status.error_code]) || "AI analysis could not be completed.";
  const wait = status.retry_after_seconds ? ` Try again in about ${status.retry_after_seconds} seconds.` : "";
  return `${base}${wait} You can still map every column manually.`;
}

export function createMappingController(api: MappingApi, options: ControllerOptions = {}) {
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const pollDelays = options.pollDelaysMs ?? [1000, 1500, 2000, 3000];
  const maxPolls = options.maxPolls ?? 60;
  let state = initialState(null);
  let generation = 0;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<MappingViewState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };
  /** True while the given upload/generation is still the current one. */
  const isCurrent = (gen: number, uploadId: string) => gen === generation && state.uploadId === uploadId;

  function markError(message: string, extra: Partial<MappingViewState["ai"]> = {}) {
    set({ ai: { ...state.ai, status: "error", error: message, ...extra } });
  }

  async function refreshProposalAfterAnalysis(gen: number, uploadId: string, analysis: AnalysisStatus) {
    const proposal = await api.prepareMapping(uploadId);
    if (!isCurrent(gen, uploadId)) return;
    // Backend-approved candidates fill only empty fields (user choices are never touched); nothing is confirmed.
    if (state.phase === "ready" || state.phase === "confirming") {
      set({ proposal, review: applyAutoSelections(proposal, state.review) });
    }
    set({ ai: { ...state.ai, status: "done", attempted: true, error: null, analysis, needsAcknowledgement: false } });
  }

  async function applyAnalysis(gen: number, uploadId: string, analysis: AnalysisStatus): Promise<void> {
    if (!isCurrent(gen, uploadId)) return;
    const mode = analysis.mode;
    switch (analysis.status) {
      case "auto_disabled":
        set({ ai: { ...state.ai, mode: "manual", status: state.ai.status === "analysing" ? "idle" : state.ai.status, analysis } });
        return;
      case "none":
      case "skipped":
        set({ ai: { ...state.ai, mode, status: "idle", analysis, error: null } });
        return;
      case "disabled":
        set({ ai: { ...state.ai, mode, status: "idle", analysis, error: null } });
        return;
      case "consent_required":
        try {
          const consent = await api.getAiConsent();
          if (!isCurrent(gen, uploadId)) return;
          set({ ai: { ...state.ai, mode, status: "consent", consent, analysis, error: null } });
        } catch (error) {
          if (!isCurrent(gen, uploadId)) return;
          markError(messageOf(error, "AI consent could not be checked."), { mode, analysis });
        }
        return;
      case "limit_reached":
      case "rate_limited":
      case "unavailable":
      case "failed":
      case "cancelled":
        markError(describeAnalysisFailure(analysis), {
          mode,
          analysis,
          needsAcknowledgement: analysis.error_code === "lease_expired_after_dispatch",
        });
        return;
      case "succeeded":
        try {
          set({ ai: { ...state.ai, mode, status: "analysing", analysis } });
          await refreshProposalAfterAnalysis(gen, uploadId, analysis);
        } catch (error) {
          if (!isCurrent(gen, uploadId)) return;
          markError(messageOf(error, "AI suggestions could not be displayed."), { mode, analysis });
        }
        return;
      case "queued":
      case "running":
        set({ ai: { ...state.ai, mode, status: "analysing", analysis, error: null, attempted: true } });
        await pollAnalysis(gen, uploadId);
        return;
    }
  }

  async function pollAnalysis(gen: number, uploadId: string): Promise<void> {
    let consecutiveErrors = 0;
    for (let attempt = 0; attempt < maxPolls; attempt += 1) {
      await sleep(pollDelays[Math.min(attempt, pollDelays.length - 1)]);
      if (!isCurrent(gen, uploadId)) return; // upload changed / page left: stop polling
      let analysis: AnalysisStatus;
      try {
        analysis = await api.getAnalysisStatus(uploadId);
        consecutiveErrors = 0;
      } catch (error) {
        consecutiveErrors += 1;
        if (consecutiveErrors >= 3) {
          if (isCurrent(gen, uploadId)) markError(messageOf(error, "AI analysis status could not be read."));
          return;
        }
        continue;
      }
      if (!isCurrent(gen, uploadId)) return;
      if (analysis.status === "queued" || analysis.status === "running") {
        set({ ai: { ...state.ai, analysis } });
        continue;
      }
      await applyAnalysis(gen, uploadId, analysis);
      return;
    }
    if (isCurrent(gen, uploadId)) {
      markError("AI analysis is taking longer than expected. You can keep mapping and check again.");
    }
  }

  async function beginAnalysis(
    gen: number,
    uploadId: string,
    startOptions: { retry?: boolean; acknowledgePossibleDuplicate?: boolean } = {},
  ): Promise<void> {
    if (!isCurrent(gen, uploadId)) return;
    try {
      const analysis = await api.startAnalysis(uploadId, startOptions);
      await applyAnalysis(gen, uploadId, analysis);
    } catch (error) {
      if (!isCurrent(gen, uploadId)) return;
      const code = (error as { code?: string | null }).code ?? null;
      markError(
        code === "ai_previous_attempt_unknown"
          ? messageOf(error, "A previous request may already have been sent.")
          : `${messageOf(error, "AI analysis could not be started.")} You can still map every column manually.`,
        { needsAcknowledgement: code === "ai_previous_attempt_unknown" },
      );
    }
  }

  async function runSuggestionRequest(uploadId: string, gen: number, acknowledgePossibleDuplicate = false) {
    if (!isCurrent(gen, uploadId) || state.phase !== "ready") return;
    set({ ai: { ...state.ai, status: "requesting", attempted: true, error: null, needsAcknowledgement: false } });
    try {
      const result = await api.requestJevSuggestions(
        uploadId,
        acknowledgePossibleDuplicate ? { acknowledgePossibleDuplicate: true } : undefined,
      );
      if (!isCurrent(gen, uploadId)) return;
      // The proposal is the single authority for suggestions; re-read it so the
      // backend decisions (and withheld reasons) are what the user sees.
      const proposal = await api.prepareMapping(uploadId);
      if (!isCurrent(gen, uploadId)) return;
      set({
        proposal,
        ai: { ...state.ai, status: "done", attempted: true, model: result.model, withheld: result.withheld, error: null },
      });
    } catch (error) {
      if (!isCurrent(gen, uploadId)) return;
      // Selections and the existing proposal are untouched by a failed request.
      const code = (error as { code?: string | null }).code ?? null;
      if (code === "ai_previous_attempt_unknown") {
        set({
          ai: { ...state.ai, status: "error", error: messageOf(error, "A previous request may already have been sent."), needsAcknowledgement: true },
        });
        return;
      }
      if (code === "ai_consent_required") {
        // The server says consent is missing or withdrawn: show the disclosure again.
        try {
          const consent = await api.getAiConsent();
          set({ ai: { ...state.ai, status: "consent", consent, error: null } });
          return;
        } catch {
          /* fall through to the error state */
        }
      }
      set({ ai: { ...state.ai, status: "error", error: messageOf(error, "AI suggestions could not be retrieved.") } });
    }
  }

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
        set({
          phase: "ready",
          proposal,
          review: applyAutoSelections(proposal, initialReview(proposal)),
          conflict: null,
          importResult: null,
        });
        // Deterministic results are on screen now. Ask the server to start (or report) the background
        // analysis. This calls only our backend; the server decides about consent and the provider.
        void beginAnalysis(gen, uploadId);
      } catch (error) {
        if (!isCurrent(gen, uploadId)) return;
        set({ phase: "error", loadError: messageOf(error, "Unable to prepare the mapping proposal.") });
      }
    },

    /**
     * The explicit "Get AI suggestions" action. Asks the server whether consent is active:
     * if so the request runs, otherwise the one-time disclosure is shown. Nothing is sent to
     * the provider unless the backend confirms an active consent.
     */
    async startSuggestions() {
      const uploadId = state.uploadId;
      if (!uploadId || state.phase !== "ready") return;
      if (state.ai.status === "checking" || state.ai.status === "requesting" || state.ai.status === "analysing") return;
      const gen = generation;
      if (state.ai.mode === "auto") {
        await beginAnalysis(gen, uploadId); // the server decides (consent, limits); no provider call here
        return;
      }
      set({ ai: { ...state.ai, status: "checking", error: null } });
      try {
        const consent = await api.getAiConsent();
        if (!isCurrent(gen, uploadId)) return;
        if (!consent.is_active) {
          set({ ai: { ...state.ai, status: "consent", consent } });
          return;
        }
        set({ ai: { ...state.ai, consent } });
      } catch (error) {
        if (!isCurrent(gen, uploadId)) return;
        set({ ai: { ...state.ai, status: "error", error: messageOf(error, "AI consent could not be checked.") } });
        return;
      }
      await runSuggestionRequest(uploadId, gen);
    },

    /** The disclosure's "Agree" button: records consent on the server, then requests. */
    async agreeAndRequest() {
      const uploadId = state.uploadId;
      const info = state.ai.consent;
      if (!uploadId || state.phase !== "ready" || state.ai.status !== "consent" || !info) return;
      const gen = generation;
      set({ ai: { ...state.ai, status: "checking", error: null } });
      try {
        const granted = await api.grantAiConsent(info);
        if (!isCurrent(gen, uploadId)) return;
        set({ ai: { ...state.ai, consent: granted } });
      } catch (error) {
        if (!isCurrent(gen, uploadId)) return;
        set({
          ai: { ...state.ai, status: "consent", error: messageOf(error, "Consent could not be recorded.") },
        });
        return;
      }
      if (state.ai.mode === "auto") {
        await beginAnalysis(gen, uploadId);
        return;
      }
      await runSuggestionRequest(uploadId, gen);
    },

    /** Explicit user confirmation after an interrupted request: accept a possible duplicate charge. */
    async retryAcknowledged() {
      const uploadId = state.uploadId;
      if (!uploadId || state.phase !== "ready" || !state.ai.needsAcknowledgement) return;
      if (state.ai.mode === "auto") {
        await beginAnalysis(generation, uploadId, { retry: true, acknowledgePossibleDuplicate: true });
        return;
      }
      await runSuggestionRequest(uploadId, generation, true);
    },

    /** Explicit user retry of a failed/cancelled automatic analysis (never triggered by the client itself). */
    async retryAnalysis() {
      const uploadId = state.uploadId;
      if (!uploadId || state.phase !== "ready" || state.ai.status === "analysing") return;
      await beginAnalysis(generation, uploadId, { retry: true });
    },

    /** Re-read the persisted status once (e.g. after a slow analysis). Never starts anything. */
    async refreshAnalysis() {
      const uploadId = state.uploadId;
      if (!uploadId || state.phase !== "ready") return;
      const gen = generation;
      try {
        const analysis = await api.getAnalysisStatus(uploadId);
        await applyAnalysis(gen, uploadId, analysis);
      } catch (error) {
        if (isCurrent(gen, uploadId)) markError(messageOf(error, "AI analysis status could not be read."));
      }
    },

    cancelConsent() {
      if (state.ai.status === "consent") set({ ai: { ...state.ai, status: "idle", error: null } });
    },

    /** Withdraws consent on the server: stops new requests; sent data cannot be recalled. */
    async withdrawConsent() {
      try {
        await api.withdrawAiConsent();
        const consent = await api.getAiConsent();
        set({ ai: { ...state.ai, status: "idle", error: null, consent } });
      } catch (error) {
        set({ ai: { ...state.ai, error: messageOf(error, "Consent could not be withdrawn.") } });
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
        let result = await api.submitAnalytics(uploadId);
        if (!isCurrent(gen, uploadId)) return;
        // Dispatch runs in the background on the server; poll until nothing is pending.
        while (result.status === "sending") {
          set({ analytics: { status: "submitting", result } });
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (!isCurrent(gen, uploadId)) return;
          result = await api.fetchAnalyticsStatus(uploadId);
          if (!isCurrent(gen, uploadId)) return;
        }
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
