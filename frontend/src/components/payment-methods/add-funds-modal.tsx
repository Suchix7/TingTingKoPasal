"use client";

import { useState } from "react";
import { X, DollarSign } from "lucide-react";

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethod: {
    id: string;
    payment_method: string;
    type: string;
    current_balance: number;
  };
  onSubmit: (
    paymentMethodId: string,
    amount: number,
    title?: string,
    notes?: string,
  ) => Promise<void>;
  isSubmitting: boolean;
}

export default function AddFundsModal({
  isOpen,
  onClose,
  paymentMethod,
  onSubmit,
  isSubmitting,
}: AddFundsModalProps) {
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    await onSubmit(
      paymentMethod.id,
      numAmount,
      title.trim() || undefined,
      notes.trim() || undefined,
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("np-NP", {
      style: "currency",
      currency: "NPR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Add Funds
              </h2>
              <p className="text-sm text-neutral-500">
                {paymentMethod.payment_method}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-neutral-400 cursor-pointer transition hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 rounded-xl bg-neutral-50 p-4">
            <p className="text-sm text-neutral-500">Current Balance</p>
            <p className="text-2xl font-bold text-neutral-900">
              {formatCurrency(paymentMethod.current_balance)}
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                Rs.
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                placeholder="Enter amount"
                step="0.01"
                min="0.01"
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-neutral-200 pl-12 pr-4 py-2.5 text-sm transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Cash deposit, Bank transfer"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional details..."
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border cursor-pointer border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl cursor-pointer bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Funds"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
