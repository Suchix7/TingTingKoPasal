// components/inventory/BatchDeductModal.tsx
"use client";

import { X, TrendingDown, Package, AlertTriangle } from "lucide-react";

type BatchDeductFormData = {
  batch_id: number | "";
  quantity: number;
};

interface BatchDeductModalProps {
  closeModal: () => void;
  formData: BatchDeductFormData;
  setFormData: React.Dispatch<React.SetStateAction<BatchDeductFormData>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  batchNumber?: string;
}

const BatchDeductModal = ({
  closeModal,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  batchNumber,
}: BatchDeductModalProps) => {
  const handleQuantityChange = (value: string) => {
    const quantity = value === "" ? 0 : Number(value);
    setFormData((prev) => ({
      ...prev,
      quantity,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-rose-500 p-2">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Deduct from Batch
              </h2>
              {batchNumber && (
                <p className="text-sm text-slate-500">Batch: {batchNumber}</p>
              )}
            </div>
          </div>
          <button
            onClick={closeModal}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="batch-deduct-quantity"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Quantity to Deduct
              </label>
              <div className="relative">
                <Package className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="batch-deduct-quantity"
                  type="number"
                  min="1"
                  value={formData.quantity === 0 ? "" : formData.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Enter the number of units to remove from this batch.
              </p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Please ensure the deduction quantity does not exceed the
                available batch quantity.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={closeModal}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || formData.quantity <= 0}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Deducting...
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4" />
                Deduct from Batch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchDeductModal;
