"use client";

import { useMemo, useState, useEffect } from "react";
import {
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Package,
  Receipt,
  Search,
  Trash2,
  TrendingUp,
  Edit,
  RefreshCw,
  XCircle,
  User,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  useQuickSales,
  useDeleteQuickSale,
  useCancelQuickSale,
  useConvertQuickSale,
  type QuickSale,
  type QuickSaleStatus,
} from "@/hooks/useQuickSales";
import DeleteConfirmModal from "@/components/layout/DeleteConfirmModal";
import EditSaleModal from "@/components/sales/EditSaleModal";
import { useDebounced } from "@/hooks/useDebounced";
import Pagination from "@/components/layout/Pagination";
import { dateTime } from "@/utils/nepaliTime";

const LIMIT = 20;

const money = (value?: number | null) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const statusClass: Record<QuickSaleStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  converted: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const statusLabel: Record<QuickSaleStatus, string> = {
  pending: "Pending",
  converted: "Converted",
  cancelled: "Cancelled",
};

function StatusBadge({ status }: { status: QuickSaleStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[status]}`}
    >
      {statusLabel[status]}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: typeof Receipt;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function QuickSalesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 500);
  const [status, setStatus] = useState<"all" | QuickSaleStatus>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<QuickSale | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<QuickSale | null>(null);
  const [convertSale, setConvertSale] = useState<QuickSale | null>(null);

  const { data, isLoading, isFetching } = useQuickSales({
    page,
    limit: LIMIT,
    search: debouncedSearch,
    status,
  });

  const deleteQuickSale = useDeleteQuickSale();
  const cancelQuickSale = useCancelQuickSale();
  const convertQuickSale = useConvertQuickSale();

  const quickSales = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteQuickSale.mutateAsync(deleteConfirm.id);
      toast.success("Quick sale deleted successfully.");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete quick sale.");
    }
  };

  const handleCancel = async () => {
    if (!cancelConfirm) return;

    try {
      await cancelQuickSale.mutateAsync(cancelConfirm.id);
      toast.success("Quick sale cancelled successfully.");
      setCancelConfirm(null);
    } catch {
      toast.error("Failed to cancel quick sale.");
    }
  };

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

  // Calculate stats
  // const stats = useMemo(() => {
  //   const pendingSales = quickSales.filter((s) => s.status === "pending");
  //   const convertedSales = quickSales.filter((s) => s.status === "converted");
  //   const cancelledSales = quickSales.filter((s) => s.status === "cancelled");

  //   const totalPendingAmount = pendingSales.reduce(
  //     (sum, s) => sum + Number(s.selling_price || 0),
  //     0,
  //   );
  //   const totalConvertedAmount = convertedSales.reduce(
  //     (sum, s) => sum + Number(s.selling_price || 0),
  //     0,
  //   );
  //   const totalPaidAmount = quickSales.reduce(
  //     (sum, s) => sum + Number(s.paid_amount || 0),
  //     0,
  //   );
  //   const totalRemaining = quickSales.reduce(
  //     (sum, s) => sum + Number(s.remaining_amount || 0),
  //     0,
  //   );

  //   return {
  //     pendingCount: pendingSales.length,
  //     totalPendingAmount,
  //     totalConvertedAmount,
  //     totalPaidAmount,
  //     totalRemaining,
  //   };
  // }, [quickSales]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quick Sales</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage quick sales and convert them to full sales.
          </p>
        </div>
      </div>

      {/* <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Quick Sales"
          value={stats.pendingCount}
          icon={Package}
          subtitle={`Value: ${money(stats.totalPendingAmount)}`}
        />
        <StatCard
          title="Total Paid"
          value={money(stats.totalPaidAmount)}
          icon={CreditCard}
          subtitle="Collected amount"
        />
        <StatCard
          title="Total Remaining"
          value={money(stats.totalRemaining)}
          icon={FileText}
          subtitle="Receivable amount"
        />
        <StatCard
          title="Converted Value"
          value={money(stats.totalConvertedAmount)}
          icon={TrendingUp}
          subtitle="Converted to sales"
        />
      </div> */}

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer name, phone, or notes..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          <div className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none">
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "all" | QuickSaleStatus)
              }
              className="w-full outline-none"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="converted">Converted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">All Quick Sales</h2>
            <p className="text-sm text-gray-500">{totalCount} total records</p>
          </div>
          {isFetching ? (
            <Loader2 className="animate-spin text-gray-400" size={20} />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Quick Sale</th>
                <th className="px-5 py-3">Total Amount</th>
                <th className="px-5 py-3">Payment Methods</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
                    Loading quick sales...
                  </td>
                </tr>
              ) : !quickSales.length ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    No quick sales found.
                  </td>
                </tr>
              ) : (
                quickSales.map((quickSale) => (
                  <tr
                    key={quickSale.id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gray-100 p-2 text-gray-600">
                          <Receipt size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            Quick Sale #{quickSale.id}
                          </p>
                          <p className="text-xs text-gray-500">
                            {quickSale.converted_sale_id
                              ? `→ Sale #${quickSale.converted_sale_id}`
                              : "Not converted"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {quickSale.total_amount}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600">
                        {quickSale.payments.length > 0
                          ? quickSale.payments
                              .map((p) => p.payment_method_name)
                              .join(", ")
                          : "No payments"}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={quickSale.status} />
                    </td>

                    <td className="px-5 py-4 max-w-[200px]">
                      <p className="truncate text-sm text-gray-600">
                        {quickSale.notes || (
                          <span className="text-gray-400">No notes</span>
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {dateTime(quickSale.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        {quickSale.status === "pending" && (
                          <button
                            onClick={() => setConvertSale(quickSale)}
                            className="rounded-xl p-2 text-gray-500 transition hover:bg-green-50 hover:text-green-600"
                            aria-label="Convert to sale"
                            title="Convert to sale"
                          >
                            <RefreshCw size={18} />
                          </button>
                        )}
                        {quickSale.status === "pending" && (
                          <button
                            onClick={() => setCancelConfirm(quickSale)}
                            className="rounded-xl p-2 text-gray-500 transition hover:bg-yellow-50 hover:text-yellow-600"
                            aria-label="Cancel quick sale"
                            title="Cancel quick sale"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(quickSale)}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete quick sale"
                          title="Delete quick sale"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          goToPage={goToPage}
          pageNumbers={pageNumbers}
        />
      </div>

      {deleteConfirm ? (
        <DeleteConfirmModal
          invoiceNo={`Quick Sale #${deleteConfirm.id}`}
          label="quick sale"
          isPending={deleteQuickSale.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      ) : null}

      {cancelConfirm ? (
        <DeleteConfirmModal
          invoiceNo={`Quick Sale #${cancelConfirm.id}`}
          label="quick sale cancellation"
          isPending={cancelQuickSale.isPending}
          onConfirm={handleCancel}
          onCancel={() => setCancelConfirm(null)}
          confirmLabel="Cancel Quick Sale"
          description="Are you sure you want to cancel this quick sale? This action cannot be undone."
        />
      ) : null}

      {convertSale ? (
        <EditSaleModal
          sale={
            {
              id: convertSale.id,
              invoice_no: `QS-${convertSale.id}`,
              discount_amount: 0,
              tax_amount: 0,
              profit_amount: 0,
              sale_status: "Completed",
              created_at: convertSale.created_at,
              updated_at: convertSale.updated_at,
              payments: convertSale.payments,
            } as any
          }
          saleItems={[]}
          onClose={() => setConvertSale(null)}
          money={money}
          isQuickSaleConversion={true}
          quickSaleId={convertSale.id}
        />
      ) : null}
    </div>
  );
}
