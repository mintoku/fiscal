import type { Transaction } from "@/types/transaction";

export type MonthlySummary = {
  totalExpenses: number;
  totalIncome: number;
  netCashFlow: number;
};

/** Convert MM/DD/YYYY into a sortable YYYY-MM key. */
export function getMonthKey(date: string): string {
  const [month, , year] = date.split("/");
  return `${year}-${month.padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Newest month first. */
export function getAvailableMonths(transactions: Transaction[]): string[] {
  const months = new Set(transactions.map((t) => getMonthKey(t.date)));
  return Array.from(months).sort((a, b) => b.localeCompare(a));
}

export const ALL_TIME = "all";

export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: string | null,
): Transaction[] {
  if (!period) return [];
  if (period === ALL_TIME) return transactions;
  return transactions.filter((t) => getMonthKey(t.date) === period);
}

/**
 * Summarize transactions for a time period.
 * Transfers are ignored. Expense/income totals use absolute values.
 * Original transaction amounts are not modified.
 */
export function calculateMonthlySummary(
  transactions: Transaction[],
): MonthlySummary {
  let totalExpenses = 0;
  let totalIncome = 0;

  for (const transaction of transactions) {
    if (transaction.transactionType === "transfer") continue;

    if (transaction.transactionType === "expense") {
      totalExpenses += Math.abs(transaction.amount);
    } else if (transaction.transactionType === "income") {
      totalIncome += Math.abs(transaction.amount);
    }
  }

  return {
    totalExpenses,
    totalIncome,
    netCashFlow: totalIncome - totalExpenses,
  };
}
