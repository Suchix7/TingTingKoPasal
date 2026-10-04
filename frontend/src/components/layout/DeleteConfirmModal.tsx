import { Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  invoiceNo?: string;
  label?: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  description?: string;
}

export default function DeleteConfirmModal({
  invoiceNo,
  label = "sale",
  isPending,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900">Delete {label}?</h2>
        <p className="mt-2 text-sm text-gray-600">
          This will delete {label} <strong>{invoiceNo}</strong>. Are you sure to
          delete?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl cursor-pointer border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex cursor-pointer sitems-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
