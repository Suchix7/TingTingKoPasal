"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
  X,
  ArrowUpDown,
} from "lucide-react";
import {
  usePaymentTransactions,
  type PaymentTransaction,
  type PaymentTransactionFilters,
} from "@/hooks/usePaymentTransactions";
import { useDebounced } from "@/hooks/useDebounced";
import { format } from "date-fns";
import Pagination from "@/components/layout/Pagination";
import { dateTime } from "@/utils/nepaliTime";

const TransactionDetailsModal = ({
  transaction,
  onClose,
}: {
  transaction: PaymentTransaction | null;
  onClose: () => void;
}) => {
  if (!transaction) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("np-NP", {
      style: "currency",
      currency: "NPR",
    }).format(amount);
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="max-h-[85dvh] overflow-y-auto w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2">
              <DollarSign className="h-5 w-5 text-white" />
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
                Date
              </label>
              <p className="mt-1 text-sm text-slate-900">
                {format(new Date(transaction.transaction_date), "PPP")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Payment Method
              </label>
              <p className="mt-1 font-medium text-slate-900">
                {transaction.payment_method}
              </p>
              {transaction.payment_method_type && (
                <p className="text-xs capitalize text-slate-500">
                  {transaction.payment_method_type}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Transaction Type
              </label>
              <div className="mt-1">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {transaction.transaction_type.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {transaction.reference_type && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Reference
              </label>
              <p className="mt-1 text-sm capitalize text-slate-600">
                {transaction.reference_type.replace(/_/g, " ")}
                {transaction.reference_id && (
                  <span className="ml-2 text-xs text-slate-400">
                    (#{transaction.reference_id})
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4">
            <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
              Amount
            </label>
            <p
              className={`mt-1 text-3xl font-bold ${transaction.direction === "IN" ? "text-emerald-600" : "text-rose-600"}`}
            >
              {transaction.direction === "IN" ? "+" : "-"}
              {formatCurrency(Math.abs(transaction.amount))}
            </p>
            {transaction.signed_amount !== transaction.amount && (
              <p className="mt-1 text-xs text-slate-400">
                Signed: {formatCurrency(transaction.signed_amount)}
              </p>
            )}
          </div>

          {transaction.title && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Title
              </label>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {transaction.title}
              </p>
            </div>
          )}

          {transaction.notes && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Notes
              </label>
              <p className="mt-1 text-sm text-slate-600">{transaction.notes}</p>
            </div>
          )}

          <div className="text-xs text-slate-400">
            Created:{" "}
            {format(new Date(transaction.created_at), "PPP 'at' h:mm a")}
            {transaction.updated_at && (
              <>
                <br />
                Updated:{" "}
                {format(new Date(transaction.updated_at), "PPP 'at' h:mm a")}
              </>
            )}
          </div>
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
  isCurrency = false,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  isCurrency?: boolean;
}) => {
  const formatValue = (val: string | number) => {
    if (isCurrency && typeof val === "number") {
      return new Intl.NumberFormat("np-NP", {
        style: "currency",
        currency: "NPR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val);
    }
    return val;
  };

  return (
    <div className={`rounded-2xl border ${color} bg-white p-5`}>
      <div className="flex items-center gap-3">
        <div
          className={`rounded-xl ${color.replace("border", "bg").replace("-200", "-500")} p-2.5`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">
            {formatValue(value)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function PaymentTransactionsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedTransaction, setSelectedTransaction] =
    useState<PaymentTransaction | null>(null);
  const [filters, setFilters] = useState<Partial<PaymentTransactionFilters>>({
    transaction_type: "",
    direction: "",
    reference_type: "",
    dateFrom: "",
    dateTo: "",
    sortBy: "date_desc",
  });
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounced(search, 300);

  const { data, isLoading, error } = usePaymentTransactions({
    page,
    limit,
    search: debouncedSearch,
    ...filters,
  });

  const transactions = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

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
    key: keyof PaymentTransactionFilters,
    value: string,
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value || "" }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      transaction_type: "",
      direction: "",
      reference_type: "",
      dateFrom: "",
      dateTo: "",
      sortBy: "date_desc",
    });
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    filters.transaction_type !== "" ||
    filters.direction !== "" ||
    filters.reference_type !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

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
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Payment Transactions
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">
                    Track all payment method inflows and outflows
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by title, notes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 sm:w-72"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    showFilters || hasActiveFilters
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </button>
                <button className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  <Download className="h-4 w-4" />
                  Export
                </button>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-6 border-t border-slate-200 pt-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Transaction Type
                    </label>
                    <select
                      value={filters.transaction_type || ""}
                      onChange={(e) =>
                        handleFilterChange("transaction_type", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">All Types</option>
                      <option value="OPENING_BALANCE">Opening Balance</option>
                      <option value="CAPITAL_ADDITION">Capital Addition</option>
                      <option value="SALE_PAYMENT">Sale Payment</option>
                      <option value="EXPENSE_PAYMENT">Expense Payment</option>
                      <option value="PURCHASE_PAYMENT">Purchase Payment</option>
                      <option value="WITHDRAWAL">Withdrawal</option>
                      <option value="TRANSFER_IN">Transfer In</option>
                      <option value="TRANSFER_OUT">Transfer Out</option>
                      <option value="ADJUSTMENT_IN">Adjustment In</option>
                      <option value="ADJUSTMENT_OUT">Adjustment Out</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Direction
                    </label>
                    <select
                      value={filters.direction || ""}
                      onChange={(e) =>
                        handleFilterChange("direction", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">All</option>
                      <option value="IN">Inflow</option>
                      <option value="OUT">Outflow</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Reference Type
                    </label>
                    <select
                      value={filters.reference_type || ""}
                      onChange={(e) =>
                        handleFilterChange("reference_type", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="">All References</option>
                      <option value="sale">Sale</option>
                      <option value="sale_payment">Sale Payment</option>
                      <option value="expense">Expense</option>
                      <option value="purchase_order">Purchase Order</option>
                      <option value="purchase_order_payment">
                        Purchase Order Payment
                      </option>
                      <option value="manual">Manual</option>
                      <option value="transfer">Transfer</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy || "date_desc"}
                      onChange={(e) =>
                        handleFilterChange("sortBy", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    >
                      <option value="date_desc">Newest First</option>
                      <option value="date_asc">Oldest First</option>
                      <option value="amount_desc">Highest Amount</option>
                      <option value="amount_asc">Lowest Amount</option>
                      <option value="method_asc">Method (A-Z)</option>
                      <option value="method_desc">Method (Z-A)</option>
                      <option value="type_asc">Type (A-Z)</option>
                      <option value="type_desc">Type (Z-A)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={filters.dateFrom || ""}
                      onChange={(e) =>
                        handleFilterChange("dateFrom", e.target.value)
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
                      value={filters.dateTo || ""}
                      onChange={(e) =>
                        handleFilterChange("dateTo", e.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="flex items-end sm:col-span-2 xl:col-span-2">
                    <button
                      onClick={clearFilters}
                      className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Total Inflows"
              value={data?.stats?.total_in || 0}
              icon={TrendingUp}
              color="border-emerald-200"
              isCurrency
            />
            <StatsCard
              title="Total Outflows"
              value={data?.stats?.total_out || 0}
              icon={TrendingDown}
              color="border-rose-200"
              isCurrency
            />
            <StatsCard
              title="Net Amount"
              value={data?.stats?.net_amount || 0}
              icon={ArrowUpDown}
              color="border-blue-200"
              isCurrency
            />
            <StatsCard
              title="Transactions"
              value={data?.stats?.total_transactions || 0}
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
                <DollarSign className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {hasActiveFilters
                    ? "No matching transactions found"
                    : "No transactions yet"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {hasActiveFilters
                    ? "Try adjusting your search or filters."
                    : "Payment transactions will appear here once payment activities occur."}
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
                          Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Payment Method
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Reference
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="transition hover:bg-slate-50/50"
                        >
                          <td className="whitespace-nowrap px-6 py-4">
                            <div className="text-sm text-slate-900">
                              {format(
                                new Date(transaction.transaction_date),
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
                              {transaction.payment_method}
                            </div>
                            {transaction.payment_method_type && (
                              <div className="text-xs capitalize text-slate-400">
                                {transaction.payment_method_type}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                                transaction.direction === "IN"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {transaction.transaction_type.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-600">
                              {transaction.reference_type
                                ? transaction.reference_type
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (c) => c.toUpperCase())
                                : "—"}
                            </div>
                            {transaction.reference_id && (
                              <div className="text-xs text-slate-400">
                                ID: {transaction.reference_id}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right">
                            <div
                              className={`text-sm font-semibold ${
                                transaction.direction === "IN"
                                  ? "text-emerald-600"
                                  : "text-rose-600"
                              }`}
                            >
                              {transaction.direction === "IN" ? "+" : "-"}
                              {new Intl.NumberFormat("np-NP", {
                                style: "currency",
                                currency: "NPR",
                              }).format(transaction.amount)}
                            </div>
                            {transaction.title && (
                              <div className="text-xs text-slate-400 truncate max-w-[200px]">
                                {transaction.title}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                setSelectedTransaction(transaction)
                              }
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
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
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {transaction.payment_method}
                            </h3>
                            {transaction.payment_method_type && (
                              <span className="text-xs capitalize text-slate-400">
                                {transaction.payment_method_type}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">
                            {format(
                              new Date(transaction.transaction_date),
                              "MMM d, yyyy 'at' h:mm a",
                            )}
                          </p>
                          {transaction.title && (
                            <p className="mt-1 text-sm font-medium text-slate-700">
                              {transaction.title}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            transaction.direction === "IN"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {transaction.transaction_type.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs text-slate-400">Amount</p>
                          <p
                            className={`text-lg font-bold ${
                              transaction.direction === "IN"
                                ? "text-emerald-600"
                                : "text-rose-600"
                            }`}
                          >
                            {transaction.direction === "IN" ? "+" : "-"}
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: "USD",
                            }).format(transaction.amount)}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedTransaction(transaction)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Details
                        </button>
                      </div>

                      {transaction.reference_type && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <p className="text-xs text-slate-400">
                            Reference:{" "}
                            <span className="capitalize text-slate-600">
                              {transaction.reference_type.replace(/_/g, " ")}
                            </span>
                            {transaction.reference_id && (
                              <span className="text-slate-400">
                                {" "}
                                (#{transaction.reference_id})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
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
