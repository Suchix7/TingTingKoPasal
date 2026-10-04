import {
  useQuery,
  useInfiniteQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";

export type PaymentTransactionDirection = "IN" | "OUT";

export type PaymentTransactionType =
  | "OPENING_BALANCE"
  | "CAPITAL_ADDITION"
  | "SALE_PAYMENT"
  | "EXPENSE_PAYMENT"
  | "PURCHASE_PAYMENT"
  | "WITHDRAWAL"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT";

export type PaymentReferenceType =
  | "sale"
  | "sale_payment"
  | "expense"
  | "purchase_order"
  | "purchase_order_payment"
  | "manual"
  | "transfer"
  | "adjustment";

export type PaymentTransaction = {
  id: number;

  payment_method_id: number;
  payment_method: string;
  payment_method_type?: string;

  transaction_type: PaymentTransactionType;
  direction: PaymentTransactionDirection;

  amount: number;
  signed_amount: number;

  reference_type?: PaymentReferenceType | null;
  reference_id?: number | null;

  title?: string | null;
  notes?: string | null;

  transaction_date: string;
  created_at: string;
  updated_at?: string;
};

export type PaymentTransactionStats = {
  total_in: number;
  total_out: number;
  net_amount: number;
  total_transactions: number;
};

export type PaymentTransactionFilters = {
  page?: number;
  limit?: number;
  search?: string;

  payment_method_id?: number | string;
  transaction_type?: PaymentTransactionType | "";
  direction?: PaymentTransactionDirection | "";
  reference_type?: PaymentReferenceType | "";

  dateFrom?: string;
  dateTo?: string;

  sortBy?:
    | "date_desc"
    | "date_asc"
    | "amount_desc"
    | "amount_asc"
    | "method_asc"
    | "method_desc"
    | "type_asc"
    | "type_desc";
};

export type PaymentTransactionsResponse = {
  success: boolean;
  message?: string;
  data: PaymentTransaction[];

  stats: PaymentTransactionStats;

  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  filters?: PaymentTransactionFilters;
};

export type PaymentTransactionResponse = {
  success: boolean;
  message?: string;
  data: PaymentTransaction;
};

export const paymentTransactionsQueryKey = {
  all: ["payment-transactions"] as const,

  lists: () => [...paymentTransactionsQueryKey.all, "list"] as const,

  list: (filters: PaymentTransactionFilters) =>
    [...paymentTransactionsQueryKey.lists(), filters] as const,

  infinite: (filters: PaymentTransactionFilters) =>
    [...paymentTransactionsQueryKey.lists(), "infinite", filters] as const,

  details: () => [...paymentTransactionsQueryKey.all, "detail"] as const,

  detail: (id: number) =>
    [...paymentTransactionsQueryKey.details(), id] as const,

  byPaymentMethod: (paymentMethodId: number) =>
    [
      ...paymentTransactionsQueryKey.all,
      "payment-method",
      paymentMethodId,
    ] as const,

  recent: () => [...paymentTransactionsQueryKey.all, "recent"] as const,
};

export const usePaymentTransactions = (
  filters: PaymentTransactionFilters = {},
) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    payment_method_id = "",
    transaction_type = "",
    direction = "",
    reference_type = "",
    dateFrom = "",
    dateTo = "",
    sortBy = "date_desc",
  } = filters;

  const normalizedFilters: PaymentTransactionFilters = {
    page,
    limit,
    search,
    payment_method_id,
    transaction_type,
    direction,
    reference_type,
    dateFrom,
    dateTo,
    sortBy,
  };

  return useQuery<PaymentTransactionsResponse>({
    queryKey: paymentTransactionsQueryKey.list(normalizedFilters),

    queryFn: async () => {
      const res = await axiosInstance.get<PaymentTransactionsResponse>(
        "/payment-transactions",
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

export const useInfinitePaymentTransactions = (
  filters: Omit<PaymentTransactionFilters, "page" | "limit"> = {},
) => {
  const {
    search = "",
    payment_method_id = "",
    transaction_type = "",
    direction = "",
    reference_type = "",
    dateFrom = "",
    dateTo = "",
    sortBy = "date_desc",
  } = filters;

  const normalizedFilters: Omit<PaymentTransactionFilters, "page" | "limit"> = {
    search,
    payment_method_id,
    transaction_type,
    direction,
    reference_type,
    dateFrom,
    dateTo,
    sortBy,
  };

  return useInfiniteQuery<PaymentTransactionsResponse>({
    queryKey: paymentTransactionsQueryKey.infinite(normalizedFilters),

    queryFn: async ({ pageParam = 1 }) => {
      const res = await axiosInstance.get<PaymentTransactionsResponse>(
        "/payment-transactions",
        {
          params: {
            ...normalizedFilters,
            page: pageParam,
            limit: 20,
          },
        },
      );

      return res.data;
    },

    initialPageParam: 1,

    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }

      return undefined;
    },

    staleTime: 2 * 60 * 1000,
  });
};

export const usePaymentTransactionById = (id?: number) => {
  return useQuery<PaymentTransactionResponse>({
    queryKey: paymentTransactionsQueryKey.detail(id!),

    queryFn: async () => {
      const res = await axiosInstance.get<PaymentTransactionResponse>(
        `/payment-transactions/${id}`,
      );

      return res.data;
    },

    enabled: !!id && id > 0,
    retry: 1,
  });
};

export const usePaymentTransactionsByPaymentMethod = (
  paymentMethodId?: number,
  filters: Omit<PaymentTransactionFilters, "payment_method_id"> = {},
) => {
  const {
    page = 1,
    limit = 20,
    search = "",
    transaction_type = "",
    direction = "",
    reference_type = "",
    dateFrom = "",
    dateTo = "",
    sortBy = "date_desc",
  } = filters;

  const normalizedFilters: PaymentTransactionFilters = {
    page,
    limit,
    search,
    payment_method_id: paymentMethodId,
    transaction_type,
    direction,
    reference_type,
    dateFrom,
    dateTo,
    sortBy,
  };

  return useQuery<PaymentTransactionsResponse>({
    queryKey: [
      ...paymentTransactionsQueryKey.byPaymentMethod(paymentMethodId!),
      normalizedFilters,
    ],

    queryFn: async () => {
      const res = await axiosInstance.get<PaymentTransactionsResponse>(
        "/payment-transactions",
        {
          params: normalizedFilters,
        },
      );

      return res.data;
    },

    staleTime: 2 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: !!paymentMethodId && paymentMethodId > 0 && page > 0 && limit > 0,
  });
};

export const useRecentPaymentTransactions = (limit: number = 10) => {
  return usePaymentTransactions({
    page: 1,
    limit,
    sortBy: "date_desc",
  });
};

export const usePaymentTransactionsByDateRange = (
  dateFrom?: string,
  dateTo?: string,
  filters: Omit<PaymentTransactionFilters, "dateFrom" | "dateTo"> = {},
) => {
  return usePaymentTransactions({
    ...filters,
    dateFrom,
    dateTo,
  });
};

export const usePaymentInflowTransactions = (
  filters: Omit<PaymentTransactionFilters, "direction"> = {},
) => {
  return usePaymentTransactions({
    ...filters,
    direction: "IN",
  });
};

export const usePaymentOutflowTransactions = (
  filters: Omit<PaymentTransactionFilters, "direction"> = {},
) => {
  return usePaymentTransactions({
    ...filters,
    direction: "OUT",
  });
};

export const usePurchasePaymentTransactions = (
  filters: Omit<PaymentTransactionFilters, "transaction_type"> = {},
) => {
  return usePaymentTransactions({
    ...filters,
    transaction_type: "PURCHASE_PAYMENT",
  });
};

export const useSalesPaymentTransactions = (
  filters: Omit<PaymentTransactionFilters, "transaction_type"> = {},
) => {
  return usePaymentTransactions({
    ...filters,
    transaction_type: "SALE_PAYMENT",
  });
};

export const useExpensePaymentTransactions = (
  filters: Omit<PaymentTransactionFilters, "transaction_type"> = {},
) => {
  return usePaymentTransactions({
    ...filters,
    transaction_type: "EXPENSE_PAYMENT",
  });
};
