"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import type {
  Expense,
  CreateExpenseInput,
  UpdateExpenseInput,
} from "@/hooks/useExpenses";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import toast from "react-hot-toast";

export const CATEGORIES = [
  "Food",
  "Rent",
  "Utilities",
  "Salaries",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Travel",
  "Other",
];

interface ExpenseFormModalProps {
  mode: "create" | "edit";
  expense?: Expense | null;
  onSubmit: (data: CreateExpenseInput | UpdateExpenseInput) => Promise<void>;
  onClose: () => void;
  isPending: boolean;
  money: (value?: number | null) => string;
}

export default function ExpenseFormModal({
  mode,
  expense,
  onSubmit,
  onClose,
  isPending,
  money,
}: ExpenseFormModalProps) {
  const [formData, setFormData] = useState<CreateExpenseInput>({
    expense_date: new Date().toISOString().split("T")[0],
    category: "Other",
    title: "",
    amount: 0,
    payment_method_id: null,
    notes: null,
  });
  const { data: paymentMethods, isLoading: paymentMethodsLoading } =
    usePaymentMethods(1, 1000);

  const availableBalances = Object.fromEntries(
    paymentMethods?.data?.map((item) => [item.id, item.current_balance]) || [],
  );

  useEffect(() => {
    if (mode === "edit" && expense) {
      setFormData({
        expense_date: expense.expense_date.split("T")[0],
        category: expense.category,
        title: expense.title,
        amount: expense.amount,
        payment_method_id: expense.payment_method_id || null,
        notes: expense.notes || null,
      });
    }
  }, [mode, expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.payment_method_id) {
      toast.error("Please select a payment method");
      return;
    }

    if (
      (availableBalances[formData.payment_method_id] || 0) < formData.amount
    ) {
      toast.error("Insufficient balance");
      return;
    }
    await onSubmit(formData);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="max-h-[85dvh] overflow-y-auto w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === "create" ? "Add Expense" : "Edit Expense"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl cursor-pointer p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              type="date"
              value={formData.expense_date}
              onChange={(e) =>
                setFormData({ ...formData, expense_date: e.target.value })
              }
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="e.g., Office supplies purchase"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
                required
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                type="number"
                value={String(formData.amount)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value) || 0,
                  })
                }
                min="0"
                step="0.01"
                onWheel={(e) => e.currentTarget.blur()}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
                required
              />
              {formData.amount > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  {money(formData.amount)}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={formData.payment_method_id || ""}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  payment_method_id: e.target.value
                    ? parseInt(e.target.value)
                    : null,
                });
              }}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
            >
              <option value="">Select payment method</option>
              {paymentMethods?.data?.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.payment_method}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  notes: e.target.value || null,
                })
              }
              placeholder="Add any additional notes..."
              rows={3}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl cursor-pointer border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              <span>
                {mode === "create" ? "Create Expense" : "Update Expense"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
