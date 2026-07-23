"use client";

import { useRef, useState } from "react";
import type { Transaction } from "@/types/transaction";
import { parseCsvFile } from "@/lib/parseCsv";

type FileUploaderProps = {
  onTransactionsLoaded?: (transactions: Transaction[]) => void;
  onUnsupportedFiles: (fileNames: string[]) => void;
  /** When set, files are handed off instead of parsed locally. */
  onFilesSelected?: (files: File[]) => Promise<void>;
  busy?: boolean;
  hint?: string;
};

export default function FileUploader({
  onTransactionsLoaded,
  onUnsupportedFiles,
  onFilesSelected,
  busy = false,
  hint = "or click to browse · checking and credit-card exports",
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  async function processFiles(fileList: File[]) {
    const files = fileList.filter(
      (file) =>
        file.name.toLowerCase().endsWith(".csv") ||
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel",
    );
    if (files.length === 0) return;

    if (onFilesSelected) {
      await onFilesSelected(files);
      return;
    }

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

    if (allTransactions.length > 0 && onTransactionsLoaded) {
      onTransactionsLoaded(allTransactions);
    }

    onUnsupportedFiles(unsupported);
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    await processFiles(files);
    event.target.value = "";
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!busy) setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (busy) return;
    await processFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <div className="flex w-full flex-col gap-1.5">
      <div
        role="button"
        tabIndex={busy ? -1 : 0}
        aria-disabled={busy}
        onClick={() => {
          if (!busy) inputRef.current?.click();
        }}
        onKeyDown={(event) => {
          if (busy) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(event) => void handleDrop(event)}
        className={`border border-dashed px-4 py-10 text-center transition-colors ${
          busy
            ? "cursor-wait border-border bg-surface opacity-70"
            : isDragging
              ? "cursor-pointer border-green bg-green-soft/70"
              : "cursor-pointer border-border bg-surface hover:border-green hover:bg-green-soft/40"
        }`}
      >
        <p className="text-sm font-medium text-foreground">
          {busy
            ? "Uploading & processing…"
            : isDragging
              ? "Drop CSV files here"
              : "Drag & drop CSV files"}
        </p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          multiple
          disabled={busy}
          onChange={(event) => void handleInputChange(event)}
          className="sr-only"
        />
      </div>
    </div>
  );
}
