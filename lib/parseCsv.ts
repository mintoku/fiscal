import Papa from "papaparse";
import type { Transaction } from "@/types/transaction";

export type DetectedFormat = "checking" | "credit" | "unsupported";

export type ParseResult =
  | { format: "checking" | "credit"; transactions: Transaction[] }
  | { format: "unsupported"; transactions: [] };

const CREDIT_HEADERS = [
  "Posted Date",
  "Reference Number",
  "Payee",
  "Address",
  "Amount",
];

const CHECKING_HEADERS = ["Date", "Description", "Amount", "Running Bal."];

function normalizeHeader(value: string): string {
  return value.trim();
}

function headersMatch(row: string[], expected: string[]): boolean {
  if (row.length < expected.length) return false;
  return expected.every(
    (header, index) => normalizeHeader(row[index] ?? "") === header,
  );
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/[",]/g, "");
  if (!cleaned) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) ? amount : null;
}

export function detectFormat(rows: string[][]): DetectedFormat {
  if (rows.length === 0) return "unsupported";

  if (headersMatch(rows[0] ?? [], CREDIT_HEADERS)) {
    return "credit";
  }

  for (const row of rows) {
    if (headersMatch(row, CHECKING_HEADERS)) {
      return "checking";
    }
  }

  return "unsupported";
}

function parseCreditCard(
  rows: string[][],
  sourceFile: string,
): Transaction[] {
  const [, ...dataRows] = rows;
  const transactions: Transaction[] = [];

  dataRows.forEach((row, index) => {
    const postedDate = row[0]?.trim() ?? "";
    const referenceNumber = row[1]?.trim() ?? "";
    const payee = row[2]?.trim() ?? "";
    const amount = parseAmount(row[4] ?? "");

    if (!postedDate || amount === null) return;

    transactions.push({
      id: referenceNumber || `${sourceFile}-credit-${index + 1}`,
      date: postedDate,
      description: payee,
      amount,
      accountType: "credit",
      sourceFile,
    });
  });

  return transactions;
}

function parseChecking(rows: string[][], sourceFile: string): Transaction[] {
  const headerIndex = rows.findIndex((row) =>
    headersMatch(row, CHECKING_HEADERS),
  );
  if (headerIndex === -1) return [];

  const dataRows = rows.slice(headerIndex + 1);
  const transactions: Transaction[] = [];

  dataRows.forEach((row, index) => {
    const date = row[0]?.trim() ?? "";
    const description = row[1]?.trim() ?? "";
    const amount = parseAmount(row[2] ?? "");

    if (!date || amount === null) return;

    transactions.push({
      id: `${sourceFile}-${index + 1}`,
      date,
      description,
      amount,
      accountType: "checking",
      sourceFile,
    });
  });

  return transactions;
}

export function parseCsvFile(csvText: string, sourceFile: string): ParseResult {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = parsed.data;
  const format = detectFormat(rows);

  if (format === "credit") {
    return {
      format,
      transactions: parseCreditCard(rows, sourceFile),
    };
  }

  if (format === "checking") {
    return {
      format,
      transactions: parseChecking(rows, sourceFile),
    };
  }

  return { format: "unsupported", transactions: [] };
}
