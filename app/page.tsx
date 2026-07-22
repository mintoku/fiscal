"use client";

import { useEffect, useState } from "react";
import FileUploader from "@/components/FileUploader";
import LandingHero from "@/components/LandingHero";
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
  const [hasStarted, setHasStarted] = useState(false);
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
      usingSampleData ? newTransactions : [...current, ...newTransactions],
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

  if (!hasStarted) {
    return <LandingHero onStart={() => setHasStarted(true)} />;
  }

  return (
    <>
      <div className="px-5 pt-4 sm:px-8">
        <button
          type="button"
          onClick={() => setHasStarted(false)}
          className="text-sm text-muted underline underline-offset-2 hover:text-green"
        >
          Back to home
        </button>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8">
      <header className="flex flex-col gap-5 border-b border-border pb-6">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-green">
            Your financial snapshot
          </p>
          <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
            Fiscal
          </h1>
        </div>

        {usingSampleData && transactions.length > 0 && (
          <details
            className="group w-full border border-border bg-green-soft/50"
            open
          >
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-green marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                Getting started
                <span className="text-xs font-normal text-muted group-open:hidden">
                  Show
                </span>
                <span className="hidden text-xs font-normal text-muted group-open:inline">
                  Hide
                </span>
              </span>
            </summary>
            <ol className="grid gap-3 border-t border-border/70 px-4 py-4 text-sm text-muted sm:grid-cols-3">
              <li className="flex gap-2">
                <span className="font-mono text-xs text-green">1</span>
                <span>
                  Try{" "}
                  <span className="font-medium text-foreground">
                    Categorize expenses
                  </span>{" "}
                  for smart suggestions — you can change any category.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs text-green">2</span>
                <span>
                  Browse periods and adjust labels anytime; you stay in control.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-mono text-xs text-green">3</span>
                <span>
                  <span className="font-medium text-foreground">Clear</span>, then
                  upload your own CSVs.
                </span>
              </li>
            </ol>
          </details>
        )}

        {!usingSampleData && transactions.length === 0 && samplesReady && (
          <div className="w-full border border-border bg-surface px-4 py-3 text-sm text-muted">
            Sample cleared. Upload your CSV files, or{" "}
            <button
              type="button"
              onClick={() => void handleReloadSamples()}
              className="font-medium text-green underline underline-offset-2 hover:text-green-mid"
            >
              reload the sample
            </button>
            .
          </div>
        )}
      </header>

      <section aria-labelledby="data-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-2">
          <h2
            id="data-heading"
            className="text-sm font-medium uppercase tracking-wide text-muted"
          >
            1 · Data
          </h2>
          <button
            type="button"
            onClick={handleClear}
            className="border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:border-green hover:text-green"
          >
            Clear
          </button>
        </div>
        <FileUploader
          onTransactionsLoaded={handleTransactionsLoaded}
          onUnsupportedFiles={setUnsupportedFiles}
        />
        <p className="border border-warn/35 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
          Temporary note: only Bank of America checking and credit-card CSV
          exports are supported right now.
        </p>
        {unsupportedFiles.length > 0 && (
          <div className="border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-warn">
            Unsupported file
            {unsupportedFiles.length === 1 ? "" : "s"}:{" "}
            {unsupportedFiles.join(", ")}
          </div>
        )}
      </section>

      {transactions.length > 0 && (
        <section
          aria-labelledby="summary-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-3 border-b border-border pb-3 sm:flex-row sm:items-end sm:justify-between">
            <h2
              id="summary-heading"
              className="text-sm font-medium uppercase tracking-wide text-muted"
            >
              2 · Summary
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="period-selector" className="text-sm text-muted">
                Period
              </label>
              <select
                id="period-selector"
                value={effectivePeriod ?? ""}
                onChange={(event) => setSelectedPeriod(event.target.value)}
                className="border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
              >
                <option value={ALL_TIME}>All time</option>
                {availableMonths.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {formatMonthLabel(monthKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <MonthlySummaryCards summary={summary} />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs leading-relaxed text-muted">
              {uncategorizedExpenseCount > 0
                ? `${uncategorizedExpenseCount} uncategorized expense${uncategorizedExpenseCount === 1 ? "" : "s"}`
                : "All expenses categorized"}
              {" · "}
              Smart suggestions only — edit any category yourself. Only
              descriptions are sent.
            </p>
            <button
              type="button"
              onClick={handleCategorizeExpenses}
              disabled={isCategorizing || uncategorizedExpenseCount === 0}
              className="shrink-0 bg-green px-4 py-2 text-sm font-medium text-white hover:bg-green-mid disabled:cursor-not-allowed disabled:bg-border disabled:text-muted"
            >
              {isCategorizing ? "Categorizing…" : "Categorize expenses"}
            </button>
          </div>

          {categorizeError && (
            <div className="border-l-2 border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
              {categorizeError}
            </div>
          )}
        </section>
      )}

      <section
        aria-labelledby="transactions-heading"
        className="flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="transactions-heading"
              className="text-sm font-medium uppercase tracking-wide text-muted"
            >
              3 · Transactions
            </h2>
            {usingSampleData && transactions.length > 0 && (
              <span className="border border-green/25 bg-green-soft px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-green">
                Sample data
              </span>
            )}
          </div>
          {usingSampleData && transactions.length > 0 && (
            <p className="text-xs text-muted">
              Demo checking &amp; credit-card exports — not your accounts
            </p>
          )}
        </div>
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
      </section>
    </main>
    </>
  );
}
