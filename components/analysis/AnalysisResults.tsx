"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAnalyticsResults, fetchAnalyticsSummary } from "@/lib/mapping/api";
import type {
  AnalyticsResultItem,
  AnalyticsSummary,
} from "@/lib/mapping/contracts";

const SUMMARY_GROUPS: { key: string; label: string }[] = [
  { key: "severity_assessed", label: "Severity" },
  { key: "fm_type", label: "FM type" },
  { key: "fault_nature", label: "Fault nature" },
  { key: "resolution_effectiveness", label: "Resolution effectiveness" },
  { key: "follow_up_needed", label: "Follow-up needed" },
  { key: "cost_classification", label: "Cost classification" },
];

const pretty = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value).replace(/_/g, " ");
};

const field = (data: Record<string, unknown> | null, key: string): string =>
  data ? pretty(data[key]) : "—";

export function AnalysisResults({ uploadId }: { uploadId: string }) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [items, setItems] = useState<AnalyticsResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchAnalyticsSummary(uploadId),
      fetchAnalyticsResults(uploadId),
    ])
      .then(([nextSummary, page]) => {
        if (!active) return;
        setSummary(nextSummary);
        setItems(page.items);
        setTotal(page.total);
        setNextCursor(page.next_cursor);
        setLoaded(true);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load the results.",
        );
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [uploadId]);

  const loadMore = useCallback(async () => {
    if (nextCursor === null) return;
    setLoadingMore(true);
    try {
      const page = await fetchAnalyticsResults(uploadId, nextCursor);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load more.",
      );
    } finally {
      setLoadingMore(false);
    }
  }, [uploadId, nextCursor]);

  if (!loaded) {
    return (
      <div
        role="status"
        aria-label="Loading results"
        className="mt-8 space-y-4"
      >
        <div className="h-24 w-full animate-pulse rounded-2xl bg-app-canvas" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-app-canvas" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <p
        role="alert"
        className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
      >
        {error}
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-6">
      {summary && (
        <>
          <p className="text-sm text-app-muted">
            {summary.analysed.toLocaleString()} work orders analysed
            {summary.failed > 0
              ? `, ${summary.failed.toLocaleString()} could not be analysed`
              : ""}
            .
            {summary.fault_skipped > 0 &&
              ` ${summary.fault_skipped.toLocaleString()} had no title or description, so fault analysis was skipped.`}
            {summary.closure_skipped > 0 &&
              ` ${summary.closure_skipped.toLocaleString()} had no resolution notes, so closure analysis was skipped.`}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SUMMARY_GROUPS.map(({ key, label }) => {
              const entries = Object.entries(
                summary.breakdowns[key] ?? {},
              ).sort((a, b) => b[1] - a[1]);
              return (
                <section
                  key={key}
                  aria-label={label}
                  className="rounded-2xl bg-app-canvas p-4"
                >
                  <h3 className="text-sm font-medium text-app-ink">{label}</h3>
                  {entries.length === 0 ? (
                    <p className="mt-2 text-sm text-app-muted">No data</p>
                  ) : (
                    <ul className="mt-2 space-y-1 text-sm">
                      {entries.map(([value, count]) => (
                        <li
                          key={value}
                          className="flex justify-between gap-4 text-app-muted"
                        >
                          <span className="capitalize">{pretty(value)}</span>
                          <span className="font-medium text-app-ink">
                            {count.toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}

      <div className="overflow-x-auto rounded-2xl border border-app-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-app-canvas text-app-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Work order</th>
              <th scope="col" className="px-4 py-3 font-medium">Severity</th>
              <th scope="col" className="px-4 py-3 font-medium">FM type</th>
              <th scope="col" className="px-4 py-3 font-medium">Fault nature</th>
              <th scope="col" className="px-4 py-3 font-medium">Resolution</th>
              <th scope="col" className="px-4 py-3 font-medium">Follow-up</th>
              <th scope="col" className="px-4 py-3 font-medium">Summary</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.row_number} className="border-t border-app-line">
                <th scope="row" className="px-4 py-3 font-medium text-app-ink">
                  {item.wo_id}
                </th>
                {item.engine_status === "failed" ? (
                  <td colSpan={6} className="px-4 py-3 text-app-muted">
                    Not analysed by the engine
                  </td>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      {field(item.fault_enrichment, "severity_assessed")}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {field(item.fault_enrichment, "fm_type")}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {field(item.fault_enrichment, "fault_nature")}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {field(item.closure_enrichment, "resolution_effectiveness")}
                    </td>
                    <td className="px-4 py-3">
                      {field(item.closure_enrichment, "follow_up_needed")}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-app-muted">
                      {field(item.closure_enrichment, "work_performed_summary")}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between text-sm text-app-muted">
        <span>
          Showing {items.length.toLocaleString()} of {total.toLocaleString()}
        </span>
        {nextCursor !== null && (
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="h-10 rounded-full border border-app-line px-5 font-semibold text-app-ink disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
