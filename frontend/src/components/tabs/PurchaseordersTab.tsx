"use client";

import { useMemo, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import {
  ShoppingCart,
  Search,
  Plus,
  Eye,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  AlertCircle,
} from "lucide-react";
import {
  usePurchaseOrders,
  useUpdatePurchaseOrderStatus,
  useDeletePurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/hooks/usePurchaseOrders";
import { useDebounced } from "@/hooks/useDebounced";
import CreatePurchaseOrderModal from "@/components/purchase-orders/CreatePurchaseOrderModal";
import ViewPurchaseOrderModal from "@/components/purchase-orders/ViewPurchaseOrderModal";
import DeleteConfirmModal from "@/components/purchase-orders/DeleteConfirmModal";
import Pagination from "@/components/layout/Pagination";

const STATUS_CONFIG = {
  Pending: {
    label: "Pending",
    color: "amber",
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-600/20",
    icon: Clock,
    iconColor: "text-amber-500",
  },
  Received: {
    label: "Received",
    color: "emerald",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-600/20",
    icon: CheckCircle,
    iconColor: "text-emerald-500",
  },
  Cancelled: {
    label: "Cancelled",
    color: "rose",
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-600/20",
    icon: XCircle,
    iconColor: "text-rose-500",
  },
} as const;

const getStatusConfig = (status: PurchaseOrderStatus) => {
  return STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
};

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "ALL">(
    "ALL",
  );
  const [sortBy, setSortBy] = useState<
    "date_desc" | "date_asc" | "total_desc" | "total_asc" | "supplier_asc"
  >("date_desc");
  const debouncedSearchValue = useDebounced(search, 300);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const limit = 20;

  const {
    data: ordersData,
    isLoading,
    error,
  } = usePurchaseOrders(
    page,
    limit,
    debouncedSearchValue,
    statusFilter === "ALL" ? "" : statusFilter,
    sortBy,
  );

  const updateStatusMutation = useUpdatePurchaseOrderStatus();
  const deleteOrderMutation = useDeletePurchaseOrder();

  const purchaseOrders = ordersData?.data || [];
  const totalOrders = ordersData?.totalCount || 0;
  const totalPages =
    ordersData?.totalPages || Math.ceil(totalOrders / limit) || 1;

  const goToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  };

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [page, totalPages]);

  const handleViewOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowViewModal(true);
  };

  const handleUpdateStatus = async (
    orderId: string,
    status: PurchaseOrderStatus,
  ) => {
    try {
      await updateStatusMutation.mutateAsync({ id: orderId, status });
    } catch (error) {
      console.error("Status update failed:", error);
    }
  };

  const handleDeleteOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedOrder) return;
    try {
      await deleteOrderMutation.mutateAsync(selectedOrder.id);
      setShowDeleteModal(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("np-NP", {
      style: "currency",
      currency: "NPR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (error) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-rose-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-50">
              <AlertCircle className="h-10 w-10 text-rose-400" />
            </div>
            <h3 className="mt-6 text-xl font-semibold text-slate-900">
              Failed to Load Purchase Orders
            </h3>
            <p className="mt-3 text-sm text-slate-500">
              Please check your connection and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-dvh bg-gradient-to-br from-slate-50 via-white to-slate-100/50 p-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-6 rounded-3xl border border-gray-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-slate-900 p-3">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Purchase Orders
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage and track all purchase orders
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Create Order
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-2.5">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Total Orders
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {ordersData?.stats?.total}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-500 p-2.5">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
                    Pending
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">
                    {ordersData?.stats?.pending}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500 p-2.5">
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-emerald-600">
                    Received
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {ordersData?.stats?.received}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-600 p-2.5">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Total Value
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {formatCurrency(ordersData?.stats?.totalValue || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 bg-slate-50/50 p-4 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by supplier, PO number..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
                    <select
                      value={statusFilter}
                      onChange={(e) =>
                        setStatusFilter(
                          e.target.value as PurchaseOrderStatus | "ALL",
                        )
                      }
                      className="w-full outline-none"
                    >
                      <option value="ALL">All Status</option>
                      <option value="Pending">Pending</option>
                      <option value="Received">Received</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as typeof sortBy)
                      }
                      className="w-full outline-none"
                    >
                      <option value="date_desc">Newest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="total_desc">Highest Value</option>
                      <option value="total_asc">Lowest Value</option>
                      <option value="supplier_asc">Supplier A-Z</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingCart className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {search || statusFilter !== "ALL"
                    ? "No matching purchase orders found"
                    : "No purchase orders yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search || statusFilter !== "ALL"
                    ? "Try adjusting your search or filters."
                    : "Create your first purchase order to get started."}
                </p>
                {!search && statusFilter === "ALL" && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Create Order
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          PO Number
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Supplier
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Order Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Total Cost
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Status
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaseOrders.map((order) => {
                        const statusConfig = getStatusConfig(order.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                          <tr
                            key={order.id}
                            className="transition hover:bg-slate-50/50"
                          >
                            <td className="px-6 py-4">
                              <span className="font-mono text-sm font-medium text-slate-900">
                                PO-{order.id}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {order.supplier_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {order.supplier_email}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {order.supplier_phone}
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-slate-600">
                                {formatDate(order.order_date)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(order.total_cost)}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ring-1 ring-inset ${statusConfig.ring}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewOrder(order)}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </button>
                                {order.status === "Pending" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleUpdateStatus(order.id, "Received")
                                      }
                                      disabled={updateStatusMutation.isPending}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                      Receive
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleUpdateStatus(
                                          order.id,
                                          "Cancelled",
                                        )
                                      }
                                      disabled={updateStatusMutation.isPending}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {order.status !== "Received" && (
                                  <button
                                    onClick={() => handleDeleteOrder(order)}
                                    disabled={deleteOrderMutation.isPending}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    goToPage={goToPage}
                    pageNumbers={pageNumbers}
                  />
                </div>

                <div className="grid gap-4 p-4 lg:hidden">
                  {purchaseOrders.map((order) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;

                    return (
                      <div
                        key={order.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              PO-{order.id}
                            </p>
                            <h3 className="mt-1 font-medium text-slate-900">
                              {order.supplier_name}
                            </h3>
                            <p className="text-sm text-slate-500">
                              {order.supplier_email} | {order.supplier_phone}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ring-1 ring-inset ${statusConfig.ring}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                          <div>
                            <p className="text-xs text-slate-500">Order Date</p>
                            <p className="text-sm font-medium text-slate-900">
                              {formatDate(order.order_date)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Total Cost</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(order.total_cost)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewOrder(order)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          {order.status === "Pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleUpdateStatus(order.id, "Received")
                                }
                                disabled={updateStatusMutation.isPending}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Receive
                              </button>
                            </>
                          )}
                          {order.status !== "Received" && (
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              disabled={deleteOrderMutation.isPending}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    goToPage={goToPage}
                    pageNumbers={pageNumbers}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <CreatePurchaseOrderModal
          closeModal={() => setShowCreateModal(false)}
        />
      )}

      {showViewModal && selectedOrder && (
        <ViewPurchaseOrderModal
          closeModal={() => {
            setShowViewModal(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      )}

      {showDeleteModal && selectedOrder && (
        <DeleteConfirmModal
          closeModal={() => {
            setShowDeleteModal(false);
            setSelectedOrder(null);
          }}
          onConfirm={confirmDelete}
          isDeleting={deleteOrderMutation.isPending}
          orderNumber={`PO-${selectedOrder.id}`}
        />
      )}
    </>
  );
}
