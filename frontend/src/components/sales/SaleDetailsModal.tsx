"use client";

import { Calendar, CreditCard, FileText, ImageIcon, Mail, MapPin, Phone, Truck, User, X } from "lucide-react";
import { coverImage } from "@/components/catalog/image";
import { SaleItem, useSaleById, useSaleItems } from "@/hooks/useSales";
import {
  SalePayment as FullSalePayment,
  useSalePaymentsBySaleId,
} from "@/hooks/useSalePayments";

import Tn from "@/components/layout/Tn";
import {
  ListSkeleton,
  Skeleton,
  TableRowsSkeleton,
} from "@/components/layout/Skeleton";
import { useLang } from "@/lib/i18n";
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
  const { t } = useLang();
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
      <div className="max-h-[90dvh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t("Sale Details")}
            </h2>
            <p className="text-sm text-gray-500">
              {t("Invoice, items, and payment history")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label={t("Close sale details")}
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-6">
          {isSaleLoading ? (
            <div className="space-y-6" aria-busy>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="rounded-2xl bg-gray-50 p-4">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="mt-3 h-5 w-24" />
                  </div>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="space-y-3 rounded-2xl border border-gray-200 p-4"
                  >
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-3/5" />
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold text-gray-900">{t("Sale Items")}</h3>
                </div>
                <table className="w-full text-sm">
                  <tbody>
                    <TableRowsSkeleton rows={3} cols={5} />
                  </tbody>
                </table>
              </div>
            </div>
          ) : !sale ? (
            <div className="py-16 text-center text-gray-500">
              {t("Sale not found.")}
            </div>
          ) : (
            <div className="space-y-6">
              {sale.is_cod && (
                <div
                  className={`rounded-2xl border p-4 text-sm ${
                    sale.sale_status === "Pending"
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-gray-200 bg-gray-50 text-gray-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-amber-500 p-2 text-white shadow-sm shrink-0">
                      <Truck size={18} />
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{t("Cash on Delivery")}</span>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              sale.sale_status === "Pending"
                                ? "border-amber-300 bg-amber-100 text-amber-800"
                                : "border-gray-200 bg-white text-gray-700"
                            }`}
                          >
                            {t(sale.sale_status === "Pending" ? "Pending Payment" : sale.sale_status)}
                          </span>
                        </div>
                        <p className="text-base font-bold text-gray-900">
                          {money(sale.grand_total)}
                        </p>
                      </div>

                      {sale.sale_status === "Pending" ? (
                        <p className="text-xs font-medium text-amber-800">
                          {t("Collect from customer on delivery")}: <span className="font-bold">{money(sale.grand_total)}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          {t("Completed")}{sale.completed_at ? ` · ${dateTime(sale.completed_at)}` : ""}
                        </p>
                      )}

                      {(sale.customer_name || sale.customer_phone || sale.customer_address) && (
                        <div className="mt-2.5 rounded-xl border border-amber-200/80 bg-white/95 p-3 text-xs space-y-1.5 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                              <User size={13} className="text-amber-700" />
                              {sale.customer_name || t("Walk-in customer")}
                            </span>
                            {sale.customer_phone && (
                              <a
                                href={`tel:${sale.customer_phone}`}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                {sale.customer_phone}
                              </a>
                            )}
                          </div>
                          {sale.customer_address && (
                            <div className="flex items-start gap-1.5 text-gray-700 pt-1.5 border-t border-amber-100">
                              <MapPin size={13} className="shrink-0 mt-0.5 text-amber-600" />
                              <span className="font-medium whitespace-pre-wrap break-words">{sale.customer_address}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
                <div className="col-span-2 rounded-2xl bg-gray-50 p-4 md:col-span-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("Invoice")}
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {sale.invoice_no}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("Grand Total")}
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {money(sale.grand_total)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("Paid")}
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {money(sale.paid_amount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {t("Remaining")}
                  </p>
                  <p className="mt-2 font-bold text-gray-900">
                    {money(sale.remaining_amount)}
                  </p>
                </div>
                <div className="rounded-2xl bg-green-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                    {t("Profit")}
                  </p>
                  <p className="mt-2 font-bold text-green-700">
                    {money(sale.profit_amount)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-bold text-gray-900">
                    {t("Customer")}
                  </h3>
                  <div className="space-y-2.5 text-sm text-gray-700">
                    <p className="flex items-center gap-2">
                      <User size={16} className="shrink-0 text-gray-400" />
                      <span className="font-semibold text-gray-900">{sale.customer_name || t("Walk-in customer")}</span>
                    </p>
                    {sale.customer_phone ? (
                      <p className="flex items-center gap-2">
                        <Phone size={16} className="shrink-0 text-gray-400" />
                        <a
                          href={`tel:${sale.customer_phone}`}
                          className="font-medium text-blue-600 hover:underline"
                          title={t("Call customer")}
                        >
                          {sale.customer_phone}
                        </a>
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-gray-400">
                        <Phone size={16} className="shrink-0 text-gray-300" />
                        <span>{t("No phone")}</span>
                      </p>
                    )}
                    {sale.customer_address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="shrink-0 mt-0.5 text-amber-600" />
                        <span className="font-medium text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                          {sale.customer_address}
                        </span>
                      </div>
                    )}
                    {sale.customer_email && (
                      <p className="flex items-center gap-2">
                        <Mail size={16} className="shrink-0 text-gray-400" />
                        <a
                          href={`mailto:${sale.customer_email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {sale.customer_email}
                        </a>
                      </p>
                    )}
                    {sale.customer_credit !== undefined &&
                      sale.customer_credit !== null &&
                      Number(sale.customer_credit) > 0 && (
                        <p className="flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 w-fit">
                          <span>{t("Due Credit Balance")}:</span>
                          <span>{money(sale.customer_credit)}</span>
                        </p>
                      )}
                    <p className="flex items-center gap-2 border-t border-gray-100 pt-1 text-xs text-gray-500">
                      <Calendar size={14} className="shrink-0 text-gray-400" />
                      {dateTime(sale.created_at)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-4">
                  <h3 className="mb-3 font-bold text-gray-900">
                    {t("Payment Summary")}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("Subtotal")}</span>
                      <span>{money(sale.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("Discount")}</span>
                      <span>{money(sale.discount_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("Tax")}</span>
                      <span>{money(sale.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("Change")}</span>
                      <span>{money(sale.change_amount)}</span>
                    </div>
                    <div className="border-t pt-2 font-bold flex justify-between">
                      <span>{t("Grand Total")}</span>
                      <span>{money(sale.grand_total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold text-gray-900">{t("Sale Items")}</h3>
                </div>
                {isItemsLoading && !items.length ? (
                  <table className="w-full text-sm">
                    <tbody>
                      <TableRowsSkeleton rows={3} cols={5} />
                    </tbody>
                  </table>
                ) : !items.length ? (
                  <div className="p-6 text-center text-gray-500">
                    {t("No sale items found.")}
                  </div>
                ) : (
                  <>
                    {/* Phones: one card per item with its photo */}
                    <div className="divide-y divide-gray-100 md:hidden">
                      {items.map((item: SaleItem, index: number) => (
                        <div
                          key={`${item.product_id}-${item.batch_id ?? "no-batch"}-${index}`}
                          className="flex gap-3 p-3"
                        >
                          <ItemPhoto item={item} large />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900">
                              <Tn v={item.product_name} />
                            </p>
                            {item.batch_number && (
                              <p className="text-xs font-medium text-blue-600">
                                {item.batch_number}
                              </p>
                            )}
                            <div className="mt-1 flex items-baseline justify-between gap-2 text-sm">
                              <span className="text-gray-600">
                                {item.quantity} × {money(item.unit_price)}
                              </span>
                              <span className="font-semibold text-gray-900">
                                {money(item.total_price)}
                              </span>
                            </div>
                            {Number(item.discount_amount) > 0 && (
                              <p className="mt-0.5 text-xs text-amber-700">
                                {t("Sold below marked price")}:{" "}
                                {money(item.discount_amount)} {t("less")}
                                {item.discount_reason
                                  ? ` (${item.discount_reason})`
                                  : ""}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                          <tr>
                            <th className="px-4 py-3">{t("Product")}</th>
                            <th className="px-4 py-3">{t("Qty")}</th>
                            <th className="px-4 py-3">{t("Unit Price")}</th>
                            <th className="px-4 py-3">{t("Cost Price")}</th>
                            <th className="px-4 py-3 text-right">
                              {t("Total")}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((item: SaleItem, index: number) => (
                            <tr
                              key={`${item.product_id}-${item.batch_id ?? "no-batch"}-${index}`}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-start gap-3">
                                  <ItemPhoto item={item} />
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      <Tn v={item.product_name} />
                                    </p>
                                    {item.batch_number && (
                                      <p className="text-xs font-medium text-blue-600">
                                        {item.batch_number}
                                      </p>
                                    )}
                                    {Number(item.discount_amount) > 0 && (
                                      <p className="mt-0.5 text-xs text-amber-700">
                                        {t("Sold below marked price")}:{" "}
                                        {money(item.discount_amount)}{" "}
                                        {t("less")}
                                        {item.discount_reason
                                          ? ` (${item.discount_reason})`
                                          : ""}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">{item.quantity}</td>
                              <td className="px-4 py-3">
                                {money(item.unit_price)}
                                {Number(item.discount_amount) > 0 && (
                                  <p className="text-xs text-amber-700">
                                    {t("sold at")}{" "}
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
                  </>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200">
                <div className="border-b border-gray-200 px-4 py-3">
                  <h3 className="font-bold text-gray-900">
                    {t("Sale Payments")}
                  </h3>
                </div>
                {isPaymentsLoading && !payments.length ? (
                  <div className="p-4">
                    <ListSkeleton rows={2} />
                  </div>
                ) : !payments.length ? (
                  <div className="p-6 text-center text-gray-500">
                    {t("No payments found.")}
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
                    {t("Online Payment Proof")}
                  </h3>
                  <a
                    href={sale.payment_proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={sale.payment_proof_url}
                      alt={t("Payment proof")}
                      className="max-h-80 rounded-xl border border-gray-200 object-contain"
                    />
                  </a>
                </div>
              ) : null}

              {sale.notes ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                  <div className="mb-2 flex items-center gap-2 text-amber-900">
                    <FileText size={18} className="text-amber-700" />
                    <h3 className="font-bold text-sm text-gray-900">{t("Notes / Instructions")}</h3>
                  </div>
                  <div className="rounded-xl border border-amber-200/70 bg-white p-3.5 text-sm text-gray-800 shadow-sm leading-relaxed whitespace-pre-wrap break-words">
                    {sale.notes}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Photo of what was sold (the colour's photo when there is one); tap to open
// it full size
function ItemPhoto({
  item,
  large = false,
}: {
  item: SaleItem;
  large?: boolean;
}) {
  const box = large ? "h-16 w-16" : "h-12 w-12";
  if (!item.photo_url) {
    return (
      <div
        className={`flex ${box} shrink-0 items-center justify-center rounded-lg bg-gray-100`}
      >
        <ImageIcon className="h-5 w-5 text-gray-300" />
      </div>
    );
  }
  return (
    <a
      href={item.photo_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`${box} shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverImage(item.photo_url, 200)}
        alt={item.product_name}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </a>
  );
}
