import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import { getErrorMessage } from "./useInventory";

export type ABCClassification = "A" | "B" | "C";

export type SingleABCSortField =
  | "rank"
  | "revenue"
  | "revenue_percentage"
  | "cumulative_percentage"
  | "profit"
  | "sales_frequency"
  | "inventory_turnover"
  | "units_sold"
  | "current_stock"
  | "product_name";

export type SingleABCSortOrder = "asc" | "desc";

export type SingleABCProduct = {
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

  revenue_percentage: number;
  cumulative_percentage: number;

  rank: number;

  classification: ABCClassification;

  recommendation: string;

  alerts: {
    type: string;
    message: string;
  }[];
};

export type SingleABCResponse = {
  success: boolean;

  data: SingleABCProduct[];

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

    criterion: string;

    classificationMethod: string;

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

export type SingleABCQueryParams = {
  page?: number;
  limit?: number;

  search?: string;

  classification?: ABCClassification | "ALL";

  sortField?: SingleABCSortField;
  sortOrder?: SingleABCSortOrder;

  periodDays?: number;
};

/*
|--------------------------------------------------------------------------
| Query Key
|--------------------------------------------------------------------------
*/

export const singleABCQueryKey = ({
  page = 1,
  limit = 10,
  search = "",
  classification = "ALL",
  sortField = "revenue",
  sortOrder = "desc",
  periodDays = 365,
}: SingleABCQueryParams = {}) =>
  [
    "analytics",
    "single-abc-classification",
    {
      page,
      limit,
      search,
      classification,
      sortField,
      sortOrder,
      periodDays,
    },
  ] as const;

/*
|--------------------------------------------------------------------------
| Fetch Traditional / Single-Criteria ABC Classification
|--------------------------------------------------------------------------
*/

const fetchSingleABCClassification = async ({
  page = 1,
  limit = 10,
  search = "",
  classification = "ALL",
  sortField = "revenue",
  sortOrder = "desc",
  periodDays = 365,
}: SingleABCQueryParams = {}): Promise<SingleABCResponse> => {
  try {
    const res = await axiosInstance.get<SingleABCResponse>("/single-abc", {
      params: {
        page,
        limit,
        search,

        // Don't send ALL because the backend only needs A/B/C.
        classification: classification === "ALL" ? undefined : classification,

        sortField,
        sortOrder,

        periodDays,
      },
    });

    return res.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Failed to fetch traditional ABC classification"),
    );
  }
};

/*
|--------------------------------------------------------------------------
| Traditional / Single-Criteria ABC Classification Hook
|--------------------------------------------------------------------------
*/

export const useSingleABCClassification = ({
  page = 1,
  limit = 10,
  search = "",
  classification = "ALL",
  sortField = "revenue",
  sortOrder = "desc",
  periodDays = 365,
}: SingleABCQueryParams = {}) => {
  return useQuery<SingleABCResponse>({
    queryKey: singleABCQueryKey({
      page,
      limit,
      search,
      classification,
      sortField,
      sortOrder,
      periodDays,
    }),

    queryFn: () =>
      fetchSingleABCClassification({
        page,
        limit,
        search,
        classification,
        sortField,
        sortOrder,
        periodDays,
      }),

    placeholderData: keepPreviousData,

    enabled: page > 0 && limit > 0,
  });
};
