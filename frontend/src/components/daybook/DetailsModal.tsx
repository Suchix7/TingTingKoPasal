"use client";

import { X, Loader2, Calendar, User, Phone, FileText } from "lucide-react";
import { useDaybook } from "@/hooks/useDaybook";

interface DaybookSaleDetailsModalProps {
  saleId: number;
  date: string;
  onClose: () => void;
  money: (value?: number | null) => string;
}

export default function DaybookSaleDetailsModal({
  saleId,
  date,
  onClose,
  money,
}: DaybookSaleDetailsModalProps) {
  const { data, isLoading } = useDaybook(date);
  const sale = data?.sales.find((s) => s.id === saleId);
  const saleItems = data?.saleItems.filter((si) => si.sale_id === saleId) || [];
  const salePayments =
    data?.salePayments.filter((sp) => sp.sale_id === saleId) || [];

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Sale Details</h2>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={24} />
          </div>
        ) : sale ? (
          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {sale.invoice_no}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(sale.created_at).toLocaleString()}
                  </span>
                  {sale.customer_name && (
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {sale.customer_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {money(sale.grand_total)}
                </p>
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold mt-1 ${
                    sale.payment_status === "Paid"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : sale.payment_status === "Partial"
                        ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                        : "bg-red-100 text-red-700 border-red-200"
                  }`}
                >
                  {sale.payment_status}
                </span>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Subtotal</p>
                <p className="font-medium">{money(sale.subtotal)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Discount</p>
                <p className="font-medium text-red-600">
                  -{money(sale.discount_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tax</p>
                <p className="font-medium">{money(sale.tax_amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Grand Total</p>
                <p className="font-bold">{money(sale.grand_total)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="font-medium text-green-600">
                  {money(sale.paid_amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="font-medium text-red-600">
                  {money(sale.remaining_amount)}
                </p>
              </div>
            </div>

            {/* Sale Items */}
            {saleItems.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Items ({saleItems.length})
                </h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Price</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2">{`${item.product_name} ${item.batch_number ? `(${item.batch_number})` : ""}`}</td>
                        <td className="px-3 py-2 text-right">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {money(item.unit_price)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {money(item.total_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Payments */}
            {salePayments.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 mb-3">
                  Payments ({salePayments.length})
                </h4>
                <div className="space-y-2">
                  {salePayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {payment.payment_method}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="font-bold text-green-700">
                        {money(payment.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {sale.notes && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  {sale.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center text-gray-500">Sale not found</div>
        )}
      </div>
    </div>
  );
}
