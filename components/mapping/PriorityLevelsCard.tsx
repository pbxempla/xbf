"use client";

import { useEffect, useState } from "react";
import { fetchPriorityValues } from "@/lib/mapping/api";
import {
  PRIORITY_LEVELS,
  type PriorityLevel,
  type PriorityValuesResponse,
} from "@/lib/mapping/contracts";

interface PriorityLevelsCardProps {
  uploadId: string;
  /** The source column the user mapped to "priority". Render with `key={columnId}` to reset. */
  columnId: string;
  /** Called with the user's scale (value as written in the file -> level). */
  onChange: (levels: Record<string, PriorityLevel>) => void;
}

/**
 * Lets the user say what each of their priority values means in our standard levels
 * (1 may be high for one company and low for another). Their original priority text is still
 * sent to the engine as written; this only tells us the level.
 */
export function PriorityLevelsCard({ uploadId, columnId, onChange }: PriorityLevelsCardProps) {
  const [data, setData] = useState<PriorityValuesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Choices the user made or saved earlier. A value without one falls back to the default
  // guess shown in its select, which the server applies too.
  const [chosen, setChosen] = useState<Record<string, PriorityLevel>>({});

  useEffect(() => {
    let active = true;
    fetchPriorityValues(uploadId, columnId)
      .then((result) => {
        if (!active) return;
        const saved: Record<string, PriorityLevel> = {};
        for (const item of result.values) {
          if (item.level && item.level_source === "saved") saved[item.value] = item.level;
        }
        setData(result);
        setChosen(saved);
        onChange(saved);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(
          reason instanceof Error ? reason.message : "Unable to load your priority values.",
        );
      });
    return () => {
      active = false;
    };
  }, [uploadId, columnId, onChange]);

  const handleChange = (value: string, level: PriorityLevel) => {
    const next = { ...chosen, [value]: level };
    setChosen(next);
    onChange(next);
  };

  // Values with neither a saved choice nor a default guess still need the user's answer.
  const needsInput = Boolean(
    data?.values.some((item) => !(chosen[item.value] ?? item.level)),
  );

  return (
    <section
      aria-label="Priority levels"
      className={`rounded-xl border bg-app-canvas p-4 sm:p-5 ${
        needsInput ? "border-app-accent ring-2 ring-app-accent/15" : "border-app-line"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-medium tracking-tight">Your priority levels</h3>
        {data &&
          (needsInput ? (
            <span className="rounded-full bg-app-accent px-2.5 py-1 text-xs font-semibold text-white">
              Needs your input
            </span>
          ) : (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-app-muted">
              Check and adjust if needed
            </span>
          ))}
      </div>
      <p className="mt-1 text-sm text-app-muted">
        Tell us what each priority value in your file means. We use this for our own
        comparisons. Your original priority text is still sent as written.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {!data && !error && (
        <div role="status" aria-label="Loading priority values" className="mt-4 space-y-2">
          <div className="h-10 animate-pulse rounded-lg bg-white" />
          <div className="h-10 animate-pulse rounded-lg bg-white" />
        </div>
      )}

      {data && data.values.length === 0 && (
        <p className="mt-3 text-sm text-app-muted">This column has no values.</p>
      )}

      {data && data.values.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.values.map((item) => {
            const picked: PriorityLevel | undefined = chosen[item.value];
            const selected: string = picked ?? item.level ?? "";
            const id = `priority-level-${item.value}`;
            return (
              <li
                key={item.value}
                className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2"
              >
                <label htmlFor={id} className="min-w-0 text-sm">
                  <span className="break-all font-medium text-app-ink">{item.value}</span>
                  <span className="ml-2 text-xs text-app-muted">
                    {item.count.toLocaleString()} work order{item.count === 1 ? "" : "s"}
                  </span>
                </label>
                <select
                  id={id}
                  value={selected}
                  onChange={(event) =>
                    handleChange(item.value, event.target.value as PriorityLevel)
                  }
                  className="h-10 shrink-0 rounded-full bg-app-canvas px-3 text-sm font-medium text-app-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
                >
                  {selected === "" && (
                    <option value="" disabled>
                      Choose a level
                    </option>
                  )}
                  {PRIORITY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      )}

      {data?.truncated && (
        <p className="mt-3 text-xs text-app-muted">
          Showing the {data.values.length} most common values. Any others use the default reading.
        </p>
      )}
    </section>
  );
}
