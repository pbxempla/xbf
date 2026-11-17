"use client";

import React from "react";
import { CANONICAL_FIELD_LABELS } from "@/lib/mapping/contracts";
import type {
  CanonicalWorkOrderField,
  MappingField,
  MappingProposal,
  MappingSourceColumn,
} from "@/lib/mapping/contracts";
import { CATEGORY_LABEL, CATEGORY_TONE, reasonText } from "@/lib/mapping/presentation";
import {
  displayCategory,
  pendingSuggestion,
  rejectedSuggestion,
  REQUIRED_TARGETS,
} from "@/lib/mapping/review";
import type { AssignmentConflict, DisplayCategory, ReviewState } from "@/lib/mapping/review";

const buttonClass =
  "min-h-11 rounded-lg border border-[#737b82] bg-white px-3 text-xs font-semibold text-app-ink transition-colors hover:bg-app-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:cursor-not-allowed disabled:opacity-50";

export function StatusBadge({ category }: { category: DisplayCategory }) {
  return (
    <span
      data-category={category}
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${CATEGORY_TONE[category]}`}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}

function columnLabel(columns: MappingSourceColumn[], columnId: string): string {
  const column = columns.find((item) => item.source_column_id === columnId);
  return column ? column.name || `Column ${column.index + 1}` : columnId;
}

function FieldCard({
  proposal,
  review,
  mapping,
  disabled,
  onAccept,
  onReject,
  onPick,
}: {
  proposal: MappingProposal;
  review: ReviewState;
  mapping: MappingField;
  disabled: boolean;
  onAccept: (target: CanonicalWorkOrderField) => void;
  onReject: (target: CanonicalWorkOrderField) => void;
  onPick: (target: CanonicalWorkOrderField, columnId: string | null) => void;
}) {
  const target = mapping.target;
  const category = displayCategory(proposal, review, target);
  const selected = review.selections[target] ?? null;
  const suggestion = pendingSuggestion(proposal, review, target);
  const rejected = rejectedSuggestion(proposal, review, target);
  const isRequired = (REQUIRED_TARGETS as readonly string[]).includes(target);
  const selectId = `pick-${target}`;
  const candidates = mapping.candidate_source_column_ids.filter((id) => id !== selected);

  return (
    <li
      data-target={target}
      className="flex flex-col gap-2 rounded-xl border border-app-line bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-app-ink">
          {CANONICAL_FIELD_LABELS[target]}
          {isRequired && <span className="ml-2 text-xs font-medium text-app-muted">Required</span>}
        </h3>
        <StatusBadge category={category} />
      </div>

      {selected !== null ? (
        <p className="text-sm text-app-ink">
          Column: <strong>{columnLabel(proposal.columns, selected)}</strong>
        </p>
      ) : (
        <p className="text-sm text-app-muted">No column selected.</p>
      )}

      {selected === null && (mapping.reasons?.length ?? 0) > 0 && (
        <ul className="list-disc pl-5 text-xs text-app-muted">
          {mapping.reasons!.map((code) => (
            <li key={code}>{reasonText(code)}</li>
          ))}
        </ul>
      )}

      {suggestion && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
          <p>
            AI suggests <strong>{columnLabel(proposal.columns, suggestion.source_column_id)}</strong>
            {" "}
            <span className="text-xs">(model score {Math.round(suggestion.confidence * 100)}%, not a guarantee)</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" disabled={disabled} onClick={() => onAccept(target)} className={buttonClass}>
              Accept suggestion
            </button>
            <button type="button" disabled={disabled} onClick={() => onReject(target)} className={buttonClass}>
              Reject suggestion
            </button>
          </div>
        </div>
      )}

      {rejected && selected === null && (
        <p className="text-xs text-app-muted">
          You rejected the AI suggestion ({columnLabel(proposal.columns, rejected.source_column_id)}).
        </p>
      )}

      {mapping.ai_candidate && !mapping.ai_candidate.actionable && selected === null && (
        <p className="text-xs text-app-muted">
          An AI candidate was withheld:{" "}
          {mapping.ai_candidate.withheld_reasons.map(reasonText).join(" ")}
        </p>
      )}

      {selected === null && candidates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted">
          <span>Possible columns:</span>
          {candidates.map((columnId) => (
            <button
              key={columnId}
              type="button"
              disabled={disabled}
              onClick={() => onPick(target, columnId)}
              className={buttonClass}
            >
              Use {columnLabel(proposal.columns, columnId)}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={selectId} className="text-xs font-medium text-app-muted">
          {selected === null ? "Choose a column" : "Change column"}
        </label>
        <select
          id={selectId}
          disabled={disabled}
          value={selected ?? ""}
          onChange={(event) => onPick(target, event.target.value || null)}
          className="min-h-11 min-w-0 max-w-full rounded-lg border border-[#737b82] bg-white px-3 text-sm text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent disabled:opacity-60"
        >
          <option value="">Not mapped</option>
          {proposal.columns.map((column) => (
            <option key={column.source_column_id} value={column.source_column_id}>
              {column.name || `Column ${column.index + 1}`}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

interface PanelProps {
  proposal: MappingProposal;
  review: ReviewState;
  disabled: boolean;
  onAccept: (target: CanonicalWorkOrderField) => void;
  onReject: (target: CanonicalWorkOrderField) => void;
  onPick: (target: CanonicalWorkOrderField, columnId: string | null) => void;
}

export function RequiredFieldsPanel(props: PanelProps) {
  const required = REQUIRED_TARGETS.map((target) =>
    props.proposal.mappings.find((mapping) => mapping.target === target),
  ).filter((mapping): mapping is MappingField => mapping !== undefined);
  return (
    <section aria-labelledby="required-fields-heading" className="rounded-xl border-2 border-app-ink/20 bg-app-canvas p-4">
      <h2 id="required-fields-heading" className="text-base font-semibold text-app-ink">
        Required fields
      </h2>
      <p className="mt-1 text-xs text-app-muted">
        Facility ID and work order ID must be mapped before you can continue. Nothing is guessed for you.
      </p>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {required.map((mapping) => (
          <FieldCard key={mapping.target} mapping={mapping} {...props} />
        ))}
      </ul>
    </section>
  );
}

/** Fields (other than the required ones) that still need a decision from the user. */
export function needsReview(proposal: MappingProposal, review: ReviewState): MappingField[] {
  return proposal.mappings.filter((mapping) => {
    if ((REQUIRED_TARGETS as readonly string[]).includes(mapping.target)) return false;
    if (review.selections[mapping.target] != null) return false;
    const category = displayCategory(proposal, review, mapping.target);
    return category === "ai_suggestion" || category === "ambiguous" || category === "ai_rejected";
  });
}

export function ReviewList(props: PanelProps) {
  const items = needsReview(props.proposal, props.review);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="needs-review-heading">
      <h2 id="needs-review-heading" className="text-base font-semibold text-app-ink">
        Needs your review ({items.length})
      </h2>
      <ul className="mt-3 grid gap-3 lg:grid-cols-2">
        {items.map((mapping) => (
          <FieldCard key={mapping.target} mapping={mapping} {...props} />
        ))}
      </ul>
    </section>
  );
}

export function ConflictBanner({
  conflict,
  columns,
  onMove,
  onDismiss,
}: {
  conflict: AssignmentConflict;
  columns: MappingSourceColumn[];
  onMove: () => void;
  onDismiss: () => void;
}) {
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p>
        <strong>{columnLabel(columns, conflict.columnId)}</strong> is already used for{" "}
        <strong>{CANONICAL_FIELD_LABELS[conflict.heldBy]}</strong>. One column can only map to one field.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={onMove} className={buttonClass}>
          Use it for {CANONICAL_FIELD_LABELS[conflict.target]} instead
        </button>
        <button type="button" onClick={onDismiss} className={buttonClass}>
          Keep the current mapping
        </button>
      </div>
    </div>
  );
}
