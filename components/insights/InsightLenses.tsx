"use client";

import { useEffect, useState } from "react";
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

const label = (key: string): string => {
  const text = key.replace(/_pct$/, "").replace(/_/g, " ");
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

function MetricRow({ name, metric }: { name: string; metric: InsightMetric }) {
  const available = metric.status === "ok" && metric.value !== null;
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-app-muted">{label(name)}</span>
      {available ? (
        <span className="font-medium text-app-ink">
          {formatValue(name, metric.value)}
        </span>
      ) : (
        <span
          className="text-app-muted"
          title={metric.reason ?? "Not available"}
        >
          Not available
        </span>
      )}
    </li>
  );
}

function LensCard({ lens, detailed }: { lens: InsightLens; detailed: boolean }) {
  const entries = Object.entries(lens.metrics);
  const shown = detailed
    ? entries
    : entries.filter(([, metric]) => metric.status === "ok").slice(0, 3);
  const firstReason = entries.find(([, metric]) => metric.reason)?.[1].reason;
  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-app-canvas p-4">
      <h3 className="text-sm font-medium text-app-ink">{lens.title}</h3>
      {shown.length > 0 ? (
        <ul className="space-y-1.5">
          {shown.map(([name, metric]) => (
            <MetricRow key={name} name={name} metric={metric} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-app-muted">
          Not available{firstReason ? `: ${firstReason}` : ""}
        </p>
      )}
      {detailed &&
        Object.entries(lens.tables).map(([name, rows]) => {
          const ranked = rows.filter(isRanked);
          if (ranked.length === 0) return null;
          return (
            <div key={name}>
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                {label(name)}
              </p>
              <ul className="mt-1 space-y-1 text-sm">
                {ranked.map((item) => (
                  <li key={item.key} className="flex justify-between gap-3">
                    <span className="truncate text-app-muted">{item.key}</span>
                    <span className="font-medium text-app-ink">
                      {item.value.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
    </li>
  );
}

/**
 * The seven deterministic insight lenses. With `uploadId` it shows that upload; without it,
 * the most recent one. `detailed` lists every metric and the ranked tables.
 */
export function InsightLenses({
  uploadId,
  detailed = false,
}: {
  uploadId?: string;
  detailed?: boolean;
}) {
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [state, setState] = useState<"loading" | "empty" | "error" | "ready">(
    "loading",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (uploadId ? fetchUploadInsights(uploadId) : fetchLatestInsights())
      .then((result) => {
        if (!active) return;
        setInsights(result);
        setState("ready");
      })
      .catch((reason: unknown) => {
        if (!active) return;
        if (reason instanceof MappingApiError && reason.status === 404) {
          setState("empty");
          return;
        }
        setMessage(
          reason instanceof Error ? reason.message : "Unable to load insights.",
        );
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [uploadId]);

  if (state === "loading") {
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
  if (state === "empty") {
    return (
      <p className="text-sm text-app-muted">
        Insights appear here once you have uploaded and mapped a file.
      </p>
    );
  }
  if (state === "error" || !insights) {
    return (
      <p role="alert" className="text-sm text-red-800">
        {message ?? "Unable to load insights."}
      </p>
    );
  }
  const lenses = LENS_ORDER.map((key) => insights.lenses[key]).filter(
    (lens): lens is InsightLens => Boolean(lens),
  );
  return (
    <div>
      <ul
        className={
          detailed
            ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        }
      >
        {lenses.map((lens) => (
          <LensCard key={lens.key} lens={lens} detailed={detailed} />
        ))}
      </ul>
    </div>
  );
}
