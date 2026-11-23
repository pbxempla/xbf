"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fetchLatestInsights, fetchUploadInsights, MappingApiError } from "@/lib/mapping/api";
import type {
  InsightLens,
  InsightMetric,
  InsightsResponse,
} from "@/lib/mapping/contracts";

const LENS_ORDER = [
  "operations",
  "cost_management",
  "finance",
  "sla_contract_compliance",
  "contractor_performance",
  "training_productivity",
  "data_quality",
];

const ACRONYMS: Record<string, string> = { sla: "SLA", ppm: "PPM", wo: "Work order" };

/** "average_fix_time_hours" -> "Average fix time"; the unit is added to the value instead. */
const label = (key: string): string => {
  const words = key
    .replace(/_(pct|hours|days|score)$/, "")
    .split("_")
    .map((word) => ACRONYMS[word] ?? word);
  const text = words.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

function formatValue(key: string, value: InsightMetric["value"]): string {
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

type Ranked = { key: string; value: number };
const isRanked = (item: unknown): item is Ranked =>
  typeof item === "object" &&
  item !== null &&
  "key" in item &&
  "value" in item &&
  typeof (item as Ranked).value === "number";

const isAvailable = (metric: InsightMetric): boolean =>
  metric.status === "ok" && metric.value !== null;

/* ------------------------------------------------------------------ */
/* Data                                                                */
/* ------------------------------------------------------------------ */

export type InsightsState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; insights: InsightsResponse };

/** Loads one upload's insights, or the latest upload's when `uploadId` is omitted. */
export function useInsights(uploadId?: string, enabled = true): InsightsState {
  const [state, setState] = useState<InsightsState>({ status: "loading" });

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    (uploadId ? fetchUploadInsights(uploadId) : fetchLatestInsights())
      .then((insights) => {
        if (active) setState({ status: "ready", insights });
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof MappingApiError && reason.status === 404) {
          setState({ status: "empty" });
          return;
        }
        setState({
          status: "error",
          message: reason instanceof Error ? reason.message : "Unable to load insights.",
        });
      });
    return () => {
      active = false;
    };
  }, [uploadId, enabled]);

  return state;
}

/* ------------------------------------------------------------------ */
/* Headline numbers                                                    */
/* ------------------------------------------------------------------ */

const HEADLINES: Array<{ title: string; lens: string; metric: string }> = [
  { title: "Work orders", lens: "operations", metric: "work_order_count" },
  { title: "Reactive share", lens: "operations", metric: "reactive_pct" },
  { title: "Total spend", lens: "cost_management", metric: "total_spend" },
  { title: "Data completeness", lens: "data_quality", metric: "completeness_score" },
];

/** The four numbers worth seeing first, from the latest analysed upload. */
export function HeadlineStats({ state }: { state: InsightsState }) {
  return (
    <section aria-label="Headline numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {HEADLINES.map(({ title, lens, metric }) => {
        const found =
          state.status === "ready" ? state.insights.lenses[lens]?.metrics[metric] : undefined;
        const value =
          found && isAvailable(found) ? formatValue(metric, found.value) : null;
        return (
          <div key={title} className="rounded-3xl bg-white p-5">
            <p className="text-sm text-app-muted">{title}</p>
            {state.status === "loading" ? (
              <div className="mt-2 h-8 w-24 animate-pulse rounded bg-app-canvas" />
            ) : (
              <p
                className={`mt-1 text-3xl font-medium tracking-tight ${
                  value ? "" : "text-app-ink/25"
                }`}
              >
                {value ?? "—"}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lens cards                                                          */
/* ------------------------------------------------------------------ */

function MetricRow({ name, metric }: { name: string; metric: InsightMetric }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-app-muted">{label(name)}</span>
      <span className="font-medium text-app-ink">{formatValue(name, metric.value)}</span>
    </li>
  );
}

function LensCard({ lens, wide = false }: { lens: InsightLens; wide?: boolean }) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(lens.metrics);
  const available = entries.filter(([, metric]) => isAvailable(metric));
  const unavailable = entries.filter(([, metric]) => !isAvailable(metric));
  const shown = open ? available : available.slice(0, wide ? 4 : 3);
  const tables = Object.entries(lens.tables)
    .map(([name, rows]) => [name, rows.filter(isRanked)] as const)
    .filter(([, rows]) => rows.length > 0);
  const hasMore =
    available.length > (wide ? 4 : 3) || tables.length > 0 || unavailable.length > 0;
  const firstReason = unavailable.find(([, metric]) => metric.reason)?.[1].reason;

  return (
    <li
      className={`flex h-full flex-col gap-3 rounded-2xl bg-app-canvas p-4 ${
        wide ? "sm:col-span-2 xl:col-span-3 sm:p-6" : ""
      }`}
    >
      <h3 className={`font-medium text-app-ink ${wide ? "text-base" : "text-sm"}`}>{lens.title}</h3>

      {shown.length > 0 && wide ? (
        <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {shown.map(([name, metric]) => (
            <li key={name}>
              <p className="text-sm text-app-muted">{label(name)}</p>
              <p className="mt-0.5 text-2xl font-medium tracking-tight text-app-ink">
                {formatValue(name, metric.value)}
              </p>
            </li>
          ))}
        </ul>
      ) : shown.length > 0 ? (
        <ul className="space-y-1.5">
          {shown.map(([name, metric]) => (
            <MetricRow key={name} name={name} metric={metric} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-app-muted">
          Not enough data yet{firstReason ? `: ${firstReason}` : ""}
        </p>
      )}

      {open && tables.length > 0 && (
        <div className={wide ? "grid gap-6 md:grid-cols-2" : "flex flex-col gap-3"}>
          {tables.map(([name, rows]) => (
          <div key={name}>
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              {label(name)}
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {rows.slice(0, 5).map((item) => (
                <li key={item.key} className="flex justify-between gap-3">
                  <span className="truncate text-app-muted">{item.key}</span>
                  <span className="font-medium text-app-ink">
                    {item.value.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          ))}
        </div>
      )}

      {open && unavailable.length > 0 && (
        <p className="text-xs leading-5 text-app-muted">
          Needs more data: {unavailable.map(([name]) => label(name)).join(", ")}.
        </p>
      )}

      {hasMore ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="mt-auto inline-flex items-center gap-1 self-start rounded-full text-xs font-semibold text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
        >
          {open ? "Show less" : "Show details"}
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      ) : null}
    </li>
  );
}

/** The seven deterministic insight lenses: three headline numbers each, details on request. */
export function InsightLenses({ state }: { state: InsightsState }) {
  if (state.status === "loading") {
    return (
      <div
        role="status"
        aria-label="Loading insights"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {LENS_ORDER.map((key) => (
          <div key={key} className="h-28 animate-pulse rounded-2xl bg-app-canvas" />
        ))}
      </div>
    );
  }
  if (state.status === "empty") {
    return (
      <p className="text-sm text-app-muted">
        Insights appear here once you have uploaded and mapped a file.
      </p>
    );
  }
  if (state.status === "error") {
    return (
      <p role="alert" className="text-sm text-red-800">
        {state.message}
      </p>
    );
  }
  const lenses = LENS_ORDER.map((key) => state.insights.lenses[key]).filter(
    (lens): lens is InsightLens => Boolean(lens),
  );
  return (
    <ul className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {lenses.map((lens, index) => (
        <LensCard key={lens.key} lens={lens} wide={index === 0} />
      ))}
    </ul>
  );
}
