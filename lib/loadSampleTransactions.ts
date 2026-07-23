import { parseCsvFile } from "@/lib/parseCsv";
import type { Transaction } from "@/types/transaction";

export const SAMPLE_FILES = [
  "/samples/sample-checking-transactions.csv",
  "/samples/sample-credit-card-transactions.csv",
] as const;

export async function loadSampleTransactions(): Promise<Transaction[]> {
  const loaded: Transaction[] = [];

  for (const path of SAMPLE_FILES) {
    const response = await fetch(path);
    if (!response.ok) continue;
    const text = await response.text();
    const fileName = path.split("/").pop() ?? path;
    const result = parseCsvFile(text, fileName);
    if (result.format !== "unsupported") {
      loaded.push(...result.transactions);
    }
  }

  return loaded;
}
