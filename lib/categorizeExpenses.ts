import type { Transaction } from "@/types/transaction";

export function normalizeDescription(description: string): string {
  return description.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Uncategorized expenses, one entry per normalized description. */
export function getUniqueUncategorizedExpenses(
  transactions: Transaction[],
): { id: string; description: string }[] {
  const seen = new Set<string>();
  const unique: { id: string; description: string }[] = [];

  for (const transaction of transactions) {
    if (transaction.transactionType !== "expense") continue;
    if (transaction.category !== null) continue;

    const key = normalizeDescription(transaction.description);
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push({
      id: transaction.id,
      description: transaction.description,
    });
  }

  return unique;
}
