"use client";

import {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type Transaction,
  type TransactionType,
} from "@/types/transaction";

const TRANSACTION_TYPES: TransactionType[] = [
  "expense",
  "income",
  "transfer",
];

type TransactionTableProps = {
  transactions: Transaction[];
  /** Total uploaded transactions, used for the count label. */
  totalCount?: number;
  typeFilter: "all" | TransactionType;
  onTypeFilterChange: (value: "all" | TransactionType) => void;
  onTransactionTypeChange: (id: string, type: TransactionType) => void;
  onCategoryChange: (id: string, category: ExpenseCategory) => void;
  emptyMessage?: string;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function sortNewestFirst(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return dateB - dateA;
  });
}

function TypeFilterControls({
  typeFilter,
  onTypeFilterChange,
  countLabel,
}: {
  typeFilter: "all" | TransactionType;
  onTypeFilterChange: (value: "all" | TransactionType) => void;
  countLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="type-filter"
        className="text-sm font-medium text-zinc-700"
      >
        Filter by type
      </label>
      <select
        id="type-filter"
        value={typeFilter}
        onChange={(event) =>
          onTypeFilterChange(event.target.value as "all" | TransactionType)
        }
        className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800"
      >
        <option value="all">All</option>
        <option value="expense">Expense</option>
        <option value="income">Income</option>
        <option value="transfer">Transfer</option>
      </select>
      {countLabel ? (
        <span className="text-sm text-zinc-500">{countLabel}</span>
      ) : null}
    </div>
  );
}

export default function TransactionTable({
  transactions,
  totalCount,
  typeFilter,
  onTypeFilterChange,
  onTransactionTypeChange,
  onCategoryChange,
  emptyMessage,
}: TransactionTableProps) {
  if (transactions.length === 0 && !emptyMessage) {
    return (
      <div className="rounded border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
        No transactions yet. Upload a checking or credit-card CSV to get
        started.
      </div>
    );
  }

  if (transactions.length === 0 && emptyMessage) {
    return (
      <div className="flex flex-col gap-3">
        <TypeFilterControls
          typeFilter={typeFilter}
          onTypeFilterChange={onTypeFilterChange}
        />
        <div className="rounded border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
          {emptyMessage}
        </div>
      </div>
    );
  }

  const filtered =
    typeFilter === "all"
      ? transactions
      : transactions.filter(
          (transaction) => transaction.transactionType === typeFilter,
        );
  const sorted = sortNewestFirst(filtered);
  const countTotal = totalCount ?? transactions.length;

  return (
    <div className="flex flex-col gap-3">
      <TypeFilterControls
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        countLabel={`${sorted.length} shown · ${transactions.length} in period · ${countTotal} total`}
      />

      {sorted.length === 0 ? (
        <div className="rounded border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
          No transactions match this type filter for the selected time period.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-zinc-200">
          <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Account Type</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Source File</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {sorted.map((transaction) => (
                <tr key={transaction.id} className="text-zinc-800">
                  <td className="whitespace-nowrap px-4 py-3">
                    {transaction.date}
                  </td>
                  <td className="px-4 py-3">{transaction.description}</td>
                  <td className="px-4 py-3 capitalize">
                    {transaction.accountType}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Type for ${transaction.description}`}
                      value={transaction.transactionType}
                      onChange={(event) =>
                        onTransactionTypeChange(
                          transaction.id,
                          event.target.value as TransactionType,
                        )
                      }
                      className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm capitalize text-zinc-800"
                    >
                      {TRANSACTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {transaction.transactionType === "expense" ? (
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Category for ${transaction.description}`}
                          value={transaction.category ?? ""}
                          onChange={(event) =>
                            onCategoryChange(
                              transaction.id,
                              event.target.value as ExpenseCategory,
                            )
                          }
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800"
                        >
                          <option value="" disabled>
                            Uncategorized
                          </option>
                          {EXPENSE_CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        {transaction.categorySource ? (
                          <span className="text-xs text-zinc-400">
                            {transaction.categorySource === "ai"
                              ? "AI"
                              : "Manual"}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    {transaction.sourceFile}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
