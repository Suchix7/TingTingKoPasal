// hooks/usePurchaseOrders.ts

import {
  useQuery,
  keepPreviousData,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import toast from "react-hot-toast";

export type PurchaseOrderStatus = "Pending" | "Received" | "Cancelled";

export type PurchaseOrderItem = {
  id?: string;
  product_id: string;
  batch_id?: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
};

export type PurchaseOrder = {
  id: string;
  supplier_id: string;
  supplier_name: string;
  contact_person: string;
  supplier_email: string;
  supplier_phone: string;
  order_date: string;
  total_cost: number;
  ordering_cost: number;
  status: PurchaseOrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
};

export type CreatePurchaseOrderPayload = {
  supplier_id: string;
  ordering_cost?: number;
  notes?: string;
  items: {
    product_id: string;
    batch_id?: string | null;
    quantity: number;
    unit_cost: number;
  }[];
  payments: {
    payment_method_id: string;
    amount: number;
  }[];
};

export type UpdatePurchaseOrderStatusPayload = {
  status: PurchaseOrderStatus;
};

type PurchaseOrderStats = {
  total: number;
  pending: number;
  received: number;
  cancelled: number;
  totalValue: number;
};

type PurchaseOrdersResponse = {
  success: boolean;
  data: PurchaseOrder[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  stats: PurchaseOrderStats;
};

type SinglePurchaseOrderResponse = {
  success: boolean;
  data: PurchaseOrder;
};

type DeletePurchaseOrderResponse = {
  success: boolean;
  message: string;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }
  return fallback;
};

const fetchPurchaseOrders = async (
  page: number,
  limit: number,
  search = "",
  status = "",
  sortBy = "",
): Promise<PurchaseOrdersResponse> => {
  try {
    const res = await axiosInstance.get<PurchaseOrdersResponse>(
      "/purchase-orders",
      {
        params: {
          page,
          limit,
          search,
          status,
          sortBy,
        },
      },
    );
    return res.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch purchase orders"));
  }
};

const fetchPurchaseOrderById = async (
  id: string,
): Promise<SinglePurchaseOrderResponse> => {
  try {
    const res = await axiosInstance.get<SinglePurchaseOrderResponse>(
      `/purchase-orders/${id}`,
    );
    return res.data;
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to fetch purchase order"));
  }
};

export const usePurchaseOrders = (
  page: number,
  limit: number,
  search: string,
  status: string,
  sortBy: string,
) => {
  return useQuery({
    queryKey: ["purchase-orders", page, limit, search, status, sortBy],
    queryFn: () => fetchPurchaseOrders(page, limit, search, status, sortBy),
    placeholderData: keepPreviousData,
  });
};

export const usePurchaseOrderById = (id: string) => {
  return useQuery({
    queryKey: ["purchase-orders", id],
    queryFn: () => fetchPurchaseOrderById(id),
    enabled: !!id,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreatePurchaseOrderPayload) => {
      const res = await axiosInstance.post("/purchase-orders", payload);
      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      toast.success("Purchase order created successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to create purchase order."));
    },
  });
};

export const useUpdatePurchaseOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: { id: string } & UpdatePurchaseOrderStatusPayload) => {
      const res = await axiosInstance.patch(`/purchase-orders/${id}/status`, {
        status,
      });
      return res.data;
    },

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-orders", variables.id],
      });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Purchase order status updated successfully.");
    },

    onError: (error: unknown) => {
      toast.error(
        getErrorMessage(error, "Failed to update purchase order status."),
      );
    },
  });
};

export const useDeletePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete<DeletePurchaseOrderResponse>(
        `/purchase-orders/${id}`,
      );
      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productBatches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["payment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMethods"] });
      queryClient.invalidateQueries({ queryKey: ["eoq"] });
      toast.success("Purchase order deleted successfully.");
    },

    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Failed to delete purchase order."));
    },
  });
};

export const usePurchaseOrderOperations = () => {
  const createPurchaseOrder = useCreatePurchaseOrder();
  const updateStatus = useUpdatePurchaseOrderStatus();
  const deletePurchaseOrder = useDeletePurchaseOrder();

  return {
    createPurchaseOrder,
    updatePurchaseOrderStatus: updateStatus,
    deletePurchaseOrder,
    isCreating: createPurchaseOrder.isPending,
    isUpdatingStatus: updateStatus.isPending,
    isDeleting: deletePurchaseOrder.isPending,
  };
};
