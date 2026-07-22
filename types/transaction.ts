export type AccountType = "checking" | "credit";

export type TransactionType = "expense" | "income" | "transfer";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountType: AccountType;
  transactionType: TransactionType;
  sourceFile: string;
};
