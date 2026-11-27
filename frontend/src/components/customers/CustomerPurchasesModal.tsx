"use client";

import { useState } from "react";
import {
  X,
  ShoppingBag,
  DollarSign,
  Package,
  Calendar,
  Phone,
  MapPin,
  Mail,
  Truck,
  CheckCircle2,
  Clock,
  Edit2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  ImageIcon,
  Receipt,
} from "lucide-react";
import { useCustomerSales, Customer } from "@/hooks/useCustomers";
import { useLang } from "@/lib/i18n";

type CustomerPurchasesModalProps = {
  customer: Customer | null;
  onClose: () => void;
  onEditCustomer?: (customer: Customer) => void;
};

export default function CustomerPurchasesModal({
  customer,
  onClose,
  onEditCustomer,
}: CustomerPurchasesModalProps) {
  const { t } = useLang();
  const { data, isLoading } = useCustomerSales(customer?.id || null);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  if (!customer) return null;

  const summary = data?.summary || {
    total_orders: 0,
    total_spent: 0,
    total_items_bought: 0,
    last_order_date: null,
  };
  const sales = data?.sales || [];

  const toggleExpand = (id: string) => {
    setExpandedSaleId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-NP", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto"
    >
      <div className="w-full max-w-4xl max-h-[96dvh] sm:max-h-[92vh] flex flex-col bg-white rounded-xl sm:rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-3.5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-start gap-2.5 sm:gap-3.5">
            <div className="p-2 sm:p-2.5 bg-slate-900 text-white rounded-lg sm:rounded-xl shadow-sm">
              <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                <h2 className="text-base sm:text-xl font-bold text-slate-900">{customer.name}</h2>
                <span
                  className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-3xs sm:text-xs font-semibold ${
                    customer.status === "Active"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-slate-100 text-slate-600 border border-slate-200"
                  }`}
                >
                  {t(customer.status)}
                </span>
                {onEditCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEditCustomer(customer);
                    }}
                    className="inline-flex items-center gap-1 text-2xs sm:text-xs text-slate-600 hover:text-slate-800 hover:underline font-medium ml-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    {t("Edit Details")}
                  </button>
                )}
              </div>

              {/* Contact meta */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-3xs sm:text-xs text-slate-500">
                {customer.phone && (
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3 w-3 text-slate-400" />
                    {customer.phone}
                  </span>
                )}
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-slate-400" />
                    {customer.address}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" />
                    {customer.email}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg sm:rounded-xl transition"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Stats ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-2.5 sm:p-4 bg-slate-50 border-b border-slate-100">
          <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-3xs sm:text-xs mb-1">
              <Receipt className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" />
              <span>{t("Total Orders")}</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-slate-900">{summary.total_orders}</p>
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-3xs sm:text-xs mb-1">
              <DollarSign className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
              <span>{t("Total Spent")}</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-slate-900">
              Rs. {Number(summary.total_spent || 0).toLocaleString()}
            </p>
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-3xs sm:text-xs mb-1">
              <Package className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-600" />
              <span>{t("Items Bought")}</span>
            </div>
            <p className="text-sm sm:text-lg font-bold text-slate-900">{summary.total_items_bought}</p>
          </div>

          <div className="bg-white p-2.5 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-500 text-3xs sm:text-xs mb-1">
              <CreditCard className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-600" />
              <span>{t("Credit Balance")}</span>
            </div>
            <p
              className={`text-sm sm:text-lg font-bold ${
                customer.credit_amount > 0 ? "text-red-600" : "text-slate-900"
              }`}
            >
              Rs. {Number(customer.credit_amount || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wide">
              {t("Purchase & Order History")} ({sales.length})
            </h3>
            {summary.last_order_date && (
              <span className="text-3xs sm:text-xs text-slate-500">
                {t("Last active")}: {formatDate(summary.last_order_date)}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-900 border-r-transparent" />
              <p className="text-sm">{t("Loading customer purchase history...")}</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="py-10 sm:py-14 text-center rounded-xl sm:rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 sm:p-8">
              <ShoppingBag className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mb-2 sm:mb-3" />
              <h4 className="text-sm sm:text-base font-semibold text-slate-700">
                {t("No purchases yet")}
              </h4>
              <p className="text-3xs sm:text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {t("This customer has not placed any orders yet. When they make a purchase or Cash on Delivery order, it will appear here.")}
              </p>
            </div>
          ) : (
            sales.map((sale) => {
              const isExpanded = expandedSaleId === sale.id;
              const isPending = sale.sale_status === "Pending";
              const isPaid = sale.payment_status === "Paid";

              return (
                <div
                  key={sale.id}
                  className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all hover:border-slate-300"
                >
                  {/* Order header row */}
                  <div
                    onClick={() => toggleExpand(sale.id)}
                    className="p-3 sm:p-4 cursor-pointer flex flex-wrap items-center justify-between gap-2 sm:gap-3 bg-white hover:bg-slate-50/80 transition"
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${
                          sale.is_cod
                            ? "bg-amber-100 text-amber-800"
                            : isPaid
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {sale.is_cod ? (
                          <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">
                            {sale.invoice_no}
                          </span>
                          {sale.is_cod && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-3xs sm:text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Truck className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                              COD
                            </span>
                          )}
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-3xs sm:text-2xs font-semibold ${
                              isPending
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : sale.sale_status === "Completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {t(sale.sale_status)}
                          </span>
                          <span
                            className={`px-1.5 sm:px-2 py-0.5 rounded-full text-3xs sm:text-2xs font-semibold ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700"
                                : sale.payment_status === "Partial"
                                  ? "bg-blue-50 text-blue-700"
                                  : "bg-rose-50 text-rose-700"
                            }`}
                          >
                            {t(sale.payment_status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-3xs sm:text-xs text-slate-500">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{formatDate(sale.created_at)}</span>
                          <span>•</span>
                          <span>{sale.items?.length || 0} {t("items")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:gap-4">
                      <div className="text-right">
                        <p className="text-xs sm:text-base font-bold text-slate-900">
                          Rs. {Number(sale.grand_total).toLocaleString()}
                        </p>
                        {sale.remaining_amount > 0 && (
                          <p className="text-3xs sm:text-2xs font-medium text-rose-600">
                            {t("Due")}: Rs. {Number(sale.remaining_amount).toLocaleString()}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        aria-label="Expand order details"
                        className="p-1 text-slate-400 hover:text-slate-700"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-2.5 sm:p-4 space-y-2 sm:space-y-3">
                      {sale.customer_address && (
                        <div className="flex items-center gap-1.5 text-3xs sm:text-xs text-slate-700 bg-white rounded-lg p-2 sm:p-2.5 border border-slate-200">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-500">{t("Delivery Location")}:</span>
                          <span className="font-semibold text-slate-900">{sale.customer_address}</span>
                        </div>
                      )}

                      {sale.notes && (
                        <div className="text-3xs sm:text-xs text-slate-700 bg-amber-50/60 rounded-lg p-2 sm:p-2.5 border border-amber-200/60">
                          <span className="font-semibold text-amber-900">{t("Notes")}: </span>
                          <span>{sale.notes}</span>
                        </div>
                      )}

                      <div className="space-y-1.5 sm:space-y-2">
                        <p className="text-3xs sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {t("Products Bought")}:
                        </p>
                        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white overflow-hidden">
                          {sale.items?.map((item: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 sm:p-3 gap-2 sm:gap-3 hover:bg-slate-50/50"
                            >
                              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                                <div className="h-8 w-8 sm:h-10 sm:w-10 shrink-0 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                                  {item.photo_url ? (
                                    <img
                                      src={item.photo_url}
                                      alt={item.product_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-2xs sm:text-xs font-bold text-slate-900 truncate">
                                    {item.product_name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-3xs text-slate-500">
                                    {item.batch_number && (
                                      <span className="font-medium text-blue-700 bg-blue-50 px-1 py-0.5 rounded">
                                        {item.batch_number}
                                      </span>
                                    )}
                                    {item.sku && <span className="hidden sm:inline">SKU: {item.sku}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <p className="text-2xs sm:text-xs font-semibold text-slate-900">
                                  {item.quantity} × Rs. {Number(item.unit_price).toLocaleString()}
                                </p>
                                <p className="text-3xs text-slate-500">
                                  = Rs. {Number(item.total_price).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <p className="text-2xs sm:text-xs text-slate-500">
            {t("Customer record ID")}: <span className="font-mono text-slate-700">{customer.id}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            {t("Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
