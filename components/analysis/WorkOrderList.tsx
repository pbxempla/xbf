"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchAnalyticsResults } from "@/lib/mapping/api";
import type { AnalyticsResultItem, ResultFilter } from "@/lib/mapping/contracts";
import { isHighSeverity, prettyKey } from "@/lib/mapping/engine-summary";
import { reasonFor, topValue } from "@/lib/mapping/result-shape";
import { WorkOrderDetail } from "@/components/analysis/WorkOrderDetail";

const show = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return prettyKey(String(value));
};

const field = (data: Record<string, unknown> | null, key: string): string =>
  data ? show(topValue(data[key])) : "—";

function SeverityChip({ severity }: { severity: string }) {
  const high = isHighSeverity(severity);
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        high ? "bg-[#e23b4a] text-white" : "bg-app-canvas text-app-ink"
      }`}
    >
      {severity}
    </span>
  );
}

interface WorkOrderListProps {
  uploadId: string;
  /** `table` lists every column; `attention` shows cards with the engine's reasons. */
  variant: "table" | "attention";
  filter?: ResultFilter;
  pageSize?: number;
}

/**
 * Work orders with the engine's analysis, paged, each expandable to the full output.
 * Render with a `key` that changes with the upload or filter to reset it.
 */
export function WorkOrderList({
  uploadId,
  variant,
  filter = "all",
  pageSize = 25,
}: WorkOrderListProps) {
  const [items, setItems] = useState<AnalyticsResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    fetchAnalyticsResults(uploadId, 0, pageSize, filter)
      .then((page) => {
        if (!active) return;
        setItems(page.items);
        setTotal(page.total);
        setNextCursor(page.next_cursor);
        setLoaded(true);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Unable to load the results.");
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [uploadId, filter, pageSize]);

  const loadMore = async () => {
    if (nextCursor === null) return;
    setLoadingMore(true);
    try {
      const page = await fetchAnalyticsResults(uploadId, nextCursor, pageSize, filter);
      setItems((current) => [...current, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load more.");
    } finally {
      setLoadingMore(false);
    }
  };

  const toggle = (rowNumber: number) =>
    setExpanded((current) => (current === rowNumber ? null : rowNumber));

  if (!loaded) {
    return (
      <div role="status" aria-label="Loading work orders" className="space-y-3">
        <div className="h-16 animate-pulse rounded-2xl bg-app-canvas" />
        <div className="h-16 animate-pulse rounded-2xl bg-app-canvas" />
      </div>
    );
  }
  if (error && items.length === 0) {
    return (
      <p role="alert" className="text-sm text-red-800">
        {error}
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-app-muted">
        {variant === "attention"
          ? "Nothing needs attention. No high-severity, low-effectiveness or follow-up work orders."
          : "No analysed work orders yet."}
      </p>
    );
  }

  const footer = (
    <div className="mt-3 flex items-center justify-between text-sm text-app-muted">
      <span>
        Showing {items.length.toLocaleString()} of {total.toLocaleString()}
      </span>
      {nextCursor !== null && (
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loadingMore}
          className="h-10 rounded-full bg-app-canvas px-5 font-semibold text-app-ink transition-colors hover:bg-app-line disabled:opacity-60"
        >
          {loadingMore ? "Loading…" : "Show more"}
        </button>
      )}
    </div>
  );

  if (variant === "attention") {
    return (
      <div>
        {error && (
          <p role="alert" className="mb-2 text-sm text-red-800">
            {error}
          </p>
        )}
        <ul className="space-y-3">
          {items.map((item) => {
            const fault = item.fault_enrichment;
            const closure = item.closure_enrichment;
            const severity = fault ? show(topValue(fault.severity_assessed)) : "—";
            const open = expanded === item.row_number;
            const reasons = [
              reasonFor(fault, "severity_assessed"),
              reasonFor(closure, "resolution_effectiveness"),
            ].filter((reason): reason is string => Boolean(reason));
            const flags = [
              closure && topValue(closure.resolution_effectiveness) === "low"
                ? "Low effectiveness"
                : null,
              closure && closure.follow_up_needed === true ? "Follow-up needed" : null,
            ].filter((flag): flag is string => Boolean(flag));
            return (
              <li key={item.row_number} className="rounded-2xl bg-app-canvas p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {severity !== "—" && <SeverityChip severity={severity} />}
                  <span className="text-sm font-semibold text-app-ink">{item.wo_id}</span>
                  <span className="text-sm capitalize text-app-muted">
                    {field(fault, "fm_subcategory")}
                  </span>
                  {flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-app-ink"
                    >
                      {flag}
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggle(item.row_number)}
                    aria-expanded={open}
                    className="ml-auto inline-flex h-9 items-center gap-1 rounded-full bg-white px-3 text-xs font-semibold text-app-ink"
                  >
                    {open ? "Hide details" : "Details"}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                {closure && closure.work_performed_summary ? (
                  <p className="mt-2 text-sm leading-6 text-app-ink">
                    {String(closure.work_performed_summary)}
                  </p>
                ) : null}
                {reasons.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs leading-5 text-app-muted">
                    {reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
                {open && (
                  <div className="mt-4 border-t border-app-line pt-4">
                    <WorkOrderDetail item={item} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {footer}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-app-line">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-app-canvas text-app-muted">
            <tr>
              <th scope="col" className="w-10 px-3 py-3">
                <span className="sr-only">Details</span>
              </th>
              <th scope="col" className="px-3 py-3 font-medium">Work order</th>
              <th scope="col" className="px-3 py-3 font-medium">Severity</th>
              <th scope="col" className="px-3 py-3 font-medium">FM type</th>
              <th scope="col" className="px-3 py-3 font-medium">Fault nature</th>
              <th scope="col" className="px-3 py-3 font-medium">Resolution</th>
              <th scope="col" className="px-3 py-3 font-medium">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const open = expanded === item.row_number;
              const failed = item.engine_status === "failed";
              return (
                <Fragment key={item.row_number}>
                  <tr className="border-t border-app-line">
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggle(item.row_number)}
                        aria-expanded={open}
                        aria-label={`${open ? "Hide" : "Show"} details for ${item.wo_id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted hover:bg-app-canvas"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={`h-4 w-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                    </td>
                    <th scope="row" className="px-3 py-3 font-medium text-app-ink">
                      {item.wo_id}
                    </th>
                    {failed ? (
                      <td colSpan={5} className="px-3 py-3 text-app-muted">
                        Not analysed by the engine
                      </td>
                    ) : (
                      <>
                        <td
                          className="px-3 py-3"
                          title={reasonFor(item.fault_enrichment, "severity_assessed") ?? undefined}
                        >
                          {field(item.fault_enrichment, "severity_assessed")}
                        </td>
                        <td
                          className="px-3 py-3 capitalize"
                          title={reasonFor(item.fault_enrichment, "fm_type") ?? undefined}
                        >
                          {field(item.fault_enrichment, "fm_type")}
                        </td>
                        <td
                          className="px-3 py-3 capitalize"
                          title={reasonFor(item.fault_enrichment, "fault_nature") ?? undefined}
                        >
                          {field(item.fault_enrichment, "fault_nature")}
                        </td>
                        <td
                          className="px-3 py-3 capitalize"
                          title={
                            reasonFor(item.closure_enrichment, "resolution_effectiveness") ??
                            undefined
                          }
                        >
                          {field(item.closure_enrichment, "resolution_effectiveness")}
                        </td>
                        <td className="px-3 py-3">
                          {field(item.closure_enrichment, "follow_up_needed")}
                        </td>
                      </>
                    )}
                  </tr>
                  {open && (
                    <tr className="bg-app-canvas/60">
                      <td colSpan={7} className="px-5 py-4">
                        <WorkOrderDetail item={item} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
