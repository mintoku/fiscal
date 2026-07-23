"use client";

import { useCallback, useState } from "react";
import {
  getUniqueUncategorizedExpenses,
  normalizeDescription,
} from "@/lib/categorizeExpenses";
import type { CategorizeResponse } from "@/types/categorize";
import type {
  ExpenseCategory,
  Transaction,
  TransactionType,
} from "@/types/transaction";

export function useTransactionSession(initial: Transaction[] = []) {
  const [transactions, setTransactions] = useState<Transaction[]>(initial);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeProgress, setCategorizeProgress] = useState(0);
  const [categorizeError, setCategorizeError] = useState<string | null>(null);

  const uncategorizedExpenseCount = transactions.filter(
    (transaction) =>
      transaction.transactionType === "expense" && transaction.category === null,
  ).length;

  const replaceTransactions = useCallback((next: Transaction[]) => {
    setTransactions(next);
    setCategorizeError(null);
  }, []);

  const appendTransactions = useCallback((next: Transaction[]) => {
    setTransactions((current) => [...current, ...next]);
    setCategorizeError(null);
  }, []);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
    setCategorizeError(null);
  }, []);

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

  return {
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
  };
}
