"use client";

import type { Transaction } from "@/types/transaction";
import { parseCsvFile } from "@/lib/parseCsv";

type FileUploaderProps = {
  onTransactionsLoaded: (transactions: Transaction[]) => void;
  onUnsupportedFiles: (fileNames: string[]) => void;
};

export default function FileUploader({
  onTransactionsLoaded,
  onUnsupportedFiles,
}: FileUploaderProps) {
  async function handleFilesSelected(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

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

    if (allTransactions.length > 0) {
      onTransactionsLoaded(allTransactions);
    }

    onUnsupportedFiles(unsupported);
    event.target.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-700">
        Upload CSV files
      </label>
      <input
        type="file"
        accept=".csv,text/csv"
        multiple
        onChange={handleFilesSelected}
        className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700"
      />
    </div>
  );
}
