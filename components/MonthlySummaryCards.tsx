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
  const cards = [
    { label: "Total Expenses", value: summary.totalExpenses },
    { label: "Total Income", value: summary.totalIncome },
    { label: "Net Cash Flow", value: summary.netCashFlow },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded border border-zinc-200 bg-white px-4 py-4"
        >
          <p className="text-sm text-zinc-500">{card.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
            {formatCurrency(card.value)}
          </p>
        </div>
      ))}
    </div>
  );
}
