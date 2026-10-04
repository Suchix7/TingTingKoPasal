// app/inventory-transactions/page.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  X,
  Layers,
  Boxes,
} from "lucide-react";
import {
  useInventoryTransactions,
  type InventoryTransaction,
  type InventoryTransactionFilters,
  type InventoryTransactionType,
  type InventoryReferenceType,
} from "@/hooks/useInventoryTransactions";
import { useDebounced } from "@/hooks/useDebounced";
import { format } from "date-fns";
import Pagination from "@/components/layout/Pagination";
import { dateTime } from "@/utils/nepaliTime";

const TransactionDetailsModal = ({
  transaction,
  onClose,
}: {
  transaction: InventoryTransaction | null;
  onClose: () => void;
}) => {
  if (!transaction) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">
              Transaction Details
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Transaction ID
              </label>
              <p className="mt-1 font-mono text-sm text-slate-900">
                #{transaction.id}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Date & Time
              </label>
              <p className="mt-1 text-sm text-slate-900">
                {format(dateTime(transaction.created_at), "PPP 'at' h:mm a")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Product
              </label>
              <p className="mt-1 font-medium text-slate-900">
                {transaction.product_name ||
                  `Product #${transaction.product_id}`}
              </p>
              {transaction.unit && (
                <p className="text-xs text-slate-500">
                  Unit: {transaction.unit}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Reference Type
              </label>
              <div className="mt-1">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {transaction.reference_type?.replaceAll("_", " ") || "N/A"}
                </span>
              </div>
              {transaction.reference_id && (
                <p className="mt-1 text-xs text-slate-500">
                  Reference ID: #{transaction.reference_id}
                </p>
              )}
            </div>
          </div>

          {/* Batch Information */}
          {transaction.batch_id && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Batch ID
                </label>
                <p className="mt-1 font-mono text-sm text-slate-900">
                  #{transaction.batch_id}
                </p>
              </div>
              {transaction.batch_number && (
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    Batch Number
                  </label>
                  <p className="mt-1 text-sm text-slate-900">
                    {transaction.batch_number}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 grid-cols-1">
            <div className="rounded-xl bg-slate-50 p-3">
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Quantity
              </label>
              <p
                className={`mt-1 text-2xl font-bold ${
                  transaction.transaction_type === "IN"
                    ? "text-green-600"
                    : transaction.transaction_type === "OUT"
                      ? "text-red-600"
                      : "text-amber-600"
                }`}
              >
                {transaction.transaction_type === "IN"
                  ? "+"
                  : transaction.transaction_type === "OUT"
                    ? "-"
                    : "±"}
                {transaction.quantity}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-6">
          <button
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
}) => (
  <div className={`rounded-2xl border ${color} bg-white p-5`}>
    <div className="flex items-center gap-3">
      <div
        className={`rounded-xl ${
          color.includes("emerald")
            ? "bg-emerald-500"
            : color.includes("rose")
              ? "bg-rose-500"
              : color.includes("blue")
                ? "bg-blue-500"
                : "bg-purple-500"
        } p-2.5`}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

// Helper function to get transaction type badge
const getTransactionTypeBadge = (type: InventoryTransactionType) => {
  switch (type) {
    case "IN":
      return {
        label: "Stock In",
        className: "bg-emerald-50 text-emerald-700",
        icon: TrendingUp,
      };
    case "OUT":
      return {
        label: "Stock Out",
        className: "bg-rose-50 text-rose-700",
        icon: TrendingDown,
      };
    case "ADJUSTMENT":
      return {
        label: "Adjustment",
        className: "bg-amber-50 text-amber-700",
        icon: Activity,
      };
    default:
      return {
        label: type,
        className: "bg-slate-50 text-slate-700",
        icon: Activity,
      };
  }
};

export default function InventoryTransactionsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<InventoryTransaction | null>(null);
  const [filters, setFilters] = useState<Partial<InventoryTransactionFilters>>({
    transaction_type: undefined,
    reference_type: undefined,
    from_date: "",
    to_date: "",
    batch_id: undefined,
    product_id: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading, error } = useInventoryTransactions({
    page,
    limit,
    search: debouncedSearch,
    ...filters,
  });

  const transactions = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

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

  const handleFilterChange = (
    key: keyof typeof filters,
    value: string | number | undefined,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      transaction_type: undefined,
      reference_type: undefined,
      from_date: "",
      to_date: "",
      batch_id: undefined,
      product_id: undefined,
    });
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters = () => {
    return Object.entries(filters).some(
      ([key, value]) => value !== undefined && value !== "",
    );
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
              Failed to Load Transactions
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
          {/* Header */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-slate-900 p-3">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Inventory Transactions
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Track all stock movements and inventory changes
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by product..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-72"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    showFilters || hasActiveFilters()
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters() && (
                    <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                      Active
                    </span>
                  )}
                </button>
                <button className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Stock Movement
                    </label>
                    <select
                      value={filters.transaction_type || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "transaction_type",
                          (e.target.value as InventoryTransactionType) ||
                            undefined,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">All Movements</option>
                      <option value="IN">Stock In</option>
                      <option value="OUT">Stock Out</option>
                      <option value="ADJUSTMENT">Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Reference Type
                    </label>
                    <select
                      value={filters.reference_type || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "reference_type",
                          (e.target.value as InventoryReferenceType) ||
                            undefined,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">All References</option>
                      <option value="INITIAL_STOCK">Initial Stock</option>
                      <option value="SALE">Sale</option>
                      <option value="SALE_DELETE">Sale Delete</option>
                      <option value="SALE_CANCELLED">Sale Cancelled</option>
                      <option value="SALE_RETURN">Sale Return</option>
                      <option value="SALE_UPDATE_RESTORE">
                        Sale Update Restore
                      </option>
                      <option value="RESTOCK">Restock</option>
                      <option value="PURCHASE_ORDER">Purchase Order</option>
                      <option value="RETURN">Return</option>
                      <option value="ADJUSTMENT">Adjustment</option>
                      <option value="DEDUCT">Deduct</option>
                      <option value="MANUAL">Manual</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Batch ID
                    </label>
                    <input
                      type="number"
                      placeholder="Enter batch ID"
                      value={filters.batch_id || ""}
                      onChange={(e) =>
                        handleFilterChange(
                          "batch_id",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={filters.from_date || ""}
                      onChange={(e) =>
                        handleFilterChange("from_date", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={filters.to_date || ""}
                      onChange={(e) =>
                        handleFilterChange("to_date", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total Inflows"
              value={data?.stats?.total_inflows || 0}
              icon={TrendingUp}
              color="border-emerald-200"
            />
            <StatsCard
              title="Total Outflows"
              value={data?.stats?.total_outflows || 0}
              icon={TrendingDown}
              color="border-rose-200"
            />
            <StatsCard
              title="Net Change"
              value={data?.stats?.net_change || 0}
              icon={Activity}
              color="border-blue-200"
            />
            <StatsCard
              title="Transactions"
              value={data?.stats?.transactions || 0}
              icon={Calendar}
              color="border-purple-200"
            />
          </div>

          {/* Transactions Table */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            {isLoading ? (
              <div className="space-y-4 p-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-2xl bg-slate-100"
                  />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {search || hasActiveFilters()
                    ? "No matching transactions found"
                    : "No transactions yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {search || hasActiveFilters()
                    ? "Try adjusting your search or filters."
                    : "Inventory transactions will appear here once stock movements occur."}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto lg:block">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Date & Time
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Product
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Batch
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Type
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Quantity
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((transaction) => {
                        const typeBadge = getTransactionTypeBadge(
                          transaction.transaction_type,
                        );
                        const TypeIcon = typeBadge.icon;

                        return (
                          <tr
                            key={transaction.id}
                            className="transition hover:bg-slate-50/50"
                          >
                            <td className="whitespace-nowrap px-6 py-4">
                              <div className="text-sm text-slate-900">
                                {format(
                                  dateTime(transaction.created_at),
                                  "MMM d, yyyy",
                                )}
                              </div>
                              <div className="text-xs text-slate-400">
                                {format(
                                  dateTime(transaction.created_at),
                                  "h:mm a",
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-900">
                                {transaction.product_name ||
                                  `Product #${transaction.product_id}`}
                              </div>
                              <div className="text-xs text-slate-400">
                                {transaction.unit &&
                                  ` • Unit: ${transaction.unit}`}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {transaction.batch_id ? (
                                <div>
                                  <div className="text-sm text-slate-900">
                                    {transaction.batch_number ||
                                      `Batch #${transaction.batch_id}`}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    ID: #{transaction.batch_id}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  No batch
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadge.className}`}
                                >
                                  <TypeIcon className="h-3 w-3" />
                                  {typeBadge.label}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {transaction.reference_type?.replaceAll(
                                    "_",
                                    " ",
                                  ) || "N/A"}
                                </span>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-right">
                              <span
                                className={`text-sm font-semibold ${
                                  transaction.transaction_type === "IN"
                                    ? "text-emerald-600"
                                    : transaction.transaction_type === "OUT"
                                      ? "text-rose-600"
                                      : "text-amber-600"
                                }`}
                              >
                                {transaction.transaction_type === "IN"
                                  ? "+"
                                  : transaction.transaction_type === "OUT"
                                    ? "-"
                                    : "±"}
                                {transaction.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() =>
                                  setSelectedTransaction(transaction)
                                }
                                className="inline-flex items-center cursor-pointer gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </button>
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

                {/* Mobile Card View */}
                <div className="grid gap-4 p-4 lg:hidden">
                  {transactions.map((transaction) => {
                    const typeBadge = getTransactionTypeBadge(
                      transaction.transaction_type,
                    );
                    const TypeIcon = typeBadge.icon;

                    return (
                      <div
                        key={transaction.id}
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-900">
                                {transaction.product_name ||
                                  `Product #${transaction.product_id}`}
                              </h3>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              {format(
                                dateTime(transaction.created_at),
                                "MMM d, yyyy 'at' h:mm a",
                              )}
                            </p>
                            {transaction.batch_id && (
                              <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                                <Boxes className="h-3 w-3" />
                                {transaction.batch_number ||
                                  `Batch #${transaction.batch_id}`}
                              </div>
                            )}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadge.className}`}
                          >
                            <TypeIcon className="h-3 w-3" />
                            {typeBadge.label}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            {transaction.reference_type?.replaceAll("_", " ")}
                          </span>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                          <div>
                            <p className="text-xs text-slate-400">Quantity</p>
                            <p
                              className={`text-lg font-bold ${
                                transaction.transaction_type === "IN"
                                  ? "text-emerald-600"
                                  : transaction.transaction_type === "OUT"
                                    ? "text-rose-600"
                                    : "text-amber-600"
                              }`}
                            >
                              {transaction.transaction_type === "IN"
                                ? "+"
                                : transaction.transaction_type === "OUT"
                                  ? "-"
                                  : "±"}
                              {transaction.quantity}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedTransaction(transaction)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Details
                          </button>
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

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <TransactionDetailsModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </>
  );
}
