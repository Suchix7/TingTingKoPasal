"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  FileText,
  Loader2,
  Package,
  Receipt,
  Search,
  Trash2,
  TrendingDown,
  Edit,
  Calendar,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  Expense,
  useExpenses,
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/hooks/useExpenses";
import DeleteConfirmModal from "@/components/layout/DeleteConfirmModal";
import ExpenseDetailsModal from "@/components/expenses/ExpenseDetailsModal";
import ExpenseFormModal from "@/components/expenses/ExpenseFormModal";
import { useDebounced } from "@/hooks/useDebounced";
import Pagination from "@/components/layout/Pagination";
import { CATEGORIES } from "@/components/expenses/ExpenseFormModal";

const LIMIT = 20;

const money = (value?: number | null) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const dateTime = (value?: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const dateOnly = (value?: string) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-NP", {
    dateStyle: "medium",
  }).format(new Date(value));
};

const categoryColors: Record<string, string> = {
  Food: "bg-red-100 text-red-700 border-red-200",
  Rent: "bg-purple-100 text-purple-700 border-purple-200",
  Utilities: "bg-blue-100 text-blue-700 border-blue-200",
  Salaries: "bg-green-100 text-green-700 border-green-200",
  Supplies: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Maintenance: "bg-orange-100 text-orange-700 border-orange-200",
  Marketing: "bg-pink-100 text-pink-700 border-pink-200",
  Travel: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
};

function StatusBadge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div
          className={`rounded-xl p-3 ${
            trend === "up"
              ? "bg-red-100 text-red-700"
              : trend === "down"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
          }`}
        >
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search, 500);
  const [category, setCategory] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [selectedExpenseId, setSelectedExpenseId] = useState<
    number | undefined
  >();
  const [deleteConfirm, setDeleteConfirm] = useState<Expense | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const queryParams = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: debouncedSearch,
      category: category || undefined,
      payment_method_id: paymentMethodId || undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    }),
    [page, debouncedSearch, category, paymentMethodId, startDate, endDate],
  );

  const { data, isLoading, isFetching } = useExpenses(queryParams);
  const deleteExpense = useDeleteExpense();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const expenses = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalAmount = data?.totalAmount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const categories = CATEGORIES;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, paymentMethodId, startDate, endDate]);

  const handleCreateExpense = async (expenseData: any) => {
    try {
      await createExpense.mutateAsync(expenseData);
      toast.success("Expense created successfully.");
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error("Failed to create expense.");
    }
  };

  const handleUpdateExpense = async (expenseData: any) => {
    if (!editExpense) return;
    try {
      await updateExpense.mutateAsync({
        id: editExpense.id,
        ...expenseData,
      });
      toast.success("Expense updated successfully.");
      setEditExpense(null);
    } catch (error) {
      toast.error("Failed to update expense.");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteExpense.mutateAsync(deleteConfirm.id);
      toast.success("Expense deleted successfully.");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete expense.");
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

  const averageExpense = useMemo(() => {
    if (expenses.length === 0) return 0;
    return totalAmount / totalCount;
  }, [expenses, totalAmount]);

  const topCategories = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + expense.amount;
    });
    return Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [expenses]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage your business expenses.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          <CreditCard size={18} />
          Add Expense
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Expenses"
          value={money(totalAmount)}
          icon={DollarSign}
          trend="up"
        />
        <StatCard
          title="Average Expense"
          value={money(averageExpense)}
          icon={TrendingDown}
        />
        <StatCard
          title="Total Transactions"
          value={totalCount}
          icon={Receipt}
        />
        <StatCard title="Categories" value={categories.length} icon={Package} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px_180px_180px]">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or notes..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400"
            />
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={paymentMethodId}
            onChange={(event) => setPaymentMethodId(event.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-gray-400"
          >
            <option value="">All Payment Methods</option>
            <option value="1">Cash</option>
            <option value="2">Bank Transfer</option>
            <option value="3">Credit Card</option>
            <option value="4">Mobile Payment</option>
          </select>

          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-gray-400"
              placeholder="Start Date"
            />
          </div>

          <div className="relative">
            <Calendar
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-gray-400"
              placeholder="End Date"
            />
          </div>
        </div>

        {(startDate || endDate) && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">
              Filtered by date range
            </span>
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Clear dates
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">All Expenses</h2>
            <p className="text-sm text-gray-500">
              {totalCount} total records · {money(totalAmount)} total
            </p>
          </div>
          {isFetching ? (
            <Loader2 className="animate-spin text-gray-400" size={20} />
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Title & Category</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Payment Method</th>
                <th className="px-5 py-3">Notes</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <Loader2 className="mx-auto mb-2 animate-spin" size={24} />
                    Loading expenses...
                  </td>
                </tr>
              ) : !expenses.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-16 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle size={24} className="text-gray-400" />
                      <p>No expenses found.</p>
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Add your first expense
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="transition hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-red-50 p-2 text-red-600">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {dateOnly(expense.expense_date)}
                          </p>
                          <p className="text-xs text-gray-500">
                            ID #{expense.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {expense.title}
                        </p>
                        <StatusBadge
                          className={
                            categoryColors[expense.category] ||
                            categoryColors.Other
                          }
                        >
                          {expense.category}
                        </StatusBadge>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-bold text-red-700">
                        {money(expense.amount)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {expense.payment_method ? (
                        <div className="flex items-center gap-2">
                          <CreditCard size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-700">
                            {expense.payment_method}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Not specified
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[200px] truncate text-sm text-gray-600">
                        {expense.notes || (
                          <span className="text-gray-400">No notes</span>
                        )}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {dateTime(expense.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditExpense(expense)}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-slate-50 hover:text-slate-600"
                          aria-label="Edit expense"
                          title="Edit expense"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => setSelectedExpenseId(expense.id)}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                          aria-label="View expense details"
                          title="View details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(expense)}
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete expense"
                          title="Delete expense"
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

      {/* View Details Modal */}
      {selectedExpenseId && (
        <ExpenseDetailsModal
          expenseId={selectedExpenseId}
          onClose={() => setSelectedExpenseId(undefined)}
          money={money}
          dateTime={dateTime}
          dateOnly={dateOnly}
        />
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ExpenseFormModal
          mode="create"
          onSubmit={handleCreateExpense}
          onClose={() => setIsCreateModalOpen(false)}
          isPending={createExpense.isPending}
          money={money}
        />
      )}

      {/* Edit Modal */}
      {editExpense && (
        <ExpenseFormModal
          mode="edit"
          expense={editExpense}
          onSubmit={handleUpdateExpense}
          onClose={() => setEditExpense(null)}
          isPending={updateExpense.isPending}
          money={money}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <DeleteConfirmModal
          invoiceNo={deleteConfirm.title}
          label="expense"
          isPending={deleteExpense.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
