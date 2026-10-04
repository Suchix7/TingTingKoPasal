import { useQuery, keepPreviousData } from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type EoqCalculation = {
  product_id: number;
  product_name: string;
  sku: string;
  yearly_demand: number;
  ordering_cost: number;
  holding_cost_per_unit: number;
  unit_cost: number;
  eoq: number | null;
  number_of_orders_per_year: number;
  reorder_point?: number;
  safety_stock?: number;
  total_inventory_cost?: number;
  recommended_order_quantity?: number | null;
  lead_time_days?: number;
  average_daily_demand?: number;
  saved_reorder_level?: number;
  calculated_reorder_point?: number;
  safety_stock_days?: number;
  current_stock?: number;
  alerts?: {
    type: "URGENT_REORDER" | "MISSING_COST_DATA" | "HIGH_DEMAND";
    message: string;
  }[];
  created_at?: string;
};

export type EoqStats = {
  totalProducts: number;
  missingCostData: number;
  highDemandProducts: number;
  urgentReorder: number;
  averageEoq: number;
};

export type EoqCalculationResponse = {
  success: boolean;
  data: EoqCalculation | EoqCalculation[];
  stats?: EoqStats;
  message?: string;
  totalCount?: number;
  totalPages?: number;
  page?: number;
  limit?: number;
};

export const eoqQueryKey = {
  all: (
    page: number,
    limit: number,
    sortField: string,
    sortOrder: string,
    filterHighDemand: boolean,
    filterUrgentReorder: boolean,
    search: string,
  ) =>
    [
      "eoq",
      page,
      limit,
      sortField,
      sortOrder,
      filterHighDemand,
      filterUrgentReorder,
      search,
    ] as const,
  byProduct: (productId: number) => ["eoq", productId] as const,
};

export const useEoqForAllProducts = (
  enabled: boolean = true,
  page = 1,
  limit = 20,
  sortField = "total_inventory_cost",
  sortOrder = "desc",
  filterMissingCost = false,
  filterHighDemand = false,
  filterUrgentReorder = false,
  search = "",
) => {
  return useQuery<EoqCalculationResponse>({
    queryKey: eoqQueryKey.all(
      page,
      limit,
      sortField,
      sortOrder,
      filterHighDemand,
      filterUrgentReorder,
      search,
    ),
    queryFn: async () => {
      const res = await axiosInstance.get<EoqCalculationResponse>("/eoq", {
        params: {
          page,
          limit,
          sortField,
          sortOrder,
          filterMissingCost,
          filterHighDemand,
          filterUrgentReorder,
          search,
        },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: enabled,
  });
};

export const useEoqByProductId = (productId: number | null) => {
  return useQuery<EoqCalculationResponse>({
    queryKey: eoqQueryKey.byProduct(productId!),
    queryFn: async () => {
      const res = await axiosInstance.get<EoqCalculationResponse>(
        `/eoq/${productId}`,
      );
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!productId && productId > 0,
    retry: 1,
  });
};

export const useEoq = (
  productId: number | null,
  page = 1,
  limit = 20,
  sortField = "total_inventory_cost",
  sortOrder = "desc",
  filterMissingCost = false,
  filterHighDemand = false,
  filterUrgentReorder = false,
  search = "",
) => {
  const allProductsQuery = useEoqForAllProducts(
    !productId,
    page,
    limit,
    sortField,
    sortOrder,
    filterMissingCost,
    filterHighDemand,
    filterUrgentReorder,
    search,
  );
  const singleProductQuery = useEoqByProductId(productId);

  if (productId) {
    return singleProductQuery;
  }
  return allProductsQuery;
};

export const formatEoqResult = (eoqData: EoqCalculation) => {
  return {
    ...eoqData,
    formatted_eoq: Math.ceil(eoqData.eoq || 0),
    formatted_yearly_demand: eoqData.yearly_demand.toLocaleString(),
    formatted_ordering_cost: `Rs.${eoqData.ordering_cost.toFixed(2)}`,
    formatted_holding_cost: `Rs.${eoqData.holding_cost_per_unit.toFixed(2)}`,
    formatted_unit_cost: `Rs.${eoqData.unit_cost.toFixed(2)}`,
    formatted_total_cost: eoqData.total_inventory_cost
      ? `Rs.${eoqData.total_inventory_cost.toFixed(2)}`
      : undefined,
    orders_per_year: Math.ceil(eoqData.number_of_orders_per_year),
    order_interval_days: Math.ceil(365 / eoqData.number_of_orders_per_year),
  };
};

export const isEoqArray = (
  data: EoqCalculation | EoqCalculation[] | undefined,
): data is EoqCalculation[] => {
  return Array.isArray(data);
};

export const isEoqSingle = (
  data: EoqCalculation | EoqCalculation[] | undefined,
): data is EoqCalculation => {
  return !Array.isArray(data) && !!data;
};
