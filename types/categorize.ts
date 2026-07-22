import type { ExpenseCategory } from "@/types/transaction";

export type CategorizeRequest = {
  transactions: {
    id: string;
    description: string;
  }[];
};

export type CategorizeResponse = {
  results: {
    id: string;
    category: ExpenseCategory;
    confidence: number;
  }[];
};
