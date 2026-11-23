/** Pure helpers for the engine overview on the dashboard (no React, so they can be tested). */

export interface BreakdownRow {
  key: string;
  count: number;
  /** 0..100, share of all counted work orders for this field (not just the rows shown). */
  share: number;
}

const SEVERITY_ORDER = ["P1", "P2", "P3", "P4", "P5"];

/**
 * Rows for one breakdown card. Severity keeps its natural order (P1 first); every other field is
 * sorted by count, then name. `limit` keeps the biggest rows and `rest` reports what was left out.
 */
export function breakdownRows(
  field: string,
  counts: Record<string, number> | undefined,
  limit = 8,
): { rows: BreakdownRow[]; rest: number } {
  const entries = Object.entries(counts ?? {}).filter(([, count]) => count > 0);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  if (field === "severity_assessed") {
    entries.sort(
      (a, b) => severityIndex(a[0]) - severityIndex(b[0]) || a[0].localeCompare(b[0]),
    );
  } else {
    entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }
  const shown = entries.slice(0, limit);
  return {
    rows: shown.map(([key, count]) => ({
      key,
      count,
      share: total > 0 ? Math.round((count / total) * 100) : 0,
    })),
    rest: entries.length - shown.length,
  };
}

function severityIndex(key: string): number {
  const index = SEVERITY_ORDER.indexOf(key.toUpperCase());
  return index === -1 ? SEVERITY_ORDER.length : index;
}

export const isHighSeverity = (severity: unknown): boolean =>
  typeof severity === "string" && ["P1", "P2"].includes(severity.toUpperCase());

/** 0.953 -> "95%"; null when the engine gave no confidence. */
export function percent(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : "—";
}

/** Estimated engine cost in US dollars, with enough decimals for tiny amounts. */
export function dollars(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value < 1 ? value.toFixed(4) : value.toFixed(2)}`;
}

export const prettyKey = (key: string): string => key.replace(/_/g, " ");
