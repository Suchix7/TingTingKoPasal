"use client";

import { ChangeEvent, useState, useEffect } from "react";
import {
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
} from "@/hooks/usePaymentMethods";
import toast from "react-hot-toast";
import { useLang } from "@/lib/i18n";
import { Upload, Loader2 } from "lucide-react";

interface PaymentMethodModalProps {
  setOpen: (open: boolean) => void;
  closeModal: () => void;
  editing?: any | null;
}

type FormState = {
  payment_method: string;
  type: string;
  qr_code: string;
  status: string;
  notes: string;
};

const initialForm: FormState = {
  payment_method: "",
  type: "",
  qr_code: "",
  status: "Active",
  notes: "",
};

export default function PaymentMethodModal({
  setOpen,
  closeModal,
  editing,
}: PaymentMethodModalProps) {
  const { t } = useLang();
  const [form, setForm] = useState<FormState>(initialForm);
  const [dragActive, setDragActive] = useState(false);
  const [readingQr, setReadingQr] = useState(false);

  const createMutation = useCreatePaymentMethod();
  const updateMutation = useUpdatePaymentMethod();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (editing) {
      setForm({
        payment_method: editing.payment_method || "",
        type: editing.type || "",
        qr_code: editing.qr_code || "",
        status: editing.status || "Active",
        notes: editing.notes || "",
      });
    }
  }, [editing]);

  const readFileAsBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleQrFile = async (file?: File) => {
    if (!file) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    const maxSizeInMb = 2;

    if (!allowedTypes.includes(file.type)) {
      toast.error(t("Please upload a PNG, JPG, or WEBP image."));
      return;
    }

    if (file.size > maxSizeInMb * 1024 * 1024) {
      toast.error(t("Image must be smaller than 2MB."));
      return;
    }

    setReadingQr(true);
    try {
      const base64 = await readFileAsBase64(file);
      setForm((prev) => ({ ...prev, qr_code: base64 }));
      toast.success(t("QR image uploaded."));
    } catch {
      toast.error(t("Failed to read image."));
    } finally {
      setReadingQr(false);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    await handleQrFile(file);
    e.target.value = "";
  };

  const validateForm = () => {
    if (!form.payment_method.trim()) {
      toast.error(t("Payment method name is required."));
      return false;
    }

    if (!form.type.trim()) {
      toast.error(t("Payment type is required."));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting || readingQr) return;
    if (!validateForm()) return;

    const payload = {
      ...form,
      payment_method: form.payment_method.trim(),
      type: form.type.trim(),
      notes: form.notes.trim(),
    };

    const promise = editing
      ? updateMutation.mutateAsync({
          ...editing,
          ...payload,
        })
      : createMutation.mutateAsync(payload);

    toast.promise(promise, {
      loading: editing
        ? t("Updating payment method...")
        : t("Creating payment method..."),
      success: editing
        ? t("Payment method updated.")
        : t("Payment method created."),
      error: editing
        ? t("Failed to update payment method.")
        : t("Failed to create payment method."),
    });

    try {
      await promise;
      closeModal();
    } catch {
      // handled by toast.promise
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-h-[85dvh] overflow-y-auto max-w-lg rounded-3xl border border-neutral-200 bg-white p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">
            {editing ? t("Edit payment method") : t("New payment method")}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {t("Add a payment method with a clean, guided form.")}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              {t("Name")}
            </label>
            <input
              placeholder={t("e.g. eSewa")}
              value={form.payment_method}
              onChange={(e) =>
                setForm({ ...form, payment_method: e.target.value })
              }
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              {t("Type")}
            </label>

            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-50"
            >
              <option value="" disabled>
                {t("Select type")}
              </option>
              <option value="Cash">{t("Cash")}</option>
              <option value="Online">{t("Online")}</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              {t("QR code image")}
            </label>

            <label
              onDragEnter={() => setDragActive(true)}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragActive(false);
                if (isSubmitting || readingQr) return;
                const file = e.dataTransfer.files?.[0];
                await handleQrFile(file);
              }}
              className={`block cursor-pointer rounded-2xl border-2 border-dashed p-4 transition ${
                dragActive
                  ? "border-neutral-900 bg-neutral-100"
                  : "border-neutral-200 bg-neutral-50 hover:border-neutral-300 hover:bg-neutral-100"
              } ${isSubmitting || readingQr ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileInputChange}
                disabled={isSubmitting || readingQr}
                className="hidden"
              />

              {readingQr ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("Uploading...")}
                </div>
              ) : form.qr_code ? (
                <div className="flex items-center gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                    <img
                      src={form.qr_code}
                      alt={t("QR preview")}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {t("QR image uploaded")}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t("Click here to replace the current image.")}
                    </p>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setForm((prev) => ({ ...prev, qr_code: "" }));
                        toast.success(t("QR image removed."));
                      }}
                      className="mt-3 inline-flex text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      {t("Remove image")}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
                    <span className="text-xl">
                      <Upload />
                    </span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900">
                    {t("Upload QR image")}
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t("Drag and drop or click to browse")}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {t("PNG, JPG, WEBP up to 2MB")}
                  </p>
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              {t("Status")}
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-50"
            >
              <option value="Active">{t("Active")}</option>
              <option value="Inactive">{t("Inactive")}</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              {t("Notes")}
            </label>
            <textarea
              placeholder={t("Optional notes")}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={4}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-50"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeModal}
            disabled={isSubmitting}
            className="inline-flex cursor-pointer h-11 items-center justify-center rounded-xl px-4 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("Cancel")}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || readingQr}
            className="inline-flex cursor-pointer min-w-[138px] items-center justify-center rounded-xl bg-neutral-900 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Saving...")}
              </span>
            ) : editing ? (
              t("Save changes")
            ) : (
              t("Create method")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
