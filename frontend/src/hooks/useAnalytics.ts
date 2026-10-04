import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type AnalyticsPreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_year"
  | "all"
  | "custom";

export type AnalyticsQueryParams = {
  preset?: AnalyticsPreset;
  startDate?: string;
  endDate?: string;
  topLimit?: number;
  recentLimit?: number;
  chartMonths?: number;
};

export type AnalyticsSummary = {
  rangeSales: number;
  rangeProfit: number;
  rangeOrders: number;
  rangePaid: number;
  rangeRemaining: number;
  rangeProfitMargin: number;

  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  todayProfitMargin: number;

  monthlySales: number;
  monthlyProfit: number;
  monthlyOrders: number;
  monthlyProfitMargin: number;

  totalProducts: number;
  totalCustomers: number;
  totalCategories: number;
  totalCredit: number;

  stockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalExpenses: number;
  totalExpenseRecords: number;
  netProfitAfterExpenses: number;
};

export type SalesChartItem = {
  name: string;
  sales: number;
  profit: number;
  count: number;
};

export type SalesByMonthItem = {
  monthKey: string;
  name: string;
  sales: number;
  profit: number;
  count: number;
};

export type AnalyticsPaymentMethod = {
  id: number;
  name: string;
  type: string;
  totalAmount: number;
  count: number;
};

export type AnalyticsTopProduct = {
  id: number;
  name: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  revenue: number;
  profit: number;
  orders: number;
};

export type AnalyticsLowPerformingProduct = {
  id: number;
  name: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
  revenue: number;
  profit: number;
  orders: number;
};

export type AnalyticsTopCustomer = {
  id: number;
  name: string;
  phone?: string;
  credit: number;
  orders: number;
  totalSpent: number;
  totalProfit: number;
};

export type AnalyticsLowStockItem = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  shortage: number;
};

export type AnalyticsRecentSale = {
  id: number;
  invoice_no: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string;
  grand_total: number;
  profit_amount: number;
  paid_amount: number;
  remaining_amount: number;
  change_amount: number;
  payment_status: "Paid" | "Unpaid" | "Partial";
  sale_status: "Completed" | "Cancelled" | "Returned";
  created_at: string;
};

export type AnalyticsOverviewResponse = {
  success: boolean;
  filter: {
    preset: AnalyticsPreset;
    startDate: string | null;
    endDate: string | null;
  };
  data: {
    summary: AnalyticsSummary;
    salesByDay: SalesChartItem[];
    salesByMonth: SalesByMonthItem[];
    paymentMethods: AnalyticsPaymentMethod[];
    topProducts: AnalyticsTopProduct[];
    lowPerformingProducts: AnalyticsLowPerformingProduct[];
    topCustomers: AnalyticsTopCustomer[];
    lowStockItems: AnalyticsLowStockItem[];
    recentSales: AnalyticsRecentSale[];
  };
};

export const analyticsQueryKey = (params: AnalyticsQueryParams = {}) =>
  ["analytics", "overview", params] as const;

const fetchAnalyticsOverview = async (
  params: AnalyticsQueryParams = {},
): Promise<AnalyticsOverviewResponse> => {
  try {
    const res = await axiosInstance.get<AnalyticsOverviewResponse>(
      "/analytics/overview",
      {
        params: {
          preset: params.preset ?? "this_month",
          startDate: params.startDate,
          endDate: params.endDate,
          topLimit: params.topLimit ?? 5,
          recentLimit: params.recentLimit ?? 8,
          chartMonths: params.chartMonths ?? 6,
        },
      },
    );

    return res.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch analytics overview";

    throw new Error(message);
  }
};

export const useAnalyticsOverview = (
  params: AnalyticsQueryParams = {
    preset: "this_month",
    topLimit: 5,
    recentLimit: 8,
    chartMonths: 6,
  },
) => {
  return useQuery<
    AnalyticsOverviewResponse,
    Error,
    AnalyticsOverviewResponse,
    ReturnType<typeof analyticsQueryKey>
  >({
    queryKey: analyticsQueryKey(params),
    queryFn: () => fetchAnalyticsOverview(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
};
