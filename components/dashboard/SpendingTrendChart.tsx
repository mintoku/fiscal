"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/formatMoney";

type SpendingTrendChartProps = {
  points: TrendPoint[];
  mode: "day" | "month";
};

export default function SpendingTrendChart({
  points,
  mode,
}: SpendingTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center border border-dashed border-border bg-surface text-sm text-muted">
        No expenses in this period to chart.
      </div>
    );
  }

  return (
    <div
      className="h-64 w-full border border-border bg-surface px-2 py-4 sm:px-4"
      role="img"
      aria-label={`Spending trend by ${mode === "day" ? "day" : "month"}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) =>
              `$${Math.round(value).toLocaleString("en-US")}`
            }
            width={56}
          />
          <Tooltip
            cursor={{ fill: "var(--green-soft)" }}
            formatter={(value) => [
              formatCurrency(typeof value === "number" ? value : Number(value)),
              "Expenses",
            ]}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 0,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="total"
            fill="var(--green)"
            name="Expenses"
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
