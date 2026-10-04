import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

export type SalePayment = {
  payment_method_id: string;
  amount: number;
};

export type SaleItem = {
  id: string;
  sale_id: string;
  product_id: string;
  batch_id?: string;
  product_name: string;
  sku?: string | null;
  discount_reason?: string | null;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount?: number;
  tax_inclusive?: boolean;
  profit_amount?: number;
  cost_price?: number;
  total_price: number;
  created_at?: string;
};

export type Sale = {
  id: string;
  invoice_no: string;
  customer_id: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  grand_total: number;
  paid_amount: number;
  change_amount: number;
  remaining_amount: number;
  profit_amount?: number;
  payments: SalePayment[];
  payment_status: "Paid" | "Unpaid" | "Partial" | "Refunded" | "Cancelled";
  sale_status: "Completed" | "Cancelled" | "Returned";
  notes?: string | null;
  items?: SaleItem[];
  is_tax_inclusive?: boolean;
  payment_proof_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CreateSaleItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  total_price: number;
};

export type CreateSale = Omit<
  Sale,
  "id" | "items" | "created_at" | "updated_at"
> & {
  items: CreateSaleItem[];
};

type SalesResponse = {
  success: boolean;
  data: Sale[];
  totalCount: number;
  stats: {
    totalProfit: number;
    totalPaid: number;
    totalRemaining: number;
    partialOrUnpaid: number;
  };
  page: number;
  limit: number;
};

type SaleResponse = {
  success: boolean;
  data: Sale;
  message?: string;
};

export const salesQueryKey = (
  page: number,
  limit: number,
  search = "",
  paymentStatus = "",
  saleStatus = "",
) => ["sales", { page, limit, search, paymentStatus, saleStatus }] as const;

export const useSales = (
  page = 1,
  limit = 10,
  search = "",
  paymentStatus = "",
  saleStatus = "",
) => {
  return useQuery<SalesResponse>({
    queryKey: salesQueryKey(page, limit, search, paymentStatus, saleStatus),
    queryFn: async () => {
      const res = await axiosInstance.get<SalesResponse>("/sales", {
        params: {
          page,
          limit,
          search,
          payment_status: paymentStatus,
          sale_status: saleStatus,
        },
      });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    enabled: page > 0 && limit > 0,
  });
};

export const useSaleById = (saleId?: string) => {
  return useQuery<SaleResponse>({
    queryKey: ["sales", saleId],
    queryFn: async () => {
      const res = await axiosInstance.get<SaleResponse>(`/sales/${saleId}`);
      return res.data;
    },
    enabled: !!saleId,
  });
};

export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSale: CreateSale) => {
      const res = await axiosInstance.post<SaleResponse>("/sales", newSale);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["salePayments"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["saleItems"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["abc-classification"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create sale.");
    },
  });
};

export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updatedSale: Sale) => {
      const res = await axiosInstance.put<SaleResponse>(
        `/sales/${updatedSale.id}`,
        updatedSale,
      );
      return res.data;
    },
    onSuccess: (_, updatedSale) => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: [updatedSale.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["salePayments"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["saleItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["abc-classification"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update sale.");
    },
  });
};

export const useRevokeSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, reason }: { saleId: string; reason: string }) => {
      const res = await axiosInstance.post(`/sales/${saleId}/revoke`, { reason });
      return res.data;
    },
    onSuccess: () => {
      for (const key of [
        "sales",
        "products",
        "salePayments",
        "inventory",
        "inventory-transactions",
        "overview",
        "eoq",
        "daybook",
        "customers",
        "saleItems",
        "dashboard",
        "analytics",
        "payment-transactions",
        "paymentMethods",
        "productBatches",
        "abc-classification",
        "activity-logs",
      ]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to revoke sale.");
    },
  });
};

export const useDeleteSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => {
      const res = await axiosInstance.delete(`/sales/${saleId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["salePayments"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["daybook"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["saleItems"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["abc-classification"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete sale.");
    },
  });
};

export const useUploadSalePaymentProof = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await axiosInstance.post<{ success: boolean; data: Sale }>(
        `/sales/${id}/payment-proof`,
        formData,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload payment proof photo.",
      );
    },
  });
};

export const useSaleItems = (saleId?: string) => {
  return useQuery<{ success: boolean; data: SaleItem[] }>({
    queryKey: ["saleItems", saleId],
    queryFn: async () => {
      const res = await axiosInstance.get<{
        success: boolean;
        data: SaleItem[];
      }>("/sales/items/all", {
        params: { sale_id: saleId },
      });
      return res.data;
    },
    enabled: !!saleId,
  });
};
