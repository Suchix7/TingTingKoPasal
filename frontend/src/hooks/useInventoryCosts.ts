import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type InventoryCost = {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  cost_price: number;
  unit: string;
  holding_cost_per_unit: number;
  storage_cost: number;
  insurance_cost: number;
  spoilage_rate: number;
  updated_at?: string;
};

export type InventoryCostStats = {
  total: number;
  totalHolding: number;
  totalStorage: number;
  totalInsurance: number;
  totalCosts: number;
  avgSpoilage: number;
  highCost: number;
  mediumCost: number;
  lowCost: number;
};

export type InventoryCostsResponse = {
  success: boolean;
  data: InventoryCost[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: InventoryCostStats;
};

type SingleInventoryCostResponse = {
  success: boolean;
  data: InventoryCost;
};

export const inventoryCostsQueryKey = (
  page: number,
  limit: number,
  searchQuery: string,
  costFilter: string,
  sortBY: string,
) =>
  ["inventoryCosts", { page, limit, searchQuery, costFilter, sortBY }] as const;

export const useInventoryCosts = (
  page = 1,
  limit = 10,
  searchQuery = "",
  costFilter = "",
  sortBY = "",
) => {
  return useQuery<InventoryCostsResponse>({
    queryKey: inventoryCostsQueryKey(
      page,
      limit,
      searchQuery,
      costFilter,
      sortBY,
    ),
    queryFn: async () => {
      const res = await axiosInstance.get<InventoryCostsResponse>(
        "/inventory-costs",
        {
          params: {
            page,
            limit,
            search: searchQuery,
            costFilter,
            sortBY,
          },
        },
      );

      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

export const useInventoryCostByProductId = (productId?: string) => {
  return useQuery<SingleInventoryCostResponse>({
    queryKey: ["inventoryCost", productId],
    queryFn: async () => {
      const res = await axiosInstance.get<SingleInventoryCostResponse>(
        `/inventory-costs/${productId}`,
      );

      return res.data;
    },
    enabled: !!productId,
  });
};

export const useCreateInventoryCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      newInventoryCost: Omit<
        InventoryCost,
        | "id"
        | "product_name"
        | "sku"
        | "created_at"
        | "updated_at"
        | "cost_price"
        | "unit"
      >,
    ) => {
      const res = await axiosInstance.post<SingleInventoryCostResponse>(
        "/inventory-costs",
        newInventoryCost,
      );

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCosts"] });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
    },
  });
};

export const useUpdateInventoryCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      updatedInventoryCost: Omit<
        InventoryCost,
        | "product_name"
        | "sku"
        | "created_at"
        | "updated_at"
        | "cost_price"
        | "unit"
      >,
    ) => {
      const { product_id, ...payload } = updatedInventoryCost;

      const res = await axiosInstance.put<SingleInventoryCostResponse>(
        `/inventory-costs/${product_id}`,
        payload,
      );

      return res.data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCosts"] });
      queryClient.invalidateQueries({
        queryKey: ["inventoryCost", variables.product_id],
      });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
    },
  });
};

export const useDeleteInventoryCost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const res = await axiosInstance.delete(`/inventory-costs/${productId}`);
      return res.data;
    },

    onSuccess: (_, productId) => {
      queryClient.invalidateQueries({ queryKey: ["inventoryCosts"] });
      queryClient.invalidateQueries({
        queryKey: ["inventoryCost", productId],
      });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
    },
  });
};
