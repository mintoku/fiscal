"use client";

import type { DashboardSummary, MetricChange } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/formatMoney";

type DashboardSummaryCardsProps = {
  summary: DashboardSummary;
};

function ChangeHint({ change }: { change: MetricChange | null | undefined }) {
  if (!change) return null;

  if (change.percent === null) {
    if (change.absolute === 0) {
      return <span className="text-xs text-muted">No prior month</span>;
    }
    const sign = change.absolute > 0 ? "+" : "";
    return (
      <span className="text-xs text-muted">
        {sign}
        {formatCurrency(change.absolute)} vs prior month
      </span>
    );
  }

  const direction = change.percent > 0 ? "up" : change.percent < 0 ? "down" : "flat";
  const label =
    direction === "flat"
      ? "Same as prior month"
      : `${Math.abs(change.percent).toFixed(0)}% ${direction} vs prior month`;

  return <span className="text-xs text-muted">{label}</span>;
}

export default function DashboardSummaryCards({
  summary,
}: DashboardSummaryCardsProps) {
  const cards = [
    {
      label: "Income",
      value: summary.income,
      change: summary.changes?.income,
    },
    {
      label: "Expenses",
      value: summary.expenses,
      change: summary.changes?.expenses,
    },
    {
      label: "Net cash flow",
      value: summary.netCashFlow,
      change: summary.changes?.netCashFlow,
      emphasize: true,
    },
    {
      label: "Transfers",
      value: summary.transfers,
      change: summary.changes?.transfers,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="border border-border bg-surface px-4 py-4"
        >
          <p className="text-xs uppercase tracking-wide text-muted">
            {card.label}
          </p>
          <p
            className={`mt-2 font-mono text-2xl tabular-nums tracking-tight ${
              card.emphasize ? "font-medium text-green" : "text-foreground"
            }`}
          >
            {formatCurrency(card.value)}
          </p>
          <div className="mt-2">
            <ChangeHint change={card.change} />
          </div>
        </div>
      ))}
    </div>
  );
}
