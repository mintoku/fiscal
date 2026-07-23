"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Dashboard from "@/components/dashboard/Dashboard";
import TransactionTable from "@/components/TransactionTable";
import TryItYourselfCta from "@/components/TryItYourselfCta";
import { useTransactionSession } from "@/hooks/useTransactionSession";
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
import { loadSampleTransactions } from "@/lib/loadSampleTransactions";

type DemoExperienceProps = {
  onBack: () => void;
};

export default function DemoExperience({ onBack }: DemoExperienceProps) {
  const {
    transactions,
    uncategorizedExpenseCount,
    isCategorizing,
    categorizeProgress,
    categorizeError,
    replaceTransactions,
    handleTransactionTypeChange,
    handleCategoryChange,
    handleCategorizeExpenses,
  } = useTransactionSession();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [samplesReady, setSamplesReady] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSamples() {
      try {
        const sampleTransactions = await loadSampleTransactions();
        if (cancelled || sampleTransactions.length === 0) return;
        replaceTransactions(sampleTransactions);
        setSelectedPeriod(null);
      } finally {
        if (!cancelled) setSamplesReady(true);
      }
    }

    void loadSamples();
    return () => {
      cancelled = true;
    };
  }, [replaceTransactions]);

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

  function handleViewTransactions() {
    document
      .getElementById("transactions-heading")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="px-5 pt-4 sm:px-8">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted underline underline-offset-2 hover:text-green"
        >
          Back to home
        </button>
      </div>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-green">
              Interactive demo
            </p>
            <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Fiscal
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              This walkthrough uses sample checking and credit-card exports so
              you can see the product without uploading anything.
            </p>
          </div>

          <TryItYourselfCta />

          <details
            className="group w-full border border-border bg-surface"
            open={guideOpen}
            onToggle={(event) => setGuideOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium uppercase tracking-wide text-muted">
                  1 · How to explore
                </span>
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
            </summary>

            <div className="border-t border-border px-4 py-4">
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
                    Browse the dashboard insights, then adjust filters and labels
                    anytime.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-xs text-green">3</span>
                  <span>
                    When you&apos;re ready,{" "}
                    <Link
                      href="/workspace"
                      className="font-semibold text-green underline underline-offset-2 hover:text-green-mid"
                    >
                      open your workspace
                    </Link>{" "}
                    to upload your own statements.
                  </span>
                </li>
              </ol>
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
            usingSampleData
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
              <span className="border border-green/25 bg-green-soft px-2 py-0.5 font-mono text-[11px] uppercase tracking-wide text-green">
                Sample data
              </span>
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
              <p className="text-xs text-muted">
                Demo checking &amp; credit-card exports — not your accounts
              </p>
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
            About this demo
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>No account login is required to explore the demo.</li>
              <li>
                Sample CSVs are loaded in your browser — nothing here is your
                real banking data.
              </li>
              <li>
                When you categorize, only unique expense descriptions are sent
                to the categorization API.
              </li>
              <li>
                Your own statements are handled separately in{" "}
                <Link
                  href="/workspace"
                  className="font-medium text-green underline underline-offset-2 hover:text-green-mid"
                >
                  your workspace
                </Link>
                , where uploads are processed in the cloud.
              </li>
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
