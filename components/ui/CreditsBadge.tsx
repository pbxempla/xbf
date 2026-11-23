"use client";

import { useId, useState } from "react";
import { getCreditTransactions, type CreditTransaction } from "@/lib/api";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

/**
 * The credits pill shown in every page header. Hovering or focusing it opens a small floating
 * card with how many credits were used and how many remain (like a usage meter).
 */
export function CreditsBadge({ balance }: { balance: number }) {
  const popoverId = useId();
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Reload on every open so credits spent a moment ago are included.
  const show = () => {
    setOpen(true);
    getCreditTransactions()
      .then((rows) => {
        setTransactions(rows);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  };
  const hide = () => setOpen(false);

  const usedRows = (transactions ?? []).filter((row) => row.amount < 0);
  const used = usedRows.reduce((sum, row) => sum + -row.amount, 0);
  const total = used + Math.max(balance, 0);
  const usedShare = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) hide();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") hide();
      }}
    >
      <button
        type="button"
        aria-label={`${balance} credits available. Show usage`}
        aria-describedby={open ? popoverId : undefined}
        aria-expanded={open}
        className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
      >
        <span className="text-app-muted">Credits</span>
        <span>{balance}</span>
      </button>

      {open && (
        <div
          id={popoverId}
          role="tooltip"
          className="absolute right-0 top-full z-30 w-72 pt-2"
        >
          <div className="rounded-2xl bg-white p-4 text-sm text-app-ink shadow-lg ring-1 ring-black/5">
            <p className="font-semibold">Credit usage</p>

            <div
              role="progressbar"
              aria-label="Credits used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={usedShare}
              className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-app-canvas"
            >
              <div
                className="h-full rounded-full bg-black transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${usedShare}%` }}
              />
            </div>

            <dl className="mt-3 flex justify-between gap-4">
              <div>
                <dt className="text-xs text-app-muted">Used</dt>
                <dd className="font-semibold">
                  {transactions ? used.toLocaleString() : "…"}
                </dd>
              </div>
              <div className="text-right">
                <dt className="text-xs text-app-muted">Remaining</dt>
                <dd className="font-semibold">{balance.toLocaleString()}</dd>
              </div>
            </dl>

            {failed && !transactions && (
              <p className="mt-3 text-xs text-app-muted">
                Usage details are unavailable right now.
              </p>
            )}

            {usedRows.length > 0 && (
              <div className="mt-3 border-t border-app-line pt-3">
                <p className="text-xs font-medium text-app-muted">Recent usage</p>
                <ul className="mt-1.5 space-y-1">
                  {usedRows.slice(0, 3).map((row) => (
                    <li key={row.id} className="flex justify-between gap-3 text-xs">
                      <span className="truncate text-app-muted">
                        {dateFormat.format(new Date(row.created_at))} · {row.description}
                      </span>
                      <span className="shrink-0 font-medium">
                        {(-row.amount).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-xs text-app-muted">
              An analysis uses 1 credit per 50 work orders.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
