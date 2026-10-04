"use client";

import { AlertTriangle } from "lucide-react";

export type ReprintConflict = {
  productId: string;
  productName: string;
  alreadyPrinted: number;
  requested: number;
  overlap: number;
};

interface ReprintConfirmDialogProps {
  conflicts: ReprintConflict[];
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReprintConfirmDialog({
  conflicts,
  onCancel,
  onConfirm,
}: ReprintConfirmDialogProps) {
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-50 p-2 text-amber-600">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Some labels were already printed
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              You're printing more than the unprinted stock for these
              products, so some stickers will be duplicates of ones already
              on the shelf.
            </p>
          </div>
        </div>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto rounded-xl bg-gray-50 p-3">
          {conflicts.map((conflict) => (
            <div
              key={conflict.productId}
              className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate font-medium text-gray-900">
                {conflict.productName}
              </span>
              <span className="ml-3 flex-shrink-0 text-xs text-gray-500">
                {conflict.alreadyPrinted} printed · {conflict.requested}{" "}
                requested ·{" "}
                <span className="font-semibold text-amber-600">
                  {conflict.overlap} overlap
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Reprint Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
