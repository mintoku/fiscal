"use client";

import { useState } from "react";
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
import type { Transaction, TransactionType } from "@/types/transaction";

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

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

  function handleTransactionsLoaded(newTransactions: Transaction[]) {
    setTransactions((current) => [...current, ...newTransactions]);
  }

  function handleTransactionTypeChange(
    id: string,
    transactionType: TransactionType,
  ) {
    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? { ...transaction, transactionType }
          : transaction,
      ),
    );
  }

  function handleClear() {
    setTransactions([]);
    setUnsupportedFiles([]);
    setTypeFilter("all");
    setSelectedPeriod(null);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Spending Retrospective
        </h1>
        <p className="max-w-2xl text-zinc-600">
          Upload Bank of America checking or credit-card CSV exports to view
          your transactions in one place.
        </p>
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

          <MonthlySummaryCards summary={summary} />
        </section>
      )}

      <TransactionTable
        transactions={periodTransactions}
        totalCount={transactions.length}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        onTransactionTypeChange={handleTransactionTypeChange}
        emptyMessage={
          transactions.length === 0
            ? undefined
            : "No transactions for this time period."
        }
      />
    </main>
  );
}
