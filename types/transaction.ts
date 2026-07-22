export type AccountType = "checking" | "credit";

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  accountType: AccountType;
  sourceFile: string;
};
