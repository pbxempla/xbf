/**
 * Readers for the engine's enrichment fields. Some fields are plain strings (`severity_assessed`),
 * others are ranked candidate lists `[{ value, confidence, reason }]` (`fm_type`,
 * `fm_subcategory`, `fault_nature`). Only type-free helpers so tests can run them directly.
 */
interface Candidate {
  value?: unknown;
  confidence?: unknown;
  reason?: unknown;
}

const isCandidate = (item: unknown): item is Candidate =>
  typeof item === "object" && item !== null && "value" in item;

function best(field: unknown): Candidate | null {
  if (Array.isArray(field)) {
    const candidates = field.filter(
      (item): item is Candidate =>
        isCandidate(item) && item.value !== null && item.value !== undefined && item.value !== "",
    );
    if (candidates.length === 0) return null;
    const score = (item: Candidate) =>
      typeof item.confidence === "number" ? item.confidence : -1;
    // Most confident wins; ties keep the engine's own order.
    return candidates.reduce((top, item) => (score(item) > score(top) ? item : top));
  }
  return isCandidate(field) ? field : null;
}

/** The value of a plain field, or of the most confident candidate; null when absent. */
export function topValue(field: unknown): unknown {
  if (field === null || field === undefined || field === "") return null;
  if (Array.isArray(field) || (typeof field === "object" && "value" in (field as object))) {
    return best(field)?.value ?? null;
  }
  return field;
}

/** The engine's reason for the chosen candidate, when it gave one. */
export function topReason(field: unknown): string | null {
  const reason = best(field)?.reason;
  return typeof reason === "string" && reason ? reason : null;
}

/** Reason text for a field of an enrichment section (candidate reason, or a `<name>_reason`). */
export function reasonFor(section: Record<string, unknown> | null, name: string): string | null {
  if (!section) return null;
  const own = topReason(section[name]);
  if (own) return own;
  const sibling = section[name === "severity_assessed" ? "severity_reason" : `${name}_reason`];
  return typeof sibling === "string" && sibling ? sibling : null;
}
