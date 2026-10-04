"use client";

import { X, TrendingUp, Package, ArrowUpCircle } from "lucide-react";
import { type RestockFormData } from "@/components/tabs/InventoryTab";

type RestockModalProps = {
  closeModal: () => void;
  formData: RestockFormData;
  setFormData: (data: RestockFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export default function RestockModal({
  closeModal,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
}: RestockModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={closeModal}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500 p-2">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Restock Inventory
              </h2>
              <p className="text-sm text-slate-500">
                Add stock to this product
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            disabled={isSubmitting}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-500 p-2.5">
                <ArrowUpCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-emerald-900">
                  Stock Addition
                </h3>
                <p className="text-sm text-emerald-700">
                  Enter the quantity you want to add
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Quantity to Add
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={formData.quantity || ""}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: Number(e.target.value) })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-semibold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="0"
                required
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Package className="h-5 w-5 text-slate-300" />
              </div>
            </div>
            <p className="text-xs text-slate-400">
              This quantity will be added to the current stock
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-1.5 shadow-sm">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-700">Restock Summary</p>
                <p className="mt-1 text-xs">
                  The stock will be immediately updated and available for sales
                  after restocking.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              disabled={isSubmitting}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || formData.quantity <= 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrendingUp className="h-4 w-4" />
              {isSubmitting ? "Restocking..." : "Confirm Restock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
