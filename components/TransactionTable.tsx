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

const TYPE_FILTERS: { value: "all" | TransactionType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
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
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="flex flex-wrap gap-x-1 gap-y-1"
        role="group"
        aria-label="Filter by type"
      >
        {TYPE_FILTERS.map((option) => {
          const active = typeFilter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onTypeFilterChange(option.value)}
              className={`border-b-2 px-2.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-green font-medium text-green"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {countLabel ? (
        <span className="font-mono text-xs tabular-nums text-muted">
          {countLabel}
        </span>
      ) : null}
    </div>
  );
}

const selectClass =
  "max-w-full border border-border bg-surface px-2 py-1 text-sm text-foreground";

function typeBadgeClass(type: TransactionType): string {
  switch (type) {
    case "expense":
      return "border-danger/25 bg-danger-soft text-danger";
    case "income":
      return "border-green/30 bg-green-soft text-green";
    case "transfer":
      return "border-border bg-surface text-muted";
  }
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
      <div className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
        No transactions yet. Upload a checking or credit-card CSV to get
        started.
      </div>
    );
  }

  if (transactions.length === 0 && emptyMessage) {
    return (
      <div className="flex flex-col gap-4">
        <TypeFilterControls
          typeFilter={typeFilter}
          onTypeFilterChange={onTypeFilterChange}
        />
        <div className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
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
    <div className="flex flex-col gap-4">
      <TypeFilterControls
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        countLabel={`${sorted.length} shown · ${transactions.length} in period · ${countTotal} total`}
      />

      {sorted.length === 0 ? (
        <div className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          No transactions match this type filter for the selected time period.
        </div>
      ) : (
        <div className="overflow-x-auto border-y border-border">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2.5 pr-4 font-medium">Date</th>
                <th className="py-2.5 pr-4 font-medium">Description</th>
                <th className="hidden py-2.5 pr-4 font-medium sm:table-cell">
                  Account
                </th>
                <th className="py-2.5 pr-4 font-medium">Type</th>
                <th className="py-2.5 pr-4 font-medium">Category</th>
                <th className="py-2.5 pl-4 text-right font-medium">Amount</th>
                <th className="hidden py-2.5 pl-4 font-medium lg:table-cell">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((transaction) => (
                <tr
                  key={transaction.id}
                  className="border-b border-border/70 text-foreground last:border-b-0"
                >
                  <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs tabular-nums text-muted">
                    {transaction.date}
                  </td>
                  <td className="max-w-[14rem] truncate py-2.5 pr-4 sm:max-w-xs">
                    {transaction.description}
                  </td>
                  <td className="hidden py-2.5 pr-4 capitalize text-muted sm:table-cell">
                    {transaction.accountType}
                  </td>
                  <td className="py-2.5 pr-4">
                    <select
                      aria-label={`Type for ${transaction.description}`}
                      value={transaction.transactionType}
                      onChange={(event) =>
                        onTransactionTypeChange(
                          transaction.id,
                          event.target.value as TransactionType,
                        )
                      }
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${typeBadgeClass(transaction.transactionType)}`}
                    >
                      {TRANSACTION_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 pr-4">
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
                          className={selectClass}
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
                          <span className="text-xs text-muted">
                            {transaction.categorySource === "ai"
                              ? "AI"
                              : "Manual"}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-4 text-right font-mono tabular-nums">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="hidden max-w-[10rem] truncate py-2.5 pl-4 text-muted lg:table-cell">
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
