"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Dashboard from "@/components/dashboard/Dashboard";
import FileUploader from "@/components/FileUploader";
import TransactionTable from "@/components/TransactionTable";
import { useTransactionSession } from "@/hooks/useTransactionSession";
import {
  clearRemoteTransactions,
  fetchTransactions,
  isCloudApiConfigured,
  uploadCsvToCloud,
} from "@/lib/api/fiscalApi";
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
import type { Transaction } from "@/types/transaction";
import { parseCsvFile } from "@/lib/parseCsv";

export default function WorkspaceExperience() {
  const cloudEnabled = isCloudApiConfigured();
  const {
    transactions,
    uncategorizedExpenseCount,
    isCategorizing,
    categorizeProgress,
    categorizeError,
    replaceTransactions,
    appendTransactions,
    clearTransactions,
    handleTransactionTypeChange,
    handleCategoryChange,
    handleCategorizeExpenses,
  } = useTransactionSession();

  const [dataPanelOpen, setDataPanelOpen] = useState(true);
  const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingRemote, setIsLoadingRemote] = useState(cloudEnabled);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (!cloudEnabled) return;

    let cancelled = false;

    async function loadRemote() {
      setIsLoadingRemote(true);
      setUploadError(null);
      try {
        const remote = await fetchTransactions();
        if (cancelled) return;
        replaceTransactions(remote);
        setSelectedPeriod(null);
        if (remote.length > 0) {
          setUploadStatus(
            `Loaded ${remote.length} saved transaction${remote.length === 1 ? "" : "s"} from DynamoDB.`,
          );
        }
      } catch (error) {
        if (cancelled) return;
        setUploadError(
          error instanceof Error
            ? error.message
            : "Could not load saved transactions.",
        );
      } finally {
        if (!cancelled) setIsLoadingRemote(false);
      }
    }

    void loadRemote();
    return () => {
      cancelled = true;
    };
  }, [cloudEnabled, replaceTransactions]);

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

  async function handleCloudFiles(files: File[]) {
    setIsUploading(true);
    setUploadError(null);
    setUnsupportedFiles([]);

    let totalAdded = 0;
    const unsupported: string[] = [];

    try {
      for (const file of files) {
        try {
          const result = await uploadCsvToCloud(file);
          totalAdded += result.transactionCount;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Upload failed";
          if (message.toLowerCase().includes("unsupported")) {
            unsupported.push(file.name);
          } else {
            throw error;
          }
        }
      }

      const remote = await fetchTransactions();
      replaceTransactions(remote);
      setSelectedPeriod(null);
      setUnsupportedFiles(unsupported);

      if (totalAdded > 0) {
        setUploadStatus(
          `Processed ${totalAdded} transaction${totalAdded === 1 ? "" : "s"} via S3 → Lambda → DynamoDB.`,
        );
      } else if (unsupported.length > 0) {
        setUploadStatus(null);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Cloud upload failed. Check your API URL and AWS deploy.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleLocalTransactionsLoaded(
    newTransactions: Parameters<typeof appendTransactions>[0],
  ) {
    appendTransactions(newTransactions);
    setSelectedPeriod(null);
    setUploadError(null);
    setUploadStatus(
      `Loaded ${newTransactions.length} transaction${newTransactions.length === 1 ? "" : "s"} locally. Set NEXT_PUBLIC_API_URL after deploying AWS to persist in the cloud.`,
    );
  }

  async function handleLocalFiles(files: File[]) {
    const allTransactions: Transaction[] = [];
    const unsupported: string[] = [];

    for (const file of files) {
      const text = await file.text();
      const result = parseCsvFile(text, file.name);
      if (result.format === "unsupported") {
        unsupported.push(file.name);
        continue;
      }
      allTransactions.push(...result.transactions);
    }

    setUnsupportedFiles(unsupported);
    if (allTransactions.length > 0) {
      handleLocalTransactionsLoaded(allTransactions);
    }
  }

  async function handleClear() {
    setIsClearing(true);
    setUploadError(null);
    try {
      if (cloudEnabled) {
        await clearRemoteTransactions();
      }
      clearTransactions();
      setUnsupportedFiles([]);
      setTypeFilter("all");
      setAccountFilter("all");
      setSelectedPeriod(null);
      setUploadStatus(
        cloudEnabled ? "Cleared transactions in DynamoDB." : null,
      );
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Could not clear remote transactions.",
      );
    } finally {
      setIsClearing(false);
    }
  }

  function handleViewTransactions() {
    document
      .getElementById("transactions-heading")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const busy = isUploading || isClearing || isLoadingRemote;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 sm:px-8">
        <Link
          href="/"
          className="text-sm text-muted underline underline-offset-2 hover:text-green"
        >
          Back to demo
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-green">
          Your workspace
        </p>
      </div>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-5 pb-10 pt-6 sm:px-8 sm:pb-12 sm:pt-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-green">
              Cloud-backed ledger
            </p>
            <h1 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
              Your workspace
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Upload your Bank of America exports here. Statements go through
              S3 and Lambda; normalized transactions are stored in DynamoDB so
              your dashboard survives beyond a single browser session.
            </p>
          </div>

          <details
            className="group w-full border border-border bg-surface"
            open={dataPanelOpen}
            onToggle={(event) => setDataPanelOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer list-none px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium uppercase tracking-wide text-muted">
                  1 · Upload statements
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      void handleClear();
                    }}
                    disabled={busy || transactions.length === 0}
                    className="inline-flex min-h-10 items-center border-2 border-foreground/20 bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-green hover:text-green disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isClearing ? "Clearing…" : "Clear data"}
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
                <p className="text-sm font-medium text-green">Cloud pipeline</p>
                <ol className="space-y-2 text-sm text-muted">
                  <li className="flex gap-2">
                    <span className="font-mono text-xs text-green">1</span>
                    <span>Upload CSV → secure object storage (S3)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-xs text-green">2</span>
                    <span>Lambda normalizes checking &amp; credit rows</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-mono text-xs text-green">3</span>
                    <span>Transactions land in DynamoDB for your dashboard</span>
                  </li>
                </ol>
                <p
                  className={`border px-3 py-2 text-xs leading-relaxed ${
                    cloudEnabled
                      ? "border-green/25 bg-green-soft text-green"
                      : "border-border bg-background text-muted"
                  }`}
                >
                  {cloudEnabled
                    ? "Connected to AWS API Gateway. Uploads use the cloud pipeline."
                    : "AWS API not configured. Uploads parse locally until you set NEXT_PUBLIC_API_URL (see infra/README.md)."}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium text-foreground">Upload data</p>
                <FileUploader
                  busy={busy}
                  hint={
                    cloudEnabled
                      ? "or click to browse · uploads go to S3"
                      : "or click to browse · local parse (no API URL)"
                  }
                  onUnsupportedFiles={setUnsupportedFiles}
                  onFilesSelected={
                    cloudEnabled ? handleCloudFiles : handleLocalFiles
                  }
                />
                <p className="border border-warn/35 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
                  Temporary note: only Bank of America checking and credit-card
                  CSV exports are supported right now.
                </p>
                {isLoadingRemote && (
                  <p className="text-xs text-muted">Loading saved ledger…</p>
                )}
                {uploadStatus && (
                  <p className="border border-green/25 bg-green-soft px-3 py-2 text-xs leading-relaxed text-green">
                    {uploadStatus}
                  </p>
                )}
                {uploadError && (
                  <p className="border border-warn/40 bg-warn-soft px-3 py-2 text-xs leading-relaxed text-warn">
                    {uploadError}
                  </p>
                )}
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
            usingSampleData={false}
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
            <h2
              id="transactions-heading"
              className="text-sm font-medium uppercase tracking-wide text-muted"
            >
              3 · Transactions
            </h2>
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
          </div>
          <TransactionTable
            transactions={periodTransactions}
            totalCount={transactions.length}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onTransactionTypeChange={handleTransactionTypeChange}
            onCategoryChange={handleCategoryChange}
            emptyMessage={
              isLoadingRemote
                ? "Loading saved transactions…"
                : "No transactions yet. Upload your CSV files to build your ledger."
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
            Privacy &amp; cloud processing
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Bank usernames, passwords, and credentials are never collected.
              </li>
              <li>
                When the cloud API is connected, statement files are uploaded to
                S3 and processed by Lambda; normalized rows are stored in
                DynamoDB.
              </li>
              <li>
                Prefer a local walkthrough first?{" "}
                <Link
                  href="/"
                  className="font-medium text-green underline underline-offset-2 hover:text-green-mid"
                >
                  Return to the sample demo
                </Link>
                .
              </li>
            </ul>
          </div>
        </section>
      </main>
    </>
  );
}
