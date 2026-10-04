// components/inventory/BatchRestockModal.tsx
"use client";

import { X, TrendingUp, Package } from "lucide-react";

type BatchRestockFormData = {
  batch_id: number | "";
  quantity: number;
};

interface BatchRestockModalProps {
  closeModal: () => void;
  formData: BatchRestockFormData;
  setFormData: React.Dispatch<React.SetStateAction<BatchRestockFormData>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  batchNumber?: string;
}

const BatchRestockModal = ({
  closeModal,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  batchNumber,
}: BatchRestockModalProps) => {
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
            <div className="rounded-xl bg-emerald-500 p-2">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Restock Batch
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
                htmlFor="batch-restock-quantity"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Quantity to Restock
              </label>
              <div className="relative">
                <Package className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="batch-restock-quantity"
                  type="number"
                  min="1"
                  value={formData.quantity === 0 ? "" : formData.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                Enter the number of units to add to this batch.
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Restocking...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Restock Batch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchRestockModal;
