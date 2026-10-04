// components/daybook/DaybookExpenseCategories.tsx
"use client";

import { Package } from "lucide-react";
import type { DaybookExpenseCategorySummary } from "@/hooks/useDaybook";

interface DaybookExpenseCategoriesProps {
  categories: DaybookExpenseCategorySummary[];
  totalExpenseAmount: number;
  money: (value?: number | null) => string;
}

export default function DaybookExpenseCategories({
  categories,
  totalExpenseAmount,
  money,
}: DaybookExpenseCategoriesProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="font-bold text-gray-900 mb-4">Expense Categories</h3>
      <div className="space-y-3">
        {categories.map((category) => {
          const percentage =
            totalExpenseAmount > 0
              ? (category.total_amount / totalExpenseAmount) * 100
              : 0;

          return (
            <div key={category.category}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {category.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">
                    {money(category.total_amount)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {percentage.toFixed(1)}% · {category.expense_count} expenses
                  </p>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-red-400 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
