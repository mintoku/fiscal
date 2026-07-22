"use client";

import { useEffect, useState } from "react";
import FileUploader from "@/components/FileUploader";
import MonthlySummaryCards from "@/components/MonthlySummaryCards";
import TransactionTable from "@/components/TransactionTable";
import {
  ALL_TIME,
  calculateMonthlySummary,
  filterTransactionsByPeriod,
  formatMonthLabel,
  getAvailableMonths,
} from "@/lib/calculateMonthlySummary";
import {
  getUniqueUncategorizedExpenses,
  normalizeDescription,
} from "@/lib/categorizeExpenses";
import { parseCsvFile } from "@/lib/parseCsv";
import type { CategorizeResponse } from "@/types/categorize";
import type {
  ExpenseCategory,
  Transaction,
  TransactionType,
} from "@/types/transaction";

const SAMPLE_FILES = [
  "/samples/sample-checking-transactions.csv",
  "/samples/sample-credit-card-transactions.csv",
] as const;

async function loadSampleTransactions(): Promise<Transaction[]> {
  const loaded: Transaction[] = [];

  for (const path of SAMPLE_FILES) {
    const response = await fetch(path);
    if (!response.ok) continue;
    const text = await response.text();
    const fileName = path.split("/").pop() ?? path;
    const result = parseCsvFile(text, fileName);
    if (result.format !== "unsupported") {
      loaded.push(...result.transactions);
    }
  }

  return loaded;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(ALL_TIME);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeError, setCategorizeError] = useState<string | null>(null);
  const [usingSampleData, setUsingSampleData] = useState(true);
  const [samplesReady, setSamplesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSamples() {
      try {
        const sampleTransactions = await loadSampleTransactions();
        if (cancelled || sampleTransactions.length === 0) return;
        setTransactions(sampleTransactions);
        setUsingSampleData(true);
        setSelectedPeriod(ALL_TIME);
      } finally {
        if (!cancelled) setSamplesReady(true);
      }
    }

    void loadSamples();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableMonths = getAvailableMonths(transactions);
  const effectivePeriod =
    selectedPeriod === ALL_TIME
      ? ALL_TIME
      : selectedPeriod && availableMonths.includes(selectedPeriod)
        ? selectedPeriod
        : (availableMonths[0] ?? null);

  const periodTransactions = filterTransactionsByPeriod(
    transactions,
    effectivePeriod,
  );
  const summary = calculateMonthlySummary(periodTransactions);

  const uncategorizedExpenseCount = transactions.filter(
    (transaction) =>
      transaction.transactionType === "expense" && transaction.category === null,
  ).length;

  function handleTransactionsLoaded(newTransactions: Transaction[]) {
    setTransactions((current) =>
      usingSampleData
        ? newTransactions
        : [...current, ...newTransactions],
    );
    setUsingSampleData(false);
  }

  function handleTransactionTypeChange(
    id: string,
    transactionType: TransactionType,
  ) {
    setTransactions((current) =>
      current.map((transaction) => {
        if (transaction.id !== id) return transaction;

        if (transactionType !== "expense") {
          return {
            ...transaction,
            transactionType,
            category: null,
            categorySource: null,
            categoryConfidence: null,
          };
        }

        return { ...transaction, transactionType };
      }),
    );
  }

  function handleCategoryChange(id: string, category: ExpenseCategory) {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? {
              ...transaction,
              category,
              categorySource: "manual",
              categoryConfidence: null,
            }
          : transaction,
      ),
    );
  }

  async function handleCategorizeExpenses() {
    const uniqueExpenses = getUniqueUncategorizedExpenses(transactions);
    if (uniqueExpenses.length === 0) {
      setCategorizeError("No uncategorized expenses to categorize.");
      return;
    }

    setIsCategorizing(true);
    setCategorizeError(null);

    try {
      const response = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: uniqueExpenses }),
      });

      const raw = await response.text();
      let data: CategorizeResponse | { error?: string };
      try {
        data = JSON.parse(raw) as CategorizeResponse | { error?: string };
      } catch {
        setCategorizeError(
          response.status === 404
            ? "Categorization API is unavailable on this host (static sites like GitHub Pages cannot run /api routes). Use npm run dev locally or deploy to a Node host such as Vercel."
            : "Categorization failed. Your transactions were left unchanged.",
        );
        return;
      }

      if (!response.ok || !("results" in data)) {
        setCategorizeError(
          "error" in data && data.error
            ? data.error
            : "Categorization failed. Your transactions were left unchanged.",
        );
        return;
      }

      const resultsByNormalized = new Map<
        string,
        { category: ExpenseCategory; confidence: number }
      >();

      for (const result of data.results) {
        const source = uniqueExpenses.find((item) => item.id === result.id);
        if (!source) continue;
        resultsByNormalized.set(normalizeDescription(source.description), {
          category: result.category,
          confidence: result.confidence,
        });
      }

      setTransactions((current) =>
        current.map((transaction) => {
          if (transaction.transactionType !== "expense") return transaction;
          if (transaction.category !== null) return transaction;

          const match = resultsByNormalized.get(
            normalizeDescription(transaction.description),
          );
          if (!match) return transaction;

          return {
            ...transaction,
            category: match.category,
            categorySource: "ai",
            categoryConfidence: match.confidence,
          };
        }),
      );
    } catch {
      setCategorizeError(
        "Could not reach the categorization service. Your transactions were left unchanged.",
      );
    } finally {
      setIsCategorizing(false);
    }
  }

  async function handleReloadSamples() {
    setUnsupportedFiles([]);
    setTypeFilter("all");
    setSelectedPeriod(ALL_TIME);
    setCategorizeError(null);
    const sampleTransactions = await loadSampleTransactions();
    setTransactions(sampleTransactions);
    setUsingSampleData(true);
  }

  function handleClear() {
    setTransactions([]);
    setUnsupportedFiles([]);
    setTypeFilter("all");
    setSelectedPeriod(ALL_TIME);
    setCategorizeError(null);
    setUsingSampleData(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Spending Retrospective
        </h1>
        <p className="max-w-2xl text-zinc-600">
          Explore a sample checking and credit-card export, then try AI
          categorization. When you&apos;re ready for your own data, clear the
          sample and upload your Bank of America CSV files.
        </p>

        {usingSampleData && transactions.length > 0 && (
          <div className="rounded border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <p className="font-medium">Getting started</p>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>
                Sample data is loaded. Click <strong>Categorize expenses</strong>{" "}
                to label the uncategorized expenses.
              </li>
              <li>
                Review or correct categories in the table, and browse months
                with the time period control.
              </li>
              <li>
                When ready for your own info, click <strong>Clear</strong>, then
                upload your CSV files.
              </li>
            </ol>
          </div>
        )}

        {!usingSampleData && transactions.length === 0 && samplesReady && (
          <div className="rounded border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            Sample data cleared. Upload your own Bank of America checking or
            credit-card CSV files, or{" "}
            <button
              type="button"
              onClick={() => void handleReloadSamples()}
              className="font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-700"
            >
              reload the sample data
            </button>
            .
          </div>
        )}
      </header>

      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <FileUploader
          onTransactionsLoaded={handleTransactionsLoaded}
          onUnsupportedFiles={setUnsupportedFiles}
        />
        <button
          type="button"
          onClick={handleClear}
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Clear
        </button>
      </section>

      {unsupportedFiles.length > 0 && (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Unsupported file
          {unsupportedFiles.length === 1 ? "" : "s"}:{" "}
          {unsupportedFiles.join(", ")}
        </div>
      )}

      {transactions.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label
                htmlFor="period-selector"
                className="text-sm font-medium text-zinc-700"
              >
                Time period
              </label>
              <select
                id="period-selector"
                value={effectivePeriod ?? ""}
                onChange={(event) => setSelectedPeriod(event.target.value)}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800"
              >
                <option value={ALL_TIME}>All time</option>
                {availableMonths.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {formatMonthLabel(monthKey)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex max-w-md flex-col gap-1">
              <button
                type="button"
                onClick={handleCategorizeExpenses}
                disabled={isCategorizing || uncategorizedExpenseCount === 0}
                className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
              >
                {isCategorizing ? "Categorizing…" : "Categorize expenses"}
              </button>
              {uncategorizedExpenseCount > 0 ? (
                <p className="text-xs text-zinc-600">
                  {uncategorizedExpenseCount} uncategorized expense
                  {uncategorizedExpenseCount === 1 ? "" : "s"} ready — click to
                  categorize.
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  All expenses are categorized. You can still edit any row.
                </p>
              )}
              <p className="text-xs text-zinc-500">
                Only transaction descriptions are sent for categorization. Files
                and account details remain in your browser.
              </p>
            </div>
          </div>

          {categorizeError && (
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {categorizeError}
            </div>
          )}

          <MonthlySummaryCards summary={summary} />
        </section>
      )}

      <TransactionTable
        transactions={periodTransactions}
        totalCount={transactions.length}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onTransactionTypeChange={handleTransactionTypeChange}
        onCategoryChange={handleCategoryChange}
        emptyMessage={
          !samplesReady
            ? "Loading sample data…"
            : transactions.length === 0
              ? "No transactions yet. Upload your CSV files or reload the sample data."
              : "No transactions for this time period."
        }
      />
    </main>
  );
}
