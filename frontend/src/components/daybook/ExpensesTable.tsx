"use client";

import { CreditCard } from "lucide-react";
import type { DaybookExpense } from "@/hooks/useDaybook";

const categoryColors: Record<string, string> = {
  Rent: "bg-purple-100 text-purple-700 border-purple-200",
  Utilities: "bg-blue-100 text-blue-700 border-blue-200",
  Salaries: "bg-green-100 text-green-700 border-green-200",
  Supplies: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Maintenance: "bg-orange-100 text-orange-700 border-orange-200",
  Marketing: "bg-pink-100 text-pink-700 border-pink-200",
  Travel: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

interface DaybookExpensesTableProps {
  expenses: DaybookExpense[];
  money: (value?: number | null) => string;
}

export default function DaybookExpensesTable({
  expenses,
  money,
}: DaybookExpensesTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        No expenses recorded for this day
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[800px] text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-5 py-3">Title</th>
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3">Amount</th>
            <th className="px-5 py-3">Payment Method</th>
            <th className="px-5 py-3">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {expenses.map((expense) => (
            <tr key={expense.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-4">
                <p className="font-medium text-gray-900">{expense.title}</p>
                <p className="text-xs text-gray-500">#{expense.id}</p>
              </td>
              <td className="px-5 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    categoryColors[expense.category] || categoryColors.Other
                  }`}
                >
                  {expense.category}
                </span>
              </td>
              <td className="px-5 py-4 font-bold text-red-700">
                {money(expense.amount)}
              </td>
              <td className="px-5 py-4">
                {expense.payment_method ? (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CreditCard size={14} className="text-gray-400" />
                    {expense.payment_method}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Not specified</span>
                )}
              </td>
              <td className="px-5 py-4 max-w-[200px] truncate text-sm text-gray-600">
                {expense.notes || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
