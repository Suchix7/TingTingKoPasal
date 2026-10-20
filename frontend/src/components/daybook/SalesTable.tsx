// components/daybook/DaybookSalesTable.tsx
"use client";

import { Eye } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { DaybookSale, DaybookSalePayment } from "@/hooks/useDaybook";

const paymentStatusClass = {
  Paid: "bg-green-100 text-green-700 border-green-200",
  Partial: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Unpaid: "bg-red-100 text-red-700 border-red-200",
  Refunded: "bg-blue-100 text-blue-700 border-blue-200",
  Cancelled: "bg-red-100 text-red-700 border-red-200",
};

interface DaybookSalesTableProps {
  sales: DaybookSale[];
  salePayments: DaybookSalePayment[];
  onViewSale: (saleId: number) => void;
  money: (value?: number | null) => string;
}

export default function DaybookSalesTable({
  sales,
  salePayments,
  onViewSale,
  money,
}: DaybookSalesTableProps) {
  const { t } = useLang();
  if (sales.length === 0) {
    return (
      <div className="p-8 text-center text-sm text-gray-500">
        {t("No sales recorded for this day")}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-5 py-3">{t("Invoice")}</th>
            <th className="px-5 py-3">{t("Customer")}</th>
            <th className="px-5 py-3">{t("Total")}</th>
            <th className="px-5 py-3">{t("Paid")}</th>
            <th className="px-5 py-3">{t("Remaining")}</th>
            <th className="px-5 py-3">{t("Status")}</th>
            <th className="px-5 py-3 text-right">{t("Actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-gray-50 transition">
              <td className="px-5 py-4">
                <p className="font-bold text-gray-900">{sale.invoice_no}</p>
                <p className="text-xs text-gray-500">#{sale.id}</p>
              </td>
              <td className="px-5 py-4">
                <p className="font-medium text-gray-900">
                  {sale.customer_name || t("Walk-in")}
                </p>
                {sale.customer_phone && (
                  <p className="text-xs text-gray-500">{sale.customer_phone}</p>
                )}
              </td>
              <td className="px-5 py-4 font-bold text-gray-900">
                {money(sale.grand_total)}
              </td>
              <td className="px-5 py-4 font-medium text-green-700">
                {money(sale.paid_amount)}
              </td>
              <td className="px-5 py-4 font-medium text-red-700">
                {money(sale.remaining_amount)}
              </td>
              <td className="px-5 py-4">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    paymentStatusClass[sale.payment_status]
                  }`}
                >
                  {t(sale.payment_status)}
                </span>
              </td>
              <td className="px-5 py-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => onViewSale(sale.id)}
                    className="rounded-xl p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition"
                    title={t("View sale details")}
                  >
                    <Eye size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
