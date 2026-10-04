import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type DashboardQueryParams = {
  chartDays?: number;
  topLimit?: number;
};

export type DashboardSummary = {
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  todayProfitMargin: number;

  monthlySales: number;
  monthlyProfit: number;
  monthlyOrders: number;
  monthlyProfitMargin: number;

  totalCredit: number;
  customersWithCredit: number;

  lowStockCount: number;
  outOfStockCount: number;
};

export type DashboardDailyRevenue = {
  dateKey: string;
  name: string;
  sales: number;
  profit: number;
  count: number;
};

export type DashboardTopCustomer = {
  id: number;
  name: string;
  phone?: string;
  credit: number;
  orders: number;
  totalSpent: number;
  totalProfit: number;
};

export type DashboardTopProduct = {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  revenue: number;
};

export type DashboardRecentSale = {
  id: number;
  invoice_no: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string;
  grand_total: number;
  profit_amount: number;
  payment_status: "Paid" | "Unpaid" | "Partial";
  sale_status: "Completed" | "Cancelled" | "Returned";
  created_at: string;
};

export type DashboardLowStockItem = {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string;
  current_stock: number;
  reorder_level: number;
  reorder_quantity: number;
};

export type DashboardLowStockBatch = {
  id: number;
  product_id: number;
  product_name: string;
  sku?: string;
  batch_number: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
  reorder_level: number;
  reorder_quantity: number;
  created_at: string;
  updated_at: string;
};

export type DashboardPaymentMethodToday = {
  id: number;
  name: string;
  type: string;
  amount: number;
  count: number;
};

export type DashboardExpensesToday = {
  id: number;
  category: string;
  title: string;
  amount: number;
  payment_method: string;
};

export type DashboardOverviewResponse = {
  success: boolean;
  data: {
    summary: DashboardSummary;
    dailyRevenue: DashboardDailyRevenue[];
    topCustomers: DashboardTopCustomer[];
    topProducts: DashboardTopProduct[];
    recentSales: DashboardRecentSale[];
    lowStockItems: DashboardLowStockItem[];
    lowStockBatches: DashboardLowStockBatch[];
    paymentMethodsToday: DashboardPaymentMethodToday[];
    expensesToday: DashboardExpensesToday[];
  };
};

export const dashboardQueryKey = (params: DashboardQueryParams = {}) =>
  ["dashboard", "overview", params] as const;

const fetchDashboardOverview = async (
  params: DashboardQueryParams = {},
): Promise<DashboardOverviewResponse> => {
  try {
    const res = await axiosInstance.get<DashboardOverviewResponse>(
      "/dashboard/overview",
      {
        params: {
          chartDays: params.chartDays ?? 7,
          topLimit: params.topLimit ?? 5,
        },
      },
    );

    return res.data;
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      "Failed to fetch dashboard overview";

    throw new Error(message);
  }
};

export const useDashboardOverview = (
  params: DashboardQueryParams = {
    chartDays: 7,
    topLimit: 5,
  },
) => {
  return useQuery<
    DashboardOverviewResponse,
    Error,
    DashboardOverviewResponse,
    ReturnType<typeof dashboardQueryKey>
  >({
    queryKey: dashboardQueryKey(params),
    queryFn: () => fetchDashboardOverview(params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
};
