"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/dashboard/Dashboard";
import FileUploader from "@/components/FileUploader";
import LandingHero from "@/components/LandingHero";
import TransactionTable from "@/components/TransactionTable";
import {
  ALL_TIME,
  filterTransactionsByPeriod,
  getAvailableMonths,
} from "@/lib/calculateMonthlySummary";
import {
  filterByAccountType,
  type AccountFilter,
  type TypeFilter,
} from "@/lib/dashboard";
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
  const [dataPanelOpen, setDataPanelOpen] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeProgress, setCategorizeProgress] = useState(0);
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
        setSelectedPeriod(null);
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

  const periodTransactions = filterByAccountType(
    filterTransactionsByPeriod(transactions, effectivePeriod),
    accountFilter,
  );

  const uncategorizedExpenseCount = transactions.filter(
    (transaction) =>
      transaction.transactionType === "expense" && transaction.category === null,
  ).length;

  function handleTransactionsLoaded(newTransactions: Transaction[]) {
    setTransactions((current) =>
      usingSampleData ? newTransactions : [...current, ...newTransactions],
    );
    setUsingSampleData(false);
    setSelectedPeriod(null);
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
    setCategorizeProgress(12);
    setCategorizeError(null);

    const progressTimer = window.setInterval(() => {
      setCategorizeProgress((current) => {
        if (current >= 88) return current;
        return current + Math.max(1, Math.round((90 - current) * 0.08));
      });
    }, 200);

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

      setCategorizeProgress(100);
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
      window.clearInterval(progressTimer);
      window.setTimeout(() => {
        setIsCategorizing(false);
        setCategorizeProgress(0);
      }, 350);
    }
  }

  async function handleReloadSamples() {
    setUnsupportedFiles([]);
    setTypeFilter("all");
    setAccountFilter("all");
    setSelectedPeriod(null);
    setCategorizeError(null);
    const sampleTransactions = await loadSampleTransactions();
    setTransactions(sampleTransactions);
    setUsingSampleData(true);
  }

  function handleClear() {
    setTransactions([]);
    setUnsupportedFiles([]);
    setTypeFilter("all");
    setAccountFilter("all");
    setSelectedPeriod(null);
    setCategorizeError(null);
    setUsingSampleData(false);
  }

  function handleViewTransactions() {
    document
      .getElementById("transactions-heading")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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
        <header className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-green">
              Your financial snapshot
            </p>
            <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Fiscal
            </h1>
          </div>

          <details
            className="group w-full border border-border bg-surface"
            open={dataPanelOpen}
            onToggle={(event) => setDataPanelOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium uppercase tracking-wide text-muted">
                  1 · Get started &amp; data
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      handleClear();
                    }}
                    className="inline-flex min-h-10 items-center border-2 border-foreground/20 bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-green hover:text-green"
                  >
                    Clear data
                  </button>
                  <span className="inline-flex min-h-10 items-center gap-2 border-2 border-green bg-green px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-mid">
                    <span className="group-open:hidden">Show</span>
                    <span className="hidden group-open:inline">Hide</span>
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4 transition-transform group-open:rotate-180"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </span>
              </span>
            </summary>

            <div className="grid gap-5 border-t border-border px-4 py-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-green">Getting started</p>
                {usingSampleData && transactions.length > 0 ? (
                  <ol className="space-y-2 text-sm text-muted">
                    <li className="flex gap-2">
                      <span className="font-mono text-xs text-green">1</span>
                      <span>
                        Try{" "}
                        <button
                          type="button"
                          onClick={() => void handleCategorizeExpenses()}
                          disabled={
                            isCategorizing || uncategorizedExpenseCount === 0
                          }
                          className="cursor-pointer font-semibold text-green underline underline-offset-2 hover:text-green-mid disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
                        >
                          Categorize expenses
                        </button>{" "}
                        for smart suggestions — you can change any category.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-xs text-green">2</span>
                      <span>
                        Browse the dashboard insights, then adjust labels
                        anytime.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-xs text-green">3</span>
                      <span>
                        <span className="font-medium text-foreground">
                          Clear data
                        </span>
                        , then upload your own CSVs.
                      </span>
                    </li>
                  </ol>
                ) : !usingSampleData &&
                  transactions.length === 0 &&
                  samplesReady ? (
                  <p className="text-sm text-muted">
                    Sample cleared. Upload your CSV files, or{" "}
                    <button
                      type="button"
                      onClick={() => void handleReloadSamples()}
                      className="font-medium text-green underline underline-offset-2 hover:text-green-mid"
                    >
                      reload the sample
                    </button>
                    .
                  </p>
                ) : (
                  <p className="text-sm text-muted">
                    Upload Bank of America checking or credit-card CSV exports
                    to build your snapshot.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">Upload data</p>
                <FileUploader
                  onTransactionsLoaded={handleTransactionsLoaded}
                  onUnsupportedFiles={setUnsupportedFiles}
                />
                <p className="border border-warn/35 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
                  Temporary note: only Bank of America checking and credit-card
                  CSV exports are supported right now.
                </p>
                {unsupportedFiles.length > 0 && (
                  <div className="border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-warn">
                    Unsupported file
                    {unsupportedFiles.length === 1 ? "" : "s"}:{" "}
                    {unsupportedFiles.join(", ")}
                  </div>
                )}
              </div>
            </div>
          </details>
        </header>

        <section
          aria-labelledby="dashboard-heading"
          className="flex flex-col gap-4"
        >
          <Dashboard
            transactions={transactions}
            period={effectivePeriod}
            onPeriodChange={setSelectedPeriod}
            accountFilter={accountFilter}
            onAccountFilterChange={setAccountFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onViewTransactions={handleViewTransactions}
            usingSampleData={usingSampleData}
            uncategorizedExpenseCount={uncategorizedExpenseCount}
            isCategorizing={isCategorizing}
            categorizeProgress={categorizeProgress}
            onCategorize={handleCategorizeExpenses}
            categorizeError={categorizeError}
          />
        </section>

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
                <>
                  <span className="border border-green/25 bg-green-soft px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-green">
                    Sample data
                  </span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex min-h-8 items-center border-2 border-foreground/20 bg-surface px-3 py-1 text-xs font-semibold text-foreground hover:border-green hover:text-green"
                  >
                    Clear data
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("dashboard-filters")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="text-sm font-medium text-green underline underline-offset-2 hover:text-green-mid"
              >
                Jump to filters
              </button>
              {usingSampleData && transactions.length > 0 && (
                <p className="text-xs text-muted">
                  Demo checking &amp; credit-card exports — not your accounts
                </p>
              )}
            </div>
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

        <section
          aria-labelledby="privacy-heading"
          className="border-t border-border pt-6"
        >
          <h2
            id="privacy-heading"
            className="text-sm font-medium uppercase tracking-wide text-muted"
          >
            Privacy
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>No account login is required.</li>
              <li>
                Bank usernames, passwords, and credentials are never collected.
              </li>
              <li>
                CSV files are read and parsed in your browser; they are not
                uploaded to a file-storage service.
              </li>
              <li>
                Transaction data lives in this page&apos;s memory only for your
                session — refreshing or clearing removes it.
              </li>
              <li>
                You can explore with built-in sample data instead of your own
                files.
              </li>
            </ul>
            <p>
              <span className="font-medium text-foreground">
                When you click Categorize expenses:
              </span>{" "}
              only uncategorized expense rows are considered. Matching
              descriptions are deduplicated, then each unique item is sent as{" "}
              <span className="font-mono text-xs text-foreground">
                {"{ id, description }"}
              </span>{" "}
              to this app&apos;s categorization API, which calls an AI provider.
              Amounts, account types, source filenames, balances, and full CSV
              contents are not included in that request. Suggested categories
              stay editable by you.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
