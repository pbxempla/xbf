"use client";

import React from "react";
import { Download, Printer } from "lucide-react";
import { formatValue, isAvailable, isRanked, label } from "@/lib/insights/format";
import type { Ranked } from "@/lib/insights/format";
import { downloadCsv, reportToCsv } from "@/lib/reports/csv";
import { breakdownRows, isHighSeverity, prettyKey } from "@/lib/mapping/engine-summary";
import type { AnalyticsSummary, InsightLens, InsightsResponse } from "@/lib/mapping/contracts";

const LENS_ORDER = [
  "operations",
  "cost_management",
  "finance",
  "sla_contract_compliance",
  "contractor_performance",
  "training_productivity",
  "data_quality",
];

const BREAKDOWNS: Array<{ field: string; title: string; limit?: number }> = [
  { field: "severity_assessed", title: "Severity" },
  { field: "fm_type", title: "FM type" },
  { field: "fault_nature", title: "Fault nature" },
  { field: "resolution_effectiveness", title: "Resolution effectiveness" },
  { field: "cost_classification", title: "Cost classification" },
];

function metricNumber(insights: InsightsResponse, lens: string, key: string): number | null {
  const metric = insights.lenses[lens]?.metrics[key];
  return metric && isAvailable(metric) && typeof metric.value === "number" ? metric.value : null;
}

function topRanked(insights: InsightsResponse, lens: string, table: string): Ranked | null {
  return insights.lenses[lens]?.tables[table]?.find(isRanked) ?? null;
}

/** Plain sentences built only from the computed figures; nothing is invented or estimated. */
export function summarySentences(
  insights: InsightsResponse,
  summary: AnalyticsSummary | null,
): string[] {
  const out: string[] = [];
  const count = metricNumber(insights, "operations", "work_order_count");
  if (count !== null) {
    out.push(`${count.toLocaleString()} work orders from ${insights.file_name} were analysed.`);
  }

  const reactive = metricNumber(insights, "operations", "reactive_pct");
  const planned = metricNumber(insights, "operations", "ppm_pct");
  if (reactive !== null && planned !== null) {
    out.push(`${reactive}% of the work was reactive and ${planned}% was planned (PPM).`);
  } else if (reactive !== null) {
    out.push(`${reactive}% of the work was reactive.`);
  }

  const spend = metricNumber(insights, "cost_management", "total_spend");
  if (spend !== null) {
    const labour = metricNumber(insights, "cost_management", "labour_share_pct");
    const parts = metricNumber(insights, "cost_management", "parts_share_pct");
    const split = labour !== null && parts !== null ? `, split ${labour}% labour and ${parts}% parts` : "";
    out.push(`Recorded maintenance spend was ${spend.toLocaleString()}${split}.`);
  }

  const topAsset = topRanked(insights, "cost_management", "top_assets_by_spend");
  if (topAsset) {
    out.push(`The highest-spend asset was ${topAsset.key} at ${topAsset.value.toLocaleString()}.`);
  }

  const anomalies = metricNumber(insights, "cost_management", "cost_anomaly_count");
  if (anomalies !== null && anomalies > 0) {
    out.push(`${anomalies.toLocaleString()} cost anomalies were flagged for review.`);
  }

  const statutory = metricNumber(insights, "sla_contract_compliance", "statutory_work_orders");
  if (statutory !== null && statutory > 0) {
    out.push(`${statutory.toLocaleString()} statutory work orders were recorded.`);
  }

  if (summary && summary.analysed > 0) {
    out.push(
      `The analysis engine flagged ${summary.high_severity.toLocaleString()} high-severity (P1–P2) work orders and ${summary.follow_up_needed.toLocaleString()} that need follow-up.`,
    );
  }

  const completeness = metricNumber(insights, "data_quality", "completeness_score");
  const gaps = unavailableCount(insights);
  if (completeness !== null) {
    out.push(
      `Data completeness is ${completeness}%${
        gaps > 0
          ? `, and ${gaps} measure${gaps === 1 ? "" : "s"} could not be calculated because the file lacks the data they need`
          : ""
      }.`,
    );
  }
  return out;
}

function unavailableCount(insights: InsightsResponse): number {
  return Object.values(insights.lenses).reduce(
    (sum, lens) =>
      sum + Object.values(lens.metrics).filter((metric) => !isAvailable(metric)).length,
    0,
  );
}

function BarList({ title, items }: { title: string; items: Ranked[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <div className="break-inside-avoid">
      <h4 className="text-xs font-medium uppercase tracking-wide text-app-muted">{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.slice(0, 5).map((item) => (
          <li key={item.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-app-ink">{item.key}</span>
              <span className="shrink-0 font-medium text-app-ink">
                {item.value.toLocaleString()}
              </span>
            </div>
            <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-app-canvas">
              <div
                className="h-full rounded-full bg-app-ink"
                style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LensSection({ lens }: { lens: InsightLens }) {
  const entries = Object.entries(lens.metrics);
  const available = entries.filter(([, metric]) => isAvailable(metric));
  const missing = entries.filter(([, metric]) => !isAvailable(metric));
  const tables = Object.entries(lens.tables)
    .map(([name, rows]) => [name, rows.filter(isRanked)] as const)
    .filter(([, rows]) => rows.length > 0);

  return (
    <section
      aria-labelledby={`lens-${lens.key}`}
      className="break-inside-avoid rounded-3xl bg-white p-6 print:rounded-none print:p-0 print:pt-6"
    >
      <h2 id={`lens-${lens.key}`} className="text-lg font-medium tracking-tight">
        {lens.title}
      </h2>

      {available.length > 0 ? (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {available.map(([name, metric]) => (
            <div key={name}>
              <dt className="text-sm text-app-muted">{label(name)}</dt>
              <dd className="mt-0.5 text-2xl font-medium tracking-tight">
                {formatValue(name, metric.value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-app-muted">
          There is not enough data in this file to report on this area.
        </p>
      )}

      {tables.length > 0 && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {tables.map(([name, rows]) => (
            <BarList key={name} title={label(name)} items={rows} />
          ))}
        </div>
      )}

      {missing.length > 0 && (
        <p className="mt-5 text-xs leading-5 text-app-muted">
          Not reported, missing data: {missing.map(([name]) => label(name)).join(", ")}.
        </p>
      )}
    </section>
  );
}

function EngineSection({ summary }: { summary: AnalyticsSummary }) {
  return (
    <section
      aria-labelledby="engine-findings"
      className="rounded-3xl bg-white p-6 print:break-before-page print:rounded-none print:p-0"
    >
      <h2 id="engine-findings" className="text-lg font-medium tracking-tight">
        Engine findings
      </h2>
      <p className="mt-1 text-sm text-app-muted">
        What the analysis engine found in the free-text of your work orders.
      </p>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {[
          ["Analysed", summary.analysed],
          ["High severity (P1–P2)", summary.high_severity],
          ["Follow-ups needed", summary.follow_up_needed],
          ["Severity differs from yours", summary.source_disagreements],
        ].map(([name, value]) => (
          <div key={name}>
            <dt className="text-sm text-app-muted">{name}</dt>
            <dd className="mt-0.5 text-2xl font-medium tracking-tight">
              {(value as number).toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {BREAKDOWNS.map(({ field, title, limit }) => {
          const { rows, rest } = breakdownRows(field, summary.breakdowns[field], limit);
          if (rows.length === 0) return null;
          return (
            <div key={field} className="break-inside-avoid">
              <h3 className="text-sm font-medium">{title}</h3>
              <ul className="mt-2 space-y-2">
                {rows.map((row) => (
                  <li key={row.key}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="capitalize">{prettyKey(row.key)}</span>
                      <span className="shrink-0 text-app-muted">
                        <span className="font-medium text-app-ink">
                          {row.count.toLocaleString()}
                        </span>{" "}
                        · {row.share}%
                      </span>
                    </div>
                    <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-app-canvas">
                      <div
                        className={`h-full rounded-full ${
                          field === "severity_assessed" && isHighSeverity(row.key)
                            ? "bg-[#e23b4a]"
                            : "bg-app-ink"
                        }`}
                        style={{ width: `${Math.max(row.share, 2)}%` }}
                      />
                    </div>
                  </li>
                ))}
                {rest > 0 && (
                  <li className="text-xs text-app-muted">
                    + {rest} more value{rest === 1 ? "" : "s"}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const buttonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";

/** A read-only brief for one analysed upload. Figures come from the processing engine unedited. */
export function ReportView({
  insights,
  summary,
}: {
  insights: InsightsResponse;
  summary: AnalyticsSummary | null;
}) {
  const lenses = LENS_ORDER.map((key) => insights.lenses[key]).filter(
    (lens): lens is InsightLens => Boolean(lens),
  );
  const sentences = summarySentences(insights, summary);
  const completeness = metricNumber(insights, "data_quality", "completeness_score");
  const count = metricNumber(insights, "operations", "work_order_count");
  const generated = new Date(insights.computed_at).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const baseName = insights.file_name.replace(/\.[^.]+$/, "") || "report";

  return (
    <div className="flex flex-col gap-4 print:gap-6">
      <header className="rounded-3xl bg-white p-6 sm:p-8 print:rounded-none print:p-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-app-muted">Maintenance performance report</p>
            <h2 className="mt-1 break-words text-2xl font-medium tracking-tight sm:text-3xl">
              {insights.file_name}
            </h2>
            <p className="mt-2 text-sm text-app-muted">
              Generated {generated}
              {count !== null ? ` · ${count.toLocaleString()} work orders` : ""}
              {completeness !== null ? ` · ${completeness}% data completeness` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              type="button"
              onClick={() => downloadCsv(`${baseName}-report.csv`, reportToCsv(insights, summary))}
              className={`${buttonClass} border border-black hover:bg-app-canvas`}
            >
              <Download aria-hidden="true" className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={`${buttonClass} bg-black text-white hover:bg-app-ink`}
            >
              <Printer aria-hidden="true" className="h-4 w-4" />
              Print or save as PDF
            </button>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="report-summary"
        className="break-inside-avoid rounded-3xl bg-white p-6 sm:p-8 print:rounded-none print:p-0"
      >
        <h2 id="report-summary" className="text-lg font-medium tracking-tight">
          Summary
        </h2>
        {sentences.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 marker:text-app-muted">
            {sentences.map((sentence) => (
              <li key={sentence}>{sentence}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-app-muted">
            There is not enough data in this file to write a summary.
          </p>
        )}
        <p className="mt-4 text-xs text-app-muted">
          Generated from your data. Every figure is computed from the uploaded file and cannot be edited.
        </p>
      </section>

      {lenses.map((lens) => (
        <LensSection key={lens.key} lens={lens} />
      ))}

      {summary && summary.analysed > 0 ? <EngineSection summary={summary} /> : null}

      <section
        aria-labelledby="report-notes"
        className="break-inside-avoid rounded-3xl bg-white p-6 text-sm leading-6 text-app-muted print:rounded-none print:p-0"
      >
        <h2 id="report-notes" className="text-lg font-medium tracking-tight text-app-ink">
          Data notes
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-app-muted">
          <li>Source file: {insights.file_name}.</li>
          <li>Figures computed on {generated} using rules version {insights.rules_version}.</li>
          {summary ? (
            <li>
              {summary.analysed.toLocaleString()} work orders analysed by the engine
              {summary.failed > 0 ? `, ${summary.failed.toLocaleString()} could not be analysed` : ""}
              {summary.fault_skipped > 0
                ? `, ${summary.fault_skipped.toLocaleString()} had no title or description (fault analysis skipped)`
                : ""}
              {summary.closure_skipped > 0
                ? `, ${summary.closure_skipped.toLocaleString()} had no resolution notes (closure analysis skipped)`
                : ""}
              .
            </li>
          ) : (
            <li>The engine analysis for this upload is not available yet.</li>
          )}
          <li>
            Measures marked as missing data are left out rather than estimated.
          </li>
        </ul>
      </section>
    </div>
  );
}
