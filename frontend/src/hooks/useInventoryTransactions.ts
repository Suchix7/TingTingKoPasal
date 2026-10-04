import {
  useQuery,
  useInfiniteQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type InventoryTransactionType = "IN" | "OUT" | "ADJUSTMENT";

export type InventoryReferenceType =
  | "INITIAL_STOCK"
  | "SALE"
  | "SALE_DELETE"
  | "SALE_CANCELLED"
  | "SALE_RETURN"
  | "SALE_UPDATE_RESTORE"
  | "RESTOCK"
  | "PURCHASE_ORDER"
  | "RETURN"
  | "ADJUSTMENT"
  | "DEDUCT"
  | "MANUAL";

export type InventoryTransaction = {
  id: number;

  product_id: number;
  product_name?: string;
  sku?: string;
  unit?: string;

  batch_id?: number | null;
  batch_number?: string | null;

  type: InventoryTransactionType;
  transaction_type: InventoryTransactionType;

  quantity: number;

  reference_type: InventoryReferenceType;
  reference_id?: number | null;

  created_at: string;
};

export type InventoryTransactionSummary = {
  total_in: number;
  total_out: number;
  net_change: number;

  total_adjustment?: number;
  total_restocks?: number;
  total_deductions?: number;
  total_sales?: number;
  total_purchases?: number;

  most_active_product?: {
    product_id: number;
    product_name: string;
    transaction_count: number;
  };

  transactions_by_type: {
    IN: number;
    OUT: number;
    ADJUSTMENT?: number;
  };

  transactions_by_reference_type: Partial<
    Record<InventoryReferenceType, number>
  >;

  transactions_last_30_days: number;
  transactions_last_7_days: number;

  date_range?: {
    from: string;
    to: string;
  };
};

export type InventoryTransactionFilters = {
  transaction_type?: InventoryTransactionType;
  reference_type?: InventoryReferenceType;

  from_date?: string;
  to_date?: string;

  product_id?: number;
  batch_id?: number;

  search?: string;

  page?: number;
  limit?: number;

  sort_by?: "created_at" | "quantity" | "transaction_type";
  sort_order?: "ASC" | "DESC";
};

type InventoryTransactionsResponse = {
  success: boolean;
  data: InventoryTransaction[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;

  stats: {
    total_inflows: number;
    total_outflows: number;
    net_change: number;
    transactions: number;
  };
};

type InventoryTransactionResponse = {
  success: boolean;
  data: InventoryTransaction;
  message?: string;
};

type InventoryTransactionSummaryResponse = {
  success: boolean;
  data: InventoryTransactionSummary;
  message?: string;
};

export const inventoryTransactionsQueryKey = {
  all: ["inventory-transactions"] as const,

  lists: () => [...inventoryTransactionsQueryKey.all, "list"] as const,

  list: (filters: InventoryTransactionFilters) =>
    [...inventoryTransactionsQueryKey.lists(), filters] as const,

  infinite: (filters: InventoryTransactionFilters) =>
    [...inventoryTransactionsQueryKey.lists(), "infinite", filters] as const,

  details: () => [...inventoryTransactionsQueryKey.all, "detail"] as const,

  detail: (id: number) =>
    [...inventoryTransactionsQueryKey.details(), id] as const,

  byProduct: (productId: number) =>
    [...inventoryTransactionsQueryKey.all, "product", productId] as const,

  byBatch: (batchId: number) =>
    [...inventoryTransactionsQueryKey.all, "batch", batchId] as const,

  summary: () => [...inventoryTransactionsQueryKey.all, "summary"] as const,
};

export const useInventoryTransactions = (
  filters: InventoryTransactionFilters = {},
) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    transaction_type,
    reference_type,
    from_date,
    to_date,
    product_id,
    batch_id,
    sort_by = "created_at",
    sort_order = "DESC",
  } = filters;

  const normalizedFilters: InventoryTransactionFilters = {
    page,
    limit,
    search,
    transaction_type,
    reference_type,
    from_date,
    to_date,
    product_id,
    batch_id,
    sort_by,
    sort_order,
  };

  return useQuery<InventoryTransactionsResponse>({
    queryKey: inventoryTransactionsQueryKey.list(normalizedFilters),

    queryFn: async () => {
      const res = await axiosInstance.get<InventoryTransactionsResponse>(
        "/inventory-transactions",
        {
          params: normalizedFilters,
        },
      );

      return res.data;
    },

    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

export const useInfiniteInventoryTransactions = (
  filters: Omit<InventoryTransactionFilters, "page" | "limit"> = {},
) => {
  const {
    search = "",
    transaction_type,
    reference_type,
    from_date,
    to_date,
    product_id,
    batch_id,
    sort_by = "created_at",
    sort_order = "DESC",
  } = filters;

  return useInfiniteQuery<InventoryTransactionsResponse>({
    queryKey: inventoryTransactionsQueryKey.infinite(filters),

    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosInstance.get<InventoryTransactionsResponse>(
        "/inventory-transactions",
        {
          params: {
            page: pageParam,
            limit: 20,
            search,
            transaction_type,
            reference_type,
            from_date,
            to_date,
            product_id,
            batch_id,
            sort_by,
            sort_order,
          },
        },
      );

      return res.data;
    },

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }

      return undefined;
    },

    staleTime: 2 * 60 * 1000,
  });
};

export const useInventoryTransactionById = (id?: number) => {
  return useQuery<InventoryTransactionResponse>({
    queryKey: inventoryTransactionsQueryKey.detail(id!),

    queryFn: async () => {
      const res = await axiosInstance.get<InventoryTransactionResponse>(
        `/inventory-transactions/${id}`,
      );

      return res.data;
    },

    enabled: !!id && id > 0,
    retry: 1,
  });
};

export const useInventoryTransactionsByProduct = (
  productId?: number,
  filters: Omit<InventoryTransactionFilters, "product_id"> = {},
) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    transaction_type,
    reference_type,
    from_date,
    to_date,
    batch_id,
    sort_by = "created_at",
    sort_order = "DESC",
  } = filters;

  const normalizedFilters = {
    page,
    limit,
    search,
    transaction_type,
    reference_type,
    from_date,
    to_date,
    batch_id,
    sort_by,
    sort_order,
  };

  return useQuery<InventoryTransactionsResponse>({
    queryKey: [
      ...inventoryTransactionsQueryKey.byProduct(productId!),
      normalizedFilters,
    ],

    queryFn: async () => {
      const res = await axiosInstance.get<InventoryTransactionsResponse>(
        `/inventory-transactions/product/${productId}`,
        {
          params: normalizedFilters,
        },
      );

      return res.data;
    },

    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,

    enabled: !!productId && productId > 0 && page > 0 && limit > 0,
  });
};

export const useInventoryTransactionsByBatch = (
  batchId?: number,
  filters: Omit<InventoryTransactionFilters, "batch_id"> = {},
) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    transaction_type,
    reference_type,
    from_date,
    to_date,
    product_id,
    sort_by = "created_at",
    sort_order = "DESC",
  } = filters;

  const normalizedFilters = {
    page,
    limit,
    search,
    transaction_type,
    reference_type,
    from_date,
    to_date,
    product_id,
    sort_by,
    sort_order,
  };

  return useQuery<InventoryTransactionsResponse>({
    queryKey: [
      ...inventoryTransactionsQueryKey.byBatch(batchId!),
      normalizedFilters,
    ],

    queryFn: async () => {
      const res = await axiosInstance.get<InventoryTransactionsResponse>(
        `/inventory-transactions/batch/${batchId}`,
        {
          params: normalizedFilters,
        },
      );

      return res.data;
    },

    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,

    enabled: !!batchId && batchId > 0 && page > 0 && limit > 0,
  });
};

export const useRecentInventoryTransactions = (limit: number = 10) => {
  return useInventoryTransactions({
    page: 1,
    limit,
    sort_by: "created_at",
    sort_order: "DESC",
  });
};

export const useProductStockMovement = (
  productId?: number,
  days: number = 30,
) => {
  const to_date = new Date().toISOString().split("T")[0];

  const from_date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return useInventoryTransactionsByProduct(productId, {
    from_date,
    to_date,
    limit: 100,
  });
};

export const useBatchStockMovement = (batchId?: number, days: number = 30) => {
  const to_date = new Date().toISOString().split("T")[0];

  const from_date = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  return useInventoryTransactionsByBatch(batchId, {
    from_date,
    to_date,
    limit: 100,
  });
};
