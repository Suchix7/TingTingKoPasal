"use client";

import { useState, useMemo } from "react";
import { X, ArrowLeftRight, ArrowRight } from "lucide-react";

interface TransferFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentMethods: Array<{
    id: string;
    payment_method: string;
    type: string;
    current_balance: number;
    status: string;
  }>;
  preselectedFromMethod?: {
    id: string;
    payment_method: string;
  } | null;
  onSubmit: (
    fromPaymentMethodId: string,
    toPaymentMethodId: string,
    amount: number,
    notes?: string,
  ) => Promise<void>;
  isSubmitting: boolean;
}

export default function TransferFundsModal({
  isOpen,
  onClose,
  paymentMethods,
  preselectedFromMethod,
  onSubmit,
  isSubmitting,
}: TransferFundsModalProps) {
  const [fromMethodId, setFromMethodId] = useState<string | "">(
    preselectedFromMethod?.id || "",
  );
  const [toMethodId, setToMethodId] = useState<string | "">("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const activeMethods = useMemo(
    () => paymentMethods.filter((m) => m.status === "Active"),
    [paymentMethods],
  );

  const fromMethod = useMemo(
    () => activeMethods.find((m) => m.id === fromMethodId),
    [activeMethods, fromMethodId],
  );

  const toMethod = useMemo(
    () => activeMethods.find((m) => m.id === toMethodId),
    [activeMethods, toMethodId],
  );

  const filteredToMethods = useMemo(
    () => activeMethods.filter((m) => m.id !== fromMethodId),
    [activeMethods, fromMethodId],
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fromMethodId || !toMethodId) {
      setError("Please select both payment methods.");
      return;
    }

    if (fromMethodId === toMethodId) {
      setError("Cannot transfer to the same payment method.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (fromMethod && numAmount > fromMethod.current_balance) {
      setError("Insufficient balance in source payment method.");
      return;
    }

    await onSubmit(
      fromMethodId as string,
      toMethodId as string,
      numAmount,
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">
                Transfer Funds
              </h2>
              <p className="text-sm text-neutral-500">
                Move money between payment methods
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 cursor-pointer text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              From Payment Method *
            </label>
            <select
              value={fromMethodId}
              onChange={(e) => {
                setFromMethodId(e.target.value || "");
                setToMethodId("");
                setError("");
              }}
              disabled={isSubmitting || !!preselectedFromMethod}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select source</option>
              {activeMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.payment_method} (Balance:{" "}
                  {formatCurrency(method.current_balance)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <ArrowRight className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              To Payment Method *
            </label>
            <select
              value={toMethodId}
              onChange={(e) => {
                setToMethodId(e.target.value || "");
                setError("");
              }}
              disabled={isSubmitting || !fromMethodId}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select destination</option>
              {filteredToMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.payment_method}
                </option>
              ))}
            </select>
          </div>

          {fromMethod && (
            <div className="mb-4 rounded-xl bg-neutral-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-neutral-500">Available Balance</p>
                <p className="text-lg font-semibold text-neutral-900">
                  {formatCurrency(fromMethod.current_balance)}
                </p>
              </div>
            </div>
          )}

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
                max={fromMethod?.current_balance || undefined}
                required
                disabled={isSubmitting}
                className="w-full rounded-xl border border-neutral-200 pl-12 pr-4 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for transfer..."
              rows={3}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl cursor-pointer border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl cursor-pointer bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Transferring..." : "Transfer Funds"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
