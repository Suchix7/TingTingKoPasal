"use client";

import { X, Calendar, CreditCard, Tag, FileText, Clock } from "lucide-react";
import { useExpense } from "@/hooks/useExpenses";
import { useLang } from "@/lib/i18n";
import { Skeleton } from "@/components/layout/Skeleton";

import Tn from "@/components/layout/Tn";
interface ExpenseDetailsModalProps {
  expenseId: number;
  onClose: () => void;
  money: (value?: number | null) => string;
  dateTime: (value?: string) => string;
  dateOnly: (value?: string) => string;
}

export default function ExpenseDetailsModal({
  expenseId,
  onClose,
  money,
  dateTime,
  dateOnly,
}: ExpenseDetailsModalProps) {
  const { t } = useLang();
  const { data, isLoading } = useExpense(expenseId);
  const expense = data?.data;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="w-full max-h-[50dvh] max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">{t("Expense Details")}</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4 p-6" aria-busy>
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        ) : expense ? (
          <div className="space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {expense.title}
              </h3>
              <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                {money(expense.amount)}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-gray-400" />
                <span className="text-gray-600">{t("Date")}:</span>
                <span className="font-medium text-gray-900">
                  {dateOnly(expense.expense_date)}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Tag size={16} className="text-gray-400" />
                <span className="text-gray-600">{t("Category")}:</span>
                <span className="font-medium text-gray-900">
                  {t(expense.category)}
                </span>
              </div>

              {expense.payment_method && (
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard size={16} className="text-gray-400" />
                  <span className="text-gray-600">{t("Payment")}:</span>
                  <span className="font-medium text-gray-900">
                    <Tn v={expense.payment_method} />
                  </span>
                </div>
              )}

              {expense.notes && (
                <div className="flex items-start gap-3 text-sm">
                  <FileText size={16} className="mt-0.5 text-gray-400" />
                  <span className="text-gray-600">{t("Notes")}:</span>
                  <span className="font-medium text-gray-900">
                    {expense.notes}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <Clock size={16} className="text-gray-400" />
                <span className="text-gray-600">{t("Created")}:</span>
                <span className="font-medium text-gray-900">
                  {dateTime(expense.created_at)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">
            {t("Expense not found.")}
          </div>
        )}
      </div>
    </div>
  );
}
