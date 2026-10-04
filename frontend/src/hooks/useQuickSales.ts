import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

/* ---------------- TYPES ---------------- */

export type QuickSaleStatus = "pending" | "converted" | "cancelled";

export type QuickSalePayment = {
  id: string;
  quick_sale_id: string;
  payment_method_id: string;
  payment_method_name: string | null;
  amount: number;
  created_at: string;
  updated_at: string;
};

export type QuickSale = {
  id: string;

  quick_sale_date: string;

  total_amount: number;

  notes: string | null;

  status: QuickSaleStatus;

  converted_sale_id: string | null;

  payments: QuickSalePayment[];

  created_at: string;
  updated_at: string;
};

export type QuickSalesPagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type QuickSalesResponse = {
  success: boolean;
  message: string;
  data: QuickSale[];
  pagination: QuickSalesPagination;
};

export type QuickSaleResponse = {
  success: boolean;
  message: string;
  data: QuickSale;
};

export type QuickSalesQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: QuickSaleStatus | "all";
};

export type QuickSalePaymentPayload = {
  payment_method_id: string;
  amount: number;
};

export type CreateQuickSalePayload = {
  notes?: string | null;
  payments?: QuickSalePaymentPayload[];
};

export type UpdateQuickSalePayload = {
  notes?: string | null;
  status?: "pending" | "cancelled";
  payments?: QuickSalePaymentPayload[];
};

export type ConvertQuickSalePayload = {
  converted_sale_id: string;
};

/* ---------------- API CONFIG ---------------- */

const QUICK_SALES_ENDPOINT = "/quick-sales";

/* ---------------- QUERY KEYS ---------------- */

export const quickSalesKeys = {
  all: ["quick-sales"] as const,

  lists: () => [...quickSalesKeys.all, "list"] as const,

  list: (params: QuickSalesQueryParams) =>
    [...quickSalesKeys.lists(), params] as const,

  details: () => [...quickSalesKeys.all, "detail"] as const,

  detail: (id: number | string) => [...quickSalesKeys.details(), id] as const,
};

/* ---------------- HOOKS ---------------- */

// Get paginated quick sales
export function useQuickSales(params: QuickSalesQueryParams = {}) {
  const { page = 1, limit = 10, search = "", status = "all" } = params;

  return useQuery({
    queryKey: quickSalesKeys.list({
      page,
      limit,
      search,
      status,
    }),

    queryFn: async () => {
      const queryParams: Record<string, string | number> = {
        page,
        limit,
      };

      if (search.trim()) {
        queryParams.search = search.trim();
      }

      if (status !== "all") {
        queryParams.status = status;
      }

      const response = await axiosInstance.get<QuickSalesResponse>(
        QUICK_SALES_ENDPOINT,
        {
          params: queryParams,
        },
      );

      return response.data;
    },

    placeholderData: keepPreviousData,
  });
}

// Get single quick sale by id
export function useQuickSale(id?: number | string) {
  return useQuery({
    queryKey: quickSalesKeys.detail(id || ""),

    queryFn: async () => {
      const response = await axiosInstance.get<QuickSaleResponse>(
        `${QUICK_SALES_ENDPOINT}/${id}`,
      );

      return response.data;
    },

    enabled: Boolean(id),
  });
}

// Create quick sale
export function useCreateQuickSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateQuickSalePayload) => {
      const response = await axiosInstance.post<QuickSaleResponse>(
        QUICK_SALES_ENDPOINT,
        payload,
      );

      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.lists(),
      });
    },
  });
}

// Update quick sale
export function useUpdateQuickSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number | string;
      payload: UpdateQuickSalePayload;
    }) => {
      const response = await axiosInstance.put<QuickSaleResponse>(
        `${QUICK_SALES_ENDPOINT}/${id}`,
        payload,
      );

      return response.data;
    },

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.detail(variables.id),
      });
    },
  });
}

// Cancel quick sale
export function useCancelQuickSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const response = await axiosInstance.patch<QuickSaleResponse>(
        `${QUICK_SALES_ENDPOINT}/${id}/cancel`,
      );

      return response.data;
    },

    onSuccess: (data, id) => {
      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.detail(id),
      });
    },
  });
}

// Mark quick sale as converted
export function useConvertQuickSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      converted_sale_id,
    }: {
      id: number | string;
      converted_sale_id: string;
    }) => {
      const payload: ConvertQuickSalePayload = {
        converted_sale_id,
      };

      const response = await axiosInstance.patch<QuickSaleResponse>(
        `${QUICK_SALES_ENDPOINT}/${id}/convert`,
        payload,
      );

      return response.data;
    },

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.lists(),
      });

      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.detail(variables.id),
      });
    },
  });
}

// Delete quick sale
export function useDeleteQuickSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      const response = await axiosInstance.delete<{
        success: boolean;
        message: string;
      }>(`${QUICK_SALES_ENDPOINT}/${id}`);

      return response.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: quickSalesKeys.lists(),
      });
    },
  });
}
