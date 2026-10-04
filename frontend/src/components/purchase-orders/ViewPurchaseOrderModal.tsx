"use client";

import { Package, Calendar, DollarSign, User, Hash } from "lucide-react";
import {
  type PurchaseOrder,
  type PurchaseOrderItem,
} from "@/hooks/usePurchaseOrders";

type Props = {
  closeModal: () => void;
  order: PurchaseOrder;
};

export default function ViewPurchaseOrderModal({ closeModal, order }: Props) {
  const formatCurrency = (amount: number) => {
    return `Rs.${amount}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      Pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
      Received: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
      Cancelled: "bg-rose-50 text-rose-700 ring-rose-600/20",
    };
    return config[status as keyof typeof config] || config.Pending;
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2">
              <Package className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Purchase Order #{order.id}
              </h2>
              <p className="text-sm text-slate-500">
                Created on {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Hash className="h-4 w-4" />
                <span className="text-xs font-medium">PO Number</span>
              </div>
              <p className="text-lg font-semibold text-slate-900">
                PO-{order.id}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <User className="h-4 w-4" />
                <span className="text-xs font-medium">Supplier ID</span>
              </div>
              <p className="text-lg font-semibold text-slate-900">
                {order.supplier_id}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Calendar className="h-4 w-4" />
                <span className="text-xs font-medium">Order Date</span>
              </div>
              <p className="text-sm font-medium text-slate-900">
                {formatDate(order.order_date)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium">Total Cost</span>
              </div>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(order.total_cost)}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Order Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Status
                </p>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadge(order.status)}`}
                >
                  {order.status}
                </span>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">
                  Ordering Cost
                </p>
                <p className="text-sm text-slate-900">
                  {formatCurrency(order.ordering_cost)}
                </p>
              </div>

              {order.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">
                    Notes
                  </p>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">
                    {order.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Order Items
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                      Product ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                      Product Name
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                      Unit Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500">
                      Total Cost
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items &&
                    order.items.map(
                      (item: PurchaseOrderItem, index: number) => (
                        <tr key={index} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {item.product_id}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {item.product_name}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatCurrency(item.unit_cost)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(item.total_cost)}
                          </td>
                        </tr>
                      ),
                    )}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-right text-sm font-semibold text-slate-900"
                    >
                      Subtotal:
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(order.total_cost - order.ordering_cost)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-right text-sm font-semibold text-slate-900"
                    >
                      Ordering Cost:
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(order.ordering_cost)}
                    </td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-right text-base font-bold text-slate-900"
                    >
                      Total:
                    </td>
                    <td className="px-6 py-4 text-base font-bold text-slate-900">
                      {formatCurrency(order.total_cost)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
