import { Loader2 } from "lucide-react";
import { useLang } from "@/lib/i18n";

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
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-gray-900">{t("Delete")} {t(label)}?</h2>
        <p className="mt-2 text-sm text-gray-600">
          {t("This will delete")} {t(label)} <strong>{invoiceNo}</strong>.{" "}
          {t("Are you sure to delete?")}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="rounded-xl cursor-pointer border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {t("Cancel")}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            {isPending ? t("Deleting...") : t("Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
