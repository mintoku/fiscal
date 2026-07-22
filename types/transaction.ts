export type AccountType = "checking" | "credit";

export type TransactionType = "expense" | "income" | "transfer";

export type ExpenseCategory =
  | "Dining"
  | "Groceries"
  | "Transportation"
  | "Shopping"
  | "Bills"
  | "Entertainment"
  | "Health"
  | "Travel"
  | "Other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Dining",
  "Groceries",
  "Transportation",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Travel",
  "Other",
];

export type CategorySource = "ai" | "manual";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountType: AccountType;
  transactionType: TransactionType;
  sourceFile: string;
  category: ExpenseCategory | null;
  categorySource: CategorySource | null;
  categoryConfidence: number | null;
};
