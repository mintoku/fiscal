"use client";

import type { Insight } from "@/lib/dashboard";

type MonthlyInsightsProps = {
  insights: Insight[];
};

export default function MonthlyInsights({ insights }: MonthlyInsightsProps) {
  if (insights.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center border border-dashed border-border bg-surface text-sm text-muted">
        Not enough activity yet for insights.
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {insights.map((insight) => (
        <li
          key={insight.id}
          className="border border-border bg-surface px-4 py-3 text-sm leading-relaxed text-foreground"
        >
          {insight.text}
        </li>
      ))}
    </ul>
  );
}
