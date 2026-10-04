"use client";

import { useState, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Receipt,
  ArrowDownCircle,
  Loader2,
  AlertCircle,
  Package,
  FileText,
  Banknote,
  RotateCcw,
  CheckCircle,
  XCircle,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle as ArrowDownIcon,
} from "lucide-react";
import toast from "react-hot-toast";

import { useDaybook, DaybookResponse } from "@/hooks/useDaybook";
import DaybookSalesTable from "@/components/daybook/SalesTable";
import DaybookExpensesTable from "@/components/daybook/ExpensesTable";
import DaybookExpenseCategories from "@/components/daybook/ExpenseCategories";
import DaybookSaleDetailsModal from "@/components/daybook/DetailsModal";
import DaybookPDFDownloadButton from "@/components/daybook/PDFDownloadButton";

const money = (value?: number | null) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const formatDisplayDate = (date: string): string => {
  return new Intl.DateTimeFormat("en-NP", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
};

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  color = "gray",
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  color?: "green" | "red" | "blue" | "gray" | "purple" | "orange";
}) {
  const colorClasses = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    gray: "bg-gray-100 text-gray-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
        </div>
        <div className={`rounded-xl p-3 ${colorClasses[color]}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color = "blue",
}: {
  value: number;
  max: number;
  color?: "blue" | "green" | "red" | "yellow";
}) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
  };

  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div
        className={`h-2 rounded-full transition-all ${colorClasses[color]}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function PaymentMethodBalanceCard({
  paymentMethod,
  openingBalance,
  totalIn,
  totalOut,
  closingBalance,
  paymentMethodType,
}: {
  paymentMethod: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  paymentMethodType: string;
}) {
  const getTypeColor = (type: string) => {
    const colors = {
      Cash: "bg-green-100 text-green-700 border-green-200",
      Digital: "bg-blue-100 text-blue-700 border-blue-200",
      Bank: "bg-purple-100 text-purple-700 border-purple-200",
    };
    return (
      colors[type as keyof typeof colors] ||
      "bg-gray-100 text-gray-700 border-gray-200"
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      Cash: <Wallet size={16} />,
      Digital: <Smartphone size={16} />,
      Bank: <Building size={16} />,
    };
    return icons[type as keyof typeof icons] || <Wallet size={16} />;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{paymentMethod}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${getTypeColor(paymentMethodType)}`}
            >
              {paymentMethodType}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Closing Balance</p>
          <p className="text-lg font-bold text-gray-900">
            {money(closingBalance)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Opening Balance</span>
          <span className="font-medium text-gray-700">
            {money(openingBalance)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total In</span>
          <span className="font-medium text-green-600">{money(totalIn)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Out</span>
          <span className="font-medium text-red-600">{money(totalOut)}</span>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Net Change</span>
            <span
              className={`font-bold ${totalIn - totalOut >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {money(totalIn - totalOut)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Icons for payment method types
function Smartphone(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  );
}

function Building(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <line x1="9" y1="22" x2="15" y2="22" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  );
}

export default function DaybookPage() {
  const today = formatDate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSaleId, setSelectedSaleId] = useState<number | undefined>();

  const { data, isLoading, isError, refetch } = useDaybook(selectedDate);

  const daybook = data;

  const navigateDay = (direction: "prev" | "next") => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(
      currentDate.getDate() + (direction === "next" ? 1 : -1),
    );
    setSelectedDate(formatDate(currentDate));
  };

  const isToday = selectedDate === today;

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const goToToday = () => {
    setSelectedDate(today);
  };

  // Calculate additional metrics
  const paymentCompletionRate = useMemo(() => {
    if (!daybook?.summary) return 0;
    const { total_sales_count, paid_sales_count } = daybook.summary;
    return total_sales_count > 0
      ? (paid_sales_count / total_sales_count) * 100
      : 0;
  }, [daybook]);

  const profitMargin = useMemo(() => {
    if (!daybook?.summary) return 0;
    const { total_sales_amount, net_profit } = daybook.summary;
    return total_sales_amount > 0 ? (net_profit / total_sales_amount) * 100 : 0;
  }, [daybook]);

  // Calculate total balances for all payment methods
  const totalOpeningBalance = useMemo(() => {
    if (!daybook?.paymentMethodBalances) return 0;
    return daybook.paymentMethodBalances.reduce(
      (sum, pm) => sum + pm.opening_balance,
      0,
    );
  }, [daybook]);

  const totalClosingBalance = useMemo(() => {
    if (!daybook?.paymentMethodBalances) return 0;
    return daybook.paymentMethodBalances.reduce(
      (sum, pm) => sum + pm.closing_balance,
      0,
    );
  }, [daybook]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Date Navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daybook</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daily summary of sales, expenses, and payments
          </p>
        </div>

        <div className="flex items-center gap-3">
          {daybook && !isLoading && <DaybookPDFDownloadButton data={daybook} />}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-1">
            <button
              onClick={() => navigateDay("prev")}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              title="Previous day"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="relative">
              <Calendar
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                max={today}
                className="w-[180px] rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm font-medium outline-none transition focus:border-blue-400"
              />
            </div>

            <button
              onClick={() => navigateDay("next")}
              disabled={isToday}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next day"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isToday && (
            <button
              onClick={goToToday}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
            >
              <RotateCcw size={16} />
              Today
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2
              className="mx-auto mb-3 animate-spin text-gray-400"
              size={32}
            />
            <p className="text-sm text-gray-500">
              Loading daybook for {formatDisplayDate(selectedDate)}...
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 text-red-400" size={32} />
          <p className="text-sm font-medium text-red-700">
            Failed to load daybook
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 underline"
          >
            Try again
          </button>
        </div>
      )}

      {daybook && !isLoading && (
        <>
          {/* Date Display */}
          <div className="rounded-2xl border border-gray-200 bg-linear-to-r from-gray-900 to-gray-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {formatDisplayDate(daybook.date)}
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Daily financial report
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Net Cash Flow</p>
                <p
                  className={`text-2xl font-bold ${
                    daybook.summary.net_cash_flow >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {money(daybook.summary.net_cash_flow)}
                </p>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Sales"
              value={money(daybook.summary.total_sales_amount)}
              icon={ShoppingCart}
              subtitle={`${daybook.summary.total_sales_count} transactions`}
              color="blue"
              trend="up"
            />
            <StatCard
              title="Gross Profit"
              value={money(daybook.summary.gross_profit)}
              icon={TrendingUp}
              subtitle={`${profitMargin.toFixed(1)}% margin`}
              color="green"
              trend="up"
            />
            <StatCard
              title="Total Expenses"
              value={money(daybook.summary.total_expense_amount)}
              icon={ArrowDownCircle}
              subtitle={`${daybook.summary.total_expense_count} expenses`}
              color="red"
              trend="down"
            />
            <StatCard
              title="Net Profit"
              value={money(daybook.summary.net_profit)}
              icon={DollarSign}
              subtitle="After expenses"
              color="purple"
              trend={daybook.summary.net_profit >= 0 ? "up" : "down"}
            />
          </div>

          {/* Sales Table */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-5 py-4">
              <h3 className="font-bold text-gray-900">
                Sales ({daybook.sales.length})
              </h3>
            </div>
            <DaybookSalesTable
              sales={daybook.sales}
              salePayments={daybook.salePayments}
              onViewSale={(saleId) => setSelectedSaleId(saleId)}
              money={money}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <StatCard
              title="Total Received"
              value={money(daybook.summary.total_received)}
              icon={Banknote}
              subtitle={`Paid: ${money(daybook.summary.total_paid_amount)}`}
              color="green"
            />
            <StatCard
              title="Remaining"
              value={money(daybook.summary.total_remaining_amount)}
              icon={FileText}
              subtitle={`Change: ${money(daybook.summary.total_change_amount)}`}
              color="orange"
            />
            <StatCard
              title="Cost of Goods"
              value={money(daybook.summary.total_cost_of_goods)}
              icon={Package}
              subtitle="Inventory cost"
              color="gray"
            />
          </div>

          {/* Payment Method Balances Section */}
          {daybook.paymentMethodBalances &&
            daybook.paymentMethodBalances.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Wallet size={20} className="text-gray-600" />
                        Payment Method Balances
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Opening and closing balances for each payment method
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Balance</p>
                      <p className="text-sm font-bold text-gray-900">
                        {money(totalClosingBalance)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {daybook.paymentMethodBalances.map((pm) => (
                      <PaymentMethodBalanceCard
                        key={pm.payment_method_id}
                        paymentMethod={pm.payment_method}
                        paymentMethodType={pm.payment_method_type}
                        openingBalance={pm.opening_balance}
                        totalIn={pm.total_in}
                        totalOut={pm.total_out}
                        closingBalance={pm.closing_balance}
                      />
                    ))}
                  </div>
                  {/* Summary row */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-xs text-gray-500">Total Opening</p>
                        <p className="text-sm font-semibold text-gray-700">
                          {money(totalOpeningBalance)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total In</p>
                        <p className="text-sm font-semibold text-green-600">
                          {money(
                            daybook.paymentMethodBalances.reduce(
                              (sum, pm) => sum + pm.total_in,
                              0,
                            ),
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Out</p>
                        <p className="text-sm font-semibold text-red-600">
                          {money(
                            daybook.paymentMethodBalances.reduce(
                              (sum, pm) => sum + pm.total_out,
                              0,
                            ),
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Total Closing</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {money(totalClosingBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Sales Breakdown */}
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {/* Payment Status Distribution */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-bold text-gray-900 mb-4">Payment Status</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Paid</span>
                    <span className="font-medium text-green-700">
                      {daybook.summary.paid_sales_count}
                    </span>
                  </div>
                  <ProgressBar
                    value={daybook.summary.paid_sales_count}
                    max={daybook.summary.total_sales_count}
                    color="green"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Partial</span>
                    <span className="font-medium text-yellow-700">
                      {daybook.summary.partial_sales_count}
                    </span>
                  </div>
                  <ProgressBar
                    value={daybook.summary.partial_sales_count}
                    max={daybook.summary.total_sales_count}
                    color="yellow"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Unpaid</span>
                    <span className="font-medium text-red-700">
                      {daybook.summary.unpaid_sales_count}
                    </span>
                  </div>
                  <ProgressBar
                    value={daybook.summary.unpaid_sales_count}
                    max={daybook.summary.total_sales_count}
                    color="red"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Refunded</span>
                    <span className="font-medium text-blue-700">
                      {daybook.summary.refunded_sales_count}
                    </span>
                  </div>
                  <ProgressBar
                    value={daybook.summary.refunded_sales_count}
                    max={daybook.summary.total_sales_count}
                    color="blue"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Cancelled</span>
                    <span className="font-medium text-red-700">
                      {daybook.summary.cancel_sales_count}
                    </span>
                  </div>
                  <ProgressBar
                    value={daybook.summary.cancel_sales_count}
                    max={daybook.summary.total_sales_count}
                    color="red"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      Completion Rate
                    </span>
                    <span className="font-bold text-green-700">
                      {paymentCompletionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sale Status Distribution */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="font-bold text-gray-900 mb-4">Sale Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <CheckCircle
                    className="mx-auto mb-2 text-green-600"
                    size={24}
                  />
                  <p className="text-2xl font-bold text-green-700">
                    {daybook.summary.completed_sales_count}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Completed</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <XCircle className="mx-auto mb-2 text-red-600" size={24} />
                  <p className="text-2xl font-bold text-red-700">
                    {daybook.summary.cancelled_sales_count}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Cancelled</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <RotateCcw
                    className="mx-auto mb-2 text-purple-600"
                    size={24}
                  />
                  <p className="text-2xl font-bold text-purple-700">
                    {daybook.summary.returned_sales_count}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Returned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expense Categories */}
          {daybook.summaries.expenseCategorySummary.length > 0 && (
            <DaybookExpenseCategories
              categories={daybook.summaries.expenseCategorySummary}
              totalExpenseAmount={daybook.summary.total_expense_amount}
              money={money}
            />
          )}

          {/* Expenses Table */}
          {daybook.expenses.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-5 py-4">
                <h3 className="font-bold text-gray-900">
                  Expenses ({daybook.expenses.length})
                </h3>
              </div>
              <DaybookExpensesTable expenses={daybook.expenses} money={money} />
            </div>
          )}

          {/* Empty State for No Data */}
          {daybook.sales.length === 0 && daybook.expenses.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
              <Receipt className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="text-lg font-medium text-gray-500">
                No transactions for this day
              </p>
              <p className="mt-1 text-sm text-gray-400">
                There are no sales or expenses recorded on{" "}
                {formatDisplayDate(selectedDate)}
              </p>
            </div>
          )}
        </>
      )}

      {/* Sale Details Modal */}
      {selectedSaleId && (
        <DaybookSaleDetailsModal
          saleId={selectedSaleId}
          date={selectedDate}
          onClose={() => setSelectedSaleId(undefined)}
          money={money}
        />
      )}
    </div>
  );
}
