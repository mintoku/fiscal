"use client";

import { cleanDescription } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/formatMoney";
import type { Transaction } from "@/types/transaction";

type LargestExpensesProps = {
  expenses: Transaction[];
  onViewAll: () => void;
};

export default function LargestExpenses({
  expenses,
  onViewAll,
}: LargestExpensesProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center border border-dashed border-border bg-surface text-sm text-muted">
        No expenses in this period.
      </div>
    );
  }

  return (
    <div className="border border-border bg-surface">
      <ul className="divide-y divide-border">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {cleanDescription(expense.description)}
              </p>
              <p className="text-xs text-muted">
                {expense.date}
                {" · "}
                {expense.category ?? "Uncategorized"}
                {" · "}
                <span className="capitalize">{expense.accountType}</span>
              </p>
            </div>
            <p className="shrink-0 font-mono tabular-nums text-foreground">
              {formatCurrency(Math.abs(expense.amount))}
            </p>
          </li>
        ))}
      </ul>
      <div className="border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-medium text-green underline underline-offset-2 hover:text-green-mid"
        >
          View full transaction list
        </button>
      </div>
    </div>
  );
}
