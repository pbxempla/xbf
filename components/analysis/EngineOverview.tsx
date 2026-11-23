"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchAnalyticsSummary } from "@/lib/mapping/api";
import type { AnalyticsSummary } from "@/lib/mapping/contracts";
import {
  breakdownRows,
  dollars,
  isHighSeverity,
  percent,
  prettyKey,
} from "@/lib/mapping/engine-summary";
import { WorkOrderList } from "@/components/analysis/WorkOrderList";

const BREAKDOWNS: { field: string; title: string; limit?: number }[] = [
  { field: "severity_assessed", title: "Severity" },
  { field: "fm_type", title: "FM type" },
  { field: "fm_subcategory", title: "FM subcategory", limit: 8 },
  { field: "fault_nature", title: "Fault nature" },
  { field: "resolution_effectiveness", title: "Resolution effectiveness" },
  { field: "closure_data_quality", title: "Closure data quality" },
  { field: "cost_classification", title: "Cost classification" },
  { field: "ticket_sentiment", title: "Ticket sentiment" },
];

function StatTile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-2xl bg-app-canvas p-4">
      <p className="text-xs text-app-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium tracking-tight text-app-ink">{value}</p>
      {note && <p className="mt-1 text-xs text-app-muted">{note}</p>}
    </div>
  );
}

function BreakdownCard({
  field,
  title,
  counts,
  limit,
}: {
  field: string;
  title: string;
  counts: Record<string, number> | undefined;
  limit?: number;
}) {
  const { rows, rest } = breakdownRows(field, counts, limit);
  return (
    <section aria-label={title} className="rounded-2xl bg-app-canvas p-4">
      <h3 className="text-sm font-medium text-app-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-app-muted">No data</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="capitalize text-app-ink">{prettyKey(row.key)}</span>
                <span className="shrink-0 text-app-muted">
                  <span className="font-medium text-app-ink">{row.count.toLocaleString()}</span>{" "}
                  · {row.share}%
                </span>
              </div>
              <div aria-hidden="true" className="mt-1 h-1.5 overflow-hidden rounded-full bg-white">
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
            <li className="text-xs text-app-muted">+ {rest} more value{rest === 1 ? "" : "s"}</li>
          )}
        </ul>
      )}
    </section>
  );
}

/** The engine's analysis for one upload: key numbers, breakdowns, what needs attention, detail. */
export function EngineOverview({ uploadId }: { uploadId: string }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAnalyticsSummary(uploadId)
      .then((result) => {
        if (active) setSummary(result);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load the analysis.");
      });
    return () => {
      active = false;
    };
  }, [uploadId]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-red-800">
        {error}
      </p>
    );
  }
  if (!summary) {
    return (
      <div role="status" aria-label="Loading analysis" className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-app-canvas" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-app-canvas" />
      </div>
    );
  }

  const skipped = [
    summary.fault_skipped > 0
      ? `${summary.fault_skipped.toLocaleString()} had no title or description, so fault analysis was skipped.`
      : null,
    summary.closure_skipped > 0
      ? `${summary.closure_skipped.toLocaleString()} had no resolution notes, so closure analysis was skipped.`
      : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatTile
            label="Work orders analysed"
            value={summary.analysed.toLocaleString()}
            note={summary.failed > 0 ? `${summary.failed.toLocaleString()} could not be analysed` : undefined}
          />
          <StatTile label="High severity (P1–P2)" value={summary.high_severity.toLocaleString()} />
          <StatTile label="Follow-ups needed" value={summary.follow_up_needed.toLocaleString()} />
          <StatTile
            label="Average confidence"
            value={percent(summary.avg_confidence.fault)}
            note={`Closure ${percent(summary.avg_confidence.closure)}`}
          />
          <StatTile
            label="Severity differs from your priority"
            value={summary.source_disagreements.toLocaleString()}
          />
        </div>
        {skipped.length > 0 && (
          <p className="mt-3 text-sm text-app-muted">{skipped.join(" ")}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BREAKDOWNS.map(({ field, title, limit }) => (
          <BreakdownCard
            key={field}
            field={field}
            title={title}
            counts={summary.breakdowns[field]}
            limit={limit}
          />
        ))}
      </div>

      {summary.inventory.rows_using_parts > 0 && (
        <p className="text-sm text-app-muted">
          {summary.inventory.rows_using_parts.toLocaleString()} work orders used parts
          {summary.inventory.top_items.length > 0
            ? `, most often ${summary.inventory.top_items
                .map((part) => `${part.item} (${part.count})`)
                .join(", ")}`
            : ""}
          .
        </p>
      )}

      <section aria-label="Needs attention">
        <h3 className="text-base font-medium tracking-tight">Needs attention</h3>
        <p className="mb-3 mt-1 text-sm text-app-muted">
          High-severity jobs, fixes the engine thinks may not hold, and jobs that need a follow-up,
          most severe first.
        </p>
        <WorkOrderList
          key={`${uploadId}-attention`}
          uploadId={uploadId}
          variant="attention"
          filter="attention"
          pageSize={10}
        />
      </section>

      <section aria-label="All work orders">
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className="text-base font-medium tracking-tight">All work orders</span>
          <ChevronDown
            aria-hidden="true"
            className={`h-5 w-5 text-app-muted transition-transform motion-reduce:transition-none ${
              showAll ? "rotate-180" : ""
            }`}
          />
        </button>
        {showAll && (
          <div className="mt-3">
            <WorkOrderList key={`${uploadId}-all`} uploadId={uploadId} variant="table" />
          </div>
        )}
      </section>

      {summary.usage.total_tokens > 0 && (
        <p className="text-xs text-app-muted">
          Analysed with {summary.usage.models.length > 0 ? summary.usage.models.join(", ") : "the engine"}
          {" · "}
          {summary.usage.total_tokens.toLocaleString()} tokens · about{" "}
          {dollars(summary.usage.estimated_usd)}
        </p>
      )}
    </div>
  );
}
