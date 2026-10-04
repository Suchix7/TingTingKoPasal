import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "./useInventory";

export type ABCClassification = "A" | "B" | "C";

export type ABCSortField =
  | "rank"
  | "final_score"
  | "revenue"
  | "profit"
  | "sales_frequency"
  | "inventory_turnover"
  | "units_sold"
  | "current_stock"
  | "product_name";

export type ABCSortOrder = "asc" | "desc";

export type ABCProduct = {
  product_id: number;
  product_name: string;
  sku: string;
  category_id: number;

  cost_price: number;
  sale_price: number;

  current_stock: number;
  reorder_level: number;

  units_sold: number;
  revenue: number;
  profit: number;
  sales_frequency: number;

  stock_in: number;
  stock_out: number;
  stock_adjustment: number;

  calculated_beginning_stock: number;
  beginning_stock: number;
  average_inventory: number;
  inventory_turnover: number;

  scores: {
    revenue: number;
    profit: number;
    frequency: number;
    turnover: number;
  };

  final_score: number;
  rank: number;
  cumulative_percentage: number;

  classification: ABCClassification;

  recommendation: string;

  alerts: {
    type: string;
    message: string;
  }[];
};

export type ABCResponse = {
  success: boolean;

  data: ABCProduct[];

  stats: {
    totalProducts: number;

    classAProducts: number;
    classBProducts: number;
    classCProducts: number;

    totalRevenue: number;
    totalProfit: number;
    totalUnitsSold: number;

    averageInventoryTurnover: number;
  };

  configuration: {
    periodDays: number;

    weights: {
      revenue: number;
      profit: number;
      frequency: number;
      turnover: number;
    };

    thresholds: {
      A: string;
      B: string;
      C: string;
    };
  };

  totalCount: number;
  totalPages: number;
  page: number;
  limit: number;
};

export type ABCQueryParams = {
  page?: number;
  limit?: number;

  search?: string;

  classification?: ABCClassification | "ALL";

  sortField?: ABCSortField;
  sortOrder?: ABCSortOrder;

  periodDays?: number;

  revenueWeight?: number;
  profitWeight?: number;
  frequencyWeight?: number;
  turnoverWeight?: number;
};

/*
|--------------------------------------------------------------------------
| Query Key
|--------------------------------------------------------------------------
*/

export const abcQueryKey = ({
  page = 1,
  limit = 10,
  search = "",
  classification = "ALL",
  sortField = "final_score",
  sortOrder = "desc",
  periodDays = 365,
  revenueWeight = 30,
  profitWeight = 30,
  frequencyWeight = 20,
  turnoverWeight = 20,
}: ABCQueryParams = {}) =>
  [
    "abc-classification",
    {
      page,
      limit,
      search,
      classification,
      sortField,
      sortOrder,
      periodDays,
      revenueWeight,
      profitWeight,
      frequencyWeight,
      turnoverWeight,
    },
  ] as const;

/*
|--------------------------------------------------------------------------
| Fetch ABC Classification
|--------------------------------------------------------------------------
*/

const fetchABCClassification = async ({
  page = 1,
  limit = 10,
  search = "",
  classification = "ALL",
  sortField = "final_score",
  sortOrder = "desc",
  periodDays = 365,
  revenueWeight = 30,
  profitWeight = 30,
  frequencyWeight = 20,
  turnoverWeight = 20,
}: ABCQueryParams = {}): Promise<ABCResponse> => {
  try {
    const res = await axiosInstance.get<ABCResponse>("/abc", {
      params: {
        page,
        limit,
        search,

        // Don't send ALL because the backend only needs A/B/C.
        classification: classification === "ALL" ? undefined : classification,

        sortField,
        sortOrder,

        periodDays,

        revenueWeight,
        profitWeight,
        frequencyWeight,
        turnoverWeight,
      },
    });

    return res.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Failed to fetch ABC classification"),
    );
  }
};

/*
|--------------------------------------------------------------------------
| ABC Classification Hook
|--------------------------------------------------------------------------
*/

export const useABCClassification = ({
  page = 1,
  limit = 10,
  search = "",
  classification = "ALL",
  sortField = "final_score",
  sortOrder = "desc",
  periodDays = 365,
  revenueWeight = 30,
  profitWeight = 30,
  frequencyWeight = 20,
  turnoverWeight = 20,
}: ABCQueryParams = {}) => {
  return useQuery<ABCResponse>({
    queryKey: abcQueryKey({
      page,
      limit,
      search,
      classification,
      sortField,
      sortOrder,
      periodDays,
      revenueWeight,
      profitWeight,
      frequencyWeight,
      turnoverWeight,
    }),

    queryFn: () =>
      fetchABCClassification({
        page,
        limit,
        search,
        classification,
        sortField,
        sortOrder,
        periodDays,
        revenueWeight,
        profitWeight,
        frequencyWeight,
        turnoverWeight,
      }),

    placeholderData: keepPreviousData,

    enabled: page > 0 && limit > 0,
  });
};
