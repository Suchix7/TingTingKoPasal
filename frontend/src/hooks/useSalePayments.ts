import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

export type SalePayment = {
  id: string;
  sale_id: string;
  payment_method_id: string;
  amount: number;
  created_at?: string;
  payment_method?: string;
  type?: string;
  qr_code?: string | null;
};

export type CreateSalePayment = {
  sale_id: string;
  payment_method_id: string;
  amount: number;
};

export type UpdateSalePayment = Partial<CreateSalePayment> & {
  id: string;
};

type SalePaymentsResponse = {
  success: boolean;
  data: SalePayment[];
  totalCount?: number;
  page?: number;
  limit?: number;
  message?: string;
};

type SalePaymentResponse = {
  success: boolean;
  data: SalePayment;
  message?: string;
};

export const salePaymentsQueryKey = (
  page?: number,
  limit?: number,
  saleId?: string,
) => ["salePayments", { page, limit, saleId }] as const;

export const useSalePayments = (page = 1, limit = 10, saleId?: string) => {
  return useQuery<SalePaymentsResponse>({
    queryKey: salePaymentsQueryKey(page, limit, saleId),
    queryFn: async () => {
      const res = await axiosInstance.get<SalePaymentsResponse>(
        "/sales/test/sale-payments",
        {
          params: {
            page,
            limit,
            sale_id: saleId,
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

export const useSalePaymentById = (salePaymentId?: string) => {
  return useQuery<SalePaymentResponse>({
    queryKey: ["salePayments", salePaymentId],
    queryFn: async () => {
      const res = await axiosInstance.get<SalePaymentResponse>(
        `/sales/sale-payments/${salePaymentId}`,
      );

      return res.data;
    },
    enabled: !!salePaymentId,
  });
};

export const useDeleteSalePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, sale_id }: { id: string; sale_id?: string }) => {
      const res = await axiosInstance.delete(`/sale-payments/${id}`);
      return {
        ...res.data,
        sale_id,
      };
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["salePayments"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });

      if (response.sale_id) {
        queryClient.invalidateQueries({
          queryKey: ["sales", response.sale_id],
        });
      }
    },
    onError: () => {
      toast.error("Failed to delete sale payment. Please try again.");
    },
  });
};

export const useSalePaymentsBySaleId = (saleId?: string) => {
  return useQuery<{ success: boolean; data: SalePayment[] }>({
    queryKey: ["salePayments", "sale", saleId],
    queryFn: async () => {
      const res = await axiosInstance.get<{
        success: boolean;
        data: SalePayment[];
      }>("/sales/sale-payments/by-sale", {
        params: { sale_id: saleId },
      });

      return res.data;
    },
    enabled: !!saleId,
  });
};

// export const useCreateSalePayment = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (newSalePayment: CreateSalePayment) => {
//       const res = await axiosInstance.post<SalePaymentResponse>(
//         "/sale-payments",
//         newSalePayment,
//       );

//       return res.data;
//     },
//     onSuccess: (_, newSalePayment) => {
//       queryClient.invalidateQueries({ queryKey: ["salePayments"] });
//       queryClient.invalidateQueries({
//         queryKey: ["sales", newSalePayment.sale_id],
//       });
//       queryClient.invalidateQueries({ queryKey: ["sales"] });
//     },
//     onError: () => {
//       toast.error("Failed to create sale payment. Please try again.");
//     },
//   });
// };

// export const useUpdateSalePayment = () => {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async (updatedSalePayment: UpdateSalePayment) => {
//       const res = await axiosInstance.put<SalePaymentResponse>(
//         `/sale-payments/${updatedSalePayment.id}`,
//         updatedSalePayment,
//       );

//       return res.data;
//     },
//     onSuccess: (response, updatedSalePayment) => {
//       queryClient.invalidateQueries({ queryKey: ["salePayments"] });
//       queryClient.invalidateQueries({
//         queryKey: ["salePayments", updatedSalePayment.id],
//       });

//       const saleId = response.data?.sale_id ?? updatedSalePayment.sale_id;

//       if (saleId) {
//         queryClient.invalidateQueries({ queryKey: ["sales", saleId] });
//       }

//       queryClient.invalidateQueries({ queryKey: ["sales"] });
//     },
//     onError: () => {
//       toast.error("Failed to update sale payment. Please try again.");
//     },
//   });
// };
