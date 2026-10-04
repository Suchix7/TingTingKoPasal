"use client";

import { useState, type ReactNode } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

import {
  AlertTriangle,
  CreditCard,
  Package,
  ShoppingCart,
  Users,
  ReceiptText,
  TrendingDown,
  PackageSearch,
  Lightbulb,
  BarChart3,
  LayoutDashboard,
  Layers,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { pieColors } from "@/components/dashboard/body";

import {
  useAnalyticsOverview,
  type AnalyticsPreset,
} from "@/hooks/useAnalytics";

import { useFPGrowthAnalysis } from "@/hooks/useFPGrowth";
import {
  useABCClassification,
  type ABCClassification,
  type ABCSortField,
  type ABCSortOrder,
} from "@/hooks/useABC";
import {
  useSingleABCClassification,
  type SingleABCProduct,
  type SingleABCSortField,
  type SingleABCSortOrder,
  type ABCClassification as SingleABCClassificationType,
} from "@/hooks/useSingleABC";
import {
  AnalyticsHeader,
  ChartCard,
  ListCard,
  MiniStat,
  Badge,
  EmptyState,
} from "../analytics/subcomponents";

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

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getFirstDayOfMonth = () => {
  const date = new Date();
  date.setDate(1);
  return toDateInputValue(date);
};

const getToday = () => toDateInputValue(new Date());

const presetLabels: Record<AnalyticsPreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last_7_days: "Last 7 Days",
  last_30_days: "Last 30 Days",
  this_month: "This Month",
  last_month: "Last Month",
  this_year: "This Year",
  all: "All Time",
  custom: "Custom",
};

const classificationLabels: Record<ABCClassification, string> = {
  A: "Class A - High Value",
  B: "Class B - Medium Value",
  C: "Class C - Low Value",
};

const classificationColors: Record<ABCClassification, string> = {
  A: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  B: "bg-amber-100 text-amber-700 ring-amber-200",
  C: "bg-red-100 text-red-700 ring-red-200",
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

type TabType =
  | "overview"
  | "bundle-analysis"
  | "abc-classification"
  | "single-abc-classification";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [preset, setPreset] = useState<AnalyticsPreset>("all");
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [minSupport, setMinSupport] = useState(0.05);

  // ABC Classification state
  const [abcPage, setAbcPage] = useState(1);
  const [abcLimit, setAbcLimit] = useState(10);
  const [abcSearch, setAbcSearch] = useState("");
  const [abcClassification, setAbcClassification] = useState<
    ABCClassification | "ALL"
  >("ALL");
  const [abcSortField, setAbcSortField] = useState<ABCSortField>("final_score");
  const [abcSortOrder, setAbcSortOrder] = useState<ABCSortOrder>("desc");
  const [abcPeriodDays, setAbcPeriodDays] = useState(365);
  const [abcRevenueWeight, setAbcRevenueWeight] = useState(30);
  const [abcProfitWeight, setAbcProfitWeight] = useState(30);
  const [abcFrequencyWeight, setAbcFrequencyWeight] = useState(20);
  const [abcTurnoverWeight, setAbcTurnoverWeight] = useState(20);
  const [showAbcConfig, setShowAbcConfig] = useState(false);

  // Single ABC Classification state
  const [singleAbcPage, setSingleAbcPage] = useState(1);
  const [singleAbcLimit, setSingleAbcLimit] = useState(10);
  const [singleAbcSearch, setSingleAbcSearch] = useState("");
  const [singleAbcClassification, setSingleAbcClassification] = useState<
    SingleABCClassificationType | "ALL"
  >("ALL");
  const [singleAbcSortField, setSingleAbcSortField] =
    useState<SingleABCSortField>("revenue");
  const [singleAbcSortOrder, setSingleAbcSortOrder] =
    useState<SingleABCSortOrder>("desc");
  const [singleAbcPeriodDays, setSingleAbcPeriodDays] = useState(365);

  const isCustom = preset === "custom";

  const {
    data: analyticsData,
    isLoading,
    isError,
    error,
  } = useAnalyticsOverview({
    preset,
    startDate: isCustom ? startDate : undefined,
    endDate: isCustom ? endDate : undefined,
    topLimit: 5,
    recentLimit: 8,
    chartMonths: 6,
  });

  const { data: fpGrowthData, isLoading: fpGrowthLoading } =
    useFPGrowthAnalysis({
      minSupport,
    });

  const { data: abcData, isLoading: abcLoading } = useABCClassification({
    page: abcPage,
    limit: abcLimit,
    search: abcSearch,
    classification: abcClassification,
    sortField: abcSortField,
    sortOrder: abcSortOrder,
    periodDays: abcPeriodDays,
    revenueWeight: abcRevenueWeight,
    profitWeight: abcProfitWeight,
    frequencyWeight: abcFrequencyWeight,
    turnoverWeight: abcTurnoverWeight,
  });

  const { data: singleAbcData, isLoading: singleAbcLoading } =
    useSingleABCClassification({
      page: singleAbcPage,
      limit: singleAbcLimit,
      search: singleAbcSearch,
      classification: singleAbcClassification,
      sortField: singleAbcSortField,
      sortOrder: singleAbcSortOrder,
      periodDays: singleAbcPeriodDays,
    });

  const summary = analyticsData?.data.summary;

  const salesByDay = analyticsData?.data.salesByDay ?? [];
  const salesByMonth = analyticsData?.data.salesByMonth ?? [];
  const paymentMethods = analyticsData?.data.paymentMethods ?? [];
  const topProducts = analyticsData?.data.topProducts ?? [];
  const lowPerformingProducts = analyticsData?.data.lowPerformingProducts ?? [];
  const topCustomers = analyticsData?.data.topCustomers ?? [];
  const lowStockItems = analyticsData?.data.lowStockItems ?? [];
  const recentSales = analyticsData?.data.recentSales ?? [];

  const fpGrowthResult = fpGrowthData?.data;

  const abcResult = abcData;
  const abcProducts = abcResult?.data ?? [];
  const abcStats = abcResult?.stats;
  const abcConfig = abcResult?.configuration;
  const abcTotalPages = abcResult?.totalPages ?? 1;

  const singleAbcResult = singleAbcData;
  const singleAbcProducts = singleAbcResult?.data ?? [];
  const singleAbcStats = singleAbcResult?.stats;
  const singleAbcConfig = singleAbcResult?.configuration;
  const singleAbcTotalPages = singleAbcResult?.totalPages ?? 1;

  const pieData = paymentMethods
    .filter((item) => Number(item.totalAmount || 0) > 0)
    .map((item) => ({
      name: item.name,
      value: Number(item.totalAmount || 0),
    }));

  const totalPaymentAmount = pieData.reduce(
    (sum, item) => sum + Number(item.value || 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />

          <p className="mt-4 text-sm font-medium text-neutral-500">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md rounded-md bg-white p-6 text-center shadow-sm ring-1 ring-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900">
            Failed to load analytics
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            {error?.message || "Something went wrong while fetching analytics."}
          </p>
        </div>
      </div>
    );
  }

  const renderOverviewTab = () => (
    <>
      <AnalyticsHeader
        preset={preset}
        setPreset={setPreset}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
      />

      <section className="mt-4">
        <ChartCard
          title="Selected Range Daily Sales"
          action={<Badge label={presetLabels[preset]} />}
        >
          <ResponsiveContainer width="100%" height={285}>
            <LineChart data={salesByDay}>
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
              <Legend />

              <Line
                type="monotone"
                dataKey="sales"
                name="Sales"
                stroke="#111827"
                strokeWidth={2.5}
                dot={{ fill: "#111827", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />

              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ fill: "#059669", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">
        <MiniStat
          label="Selected Range Sales"
          value={money(summary?.rangeSales || 0)}
        />

        <MiniStat
          label="Selected Range Profit"
          value={money(summary?.rangeProfit || 0)}
        />

        <MiniStat
          label="Total Expenses"
          value={money(summary?.totalExpenses || 0)}
        />

        <MiniStat
          label="Net Profit"
          value={money(summary?.netProfitAfterExpenses || 0)}
        />

        <MiniStat
          label="Low Stock"
          value={formatNumber(summary?.lowStockCount || 0)}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListCard
          title="Payment Methods"
          icon={<CreditCard className="h-4 w-4" />}
          actionLabel={presetLabels[preset]}
        >
          <div className="mb-4">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
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
              <EmptyState message="No payment data available" />
            )}
          </div>

          <div className="space-y-2">
            {paymentMethods.map((method, index) => {
              const percentage =
                totalPaymentAmount > 0
                  ? (
                      (Number(method.totalAmount || 0) / totalPaymentAmount) *
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
                      {money(method.totalAmount)}
                    </p>

                    <p className="text-xs text-neutral-400">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ListCard>

        <div className="flex flex-col gap-2">
          <ChartCard
            title="Monthly Performance"
            action={<Badge label={`Last ${salesByMonth.length || 6} months`} />}
          >
            <ResponsiveContainer width="100%" height={285}>
              <BarChart data={salesByMonth} barGap={8}>
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
                <Legend />

                <Bar
                  dataKey="sales"
                  name="Sales"
                  fill="#111827"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={38}
                />

                <Bar
                  dataKey="profit"
                  name="Profit"
                  fill="#059669"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ListCard
            title="Expense Summary"
            icon={<ReceiptText className="h-4 w-4" />}
            actionLabel={presetLabels[preset]}
          >
            <div className="space-y-3">
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-xs font-semibold text-neutral-400">
                  Total Expenses
                </p>

                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {money(summary?.totalExpenses || 0)}
                </p>

                <p className="mt-1 text-xs text-neutral-400">
                  {formatNumber(summary?.totalExpenseRecords || 0)} expense
                  records
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="text-xs font-semibold text-neutral-400">
                  Net Profit After Expenses
                </p>

                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {money(summary?.netProfitAfterExpenses || 0)}
                </p>

                <p className="mt-1 text-xs text-neutral-400">
                  Sales profit minus expenses
                </p>
              </div>
            </div>
          </ListCard>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat
          label="Selected Range Sales"
          value={money(summary?.rangeSales || 0)}
        />

        <MiniStat
          label="Selected Range Profit"
          value={money(summary?.rangeProfit || 0)}
        />

        <MiniStat
          label="Low Stock"
          value={formatNumber(summary?.lowStockCount || 0)}
        />

        <MiniStat
          label="Out of Stock"
          value={formatNumber(summary?.outOfStockCount || 0)}
        />
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
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

        <ListCard
          title="Top Customers"
          icon={<Users className="h-4 w-4" />}
          actionLabel={presetLabels[preset]}
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
              <EmptyState message="No customer data available" />
            )}
          </div>
        </ListCard>
      </section>
    </>
  );

  const renderBundleAnalysisTab = () => (
    <section className="mt-4">
      <div className="rounded-xl bg-white p-6 border border-gray-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PackageSearch className="h-5 w-5 text-neutral-700" />
              <h2 className="text-lg font-bold text-neutral-900">
                Product Bundle Analysis
              </h2>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              Find products that customers often buy together.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-500">
              Minimum Support:
            </label>
            <select
              value={minSupport}
              onChange={(e) => setMinSupport(Number(e.target.value))}
              className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
            >
              <option value={0.05}>5%</option>
              <option value={0.1}>10%</option>
              <option value={0.15}>15%</option>
              <option value={0.2}>20%</option>
              <option value={0.25}>25%</option>
              <option value={0.3}>30%</option>
            </select>
          </div>
        </div>

        {fpGrowthLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
              <p className="mt-3 text-sm font-medium text-neutral-500">
                Analyzing purchase patterns...
              </p>
            </div>
          </div>
        ) : fpGrowthResult ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-neutral-500">
                  <BarChart3 className="h-4 w-4" />
                  <p className="text-xs font-semibold">Total Transactions</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {formatNumber(fpGrowthResult.totalTransactions)}
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-neutral-500">
                  <ShoppingCart className="h-4 w-4" />
                  <p className="text-xs font-semibold">Minimum Sales Count</p>
                </div>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {formatNumber(fpGrowthResult.minSupportCount)}
                </p>
                <p className="mt-1 text-xs text-neutral-400">
                  ({fpGrowthResult.minSupport * 100}% support threshold)
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <div className="flex items-center justify-center gap-2 text-neutral-500">
                  <Lightbulb className="h-4 w-4" />
                  <p className="text-xs font-semibold">
                    Bundle Suggestions Found
                  </p>
                </div>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {formatNumber(fpGrowthResult.bundleSuggestions.length)}
                </p>
              </div>
            </div>

            {fpGrowthResult.bundleSuggestions.length > 0 ? (
              <div className="space-y-3">
                {fpGrowthResult.bundleSuggestions.map((bundle, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-neutral-100 bg-neutral-50 p-5 transition hover:border-neutral-200 hover:bg-white"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-neutral-900">
                          {bundle.products.join(" + ")}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                          <span className="inline-flex items-center gap-1">
                            <ShoppingCart className="h-3.5 w-3.5" />
                            Appeared in {formatNumber(bundle.supportCount)}{" "}
                            sales
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <BarChart3 className="h-3.5 w-3.5" />
                            Support: {bundle.supportPercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3">
                      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                      <p className="text-sm font-medium text-amber-800">
                        {bundle.suggestion}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-neutral-50">
                <div className="text-center">
                  <PackageSearch className="mx-auto h-10 w-10 text-neutral-300" />
                  <p className="mt-3 text-sm font-medium text-neutral-400">
                    No bundle suggestions found for the current support
                    threshold.
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    Try lowering the minimum support to discover more patterns.
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-neutral-50">
            <div className="text-center">
              <PackageSearch className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-3 text-sm font-medium text-neutral-400">
                Unable to load bundle analysis.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderABCClassificationTab = () => (
    <section className="mt-4">
      <div className="rounded-xl bg-white p-6 border border-gray-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-neutral-700" />
              <h2 className="text-lg font-bold text-neutral-900">
                Multi-Criteria ABC Classification
              </h2>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              Prioritize inventory based on multiple weighted criteria (Revenue,
              Profit, Frequency, Turnover).
            </p>
          </div>

          <button
            onClick={() => setShowAbcConfig(!showAbcConfig)}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition"
          >
            <Layers className="h-4 w-4" />
            {showAbcConfig ? "Hide Configuration" : "Configure Weights"}
          </button>
        </div>

        {showAbcConfig && (
          <div className="mb-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
            <h3 className="text-sm font-semibold text-neutral-700 mb-4">
              Classification Parameters
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Period (Days)
                </label>
                <select
                  value={abcPeriodDays}
                  onChange={(e) => setAbcPeriodDays(Number(e.target.value))}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                >
                  <option value={30}>30 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={180}>180 Days</option>
                  <option value={365}>1 Year</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Revenue Weight (%)
                </label>
                <input
                  type="number"
                  value={abcRevenueWeight}
                  onChange={(e) => setAbcRevenueWeight(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Profit Weight (%)
                </label>
                <input
                  type="number"
                  value={abcProfitWeight}
                  onChange={(e) => setAbcProfitWeight(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Frequency Weight (%)
                </label>
                <input
                  type="number"
                  value={abcFrequencyWeight}
                  onChange={(e) =>
                    setAbcFrequencyWeight(Number(e.target.value))
                  }
                  min={0}
                  max={100}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  Turnover Weight (%)
                </label>
                <input
                  type="number"
                  value={abcTurnoverWeight}
                  onChange={(e) => setAbcTurnoverWeight(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
            </div>
          </div>
        )}

        {abcLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
              <p className="mt-3 text-sm font-medium text-neutral-500">
                Loading ABC classification...
              </p>
            </div>
          </div>
        ) : abcStats ? (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-xs font-semibold text-emerald-600">
                  Class A Products
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {abcStats.classAProducts}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <p className="text-xs font-semibold text-amber-600">
                  Class B Products
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-900">
                  {abcStats.classBProducts}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-4 text-center">
                <p className="text-xs font-semibold text-red-600">
                  Class C Products
                </p>
                <p className="mt-2 text-2xl font-bold text-red-900">
                  {abcStats.classCProducts}
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">
                  Avg Turnover
                </p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {abcStats.averageInventoryTurnover.toFixed(1)}x
                </p>
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={abcSearch}
                  onChange={(e) => {
                    setAbcSearch(e.target.value);
                    setAbcPage(1);
                  }}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
                <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>

              <select
                value={abcClassification}
                onChange={(e) => {
                  setAbcClassification(
                    e.target.value as ABCClassification | "ALL",
                  );
                  setAbcPage(1);
                }}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              >
                <option value="ALL">All Classes</option>
                <option value="A">Class A</option>
                <option value="B">Class B</option>
                <option value="C">Class C</option>
              </select>

              <select
                value={`${abcSortField}-${abcSortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [
                    ABCSortField,
                    ABCSortOrder,
                  ];
                  setAbcSortField(field);
                  setAbcSortOrder(order);
                  setAbcPage(1);
                }}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              >
                <option value="final_score-desc">Highest Score</option>
                <option value="final_score-asc">Lowest Score</option>
                <option value="revenue-desc">Highest Revenue</option>
                <option value="revenue-asc">Lowest Revenue</option>
                <option value="profit-desc">Highest Profit</option>
                <option value="profit-asc">Lowest Profit</option>
                <option value="sales_frequency-desc">Most Frequent</option>
                <option value="inventory_turnover-desc">
                  Highest Turnover
                </option>
                <option value="product_name-asc">Name A-Z</option>
              </select>

              <select
                value={abcLimit}
                onChange={(e) => {
                  setAbcLimit(Number(e.target.value));
                  setAbcPage(1);
                }}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs text-neutral-400">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Score</th>
                    <th className="pb-3 text-right font-medium">Revenue</th>
                    <th className="pb-3 text-right font-medium">Profit</th>
                    <th className="pb-3 text-right font-medium">Frequency</th>
                    <th className="pb-3 text-right font-medium">Turnover</th>
                  </tr>
                </thead>

                <tbody>
                  {abcProducts.length > 0 ? (
                    abcProducts.map((product) => (
                      <tr
                        key={product.product_id}
                        className="border-b border-neutral-50 last:border-0"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                              <Package className="h-4 w-4 text-neutral-600" />
                            </div>
                            <div>
                              <p className="max-w-[200px] truncate text-sm font-semibold text-neutral-900">
                                {product.product_name}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                              classificationColors[product.classification]
                            }`}
                          >
                            {product.classification}
                          </span>
                        </td>

                        <td className="py-3 text-sm font-semibold text-neutral-900">
                          {product.final_score.toFixed(1)}
                        </td>

                        <td className="py-3 text-right text-sm text-neutral-700">
                          {money(product.revenue)}
                        </td>

                        <td className="py-3 text-right text-sm text-green-600 font-medium">
                          {money(product.profit)}
                        </td>

                        <td className="py-3 text-right text-sm text-neutral-700">
                          {formatNumber(product.sales_frequency)}
                        </td>

                        <td className="py-3 text-right text-sm text-neutral-700">
                          {product.inventory_turnover.toFixed(1)}x
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState message="No products found for the selected criteria" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {abcTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  Showing {(abcPage - 1) * abcLimit + 1} to{" "}
                  {Math.min(abcPage * abcLimit, abcResult?.totalCount || 0)} of{" "}
                  {formatNumber(abcResult?.totalCount || 0)} products
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAbcPage((p) => Math.max(1, p - 1))}
                    disabled={abcPage === 1}
                    className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-neutral-500">
                    Page {abcPage} of {abcTotalPages}
                  </span>

                  <button
                    onClick={() =>
                      setAbcPage((p) => Math.min(abcTotalPages, p + 1))
                    }
                    disabled={abcPage === abcTotalPages}
                    className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-neutral-50">
            <div className="text-center">
              <Layers className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-3 text-sm font-medium text-neutral-400">
                Unable to load ABC classification data.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const renderSingleABCClassificationTab = () => (
    <section className="mt-4">
      <div className="rounded-xl bg-white p-6 border border-gray-200">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-neutral-700" />
              <h2 className="text-lg font-bold text-neutral-900">
                Single-Criteria ABC Classification
              </h2>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              Classify products based on a single criterion (Revenue, Profit,
              Frequency, or Turnover).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-neutral-500">
              Period:
            </label>
            <select
              value={singleAbcPeriodDays}
              onChange={(e) => {
                setSingleAbcPeriodDays(Number(e.target.value));
                setSingleAbcPage(1);
              }}
              className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
              <option value={180}>180 Days</option>
              <option value={365}>1 Year</option>
            </select>
          </div>
        </div>

        {singleAbcLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
              <p className="mt-3 text-sm font-medium text-neutral-500">
                Loading single-criteria ABC classification...
              </p>
            </div>
          </div>
        ) : singleAbcStats ? (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <p className="text-xs font-semibold text-emerald-600">
                  Class A Products
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">
                  {singleAbcStats.classAProducts}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <p className="text-xs font-semibold text-amber-600">
                  Class B Products
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-900">
                  {singleAbcStats.classBProducts}
                </p>
              </div>

              <div className="rounded-xl bg-red-50 p-4 text-center">
                <p className="text-xs font-semibold text-red-600">
                  Class C Products
                </p>
                <p className="mt-2 text-2xl font-bold text-red-900">
                  {singleAbcStats.classCProducts}
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-4 text-center">
                <p className="text-xs font-semibold text-neutral-500">
                  Total Revenue
                </p>
                <p className="mt-2 text-2xl font-bold text-neutral-900">
                  {money(singleAbcStats.totalRevenue)}
                </p>
              </div>
            </div>

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={singleAbcSearch}
                  onChange={(e) => {
                    setSingleAbcSearch(e.target.value);
                    setSingleAbcPage(1);
                  }}
                  className="w-full h-10 rounded-md border border-neutral-200 bg-white pl-10 pr-4 text-sm text-neutral-900 outline-none focus:border-neutral-900"
                />
                <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>

              <select
                value={singleAbcClassification}
                onChange={(e) => {
                  setSingleAbcClassification(
                    e.target.value as SingleABCClassificationType | "ALL",
                  );
                  setSingleAbcPage(1);
                }}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              >
                <option value="ALL">All Classes</option>
                <option value="A">Class A</option>
                <option value="B">Class B</option>
                <option value="C">Class C</option>
              </select>

              <select
                value={`${singleAbcSortField}-${singleAbcSortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split("-") as [
                    SingleABCSortField,
                    SingleABCSortOrder,
                  ];
                  setSingleAbcSortField(field);
                  setSingleAbcSortOrder(order);
                  setSingleAbcPage(1);
                }}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              >
                <option value="revenue-desc">Highest Revenue</option>
                <option value="revenue-asc">Lowest Revenue</option>
                <option value="profit-desc">Highest Profit</option>
                <option value="profit-asc">Lowest Profit</option>
                <option value="sales_frequency-desc">Most Frequent</option>
                <option value="sales_frequency-asc">Least Frequent</option>
                <option value="inventory_turnover-desc">
                  Highest Turnover
                </option>
                <option value="inventory_turnover-asc">Lowest Turnover</option>
                <option value="product_name-asc">Name A-Z</option>
                <option value="product_name-desc">Name Z-A</option>
                <option value="rank-asc">Rank (Lowest)</option>
                <option value="rank-desc">Rank (Highest)</option>
              </select>

              <select
                value={singleAbcLimit}
                onChange={(e) => {
                  setSingleAbcLimit(Number(e.target.value));
                  setSingleAbcPage(1);
                }}
                className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-900"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead>
                  <tr className="border-b border-neutral-100 text-xs text-neutral-400">
                    <th className="pb-3 font-medium">Product</th>
                    <th className="pb-3 font-medium">Class</th>
                    <th className="pb-3 font-medium">Rank</th>
                    <th className="pb-3 text-right font-medium">Revenue</th>
                    <th className="pb-3 text-right font-medium">Revenue %</th>
                    <th className="pb-3 text-right font-medium">
                      Cumulative %
                    </th>
                    <th className="pb-3 text-right font-medium">Profit</th>
                    <th className="pb-3 text-right font-medium">Frequency</th>
                    <th className="pb-3 text-right font-medium">Turnover</th>
                  </tr>
                </thead>

                <tbody>
                  {singleAbcProducts.length > 0 ? (
                    singleAbcProducts.map((product) => (
                      <tr
                        key={product.product_id}
                        className="border-b border-neutral-50 last:border-0 hover:bg-neutral-50/50 transition"
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100">
                              <Package className="h-4 w-4 text-neutral-600" />
                            </div>
                            <div>
                              <p className="max-w-[200px] truncate text-sm font-semibold text-neutral-900">
                                {product.product_name}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${
                              classificationColors[product.classification]
                            }`}
                          >
                            {product.classification}
                          </span>
                          {/* {product.alerts && product.alerts.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {product.alerts.map((alert, idx) => (
                                <div key={idx} className="text-xs text-red-500">
                                  ⚠️ {alert.message}
                                </div>
                              ))}
                            </div>
                          )} */}
                        </td>

                        <td className="py-3 text-sm text-neutral-700">
                          #{formatNumber(product.rank)}
                        </td>

                        <td className="py-3 text-right text-sm font-medium text-neutral-900">
                          {money(product.revenue)}
                        </td>

                        <td className="py-3 text-right text-sm text-neutral-600">
                          {product.revenue_percentage.toFixed(1)}%
                        </td>

                        <td className="py-3 text-right text-sm text-neutral-600">
                          {product.cumulative_percentage.toFixed(1)}%
                        </td>

                        <td className="py-3 text-right text-sm text-green-600 font-medium">
                          {money(product.profit)}
                        </td>

                        <td className="py-3 text-right text-sm text-neutral-700">
                          {formatNumber(product.sales_frequency)}
                        </td>

                        <td className="py-3 text-right text-sm text-neutral-700">
                          {product.inventory_turnover.toFixed(1)}x
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9}>
                        <EmptyState message="No products found for the selected criteria" />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {singleAbcTotalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  Showing {(singleAbcPage - 1) * singleAbcLimit + 1} to{" "}
                  {Math.min(
                    singleAbcPage * singleAbcLimit,
                    singleAbcResult?.totalCount || 0,
                  )}{" "}
                  of {formatNumber(singleAbcResult?.totalCount || 0)} products
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSingleAbcPage((p) => Math.max(1, p - 1))}
                    disabled={singleAbcPage === 1}
                    className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-neutral-500">
                    Page {singleAbcPage} of {singleAbcTotalPages}
                  </span>

                  <button
                    onClick={() =>
                      setSingleAbcPage((p) =>
                        Math.min(singleAbcTotalPages, p + 1),
                      )
                    }
                    disabled={singleAbcPage === singleAbcTotalPages}
                    className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-neutral-50">
            <div className="text-center">
              <Filter className="mx-auto h-10 w-10 text-neutral-300" />
              <p className="mt-3 text-sm font-medium text-neutral-400">
                Unable to load single-criteria ABC classification data.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <main className="min-h-screen bg-neutral-50 p-4 text-neutral-950 md:p-6">
      <div className="mb-6 flex items-center gap-1 rounded-xl bg-white p-1 border border-neutral-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center cursor-pointer whitespace-nowrap gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "overview"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Overview
        </button>

        <button
          onClick={() => setActiveTab("bundle-analysis")}
          className={`flex items-center cursor-pointer whitespace-nowrap gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "bundle-analysis"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          <PackageSearch className="h-4 w-4" />
          Bundle Analysis
        </button>

        <button
          onClick={() => setActiveTab("abc-classification")}
          className={`flex items-center cursor-pointer whitespace-nowrap gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "abc-classification"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          <Layers className="h-4 w-4" />
          Multi-Criteria ABC
        </button>

        <button
          onClick={() => setActiveTab("single-abc-classification")}
          className={`flex items-center cursor-pointer whitespace-nowrap gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "single-abc-classification"
              ? "bg-neutral-900 text-white shadow-sm"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
          }`}
        >
          <Filter className="h-4 w-4" />
          Single-Criteria ABC
        </button>
      </div>

      <div className="animate-in fade-in duration-300">
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "bundle-analysis" && renderBundleAnalysisTab()}
        {activeTab === "abc-classification" && renderABCClassificationTab()}
        {activeTab === "single-abc-classification" &&
          renderSingleABCClassificationTab()}
      </div>
    </main>
  );
}
