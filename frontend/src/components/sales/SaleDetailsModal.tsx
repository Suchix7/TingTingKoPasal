"use client";

import { Calendar, CreditCard, Loader2, Phone, User, X } from "lucide-react";
import { SaleItem, useSaleById, useSaleItems } from "@/hooks/useSales";
import {
  SalePayment as FullSalePayment,
  useSalePaymentsBySaleId,
} from "@/hooks/useSalePayments";

export default function SaleDetailsModal({
  saleId,
  onClose,
  money,
  dateTime,
  getPaymentLabel,
}: {
  saleId?: string;
  onClose: () => void;
  money: any;
  dateTime: any;
  getPaymentLabel: any;
}) {
  const { data: saleData, isLoading: isSaleLoading } = useSaleById(saleId);
  const { data: itemData, isLoading: isItemsLoading } = useSaleItems(saleId);
  const { data: paymentData, isLoading: isPaymentsLoading } =
    useSalePaymentsBySaleId(saleId);

  const sale = saleData?.data;
  const items = itemData?.data || sale?.items || [];
  const payments = paymentData?.data || sale?.payments || [];

  const totalItemProfit = items.reduce(
    (sum: number, item: SaleItem) => sum + (item.profit_amount || 0),
    0,
  );

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sale Details</h2>
            <p className="text-sm text-gray-500">
              Invoice, items, and payment history
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close sale details"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-6">
          {isSaleLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">
              <Loader2 className="mr-2 animate-spin" size={22} /> Loading
              sale...
            </div>
          ) : !sale ? (
            <div className="py-16 text-center text-gray-500">
              Sale not found.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-5">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Invoice
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {sale.invoice_no}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Grand Total
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {money(sale.grand_total)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Paid
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {money(sale.paid_amount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Remaining
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {money(sale.remaining_amount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    Profit
                  </p>
                  <p className="mt-2 font-bold text-green-700">
                    {money(sale.profit_amount)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-bold text-gray-900">Customer</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p className="flex items-center gap-2">
                      <User size={16} className="text-gray-400" />
                      {sale.customer_name || "Walk-in customer"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      {sale.customer_phone || "No phone"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar size={16} className="text-gray-400" />
                      {dateTime(sale.created_at)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-bold text-gray-900">
                    Payment Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span>{money(sale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Discount</span>
                      <span>{money(sale.discount_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax</span>
                      <span>{money(sale.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Change</span>
                      <span>{money(sale.change_amount)}</span>
                    </div>
                    <div className="border-t pt-2 font-bold flex justify-between">
                      <span>Grand Total</span>
                      <span>{money(sale.grand_total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold text-gray-900">Sale Items</h3>
                </div>
                {isItemsLoading ? (
                  <div className="p-6 text-center text-gray-500">
                    Loading items...
                  </div>
                ) : !items.length ? (
                  <div className="p-6 text-center text-gray-500">
                    No sale items found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-4 py-3">Product</th>
                          <th className="px-4 py-3">Qty</th>
                          <th className="px-4 py-3">Unit Price</th>
                          <th className="px-4 py-3">Cost Price</th>
                          <th className="px-4 py-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item: SaleItem, index: number) => (
                          <tr
                            key={`${item.product_id}-${item.batch_id ?? "no-batch"}-${index}`}
                          >
                            <td className="px-4 py-3">
                              <p className="font-medium text-gray-900">
                                {item.product_name}
                              </p>
                              {Number(item.discount_amount) > 0 && (
                                <p className="mt-0.5 text-xs text-amber-700">
                                  Sold below marked price:{" "}
                                  {money(item.discount_amount)} less
                                  {item.discount_reason
                                    ? ` (${item.discount_reason})`
                                    : ""}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">{item.quantity}</td>
                            <td className="px-4 py-3">
                              {money(item.unit_price)}
                              {Number(item.discount_amount) > 0 && (
                                <p className="text-xs text-amber-700">
                                  sold at{" "}
                                  {money(
                                    Number(item.unit_price) -
                                      Number(item.discount_amount) /
                                        Number(item.quantity),
                                  )}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {money(item.cost_price)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {money(item.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold text-gray-900">Sale Payments</h3>
                </div>
                {isPaymentsLoading ? (
                  <div className="p-6 text-center text-gray-500">
                    Loading payments...
                  </div>
                ) : !payments.length ? (
                  <div className="p-6 text-center text-gray-500">
                    No payments found.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {payments.map((payment, index) => (
                      <div
                        key={
                          "id" in payment
                            ? (payment.id as number)
                            : `${payment.payment_method_id}-${index}`
                        }
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-gray-100 p-2 text-gray-600">
                            <CreditCard size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {getPaymentLabel(payment)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {dateTime(
                                "created_at" in payment
                                  ? (payment.created_at as string | undefined)
                                  : undefined,
                              )}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-gray-900">
                          {money(payment.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {sale.payment_proof_url ? (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-bold text-gray-900">
                    Online Payment Proof
                  </h3>
                  <a
                    href={sale.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={sale.payment_proof_url}
                      alt="Payment proof"
                      className="max-h-80 rounded-xl border border-gray-200 object-contain"
                    />
                  </a>
                </div>
              ) : null}

              {sale.notes ? (
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-2 font-bold text-gray-900">Notes</h3>
                  <p className="text-sm text-gray-600">{sale.notes}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
