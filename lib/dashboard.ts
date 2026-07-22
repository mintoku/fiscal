import {
  ALL_TIME,
  filterTransactionsByPeriod,
  formatMonthLabel,
  getMonthKey,
} from "@/lib/calculateMonthlySummary";
import type {
  AccountType,
  Transaction,
  TransactionType,
} from "@/types/transaction";

export type AccountFilter = "all" | AccountType;
export type TypeFilter = "all" | TransactionType;

export type DashboardFilters = {
  period: string | null;
  accountType: AccountFilter;
  transactionType: TypeFilter;
};

export type Totals = {
  income: number;
  expenses: number;
  netCashFlow: number;
  transfers: number;
};

export type MetricChange = {
  absolute: number;
  /** Null when the previous value is zero (avoids misleading percentages). */
  percent: number | null;
};

export type DashboardSummary = Totals & {
  previous: Totals | null;
  changes: {
    income: MetricChange | null;
    expenses: MetricChange | null;
    netCashFlow: MetricChange | null;
    transfers: MetricChange | null;
  } | null;
};

export type TrendPoint = {
  key: string;
  label: string;
  total: number;
};

export type CategoryBreakdownItem = {
  category: string;
  total: number;
  percent: number;
  count: number;
};

export type Insight = {
  id: string;
  text: string;
};

/** Strip common bank noise for display without changing stored data. */
export function cleanDescription(description: string): string {
  return description
    .split(" DES:")[0]
    ?.split(";")[0]
    ?.trim()
    .replace(/\s+/g, " ") ?? description;
}

export function filterByAccountType(
  transactions: Transaction[],
  accountType: AccountFilter,
): Transaction[] {
  if (accountType === "all") return transactions;
  return transactions.filter((t) => t.accountType === accountType);
}

export function filterByTransactionType(
  transactions: Transaction[],
  transactionType: TypeFilter,
): Transaction[] {
  if (transactionType === "all") return transactions;
  return transactions.filter((t) => t.transactionType === transactionType);
}

export function filterDashboardTransactions(
  transactions: Transaction[],
  filters: DashboardFilters,
): Transaction[] {
  const byPeriod = filterTransactionsByPeriod(transactions, filters.period);
  const byAccount = filterByAccountType(byPeriod, filters.accountType);
  return filterByTransactionType(byAccount, filters.transactionType);
}

/**
 * Uses existing transactionType — never amount sign alone.
 * Transfers are excluded from income and expenses.
 */
export function calculateTotals(transactions: Transaction[]): Totals {
  let income = 0;
  let expenses = 0;
  let transfers = 0;

  for (const transaction of transactions) {
    if (transaction.transactionType === "transfer") {
      transfers += Math.abs(transaction.amount);
      continue;
    }
    if (transaction.transactionType === "expense") {
      expenses += Math.abs(transaction.amount);
      continue;
    }
    if (transaction.transactionType === "income") {
      income += Math.abs(transaction.amount);
    }
  }

  return {
    income,
    expenses,
    transfers,
    netCashFlow: income - expenses,
  };
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yearPart, monthPart] = monthKey.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function calculateMetricChange(
  current: number,
  previous: number,
): MetricChange {
  const absolute = current - previous;
  if (previous === 0) {
    return { absolute, percent: null };
  }
  return {
    absolute,
    percent: (absolute / Math.abs(previous)) * 100,
  };
}

export function calculateDashboardSummary(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[] | null,
): DashboardSummary {
  const current = calculateTotals(currentTransactions);
  if (!previousTransactions) {
    return {
      ...current,
      previous: null,
      changes: null,
    };
  }

  const previous = calculateTotals(previousTransactions);
  return {
    ...current,
    previous,
    changes: {
      income: calculateMetricChange(current.income, previous.income),
      expenses: calculateMetricChange(current.expenses, previous.expenses),
      netCashFlow: calculateMetricChange(
        current.netCashFlow,
        previous.netCashFlow,
      ),
      transfers: calculateMetricChange(current.transfers, previous.transfers),
    },
  };
}

function parseDateParts(date: string): { month: string; day: string; year: string } {
  const [month, day, year] = date.split("/");
  return {
    month: (month ?? "").padStart(2, "0"),
    day: (day ?? "").padStart(2, "0"),
    year: year ?? "",
  };
}

/** Expenses only; income and transfers excluded. */
export function groupExpensesByTime(
  transactions: Transaction[],
  mode: "day" | "month",
): TrendPoint[] {
  const totals = new Map<string, number>();

  for (const transaction of transactions) {
    if (transaction.transactionType !== "expense") continue;
    const { month, day, year } = parseDateParts(transaction.date);
    const key =
      mode === "day" ? `${year}-${month}-${day}` : `${year}-${month}`;
    totals.set(key, (totals.get(key) ?? 0) + Math.abs(transaction.amount));
  }

  return Array.from(totals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => {
      if (mode === "month") {
        return {
          key,
          label: formatMonthLabel(key),
          total,
        };
      }
      const [, m, d] = key.split("-");
      return {
        key,
        label: `${m}/${d}`,
        total,
      };
    });
}

export function groupExpensesByCategory(
  transactions: Transaction[],
  options: { topN?: number; collapseOther?: boolean } = {},
): { items: CategoryBreakdownItem[]; totalExpenses: number } {
  const { topN = 5, collapseOther = true } = options;
  const expenses = transactions.filter((t) => t.transactionType === "expense");
  const totalExpenses = expenses.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0,
  );

  const groups = new Map<string, { total: number; count: number }>();
  for (const transaction of expenses) {
    const category = transaction.category ?? "Uncategorized";
    const existing = groups.get(category) ?? { total: 0, count: 0 };
    existing.total += Math.abs(transaction.amount);
    existing.count += 1;
    groups.set(category, existing);
  }

  const ranked = Array.from(groups.entries())
    .map(([category, data]) => ({
      category,
      total: data.total,
      count: data.count,
      percent: totalExpenses === 0 ? 0 : (data.total / totalExpenses) * 100,
    }))
    .sort((a, b) => b.total - a.total);

  if (!collapseOther || ranked.length <= topN) {
    return { items: ranked, totalExpenses };
  }

  const top = ranked.slice(0, topN);
  const rest = ranked.slice(topN);
  const otherTotal = rest.reduce((sum, item) => sum + item.total, 0);
  const otherCount = rest.reduce((sum, item) => sum + item.count, 0);

  return {
    items: [
      ...top,
      {
        category: "Other",
        total: otherTotal,
        count: otherCount,
        percent: totalExpenses === 0 ? 0 : (otherTotal / totalExpenses) * 100,
      },
    ],
    totalExpenses,
  };
}

export function getLargestExpenses(
  transactions: Transaction[],
  limit = 5,
): Transaction[] {
  return [...transactions]
    .filter((t) => t.transactionType === "expense")
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, limit);
}

function merchantKey(description: string): string {
  return cleanDescription(description).toLowerCase();
}

/**
 * Rule-based insights only (no LLM). Returns up to four items supported by data.
 */
export function generateMonthlyInsights(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[] | null,
): Insight[] {
  const insights: Insight[] = [];
  const expenses = currentTransactions.filter(
    (t) => t.transactionType === "expense",
  );
  const totals = calculateTotals(currentTransactions);

  if (expenses.length === 0 && totals.income === 0 && totals.transfers === 0) {
    return insights;
  }

  const { items } = groupExpensesByCategory(expenses, {
    topN: 20,
    collapseOther: false,
  });
  const largestCategory = items.find((item) => item.category !== "Other");
  if (largestCategory && largestCategory.total > 0) {
    insights.push({
      id: "largest-category",
      text: `${largestCategory.category} was your largest category at ${formatCurrencyLabel(largestCategory.total)}.`,
    });
  }

  const largestExpense = getLargestExpenses(expenses, 1)[0];
  if (largestExpense) {
    insights.push({
      id: "largest-expense",
      text: `Your largest expense was ${cleanDescription(largestExpense.description)} at ${formatCurrencyLabel(Math.abs(largestExpense.amount))}.`,
    });
  }

  const frequency = new Map<string, { count: number; label: string }>();
  for (const expense of expenses) {
    const key = merchantKey(expense.description);
    const existing = frequency.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      frequency.set(key, {
        count: 1,
        label: cleanDescription(expense.description),
      });
    }
  }
  const mostFrequent = Array.from(frequency.values()).sort(
    (a, b) => b.count - a.count,
  )[0];
  if (mostFrequent && mostFrequent.count >= 2) {
    insights.push({
      id: "frequent-merchant",
      text: `${mostFrequent.label} appeared most often (${mostFrequent.count} times).`,
    });
  }

  const uncategorized = expenses.filter((t) => t.category === null).length;
  if (uncategorized > 0) {
    insights.push({
      id: "uncategorized",
      text:
        uncategorized === 1
          ? "One expense still needs a category."
          : `${uncategorized} expenses still need a category.`,
    });
  }

  if (previousTransactions) {
    const previous = calculateTotals(previousTransactions);
    if (previous.expenses > 0) {
      const change = calculateMetricChange(totals.expenses, previous.expenses);
      if (change.percent !== null && Math.abs(change.percent) >= 1) {
        const direction = change.percent < 0 ? "less" : "more";
        insights.push({
          id: "mom-expenses",
          text: `You spent ${Math.abs(change.percent).toFixed(0)}% ${direction} than last month.`,
        });
      }
    } else if (totals.expenses > 0 && previous.expenses === 0) {
      insights.push({
        id: "mom-expenses-new",
        text: `Expenses this period totaled ${formatCurrencyLabel(totals.expenses)} (no expenses in the prior month).`,
      });
    }
  }

  const byDay = new Map<string, number>();
  for (const expense of expenses) {
    byDay.set(
      expense.date,
      (byDay.get(expense.date) ?? 0) + Math.abs(expense.amount),
    );
  }
  const highestDay = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1])[0];
  if (highestDay && highestDay[1] > 0) {
    insights.push({
      id: "highest-day",
      text: `${highestDay[0]} was your highest-spending day at ${formatCurrencyLabel(highestDay[1])}.`,
    });
  }

  if (totals.income > 0 && totals.expenses > 0) {
    const spentShare = (totals.expenses / totals.income) * 100;
    insights.push({
      id: "income-spent",
      text: `Expenses were ${spentShare.toFixed(0)}% of income this period.`,
    });
  }

  return insights.slice(0, 4);
}

function formatCurrencyLabel(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function resolvePreviousPeriodTransactions(
  allTransactions: Transaction[],
  filters: DashboardFilters,
): Transaction[] | null {
  if (!filters.period || filters.period === ALL_TIME) {
    return null;
  }

  const previousKey = getPreviousMonthKey(filters.period);
  const previousFilters: DashboardFilters = {
    ...filters,
    period: previousKey,
  };
  const previous = filterDashboardTransactions(
    allTransactions,
    previousFilters,
  );

  // Still return the (possibly empty) set so zero-previous comparisons work.
  return previous;
}

export { ALL_TIME, getMonthKey };
