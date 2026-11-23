"use client";

import type { AnalyticsResultItem } from "@/lib/mapping/contracts";
import { dollars, percent, prettyKey } from "@/lib/mapping/engine-summary";
import { reasonFor, topValue } from "@/lib/mapping/result-shape";

type Section = Record<string, unknown> | null;

const show = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return prettyKey(String(value));
};

function Fact({
  label,
  value,
  reason,
}: {
  label: string;
  value: string;
  reason?: string | null;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-app-muted">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium capitalize text-app-ink">{value}</dd>
      {reason && <p className="mt-0.5 text-xs leading-5 text-app-muted">{reason}</p>}
    </div>
  );
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Everything the engine returned for one work order, with its reasons. */
export function WorkOrderDetail({ item }: { item: AnalyticsResultItem }) {
  if (item.engine_status === "failed") {
    return (
      <p className="text-sm text-app-muted">
        The engine could not analyse this work order.
        {item.error ? ` ${item.error}` : ""}
      </p>
    );
  }

  const fault: Section = item.fault_enrichment;
  const closure: Section = item.closure_enrichment;
  const agreement =
    fault && typeof fault.source_agreement === "object" && fault.source_agreement !== null
      ? (fault.source_agreement as Record<string, unknown>)
      : null;
  const inventory = Array.isArray(closure?.inventory_items)
    ? (closure.inventory_items as { item?: unknown; quantity?: unknown }[])
    : [];
  const history =
    item.context_snapshot && typeof item.context_snapshot.wo_history_entries === "object"
      ? (item.context_snapshot.wo_history_entries as Record<string, unknown>)
      : null;
  const cost = item.processing_cost;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-label="Fault analysis">
        <h4 className="text-sm font-semibold">Fault analysis</h4>
        {fault ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <Fact label="Ticket sentiment" value={show(topValue(fault.ticket_sentiment))} />
            <Fact
              label="Severity"
              value={show(topValue(fault.severity_assessed))}
              reason={reasonFor(fault, "severity_assessed")}
            />
            <Fact
              label="FM type"
              value={show(topValue(fault.fm_type))}
              reason={reasonFor(fault, "fm_type")}
            />
            <Fact
              label="Subcategory"
              value={show(topValue(fault.fm_subcategory))}
              reason={reasonFor(fault, "fm_subcategory")}
            />
            <Fact
              label="Fault nature"
              value={show(topValue(fault.fault_nature))}
              reason={reasonFor(fault, "fault_nature")}
            />
            <Fact
              label="Matches your priority"
              value={
                agreement?.severity_matches_priority === null ||
                agreement?.severity_matches_priority === undefined
                  ? "Not compared"
                  : show(agreement.severity_matches_priority)
              }
            />
            <Fact label="Confidence" value={percent(number(fault.confidence))} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-app-muted">
            Skipped: the work order has no title or fault description.
          </p>
        )}
      </section>

      <section aria-label="Closure analysis">
        <h4 className="text-sm font-semibold">Closure analysis</h4>
        {closure ? (
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs text-app-muted">Work performed</dt>
              <dd className="mt-0.5 text-sm text-app-ink">
                {show(closure.work_performed_summary)}
              </dd>
            </div>
            <Fact
              label="Resolution effectiveness"
              value={show(topValue(closure.resolution_effectiveness))}
              reason={reasonFor(closure, "resolution_effectiveness")}
            />
            <Fact
              label="Closure data quality"
              value={show(topValue(closure.closure_data_quality))}
              reason={reasonFor(closure, "closure_data_quality")}
            />
            <Fact
              label="Follow-up needed"
              value={`${show(closure.follow_up_needed)}${
                closure.follow_up_source ? ` (${show(closure.follow_up_source)})` : ""
              }`}
            />
            <Fact
              label="Cost classification"
              value={show(topValue(closure.cost_classification))}
              reason={reasonFor(closure, "cost_classification")}
            />
            <Fact
              label="Parts used"
              value={
                inventory.length > 0
                  ? inventory
                      .map((part) =>
                        `${show(part.item)}${
                          part.quantity && part.quantity !== "not specified"
                            ? ` (${String(part.quantity)})`
                            : ""
                        }`,
                      )
                      .join(", ")
                  : show(closure.inventory_used)
              }
            />
            <Fact label="Confidence" value={percent(number(closure.confidence))} />
          </dl>
        ) : (
          <p className="mt-3 text-sm text-app-muted">
            Skipped: the work order has no resolution notes.
          </p>
        )}
      </section>

      <p className="text-xs leading-5 text-app-muted lg:col-span-2">
        {item.processed_at ? `Analysed ${new Date(item.processed_at).toLocaleString()}` : "Analysed"}
        {history
          ? ` · earlier work orders found: ${String(history.asset ?? 0)} for the asset, ${String(history.location ?? 0)} for the location`
          : ""}
        {cost && number(cost.total_tokens) !== null
          ? ` · ${String(number(cost.total_tokens))} tokens, about ${dollars(number(cost.estimated_usd))}`
          : ""}
      </p>
    </div>
  );
}
