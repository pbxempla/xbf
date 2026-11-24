import { formatValue, isAvailable, isRanked, label } from "@/lib/insights/format";
import type { AnalyticsSummary, InsightsResponse } from "@/lib/mapping/contracts";

/**
 * Quotes a cell for CSV. Cells that start with = + - or @ are prefixed with an apostrophe so a
 * spreadsheet never runs text from the customer's own data (asset names, trades) as a formula.
 */
export function csvCell(value: string | number): string {
  let text = String(value);
  const looksNumeric = typeof value === "number" || /^[+-]?\d[\d,]*(\.\d+)?(%| h| days)?$/.test(text);
  if (!looksNumeric && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One flat table: section, item, detail, value. Stable column names for BI tools. */
export function reportToCsv(insights: InsightsResponse, summary: AnalyticsSummary | null): string {
  const rows: Array<Array<string | number>> = [["section", "item", "detail", "value"]];

  for (const lens of Object.values(insights.lenses)) {
    for (const [name, metric] of Object.entries(lens.metrics)) {
      rows.push([
        lens.title,
        label(name),
        isAvailable(metric) ? "metric" : `not available${metric.reason ? `: ${metric.reason}` : ""}`,
        isAvailable(metric) ? formatValue(name, metric.value) : "",
      ]);
    }
    for (const [name, table] of Object.entries(lens.tables)) {
      for (const item of table.filter(isRanked)) {
        rows.push([lens.title, label(name), item.key, item.value]);
      }
    }
  }

  if (summary) {
    rows.push(["Engine findings", "Work orders analysed", "", summary.analysed]);
    rows.push(["Engine findings", "High severity (P1-P2)", "", summary.high_severity]);
    rows.push(["Engine findings", "Follow-ups needed", "", summary.follow_up_needed]);
    for (const [field, counts] of Object.entries(summary.breakdowns)) {
      for (const [value, count] of Object.entries(counts)) {
        rows.push(["Engine findings", label(field), value, count]);
      }
    }
  }

  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // The BOM makes Excel read the file as UTF-8.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
