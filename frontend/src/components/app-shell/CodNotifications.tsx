"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Truck, X } from "lucide-react";

import { usePendingCodSales, waitingSince } from "@/hooks/useSales";
import { useLang } from "@/lib/i18n";

const money = (value?: number | null) =>
  `Rs. ${Number(value || 0).toLocaleString("en-NP")}`;

// Header bell: Cash on Delivery orders that went out and still wait for their
// money. Opening one takes you to Sales, where it can be marked Completed.
export default function CodNotifications({
  onOpenSales,
}: {
  onOpenSales: () => void;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = usePendingCodSales(20);
  const count = data?.count ?? 0;
  const orders = data?.data ?? [];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const goToSales = () => {
    setOpen(false);
    onOpenSales();
    // bring the Pending COD section into view once Sales has rendered
    setTimeout(
      () =>
        document
          .getElementById("pending-cod")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      150,
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative cursor-pointer rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
        aria-label={t("Notifications")}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-gray-200">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {t("Pending Cash on Delivery")}
              </h3>
              <p className="mt-0.5 text-xs text-gray-500">
                {count > 0
                  ? `${count} ${count === 1 ? t("order waiting for payment") : t("orders waiting for payment")} · ${money(data?.total_amount)}`
                  : t("No orders waiting for payment")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-full p-1 text-gray-400 hover:bg-gray-100"
              aria-label={t("Close notifications")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {orders.length > 0 ? (
            <ul className="max-h-80 space-y-2 overflow-y-auto p-3">
              {orders.map((order) => (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={goToSales}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 p-3 text-left transition hover:bg-amber-100"
                  >
                    <Truck className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">
                          {order.customer_name || order.invoice_no}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-gray-900">
                          {money(order.grand_total)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {order.invoice_no} · {t("Pending")} · {t("Sent")}{" "}
                        {waitingSince(order.created_at)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              {t("All COD orders are paid")}
            </div>
          )}

          {count > 0 && (
            <button
              type="button"
              onClick={goToSales}
              className="w-full cursor-pointer border-t border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
            >
              {t("Open Sales to mark paid")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
