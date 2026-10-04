// components/inventory/BatchManageModal.tsx
"use client";

import { X, Settings, Package, DollarSign, Hash } from "lucide-react";

type BatchManageFormData = {
  batch_id: number | "";
  batch_number: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
};

interface BatchManageModalProps {
  closeModal: () => void;
  formData: BatchManageFormData;
  setFormData: React.Dispatch<React.SetStateAction<BatchManageFormData>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  batchNumber?: string;
}

const BatchManageModal = ({
  closeModal,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  batchNumber,
}: BatchManageModalProps) => {
  const handleInputChange = (
    field: keyof BatchManageFormData,
    value: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]:
        field === "batch_number" ? value : value === "" ? 0 : Number(value),
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
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Manage Batch
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
            {/* Batch Number */}
            <div>
              <label
                htmlFor="batch-number"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Batch Number
              </label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="batch-number"
                  type="text"
                  value={formData.batch_number}
                  onChange={(e) =>
                    handleInputChange("batch_number", e.target.value)
                  }
                  placeholder="Enter batch number"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label
                htmlFor="batch-quantity"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Quantity
              </label>
              <div className="relative">
                <Package className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="batch-quantity"
                  type="number"
                  min="0"
                  value={formData.quantity === 0 ? "" : formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", e.target.value)
                  }
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                />
              </div>
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
            disabled={
              isSubmitting ||
              !formData.batch_number ||
              formData.quantity < 0 ||
              formData.cost_price < 0 ||
              formData.sale_price < 0
            }
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Settings className="h-4 w-4" />
                Update Batch
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BatchManageModal;
