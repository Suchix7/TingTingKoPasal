"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, Plus, Trash2, Truck, X } from "lucide-react";
import toast from "react-hot-toast";

import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useCompleteCodSale } from "@/hooks/useSales";
import { ListSkeleton } from "@/components/layout/Skeleton";
import { useLang } from "@/lib/i18n";

export type CodOrder = {
  id: string;
  invoice_no: string;
  grand_total: number;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  notes?: string | null;
};

type Row = { payment_method_id: string; amount: number };

const round2 = (n: number) => Math.round(n * 100) / 100;

// The courier (or customer) has paid for a Cash on Delivery order: record
// how the money came in, and the order becomes a normal Completed sale.
export default function CompleteCodModal({
  order,
  onClose,
  money,
}: {
  order: CodOrder;
  onClose: () => void;
  money: (value?: number | null) => string;
}) {
  const { t } = useLang();
  const { data: methodsData, isLoading } = usePaymentMethods(1, 100, "Active");
  const methods = methodsData?.data ?? [];
  const completeCod = useCompleteCodSale();

  const total = Number(order.grand_total || 0);
  const [rows, setRows] = useState<Row[]>([]);
  const [note, setNote] = useState("");

  // Default to the first cash method for the full amount, once methods load
  const [seeded, setSeeded] = useState(false);
  if (!seeded && methods.length > 0) {
    setSeeded(true);
    const cash = methods.find((m) => m.type === "Cash") ?? methods[0];
    setRows([{ payment_method_id: cash.id, amount: total }]);
  }

  const received = useMemo(
    () => round2(rows.reduce((sum, r) => sum + Number(r.amount || 0), 0)),
    [rows],
  );
  const remaining = round2(Math.max(total - received, 0));
  const over = round2(Math.max(received - total, 0));
  // A short payment can only be kept as credit on a saved customer
  const shortWithoutCustomer = remaining > 0 && !order.customer_id;

  const updateRow = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const addRow = () => {
    const used = new Set(rows.map((r) => r.payment_method_id));
    const next = methods.find((m) => !used.has(m.id)) ?? methods[0];
    if (!next) return;
    setRows((prev) => [...prev, { payment_method_id: next.id, amount: remaining }]);
  };

  const submit = async () => {
    const payments = rows.filter((r) => r.payment_method_id && Number(r.amount) > 0);
    if (payments.length === 0 && total > 0) {
      toast.error(t("Add the payment you received for this order"));
      return;
    }
    if (over > 0) {
      toast.error(t("Received amount is more than the order total"));
      return;
    }
    if (shortWithoutCustomer) {
      toast.error(t("The full amount must be received for this order"));
      return;
    }
    try {
      await completeCod.mutateAsync({
        saleId: order.id,
        payments: payments.map((p) => ({
          payment_method_id: p.payment_method_id,
          amount: round2(Number(p.amount)),
        })),
        notes: note.trim() || undefined,
      });
      toast.success(t("Payment received. Order marked completed."));
      onClose();
    } catch {
      // the mutation shows the error toast
    }
  };

  const busy = completeCod.isPending;

  return (
    <div
      onClick={() => !busy && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {t("Receive COD payment")}
              </h2>
              <p className="text-sm text-slate-500">
                {order.invoice_no} · {order.customer_name || t("Walk-in customer")}
                {order.customer_phone ? ` · ${order.customer_phone}` : ""}
              </p>
              {order.customer_address && (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-slate-600 break-words">
                  <MapPin size={12} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>{order.customer_address}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("Close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
            <span className="text-sm font-medium text-amber-800">
              {t("Amount to collect")}
            </span>
            <span className="text-lg font-bold text-amber-900">{money(total)}</span>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                {t("Received by")}
              </label>
              {methods.length > 1 && (
                <button
                  type="button"
                  onClick={addRow}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Plus size={13} /> {t("Split payment")}
                </button>
              )}
            </div>

            {isLoading && methods.length === 0 ? (
              <ListSkeleton rows={2} />
            ) : methods.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                {t("No payment methods available. Please add payment methods first.")}
              </p>
            ) : (
              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={row.payment_method_id}
                      onChange={(e) => updateRow(index, { payment_method_id: e.target.value })}
                      disabled={busy}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      {methods.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.payment_method} ({m.type})
                        </option>
                      ))}
                    </select>
                    <div className="relative w-36 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                        Rs.
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={row.amount || ""}
                        onChange={(e) =>
                          updateRow(index, {
                            amount: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                        onWheel={(e) => e.currentTarget.blur()}
                        disabled={busy}
                        className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-400"
                      />
                    </div>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                        disabled={busy}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={t("Remove")}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5 rounded-xl border border-slate-200 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">{t("Amount received")}</span>
              <span className="font-semibold text-slate-900">{money(received)}</span>
            </div>
            {remaining > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">{t("Remaining")}</span>
                <span className="font-semibold text-red-600">{money(remaining)}</span>
              </div>
            )}
            {over > 0 && (
              <p className="text-xs font-medium text-red-600">
                {t("Received amount is more than the order total")}
              </p>
            )}
            {remaining > 0 && (
              <p className={`text-xs ${shortWithoutCustomer ? "font-medium text-red-600" : "text-slate-500"}`}>
                {shortWithoutCustomer
                  ? t("The full amount must be received for this order")
                  : t("The rest is added to the customer's credit")}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {t("Note (optional)")}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("e.g. Paid to courier")}
              disabled={busy}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            {t("Cancel")}
          </button>
          <button
            onClick={submit}
            disabled={busy || methods.length === 0 || over > 0 || shortWithoutCustomer}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
            {busy ? t("Saving...") : t("Mark as Completed")}
          </button>
        </div>
      </div>
    </div>
  );
}
