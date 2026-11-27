"use client";

import { CheckCircle2, Clock, Eye, MapPin, Pencil, Truck, XCircle } from "lucide-react";

import { usePendingCodSales, waitingSince, type PendingCodSale } from "@/hooks/useSales";
import { useLang } from "@/lib/i18n";

// Cash on Delivery orders that have gone out but are not paid yet. Each one
// can be marked Completed once the money arrives, or cancelled if the order
// came back. Hidden when nothing is pending.
export default function PendingCodSection({
  money,
  onComplete,
  onCancel,
  onView,
  onEdit,
}: {
  money: (value?: number | null) => string;
  onComplete: (order: PendingCodSale) => void;
  onCancel: (order: PendingCodSale) => void;
  onView: (id: string) => void;
  onEdit: (order: PendingCodSale) => void;
}) {
  const { t } = useLang();
  const { data } = usePendingCodSales(50);
  const orders = data?.data ?? [];
  const count = data?.count ?? 0;

  if (count === 0) return null;

  return (
    <section
      id="pending-cod"
      className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/60"
    >
      <div className="flex flex-col gap-1 border-b border-amber-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500 p-2 text-white">
            <Truck size={18} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">
              {t("Pending Cash on Delivery")}
            </h2>
            <p className="text-sm text-amber-800">
              {count} {count === 1 ? t("order waiting for payment") : t("orders waiting for payment")}
              {" · "}
              {money(data?.total_amount)} {t("to collect")}
            </p>
          </div>
        </div>
      </div>

      <ul className="divide-y divide-amber-100">
        {orders.map((order) => (
          <li
            key={order.id}
            className="flex flex-col gap-3 bg-white/70 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900">{order.invoice_no}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  <Clock size={11} /> {t("Pending")}
                </span>
              </div>
              <p className="text-sm text-gray-700">
                <span className="font-semibold text-gray-900">{order.customer_name || t("Walk-in customer")}</span>
                {order.customer_phone ? <span className="text-gray-500"> · {order.customer_phone}</span> : ""}
              </p>
              {order.customer_address ? (
                <p className="mt-0.5 flex items-start gap-1 text-xs text-gray-600 break-words">
                  <MapPin size={12} className="mt-0.5 shrink-0 text-amber-700" />
                  <span>{order.customer_address}</span>
                </p>
              ) : null}
              {order.notes ? (
                <p className="mt-1 flex items-start gap-1 rounded-lg border border-amber-200/70 bg-amber-100/60 px-2 py-1 text-xs text-amber-900 break-words whitespace-pre-wrap">
                  <span className="font-semibold shrink-0">{t("Note")}:</span>
                  <span>{order.notes}</span>
                </p>
              ) : null}
              <p className="text-xs text-gray-400 mt-1">
                {t("Sent")} {waitingSince(order.created_at)}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <p className="text-lg font-bold text-gray-900">{money(order.grand_total)}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onView(order.id)}
                  className="rounded-xl p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                  aria-label={t("View sale")}
                  title={t("View sale")}
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => onEdit(order)}
                  className="rounded-xl p-2 text-gray-500 transition hover:bg-amber-100 hover:text-amber-800"
                  aria-label={t("Edit COD order")}
                  title={t("Edit COD order")}
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => onCancel(order)}
                  className="rounded-xl p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={t("Cancel COD order")}
                  title={t("Cancel COD order (returned / refused)")}
                >
                  <XCircle size={18} />
                </button>
                <button
                  onClick={() => onComplete(order)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  <CheckCircle2 size={16} />
                  {t("Mark as Completed")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {count > orders.length && (
        <p className="border-t border-amber-100 px-5 py-2.5 text-xs text-amber-800">
          {t("Showing the oldest")} {orders.length} — {t("filter by Pending to see all")}
        </p>
      )}
    </section>
  );
}
