import { describe, expect, it } from "vitest";
import {
  ALL_TIME,
  calculateDashboardSummary,
  calculateMetricChange,
  calculateTotals,
  filterDashboardTransactions,
  generateMonthlyInsights,
  getLargestExpenses,
  getPreviousMonthKey,
  groupExpensesByCategory,
  groupExpensesByTime,
} from "@/lib/dashboard";
import type { Transaction } from "@/types/transaction";

function tx(
  partial: Partial<Transaction> &
    Pick<Transaction, "id" | "date" | "amount" | "transactionType">,
): Transaction {
  return {
    description: partial.description ?? "Test",
    accountType: partial.accountType ?? "checking",
    sourceFile: partial.sourceFile ?? "test.csv",
    category: partial.category ?? null,
    categorySource: partial.categorySource ?? null,
    categoryConfidence: partial.categoryConfidence ?? null,
    ...partial,
  };
}

describe("calculateTotals", () => {
  it("excludes transfers from income and expenses", () => {
    const totals = calculateTotals([
      tx({ id: "1", date: "01/10/2026", amount: 1000, transactionType: "income" }),
      tx({ id: "2", date: "01/11/2026", amount: -40, transactionType: "expense" }),
      tx({
        id: "3",
        date: "01/12/2026",
        amount: -200,
        transactionType: "transfer",
      }),
      tx({
        id: "4",
        date: "01/13/2026",
        amount: 50,
        transactionType: "transfer",
      }),
    ]);

    expect(totals.income).toBe(1000);
    expect(totals.expenses).toBe(40);
    expect(totals.transfers).toBe(250);
    expect(totals.netCashFlow).toBe(960);
  });

  it("uses transactionType rather than amount sign alone", () => {
    const totals = calculateTotals([
      // Positive expense should still count as expense if typed that way
      tx({
        id: "1",
        date: "01/10/2026",
        amount: 25,
        transactionType: "expense",
      }),
      // Negative income still income by type
      tx({
        id: "2",
        date: "01/11/2026",
        amount: -10,
        transactionType: "income",
      }),
    ]);

    expect(totals.expenses).toBe(25);
    expect(totals.income).toBe(10);
    expect(totals.netCashFlow).toBe(-15);
  });

  it("handles empty arrays", () => {
    expect(calculateTotals([])).toEqual({
      income: 0,
      expenses: 0,
      transfers: 0,
      netCashFlow: 0,
    });
  });
});

describe("net cash flow", () => {
  it("is income minus expenses", () => {
    const summary = calculateDashboardSummary(
      [
        tx({
          id: "1",
          date: "01/01/2026",
          amount: 500,
          transactionType: "income",
        }),
        tx({
          id: "2",
          date: "01/02/2026",
          amount: -120,
          transactionType: "expense",
        }),
      ],
      null,
    );
    expect(summary.netCashFlow).toBe(380);
  });
});

describe("date filtering", () => {
  const rows = [
    tx({
      id: "1",
      date: "01/05/2026",
      amount: -10,
      transactionType: "expense",
      accountType: "checking",
    }),
    tx({
      id: "2",
      date: "07/05/2026",
      amount: -20,
      transactionType: "expense",
      accountType: "credit",
    }),
    tx({
      id: "3",
      date: "07/06/2026",
      amount: 100,
      transactionType: "income",
      accountType: "checking",
    }),
  ];

  it("filters by month period", () => {
    const filtered = filterDashboardTransactions(rows, {
      period: "2026-07",
      accountType: "all",
      transactionType: "all",
    });
    expect(filtered.map((t) => t.id)).toEqual(["2", "3"]);
  });

  it("supports all-time", () => {
    const filtered = filterDashboardTransactions(rows, {
      period: ALL_TIME,
      accountType: "all",
      transactionType: "all",
    });
    expect(filtered).toHaveLength(3);
  });

  it("filters by account and type", () => {
    const filtered = filterDashboardTransactions(rows, {
      period: ALL_TIME,
      accountType: "checking",
      transactionType: "expense",
    });
    expect(filtered.map((t) => t.id)).toEqual(["1"]);
  });
});

describe("category grouping", () => {
  it("groups expenses and sorts highest to lowest", () => {
    const { items, totalExpenses } = groupExpensesByCategory(
      [
        tx({
          id: "1",
          date: "01/01/2026",
          amount: -10,
          transactionType: "expense",
          category: "Dining",
        }),
        tx({
          id: "2",
          date: "01/02/2026",
          amount: -30,
          transactionType: "expense",
          category: "Dining",
        }),
        tx({
          id: "3",
          date: "01/03/2026",
          amount: -20,
          transactionType: "expense",
          category: null,
        }),
        tx({
          id: "4",
          date: "01/04/2026",
          amount: 100,
          transactionType: "income",
          category: null,
        }),
      ],
      { topN: 5, collapseOther: false },
    );

    expect(totalExpenses).toBe(60);
    expect(items[0]?.category).toBe("Dining");
    expect(items[0]?.total).toBe(40);
    expect(items[0]?.count).toBe(2);
    expect(items[0]?.percent).toBeCloseTo((40 / 60) * 100);
    expect(items[1]?.category).toBe("Uncategorized");
  });

  it("collapses overflow into Other", () => {
    const many = Array.from({ length: 7 }, (_, i) =>
      tx({
        id: String(i),
        date: "01/01/2026",
        amount: -(i + 1) * 10,
        transactionType: "expense",
        category:
          (
            [
              "Dining",
              "Groceries",
              "Transportation",
              "Shopping",
              "Bills",
              "Entertainment",
              "Health",
            ] as const
          )[i]!,
      }),
    );
    const { items } = groupExpensesByCategory(many, {
      topN: 5,
      collapseOther: true,
    });
    expect(items).toHaveLength(6);
    expect(items[items.length - 1]?.category).toBe("Other");
  });
});

describe("largest expenses", () => {
  it("orders by absolute amount descending", () => {
    const largest = getLargestExpenses(
      [
        tx({
          id: "a",
          date: "01/01/2026",
          amount: -10,
          transactionType: "expense",
        }),
        tx({
          id: "b",
          date: "01/02/2026",
          amount: -50,
          transactionType: "expense",
        }),
        tx({
          id: "c",
          date: "01/03/2026",
          amount: -20,
          transactionType: "expense",
        }),
        tx({
          id: "d",
          date: "01/04/2026",
          amount: 1000,
          transactionType: "income",
        }),
      ],
      2,
    );
    expect(largest.map((t) => t.id)).toEqual(["b", "c"]);
  });
});

describe("month-over-month comparison", () => {
  it("computes previous month key", () => {
    expect(getPreviousMonthKey("2026-01")).toBe("2025-12");
    expect(getPreviousMonthKey("2026-07")).toBe("2026-06");
  });

  it("returns null percent when previous is zero", () => {
    const change = calculateMetricChange(50, 0);
    expect(change.absolute).toBe(50);
    expect(change.percent).toBeNull();
  });

  it("compares with previous month totals", () => {
    const summary = calculateDashboardSummary(
      [
        tx({
          id: "1",
          date: "07/01/2026",
          amount: -100,
          transactionType: "expense",
        }),
      ],
      [
        tx({
          id: "2",
          date: "06/01/2026",
          amount: -80,
          transactionType: "expense",
        }),
      ],
    );

    expect(summary.changes?.expenses?.absolute).toBe(20);
    expect(summary.changes?.expenses?.percent).toBeCloseTo(25);
  });

  it("handles zero previous month without crashing", () => {
    const summary = calculateDashboardSummary(
      [
        tx({
          id: "1",
          date: "07/01/2026",
          amount: -40,
          transactionType: "expense",
        }),
      ],
      [],
    );
    expect(summary.previous?.expenses).toBe(0);
    expect(summary.changes?.expenses?.percent).toBeNull();
  });
});

describe("trend grouping", () => {
  it("groups expenses by day and excludes income/transfers", () => {
    const points = groupExpensesByTime(
      [
        tx({
          id: "1",
          date: "07/01/2026",
          amount: -10,
          transactionType: "expense",
        }),
        tx({
          id: "2",
          date: "07/01/2026",
          amount: -5,
          transactionType: "expense",
        }),
        tx({
          id: "3",
          date: "07/02/2026",
          amount: 100,
          transactionType: "income",
        }),
        tx({
          id: "4",
          date: "07/02/2026",
          amount: -50,
          transactionType: "transfer",
        }),
      ],
      "day",
    );
    expect(points).toEqual([
      { key: "2026-07-01", label: "07/01", total: 15 },
    ]);
  });
});

describe("insights", () => {
  it("generates supported insights only", () => {
    const insights = generateMonthlyInsights(
      [
        tx({
          id: "1",
          date: "07/01/2026",
          amount: 1000,
          transactionType: "income",
        }),
        tx({
          id: "2",
          date: "07/02/2026",
          amount: -200,
          transactionType: "expense",
          description: "CAFE",
          category: "Dining",
        }),
        tx({
          id: "3",
          date: "07/03/2026",
          amount: -50,
          transactionType: "expense",
          description: "CAFE",
          category: null,
        }),
      ],
      [
        tx({
          id: "4",
          date: "06/01/2026",
          amount: -100,
          transactionType: "expense",
          category: "Dining",
        }),
      ],
    );

    expect(insights.length).toBeGreaterThan(0);
    expect(insights.length).toBeLessThanOrEqual(4);
    expect(insights.some((i) => i.id === "largest-category")).toBe(true);
    expect(insights.some((i) => i.id === "uncategorized")).toBe(true);
  });

  it("returns empty list for empty transactions", () => {
    expect(generateMonthlyInsights([], null)).toEqual([]);
  });
});
