"use client";

import type { MonthlySummary } from "@/lib/calculateMonthlySummary";

type MonthlySummaryCardsProps = {
  summary: MonthlySummary;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function MonthlySummaryCards({
  summary,
}: MonthlySummaryCardsProps) {
  const rows = [
    { label: "Expenses", value: summary.totalExpenses },
    { label: "Income", value: summary.totalIncome },
    { label: "Net", value: summary.netCashFlow, emphasize: true },
  ];

  return (
    <div className="border-y border-border bg-surface">
      <dl className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-4 px-1 py-3 sm:px-2"
          >
            <dt
              className={`text-sm ${row.emphasize ? "font-medium text-green" : "text-muted"}`}
            >
              {row.label}
            </dt>
            <dd
              className={`font-mono text-lg tabular-nums tracking-tight sm:text-xl ${
                row.emphasize ? "font-medium text-green" : "text-foreground"
              }`}
            >
              {formatCurrency(row.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
