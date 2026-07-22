"use client";

import type { Transaction } from "@/types/transaction";

type TransactionTableProps = {
  transactions: Transaction[];
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

export default function TransactionTable({
  transactions,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500">
        No transactions yet. Upload a checking or credit-card CSV to get
        started.
      </div>
    );
  }

  const sorted = sortNewestFirst(transactions);

  return (
    <div className="overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Account Type</th>
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
              <td className="px-4 py-3 capitalize">{transaction.accountType}</td>
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
  );
}
