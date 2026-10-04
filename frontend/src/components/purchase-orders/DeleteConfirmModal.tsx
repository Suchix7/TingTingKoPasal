// components/purchase-orders/DeleteConfirmModal.tsx
"use client";

import { AlertTriangle, Trash2 } from "lucide-react";

type Props = {
  closeModal: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  orderNumber: string;
};

export default function DeleteConfirmModal({
  closeModal,
  onConfirm,
  isDeleting,
  orderNumber,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-rose-100 p-3">
              <AlertTriangle className="h-8 w-8 text-rose-600" />
            </div>
          </div>

          <h3 className="text-center text-xl font-bold text-slate-900 mb-2">
            Delete Purchase Order
          </h3>

          <p className="text-center text-sm text-slate-500 mb-6">
            Are you sure you want to delete {orderNumber}? This action cannot be
            undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={closeModal}
              disabled={isDeleting}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
