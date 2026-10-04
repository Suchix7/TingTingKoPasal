import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

export const STOCK_STATUS = {
  OUT_OF_STOCK: { label: "Out of Stock", color: "rose" },
  CRITICAL: { label: "Critical", color: "amber" },
  LOW: { label: "Low Stock", color: "orange" },
  HEALTHY: { label: "Healthy", color: "emerald" },
} as const;

export type StockStatusKey = keyof typeof STOCK_STATUS;

export type InventorySortBy =
  | "stock_asc"
  | "stock_desc"
  | "name_asc"
  | "name_desc"
  | "updated_desc";

export type ProductBatch = {
  id: number;
  product_id: number;
  batch_number: string;
  quantity: number;
  cost_price: number;
  sale_price: number;
  created_at?: string;
  updated_at?: string;
};

export type Inventory = {
  inventory_id: number | null;
  product_id: number;

  product_name: string;
  barcode: string | null;
  sku: string | null;
  product_status: string;
  unit: string;

  cost_price: number;
  sale_price: number;

  standard_stock: number;
  batch_stock: number;
  total_stock: number;

  reorder_level: number;
  reorder_quantity: number;

  last_restocked_at?: string | null;
  updated_at?: string | null;

  batches: ProductBatch[];
};

export type InventoryResponse = {
  success: boolean;
  data: Inventory[];
  totalCount: number;

  stats: {
    total: number;
    outOfStock: number;
    critical: number;
    lowStock: number;
    healthy: number;
  };

  page: number;
  limit: number;
  totalPages: number;
};

export type SingleInventoryResponse = {
  success: boolean;

  data: {
    product_id: number;
    product_name: string;
    sku: string | null;
    barcode: string | null;
    unit: string;
    product_status: string;

    cost_price: number;
    sale_price: number;

    inventory_id: number | null;

    standard_stock: number;
    batch_stock: number;
    total_stock: number;

    reorder_level: number;
    reorder_quantity: number;

    last_restocked_at: string | null;
    updated_at: string | null;

    batches: ProductBatch[];
  };
};

export type UpdateInventoryPayload = {
  id: number;
  current_stock?: number;
  reorder_level?: number;
  reorder_quantity?: number;
};

export type StockMovementPayload = {
  product_id: number;
  quantity: number;
};

export type UpdateProductBatchPayload = {
  id: number;
  quantity?: number;
  cost_price?: number;
  sale_price?: number;
};

export type ProductBatchMovementPayload = {
  id: number;
  quantity: number;
};

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

export const inventoryQueryKey = (
  page: number,
  limit: number,
  search = "",
  statusFilter: StockStatusKey | "ALL" = "ALL",
  sortBy: InventorySortBy = "updated_desc",
) =>
  [
    "inventory",
    {
      page,
      limit,
      search,
      statusFilter,
      sortBy,
    },
  ] as const;

const fetchInventory = async ({
  page,
  limit,
  search,
  statusFilter,
  sortBy,
}: {
  page: number;
  limit: number;
  search: string;
  statusFilter: StockStatusKey | "ALL";
  sortBy: InventorySortBy;
}): Promise<InventoryResponse> => {
  try {
    const res = await axiosInstance.get<InventoryResponse>("/inventory", {
      params: {
        page,
        limit,
        search,
        statusFilter,
        sortBy,
      },
    });

    return res.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch inventory"));
  }
};

export const useInventory = (
  page = 1,
  limit = 10,
  search = "",
  statusFilter: StockStatusKey | "ALL" = "ALL",
  sortBy: InventorySortBy = "updated_desc",
) => {
  return useQuery<InventoryResponse>({
    queryKey: inventoryQueryKey(page, limit, search, statusFilter, sortBy),

    queryFn: () =>
      fetchInventory({
        page,
        limit,
        search,
        statusFilter,
        sortBy,
      }),

    placeholderData: keepPreviousData,

    enabled: page > 0 && limit > 0,
  });
};

export const useInventoryByProductId = (productId: number) => {
  return useQuery<SingleInventoryResponse>({
    queryKey: ["inventory", "product", productId],

    queryFn: async () => {
      try {
        const res = await axiosInstance.get<SingleInventoryResponse>(
          `/inventory/${productId}`,
        );

        return res.data;
      } catch (error) {
        throw new Error(getErrorMessage(error, "Failed to fetch inventory"));
      }
    },

    enabled: productId > 0,
  });
};

export const useUpdateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateInventoryPayload) => {
      const { id, ...data } = payload;

      const res = await axiosInstance.put(`/inventory/${id}`, data);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });

      queryClient.invalidateQueries({ queryKey: ["productBatches"] });

      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      toast.success("Inventory updated successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to update inventory."));
    },
  });
};

export const useRestockInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StockMovementPayload) => {
      const res = await axiosInstance.post("/inventory/restock", payload);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });

      queryClient.invalidateQueries({ queryKey: ["productBatches"] });

      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      toast.success("Inventory restocked successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to restock inventory."));
    },
  });
};

export const useDeductInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: StockMovementPayload) => {
      const res = await axiosInstance.post("/inventory/deduct", payload);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });

      queryClient.invalidateQueries({ queryKey: ["productBatches"] });

      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Inventory deducted successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to deduct inventory."));
    },
  });
};

export const useUpdateProductBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateProductBatchPayload) => {
      const { id, ...data } = payload;

      const res = await axiosInstance.put(`/inventory/batch/${id}`, data);

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });

      queryClient.invalidateQueries({ queryKey: ["productBatches"] });

      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      toast.success("Product batch updated successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to update product batch."));
    },
  });
};

export const useRestockProductBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProductBatchMovementPayload) => {
      const { id, quantity } = payload;

      const res = await axiosInstance.post(`/inventory/batch/restock/${id}`, {
        quantity,
      });

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });

      queryClient.invalidateQueries({ queryKey: ["productBatches"] });

      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      toast.success("Product batch restocked successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to restock product batch."));
    },
  });
};

export const useDeductProductBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProductBatchMovementPayload) => {
      const { id, quantity } = payload;

      const res = await axiosInstance.post(`/inventory/batch/deduct/${id}`, {
        quantity,
      });

      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["inventory"],
      });

      queryClient.invalidateQueries({
        queryKey: ["products"],
      });

      queryClient.invalidateQueries({
        queryKey: ["inventory-transactions"],
      });

      queryClient.invalidateQueries({ queryKey: ["productBatches"] });

      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      toast.success("Product batch deducted successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to deduct product batch."));
    },
  });
};
