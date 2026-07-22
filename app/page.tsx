"use client";

import { useState } from "react";
import FileUploader from "@/components/FileUploader";
import TransactionTable from "@/components/TransactionTable";
import type { Transaction } from "@/types/transaction";

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [unsupportedFiles, setUnsupportedFiles] = useState<string[]>([]);

  function handleTransactionsLoaded(newTransactions: Transaction[]) {
    setTransactions((current) => [...current, ...newTransactions]);
  }

  function handleClear() {
    setTransactions([]);
    setUnsupportedFiles([]);
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

      <TransactionTable transactions={transactions} />
    </main>
  );
}
