"use client";

import DashboardSummaryCards from "@/components/dashboard/DashboardSummaryCards";
import CategoryBreakdown from "@/components/dashboard/CategoryBreakdown";
import LargestExpenses from "@/components/dashboard/LargestExpenses";
import MonthlyInsights from "@/components/dashboard/MonthlyInsights";
import SpendingTrendChart from "@/components/dashboard/SpendingTrendChart";
import {
  ALL_TIME,
  calculateDashboardSummary,
  filterDashboardTransactions,
  generateMonthlyInsights,
  getLargestExpenses,
  groupExpensesByCategory,
  groupExpensesByTime,
  resolvePreviousPeriodTransactions,
  type AccountFilter,
  type TypeFilter,
} from "@/lib/dashboard";
import { formatMonthLabel, getAvailableMonths } from "@/lib/calculateMonthlySummary";
import type { Transaction } from "@/types/transaction";

type DashboardProps = {
  transactions: Transaction[];
  period: string | null;
  onPeriodChange: (period: string) => void;
  accountFilter: AccountFilter;
  onAccountFilterChange: (value: AccountFilter) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (value: TypeFilter) => void;
  onViewTransactions: () => void;
  usingSampleData: boolean;
  uncategorizedExpenseCount: number;
  isCategorizing: boolean;
  categorizeProgress: number;
  onCategorize: () => void;
  categorizeError: string | null;
};

export default function Dashboard({
  transactions,
  period,
  onPeriodChange,
  accountFilter,
  onAccountFilterChange,
  typeFilter,
  onTypeFilterChange,
  onViewTransactions,
  usingSampleData,
  uncategorizedExpenseCount,
  isCategorizing,
  categorizeProgress,
  onCategorize,
  categorizeError,
}: DashboardProps) {
  const availableMonths = getAvailableMonths(transactions);

  if (transactions.length === 0) {
    return (
      <div className="border border-dashed border-border bg-surface px-4 py-12 text-center text-sm text-muted">
        No transactions loaded yet. Upload a Bank of America CSV to see your
        dashboard.
      </div>
    );
  }

  const effectivePeriod =
    period === ALL_TIME
      ? ALL_TIME
      : period && availableMonths.includes(period)
        ? period
        : (availableMonths[0] ?? ALL_TIME);

  const filters = {
    period: effectivePeriod,
    accountType: accountFilter,
    transactionType: typeFilter,
  };

  const filtered = filterDashboardTransactions(transactions, filters);
  const previous = resolvePreviousPeriodTransactions(transactions, filters);
  const summary = calculateDashboardSummary(filtered, previous);
  const trendMode = effectivePeriod === ALL_TIME ? "month" : "day";
  const trendPoints = groupExpensesByTime(filtered, trendMode);
  const categoryAll = groupExpensesByCategory(filtered, {
    topN: 50,
    collapseOther: false,
  });
  const categoryTop = groupExpensesByCategory(filtered, {
    topN: 5,
    collapseOther: true,
  });
  const largest = getLargestExpenses(filtered, 5);
  const insights = generateMonthlyInsights(filtered, previous);

  return (
    <div className="flex flex-col gap-6">
      <div
          id="dashboard-filters"
          className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between"
        >
        <div className="flex flex-wrap items-center gap-3">
          <h2
            id="dashboard-heading"
            className="text-sm font-medium uppercase tracking-wide text-muted"
          >
            2 · Dashboard
          </h2>
          {usingSampleData && transactions.length > 0 && (
            <span className="border border-green/25 bg-green-soft px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-green">
              Sample data
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            Period
            <select
              value={effectivePeriod}
              onChange={(event) => onPeriodChange(event.target.value)}
              className="border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
            >
              <option value={ALL_TIME}>All time</option>
              {availableMonths.map((monthKey) => (
                <option key={monthKey} value={monthKey}>
                  {formatMonthLabel(monthKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Account
            <select
              value={accountFilter}
              onChange={(event) =>
                onAccountFilterChange(event.target.value as AccountFilter)
              }
              className="border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
            >
              <option value="all">All</option>
              <option value="checking">Checking</option>
              <option value="credit">Credit</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            Type
            <select
              value={typeFilter}
              onChange={(event) =>
                onTypeFilterChange(event.target.value as TypeFilter)
              }
              className="border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
            >
              <option value="all">All</option>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
              <option value="transfer">Transfer</option>
            </select>
          </label>
        </div>
      </div>

      <DashboardSummaryCards summary={summary} />

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="flex flex-col gap-3 lg:col-span-3">
          <h3 className="text-sm font-medium text-foreground">
            Spending trend
          </h3>
          <p className="text-xs text-muted">
            Expenses only
            {trendMode === "day" ? " · by day" : " · by month"}
          </p>
          <SpendingTrendChart points={trendPoints} mode={trendMode} />
        </section>
        <section className="flex flex-col gap-3 lg:col-span-2">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-medium text-foreground">
              Spending by category
            </h3>
            <p className="text-xs text-muted">
              {uncategorizedExpenseCount > 0
                ? `${uncategorizedExpenseCount} expense${uncategorizedExpenseCount === 1 ? "" : "s"} still need a category`
                : "All expenses categorized — edit any label anytime"}
            </p>
          </div>
          <button
            type="button"
            onClick={onCategorize}
            disabled={isCategorizing || uncategorizedExpenseCount === 0}
            className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center border-2 border-green bg-green px-5 py-3.5 text-base font-semibold tracking-wide text-white shadow-sm transition-colors hover:border-green-mid hover:bg-green-mid active:scale-[0.99] disabled:cursor-not-allowed disabled:border-border disabled:bg-border disabled:text-muted disabled:active:scale-100"
          >
            {isCategorizing ? "Categorizing…" : "Categorize expenses"}
          </button>
          <CategoryBreakdown
            items={categoryTop.items}
            allItems={categoryAll.items}
          />
          {(isCategorizing || categorizeProgress > 0) && (
            <div className="flex flex-col gap-1.5">
              <div
                className="h-2 w-full overflow-hidden bg-green-soft"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(categorizeProgress)}
                aria-label="Categorization progress"
              >
                <div
                  className="h-full bg-green transition-[width] duration-200 ease-out"
                  style={{ width: `${categorizeProgress}%` }}
                />
              </div>
              <p className="text-xs tabular-nums text-muted">
                {categorizeProgress >= 100
                  ? "Done"
                  : `Working… ${Math.round(categorizeProgress)}%`}
              </p>
            </div>
          )}
          <p className="text-xs leading-relaxed text-muted">
            AI suggests categories from descriptions only. You stay in control.
          </p>
          {categorizeError && (
            <div className="border-l-2 border-danger bg-danger-soft px-3 py-2 text-xs text-danger">
              {categorizeError}
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-foreground">
            Largest expenses
          </h3>
          <LargestExpenses expenses={largest} onViewAll={onViewTransactions} />
        </section>
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-foreground">
            Monthly insights
          </h3>
          <MonthlyInsights insights={insights} />
        </section>
      </div>
    </div>
  );
}
