import type { TransactionType } from "../types/transaction";

/**
 * Simple keyword + sign rules so credit-card payments and account
 * transfers are not treated as spending or income.
 */
export function classifyTransaction(
  description: string,
  amount: number,
): TransactionType {
  const desc = description.toLowerCase();

  if (
    desc.includes("payment from chk") ||
    desc.includes("payment to crd") ||
    desc.includes("payment thank you") ||
    desc.includes("online banking payment") ||
    desc.includes("online banking transfer") ||
    desc.includes("transfer")
  ) {
    return "transfer";
  }

  if (amount >= 0) {
    return "income";
  }

  return "expense";
}
