"use client";

import { useState } from "react";
import type { CategoryBreakdownItem } from "@/lib/dashboard";
import { formatCurrency, formatPercent } from "@/lib/formatMoney";

type CategoryBreakdownProps = {
  items: CategoryBreakdownItem[];
  allItems: CategoryBreakdownItem[];
};

export default function CategoryBreakdown({
  items,
  allItems,
}: CategoryBreakdownProps) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? allItems : items;
  const maxTotal = visible[0]?.total ?? 0;

  if (allItems.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center border border-dashed border-border bg-surface text-sm text-muted">
        No categorized expenses yet. Try Categorize expenses.
      </div>
    );
  }

  return (
    <div className="border border-border bg-surface px-4 py-4">
      <ul className="flex flex-col gap-3">
        {visible.map((item) => {
          const width =
            maxTotal === 0 ? 0 : Math.max((item.total / maxTotal) * 100, 4);
          return (
            <li key={item.category} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-foreground">
                  {item.category}
                </span>
                <span className="font-mono tabular-nums text-foreground">
                  {formatCurrency(item.total)}
                </span>
              </div>
              <div className="h-2 w-full bg-green-soft">
                <div
                  className="h-2 bg-green"
                  style={{ width: `${width}%` }}
                  aria-hidden
                />
              </div>
              <p className="text-xs text-muted">
                {formatPercent(item.percent)} of expenses · {item.count}{" "}
                transaction{item.count === 1 ? "" : "s"}
              </p>
            </li>
          );
        })}
      </ul>
      {allItems.length > items.length && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-4 text-sm font-medium text-green underline underline-offset-2 hover:text-green-mid"
        >
          {showAll ? "Show top categories" : "View all categories"}
        </button>
      )}
    </div>
  );
}
