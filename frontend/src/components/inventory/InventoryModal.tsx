"use client";

import { X, Package, Save } from "lucide-react";
import type { InventoryFormData } from "@/components/tabs/InventoryTab";

type InventoryModalProps = {
  closeModal: () => void;
  formData: InventoryFormData;
  setFormData: (data: InventoryFormData) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isEditMode: boolean;
};

export default function InventoryModal({
  closeModal,
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  isEditMode,
}: InventoryModalProps) {
  const handleChange = (
    field: keyof InventoryFormData,
    value: string | number,
  ) => {
    setFormData({ ...formData, [field]: value });
  };

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
            <div className="rounded-xl bg-slate-900 p-2">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditMode ? "Update Inventory" : "Add Inventory"}
              </h2>
              <p className="text-sm text-slate-500">
                {isEditMode
                  ? "Modify stock levels and thresholds"
                  : "Set up initial stock levels"}
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
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Current Stock
            </label>
            <input
              type="number"
              min="0"
              value={formData.current_stock}
              onChange={(e) =>
                handleChange("current_stock", Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="0"
              required
            />
            <p className="text-xs text-slate-400">
              Current available quantity in stock
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Reorder Level
            </label>
            <input
              type="number"
              min="0"
              value={formData.reorder_level}
              onChange={(e) =>
                handleChange("reorder_level", Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="10"
              required
            />
            <p className="text-xs text-slate-400">
              Stock level that triggers reorder notification
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Reorder Quantity
            </label>
            <input
              type="number"
              min="0"
              value={formData.reorder_quantity}
              onChange={(e) =>
                handleChange("reorder_quantity", Number(e.target.value))
              }
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              placeholder="20"
              required
            />
            <p className="text-xs text-slate-400">
              Default quantity to order when restocking
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-white p-1.5 shadow-sm">
                <Package className="h-4 w-4 text-slate-600" />
              </div>
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-700">Stock Level Guide</p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Above reorder level — Healthy
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    At or below reorder level — Low Stock
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Zero stock — Out of Stock
                  </li>
                </ul>
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
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSubmitting
                ? "Saving..."
                : isEditMode
                  ? "Update Inventory"
                  : "Save Inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
