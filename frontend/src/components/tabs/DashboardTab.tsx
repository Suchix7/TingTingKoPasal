"use client";

import { useState, useRef, useEffect } from "react";
import type { ReactNode } from "react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AlertTriangle,
  Award,
  Bell,
  CreditCard,
  DollarSign,
  Layers,
  LogOut,
  PackageX,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Users,
  X,
} from "lucide-react";

import {
  useDashboardOverview,
  type DashboardLowStockItem,
  type DashboardLowStockBatch,
} from "@/hooks/useDashboard";
import { useAuthStore } from "@/store/auth.store";

export const pieColors = [
  "#064E3B",
  "#047857",
  "#059669",
  "#10B981",
  "#14B8A6",
  "#0F766E",
  "#84CC16",
  "#65A30D",
];

const expensePieColors = [
  "#F59E0B",
  "#E11D48",
  "#EA580C",
  "#64748B",
  "#9333EA",
  "#0F766E",
  "#DC2626",
  "#A16207",
];

const money = (value: number) =>
  new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-NP").format(value || 0);

const formatDate = (date?: string) => {
  if (!date) return "Unknown";

  return new Date(date).toLocaleDateString("en-NP", {
    month: "short",
    day: "numeric",
  });
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-xl">
      <p className="mb-1 text-xs font-semibold text-neutral-500">{label}</p>

      <div className="space-y-1">
        {payload.map((item: any) => (
          <div
            key={item.dataKey || item.name}
            className="flex items-center gap-2 text-sm"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />

            <span className="text-neutral-500">{item.name}:</span>

            <span className="font-semibold text-neutral-900">
              {money(Number(item.value || 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DashboardTab({ setActiveTab }: { setActiveTab: any }) {
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
  } = useDashboardOverview({
    chartDays: 7,
    topLimit: 5,
  });

  const summary = dashboardData?.data.summary;

  const dailyRevenue = dashboardData?.data.dailyRevenue ?? [];
  const topCustomers = dashboardData?.data.topCustomers ?? [];
  const topProducts = dashboardData?.data.topProducts ?? [];
  const recentSales = dashboardData?.data.recentSales ?? [];
  const lowStockItems = dashboardData?.data.lowStockItems ?? [];
  const lowStockBatches = dashboardData?.data.lowStockBatches ?? [];
  const paymentMethodsToday = dashboardData?.data.paymentMethodsToday ?? [];
  const expensesToday = dashboardData?.data.expensesToday ?? [];

  // Get out of stock items (current_stock === 0)
  const outOfStockItems = lowStockItems.filter(
    (item) => Number(item.current_stock) <= 0,
  );

  // Get out of stock batches (quantity === 0)
  const outOfStockBatches = lowStockBatches.filter(
    (batch) => Number(batch.quantity) <= 0,
  );

  // Total out of stock count (items + batches)
  const totalOutOfStockCount =
    outOfStockItems.length + outOfStockBatches.length;

  const pieData = paymentMethodsToday
    .filter((item) => Number(item.amount || 0) > 0)
    .map((item) => ({
      name: item.name,
      value: Number(item.amount || 0),
    }));

  const expensesPieData = expensesToday
    .filter((item) => Number(item.amount || 0) > 0)
    .map((item) => ({
      name: item.category,
      value: Number(item.amount || 0),
    }));

  const totalPaymentAmount = pieData.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  const totalExpensesAmount = expensesPieData.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />

          <p className="mt-4 text-sm font-medium text-neutral-500">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-dvh items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-md bg-white p-6 text-center shadow-sm ring-1 ring-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">
            Failed to load dashboard
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            {error?.message ||
              "Something went wrong while fetching dashboard data."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-dvh bg-neutral-50 p-4 text-neutral-950 md:p-6">
      <div>
        <DashboardHeader
          outOfStockCount={totalOutOfStockCount}
          isNotificationOpen={isNotificationOpen}
          setIsNotificationOpen={setIsNotificationOpen}
          notificationRef={notificationRef}
          outOfStockItems={outOfStockItems}
          outOfStockBatches={outOfStockBatches}
          setActiveTab={setActiveTab}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Today Sales"
            value={money(summary?.todaySales || 0)}
            icon={<DollarSign className="h-4 w-4" />}
            description={`${formatNumber(summary?.todayOrders || 0)} orders today`}
          />

          <StatCard
            title="Today Profit"
            value={money(summary?.todayProfit || 0)}
            icon={<TrendingUp className="h-4 w-4" />}
            description={`${summary?.todayProfitMargin || 0}% profit margin`}
          />

          <StatCard
            title="Monthly Sales"
            value={money(summary?.monthlySales || 0)}
            icon={<ShoppingCart className="h-4 w-4" />}
            description={`${formatNumber(summary?.monthlyOrders || 0)} orders this month`}
          />

          <StatCard
            title="Monthly Profit"
            value={money(summary?.monthlyProfit || 0)}
            icon={<TrendingUp className="h-4 w-4" />}
            description={`${summary?.monthlyProfitMargin || 0}% profit margin`}
          />
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MiniStat
            label="Total Credit"
            value={money(summary?.totalCredit || 0)}
          />

          <MiniStat
            label="Customers With Credit"
            value={formatNumber(summary?.customersWithCredit || 0)}
          />

          <MiniStat
            label="Low Stock Items"
            value={formatNumber(summary?.lowStockCount || 0)}
          />

          <MiniStat
            label="Out of Stock Items"
            value={formatNumber(summary?.outOfStockCount || 0)}
          />
        </section>

        <section className="mt-4">
          <ChartCard
            title="Last 7 Days Revenue"
            action={<Badge label="Sales vs Profit" />}
          >
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={dailyRevenue}>
                <defs>
                  <linearGradient
                    id="salesGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#111827" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                  </linearGradient>

                  <linearGradient
                    id="profitGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#E5E7EB"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#A3A3A3" }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fontSize: 12, fill: "#A3A3A3" }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#111827"
                  fill="url(#salesGradient)"
                  strokeWidth={2}
                />

                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Profit"
                  stroke="#059669"
                  fill="url(#profitGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ListCard
            title="Today's Payment Methods"
            icon={<CreditCard className="h-4 w-4" />}
            actionLabel="Today"
          >
            <div className="mb-4">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      label={(entry: any) => {
                        if (!totalPaymentAmount) return "0%";

                        return `${(
                          (entry.value / totalPaymentAmount) *
                          100
                        ).toFixed(1)}%`;
                      }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={pieColors[index % pieColors.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No payment data for today" />
              )}
            </div>

            <div className="space-y-2">
              {paymentMethodsToday.map((method, index) => {
                const percentage =
                  totalPaymentAmount > 0
                    ? (
                        (Number(method.amount || 0) / totalPaymentAmount) *
                        100
                      ).toFixed(1)
                    : "0";

                return (
                  <div
                    key={method.id}
                    className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-neutral-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: pieColors[index % pieColors.length],
                        }}
                      />

                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {method.name}
                        </p>

                        <p className="text-xs text-neutral-400">
                          {method.type} • {method.count} transactions
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {money(method.amount)}
                      </p>

                      <p className="text-xs text-neutral-400">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ListCard>
          <ListCard
            title="Today's Expenses"
            icon={<ReceiptText className="h-4 w-4" />}
            actionLabel="Today"
          >
            <div className="mb-4">
              {expensesPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={expensesPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={54}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      label={(entry: any) => {
                        if (!totalExpensesAmount) return "0%";

                        return `${(
                          (entry.value / totalExpensesAmount) *
                          100
                        ).toFixed(1)}%`;
                      }}
                    >
                      {expensesPieData.map((entry, index) => (
                        <Cell
                          key={`expense-${entry.name}-${index}`}
                          fill={
                            expensePieColors[index % expensePieColors.length]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No expenses for today" />
              )}
            </div>

            <div className="space-y-2">
              {expensesToday.map((expense, index) => {
                const percentage =
                  totalExpensesAmount > 0
                    ? (
                        (Number(expense.amount || 0) / totalExpensesAmount) *
                        100
                      ).toFixed(1)
                    : "0";

                return (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-neutral-50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor:
                            expensePieColors[index % expensePieColors.length],
                        }}
                      />

                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {expense.category}: {expense.title}
                        </p>

                        <p className="text-xs text-neutral-400">
                          Paid via {expense.payment_method}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {money(expense.amount)}
                      </p>

                      <p className="text-xs text-neutral-400">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ListCard>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
          <ListCard
            title="Top Customers"
            icon={<Users className="h-4 w-4" />}
            actionLabel="This Month"
          >
            <div className="space-y-2">
              {topCustomers.length > 0 ? (
                topCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between rounded-xl px-2 py-3 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {customer.name || "Unknown Customer"}
                      </p>

                      <p className="text-xs text-neutral-400">
                        {formatNumber(customer.orders)} orders • Credit{" "}
                        {money(customer.credit)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {money(customer.totalSpent)}
                      </p>

                      <p className="text-xs font-medium text-emerald-600">
                        +{money(customer.totalProfit)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="No customer sales this month" />
              )}
            </div>
          </ListCard>
          <ListCard
            title="Top Selling Products"
            icon={<Award className="h-4 w-4" />}
            actionLabel="This Month"
          >
            <div className="space-y-2">
              {topProducts.length > 0 ? (
                topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-xl px-2 py-3 hover:bg-neutral-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {product.name || "Unknown Product"}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {formatNumber(product.quantity)} sold
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-bold text-neutral-900">
                      {money(product.revenue)}
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState message="No product sales this month" />
              )}
            </div>
          </ListCard>
          <ListCard
            title="Low Stock Items"
            icon={<AlertTriangle className="h-4 w-4" />}
            actionLabel={`${formatNumber(lowStockItems.length)} alerts`}
          >
            <div className="space-y-2">
              {lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {item.product_name}
                      </p>

                      <p className="text-xs text-neutral-400">
                        Reorder level: {formatNumber(item.reorder_level)}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-600 ring-1 ring-red-100">
                      {formatNumber(item.current_stock)} left
                    </span>
                  </div>
                ))
              ) : (
                <EmptyState message="All items are well stocked" />
              )}
            </div>
          </ListCard>

          <ListCard
            title="Recent Transactions"
            icon={<ShoppingCart className="h-4 w-4" />}
            actionLabel="Latest"
          >
            <div className="space-y-1">
              {recentSales.length > 0 ? (
                recentSales.slice(0, 8).map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between rounded-xl px-1 py-3 hover:bg-neutral-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">
                        {sale.invoice_no}
                      </p>

                      <p className="text-xs text-neutral-400">
                        {sale.customer_name || "Walk-in"} •{" "}
                        {formatDate(sale.created_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-neutral-900">
                        {money(Number(sale.grand_total || 0))}
                      </p>

                      <p className="text-xs font-medium text-emerald-600">
                        +{money(Number(sale.profit_amount || 0))}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="No recent transactions" />
              )}
            </div>
          </ListCard>
        </section>

        {/* Low Stock Batches Section */}
        {lowStockBatches.length > 0 && (
          <section className="mt-4">
            <ChartCard
              title="Low Stock Batches"
              action={
                <Badge
                  label={`${formatNumber(lowStockBatches.length)} batches`}
                />
              }
            >
              <div className="space-y-2">
                {lowStockBatches.slice(0, 10).map((batch) => (
                  <div
                    key={batch.id}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-4 py-3 hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex-shrink-0">
                        <Layers className="w-5 h-5 text-amber-500" />
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {batch.product_name}
                        </p>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-neutral-400">
                            Batch: {batch.batch_number}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-neutral-900">
                          {formatNumber(batch.quantity)} units
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          batch.quantity === 0
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {batch.quantity === 0 ? "Out of Stock" : "Low Stock"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </section>
        )}
      </div>
    </main>
  );
}

function DashboardHeader({
  outOfStockCount,
  isNotificationOpen,
  setIsNotificationOpen,
  notificationRef,
  outOfStockItems,
  outOfStockBatches,
  setActiveTab,
}: {
  outOfStockCount: number;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (value: boolean) => void;
  notificationRef: React.RefObject<HTMLDivElement | null>;
  outOfStockItems: DashboardLowStockItem[];
  outOfStockBatches: DashboardLowStockBatch[];
  setActiveTab: any;
}) {
  const today = new Date().toLocaleDateString("en-NP", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const { logout } = useAuthStore();

  return (
    <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-neutral-400">
          Quick overview of your shop performance
        </p>
      </div>

      <div className="flex items-center gap-4 text-xs font-bold text-black">
        <p>{today}</p>

        {/* Notification Bell */}
        <div className="relative" ref={notificationRef}>
          <button
            className="relative cursor-pointer p-2 rounded-full hover:bg-neutral-100 transition-colors"
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />

            {outOfStockCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {outOfStockCount > 9 ? "9+" : outOfStockCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-[28rem] max-h-[32rem] overflow-y-auto rounded-xl bg-white shadow-2xl ring-1 ring-neutral-200 z-50">
              <div className="sticky top-0 bg-white border-b border-neutral-200 p-4 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Stock Alerts
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {outOfStockCount} item{outOfStockCount !== 1 ? "s" : ""}{" "}
                    need{outOfStockCount === 1 ? "s" : ""} attention
                  </p>
                </div>
                <button
                  className="cursor-pointer p-1 rounded-full hover:bg-neutral-100 transition-colors"
                  onClick={() => setIsNotificationOpen(false)}
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4 text-neutral-400" />
                </button>
              </div>

              {outOfStockCount > 0 ? (
                <div className="p-3 space-y-4">
                  {/* Out of Stock Items Section */}
                  {outOfStockItems.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 px-1">
                        Products Out of Stock
                      </h4>
                      <div className="space-y-2">
                        {outOfStockItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-3 rounded-lg bg-red-50 p-3 border border-red-100"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <PackageX className="w-5 h-5 text-red-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-neutral-900 truncate">
                                {item.product_name}
                              </p>


                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-red-100 text-xs font-bold text-red-700">
                                  Out of Stock
                                </span>

                                <span
                                  onClick={() => setActiveTab("eoq")}
                                  className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                                >
                                  Check EOQ
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Out of Stock Batches Section */}
                  {outOfStockBatches.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-2 px-1">
                        Batches Out of Stock
                      </h4>
                      <div className="space-y-2">
                        {outOfStockBatches.map((batch) => (
                          <div
                            key={batch.id}
                            className="flex items-start gap-3 rounded-lg bg-orange-50 p-3 border border-orange-100"
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              <Layers className="w-5 h-5 text-orange-500" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-neutral-900 truncate">
                                {batch.product_name}
                              </p>

                              <p className="text-xs text-neutral-500 mt-0.5">
                                Batch: {batch.batch_number}
                              </p>

                              <div className="flex items-center gap-2 mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full bg-orange-100 text-xs font-bold text-orange-700">
                                  Batch Out of Stock
                                </span>

                                <span
                                  onClick={() => setActiveTab("eoq")}
                                  className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
                                >
                                  Check EOQ
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <PackageX className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-neutral-900">
                    All items in stock
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    No stock alerts at the moment
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          className="cursor-pointer p-2 rounded-full hover:bg-neutral-100 transition-colors"
          onClick={logout}
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  description: string;
}) {
  return (
    <div className="rounded-md bg-white p-6 border border-gray-200 transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-400">{title}</p>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          {icon}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-2xl font-bold tracking-tight text-neutral-900">
          {value}
        </p>

        <p className="mt-1 text-xs font-semibold text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md bg-white p-6 border border-gray-200">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        {action}
      </div>

      {children}
    </div>
  );
}

function ListCard({
  title,
  icon,
  actionLabel,
  children,
}: {
  title: string;
  icon?: ReactNode;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="h-full rounded-md bg-white p-6 border border-gray-200">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-neutral-500">{icon}</span>}

          <h2 className="text-base font-bold text-neutral-900">{title}</h2>
        </div>

        {actionLabel && <Badge label={actionLabel} />}
      </div>

      {children}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-5 text-center border border-gray-200">
      <p className="text-xl font-bold text-neutral-900">{value}</p>

      <p className="mt-1 text-xs font-medium text-neutral-400">{label}</p>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-500">
      {label}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-xl bg-neutral-50 text-center">
      <p className="text-sm font-medium text-neutral-400">{message}</p>
    </div>
  );
}
