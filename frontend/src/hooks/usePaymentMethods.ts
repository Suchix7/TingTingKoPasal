import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

export type PaymentMethod = {
  id: string;
  payment_method: string;
  type: string;
  qr_code: string;
  status: string;
  notes?: string;
  total_in: number;
  total_out: number;
  current_balance: number;
  transaction_count: number;
  created_at?: string;
  updated_at?: string;
};

export type PaymentMethodTransaction = {
  id: string;
  payment_method_id: string;
  transaction_type: string;
  direction: "IN" | "OUT";
  amount: number;
  reference_type?: string | null;
  reference_id?: string | null;
  title?: string | null;
  notes?: string | null;
  transaction_date?: string;
  created_at?: string;
  updated_at?: string;
};

type PaymentMethodsResponse = {
  success: boolean;
  data: PaymentMethod[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages?: number;
  stats?: {
    total_in: number;
    total_out: number;
    total_balance: number;
  };
};

type PaymentMethodActionResponse = {
  success: boolean;
  message: string;
  data: PaymentMethodTransaction;
};

type PaymentMethodTransferResponse = {
  success: boolean;
  message: string;
  data: {
    transfer_out_id: string;
    transfer_in_id: string;
  };
};

export type AddPaymentMethodFundsPayload = {
  paymentMethodId: string;
  amount: number;
  title?: string;
  notes?: string;
};

export type WithdrawPaymentMethodFundsPayload = {
  paymentMethodId: string;
  amount: number;
  title?: string;
  notes?: string;
};

export type TransferPaymentMethodFundsPayload = {
  from_payment_method_id: string;
  to_payment_method_id: string;
  amount: number;
  notes?: string;
};

export const paymentMethodsQueryKey = (
  page: number,
  limit: number,
  status: string,
) => ["paymentMethods", { page, limit, status }] as const;

export const usePaymentMethods = (page = 1, limit = 10, status = "") => {
  return useQuery<PaymentMethodsResponse>({
    queryKey: paymentMethodsQueryKey(page, limit, status),
    queryFn: async () => {
      const res = await axiosInstance.get<PaymentMethodsResponse>(
        "/payment-methods",
        {
          params: { page, limit, status },
        },
      );

      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

export const useCreatePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      newPaymentMethod: Omit<
        PaymentMethod,
        | "id"
        | "created_at"
        | "updated_at"
        | "total_in"
        | "total_out"
        | "current_balance"
        | "transaction_count"
      >,
    ) => {
      try {
        const res = await axiosInstance.post<PaymentMethod>(
          "/payment-methods",
          newPaymentMethod,
        );

        return res.data;
      } catch (error) {
        console.log("Error while creating payment method:", error);
        throw new Error("Failed to create payment method");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useUpdatePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedPaymentMethod: PaymentMethod) => {
      const res = await axiosInstance.put<PaymentMethod>(
        `/payment-methods/${updatedPaymentMethod.id}`,
        updatedPaymentMethod,
      );

      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
    },
  });
};

export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      try {
        const res = await axiosInstance.delete(
          `/payment-methods/${paymentMethodId}`,
        );

        return res.data;
      } catch (error: any) {
        console.log("Error while deleting payment method:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to delete payment method",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useAddPaymentMethodFunds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentMethodId,
      amount,
      title,
      notes,
    }: AddPaymentMethodFundsPayload) => {
      try {
        const res = await axiosInstance.post<PaymentMethodActionResponse>(
          `/payment-methods/${paymentMethodId}/add-funds`,
          {
            amount,
            title,
            notes,
          },
        );

        return res.data;
      } catch (error: any) {
        console.log("Error while adding payment method funds:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to add funds",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useWithdrawPaymentMethodFunds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentMethodId,
      amount,
      title,
      notes,
    }: WithdrawPaymentMethodFundsPayload) => {
      try {
        const res = await axiosInstance.post<PaymentMethodActionResponse>(
          `/payment-methods/${paymentMethodId}/withdraw`,
          {
            amount,
            title,
            notes,
          },
        );

        return res.data;
      } catch (error: any) {
        console.log("Error while withdrawing payment method funds:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to withdraw funds",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};

export const useTransferPaymentMethodFunds = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TransferPaymentMethodFundsPayload) => {
      try {
        const res = await axiosInstance.post<PaymentMethodTransferResponse>(
          "/payment-methods/transfer",
          payload,
        );

        return res.data;
      } catch (error: any) {
        console.log("Error while transferring payment method funds:", error);

        throw new Error(
          error?.response?.data?.message || "Failed to transfer funds",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
};
