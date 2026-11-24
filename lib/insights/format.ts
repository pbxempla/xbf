import type { InsightMetric } from "@/lib/mapping/contracts";

const ACRONYMS: Record<string, string> = { sla: "SLA", ppm: "PPM", wo: "Work order" };

/** "average_fix_time_hours" -> "Average fix time"; the unit is added to the value instead. */
export function label(key: string): string {
  const text = key
    .replace(/_(pct|hours|days|score)$/, "")
    .split("_")
    .map((word) => ACRONYMS[word] ?? word)
    .join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatValue(key: string, value: InsightMetric["value"]): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    const text = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (key.endsWith("_pct") || key.endsWith("_score")) return `${text}%`;
    if (key.endsWith("_hours")) return `${text} h`;
    if (key.endsWith("_days")) return `${text} days`;
    return text;
  }
  return String(value ?? "—");
}

export type Ranked = { key: string; value: number };

export const isRanked = (item: unknown): item is Ranked =>
  typeof item === "object" &&
  item !== null &&
  "key" in item &&
  "value" in item &&
  typeof (item as Ranked).value === "number";

export const isAvailable = (metric: InsightMetric): boolean =>
  metric.status === "ok" && metric.value !== null;
